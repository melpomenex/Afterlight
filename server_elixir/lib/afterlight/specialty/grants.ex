defmodule Afterlight.Specialty.Grants do
  @moduledoc """
  HMAC playback grants for torrent stream URLs (P7 specialty adapters).

  Token format: base64url(JSON `{v, infohash, fileIndex, participant, exp}`)
  + `.` + base64url(HMAC-SHA256(secret, payload)). Stateless verification
  on the Node sidecar; Phoenix mints and re-mints while the theater item
  stays active. Secrets are never serialized into tokens or logs.
  """

  @default_secret "afterlight-torrent-grant-dev-secret-change-in-prod-000"
  @version 1
  @ttl_secs 300
  @re_mint_ratio 0.65
  @skew_secs 10

  @type mint_result :: %{
          grant: String.t(),
          expires_at_ms: non_neg_integer(),
          claims: map()
        }

  @doc "Short TTL for playback grants (seconds)."
  @spec grant_ttl_secs() :: pos_integer()
  def grant_ttl_secs, do: @ttl_secs

  @doc "Re-mint when this fraction of the TTL has elapsed (~50–80% window)."
  @spec re_mint_ratio() :: float()
  def re_mint_ratio, do: @re_mint_ratio

  @doc """
  Current and optional previous signing secrets (dual-accept rotation window).
  """
  @spec grant_secrets() :: [String.t()]
  def grant_secrets do
    current =
      System.get_env("AFTERLIGHT_TORRENT_GRANT_SECRET") ||
        Application.get_env(:afterlight, :torrent_grant_secret, @default_secret)

    case System.get_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS") do
      nil -> [current]
      "" -> [current]
      prev -> [current, prev]
    end
  end

  @doc false
  def grant_secret, do: hd(grant_secrets())

  @doc """
  Mint a scoped playback grant for one torrent file and participant.
  """
  @spec mint(String.t(), String.t(), non_neg_integer(), keyword()) ::
          {:ok, mint_result()} | {:error, :invalid_params}
  def mint(participant, infohash, file_index, opts \\ []) when is_binary(participant) do
    with {:ok, infohash} <- normalize_infohash(infohash),
         true <- is_integer(file_index) and file_index >= 0 do
      ttl = Keyword.get(opts, :ttl_secs, @ttl_secs)
      now_ms = Keyword.get(opts, :now_ms, System.system_time(:millisecond))
      exp = div(now_ms, 1000) + ttl

      claims = %{
        "v" => @version,
        "infohash" => infohash,
        "fileIndex" => file_index,
        "participant" => participant,
        "exp" => exp
      }

      grant = sign_claims(claims, grant_secret())

      {:ok,
       %{
         grant: grant,
         expires_at_ms: exp * 1000,
         claims: claims
       }}
    else
      _ -> {:error, :invalid_params}
    end
  end

  @doc """
  Verify signature, version, expiry, and that URL path segments match claims.
  """
  @spec verify(String.t(), String.t(), non_neg_integer(), keyword()) ::
          {:ok, map()} | {:error, atom()}
  def verify(token, infohash, file_index, opts \\ []) when is_binary(token) do
    secrets = Keyword.get(opts, :secrets, grant_secrets())
    now_sec = Keyword.get(opts, :now_sec, div(System.system_time(:millisecond), 1000))

    with [payload_b64, sig_b64] <- String.split(token, ".", parts: 2),
         {:ok, claims} <- decode_payload(payload_b64),
         :ok <- verify_signature(payload_b64, sig_b64, secrets),
         :ok <- check_version(claims),
         :ok <- check_fields(claims),
         :ok <- check_expiry(claims, now_sec),
         :ok <- check_resource(claims, infohash, file_index) do
      {:ok, claims}
    else
      {:error, reason} -> {:error, reason}
      _ -> {:error, :malformed}
    end
  end

  @doc """
  Re-mint while the same item is still active for the participant.
  """
  @spec re_mint(String.t(), String.t(), non_neg_integer(), keyword()) ::
          {:ok, mint_result()} | {:error, term()}
  def re_mint(participant, infohash, file_index, opts \\ []) do
    mint(participant, infohash, file_index, opts)
  end

  @doc "True when a live session should receive a fresh grant before expiry."
  @spec should_re_mint?(non_neg_integer(), non_neg_integer()) :: boolean()
  def should_re_mint?(expires_at_ms, now_ms \\ System.system_time(:millisecond)) do
    remaining = expires_at_ms - now_ms
    total_ms = @ttl_secs * 1000
    remaining <= trunc(total_ms * (1 - @re_mint_ratio))
  end

  defp sign_claims(claims, secret) do
    payload_b64 = Base.url_encode64(Jason.encode!(claims), padding: false)
    sig = :crypto.mac(:hmac, :sha256, secret, payload_b64)
    sig_b64 = Base.url_encode64(sig, padding: false)
    payload_b64 <> "." <> sig_b64
  end

  defp decode_payload(payload_b64) do
    with {:ok, json} <- Base.url_decode64(payload_b64, padding: false),
         {:ok, claims} <- Jason.decode(json) do
      {:ok, claims}
    else
      _ -> {:error, :malformed}
    end
  end

  defp verify_signature(payload_b64, sig_b64, secrets) do
    with {:ok, presented} <- Base.url_decode64(sig_b64, padding: false) do
      if Enum.any?(secrets, fn secret ->
           expected = :crypto.mac(:hmac, :sha256, secret, payload_b64)
           byte_size(expected) == byte_size(presented) and
             Plug.Crypto.secure_compare(expected, presented)
         end) do
        :ok
      else
        {:error, :invalid_signature}
      end
    else
      _ -> {:error, :malformed}
    end
  end

  defp check_version(%{"v" => @version}), do: :ok
  defp check_version(_), do: {:error, :unknown_version}

  defp check_fields(%{
         "participant" => p,
         "infohash" => h,
         "fileIndex" => fi,
         "exp" => exp
       })
       when is_binary(p) and p != "" and is_binary(h) and is_integer(fi) and fi >= 0 and
              is_integer(exp),
       do: :ok

  defp check_fields(_), do: {:error, :missing_fields}

  defp check_expiry(%{"exp" => exp}, now_sec) do
    if exp >= now_sec - @skew_secs, do: :ok, else: {:error, :expired}
  end

  defp check_resource(%{"infohash" => h, "fileIndex" => fi}, infohash, file_index) do
    with {:ok, want} <- normalize_infohash(infohash) do
      if h == want and fi == file_index, do: :ok, else: {:error, :wrong_file}
    end
  end

  defp normalize_infohash(hash) when is_binary(hash) do
    down = String.downcase(hash)

    if String.match?(down, ~r/^[0-9a-f]{40}$/) do
      {:ok, down}
    else
      {:error, :invalid_params}
    end
  end
end

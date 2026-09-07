defmodule Afterlight.Conferencing.Grants do
  @moduledoc """
  Cryptographic signing and verification of short-lived media grants and TURN credentials.
  Tokens and credentials are short-lived and never stored in the database (D2, D8, D9).
  """

  @default_secret "afterlight-media-grant-dev-secret-change-in-prod-00000000"
  @default_turn_secret "afterlight-turn-dev-secret-00000000000000000000000"

  @doc """
  Returns the secret key used for signing media grants.
  """
  def grant_secret do
    System.get_env("AFTERLIGHT_MEDIA_GRANT_SECRET") ||
      Application.get_env(:afterlight, :media_grant_secret, @default_secret)
  end

  @doc """
  Returns the secret key used for generating TURN credentials.
  """
  def turn_secret do
    System.get_env("AFTERLIGHT_TURN_SECRET") ||
      Application.get_env(:afterlight, :turn_secret, @default_turn_secret)
  end

  @doc """
  Signs a map of claims into a compact HS256 token.
  Claims MUST include: jti, call_id, player_id, worker_id, exp, iat.
  """
  def sign_grant(claims, secret \\ grant_secret()) do
    header = %{"alg" => "HS256", "typ" => "JWT"}
    header_b64 = Base.url_encode64(Jason.encode!(header), padding: false)
    payload_b64 = Base.url_encode64(Jason.encode!(claims), padding: false)
    signing_input = header_b64 <> "." <> payload_b64
    sig = :crypto.mac(:hmac, :sha256, secret, signing_input)
    sig_b64 = Base.url_encode64(sig, padding: false)

    signing_input <> "." <> sig_b64
  end

  @doc """
  Verifies the HMAC signature and expiration of a media grant token.
  Returns `{:ok, claims}` or `{:error, reason}`.
  """
  def verify_grant_signature(token, secret \\ grant_secret()) do
    case String.split(token, ".") do
      [header_b64, payload_b64, sig_b64] ->
        signing_input = header_b64 <> "." <> payload_b64
        expected_sig = :crypto.mac(:hmac, :sha256, secret, signing_input)

        with {:ok, sig} <- Base.url_decode64(sig_b64, padding: false),
             true <- Plug.Crypto.secure_compare(sig, expected_sig),
             {:ok, payload_json} <- Base.url_decode64(payload_b64, padding: false),
             {:ok, claims} <- Jason.decode(payload_json) do
          now = System.os_time(:second)
          exp = Map.get(claims, "exp", 0)

          # Allow 10s skew leeway
          if exp >= now - 10 do
            {:ok, claims}
          else
            {:error, :grant_expired}
          end
        else
          false -> {:error, :invalid_signature}
          _ -> {:error, :malformed_token}
        end

      _ ->
        {:error, :malformed_token}
    end
  end

  @doc """
  Issues short-lived HMAC credentials for TURN REST API (D8).
  Username format: `"<unix_timestamp_expiry>:<player_id>"`
  Credential format: base64(hmac_sha1(turn_secret, username))
  """
  def issue_turn_credentials(player_id, opts \\ []) do
    ttl = Keyword.get(opts, :ttl, 3600)
    now = System.os_time(:second)
    expiry = now + ttl
    username = "#{expiry}:#{player_id}"
    secret = Keyword.get(opts, :secret, turn_secret())

    credential =
      :crypto.mac(:hmac, :sha, secret, username)
      |> Base.encode64()

    urls =
      Keyword.get(opts, :urls, [
        "turn:127.0.0.1:3478?transport=udp",
        "turn:127.0.0.1:3478?transport=tcp",
        "turns:127.0.0.1:5349?transport=tcp"
      ])

    %{
      username: username,
      credential: credential,
      urls: urls,
      ttl: ttl,
      expires_at: expiry
    }
  end

  @doc """
  Verifies a TURN credential username and password.
  """
  def verify_turn_credential(username, credential, secret \\ turn_secret()) do
    case String.split(username, ":", parts: 2) do
      [expiry_str, _player_id] ->
        case Integer.parse(expiry_str) do
          {expiry, ""} ->
            now = System.os_time(:second)

            if expiry >= now do
              expected_credential =
                :crypto.mac(:hmac, :sha, secret, username)
                |> Base.encode64()

              if Plug.Crypto.secure_compare(credential, expected_credential) do
                :ok
              else
                {:error, :invalid_credential}
              end
            else
              {:error, :credential_expired}
            end

          _ ->
            {:error, :malformed_username}
        end

      _ ->
        {:error, :malformed_username}
    end
  end
end

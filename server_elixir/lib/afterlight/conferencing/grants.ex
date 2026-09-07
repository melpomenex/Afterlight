defmodule Afterlight.Conferencing.Grants do
  @moduledoc """
  Short-lived HMAC conferencing grants.

  The signed token is the only media authority a worker accepts. It is
  never written to PostgreSQL (or logs). Durable `media_grants` rows store
  jti + binding + lifecycle only.
  """

  alias Afterlight.Conferencing.Feature

  @version 1

  @doc """
  Sign a grant from durable binding fields. `grant` is a map/struct with
  `:id` (jti), `:call_id`, `:player_id`, `:worker_id`, the three publish
  booleans, and `:expires_at`.
  """
  def sign(grant, opts \\ []) do
    secret = Keyword.get_lazy(opts, :secret, &Feature.grant_secret/0)
    payload = payload(grant)
    body = Base.url_encode64(Jason.encode!(payload), padding: false)
    mac = hmac(secret, body)
    body <> "." <> Base.url_encode64(mac, padding: false)
  end

  @doc """
  Stateless verify: signature, version, required binding fields, expiry
  (with a small leeway). Does not consult revocation — use `live?/2`.
  """
  def verify(token, opts \\ []) when is_binary(token) do
    secret = Keyword.get_lazy(opts, :secret, &Feature.grant_secret/0)
    now = Keyword.get(opts, :now, DateTime.utc_now())
    leeway = Keyword.get(opts, :leeway_secs, Feature.expiry_leeway_secs())

    with {:ok, body, mac} <- split(token),
         true <- plausible_hmac?(secret, body, mac) || {:error, :bad_signature},
         {:ok, payload} <- decode_body(body),
         :ok <- check_payload(payload),
         :ok <- check_expiry(payload, now, leeway) do
      {:ok, payload}
    else
      false -> {:error, :bad_signature}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "True when verify succeeds and the jti is not revoked in `revoked_jtis`."
  def live?(token, revoked_jtis, opts \\ []) when is_list(revoked_jtis) do
    case verify(token, opts) do
      {:ok, payload} ->
        jti = payload["jti"]
        if jti in revoked_jtis, do: {:error, :revoked}, else: {:ok, payload}

      other ->
        other
    end
  end

  defp payload(grant) do
    %{
      "v" => @version,
      "jti" => to_string(field(grant, :id)),
      "call_id" => to_string(field(grant, :call_id)),
      "player_id" => to_string(field(grant, :player_id)),
      "worker_id" => to_string(field(grant, :worker_id)),
      "can_publish_audio" => truthy?(field(grant, :can_publish_audio)),
      "can_publish_video" => truthy?(field(grant, :can_publish_video)),
      "can_publish_screen" => truthy?(field(grant, :can_publish_screen)),
      "exp" => DateTime.to_unix(field(grant, :expires_at), :second)
    }
  end

  defp field(grant, key) when is_struct(grant), do: Map.fetch!(grant, key)
  defp field(grant, key) when is_map(grant) do
    Map.get(grant, key) || Map.get(grant, Atom.to_string(key))
  end

  defp truthy?(v), do: v == true

  defp split(token) do
    case String.split(token, ".", parts: 2) do
      [body, mac] when body != "" and mac != "" -> {:ok, body, mac}
      _ -> {:error, :malformed}
    end
  end

  defp decode_body(body) do
    with {:ok, json} <- Base.url_decode64(body, padding: false),
         {:ok, payload} <- Jason.decode(json) do
      {:ok, payload}
    else
      _ -> {:error, :malformed}
    end
  end

  defp hmac(secret, body), do: :crypto.mac(:hmac, :sha256, secret, body)

  defp plausible_hmac?(secret, body, mac_b64) do
    case Base.url_decode64(mac_b64, padding: false) do
      {:ok, mac} -> Plug.Crypto.secure_compare(hmac(secret, body), mac)
      :error -> false
    end
  end

  defp check_payload(%{"v" => @version} = p) do
    required = ["jti", "call_id", "player_id", "worker_id", "exp"]

    cond do
      Enum.any?(required, fn k -> not is_binary(p[k]) and not is_integer(p[k]) end) ->
        {:error, :incomplete}

      p["call_id"] in [nil, ""] or p["player_id"] in [nil, ""] or p["worker_id"] in [nil, ""] ->
        {:error, :incomplete}

      true ->
        :ok
    end
  end

  defp check_payload(_), do: {:error, :unsupported_version}

  defp check_expiry(%{"exp" => exp}, now, leeway) when is_integer(exp) do
    if exp + leeway >= DateTime.to_unix(now, :second), do: :ok, else: {:error, :expired}
  end

  defp check_expiry(_, _, _), do: {:error, :incomplete}
end

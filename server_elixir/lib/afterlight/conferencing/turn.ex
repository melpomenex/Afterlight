defmodule Afterlight.Conferencing.Turn do
  @moduledoc """
  Short-lived HMAC per-session TURN credentials (RFC 5766 REST API style).
  Delivered only over the authorized call topic. Exposes UDP primary
  with TCP/TLS fallback.
  """

  @doc """
  Issue short-lived HMAC TURN credentials for a player.
  Returns map with `:urls`, `:username`, `:credential`, and `:expires_at`.
  """
  def issue_credentials(player_id, opts \\ []) when is_binary(player_id) do
    ttl_secs = Keyword.get(opts, :ttl_secs, 3600)
    now = Keyword.get(opts, :now, DateTime.utc_now())
    secret = Keyword.get_lazy(opts, :secret, &turn_secret/0)
    urls = Keyword.get_lazy(opts, :urls, &turn_urls/0)

    expires_at = DateTime.add(now, ttl_secs, :second)
    exp_unix = DateTime.to_unix(expires_at, :second)
    username = "#{exp_unix}:#{player_id}"
    credential = generate_hmac(secret, username)

    %{
      urls: urls,
      username: username,
      credential: credential,
      expires_at: expires_at,
      exp: exp_unix
    }
  end

  @doc """
  Verify TURN credentials presented by a client.
  Returns `{:ok, player_id}` if valid and unexpired; `{:error, reason}` otherwise.
  """
  def verify_credentials(username, credential, opts \\ [])
      when is_binary(username) and is_binary(credential) do
    now = Keyword.get(opts, :now, DateTime.utc_now())
    secret = Keyword.get_lazy(opts, :secret, &turn_secret/0)

    case String.split(username, ":", parts: 2) do
      [exp_str, player_id] when player_id != "" ->
        case Integer.parse(exp_str) do
          {exp_unix, ""} ->
            now_unix = DateTime.to_unix(now, :second)

            cond do
              exp_unix < now_unix ->
                {:error, :expired}

              Plug.Crypto.secure_compare(generate_hmac(secret, username), credential) ->
                {:ok, player_id}

              true ->
                {:error, :bad_credential}
            end

          _ ->
            {:error, :malformed_username}
        end

      _ ->
        {:error, :malformed_username}
    end
  end

  defp generate_hmac(secret, username) do
    :crypto.mac(:hmac, :sha, secret, username)
    |> Base.encode64()
  end

  def turn_secret do
    Application.get_env(:afterlight, :conferencing, [])
    |> Keyword.get(:turn_secret, "afterlight-turn-spike-secret-default")
  end

  def turn_urls do
    Application.get_env(:afterlight, :conferencing, [])
    |> Keyword.get(:turn_urls, [
      "turn:turn.afterlight.internal:3478?transport=udp",
      "turn:turn.afterlight.internal:3478?transport=tcp",
      "turns:turn.afterlight.internal:5349?transport=tcp"
    ])
  end
end

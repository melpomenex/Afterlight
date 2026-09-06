defmodule AfterlightWeb.UserSocket do
  @moduledoc """
  The gateway socket (tasks 1.1/1.3/2.2/5.1/5.3).

  Connect REQUIRES a valid, unexpired guest token in the connect params
  (`%{"token" => token}`); the connection's identity — `:guest_id` — is
  taken ONLY from the verified token claim. No client-supplied player
  field is ever trusted. Connect rate limiting: fixed-window buckets per
  source IP and per verified identity (retryable refusal — the client
  simply reconnects; the HTTP 429 on the auth endpoint is where
  Retry-After lives).

  On success the socket carries `:guest_id` and a random correlation id
  used in logs (never the token, never secrets).
  """

  use Phoenix.Socket

  require Logger

  alias Afterlight.Gateway
  alias Afterlight.Gateway.{Auth, RateLimit}

  channel "game:v1", AfterlightWeb.GameChannel

  @impl true
  def connect(params, socket, connect_info) do
    with {:ok, token} <- fetch_token(params),
         :ok <- limit_per_ip(connect_info),
         {:ok, claims} <- Auth.verify(token),
         :ok <- limit_per_identity(claims.guest_id) do
      guest_id = claims.guest_id

      Logger.info(
        "gateway ws connect accepted corr=#{Gateway.correlation_id()} guest=#{guest_id}"
      )

      {:ok,
       socket
       |> assign(:guest_id, guest_id)
       |> assign(:correlation_id, Gateway.correlation_id())}
    else
      {:error, :expired} = reason ->
        refuse("token expired", reason)

      {:error, reason} ->
        refuse("token invalid (#{inspect(reason)})", reason)

      {:limited, _retry_after_ms} ->
        refuse("rate limited", :rate_limited)

      :error ->
        refuse("missing token", :missing_token)
    end
  end

  @impl true
  def id(socket), do: "guest:#{socket.assigns.guest_id}"

  defp fetch_token(%{"token" => token}) when is_binary(token), do: {:ok, token}
  defp fetch_token(_params), do: :error

  # Source-IP bucket. When no peer address is observable (in-process
  # tests), no IP bucket is applied — the identity bucket still applies.
  defp limit_per_ip(connect_info) do
    case get_in(connect_info, [:peer_data, :address]) do
      nil -> :ok
      address -> bucket({:connect_ip, address}, :connect_rate_limit)
    end
  end

  defp limit_per_identity(guest_id), do: bucket({:connect_identity, guest_id}, :connect_rate_limit)

  defp bucket(key, config_key) do
    case RateLimit.check(RateLimit.table(), key, Gateway.config(config_key, [])) do
      :ok -> :ok
      {:limited, retry_after_ms} -> {:limited, retry_after_ms}
    end
  end

  # Refusals are logged WITHOUT any token material.
  defp refuse(human, reason) do
    Logger.info("gateway ws connect refused corr=#{Gateway.correlation_id()} reason=#{human}")
    # Reason is surfaced to ExUnit-style callers, never to the client.
    _ = reason
    :error
  end
end

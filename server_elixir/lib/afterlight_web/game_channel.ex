defmodule AfterlightWeb.GameChannel do
  @moduledoc """
  The single game topic, `game:v1` (design D2: one channel per connection;
  room-scoped and targeted events both arrive on it).

  ## Frame conventions (the exact contract for the client adapter)

  The Node wire format is flat JSON text frames `{type, ...fields}`
  (protocol-catalog §1). Over Phoenix Channels the flat frame maps to the
  channel envelope like this, in BOTH directions:

    * **client → server**: `channel.push(TYPE, FIELDS)` — the push event
      IS the flat frame's `type`; the push payload is the remaining
      fields WITHOUT `type`.
      e.g. `push("hello", {guestId, nickname})`,
      `push("movement", {x, z, rotY, walking, sitting, airborne})`.
    * **server → client**: `push(socket, TYPE, FIELDS)` — same split.
      The adapter unwraps `{topic, event, payload}` → flat
      `{type: event, ...payload}`.
      e.g. `push("welcome", {player, weather, ...})`,
      `push("pong", {t})`, `push("error", {message: "relay_down"})`.
    * join reply is a plain `{:ok, %{guestId: ...}}` (a `phx_reply`,
      never surfaced as a game frame).

  ## Disposition (P2, design D4)

  `Afterlight.Gateway.Router` decides per type: `ping` is terminated at
  the gateway (push `pong` echoing `{t}` — Node's `{t}` semantics, no
  relay involved); EVERY other type — including unknown ones — is
  relayed 1:1 over the session's upstream shadow connection
  (`Afterlight.Gateway.NodeProxy`), preserving Node behavior bit for bit.

  Relay failures terminate the session with a `push("error", %{"message"
  => "relay_down"})` followed by a socket close; the client falls back to
  its generic error handling and reconnect logic.
  """

  use Phoenix.Channel
  require Logger

  alias Afterlight.Gateway.Router
  alias Afterlight.Gateway.NodeProxy

  @topic "game:v1"

  @impl true
  def join(@topic, _payload, socket) do
    case socket.assigns[:guest_id] do
      # Defense in depth: connect already guarantees this, but a join
      # without a verified identity is refused (task 1.3).
      nil ->
        {:error, %{reason: "unauthorized"}}

      guest_id ->
        with {:ok, proxy_pid} <- start_proxy(socket, guest_id) do
          {:ok, %{guestId: guest_id}, assign(socket, :proxy_pid, proxy_pid)}
        end
    end
  end

  # Unknown/unauthorized topics are refused (Phoenix routes only what is
  # declared; this catch-all keeps that refusal explicit).
  def join(_other_topic, _payload, _socket), do: {:error, %{reason: "unauthorized"}}

  @impl true
  def handle_in(type, payload, socket) when is_binary(type) do
    case Router.dispatch(type, payload) do
      {:pong, t} ->
        push(socket, "pong", %{"t" => t})
        {:noreply, socket}

      {:relay, frame} ->
        relay(frame, socket)
    end
  end

  def handle_in(_type, _payload, socket), do: {:noreply, socket}

  @impl true
  def handle_info({:relay, event, fields}, socket) do
    push(socket, event, fields)
    {:noreply, socket}
  end

  def handle_info(:relay_down, socket), do: relay_down(socket)

  def handle_info({:DOWN, _ref, :process, pid, reason}, %{assigns: %{proxy_pid: pid}} = socket) do
    Logger.info("gateway relay proxy down corr=#{corr(socket)} reason=#{inspect(reason)}")
    relay_down(socket)
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  @impl true
  def terminate(_reason, socket) do
    case socket.assigns[:proxy_pid] do
      nil -> :ok
      pid -> NodeProxy.stop(pid)
    end

    :ok
  end

  ## Internals

  defp corr(socket), do: socket.assigns[:correlation_id] || "ga-unknown"

  defp start_proxy(socket, guest_id) do
    opts = [
      guest_id: guest_id,
      channel_pid: self(),
      adapter: Afterlight.Gateway.config(:upstream_adapter),
      correlation_id: corr(socket)
    ]

    with {:ok, proxy_pid} <-
           DynamicSupervisor.start_child(Afterlight.Gateway.ProxySupervisor, {NodeProxy, opts}),
         # Newest-connection-wins (D6): the old upstream for this identity
         # is closed and torn down BEFORE this session forwards hello.
         :ok <- NodeProxy.establish(guest_id, proxy_pid) do
      Process.monitor(proxy_pid)
      {:ok, proxy_pid}
    end
  end

  # Design D3: hello is forwarded only after binding the connection to
  # the token's verified identity claim. A hello whose guestId differs
  # from the claim is refused; a hello without one gets the claim
  # injected, so Node's session keying, self-echo filtering and
  # `garden:<guestId>` room ids all stay continuous.
  defp relay(%{"type" => "hello"} = frame, socket) do
    claim = socket.assigns.guest_id

    case frame do
      %{"guestId" => ^claim} ->
        forward(frame, socket)

      %{"guestId" => _mismatch} ->
        Logger.warning(
          "gateway hello guestId mismatch corr=#{corr(socket)} guest=#{claim}"
        )

        push(socket, "error", %{"message" => "identity_mismatch"})
        {:stop, :shutdown, socket}

      _ ->
        forward(Map.put(frame, "guestId", claim), socket)
    end
  end

  defp relay(frame, socket), do: forward(frame, socket)

  defp forward(frame, socket) do
    case NodeProxy.forward(socket.assigns.proxy_pid, frame) do
      :ok ->
        {:noreply, socket}

      {:error, :relay_down} ->
        relay_down(socket)
    end
  end

  defp relay_down(socket) do
    push(socket, "error", %{"message" => "relay_down"})
    {:stop, :shutdown, socket}
  end
end

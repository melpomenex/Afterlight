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

  ## Disposition (P3, `add-world-room-runtime`)

  `Afterlight.Gateway.Router` decides per type: `ping` is terminated at
  the gateway; the world rows (`join_room`, `movement`, `emote`) route to
  `Afterlight.World` when their routing entries are `:phoenix` (design
  D6); everything else is relayed 1:1 over the session's upstream shadow
  connection (`Afterlight.Gateway.NodeProxy`), preserving Node behavior
  bit for bit.

  While the world runtime owns presence (design D6):

    * `join_room` first performs the WORLD join — the roster
      `presence_update` is pushed to the joiner and the room receives
      `presence_join` (joiner excluded) — and is THEN forwarded to the
      Node shadow session so Node's `currentRoom` gating
      (`garden_action` ownership, `node_harvest` district match,
      theater/catalog room checks) keeps working. Node's join-time domain
      snapshots relay back afterwards: the documented
      `join_room` → roster → snapshots ordering is preserved.
    * Node-emitted `presence_join`/`presence_leave`/`presence_update`
      frames are SUPPRESSED (World is the single writer of presence).
      `weather_update` and `welcome.weather` keep flowing from Node
      unsuppressed — Node owns weather until the P6 group flip (D7).
    * world-owned client messages (`movement`, `emote`) are NOT relayed
      to Node (Node would double-broadcast the room's frames).
    * `set_nickname` is relayed (accounts stay Node's until P4); the
      Node-owned `welcome` it triggers carries the sanitized nickname,
      which is propagated to the room runtime so roster entries and
      `emote_broadcast` nicknames read live (Node parity).

  Membership is per-connection (`conn_ref`): a second transport for the
  same identity supersedes the roster entry in place (newest wins, D8);
  a stale connection's leave cannot evict the survivor. While a transport
  has no live World membership, durable domain commands are refused with
  the retryable `room_unavailable` error rather than letting Node's
  shadow `currentRoom` authorize actions for a player no room owns.

  Relay failures terminate the session with a `push("error", %{"message"
  => "relay_down"})` followed by a socket close; a SUPERSEDED transport
  (a newer connection for the same identity, design D8) instead gets
  `push("error", %{"message" => "superseded"})` — a documented terminal
  close reason the client facade stops retrying on.
  """

  use Phoenix.Channel
  require Logger

  alias Afterlight.Gateway.NodeProxy
  alias Afterlight.Gateway.Router
  alias Afterlight.Social
  alias Afterlight.World
  alias Afterlight.World.Movement
  alias Afterlight.World.Rooms

  @topic "game:v1"

  # Durable/room-gated domains refused while the transport has no live
  # World membership (design D6 membership authority). hello/set_nickname
  # (accounts), chat (social), and ping stay ungated.
  @durable_types ~w(
    garden_action market_buy market_sell order_place order_cancel
    contract_complete node_harvest machine_contribute machine_mill
    machine_craft theater_queue theater_control theater_channel
    theater_playlist_resolve torrent_resolve iptv_list_get iptv_list_remove
    epg_lookup
  )

  # Node frames suppressed while the world runtime owns presence (D6).
  # Weather is deliberately NOT here (Node owns weather until P6, D7).
  @presence_types ~w(presence_join presence_leave presence_update)

  # Node frames suppressed while Social owns chat (D1/D6).
  @chat_server_types ~w(chat_message chat_dm chat_history chat_presence chat_error)

  @impl true
  def join(@topic, _payload, socket) do
    case socket.assigns[:guest_id] do
      # Defense in depth: connect already guarantees this, but a join
      # without a verified identity is refused (task 1.3).
      nil ->
        {:error, %{reason: "unauthorized"}}

      guest_id ->
        with {:ok, proxy_pid} <- start_proxy(socket, guest_id) do
          socket =
            socket
            |> assign(:proxy_pid, proxy_pid)
            |> assign(:conn_ref, make_ref())

          {:ok, %{guestId: guest_id}, socket}
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

      {:world, type, payload} ->
        handle_world(type, payload || %{}, socket)

      {:chat, type, payload} ->
        handle_chat(type, payload || %{}, socket)

      {:relay, frame} ->
        relay(frame, socket)
    end
  end

  def handle_in(_type, _payload, socket), do: {:noreply, socket}

  @impl true
  def handle_info({:world_frame, frame}, socket) when is_map(frame) do
    push(socket, frame["type"], Map.delete(frame, "type"))
    {:noreply, socket}
  end

  def handle_info({:chat_push, event, payload}, socket) do
    push(socket, event, payload)
    {:noreply, socket}
  end

  def handle_info({:world_stall, _room_pid}, socket) do
    # Bounded outbound (D3d): this transport stopped draining frames;
    # close it with a retryable reason — the client resnapshots on rejoin.
    push(socket, "error", %{"message" => "room_stalled"})
    {:stop, :shutdown, socket}
  end

  def handle_info(:superseded, socket) do
    # Deliberate tightening #2 (D8): the losing transport of a
    # duplicate-connect race gets a documented terminal close reason.
    push(socket, "error", %{"message" => "superseded"})
    {:stop, :shutdown, socket}
  end

  def handle_info({:relay, event, fields}, socket) do
    cond do
      Router.world_phx?() and event in @presence_types ->
        # Suppressed: World is the single writer of presence while the
        # world domain is flipped (Node shadow frames are context only).
        {:noreply, socket}

      Router.chat_phx?() and event in @chat_server_types ->
        # Suppressed: Social is the single writer of chat while the
        # chat domain is flipped (Node shadow frames are suppressed).
        {:noreply, socket}

      event == "garden_state" ->
        push(socket, "garden_state", fields)

        if Router.chat_phx?() do
          Social.send_history(self())
        end

        {:noreply, socket}

      event == "welcome" ->
        relay_welcome(fields, socket)

      true ->
        push(socket, event, fields)
        {:noreply, socket}
    end
  end

  def handle_info(:relay_down, socket), do: relay_down(socket)

  def handle_info({:DOWN, _ref, :process, pid, reason}, %{assigns: %{proxy_pid: pid}} = socket) do
    Logger.info("gateway relay proxy down corr=#{corr(socket)} reason=#{inspect(reason)}")
    relay_down(socket)
  end

  # Room crash recovery (D9): the room process died; the restarted room
  # is empty, so close this transport with a retryable reason — the
  # client's desiredRoom replay rejoins and receives a fresh roster and
  # snapshots. Other rooms and all durable domains are untouched.
  def handle_info({:DOWN, _ref, :process, pid, _reason}, %{assigns: %{world_room_pid: pid}} = socket) do
    Logger.info("gateway world room down corr=#{corr(socket)} room=#{socket.assigns[:world_room][:wire_id]}")

    push(socket, "error", %{"message" => "room_unavailable"})
    {:stop, :shutdown, assign(socket, world_room: nil, world_room_pid: nil)}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  @impl true
  def terminate(_reason, socket) do
    case socket.assigns[:world_room] do
      %{wire_id: wire} ->
        World.leave(wire, socket.assigns.guest_id, socket.assigns.conn_ref, :disconnect)

      _ ->
        :ok
    end

    if Router.chat_phx?() and socket.assigns[:guest_id] && socket.assigns[:conn_ref] do
      Social.player_disconnected(socket.assigns.guest_id, socket.assigns.conn_ref)
    end

    case socket.assigns[:proxy_pid] do
      nil -> :ok
      pid -> NodeProxy.stop(pid)
    end

    :ok
  end

  ## World dispatch (design D6)

  defp handle_world("join_room", payload, socket) do
    guest_id = socket.assigns.guest_id
    conn = socket.assigns.conn_ref

    case Rooms.resolve(payload["roomId"]) do
      :error ->
        push(socket, "error", %{"message" => "room_unavailable"})
        {:noreply, socket}

      {:ok, room} ->
        # Travel: leave the old world room first (one presence_leave for
        # the transition), then join the new one.
        case socket.assigns[:world_room] do
          %{wire_id: old} when old != room.wire_id ->
            World.leave(old, guest_id, conn, :travel)

          _ ->
            :ok
        end

        case World.join(room.wire_id, guest_id, conn, self(), socket.assigns[:nickname], socket.assigns[:world_pose]) do
          {:ok, room_pid, roster} ->
            # 1. roster to the joiner (world presence_join already fanned
            #    out to the room, joiner excluded).
            push(socket, roster["type"], Map.delete(roster, "type"))

            # 2. forward for context: Node keeps gating domain actions on
            #    its shadow session's currentRoom.
            socket =
              socket
              |> assign(world_room: room, world_room_pid: room_pid)
              |> assign(:world_monitor, Process.monitor(room_pid))

            forward(%{"type" => "join_room", "roomId" => room.wire_id}, socket)

          {:error, _reason} ->
            push(socket, "error", %{"message" => "room_unavailable"})
            {:noreply, socket}
        end
    end
  end

  defp handle_world("movement", payload, socket) do
    guest_id = socket.assigns.guest_id
    conn = socket.assigns.conn_ref

    # Track the newest pose in the channel so a travel join carries it
    # into the next room's presence payloads (Node's session pose
    # persists across rooms).
    socket =
      case Movement.validate(payload) do
        {:ok, pose} -> assign(socket, :world_pose, pose)
        :invalid -> socket
      end

    World.movement(socket.assigns[:world_room][:wire_id], guest_id, conn, payload)
    {:noreply, socket}
  end

  defp handle_world("emote", payload, socket) do
    World.emote(
      socket.assigns[:world_room][:wire_id],
      socket.assigns.guest_id,
      socket.assigns.conn_ref,
      payload["emote"]
    )

    {:noreply, socket}
  end

  defp handle_world(_type, _payload, socket), do: {:noreply, socket}

  ## Chat dispatch (design D1/D6)

  defp handle_chat("chat_send", payload, socket) do
    guest_id = socket.assigns.guest_id
    conn = socket.assigns.conn_ref
    text = payload["text"] || payload[:text] || ""

    Social.chat_send(guest_id, conn, text)
    {:noreply, socket}
  end

  defp handle_chat(_type, _payload, socket), do: {:noreply, socket}

  ## Relay

  # Design D3: hello is forwarded only after binding the connection to
  # the token's verified identity claim. A hello whose guestId differs
  # from the claim is refused; a hello without one gets the claim
  # injected, so Node's session keying, self-echo filtering and
  # `garden:<guestId>` room ids all stay continuous. The hello nickname
  # is remembered for the first world join; the Node-built `welcome`
  # (sanitized) supersedes it.
  defp relay(%{"type" => "hello"} = frame, socket) do
    claim = socket.assigns.guest_id

    case frame do
      %{"guestId" => ^claim} ->
        socket = assign(socket, :nickname, frame["nickname"])
        forward(frame, socket)

      %{"guestId" => _mismatch} ->
        Logger.warning(
          "gateway hello guestId mismatch corr=#{corr(socket)} guest=#{claim}"
        )

        push(socket, "error", %{"message" => "identity_mismatch"})
        {:stop, :shutdown, socket}

      _ ->
        socket = assign(socket, :nickname, frame["nickname"])
        forward(Map.put(frame, "guestId", claim), socket)
    end
  end

  # Durable domain commands are refused while this transport has no live
  # World membership (design D6): room membership has one authority at
  # every instant, so Node's shadow currentRoom may not authorize a
  # player no room owns. The refusal is retryable — the client's
  # desiredRoom replay restores membership.
  defp relay(%{"type" => type} = frame, socket) when type in @durable_types do
    if Router.world_phx?() and not live_member?(socket) do
      push(socket, "error", %{"message" => "room_unavailable"})
      {:noreply, socket}
    else
      forward(frame, socket)
    end
  end

  defp relay(frame, socket), do: forward(frame, socket)

  defp relay_welcome(%{"player" => %{"id" => guest_id, "nickname" => nickname}} = fields, socket)
       when guest_id == socket.assigns.guest_id do
    # Accounts stay Node's until P4; the welcome carries the sanitized
    # nickname — propagate it to the room runtime so rosters and emotes
    # read live (mid-session rename requirement).
    socket = assign(socket, :nickname, nickname)

    if Router.world_phx?() do
      World.update_nickname(socket.assigns[:world_room][:wire_id], guest_id, nickname)
    end

    socket =
      if Router.chat_phx?() do
        if socket.assigns[:chat_registered] do
          Social.update_nickname(guest_id, nickname)
          socket
        else
          Social.player_connected(guest_id, socket.assigns.conn_ref, self(), nickname)
          assign(socket, :chat_registered, true)
        end
      else
        socket
      end

    push(socket, "welcome", fields)
    {:noreply, socket}
  end

  defp relay_welcome(fields, socket) do
    push(socket, "welcome", fields)
    {:noreply, socket}
  end

  defp live_member?(socket) do
    case socket.assigns[:world_room] do
      %{wire_id: wire} -> World.member?(wire, socket.assigns.guest_id, socket.assigns.conn_ref)
      _ -> false
    end
  end

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
end

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

  alias Afterlight.Activities
  alias Afterlight.Activities.Challenges
  alias Afterlight.Activities.Tournament
  alias Afterlight.Catalog
  alias Afterlight.Catalog.Gateway, as: CatalogGateway
  alias Afterlight.EconomyGroup.Gateway, as: EconomyGateway
  alias Afterlight.Gateway.NodeProxy
  alias Afterlight.Gateway.RateLimit
  alias Afterlight.Gateway.Router
  alias Afterlight.Gateway.Welcome
  alias Afterlight.LogCorrelation
  alias Afterlight.Specialty.Resolve
  alias Afterlight.Specialty.TheaterSession
  alias Afterlight.Specialty.TorrentRules
  alias Afterlight.Social
  alias Afterlight.Theater
  alias Afterlight.Theater.Gateway, as: TheaterGateway
  alias Afterlight.World
  alias Afterlight.World.{BinaryFlush, Movement, Rooms}
  alias Afterlight.World.Atmosphere
  alias Afterlight.World.Fence
  alias Afterlight.World.PlaceDirectory
  alias Afterlight.World.RoomServer
  alias Afterlight.Realtime.Negotiation

  @topic "game:v1"

  # Durable/room-gated domains refused while the transport has no live
  # World membership (design D6 membership authority). hello/set_nickname
  # (accounts), chat (social), and ping stay ungated.
  @durable_types ~w(
    garden_action market_buy market_sell order_place order_cancel
    contract_complete node_harvest machine_contribute machine_mill
    machine_craft theater_queue theater_control theater_channel
    theater_playlist_resolve iptv_list_get iptv_list_remove
    epg_lookup
  )

  # Node frames suppressed while the world runtime owns presence (D6).
  # Weather is deliberately NOT here (Node owns weather until P6, D7).
  @presence_types ~w(presence_join presence_leave presence_update)

  # Node frames suppressed while Social owns chat (D1/D6).
  @chat_server_types ~w(chat_message chat_dm chat_history chat_presence chat_error)

  # Node frames suppressed while the economy group owns durable state.
  @economy_server_types ~w(
    garden_state inventory_state market_update contract_update trade_filled
    node_state machine_update
  )

  # Node frames suppressed while Theater owns playback snapshots.
  @theater_server_types ~w(theater_state)

  # Node frames suppressed while Catalog owns IPTV metadata snapshots.
  @catalog_server_types ~w(iptv_state)

  @impl true
  def join(@topic, _payload, socket) do
    case socket.assigns[:guest_id] do
      # Defense in depth: connect already guarantees this, but a join
      # without a verified identity is refused (task 1.3).
      nil ->
        {:error, %{reason: "unauthorized"}}

      guest_id ->
        LogCorrelation.put_context(request_id: corr(socket), player_id: guest_id)

        with {:ok, proxy_pid} <- start_proxy(socket, guest_id) do
          socket =
            socket
            |> assign(:proxy_pid, proxy_pid)
            |> assign(:conn_ref, make_ref())
            |> maybe_subscribe_economy()

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

      {:hello, payload} ->
        handle_hello(payload || %{}, socket)

      {:world, type, payload} ->
        handle_world(type, payload || %{}, socket)

      {:economy, type, payload} ->
        handle_economy(type, payload || %{}, socket)

      {:chat, type, payload} ->
        handle_chat(type, payload || %{}, socket)

      {:catalog, type, payload} ->
        handle_catalog(type, payload || %{}, socket)

      {:theater, type, payload} ->
        handle_theater(type, payload || %{}, socket)

      {:activity, type, payload} ->
        handle_activity(type, payload || %{}, socket)

      {:specialty, type, payload} ->
        handle_specialty(type, payload || %{}, socket)

      {:relay, frame} ->
        relay(frame, socket)

      {:unrouted, type} ->
        Logger.error(
          "gateway unrouted game message corr=#{corr(socket)} guest=#{socket.assigns.guest_id} type=#{type}"
        )

        push(socket, "error", %{"message" => "unrouted"})
        {:noreply, socket}
    end
  end

  def handle_in(_type, _payload, socket), do: {:noreply, socket}

  # Room output isolation (add-social-place-framework D3, task 3.2): the
  # runtime tags every world message with its source room
  # (`{:world_frame, room_id, frame}`). Before pushing or converting, the
  # source room must equal this transport's CURRENT assigned room — world
  # frames can sit queued in the channel mailbox across travel, and old
  # room output must never reach the client. The additive `"roomId"` rides
  # the public JSON frame and the outer `rt_binary` envelope (never the SoA
  # bytes); untagged 2-tuple messages from pre-tagging room runtimes keep
  # the legacy unconditional push.
  @impl true
  def handle_info({:world_frame, room_id, frame}, socket) when is_binary(room_id) and is_map(frame) do
    case socket.assigns[:world_room] do
      %{wire_id: ^room_id} -> deliver_world_frame(frame, room_id, socket)
      _stale_or_absent -> {:noreply, socket}
    end
  end

  def handle_info({:world_frame, frame}, socket) when is_map(frame) do
    deliver_world_frame(frame, nil, socket)
  end

  def handle_info({:economy_frame, event, payload}, socket) do
    push(socket, event, payload)
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

      Router.economy_phx?() and event in @economy_server_types ->
        {:noreply, socket}

      Router.theater_phx?() and event in @theater_server_types ->
        {:noreply, socket}

      Router.catalog_phx?() and event in @catalog_server_types ->
        {:noreply, socket}

      Router.hello_phx?() and event == "welcome" ->
        {:noreply, socket}

      event == "torrent_state" ->
        # Phoenix StatusRelay owns torrent_state while resolve is proxied.
        {:noreply, socket}

      event == "garden_state" ->
        push(socket, "garden_state", fields)

        if Router.chat_phx?() and not Router.economy_phx?() do
          Social.send_history(self())
        end

        {:noreply, socket}

      event == "welcome" ->
        relay_welcome(fields, socket)

      event == "theater_state" ->
        # Legacy relay path (Node still owns the bill): the participant's
        # grant lifecycle is minted here exactly as on the Phoenix path.
        socket = push_theater_state(socket, fields, room_wire_id(socket))
        {:noreply, socket}

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

  def handle_info({:theater_playlist_fetch, player_id, {:resolved, payload}}, socket) do
    if socket.assigns.guest_id == player_id do
      {:noreply, push(socket, "theater_playlist_resolved", payload)}
    else
      {:noreply, socket}
    end
  end

  def handle_info({:theater_playlist_fetch, player_id, {:failed, reason}}, socket) do
    if socket.assigns.guest_id == player_id do
      {:noreply, push(socket, "error", %{"message" => Afterlight.Theater.error_text(reason)})}
    else
      {:noreply, socket}
    end
  end

  # Places directory reply (task 3.3): the bounded read finished under the
  # world TaskSupervisor. The in-flight slot opens again only when the
  # reply matches the request still pending; a late reply for a superseded
  # request is delivered (the client guards with its own generation)
  # without reopening the slot.
  def handle_info({:challenge_frame, event, payload}, socket) when is_binary(event) and is_map(payload) do
    push(socket, event, payload)
    {:noreply, socket}
  end

  def handle_info({:place_directory_snapshot, request_id, entries}, socket) do
    socket =
      if socket.assigns[:place_directory_pending] == request_id do
        assign(socket, :place_directory_pending, nil)
      else
        socket
      end

    push(socket, "place_directory", %{
      "requestId" => request_id,
      "serverNow" => System.system_time(:millisecond),
      "entries" => entries
    })

    {:noreply, socket}
  end

  # Targeted torrent playback grant renewal (fix-torrent-playback-grant-
  # regression): `TheaterSession` schedules this to the owning channel
  # process; the module itself guards item match and eligibility. Without
  # this clause the message fell into the catch-all below and the first
  # grant silently expired mid-film.
  def handle_info({:torrent_grant_renew, key}, socket) do
    {:noreply, TheaterSession.renew_grant(socket, key)}
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
    started = System.monotonic_time(:millisecond)

    case Rooms.resolve(payload["roomId"]) do
      :error ->
        reject_command("join_room", :room_unavailable, socket)
        {:noreply, socket}

      {:ok, room} ->
        # Travel: leave the old world room first (one presence_leave for
        # the transition), then join the new one. Leaving The Orpheum also
        # cancels the torrent grant lifecycle: eligibility is room-bound,
        # and a renewal timer must not outlive membership.
        socket =
          case socket.assigns[:world_room] do
            %{wire_id: old} when old != room.wire_id ->
              World.leave(old, guest_id, conn, :travel)

              if old == TorrentRules.theater_wire_id() do
                TheaterSession.clear(socket)
              else
                socket
              end

            _ ->
              socket
          end

        case World.join(room.wire_id, guest_id, conn, self(), socket.assigns[:nickname], socket.assigns[:world_pose]) do
          {:ok, room_pid, roster} ->
            duration_ms = System.monotonic_time(:millisecond) - started

            LogCorrelation.put_context(
              request_id: corr(socket),
              room: room.wire_id,
              player_id: guest_id,
              epoch: World.epoch(room.wire_id)
            )

            :telemetry.execute([:afterlight, :room, :join, :latency], %{duration_ms: duration_ms}, %{
              room: room.wire_id
            })

            # 1. roster to the joiner (world presence_join already fanned
            #    out to the room, joiner excluded). It is public room
            #    output, so it carries the same additive "roomId" tag.
            push(socket, roster["type"], roster |> Map.delete("type") |> Map.put("roomId", room.wire_id))

            # 2. forward for context: Node keeps gating domain actions on
            #    its shadow session's currentRoom.
            socket =
              socket
              |> assign(world_room: room, world_room_pid: room_pid)
              |> replace_world_monitor(room_pid)
              |> maybe_subscribe_theater_playlist_fetch(room)
              |> maybe_push_theater_join_snapshots(room)
              |> maybe_push_atmosphere_join_snapshot(room)

            forward(%{"type" => "join_room", "roomId" => room.wire_id}, socket)

          {:error, _reason} ->
            reject_command("join_room", :room_unavailable, socket)
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

  ## Places directory dispatch (add-social-place-framework D8, task 3.3)

  # A bounded, read-only public snapshot. Signed game sessions only (the
  # token-gated connect IS the auth — join already guarantees a verified
  # identity), one request in flight, at most one per five seconds, and no
  # room-membership gate: the selector may query before any join and a
  # directory failure can never block travel or room joins.
  defp handle_world("place_directory_get", payload, socket) do
    request_id = payload["requestId"]

    cond do
      not valid_request_id?(request_id) ->
        push(socket, "error", %{"message" => "directory_request_invalid"})
        {:noreply, socket}

      socket.assigns[:place_directory_pending] != nil ->
        push(socket, "error", %{"message" => "rate_limited"})
        {:noreply, socket}

      true ->
        case RateLimit.check(RateLimit.table(), {:place_directory, socket.assigns.guest_id}, place_directory_rate_limit()) do
          :ok ->
            socket = assign(socket, :place_directory_pending, request_id)

            case PlaceDirectory.request(self(), request_id) do
              :ok ->
                {:noreply, socket}

              # The read could not even start: answer with no entries
              # rather than stranding the request (and the one-in-flight slot).
              {:error, :read_unavailable} ->
                push(socket, "place_directory", empty_directory(request_id))
                {:noreply, assign(socket, :place_directory_pending, nil)}
            end

          {:limited, _retry_after_ms} ->
            push(socket, "error", %{"message" => "rate_limited"})
            {:noreply, socket}
        end
    end
  end

  ## Room atmosphere dispatch (add-atmosphere-weather-system task 2.1, D2)

  # A membership-gated resnapshot: at most one per five seconds per session
  # (requestId ≤64 chars, echoed on both replies). The snapshot comes from
  # the room's live owner; unknown / registered non-atmospheric rooms answer
  # `atmosphere_unavailable` — no room is started and nothing falls back to
  # Node (the router never relays this type).
  defp handle_world("atmosphere_get", payload, socket) do
    request_id = payload["requestId"]
    wire = room_wire(socket)

    cond do
      not valid_request_id?(request_id) ->
        push(socket, "error", %{"message" => "atmosphere_request_invalid"})
        {:noreply, socket}

      not live_member?(socket) ->
        reject_command("atmosphere_get", :room_unavailable, socket)
        {:noreply, socket}

      true ->
        case RateLimit.check(RateLimit.table(), {:atmosphere_get, socket.assigns.guest_id}, atmosphere_rate_limit()) do
          :ok ->
            case Atmosphere.snapshot_for(wire) do
              {:ok, frame} ->
                push(socket, frame["type"], frame |> Map.delete("type") |> Map.put("requestId", request_id))
                {:noreply, socket}

              :unavailable ->
                push(socket, "atmosphere_unavailable", %{"requestId" => request_id, "roomId" => wire})
                {:noreply, socket}
            end

          {:limited, _retry_after_ms} ->
            push(socket, "error", %{"message" => "rate_limited"})
            {:noreply, socket}
        end
    end
  end

  defp handle_world(_type, _payload, socket), do: {:noreply, socket}

  defp valid_request_id?(id) when is_binary(id), do: byte_size(id) in 1..64
  defp valid_request_id?(_other), do: false

  defp atmosphere_rate_limit do
    Afterlight.Gateway.config(:atmosphere_rate_limit, [limit: 1, window_ms: 5_000])
  end

  defp place_directory_rate_limit do
    Afterlight.Gateway.config(:place_directory_rate_limit, [limit: 1, window_ms: 5_000])
  end

  defp empty_directory(request_id) do
    %{
      "requestId" => request_id,
      "serverNow" => System.system_time(:millisecond),
      "entries" => []
    }
  end

  ## Chat dispatch (design D1/D6)

  defp handle_chat("chat_send", payload, socket) do
    guest_id = socket.assigns.guest_id
    conn = socket.assigns.conn_ref
    text = payload["text"] || payload[:text] || ""

    Social.chat_send(guest_id, conn, text)
    {:noreply, socket}
  end

  defp handle_chat(_type, _payload, socket), do: {:noreply, socket}

  ## Economy dispatch (P6 gardens/economy/restoration)

  defp handle_economy(type, payload, socket) do
    if Router.world_phx?() and not live_member?(socket) do
      push(socket, "error", %{"message" => "room_unavailable"})
      {:noreply, socket}
    else
      ctx = %{
        guest_id: socket.assigns.guest_id,
        world_room: socket.assigns[:world_room]
      }

      payload =
        if type == "node_harvest" do
          Map.put(payload, "currentRoom", room_wire(socket))
        else
          payload
        end

      case EconomyGateway.handle(type, payload, ctx) do
        {:ok, replies} ->
          socket =
            Enum.reduce(replies, socket, fn {event, fields}, sock ->
              push(sock, event, fields)
              sock
            end)

          {:noreply, socket}

        {:error, {event, fields}} ->
          push(socket, event, fields)
          {:noreply, socket}
      end
    end
  end

  ## Hello dispatch (P6 welcome owner)

  defp handle_hello(payload, socket) do
    claim = socket.assigns.guest_id

    case payload do
      %{"guestId" => ^claim} ->
        finish_hello(payload, socket)

      %{"guestId" => _mismatch} ->
        Logger.warning(
          "gateway hello guestId mismatch corr=#{corr(socket)} guest=#{claim}"
        )

        push(socket, "error", %{"message" => "identity_mismatch"})
        {:stop, :shutdown, socket}

      _ ->
        finish_hello(Map.put(payload, "guestId", claim), socket)
    end
  end

  defp finish_hello(payload, socket) do
    guest_id = socket.assigns.guest_id
    nickname = payload["nickname"] || guest_id

    socket =
      socket
      |> assign(:nickname, nickname)
      |> maybe_assign_rt(payload)

    welcome = Welcome.compose(guest_id, nickname, socket.assigns[:rt])
    push(socket, "welcome", welcome)

    socket =
      Enum.reduce(Welcome.initial_frames(guest_id), socket, fn {event, fields}, sock ->
        push(sock, event, fields)
        sock
      end)

    socket =
      if Router.chat_phx?() do
        Social.player_connected(guest_id, socket.assigns.conn_ref, self(), nickname)
        assign(socket, :chat_registered, true)
      else
        socket
      end

    {:noreply, socket}
  end

  ## Catalog dispatch (design D4/D5 — routed when disposition is :phoenix)

  defp handle_catalog(type, payload, socket) do
    if Router.world_phx?() and not live_member?(socket) do
      push(socket, "error", %{"message" => "room_unavailable"})
      {:noreply, socket}
    else
      ctx = %{
        guest_id: socket.assigns.guest_id,
        world_room: socket.assigns[:world_room]
      }

      case CatalogGateway.handle(type, payload, ctx) do
        {:ok, :silent} ->
          {:noreply, socket}

        {:ok, frame} ->
          push(socket, frame["type"], Map.delete(frame, "type"))
          {:noreply, socket}

        {:error, message} ->
          push(socket, "error", %{"message" => message})
          {:noreply, socket}
      end
    end
  end

  ## Specialty dispatch (P7 torrent resolve proxy)

  defp handle_specialty("torrent_resolve", payload, socket) do
    guest_id = socket.assigns.guest_id

    cond do
      Router.world_phx?() and not live_member?(socket) ->
        push(socket, "error", %{"message" => "room_unavailable"})
        {:noreply, socket}

      Router.world_phx?() and not in_theater?(socket) ->
        push(socket, "error", %{"message" => TorrentRules.error_text("wrong_room")})
        {:noreply, socket}

      Router.world_phx?() ->
        push_resolve_result(Resolve.handle(guest_id, payload), socket)

      true ->
        relay(
          Map.merge(%{"type" => "torrent_resolve"}, stringify_payload(payload)),
          socket
        )
    end
  end

  defp handle_specialty(_type, _payload, socket), do: {:noreply, socket}

  defp push_resolve_result({:ok, frame}, socket), do: push_frame(frame, socket)
  defp push_resolve_result({:error, frame}, socket), do: push_frame(frame, socket)

  defp push_frame(%{"type" => type} = frame, socket) do
    push(socket, type, Map.delete(frame, "type"))
    {:noreply, socket}
  end

  defp stringify_payload(payload) when is_map(payload) do
    Map.new(payload, fn {k, v} -> {to_string(k), v} end)
  end

  defp in_theater?(socket) do
    case socket.assigns[:world_room] do
      %{wire_id: wire} -> wire == TorrentRules.theater_wire_id()
      _ -> false
    end
  end

  defp maybe_push_theater_join_snapshots(socket, %{wire_id: wire}) do
    if wire == TorrentRules.theater_wire_id() do
      now = System.system_time(:millisecond)

      socket =
        if Router.theater_phx?() do
          push_theater_state(
            socket,
            %{"theater" => Theater.snapshot(wire), "serverNow" => now},
            wire
          )
        else
          socket
        end

      if Router.catalog_phx?() do
        push(socket, "iptv_state", %{"iptv" => Catalog.snapshot()})
        socket
      else
        socket
      end
    else
      socket
    end
  end

  defp maybe_subscribe_theater_playlist_fetch(socket, %{wire_id: wire}) do
    if wire == TorrentRules.theater_wire_id() do
      :ok = Phoenix.PubSub.subscribe(Afterlight.PubSub, "theater:playlist_fetch:#{wire}")
    end

    socket
  end

  # Room atmosphere join snapshot (add-atmosphere-weather-system task 2.1,
  # D2): follows the roster and the specialized Theater/catalog join
  # snapshots — never replaces or reorders them. Supported rooms read their
  # full-replacement `atmosphere_state` from the room owner; unknown or
  # no-atmosphere rooms simply get nothing at join (an explicit
  # `atmosphere_get` answers `atmosphere_unavailable`).
  defp maybe_push_atmosphere_join_snapshot(socket, %{wire_id: wire}) do
    case Atmosphere.snapshot_for(wire) do
      {:ok, frame} ->
        push(socket, frame["type"], Map.delete(frame, "type"))
        socket

      :unavailable ->
        socket
    end
  end

  ## Theater dispatch (design D1/D2 — routed when disposition is :phoenix)

  defp handle_theater(type, payload, socket) do
    ctx = %{
      guest_id: socket.assigns.guest_id,
      conn_ref: socket.assigns.conn_ref,
      nickname: socket.assigns[:nickname],
      world_room: socket.assigns[:world_room],
      corr: corr(socket)
    }

    {:noreply, replies} = TheaterGateway.handle(type, payload, ctx)

    socket =
      Enum.reduce(replies, socket, fn
        {"theater_state", fields}, sock ->
          push_theater_state(sock, fields, socket.assigns[:world_room][:wire_id])

        {event, fields}, sock ->
          push(sock, event, fields)
          sock
      end)

    {:noreply, socket}
  end

  # Snowboard sessions (add-multiplayer-snowboard-arcade 4.4, design D3)
  # key by the OWNER'S canonical room identity — derived server-side from
  # the resolved room map, never from a client string — so equal cabinet
  # ids under distinct instances can never share a race. Every other game
  # keeps the historical wire-id keying. The public wire roomId still
  # travels in all envelopes either way.
  defp session_room_key(room, wire_id, act_id) do
    district = if is_map(room), do: Map.get(room, :district)
    instance = if is_map(room), do: Map.get(room, :instance)

    if is_binary(district) and is_binary(instance) and snowboard_activity?(wire_id, act_id) do
      Afterlight.World.RoomKey.from_parts("default", district, instance).room_key
    else
      wire_id
    end
  end

  defp snowboard_activity?(wire_id, act_id) do
    Afterlight.World.PlaceDefinitions.activities(wire_id)
    |> Enum.any?(&(&1["id"] == act_id and &1["type"] == "snowboard-race"))
  end

  # Activity frames are room-scoped on the client (roomEpoch filter +
  # activity runtime): every push carries the room wire id.
  defp room_key_of(socket) do
    room = socket.assigns[:world_room]

    if is_map(room) && Map.has_key?(room, :wire_id) do
      room.wire_id
    else
      nil
    end
  end

  defp push_activity_error(socket, room_key, error, message, request_id, activity_id) do
    payload =
      %{
        "error" => error,
        "message" => message,
        "requestId" => request_id,
        "activityId" => activity_id
      }
      |> maybe_tag_room(room_key)

    push(socket, "activity_error", payload)
  end

  defp maybe_tag_room(map, nil) when is_map(map), do: map
  defp maybe_tag_room(map, room_key) when is_map(map), do: Map.put(map, "roomId", room_key)

  defp handle_challenge(type, payload, socket) do
    req_id = Map.get(payload, "requestId")
    act_id = Map.get(payload, "activityId")
    room_key = room_key_of(socket)
    room_pid = socket.assigns[:world_room_pid]

    cond do
      is_nil(room_pid) ->
        push_activity_error(socket, nil, "room_unavailable",
          "Must join a room before sending challenges", req_id, act_id)

        {:noreply, socket}

      true ->
        case check_activity_rate_limit(type, socket) do
          {:error, :rate_limited, socket} ->
            push_activity_error(socket, room_key, "rate_limited",
              "Rate limit exceeded for #{type}", req_id, act_id)

            {:noreply, socket}

          {:ok, socket} ->
            dispatch_challenge(type, payload, socket, room_pid, room_key, req_id)
        end
    end
  end

  defp dispatch_challenge("activity_challenge", payload, socket, room_pid, room_key, req_id) do
    act_id = Map.get(payload, "activityId")
    target_name = Map.get(payload, "targetId") || Map.get(payload, "targetName")
    guest = socket.assigns.guest_id

    cond do
      not is_binary(act_id) or act_id == "" ->
        push_activity_error(socket, room_key, "invalid_input", "activityId is required", req_id, act_id)
        {:noreply, socket}

      not is_binary(target_name) or target_name == "" ->
        push_activity_error(socket, room_key, "invalid_input", "targetId is required", req_id, act_id)
        {:noreply, socket}

      not declared_activity?(room_key, act_id) ->
        push_activity_error(socket, room_key, "activity_not_found",
          "This table isn't available here", req_id, act_id)

        {:noreply, socket}

      true ->
        case RoomServer.find_member(room_pid, target_name) do
          :not_found ->
            push_activity_error(socket, room_key, "target_unavailable",
              "That visitor is not in this place", req_id, act_id)

            {:noreply, socket}

          {:ok, member} ->
            case Challenges.invite(%{
                   sender_id: guest,
                   sender_name: socket.assigns[:nickname] || guest,
                   sender_channel: self(),
                   target_id: member.player_id,
                   target_name: member.nickname,
                   target_channel: member.channel_pid,
                   activity_id: act_id,
                   room_id: room_key
                 }) do
              {:ok, invite} ->
                push(socket, "activity_challenge_result", Map.merge(invite, %{"requestId" => req_id, "status" => "pending"}))
                {:noreply, socket}

              {:error, reason} ->
                push_activity_error(socket, room_key, to_string(reason),
                  "Challenge failed: #{reason}", req_id, act_id)

                {:noreply, socket}
            end
        end
    end
  end

  defp dispatch_challenge("activity_challenge_respond", payload, socket, _room_pid, room_key, req_id) do
    invite_id = Map.get(payload, "inviteId")
    accept? = payload["accept"] == true

    if not is_binary(invite_id) do
      push_activity_error(socket, room_key, "invalid_input", "inviteId is required", req_id, nil)
      {:noreply, socket}
    else
      invite = Challenges.get(invite_id)
      availability = challenge_availability(socket, invite)

      case Challenges.respond(%{
             invite_id: invite_id,
             actor_id: socket.assigns.guest_id,
             accept: accept?,
             availability: availability
           }) do
        {:ok, result} ->
          push(socket, "activity_challenge_result", Map.put(result, "requestId", req_id))
          {:noreply, socket}

        {:error, reason} ->
          push_activity_error(socket, room_key, to_string(reason),
            "Challenge response failed: #{reason}", req_id, invite && invite.activity_id)

          {:noreply, socket}
      end
    end
  end

  defp dispatch_challenge("activity_challenge_mute", payload, socket, _room_pid, _room_key, req_id) do
    Challenges.set_muted(socket.assigns.guest_id, payload["muted"] == true)
    push(socket, "activity_challenge_result", %{"requestId" => req_id, "status" => "muted", "muted" => payload["muted"] == true})
    {:noreply, socket}
  end

  defp dispatch_challenge("activity_challenge_block", payload, socket, _room_pid, room_key, req_id) do
    target = Map.get(payload, "playerId")

    if is_binary(target) do
      Challenges.set_blocked(socket.assigns.guest_id, target, payload["blocked"] != false)
      push(socket, "activity_challenge_result", %{"requestId" => req_id, "status" => "blocked", "playerId" => target})
      {:noreply, socket}
    else
      push_activity_error(socket, room_key, "invalid_input", "playerId is required", req_id, nil)
      {:noreply, socket}
    end
  end

  defp declared_activity?(room_key, act_id) do
    Afterlight.World.PlaceDefinitions.activities(room_key)
    |> Enum.any?(&(&1["id"] == act_id))
  end

  defp challenge_availability(_socket, nil), do: %{available: false}

  defp challenge_availability(socket, invite) do
    room = socket.assigns[:world_room]
    room_pid = socket.assigns[:world_room_pid]
    room_key = room_key_of(socket)
    epoch = socket.assigns[:world_epoch] || 0

    epoch =
      try do
        {_lease, e} = RoomServer.lease_handle(room_pid)
        e
      catch
        :exit, _ -> epoch
      end

    case Activities.lookup_session(session_room_key(room, room_key, invite.activity_id), epoch, invite.activity_id) do
      {:error, _} ->
        # No live session: the table is empty and joinable. Not stale.
        %{available: true, playing: 0, watching: 0, queued: 0, can_watch: true, can_queue: true}

      {:ok, pid} ->
        try do
          summary = GenServer.call(pid, :public_summary, 80)
          playing = summary["playing"] || 0
          queued = summary["queued"] || 0
          watching = summary["watching"] || 0
          info = Activities.session_info(pid)
          max_p = info[:max_players] || 2
          max_q = info[:max_queue] || 16
          max_s = info[:max_spectators] || 32

          %{
            available: playing < max_p,
            playing: playing,
            watching: watching,
            queued: queued,
            can_watch: watching < max_s,
            can_queue: queued < max_q
          }
        catch
          :exit, _ ->
            %{available: false, playing: nil, watching: nil, queued: nil, can_watch: true, can_queue: true}
        end
    end
  end

  @challenge_types ~w(activity_challenge activity_challenge_respond activity_challenge_mute activity_challenge_block)
  @tournament_types ~w(tournament_enroll tournament_withdraw tournament_checkin tournament_get)

  defp handle_activity(type, payload, socket) when type in @challenge_types do
    handle_challenge(type, payload || %{}, socket)
  end

  defp handle_activity(type, payload, socket) when type in @tournament_types do
    handle_tournament(type, payload || %{}, socket)
  end

  defp handle_activity(type, payload, socket) do
    req_id = Map.get(payload, "requestId")
    act_id = Map.get(payload, "activityId")

    payload_size =
      case Jason.encode(payload) do
        {:ok, json} -> byte_size(json)
        _ -> 0
      end

    cond do
      payload_size > 2048 ->
        push_activity_error(socket, room_key_of(socket), "payload_too_large",
          "Activity payload exceeds 2 KiB limit (#{payload_size} > 2048)", req_id, act_id)

        {:noreply, socket}

      is_nil(socket.assigns[:world_room_pid]) ->
        push_activity_error(socket, nil, "room_unavailable",
          "Must join a room before participating in activities", req_id, act_id)

        {:noreply, socket}

      is_nil(act_id) or not is_binary(act_id) ->
        push_activity_error(socket, room_key_of(socket), "invalid_input",
          "activityId is required", req_id, act_id)

        {:noreply, socket}

      true ->
        case check_activity_rate_limit(type, socket) do
          {:error, :rate_limited, socket} ->
            push_activity_error(socket, room_key_of(socket), "rate_limited",
              "Rate limit exceeded for #{type}", req_id, act_id)

            {:noreply, socket}

          {:ok, socket} ->
            room = socket.assigns.world_room
            room_pid = socket.assigns.world_room_pid
            room_key = room_key_of(socket)

            {lease, epoch} =
              try do
                RoomServer.lease_handle(room_pid)
              catch
                :exit, _ -> {nil, 0}
              end

            cond do
              not Fence.allows_command?(lease) ->
                push_activity_error(socket, room_key, "lease_lost",
                  "Room lease lost or room unavailable", req_id, act_id)

                {:noreply, socket}

              true ->
                player_id = socket.assigns.guest_id
                role = Map.get(payload, "role", "play")

                case type == "activity_join" &&
                       Tournament.slot_conflict(room_key, player_id, act_id, role) do
                  {:error, :casual_tournament_conflict} ->
                    push_activity_error(socket, room_key, "casual_tournament_conflict",
                      "You cannot hold a casual table and a tournament slot at the same time", req_id, act_id)

                    {:noreply, socket}

                  _ ->
                    case Activities.get_or_start_session(room_pid, session_room_key(room, room_key, act_id), epoch, act_id, lease,
                           wire_room_id: room_key
                         ) do
                  {:error, :activity_not_found} ->
                    push_activity_error(socket, room_key, "activity_not_found",
                      "This table isn't available here", req_id, act_id)

                    {:noreply, socket}

                  {:error, :race_unavailable} ->
                    push_activity_error(socket, room_key, "race_unavailable",
                      "Summit Run isn't open on this server", req_id, act_id)

                    {:noreply, socket}

                  {:error, :lease_lost} ->
                    push_activity_error(socket, room_key, "lease_lost",
                      "Room lease lost", req_id, act_id)

                    {:noreply, socket}

                  {:ok, session_pid} ->
                    ctx = %{
                      player_id: socket.assigns.guest_id,
                      conn_ref: socket.assigns.conn_ref,
                      channel_pid: self(),
                      room_key: room_key,
                      room_epoch: epoch,
                      nickname: socket.assigns[:nickname]
                    }

                    case Activities.command(session_pid, type, payload, ctx) do
                      {:ok, %{"type" => "activity_state"} = snapshot} ->
                        push(socket, "activity_state", Map.put(snapshot, "roomId", room_key))
                        {:noreply, socket}

                      {:ok, reply} ->
                        if is_map(reply) and (Map.has_key?(reply, :result) or Map.has_key?(reply, "result")) do
                          reply =
                            reply
                            |> Map.put_new("requestId", req_id)
                            |> Map.put("roomId", room_key)

                          push(socket, "activity_result", reply)
                        end

                        {:noreply, socket}

                      {:error, :lease_lost} ->
                        push_activity_error(socket, room_key, "lease_lost",
                          "Activity lease lost", req_id, act_id)

                        {:noreply, socket}

                      {:error, reason} ->
                        push_activity_error(socket, room_key, to_string(reason),
                          "Activity command failed: #{inspect(reason)}", req_id, act_id)

                        {:noreply, socket}
                    end

                  {:error, reason} ->
                    push_activity_error(socket, room_key, to_string(reason),
                      "Could not start activity session: #{inspect(reason)}", req_id, act_id)

                    {:noreply, socket}
                    end
                end
            end
        end
    end
  end

  defp handle_tournament(type, payload, socket) do
    req_id = Map.get(payload, "requestId")
    room_key = room_key_of(socket)
    room_pid = socket.assigns[:world_room_pid]

    cond do
      is_nil(room_pid) or is_nil(room_key) ->
        push_activity_error(socket, nil, "room_unavailable",
          "Must join a room before using the tournament board", req_id, nil)

        {:noreply, socket}

      true ->
        case check_activity_rate_limit(type, socket) do
          {:error, :rate_limited, socket} ->
            push_activity_error(socket, room_key, "rate_limited",
              "Rate limit exceeded for #{type}", req_id, nil)

            {:noreply, socket}

          {:ok, socket} ->
            player_id = socket.assigns.guest_id

            reply =
              case type do
                "tournament_get" ->
                  {:ok, Tournament.snapshot(room_key)}

                "tournament_enroll" ->
                  Tournament.command(room_key, %{
                    type: "enroll",
                    player_id: player_id,
                    size: payload["size"],
                    display_name: payload["displayName"]
                  }, %{room_pid: room_pid})

                "tournament_withdraw" ->
                  Tournament.command(room_key, %{type: "withdraw", player_id: player_id}, %{
                    room_pid: room_pid
                  })

                "tournament_checkin" ->
                  Tournament.command(room_key, %{type: "check_in", player_id: player_id}, %{
                    room_pid: room_pid
                  })

                _ ->
                  {:error, "invalid_request", Tournament.snapshot(room_key)}
              end

            case reply do
              {:ok, snap} ->
                push(socket, "tournament_state", Map.delete(snap, "type") |> Map.put("requestId", req_id))
                {:noreply, socket}

              {:error, error, snap} ->
                push_activity_error(socket, room_key, to_string(error),
                  "Tournament command failed: #{error}", req_id, Map.get(snap, "activityId"))

                push(socket, "tournament_state", Map.delete(snap, "type"))
                {:noreply, socket}

              {:error, reason} ->
                push_activity_error(socket, room_key, to_string(reason),
                  "Tournament unavailable", req_id, nil)

                {:noreply, socket}
            end
        end
    end
  end

  defp check_activity_rate_limit(type, socket) do
    limits = socket.assigns[:activity_rate_limits] || %{}
    now_ms = System.system_time(:millisecond)
    now_sec = div(now_ms, 1000)

    case type do
      "activity_input" ->
        {win_sec, count} = Map.get(limits, :input_window, {now_sec, 0})

        if win_sec == now_sec do
          if count >= 70 do
            {:error, :rate_limited, socket}
          else
            new_limits = Map.put(limits, :input_window, {win_sec, count + 1})
            {:ok, assign(socket, :activity_rate_limits, new_limits)}
          end
        else
          new_limits = Map.put(limits, :input_window, {now_sec, 1})
          {:ok, assign(socket, :activity_rate_limits, new_limits)}
        end

      "activity_resnapshot" ->
        last_ms = Map.get(limits, :last_resnapshot_ms, 0)

        if now_ms - last_ms < 5000 do
          {:error, :rate_limited, socket}
        else
          new_limits = Map.put(limits, :last_resnapshot_ms, now_ms)
          {:ok, assign(socket, :activity_rate_limits, new_limits)}
        end

      action
      when action in [
             "activity_join",
             "activity_leave",
             "activity_ready",
             "activity_config",
             "activity_challenge",
             "activity_challenge_respond",
             "activity_challenge_mute",
             "activity_challenge_block",
             "tournament_enroll",
             "tournament_withdraw",
             "tournament_checkin",
             "tournament_get"
           ] ->
        {win_sec, count} = Map.get(limits, :control_window, {now_sec, 0})

        if win_sec == now_sec do
          if count >= 5 do
            {:error, :rate_limited, socket}
          else
            new_limits = Map.put(limits, :control_window, {win_sec, count + 1})
            {:ok, assign(socket, :activity_rate_limits, new_limits)}
          end
        else
          new_limits = Map.put(limits, :control_window, {now_sec, 1})
          {:ok, assign(socket, :activity_rate_limits, new_limits)}
        end

      _ ->
        {:ok, socket}
    end
  end

  ## Relay

  # Design D3: hello is forwarded only after binding the connection to
  # the token's verified identity claim. A hello whose guestId differs
  # from the claim is refused; a hello without one gets the claim
  # injected, so Node's session keying, self-echo filtering and
  # `garden:<guestId>` room ids all stay continuous. The hello nickname
  # is remembered for the first world join; the Node-built `welcome`
  # (sanitized) supersedes it.
  defp relay(%{"type" => "hello"} = frame, socket) do
    if Router.hello_phx?() do
      handle_hello(frame, socket)
    else
      relay_hello_node(frame, socket)
    end
  end

  # Durable domain commands are refused while this transport has no live
  # World membership (design D6): room membership has one authority at
  # every instant, so Node's shadow currentRoom may not authorize a
  # player no room owns. The refusal is retryable — the client's
  # desiredRoom replay restores membership.
  defp relay(%{"type" => type} = frame, socket) when type in @durable_types do
    if Router.world_phx?() and not live_member?(socket) do
      reject_command(type, :room_unavailable, socket)
      {:noreply, socket}
    else
      LogCorrelation.put_context(
        request_id: frame["requestId"] || frame["request_id"] || corr(socket),
        room: room_wire(socket),
        player_id: socket.assigns.guest_id,
        revision: frame["expectedRevision"] || frame["expected_revision"],
        epoch: frame["epoch"] || World.epoch(room_wire(socket))
      )

      forward(frame, socket)
    end
  end

  defp relay(frame, socket), do: forward(frame, socket)

  defp relay_hello_node(%{"type" => "hello"} = frame, socket) do
    claim = socket.assigns.guest_id

    case frame do
      %{"guestId" => ^claim} ->
        socket = assign(socket, :nickname, frame["nickname"])
        socket = maybe_assign_rt(socket, frame)
        forward(frame, socket)

      %{"guestId" => _mismatch} ->
        Logger.warning(
          "gateway hello guestId mismatch corr=#{corr(socket)} guest=#{claim}"
        )

        push(socket, "error", %{"message" => "identity_mismatch"})
        {:stop, :shutdown, socket}

      _ ->
        socket = assign(socket, :nickname, frame["nickname"])
        socket = maybe_assign_rt(socket, frame)
        forward(Map.put(frame, "guestId", claim), socket)
    end
  end

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

    push(socket, "welcome", maybe_rt_welcome(fields, socket))
    {:noreply, socket}
  end

  defp relay_welcome(fields, socket) do
    push(socket, "welcome", maybe_rt_welcome(fields, socket))
    {:noreply, socket}
  end

  defp maybe_assign_rt(socket, frame) do
    case Negotiation.parse_hello_rt(frame) do
      nil -> socket
      rt -> assign(socket, :rt, rt)
    end
  end

  defp maybe_rt_welcome(fields, socket) do
    if socket.assigns[:rt], do: Map.put(fields, "rt", Negotiation.welcome_rt()), else: fields
  end

  defp json_players_to_members(players) do
    Enum.map(players, fn p ->
      %{
        player_id: p["id"],
        pose: %{
          x: p["x"] || 0.0,
          z: p["z"] || 0.0,
          rot_y: p["rotY"] || 0.0,
          walking: p["walking"] == true,
          sitting: p["sitting"] == true,
          airborne: p["airborne"] == true
        }
      }
    end)
  end

  # The push/conversion shared by both world_frame envelopes (task 3.2):
  # negotiated `rt` transports get the SoA flush in a room-tagged outer
  # envelope; everyone else gets the flat JSON frame with the additive
  # "roomId". The SoA bytes themselves are untouched.
  defp push_world_frame(frame, room_id, socket) do
    case {socket.assigns[:rt], frame} do
      {%{protocol: _}, %{"type" => "presence_update", "players" => players}} when is_list(players) ->
        members = json_players_to_members(players)
        tick = Map.get(frame, "tick", 0)
        seq = (socket.assigns[:rt_seq] || 0) + 1
        bin = BinaryFlush.encode_flush(members, tick, seq)

        envelope = %{"tick" => tick, "data" => Base.encode64(bin)}
        envelope = if room_id, do: Map.put(envelope, "roomId", room_id), else: envelope

        push(socket, "rt_binary", envelope)
        {:noreply, assign(socket, :rt_seq, seq)}

      _ ->
        payload = Map.delete(frame, "type")
        payload = if room_id, do: Map.put(payload, "roomId", room_id), else: payload
        push(socket, frame["type"], payload)
        {:noreply, socket}
    end
  end

  # One theater-state chokepoint (fix-torrent-playback-grant-regression D1):
  # every `theater_state` this participant receives passes through here. The
  # participant's own targeted grant is pushed strictly BEFORE the shared
  # frame, so the client's first torrent stream request is authenticated.
  # Tokens never ride the shared frame and are never room-broadcast.
  defp push_theater_state(socket, fields, room_id) do
    socket =
      socket
      |> TheaterSession.remember_theater(fields)
      |> TheaterSession.sync_grant(fields)

    payload = fields |> Map.delete("type") |> maybe_put_room_tag(room_id)
    push(socket, "theater_state", payload)
    socket
  end

  # Theater state arrives over the room broadcast as a tagged world frame;
  # all other frames keep the existing conversion path.
  defp deliver_world_frame(%{"type" => "theater_state"} = frame, room_id, socket) do
    {:noreply, push_theater_state(socket, frame, room_id)}
  end

  defp deliver_world_frame(frame, room_id, socket), do: push_world_frame(frame, room_id, socket)

  defp maybe_put_room_tag(payload, nil), do: payload
  defp maybe_put_room_tag(payload, room_id) when is_binary(room_id), do: Map.put(payload, "roomId", room_id)
  defp maybe_put_room_tag(payload, _room_id), do: payload

  defp room_wire_id(socket) do
    case socket.assigns[:world_room] do
      %{wire_id: wire} when is_binary(wire) -> wire
      _ -> nil
    end
  end

  defp live_member?(socket) do
    case socket.assigns[:world_room] do
      %{wire_id: wire} -> World.member?(wire, socket.assigns.guest_id, socket.assigns.conn_ref)
      _ -> false
    end
  end

  # Stale monitor hygiene (task 3.2): only the CURRENT room's monitor is
  # tracked. Travel drops the previous room's monitor eagerly (flushed), so
  # a late DOWN from an old room cannot match the current-room crash clause
  # and tear down a transport that now lives elsewhere. The DOWN handler
  # additionally matches on the process pid, which keeps stale DOWNs inert
  # even without this.
  defp replace_world_monitor(socket, room_pid) do
    case socket.assigns[:world_monitor] do
      ref when is_reference(ref) -> Process.demonitor(ref, [:flush])
      _other -> :ok
    end

    assign(socket, :world_monitor, Process.monitor(room_pid))
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

  defp reject_command(type, reason, socket, opts \\ []) do
    :telemetry.execute([:afterlight, :durable, :command, :rejected], %{count: 1}, %{
      type: type,
      reason: reason
    })

    message =
      case reason do
        :lease_lost -> "lease_lost"
        _ -> "room_unavailable"
      end

    payload = %{"message" => message}

    payload =
      case Keyword.get(opts, :epoch) do
        nil -> payload
        epoch -> Map.put(payload, "epoch", epoch)
      end

    push(socket, "error", payload)
  end

  defp room_wire(socket) do
    case socket.assigns[:world_room] do
      %{wire_id: wire} -> wire
      _ -> nil
    end
  end

  defp maybe_subscribe_economy(socket) do
    if Router.economy_phx?() do
      guest_id = socket.assigns.guest_id
      :ok = Phoenix.PubSub.subscribe(Afterlight.PubSub, "market:updates")
      :ok = Phoenix.PubSub.subscribe(Afterlight.PubSub, "players:#{guest_id}")
    end

    socket
  end

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

defmodule AfterlightWeb.GameChannelWorldTest do
  @moduledoc """
  P3 gateway integration (tasks 4.2/4.3/5.1/5.2/5.3/6.1): the world flip
  choreography at the channel level — join ordering (roster before the
  Node shadow forward), presence suppression toggling with the routing
  row, weather staying relayed, movement/emote world ownership, durable
  gating without live membership, welcome-driven nickname propagation,
  and duplicate-connect supersession — with the Node side simulated by
  the FakeUpstream harness.
  """

  use ExUnit.Case, async: false

  import Phoenix.ChannelTest

  @endpoint AfterlightWeb.Endpoint

  @world_routing %{
    "ping" => :terminate_pong,
    "join_room" => :phoenix,
    "movement" => :phoenix,
    "emote" => :phoenix
  }

  @node_routing %{"ping" => :terminate_pong}

  setup do
    GatewayTest.FakeCore.set_owner(self())
    :ok
  end

  defp flipped(fun), do: GatewayTest.ConfigLock.with_lock(:routing, @world_routing, fun)

  defp connect_guest(guest_id, nickname) do
    {:ok, %{token: token}} = Afterlight.Gateway.Auth.issue(guest_id, nickname)
    assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    assert {:ok, %{guestId: ^guest_id}, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
    Process.unlink(socket.channel_pid)
    socket
  end

  defp hello(socket, guest_id, nickname) do
    push(socket, "hello", %{"guestId" => guest_id, "nickname" => nickname})
    assert_receive {:fake_frame, _up, json}, 1_000
    Jason.decode!(json)
  end

  test "join_room: roster to the joiner first, then the Node shadow forward (ordering, D6)" do
    flipped(fn ->
      guest = "guest_world_order#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")

      # hello binds the connection to the claim and is forwarded.
      hello_frame = hello(socket, guest, "Wren")
      assert hello_frame["guestId"] == guest

      push(socket, "join_room", %{"roomId" => "market"})

      # 1. roster first...
      assert_push "presence_update", %{"players" => []}

      # 2. ...then the shadow forward for context.
      assert_receive {:fake_frame, _up, join_json}, 1_000
      assert Jason.decode!(join_json) == %{"type" => "join_room", "roomId" => "market"}

      # Join snapshots from the shadow relay AFTER the roster (here: none
      # injected yet — the ordering assertion is the two steps above).
      _ = socket
    end)
  end

  test "presence suppression toggles with the routing row; weather never suppressed (task 4.3)" do
    # Node-owned world: presence frames RELAYED.
    GatewayTest.ConfigLock.with_lock(:routing, @node_routing, fn ->
      guest = "guest_sup_node#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      GatewayTest.FakeCore.inject_frame(up, %{"type" => "presence_update", "players" => []})
      assert_push "presence_update", %{}

      GatewayTest.FakeCore.inject_frame(up, %{"type" => "weather_update", "weather" => "drizzle"})
      assert_push "weather_update", %{"weather" => "drizzle"}
    end)

    # Phoenix-owned world: presence frames SUPPRESSED, weather still relayed.
    flipped(fn ->
      guest = "guest_sup_phx#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      GatewayTest.FakeCore.inject_frame(up, %{"type" => "presence_update", "players" => [%{"id" => "shadow_ghost"}]})
      GatewayTest.FakeCore.inject_frame(up, %{"type" => "presence_join", "player" => %{"id" => "shadow_ghost"}})
      GatewayTest.FakeCore.inject_frame(up, %{"type" => "presence_leave", "playerId" => "shadow_ghost"})

      assert_no_push("presence_update", 200)
      assert_no_push("presence_join", 200)
      assert_no_push("presence_leave", 200)

      # Weather was never suppressed (Node owns it until P6, D7).
      GatewayTest.FakeCore.inject_frame(up, %{"type" => "weather_update", "weather" => "rain"})
      assert_push "weather_update", %{"weather" => "rain"}

      # Shadow join snapshots still relay to the joiner.
      GatewayTest.FakeCore.inject_frame(up, %{"type" => "node_state", "roomId" => "market", "nodes" => []})
      assert_push "node_state", %{}
    end)
  end

  test "movement is world-owned (clamped, not relayed) and flushes at the tick" do
    flipped(fn ->
      guest = "guest_move#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello_frame = hello(socket, guest, "Wren")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      push(socket, "join_room", %{"roomId" => "market"})
      assert_push "presence_update", %{"players" => []}
      assert_receive {:fake_frame, ^up, _join_json}, 1_000

      # Movement: clamped into the walkable bounds, never forwarded.
      push(socket, "movement", %{"x" => 500, "z" => -500, "rotY" => 0.5, "walking" => true})

      refute_receive {:fake_frame, _up, _moved}, 200

      assert_push "presence_update", %{"players" => [entry]}, 2_000
      assert entry["id"] == guest
      assert entry["x"] == 11.3 and entry["z"] == -9.5
      assert entry["walking"] == true
    end)
  end

  test "emote: allow-list, cooldown, and the live nickname from the shadow welcome" do
    flipped(fn ->
      guest = "guest_emote#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      push(socket, "join_room", %{"roomId" => "market"})
      assert_push "presence_update", %{"players" => []}

      # Node answers the hello with the SANITIZED nickname; the roster
      # and emotes must carry it, not the raw hello name.
      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "welcome",
        "player" => %{"id" => guest, "nickname" => "Wren Clean"}
      })

      assert_push "welcome", %{"player" => %{"nickname" => "Wren Clean"}}

      push(socket, "emote", %{"emote" => "wave"})
      assert_push "emote_broadcast", %{"playerId" => ^guest, "nickname" => "Wren Clean", "emote" => "wave"}

      # Spam within 500 ms is rejected silently; unknown ids too.
      push(socket, "emote", %{"emote" => "dance"})
      push(socket, "emote", %{"emote" => "floss"})
      assert_no_push("emote_broadcast", 200)
    end)
  end

  test "travel: one leave on the old room, join the new, forward for context" do
    flipped(fn ->
      guest = "guest_travel#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello_frame = hello(socket, guest, "Wren")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      push(socket, "join_room", %{"roomId" => "market"})
      assert_push "presence_update", %{"players" => []}

      push(socket, "join_room", %{"roomId" => "theater"})
      assert_push "presence_update", %{"players" => []}

      # Both joins forwarded (theater gates Node's room checks).
      assert_receive {:fake_frame, ^up, json1}, 1_000
      assert_receive {:fake_frame, ^up, json2}, 1_000
      assert Jason.decode!(json1) == %{"type" => "join_room", "roomId" => "market"}
      assert Jason.decode!(json2) == %{"type" => "join_room", "roomId" => "theater"}

      # Shadow snapshots for the theater arrive after the roster.
      GatewayTest.FakeCore.inject_frame(up, %{"type" => "theater_state", "theater" => %{}, "serverNow" => 1})
      assert_push "theater_state", %{}
    end)
  end

  test "durable commands are refused without live World membership, allowed after join" do
    flipped(fn ->
      guest = "guest_gate#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello_frame = hello(socket, guest, "Wren")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      # Crash-window rule: no join yet → refuse, retryable.
      push(socket, "garden_action", %{"actionId" => "a1", "action" => "till", "bedIndex" => 0})
      assert_push "error", %{"message" => "room_unavailable"}

      # After the join the shadow forward carries the command.
      push(socket, "join_room", %{"roomId" => "market"})
      assert_push "presence_update", %{"players" => []}
      assert_receive {:fake_frame, ^up, _join}, 1_000

      push(socket, "garden_action", %{"actionId" => "a2", "action" => "till", "bedIndex" => 0})
      assert_receive {:fake_frame, ^up, action_json}, 1_000
      assert Jason.decode!(action_json)["type"] == "garden_action"
    end)
  end

  test "duplicate connect: newest wins, the loser gets the terminal `superseded` close" do
    flipped(fn ->
      guest = "guest_dupe#{System.unique_integer([:positive])}"

      first = connect_guest(guest, "Wren")
      push(first, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, _up1, _headers}, 1_000

      # Second transport for the same identity: newest wins.
      second = connect_guest(guest, "Wren")
      push(second, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, _up2, _headers}, 1_000

      # The losing transport is closed with the documented reason.
      assert_push "error", %{"message" => "superseded"}

      # The winner works normally.
      push(second, "join_room", %{"roomId" => "market"})
      assert_push "presence_update", %{"players" => []}

      # And the loser's auto-reconnect must not evict the winner: the
      # facade treats `superseded` as terminal (src/net/client.js).
      _ = first
    end)
  end

  test "set_nickname propagates to the room roster read (mid-session rename)" do
    flipped(fn ->
      guest = "guest_rename#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Old")
      _hello_frame = hello(socket, guest, "Old")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000
      push(socket, "join_room", %{"roomId" => "market"})
      assert_push "presence_update", %{"players" => []}
      assert_receive {:fake_frame, ^up, _join_json}, 1_000

      # set_nickname relays to Node (accounts stay Node's until P4)...
      push(socket, "set_nickname", %{"nickname" => "Renamed"})
      assert_receive {:fake_frame, ^up, nick_json}, 1_000
      assert Jason.decode!(nick_json) == %{"type" => "set_nickname", "nickname" => "Renamed"}

      # ...and Node's re-sent welcome (sanitized) propagates to the room.
      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "welcome",
        "player" => %{"id" => guest, "nickname" => "Renamed"}
      })

      assert_push "welcome", %{"player" => %{"nickname" => "Renamed"}}

      push(socket, "emote", %{"emote" => "wave"})
      assert_push "emote_broadcast", %{"nickname" => "Renamed", "emote" => "wave"}
    end)
  end

  test "room crash closes the transport with a retryable reason (rejoin resnapshots)" do
    flipped(fn ->
      guest = "guest_crash#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      push(socket, "join_room", %{"roomId" => "market"})
      assert_push "presence_update", %{"players" => []}

      {:ok, room_pid, _} =
        Afterlight.World.join("market", guest, :probe, self(), "probe", nil)

      # Kill the room; the DynamicSupervisor restarts it empty and the
      # channel closes this transport with the retryable reason.
      Process.exit(room_pid, :kill)
      assert_push "error", %{"message" => "room_unavailable"}, 2_000

      # Reconnect (client desiredRoom recovery): before rejoin, durable
      # commands are refused without live World membership.
      socket2 = connect_guest(guest, "Wren")
      push(socket2, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      push(socket2, "garden_action", %{"actionId" => "a3", "action" => "till", "bedIndex" => 0})
      assert_push "error", %{"message" => "room_unavailable"}

      # The rejoin produces a fresh (empty) roster.
      push(socket2, "join_room", %{"roomId" => "market"})
      assert_push "presence_update", %{"players" => []}

      _ = socket2
    end)
  end

  defp assert_no_push(event, timeout) do
    receive do
      %Phoenix.Socket.Message{event: ^event, payload: payload} ->
        flunk("unexpected push #{inspect(event)}: #{inspect(payload)}")
    after
      timeout -> :ok
    end
  end
end

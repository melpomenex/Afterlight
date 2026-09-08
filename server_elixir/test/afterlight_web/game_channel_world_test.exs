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

  use Afterlight.DataCase, async: false

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

    assert {:ok, %{guestId: ^guest_id}, socket} =
             subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")

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
      assert_push("presence_update", %{"players" => []})

      # 2. ...then the shadow forward for context.
      assert_receive {:fake_frame, _up, join_json}, 1_000
      assert Jason.decode!(join_json) == %{"type" => "join_room", "roomId" => "market"}

      # Join snapshots from the shadow relay AFTER the roster (here: none
      # injected yet — the ordering assertion is the two steps above).
      _ = socket
    end)
  end

  test "join snapshots still arrive from Node after the World roster, each exactly once (D6)" do
    flipped(fn ->
      guest = "guest_world_snap#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello_frame = hello(socket, guest, "Wren")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      push(socket, "join_room", %{"roomId" => "theater"})

      # 1. the World roster first — the joiner is excluded from its own
      # roster whatever else the room holds (leftovers from other tests
      # included)…
      assert_push("presence_update", %{"players" => players})
      refute Enum.any?(players, &(&1["id"] == guest))

      # 2. …then Node's join-time domain snapshots, relayed from the shadow.
      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "theater_state",
        "theater" => %{},
        "serverNow" => 1
      })

      GatewayTest.FakeCore.inject_frame(up, %{"type" => "iptv_state", "lists" => []})

      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "garden_state",
        "roomId" => "garden:#{guest}",
        "beds" => []
      })

      assert_push("theater_state", %{"theater" => %{}, "serverNow" => 1})
      assert_push("iptv_state", %{"lists" => []})
      assert_push("garden_state", %{"roomId" => "garden:" <> ^guest})

      # Each exactly once — the suppression must not eat snapshots, and no
      # duplicate delivery may leak through either writer.
      assert_no_push("presence_update", 200)
      assert_no_push("theater_state", 200)
      assert_no_push("iptv_state", 200)
      assert_no_push("garden_state", 200)
    end)
  end

  test "presence suppression toggles with the routing row; weather and welcome.weather never touched (task 4.3/4.2, D7)" do
    # Node-owned world: presence frames RELAYED.
    GatewayTest.ConfigLock.with_lock(:routing, @node_routing, fn ->
      guest = "guest_sup_node#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      GatewayTest.FakeCore.inject_frame(up, %{"type" => "presence_update", "players" => []})
      assert_push("presence_update", %{})

      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "welcome",
        "player" => %{"id" => guest, "nickname" => "Wren"},
        "weather" => "drizzle"
      })

      # welcome.weather passes through unchanged (Node-built until P6).
      assert_push("welcome", %{"weather" => "drizzle", "player" => %{"nickname" => "Wren"}})

      GatewayTest.FakeCore.inject_frame(up, %{"type" => "weather_update", "weather" => "drizzle"})
      assert_push("weather_update", %{"weather" => "drizzle"})
    end)

    # Phoenix-owned world: presence frames SUPPRESSED, weather still relayed.
    flipped(fn ->
      guest = "guest_sup_phx#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "presence_update",
        "players" => [%{"id" => "shadow_ghost"}]
      })

      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "presence_join",
        "player" => %{"id" => "shadow_ghost"}
      })

      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "presence_leave",
        "playerId" => "shadow_ghost"
      })

      assert_no_push("presence_update", 200)
      assert_no_push("presence_join", 200)
      assert_no_push("presence_leave", 200)

      # welcome.weather passes through unchanged in the flipped state too —
      # the runtime does not inject or rewrite Node's weather (D7).
      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "welcome",
        "player" => %{"id" => guest, "nickname" => "Wren"},
        "weather" => "rain"
      })

      assert_push("welcome", %{"weather" => "rain", "player" => %{"nickname" => "Wren"}})

      # Weather was never suppressed (Node owns it until P6, D7).
      GatewayTest.FakeCore.inject_frame(up, %{"type" => "weather_update", "weather" => "rain"})
      assert_push("weather_update", %{"weather" => "rain"})

      # Shadow join snapshots still relay to the joiner.
      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "node_state",
        "roomId" => "market",
        "nodes" => []
      })

      assert_push("node_state", %{})
    end)
  end

  test "movement is world-owned (clamped, not relayed) and flushes at the tick" do
    flipped(fn ->
      guest = "guest_move#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello_frame = hello(socket, guest, "Wren")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      push(socket, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => []})
      assert_receive {:fake_frame, ^up, _join_json}, 1_000

      # Movement: clamped into the walkable bounds, never forwarded.
      push(socket, "movement", %{"x" => 500, "z" => -500, "rotY" => 0.5, "walking" => true})

      refute_receive {:fake_frame, _up, _moved}, 200

      assert_push("presence_update", %{"players" => [entry]}, 2_000)
      assert entry["id"] == guest
      assert entry["x"] == 11.3 and entry["z"] == -9.5
      assert entry["walking"] == true

      # Regression (7.4): the additive airborne flag is relayed in the
      # flush shape, and flush entries never carry the join shape's
      # nickname (catalog asymmetry).
      push(socket, "movement", %{
        "x" => 2.5,
        "z" => -1.0,
        "rotY" => 0.5,
        "walking" => true,
        "airborne" => true
      })

      assert_push("presence_update", %{"players" => [airborne_entry]}, 2_000)
      assert airborne_entry["id"] == guest
      assert airborne_entry["x"] == 2.5
      assert airborne_entry["airborne"] == true
      refute Map.has_key?(airborne_entry, "nickname")
    end)
  end

  test "duplicate join_room is a presence no-op that still returns the roster (7.4)" do
    flipped(fn ->
      guest_a = "guest_dupjoin_a#{System.unique_integer([:positive])}"
      guest_b = "guest_dupjoin_b#{System.unique_integer([:positive])}"

      a = connect_guest(guest_a, "Alder")
      _hello_frame = hello(a, guest_a, "Alder")
      push(a, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => []})

      b = connect_guest(guest_b, "Birch")
      _hello_frame = hello(b, guest_b, "Birch")
      push(b, "join_room", %{"roomId" => "market"})

      # b's roster lists a; a got b's presence_join (joiner excluded from
      # its own fan-out).
      assert_push("presence_update", %{"players" => players})

      assert [%{"id" => ^guest_a, "nickname" => "Alder"}] =
               Enum.filter(players, &(&1["id"] == guest_a))

      assert_push("presence_join", %{"player" => %{"id" => ^guest_b, "nickname" => "Birch"}})

      # a re-sends the join for the room it is already in (the reconnect
      # replay): the roster still comes back, and the room sees NO extra
      # presence_join/presence_leave for the duplicate.
      push(a, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => players_again})

      assert [%{"id" => ^guest_b, "nickname" => "Birch"}] =
               Enum.filter(players_again, &(&1["id"] == guest_b))

      assert_no_push("presence_join", 250)
      assert_no_push("presence_leave", 250)
    end)
  end

  test "flipped path still refuses hello with a mismatched guestId (identity_mismatch, 7.4)" do
    flipped(fn ->
      guest = "guest_world_hello#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000
      ref = Process.monitor(socket.channel_pid)

      push(socket, "hello", %{"guestId" => "someone_else", "nickname" => "Impostor"})

      assert_push("error", %{"message" => "identity_mismatch"})
      assert_receive {:DOWN, ^ref, :process, _pid, _reason}, 1_000
      assert_receive {:fake_closed, ^up}, 1_000
    end)
  end

  test "emote: allow-list, cooldown, and the live nickname from the shadow welcome" do
    flipped(fn ->
      guest = "guest_emote#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      push(socket, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => []})

      # Node answers the hello with the SANITIZED nickname; the roster
      # and emotes must carry it, not the raw hello name.
      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "welcome",
        "player" => %{"id" => guest, "nickname" => "Wren Clean"}
      })

      assert_push("welcome", %{"player" => %{"nickname" => "Wren Clean"}})

      push(socket, "emote", %{"emote" => "wave"})

      assert_push("emote_broadcast", %{
        "playerId" => ^guest,
        "nickname" => "Wren Clean",
        "emote" => "wave"
      })

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
      assert_push("presence_update", %{"players" => []})

      push(socket, "join_room", %{"roomId" => "theater"})
      assert_push("presence_update", %{"players" => []})

      # Both joins forwarded (theater gates Node's room checks).
      assert_receive {:fake_frame, ^up, json1}, 1_000
      assert_receive {:fake_frame, ^up, json2}, 1_000
      assert Jason.decode!(json1) == %{"type" => "join_room", "roomId" => "market"}
      assert Jason.decode!(json2) == %{"type" => "join_room", "roomId" => "theater"}

      # Shadow snapshots for the theater arrive after the roster.
      GatewayTest.FakeCore.inject_frame(up, %{
        "type" => "theater_state",
        "theater" => %{},
        "serverNow" => 1
      })

      assert_push("theater_state", %{})
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
      assert_push("error", %{"message" => "room_unavailable"})

      # After the join the shadow forward carries the command.
      push(socket, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => []})
      assert_receive {:fake_frame, ^up, _join}, 1_000

      push(socket, "garden_action", %{"actionId" => "a2", "action" => "till", "bedIndex" => 0})
      assert_receive {:fake_frame, ^up, action_json}, 1_000
      assert Jason.decode!(action_json)["type"] == "garden_action"
    end)
  end

  test "duplicate connect: newest wins, the loser gets the terminal `superseded` close, and no ghost member remains (D8, task 5.3)" do
    flipped(fn ->
      guest = "guest_dupe#{System.unique_integer([:positive])}"

      first = connect_guest(guest, "Wren")
      push(first, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, _up1, _headers}, 1_000

      # The identity joins a room on the losing transport first, so the
      # roster entry exists before the race.
      push(first, "join_room", %{"roomId" => "garden:#{guest}"})
      assert_push("presence_update", %{"players" => []})
      assert_receive {:fake_frame, _up1, _join1}, 1_000

      # Second transport for the same identity: newest wins.
      second = connect_guest(guest, "Wren")
      push(second, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, _up2, _headers}, 1_000

      # The losing transport is closed with the documented TERMINAL reason
      # (deliberate tightening #2): its facade stops retrying on it, so the
      # two transports cannot evict each other in a loop.
      assert_push("error", %{"message" => "superseded"})

      # The winner (re)joins: the roster entry is adopted in place.
      push(second, "join_room", %{"roomId" => "garden:#{guest}"})
      assert_push("presence_update", %{"players" => players})
      refute Enum.any?(players, &(&1["id"] == guest))

      # The loser's terminate fires a leave carrying the OLD conn_ref —
      # that leave must NOT evict the survivor (Node's ghost quirk is
      # structurally impossible: the roster keys membership by the live
      # connection).
      loser_ref = Process.monitor(first.channel_pid)
      assert_receive {:DOWN, ^loser_ref, :process, _pid, _reason}, 1_000

      assert Afterlight.World.member?("garden:#{guest}", guest, second.assigns.conn_ref)

      # Still no leave reached the surviving transport…
      assert_no_push("presence_leave", 200)

      # …and an independent joiner sees EXACTLY ONE roster entry for the
      # identity — the survivor's.
      other_guest = "guest_dupe_other#{System.unique_integer([:positive])}"
      other = connect_guest(other_guest, "Fern")
      _hello_frame = hello(other, other_guest, "Fern")

      push(other, "join_room", %{"roomId" => "garden:#{guest}"})
      assert_push("presence_update", %{"players" => other_roster})

      assert [%{"id" => ^guest, "nickname" => "Wren"}] =
               Enum.filter(other_roster, &(&1["id"] == guest))

      # The survivor keeps working: movement flushes, emotes relay.
      push(second, "emote", %{"emote" => "wave"})
      assert_push("emote_broadcast", %{"playerId" => ^guest, "emote" => "wave"})
    end)
  end

  test "set_nickname propagates to the room roster read (mid-session rename)" do
    flipped(fn ->
      guest = "guest_rename#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Old")
      _hello_frame = hello(socket, guest, "Old")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000
      push(socket, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => []})
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

      assert_push("welcome", %{"player" => %{"nickname" => "Renamed"}})

      push(socket, "emote", %{"emote" => "wave"})
      assert_push("emote_broadcast", %{"nickname" => "Renamed", "emote" => "wave"})
    end)
  end

  test "room crash closes the transport with a retryable reason (rejoin resnapshots)" do
    flipped(fn ->
      guest = "guest_crash#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      push(socket, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => []})

      {:ok, room_pid, _} =
        Afterlight.World.join("market", guest, :probe, self(), "probe", nil)

      # Kill the room; the DynamicSupervisor restarts it empty and the
      # channel closes this transport with the retryable reason.
      Process.exit(room_pid, :kill)
      assert_push("error", %{"message" => "room_unavailable"}, 2_000)

      # Reconnect (client desiredRoom recovery): before rejoin, durable
      # commands are refused without live World membership.
      socket2 = connect_guest(guest, "Wren")
      push(socket2, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      push(socket2, "garden_action", %{"actionId" => "a3", "action" => "till", "bedIndex" => 0})
      assert_push("error", %{"message" => "room_unavailable"})

      # The rejoin produces a fresh (empty) roster.
      push(socket2, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => []})

      _ = socket2
    end)
  end

  ## Room output isolation (add-social-place-framework task 3.2, D3)

  describe "tagged room output cannot cross travel" do
    test "the join roster and tagged frames carry the additive roomId on the JSON path" do
      flipped(fn ->
        guest = "guest_tag#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")
        _hello_frame = hello(socket, guest, "Wren")

        push(socket, "join_room", %{"roomId" => "market"})
        assert_push("presence_update", %{"roomId" => "market", "players" => _})

        # A tagged world frame for the CURRENT room is pushed with the
        # additive public room tag (frame content untouched otherwise).
        send(
          socket.channel_pid,
          Afterlight.World.Frames.world_message("market", %{
            "type" => "emote_broadcast",
            "playerId" => guest,
            "nickname" => "Wren",
            "emote" => "wave",
            "epoch" => 0
          })
        )

        assert_push("emote_broadcast", %{
          "roomId" => "market",
          "playerId" => ^guest,
          "emote" => "wave"
        })
      end)
    end

    test "queued old-room output is dropped after travel; current-room output still flows" do
      flipped(fn ->
        guest = "guest_stale#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")
        _hello_frame = hello(socket, guest, "Wren")

        push(socket, "join_room", %{"roomId" => "market"})
        assert_push("presence_update", %{"roomId" => "market"})
        push(socket, "join_room", %{"roomId" => "theater"})
        assert_push("presence_update", %{"roomId" => "theater"})

        # A market frame that sat queued in this channel's mailbox across
        # the travel join: the source room no longer matches the assigned
        # room, so it is dropped before any push or conversion.
        stale = %{"type" => "presence_join", "player" => %{"id" => "ghost"}, "epoch" => 9}
        send(socket.channel_pid, Afterlight.World.Frames.world_message("market", stale))

        assert_no_push("presence_join", 300)

        # The same frame shape for the CURRENT room flows normally.
        current = %{"type" => "presence_join", "player" => %{"id" => guest, "nickname" => "Wren"}, "epoch" => 0}
        send(socket.channel_pid, Afterlight.World.Frames.world_message("theater", current))

        assert_push("presence_join", %{"roomId" => "theater", "player" => %{"id" => ^guest}})
      end)
    end

    test "wrong-room high-epoch frames do not poison the new room's client epochs (server tags every frame)" do
      flipped(fn ->
        guest = "guest_fence#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")
        _hello_frame = hello(socket, guest, "Wren")

        push(socket, "join_room", %{"roomId" => "market"})
        assert_push("presence_update", %{"roomId" => "market"})
        push(socket, "join_room", %{"roomId" => "theater"})
        assert_push("presence_update", %{"roomId" => "theater"})

        # Old-room frames carry their own (possibly higher) epoch — the
        # room tag is what makes them rejectable client-side, so they must
        # always travel tagged.
        send(
          socket.channel_pid,
          Afterlight.World.Frames.world_message("market", %{
            "type" => "presence_update",
            "players" => [%{"id" => "ghost"}],
            "epoch" => 99
          })
        )

        send(socket.channel_pid, Afterlight.World.Frames.world_message("theater", %{
          "type" => "presence_update",
          "players" => [%{"id" => guest}],
          "epoch" => 1
        }))

        assert_push("presence_update", %{"roomId" => "theater", "epoch" => 1, "players" => [entry]})
        assert entry["id"] == guest
        assert_no_push("presence_update", 250)
      end)
    end

    test "the rt_binary envelope is room-tagged and old-room flushes are filtered before conversion" do
      flipped(fn ->
        guest = "guest_rt#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")

        # Negotiate the binary fast path through the hello (contract §5).
        push(socket, "hello", %{
          "guestId" => guest,
          "nickname" => "Wren",
          "rt" => %{"protocols" => ["afterlight-soa-v1"]}
        })

        assert_receive {:fake_upstream_started, _up, _headers}, 1_000

        push(socket, "join_room", %{"roomId" => "market"})
        assert_push("presence_update", %{"roomId" => "market"})
        push(socket, "join_room", %{"roomId" => "theater"})
        assert_push("presence_update", %{"roomId" => "theater"})

        # Queued old-room roster: dropped BEFORE the SoA conversion — no
        # rt_binary envelope may leave for a stale room (the binary payload
        # format itself is untouched).
        send(
          socket.channel_pid,
          Afterlight.World.Frames.world_message("market", %{
            "type" => "presence_update",
            "players" => [%{"id" => "ghost", "x" => 1.0, "z" => 2.0}],
            "epoch" => 99
          })
        )

        assert_no_push("rt_binary", 300)

        # Current-room roster converts and the envelope carries the room.
        send(
          socket.channel_pid,
          Afterlight.World.Frames.world_message("theater", %{
            "type" => "presence_update",
            "players" => [%{"id" => guest, "x" => 3.0, "z" => 4.0}],
            "epoch" => 1
          })
        )

        assert_push("rt_binary", %{"roomId" => "theater", "tick" => 0, "data" => data})
        assert is_binary(data) and byte_size(data) > 0
      end)
    end

    test "untagged legacy world messages keep the unconditional push (compatibility)" do
      flipped(fn ->
        guest = "guest_legacy#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")
        _hello_frame = hello(socket, guest, "Wren")

        push(socket, "join_room", %{"roomId" => "market"})
        assert_push("presence_update", %{"roomId" => "market"})

        # Pre-tagging room runtimes send the bare 2-tuple; the channel
        # pushes it as-is, with no invented roomId.
        send(socket.channel_pid, {:world_frame, %{"type" => "weather_update", "weather" => "drizzle"}})

        assert_push("weather_update", %{"weather" => "drizzle"})
        _ = guest
      end)
    end
  end

  ## Places directory (add-social-place-framework task 3.3, D8)

  describe "place_directory_get/place_directory" do
    setup do
      GatewayTest.FakeCore.set_owner(self())
      Afterlight.Gateway.RateLimit.reset()

      original_world = Application.get_env(:afterlight, :world)

      on_exit(fn ->
        if original_world do
          Application.put_env(:afterlight, :world, original_world)
        else
          Application.delete_env(:afterlight, :world)
        end
      end)

      :ok
    end

    defp override_place_entries(entries) do
      world = Application.get_env(:afterlight, :world, [])
      Application.put_env(:afterlight, :world, Keyword.put(world, :place_entries, entries))
    end

    # Test-scoped bucket relaxation so one test may issue several
    # legitimate requests; restored with the describe setup's on_exit.
    defp allow_rapid_directory_requests do
      original_gateway = Application.get_env(:afterlight, :gateway)

      gateway = original_gateway || []

      Application.put_env(
        :afterlight,
        :gateway,
        Keyword.put(gateway, :place_directory_rate_limit, [limit: 25, window_ms: 200])
      )

      on_exit(fn ->
        if original_gateway do
          Application.put_env(:afterlight, :gateway, original_gateway)
        else
          Application.delete_env(:afterlight, :gateway)
        end
      end)
    end

    defp probe_entry(id) do
      %{
        "id" => id,
        "public" => true,
        "kind" => "environment",
        "bounds" => %{"minX" => -11.3, "maxX" => 11.3, "minZ" => -9.5, "maxZ" => 10.3},
        "atmosphere" => %{"preset" => nil, "weatherMode" => "fixed", "timeMode" => "fixed"}
      }
    end

    defp request_directory(socket, request_id) do
      push(socket, "place_directory_get", %{"requestId" => request_id})
    end

    test "the reply carries requestId, serverNow and the requester's room counted once" do
      flipped(fn ->
        guest = "guest_dir#{System.unique_integer([:positive])}"
        room = "probe-dir-count#{System.unique_integer([:positive])}"
        override_place_entries([probe_entry(room)])
        allow_rapid_directory_requests()

        socket = connect_guest(guest, "Wren")
        _hello = hello(socket, guest, "Wren")

        # Join a private-to-this-test public room: the requester is the
        # only member, so the exact count is deterministic (the market is
        # a room with bespoke handling, not a place definition, and is
        # never projected).
        push(socket, "join_room", %{"roomId" => room})
        assert_push("presence_update", %{"players" => []})

        request_directory(socket, "req-1")

        assert_push("place_directory", %{
          "requestId" => "req-1",
          "serverNow" => now,
          "entries" => entries
        })

        assert is_integer(now)
        assert [%{"roomId" => ^room, "occupancy" => 1, "observedAt" => observed}] = entries
        assert is_integer(observed), "a count is a timestamped observation"
      end)
    end

    test "a superseding duplicate connection still counts one (D8 roster truth)" do
      flipped(fn ->
        guest = "guest_dir_dup#{System.unique_integer([:positive])}"
        room = "probe-dir-dup#{System.unique_integer([:positive])}"
        override_place_entries([probe_entry(room)])
        allow_rapid_directory_requests()

        socket = connect_guest(guest, "Wren")
        _hello = hello(socket, guest, "Wren")
        push(socket, "join_room", %{"roomId" => room})
        assert_push("presence_update", %{"players" => []})

        request_directory(socket, "req-before")
        assert_push("place_directory", %{"entries" => entries_before})
        assert [%{"occupancy" => 1}] = entries_before

        # The same identity replaces its connection in place (newest wins):
        # the roster keeps exactly one entry for it.
        dummy = spawn(fn -> receive do: (:stop -> :ok) end)

        assert {:ok, _pid, _roster} =
                 Afterlight.World.join(room, guest, :newer_conn, dummy, "Wren", nil)

        request_directory(socket, "req-after")
        assert_push("place_directory", %{"entries" => entries_after})
        assert [%{"occupancy" => 1}] = entries_after
      end)
    end

    test "a known public room with no process reports zero and no room gets started" do
      flipped(fn ->
        guest = "guest_dir_zero#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")
        _hello = hello(socket, guest, "Wren")

        request_directory(socket, "req-zero")

        assert_push("place_directory", %{"entries" => entries})

        # No test in this suite holds frost-spire; the read must neither
        # fabricate a count nor lazily start the room.
        frost = Enum.find(entries, &(&1["roomId"] == "frost-spire"))
        assert %{"occupancy" => 0, "observedAt" => _} = frost
        assert [] = Registry.lookup(Afterlight.World.Registry, {Afterlight.World.RoomServer, "frost-spire"})
      end)
    end

    test "a stuck owner reports null within the deadline and only one request is in flight" do
      test_pid = self()

      flipped(fn ->
        guest = "guest_dir_slow#{System.unique_integer([:positive])}"
        override_place_entries([probe_entry("probe-slow-dir")])

        socket = connect_guest(guest, "Wren")
        _hello = hello(socket, guest, "Wren")

        # The test process poses as the room and never answers stats calls:
        # the bounded read gives up (work cancelled) and reports unknown.
        {:ok, _} = Registry.register(Afterlight.World.Registry, {Afterlight.World.RoomServer, "probe-slow-dir"}, nil)

        request_directory(socket, "req-slow")

        # While that read is pending, a second request is rejected by the
        # one-in-flight rule — no unbounded room work is started.
        request_directory(socket, "req-slow-2")
        assert_push("error", %{"message" => "rate_limited"})

        assert_push("place_directory", %{
          "requestId" => "req-slow",
          "entries" => [%{"roomId" => "probe-slow-dir", "occupancy" => nil, "observedAt" => nil}]
        })

        _ = test_pid
      end)
    end

    test "more than one request per five seconds is rejected (spam)" do
      flipped(fn ->
        guest = "guest_dir_rate#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")
        _hello = hello(socket, guest, "Wren")

        request_directory(socket, "req-first")
        assert_push("place_directory", %{"requestId" => "req-first"})

        request_directory(socket, "req-second")
        assert_push("error", %{"message" => "rate_limited"})
      end)
    end

    test "oversized configurations are capped to the 16KiB response budget" do
      flipped(fn ->
        guest = "guest_dir_size#{System.unique_integer([:positive])}"

        long_entries =
          for i <- 1..64, do: probe_entry("probe-#{i}-#{String.duplicate("x", 300)}")

        override_place_entries(long_entries)

        socket = connect_guest(guest, "Wren")
        _hello = hello(socket, guest, "Wren")

        request_directory(socket, "req-size")

        assert_push("place_directory", payload = %{"requestId" => "req-size", "entries" => entries})
        assert byte_size(Jason.encode!(payload)) <= 16 * 1024, "the whole reply stays inside the cap"
        assert length(entries) < 64, "entries were omitted, never truncated mid-entry"

        for entry <- entries do
          assert Map.has_key?(entry, "roomId") and Map.has_key?(entry, "occupancy")
        end
      end)
    end

    test "an invalid requestId is refused without starting reads" do
      flipped(fn ->
        guest = "guest_dir_bad#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")
        _hello = hello(socket, guest, "Wren")

        push(socket, "place_directory_get", %{})
        assert_push("error", %{"message" => "directory_request_invalid"})

        push(socket, "place_directory_get", %{"requestId" => String.duplicate("x", 65)})
        assert_push("error", %{"message" => "directory_request_invalid"})

        assert_no_push("place_directory", 200)
      end)
    end

    test "unknown directory types are unrouted and never relayed to Node" do
      flipped(fn ->
        guest = "guest_dir_unknown#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")
        _hello = hello(socket, guest, "Wren")
        assert_receive {:fake_upstream_started, up, _headers}, 1_000

        # "place_directory" is a server→client reply, never a client type.
        push(socket, "place_directory", %{"entries" => []})
        assert_push("error", %{"message" => "unrouted"})

        refute_receive {:fake_frame, ^up, _json}, 200
      end)
    end

    test "when the world row rolls back to Node, the directory is unrouted — no Node relay" do
      GatewayTest.ConfigLock.with_lock(:routing, @node_routing, fn ->
        guest = "guest_dir_node#{System.unique_integer([:positive])}"
        socket = connect_guest(guest, "Wren")
        _hello = hello(socket, guest, "Wren")
        assert_receive {:fake_upstream_started, up, _headers}, 1_000

        push(socket, "place_directory_get", %{"requestId" => "req-off"})

        assert_push("error", %{"message" => "unrouted"})
        refute_receive {:fake_frame, ^up, _json}, 200
      end)
    end
  end

  ## Room lease epoch through the channel (B task 1.1 owner gate; P9 evidence)

  describe "the real lease epoch rides every world frame through the gateway" do
    setup do
      GatewayTest.FakeCore.set_owner(self())
      :ok
    end

    defp unique_wire(prefix), do: "#{prefix}-lease-#{System.unique_integer([:positive])}"

    defp expire_lease!(wire) do
      {:ok, key} = Afterlight.World.RoomKey.from_wire(wire)

      Afterlight.Repo.query!(
        "UPDATE room_leases SET expires_at = now() - interval '1 second' WHERE room_key = $1",
        [key.room_key]
      )
    end

    test "join through the channel: the roster and flush carry the HELD lease epoch, not a fake counter" do
      flipped(fn ->
        guest = "guest_epoch#{System.unique_integer([:positive])}"
        wire = unique_wire("court")
        socket = connect_guest(guest, "Wren")
        _hello_frame = hello(socket, guest, "Wren")

        push(socket, "join_room", %{"roomId" => wire})

        assert_push("presence_update", %{"roomId" => ^wire, "epoch" => epoch, "players" => []})
        assert is_integer(epoch) and epoch >= 1, "an admitted room stamps its REAL lease epoch"
        assert epoch == Afterlight.World.epoch(wire)

        # Movement flushes carry the same held epoch.
        push(socket, "movement", %{"x" => 2.0, "z" => -1.0, "rotY" => 0, "walking" => true})
        assert_push("presence_update", %{"roomId" => ^wire, "epoch" => ^epoch, "players" => [entry]}, 2_000)
        assert entry["id"] == guest
      end)
    end

    test "owner loss: the channel closes retryably, the successor's epoch is strictly greater, and old-owner epochs never reappear" do
      flipped(fn ->
        guest = "guest_failover#{System.unique_integer([:positive])}"
        wire = unique_wire("court")
        socket = connect_guest(guest, "Wren")
        _hello_frame = hello(socket, guest, "Wren")

        push(socket, "join_room", %{"roomId" => wire})
        assert_push("presence_update", %{"roomId" => ^wire, "epoch" => epoch1, "players" => []})

        # Ownership loss under the live room: expire the lease, then kill
        # the owner. The channel's room monitor closes this transport with
        # the documented retryable reason (existing failover choreography).
        [{room_pid, _}] = Registry.lookup(Afterlight.World.Registry, {Afterlight.World.RoomServer, wire})
        expire_lease!(wire)
        Process.exit(room_pid, :kill)

        assert_push("error", %{"message" => "room_unavailable"}, 2_000)

        # Rejoin through the channel (the client's desiredRoom replay):
        # the restarted owner acquires through the existing lease, so its
        # epoch is strictly greater — delayed old-owner output (epoch1) is
        # stale by construction and clients discard it per room epoch
        # (src/net/roomEpoch.js), while the successor only ever emits ≥ epoch2.
        socket2 = connect_guest(guest, "Wren")
        _hello_frame = hello(socket2, guest, "Wren")

        push(socket2, "join_room", %{"roomId" => wire})

        assert_push("presence_update", %{"roomId" => ^wire, "epoch" => epoch2, "players" => []})
        assert epoch2 > epoch1, "successor epoch must be strictly greater after owner loss"
        assert epoch2 == Afterlight.World.epoch(wire)

        # The successor keeps stamping the new epoch on live output.
        push(socket2, "movement", %{"x" => 1.0, "z" => 1.0, "rotY" => 0, "walking" => true})
        assert_push("presence_update", %{"roomId" => ^wire, "epoch" => ^epoch2, "players" => [_]}, 2_000)
      end)
    end
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

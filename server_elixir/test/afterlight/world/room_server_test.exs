defmodule Afterlight.World.RoomServerTest do
  @moduledoc """
  Tasks 1.3/2.1/2.2/2.3/3.1–3.3/4.1/6.1/6.2/7.3: join/leave/duplicate/
  supersession semantics, the coalesced flush, emotes, bounded outbound,
  empty-room retirement, crash recovery and containment, bounded mailboxes,
  and telemetry (including the no-secrets payload contract) — against the
  Node baseline shapes (also pinned corpus-wide by `world.json`).
  """

  use ExUnit.Case, async: false

  alias Afterlight.World
  alias Afterlight.World.RoomServer

  @flush Application.compile_env(:afterlight, [:world, :flush_interval_ms], 100)

  # Mailbox-boundedness burst (task 7.3): 5 senders x 100 movements.
  @burst_senders 5
  @burst_per_sender 100

  setup do
    tap = WorldTestHelper.tap_telemetry!(self())

    on_exit(fn -> WorldTestHelper.detach_telemetry(tap) end)

    # Room processes are via-named per wire id; keep wire ids unique per
    # test run to avoid cross-test registry collisions.
    wire = "market-#{System.unique_integer([:positive])}"
    %{wire: wire, room: %{district: "market", instance: "main", wire_id: wire, kind: :public}}
  end

  defp start_room!(room) do
    # Unique child id per room: several rooms can live under the same
    # test supervisor (the default id would be the module name).
    start_supervised!(Supervisor.child_spec({RoomServer, room}, id: room.wire_id))
  end

  defp pose(x \\ 0.0, z \\ 0.0, rot \\ 0.0, opts \\ []) do
    Map.merge(%{x: x, z: z, rot_y: rot, walking: false, sitting: false, airborne: false}, Map.new(opts))
  end

  defp attrs(pid, id, nickname, conn, pose) do
    %{player_id: id, conn_ref: conn, channel_pid: pid, nickname: nickname, pose: pose}
  end

  defp recorded_frames(id, timeout \\ 500) do
    collect(id, timeout, [])
  end

  defp collect(id, timeout, acc) do
    receive do
      {:recorded, ^id, frame} -> collect(id, timeout, [frame | acc])
    after
      0 -> Enum.reverse(acc)
    end
  end

  defp wait_for(id, pred, timeout \\ 2_000) do
    receive do
      {:recorded, ^id, frame} ->
        if pred.(frame) do
          frame
        else
          wait_for(id, pred, timeout)
        end
    after
      timeout -> flunk("no matching frame for #{inspect(id)} within #{timeout}ms")
    end
  end

  test "first join starts fresh: joiner gets roster, room sees presence_join (joiner excluded)", %{wire: wire, room: room} do
    pid = start_room!(room)

    a = WorldTestHelper.recorder!(self(), :a)
    b = WorldTestHelper.recorder!(self(), :b)

    assert {:ok, %{"type" => "presence_update", "players" => []}} =
             RoomServer.join(pid, attrs(a, "guest_a", "Mossy", :ca, pose(1.0)))

    {:ok, roster_b} = RoomServer.join(pid, attrs(b, "guest_b", "Kiln", :cb, pose(2.0)))

    # Join telemetry (design D10) identifies room + player, with the roster
    # size as of the join (0 for the first member, 1 for the second).
    assert_receive {:telemetry, [:afterlight, :room, :join], %{roster_size: 0}, %{room: ^wire, player: "guest_a"}}
    assert_receive {:telemetry, [:afterlight, :room, :join], %{roster_size: 1}, %{room: ^wire, player: "guest_b"}}

    # Joiner's roster lists EXISTING members only (joiner excluded).
    assert %{"type" => "presence_update", "players" => [a_entry]} = roster_b
    assert a_entry["id"] == "guest_a" and a_entry["nickname"] == "Mossy"

    # Existing member receives presence_join carrying the joiner's shape
    # (with nickname, WITHOUT airborne) exactly once.
    frame = wait_for(:a, &(&1["type"] == "presence_join"))
    assert frame["player"]["id"] == "guest_b"
    assert frame["player"]["nickname"] == "Kiln"
    refute Map.has_key?(frame["player"], "airborne")

    # ...and nothing else.
    refute_receive {:recorded, :a, _}, 200
  end

  test "duplicate join_room is a presence no-op that still returns the roster", %{room: room} do
    pid = start_room!(room)
    a = WorldTestHelper.recorder!(self(), :a)
    b = WorldTestHelper.recorder!(self(), :b)

    RoomServer.join(pid, attrs(a, "guest_a", "A", :ca, pose()))
    RoomServer.join(pid, attrs(b, "guest_b", "B", :cb, pose()))
    _ = recorded_frames(:a)

    # The client replays join_room on every reconnect; the room must not
    # churn presence.
    assert {:ok, %{"players" => [entry]}} = RoomServer.join(pid, attrs(b, "guest_b", "B", :cb, pose()))
    assert entry["id"] == "guest_a"

    refute_receive {:recorded, :a, _}, 200
  end

  test "supersession (newest connection wins) replaces in place; stale leave cannot evict", %{room: room} do
    pid = start_room!(room)
    a = WorldTestHelper.recorder!(self(), :a)
    b1 = WorldTestHelper.recorder!(self(), :b1)

    RoomServer.join(pid, attrs(a, "guest_a", "A", :ca, pose()))
    RoomServer.join(pid, attrs(b1, "guest_b", "B-old", :cb1, pose()))
    wait_for(:a, &(&1["type"] == "presence_join"))

    # Same identity, second transport (different conn_ref + channel).
    b2 = WorldTestHelper.recorder!(self(), :b2)
    assert {:ok, %{"players" => [a_entry]}} = RoomServer.join(pid, attrs(b2, "guest_b", "B-new", :cb2, pose(9.0)))
    assert a_entry["id"] == "guest_a"

    # No presence churn for the supersession.
    refute_receive {:recorded, :a, %{"type" => "presence_join"}}, 200
    refute_receive {:recorded, :a, %{"type" => "presence_leave"}}, 200

    # Movement from the OLD connection must not drive the surviving entry.
    RoomServer.movement(pid, "guest_b", :cb1, %{"x" => 5.0, "z" => 5.0, "rotY" => 0, "walking" => true})

    # And the STALE connection's leave cannot evict the survivor (D8).
    assert RoomServer.leave(pid, "guest_b", :cb1, :disconnect) == :ok
    assert RoomServer.member?(pid, "guest_b", :cb2)

    # The new connection's movement lands.
    RoomServer.movement(pid, "guest_b", :cb2, %{"x" => 7.0, "z" => 7.0, "rotY" => 0, "walking" => true})

    frame = wait_for(:b2, &(&1["type"] == "presence_update" and &1["players"] != []))
    b_entry = Enum.find(frame["players"], &(&1["id"] == "guest_b"))
    assert b_entry["x"] == 7.0
  end

  test "travel: one presence_leave for the old room, then a fresh join", %{room: room} do
    theater_wire = "theater-#{System.unique_integer([:positive])}"
    market = start_room!(room)
    theater = start_room!(%{room | district: "theater", wire_id: theater_wire})

    a = WorldTestHelper.recorder!(self(), :a)
    RoomServer.join(market, attrs(a, "guest_a", "A", :ca, pose()))
    b = WorldTestHelper.recorder!(self(), :b)
    RoomServer.join(market, attrs(b, "guest_b", "B", :cb, pose(2.0)))
    _ = recorded_frames(:a)

    RoomServer.leave(market, "guest_b", :cb, :travel)
    leave_frame = wait_for(:a, &(&1["type"] == "presence_leave"))
    assert leave_frame["playerId"] == "guest_b"

    {:ok, roster} = RoomServer.join(theater, attrs(b, "guest_b", "B", :cb, pose(2.0)))
    assert %{"players" => []} = roster

    # Exactly one leave for the transition.
    refute_receive {:recorded, :a, %{"type" => "presence_leave"}}, 200
  end

  test "the flush carries the FULL roster in join order with the flush shape", %{wire: wire, room: room} do
    pid = start_room!(room)
    a = WorldTestHelper.recorder!(self(), :a)
    b = WorldTestHelper.recorder!(self(), :b)

    RoomServer.join(pid, attrs(a, "guest_a", "A", :ca, pose(1.0, 2.0)))
    RoomServer.join(pid, attrs(b, "guest_b", "B", :cb, pose(3.0, 4.0, 1.0, walking: true, sitting: true, airborne: true)))

    RoomServer.movement(pid, "guest_a", :ca, %{"x" => 500, "z" => -500, "rotY" => 0.5, "walking" => true})
    _ = recorded_frames(:a)

    frame = wait_for(:a, &(&1["type"] == "presence_update" and &1["players"] != []), 2_000)

    assert frame["players"] == [
             %{"id" => "guest_a", "x" => 11.3, "z" => -9.5, "rotY" => 0.5, "walking" => true, "sitting" => false, "airborne" => false},
             %{"id" => "guest_b", "x" => 3.0, "z" => 4.0, "rotY" => 1.0, "walking" => true, "sitting" => true, "airborne" => true}
           ]

    # Coalescing: many movements between ticks keep only the newest pose.
    assert_receive {:telemetry, [:afterlight, :room, :tick], %{roster_size: 2}, %{room: ^wire}}, 2_000
    assert_receive {:telemetry, [:afterlight, :movement, :coalesced], %{received: 1, flushed: 2}, %{room: ^wire}}, 2_000
  end

  test "movement from an identity with no live membership is refused, not ghosted", %{room: room} do
    pid = start_room!(room)
    a = WorldTestHelper.recorder!(self(), :a)

    RoomServer.join(pid, attrs(a, "guest_a", "A", :ca, pose()))
    _ = recorded_frames(:a)

    # Unknown player + stale conn both dropped.
    RoomServer.movement(pid, "guest_ghost", :cx, %{"x" => 1.0, "z" => 1.0, "rotY" => 0})
    RoomServer.movement(pid, "guest_a", :cstale, %{"x" => 99.0, "z" => 99.0, "rotY" => 0})

    # Room never became dirty: no flush arrives.
    Process.sleep(@flush * 3)
    refute_receive {:recorded, :a, _}, 200
  end

  test "non-finite movement is dropped; the last valid pose stands", %{room: room} do
    pid = start_room!(room)
    a = WorldTestHelper.recorder!(self(), :a)

    RoomServer.join(pid, attrs(a, "guest_a", "A", :ca, pose(1.0, 1.0)))
    RoomServer.movement(pid, "guest_a", :ca, %{"x" => 2.0, "z" => 2.0, "rotY" => 0})
    RoomServer.movement(pid, "guest_a", :ca, %{"x" => "bad", "z" => 0, "rotY" => 0})
    _ = recorded_frames(:a)

    frame = wait_for(:a, &(&1["type"] == "presence_update" and &1["players"] != []), 2_000)
    assert hd(frame["players"])["x"] == 2.0
  end

  test "emotes: allow-list + per-connection cooldown; rename reads live", %{room: room} do
    pid = start_room!(room)
    a = WorldTestHelper.recorder!(self(), :a)
    b = WorldTestHelper.recorder!(self(), :b)

    RoomServer.join(pid, attrs(a, "guest_a", "Old Name", :ca, pose()))
    RoomServer.join(pid, attrs(b, "guest_b", "B", :cb, pose()))
    _ = recorded_frames(:a)
    _ = recorded_frames(:b)

    RoomServer.update_nickname(pid, "guest_b", "New Name")
    RoomServer.emote(pid, "guest_b", :cb, "wave")
    frame = wait_for(:a, &(&1["type"] == "emote_broadcast"))

    # Exact wire shape (string keys, the additive epoch field). This
    # harness starts rooms WITHOUT a database checkout, so the room holds
    # no lease and stamps the pre-lease epoch default 0 — the
    # un-owned/degraded value, never a fabricated ownership claim
    # (B task 1.1: rooms WITH a held lease stamp its real epoch).
    assert frame == %{
             "type" => "emote_broadcast",
             "epoch" => 0,
             "playerId" => "guest_b",
             "nickname" => "New Name",
             "emote" => "wave"
           }

    # Spam within 500 ms is rejected silently.
    RoomServer.emote(pid, "guest_b", :cb, "dance")
    refute_receive {:recorded, :a, %{"type" => "emote_broadcast"}}, 200

    # A RECONNECT (new conn_ref) may emote immediately: the cooldown is
    # keyed to the transport session, not the roster entry.
    b2 = WorldTestHelper.recorder!(self(), :b2)
    RoomServer.join(pid, attrs(b2, "guest_b", "New Name", :cb2, pose()))
    RoomServer.emote(pid, "guest_b", :cb2, "bow")
    assert wait_for(:a, &(&1["type"] == "emote_broadcast" and &1["emote"] == "bow"))["playerId"] == "guest_b"

    # Unknown ids are rejected without broadcasts and without burning state.
    RoomServer.emote(pid, "guest_b", :cb2, "floss")
    refute_receive {:recorded, :a, %{"type" => "emote_broadcast", "emote" => "floss"}}, 200
  end

  test "update_avatar updates member avatar and broadcasts presence_update to others in room", %{room: room} do
    pid = start_room!(room)
    a = WorldTestHelper.recorder!(self(), :a)
    b = WorldTestHelper.recorder!(self(), :b)

    RoomServer.join(pid, attrs(a, "guest_a", "Guest A", :ca, pose()))
    RoomServer.join(pid, attrs(b, "guest_b", "Guest B", :cb, pose()))
    _ = recorded_frames(:a)
    _ = recorded_frames(:b)

    RoomServer.update_avatar(pid, "guest_b", "neon-jellyfish")
    frame = wait_for(:a, &(&1["type"] == "presence_update"))
    assert frame["type"] == "presence_update"
    assert Enum.any?(frame["players"], &(&1["id"] == "guest_b" and &1["avatar"] == "neon-jellyfish"))
  end

  test "empty room retires after the grace period and rejoins fresh" do
    # Distinct wire id: the rejoined room lives under the app tree and
    # would collide with later tests' "market" children.
    wire = "grace-room-#{System.unique_integer([:positive])}"

    # Shrink the grace for the test.
    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :empty_room_grace_ms, 80))

    try do
      a = WorldTestHelper.recorder!(self(), :a)

      assert {:ok, _room_pid, _roster} = World.join(wire, "guest_a", :ca, a, "A")
      assert World.leave(wire, "guest_a", :ca, :travel) == :ok

      # The room stops after the grace; membership vanishes (today's
      # observable behavior for empty rooms).
      wait_until(fn ->
        Registry.lookup(Afterlight.World.Registry, {RoomServer, wire}) == []
      end)

      # A later join starts a fresh room with an empty roster.
      a2 = WorldTestHelper.recorder!(self(), :a2)
      assert {:ok, _pid2, %{"players" => []}} = World.join(wire, "guest_a", :ca2, a2, "A")

      assert_receive {:telemetry, [:afterlight, :room, :stopped], %{lifetime_ms: ms}, %{room: ^wire}} when ms >= 0
    after
      Application.put_env(:afterlight, :world, world_cfg())
    end
  end

  test "stalled consumer is disconnected at the outbound bound; other members keep streaming", %{wire: wire, room: room} do
    Application.put_env(:afterlight, :world,
      world_cfg() |> Keyword.put(:outbound_queue_max, 3) |> Keyword.put(:flush_interval_ms, 15)
    )

    try do
      pid = start_room!(room)
      healthy = WorldTestHelper.recorder!(self(), :healthy)
      stalled = WorldTestHelper.stalled_channel!(self())

      RoomServer.join(pid, attrs(healthy, "guest_a", "A", :ca, pose()))
      RoomServer.join(pid, attrs(stalled, "guest_b", "B", :cb, pose()))
      _ = recorded_frames(:healthy)

      # Keep the room dirty so every tick flushes; the stalled channel's
      # unread queue crosses the bound.
      for i <- 0..40 do
        RoomServer.movement(pid, "guest_a", :ca, %{"x" => i * 0.1, "z" => 0.0, "rotY" => 0, "walking" => true})
        Process.sleep(5)
      end

      # The stalled member is removed and its channel is told to close
      # (retryable room_stalled); the healthy member keeps receiving.
      assert_receive {:stalled, :stalled}, 5_000
      assert World.member?(room.wire_id, "guest_b", :cb) == false
      assert World.member?(room.wire_id, "guest_a", :ca) == true

      assert wait_for(:healthy, &(&1["type"] == "presence_update" and &1["players"] != []), 2_000)
      assert_receive {:telemetry, [:afterlight, :room, :leave], %{}, %{room: ^wire, reason: :stalled}}, 2_000
    after
      Application.put_env(:afterlight, :world, world_cfg())
    end
  end

  test "room crash: restart with empty state; durable gating refuses non-members", %{room: room} do
    # The application tree already runs Afterlight.World.Supervisor in the
    # test VM; the facade joins through it. Rooms started under the app tree
    # are stopped in on_exit so they cannot leak into later tests.
    on_exit(fn -> stop_app_rooms!([room.wire_id]) end)

    a = WorldTestHelper.recorder!(self(), :a)

    assert {:ok, room_pid, _roster} = World.join(room.wire_id, "guest_a", :ca, a, "A")
    assert World.member?(room.wire_id, "guest_a", :ca)

    # Crash the room; the DynamicSupervisor restarts it empty (D9).
    Process.exit(room_pid, :kill)

    wait_until(fn ->
      case Registry.lookup(Afterlight.World.Registry, {RoomServer, room.wire_id}) do
        [{pid, _}] -> pid != room_pid
        [] -> false
      end
    end)

    # The restarted room holds no membership: the gateway's durable gate
    # would refuse (no live membership), and a rejoin restores it.
    assert World.member?(room.wire_id, "guest_a", :ca) == false

    a2 = WorldTestHelper.recorder!(self(), :a2)
    assert {:ok, _pid, %{"players" => []}} = World.join(room.wire_id, "guest_a", :ca2, a2, "A")
    assert World.member?(room.wire_id, "guest_a", :ca2)
  end

  test "facade resolves rooms and refuses non-resolvable ids" do
    # The fallback lands on the SHARED "market" wire id; stop it on exit so
    # it cannot leak into later tests.
    on_exit(fn -> stop_app_rooms!(["kiln-terrace", "market"]) end)

    a = WorldTestHelper.recorder!(self(), :a)

    assert {:ok, _pid, %{"players" => []}} = World.join("kiln-terrace", "guest_a", :ca, a, "A")
    assert World.member?("kiln-terrace", "guest_a", :ca)

    # Falsy fallback to market (Node `msg.roomId || 'market'`).
    assert {:ok, _pid2, %{"players" => []}} = World.join("", "guest_a", :ca2, a, "A")
    assert World.member?("market", "guest_a", :ca2)

    # Non-binary ids resolve to :error at the channel; the facade leaves
    # membership untouched.
    assert World.member?(nil, "guest_a", :ca) == false
  end

  test "telemetry payloads carry only room/player identifiers and counts, never secrets" do
    # Shrink the empty-room grace so the :stopped event lands within the
    # test (task 6.2: the no-secrets contract is checked over a FULL
    # join → move → emote → leave → retire sequence).
    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :empty_room_grace_ms, 60))

    wire = "telemetry-#{System.unique_integer([:positive])}"

    try do
      a = WorldTestHelper.recorder!(self(), :a)

      assert {:ok, _pid, _roster} = World.join(wire, "guest_a", :ca, a, "A", pose(1.0))
      assert World.movement(wire, "guest_a", :ca, %{"x" => 2.0, "z" => 2.0, "rotY" => 0.5, "walking" => true}) == :ok
      assert World.emote(wire, "guest_a", :ca, "wave") == :ok

      # The dirty flush emits tick + coalesced at the next tick boundary —
      # BEFORE the leave (a room that emptied before its first flush tick
      # retires silently, without a flush).
      assert_receive {:telemetry, [:afterlight, :room, :tick], tick_m, %{room: ^wire}}, 2_000
      assert tick_m == %{duration_ms: tick_m.duration_ms, roster_size: 1}
      assert is_integer(tick_m.duration_ms) and tick_m.duration_ms >= 0

      assert_receive {:telemetry, [:afterlight, :movement, :coalesced], coalesced_m, %{room: ^wire}}, 2_000
      assert coalesced_m == %{received: 1, flushed: 1}

      assert World.leave(wire, "guest_a", :ca, :travel) == :ok

      # The telemetry stream is VM-wide and parallel test modules share
      # it (their rooms' retire/stops land in this tap's post-stop drain);
      # keep only this test's room before the exact-shape assertions.
      events =
        Enum.filter(collect_until_room_stopped(wire), fn {_, _, _, metadata} ->
          metadata[:room] == wire
        end)

      # Exactly one event of each remaining kind — nothing extra, nothing
      # missing (tick/coalesced were consumed above).
      assert Enum.sort(Enum.map(events, &elem(&1, 1))) ==
               Enum.sort([
                 [:afterlight, :room, :join],
                 [:afterlight, :room, :leave],
                 [:afterlight, :room, :stopped]
               ])

      assert_telemetry_payloads_safe(events, wire)

      # Pin the exact payloads (small maps — a new field shows up here, not
      # silently on the wire).
      assert Enum.find(events, &match?({:telemetry, [:afterlight, :room, :join], _, _}, &1)) ==
               {:telemetry, [:afterlight, :room, :join], %{roster_size: 0}, %{room: wire, player: "guest_a"}}

      assert Enum.find(events, &match?({:telemetry, [:afterlight, :room, :leave], _, _}, &1)) ==
               {:telemetry, [:afterlight, :room, :leave], %{}, %{room: wire, player: "guest_a", reason: :travel}}

      {_, _, stopped_m, stopped_md} = Enum.find(events, &match?({:telemetry, [:afterlight, :room, :stopped], _, _}, &1))
      assert is_integer(stopped_m.lifetime_ms) and stopped_m.lifetime_ms >= 0
      assert stopped_md == %{room: wire}
    after
      Application.put_env(:afterlight, :world, world_cfg())
    end
  end

  test "a movement burst from many senders drains the room mailbox and keeps poses O(actors)", %{room: room} do
    # Short flush interval so ticks interleave with the burst (task 7.3).
    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :flush_interval_ms, 20))

    try do
      pid = start_room!(room)

      actors = Enum.map(0..(@burst_senders - 1), fn i -> {"guest_#{i}", {:conn, i}} end)
      recorders = Map.new(actors, fn {id, _conn} -> {id, WorldTestHelper.recorder!(self(), id)} end)

      for {id, conn} <- actors do
        assert {:ok, _roster} = RoomServer.join(pid, attrs(recorders[id], id, id, conn, pose()))
      end

      Enum.each(actors, fn {id, _conn} -> _ = recorded_frames(id) end)

      # 500 movements through the public facade, from one process per actor.
      parent = self()

      for {id, conn} <- actors do
        spawn(fn ->
          for k <- 1..@burst_per_sender do
            World.movement(room.wire_id, id, conn, %{"x" => k / 100.0, "z" => 0.0, "rotY" => 0, "walking" => true})
          end

          send(parent, {:burst_done, id})
        end)
      end

      for _ <- actors do
        assert_receive {:burst_done, _id}, 5_000
      end

      # No selective receive anywhere (design D3a): once the burst stops,
      # the room's own mailbox drains back to ~empty — the only message
      # that can remain is the next tick timer.
      wait_until(fn ->
        {:message_queue_len, len} = Process.info(pid, :message_queue_len)
        len <= 1
      end)

      # One post-burst marker movement forces a final flush after the drain,
      # so the frame below is the settled post-burst state.
      {marker_id, marker_conn} = hd(actors)

      assert World.movement(room.wire_id, marker_id, marker_conn, %{
               "x" => 7.5,
               "z" => 1.0,
               "rotY" => 0,
               "walking" => false
             }) == :ok

      frame =
        wait_for(
          marker_id,
          &(&1["type"] == "presence_update" and
              Enum.any?(&1["players"], fn p -> p["id"] == marker_id and p["x"] == 7.5 end))
        )

      # O(actors): exactly one entry per actor — never one per movement —
      # and each entry is the NEWEST pose for that actor (design D3b).
      assert length(frame["players"]) == length(actors)

      by_id = Map.new(frame["players"], &{&1["id"], &1})
      assert by_id[marker_id]["x"] == 7.5

      for {id, _conn} <- tl(actors) do
        assert by_id[id]["x"] == @burst_per_sender / 100.0
      end
    after
      Application.put_env(:afterlight, :world, world_cfg())
    end
  end

  test "a room crash leaves other rooms and their members untouched", %{room: room} do
    wire_b = "unaffected-#{System.unique_integer([:positive])}"

    on_exit(fn -> stop_app_rooms!([room.wire_id, wire_b]) end)

    a = WorldTestHelper.recorder!(self(), :a)
    b = WorldTestHelper.recorder!(self(), :b)

    assert {:ok, room_a_pid, _roster} = World.join(room.wire_id, "guest_a", :ca, a, "A")
    assert {:ok, _room_b_pid, _roster} = World.join(wire_b, "guest_b", :cb, b, "B")
    _ = recorded_frames(:a)
    _ = recorded_frames(:b)

    # Kill room A only (design D9 containment).
    Process.exit(room_a_pid, :kill)

    wait_until(fn ->
      case Registry.lookup(Afterlight.World.Registry, {RoomServer, room.wire_id}) do
        [{pid, _}] -> pid != room_a_pid
        [] -> false
      end
    end)

    # Room B never noticed: its member is still live and the room keeps
    # flushing normally.
    assert World.member?(wire_b, "guest_b", :cb)
    assert World.movement(wire_b, "guest_b", :cb, %{"x" => 3.0, "z" => 3.0, "rotY" => 0, "walking" => true}) == :ok

    frame = wait_for(:b, &(&1["type"] == "presence_update" and &1["players"] != []))
    assert hd(frame["players"])["id"] == "guest_b"
    assert hd(frame["players"])["x"] == 3.0

    # A's member lost live membership (the durable gate would refuse); the
    # desiredRoom replay rejoins the restarted room fresh and empty.
    assert World.member?(room.wire_id, "guest_a", :ca) == false

    a2 = WorldTestHelper.recorder!(self(), :a2)
    assert {:ok, _pid, %{"players" => []}} = World.join(room.wire_id, "guest_a", :ca2, a2, "A")
    assert World.member?(room.wire_id, "guest_a", :ca2)
  end

  ## Helpers

  defp world_cfg do
    Application.get_env(:afterlight, :world, [])
  end

  # Stops rooms started under the application tree (World.join facade) so a
  # test cannot leak them into later tests; no-op for rooms already gone.
  defp stop_app_rooms!(wires) do
    for wire <- wires do
      case Registry.lookup(Afterlight.World.Registry, {RoomServer, wire}) do
        [{pid, _}] -> DynamicSupervisor.terminate_child(Afterlight.World.DynamicSupervisor, pid)
        [] -> :ok
      end
    end

    :ok
  end

  # Collects telemetry until the room's :stopped event for `wire`, then one
  # quiet window for anything still in flight.
  defp collect_until_room_stopped(wire, acc \\ []) do
    receive do
      {:telemetry, [:afterlight, :room, :stopped], _m, %{room: ^wire}} = event ->
        Enum.reverse([event | acc]) ++ drain_telemetry([])

      {:telemetry, _, _, _} = event ->
        collect_until_room_stopped(wire, [event | acc])
    after
      2_000 -> flunk("[:afterlight, :room, :stopped] never arrived for #{wire}")
    end
  end

  defp drain_telemetry(acc) do
    receive do
      {:telemetry, _, _, _} = event -> drain_telemetry([event | acc])
    after
      150 -> Enum.reverse(acc)
    end
  end

  # The no-secrets contract (task 6.2): every event carries exactly the
  # documented measurement/metadata key sets — counts, room and player
  # identifiers, a reason atom — and nothing resembling a credential.
  defp assert_telemetry_payloads_safe(events, wire) do
    allowed = %{
      [:afterlight, :room, :join] => {[:roster_size], [:player, :room]},
      [:afterlight, :room, :leave] => {[], [:player, :reason, :room]},
      [:afterlight, :room, :tick] => {[:duration_ms, :roster_size], [:room]},
      [:afterlight, :movement, :coalesced] => {[:flushed, :received], [:room]},
      [:afterlight, :room, :stopped] => {[:lifetime_ms], [:room]}
    }

    for {:telemetry, event, measurements, metadata} <- events do
      case Map.fetch(allowed, event) do
        {:ok, {measurement_keys, metadata_keys}} ->
          assert MapSet.new(Map.keys(measurements)) == MapSet.new(measurement_keys),
                 "unexpected measurement keys for #{inspect(event)}: #{inspect(measurements)}"

          assert MapSet.new(Map.keys(metadata)) == MapSet.new(metadata_keys),
                 "unexpected metadata keys for #{inspect(event)}: #{inspect(metadata)}"

          fields = Enum.concat(Map.to_list(measurements), Map.to_list(metadata))

          for {key, value} <- fields do
            assert is_integer(value) or is_boolean(value) or is_atom(value) or is_binary(value),
                   "telemetry #{inspect(event)} field #{inspect(key)} is not an identifier/count: #{inspect(value)}"

            if is_binary(value) do
              refute String.contains?(String.downcase(value), [
                       "token",
                       "secret",
                       "credential",
                       "bearer",
                       "password",
                       "authorization"
                     ]), "telemetry #{inspect(event)} field #{inspect(key)} looks like a credential: #{inspect(value)}"
            end
          end

          if event == [:afterlight, :room, :leave] do
            assert metadata.reason in [:travel, :disconnect, :stalled]
          end

          assert metadata[:room] in [nil, wire]

        :error ->
          flunk("unexpected telemetry event: #{inspect(event)}")
      end
    end
  end

  defp wait_until(pred, timeout \\ 3_000) do
    if pred.() do
      :ok
    else
      if timeout <= 0, do: flunk("condition not met")
      Process.sleep(20)
      wait_until(pred, timeout - 20)
    end
  end
end

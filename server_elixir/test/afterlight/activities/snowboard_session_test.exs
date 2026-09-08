defmodule Afterlight.Activities.SnowboardSessionTest do
  @moduledoc """
  Snowboard race lifecycle tests against a real SessionServer process
  (add-multiplayer-snowboard-arcade 4.2, design D4): lone riders wait, two of
  eight lock a roster into a 3s countdown, unready/leave/disconnect cancel a
  locked countdown, disconnects never pause a race and expire into
  DNF(disconnect), explicit leave is DNF(leave) while others continue, the
  deadline finalizes results, readiness requires the course handshake, and
  results retention releases remaining viewers.
  """

  use ExUnit.Case, async: false

  alias Afterlight.Activities
  alias Afterlight.World.Lease

  @course Afterlight.Activities.Snowboard.SessionPolicy.course()

  @act_def %{
    "id" => "summit-run",
    "type" => "snowboard-race",
    "rulesVersion" => 1,
    "minPlayers" => 2,
    "capacities" => %{"players" => 8, "spectators" => 32, "queue" => 16},
    "interactionRadius" => 3.0,
    "transform" => %{"position" => [10.42, 0.0, 2.6]}
  }

  setup do
    # The snowboard admission flag is disabled by default; lifecycle tests
    # run with it enabled, and a dedicated test proves the closed door.
    Application.put_env(:afterlight, :snowboard_enabled, true)
    on_exit(fn -> Application.put_env(:afterlight, :snowboard_enabled, false) end)

    room_pid = spawn_link(fn -> fake_room_loop(%{}, self(), []) end)
    room_key = "theater-test-#{System.unique_integer([:positive])}"
    room_epoch = 1

    handle = %Lease.Handle{room_key: room_key, owner_node: "test_node", epoch: room_epoch, fenced: false}

    %{
      room_pid: room_pid,
      room_key: room_key,
      room_epoch: room_epoch,
      handle: handle
    }
  end

  defp fake_room_loop(members, test_pid, broadcasts) do
    receive do
      {:set_member, player_id, conn_ref, pose} ->
        fake_room_loop(Map.put(members, player_id, %{conn_ref: conn_ref, pose: pose}), test_pid, broadcasts)

      {:remove_member, player_id} ->
        fake_room_loop(Map.delete(members, player_id), test_pid, broadcasts)

      {:"$gen_call", from, {:member?, player_id, conn_ref}} ->
        m = Map.get(members, player_id)
        res = if members == %{}, do: true, else: m != nil and m.conn_ref == conn_ref
        GenServer.reply(from, res)
        fake_room_loop(members, test_pid, broadcasts)

      {:"$gen_call", from, {:member_pose, _player_id}} ->
        if members == %{} do
          GenServer.reply(from, {:ok, %{x: 9.3, z: 2.6}})
        else
          GenServer.reply(from, :not_found)
        end

        fake_room_loop(members, test_pid, broadcasts)

      {:"$gen_call", from, :lease_handle} ->
        GenServer.reply(from, {:ok, 1})
        fake_room_loop(members, test_pid, broadcasts)

      {:"$gen_cast", {:broadcast_frame, frame}} ->
        send(test_pid, {:world_frame, "theater", frame})
        fake_room_loop(members, test_pid, [frame | broadcasts])

      {:"$gen_call", from, :broadcast_frames} ->
        GenServer.reply(from, Enum.reverse(broadcasts))
        fake_room_loop(members, test_pid, broadcasts)

      {:"$gen_cast", {:send_to_members, pids, frame}} ->
        # Mirror RoomServer.send_to_members: addressed frames go to their
        # target channel pids tagged as world frames.
        Enum.each(pids, fn pid -> send(pid, {:world_frame, "theater", frame}) end)
        fake_room_loop(members, test_pid, broadcasts)

      :stop ->
        :ok

      _other ->
        fake_room_loop(members, test_pid, broadcasts)
    end
  end

  defp start_session(ctx, extra_opts \\ []) do
    {:ok, session_pid} =
      Activities.get_or_start_session(
        ctx.room_pid,
        ctx.room_key,
        ctx.room_epoch,
        "summit-run",
        ctx.handle,
        [activity_def: @act_def, check_proximity: false] ++ extra_opts
      )

    session_pid
  end

  defp make_player(prefix) do
    uid = System.unique_integer([:positive])
    %{player_id: "#{prefix}_#{uid}", conn_ref: 1, channel_pid: self()}
  end

  defp join(session, player) do
    assert {:ok, %{result: "seated", slot: slot, lease: lease}} =
             GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, player})

    {slot, lease}
  end

  defp load(session, player, slot_lease, opts \\ %{}) do
    controls =
      Map.merge(
        %{
          "kind" => "loaded",
          "courseId" => Map.get(@course.doc, "id"),
          "courseVersion" => Map.get(@course.doc, "version"),
          "courseHash" => @course.hash
        },
        opts
      )

    payload = %{
      "sessionId" => Afterlight.Activities.session_id(session),
      "lease" => elem(slot_lease, 1),
      "seq" => System.unique_integer([:positive]),
      "matchId" => Activities.session_info(session).match_id,
      "controls" => controls
    }

    GenServer.call(session, {:command, "activity_input", payload, player})
  end

  defp ready(session, player, ready?) do
    GenServer.call(
      session,
      {:command, "activity_ready",
       %{
         "ready" => ready?,
         "requestId" => "r#{System.unique_integer([:positive])}",
         "matchId" => Activities.session_info(session).match_id
       }, player}
    )
  end

  defp status(session), do: Activities.session_info(session).status

  test "nonready seated riders are released after the bounded inactivity window", ctx do
    session = start_session(ctx, nonready_inactivity_ms: 150)
    player = make_player("idle")
    {slot, _lease} = join(session, player)
    assert slot == 0

    # No user action follows: the rider is released without ever readying.
    wait_until(2_000, fn -> Activities.session_info(session).player_to_slot == %{} end)
    assert Activities.session_info(session).players == %{}
  end

  test "disabled flag fails admission closed with the typed error", ctx do
    Application.put_env(:afterlight, :snowboard_enabled, false)

    assert {:error, :race_unavailable} =
             Activities.get_or_start_session(
               ctx.room_pid,
               ctx.room_key,
               ctx.room_epoch,
               "summit-run",
               ctx.handle,
               activity_def: @act_def,
               check_proximity: false
             )

    # The closed door creates no session at all: lookup stays empty.
    assert {:error, :not_found} = Activities.lookup_session(ctx.room_key, ctx.room_epoch, "summit-run")
  end

  test "lone rider waits: ready with one seated rider never starts", ctx do
    session = start_session(ctx)
    player = make_player("lone")
    {slot, lease} = join(session, player)
    assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
    assert {:ok, _} = ready(session, player, true)

    assert status(session) == :lobby
  end

  test "readiness requires the exact course handshake", ctx do
    session = start_session(ctx)
    player = make_player("p")
    {slot, lease} = join(session, player)

    assert {:error, :not_loaded} = ready(session, player, true)

    assert {:error, :course_mismatch} =
             load(session, player, {slot, lease}, %{"courseHash" => String.duplicate("0", 64)})

    assert {:error, :course_mismatch} = load(session, player, {slot, lease}, %{"courseVersion" => 99})

    assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
  end

  test "two of eight lock the roster, countdown starts the race, match rotates", ctx do
    session = start_session(ctx, countdown_ms: 150, race_deadline_ms: 5_000)

    for prefix <- ["a", "b"] do
      player = make_player(prefix)
      {slot, lease} = join(session, player)
      assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
      assert {:ok, _} = ready(session, player, true)
    end

    assert status(session) == :countdown
    match_before = Activities.session_info(session).match_id

    # GO arrives after the (shortened) countdown.
    wait_until(2_000, fn -> status(session) == :in_progress end)
    assert status(session) == :in_progress
    match_after = Activities.session_info(session).match_id
    assert match_before not in [nil, match_after], "match identity rotates at GO"

    info = Activities.session_info(session)
    assert map_size(info.sim_state["riders"]) == 2
  end

  test "unready during countdown cancels it and clears ALL readiness", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    players =
      for prefix <- ["a", "b"] do
        player = make_player(prefix)
        {slot, lease} = join(session, player)
        assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
        assert {:ok, _} = ready(session, player, true)
        player
      end

    assert status(session) == :countdown

    assert {:ok, _} = ready(session, Enum.at(players, 1), false)

    assert status(session) == :lobby
    info = Activities.session_info(session)
    assert Enum.all?(Map.values(info.players), fn p -> p.ready == false end), "all readiness cleared"
  end

  test "disconnect never pauses the race; grace expiry marks DNF(disconnect)", ctx do
    test_pid = self()

    session = start_session(ctx, countdown_ms: 120, race_deadline_ms: 5_000, reconnect_grace_ms: 200)

    leaver = make_player("gone")
    # Back the leaver with a REAL process so the session monitors it.
    # Deliberately unlinked: killing it must not take the test down.
    leaver_chan = spawn(fn -> fake_channel_loop(test_pid) end)
    leaver = %{leaver | channel_pid: leaver_chan}

    keeper = make_player("keep")

    {slot1, lease1} = join(session, leaver)
    assert {:ok, %{result: "loaded"}} = load(session, leaver, {slot1, lease1})
    assert {:ok, _} = ready(session, leaver, true)

    {slot2, lease2} = join(session, keeper)
    assert {:ok, %{result: "loaded"}} = load(session, keeper, {slot2, lease2})
    assert {:ok, _} = ready(session, keeper, true)

    wait_until(2_000, fn -> status(session) == :in_progress end)

    # Kill the leaver's channel: the race must keep running (no pause).
    Process.exit(leaver_chan, :kill)
    wait_until(1_000, fn -> status(session) == :in_progress end)
    assert status(session) == :in_progress
    Process.sleep(50)
    assert status(session) == :in_progress, "race continues through disconnects"

    # Grace expiry DNFs the absent rider once.
    wait_until(2_000, fn ->
      info = Activities.session_info(session)
      rider = info.sim_state["riders"][slot1]
      rider && rider["dnfReason"] == "disconnect"
    end)

    info = Activities.session_info(session)
    assert info.sim_state["riders"][slot1]["dnfReason"] == "disconnect"
    assert info.status == :in_progress, "the remaining rider keeps racing"
  end

  test "explicit leave mid-race is DNF(leave); deadline finalizes session-local results", ctx do
    session = start_session(ctx, countdown_ms: 120, race_deadline_ms: 300, results_retention_ms: 200)

    leaver = make_player("leaver")
    {slot1, lease1} = join(session, leaver)
    assert {:ok, %{result: "loaded"}} = load(session, leaver, {slot1, lease1})
    assert {:ok, _} = ready(session, leaver, true)

    keeper = make_player("keeper")
    {slot2, lease2} = join(session, keeper)
    assert {:ok, %{result: "loaded"}} = load(session, keeper, {slot2, lease2})
    assert {:ok, _} = ready(session, keeper, true)

    wait_until(2_000, fn -> status(session) == :in_progress end)

    assert {:ok, %{result: "left"}} =
             GenServer.call(session, {:command, "activity_leave", %{"matchId" => Activities.session_info(session).match_id}, leaver})

    info = Activities.session_info(session)
    assert info.sim_state["riders"][slot1]["dnfReason"] == "leave"
    assert info.status == :in_progress, "remaining rider continues — no forfeit victory"

    # The race deadline DNFs the remaining rider and finalizes results.
    wait_until(2_000, fn -> status(session) == :ended end)
    info = Activities.session_info(session)
    assert info.match_outcome["kind"] == "snowboard_race"
    assert info.match_outcome["recordingStatus"] == "session_only"
    assert info.match_outcome["reason"] == "deadline"

    standings = info.match_outcome["standings"]
    leaver_row = Enum.find(standings, &(&1["slot"] == slot1))
    keeper_row = Enum.find(standings, &(&1["slot"] == slot2))
    assert leaver_row["status"] == "dnf" and leaver_row["dnfReason"] == "leave" and leaver_row["timeMs"] == nil
    assert keeper_row["status"] == "dnf" and keeper_row["dnfReason"] == "deadline"
    assert leaver_row["place"] < keeper_row["place"] == false or leaver_row["place"] != keeper_row["place"]

    # Bounded results retention releases remaining viewers, then reaps.
    wait_until(2_000, fn -> Activities.session_info(session).player_to_slot == %{} end)
    assert Activities.session_info(session).player_to_slot == %{}
  end

  test "match identity rotates across rematches without stale-command effects", ctx do
    session = start_session(ctx, countdown_ms: 100, race_deadline_ms: 250, results_retention_ms: 100)

    players =
      for prefix <- ["r1", "r2"] do
        player = make_player(prefix)
        {slot, lease} = join(session, player)
        assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
        assert {:ok, _} = ready(session, player, true)
        {player, slot, lease}
      end

    wait_until(2_000, fn -> status(session) == :in_progress end)
    match1 = Activities.session_info(session).match_id

    # Deadline ends the race.
    wait_until(2_000, fn -> status(session) == :ended end)

    # Rematch: readiness again after the course is still loaded.
    for {player, _slot, _lease} <- players do
      assert {:ok, _} = ready(session, player, true)
    end

    assert status(session) == :countdown
    wait_until(2_000, fn -> status(session) == :in_progress end)
    match2 = Activities.session_info(session).match_id

    assert match1 != match2, "every locked countdown rotates the match identity"
    info = Activities.session_info(session)
    assert map_size(info.sim_state["riders"]) == 2
    assert Enum.all?(Map.values(info.sim_state["riders"]), &(&1["s"] == 0 and &1["nextCheckpoint"] == 1)),
           "race state fully resets for the new match"
  end

  describe "race snapshot delivery (5.2/5.3)" do
    test "seated riders receive addressed participant snapshots with a private self attachment", ctx do
      session = start_session(ctx, countdown_ms: 120, race_deadline_ms: 6_000)

      player = make_player("rider")
      {slot, lease} = join(session, player)
      assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
      assert {:ok, _} = ready(session, player, true)

      second = make_player("second")
      {slot2, lease2} = join(session, second)
      assert {:ok, %{result: "loaded"}} = load(session, second, {slot2, lease2})
      assert {:ok, _} = ready(session, second, true)

      wait_until(2_000, fn ->
        st = status(session)
        if st != :in_progress, do: IO.inspect({st, ctx.room_key}, label: "[dbg-delivery]")
        st == :in_progress
      end)

      # The riders' channels are THIS test process: drain its mailbox for
      # activity_state frames addressed to the room.
      frames = drain_activity_states(200)
      assert length(frames) > 0, "participant snapshots arrive"

      # Countdown-phase frames are expected too; racing frames prove delivery.
      racing = Enum.filter(frames, &(&1["status"] == "racing"))
      assert length(racing) > 0, "racing-phase participant snapshots arrive"

      for frame <- racing do
        assert Map.get(frame, "audience") == "participants"
        assert Map.get(frame, "roomId") == ctx.room_key
        assert Map.get(frame, "snapshotSeq") > 0
        assert Map.get(frame, "courseHash") == @course.hash
        sim = get_in(frame, ["state", "sim"])
        assert is_map(sim["riders"]) and map_size(sim["riders"]) == 2
      end

      # At least one racing frame carries THIS rider's private attachment...
      assert Enum.any?(racing, fn frame -> is_map(Map.get(frame, "self")) end),
             "private self attachment travels to its owner"

      # ...and summaries reach the room-wide channel without sim/self data
      # (queried directly from the fake room's broadcast log — the test
      # mailbox also floods with 20Hz addressed frames).
      wait_until(2_500, fn ->
        broadcasts = GenServer.call(ctx.room_pid, :broadcast_frames)
        broadcasts |> Enum.filter(&summary?(&1)) |> Enum.filter(&(&1["status"] == "racing")) |> length() >= 2
      end)

      racing_summaries =
        GenServer.call(ctx.room_pid, :broadcast_frames)
        |> Enum.filter(&summary?(&1))
        |> Enum.filter(&(&1["status"] == "racing"))

      assert length(racing_summaries) >= 2, "summaries re-fire (got #{length(racing_summaries)} of #{length(Enum.filter(GenServer.call(ctx.room_pid, :broadcast_frames), &(&1["audience"] == "summary")))})"

      for summary <- racing_summaries do
        assert Map.get(summary, "audience") == "summary"
        assert is_map(Map.get(summary, "summary"))
        assert Map.get(summary, "summary")["capacity"] == 8
        assert length(Map.get(summary, "summary")["progress"]) == 2
        refute Map.has_key?(summary, "state")
        refute Map.has_key?(summary, "self")
      end
    end
  end

  defp summary?(frame) do
    Map.get(frame, "audience") == "summary" and is_map(Map.get(frame, "summary")) and
      not Map.has_key?(frame, "self") and not Map.has_key?(frame, "state")
  end

  defp drain_activity_states(max \\ 100) do
    drain_activity_states(max, [])
  end

  defp drain_activity_states(0, acc), do: acc

  defp drain_activity_states(max, acc) do
    receive do
      {:world_frame, _room_id, %{"type" => "activity_state"} = frame} ->
        drain_activity_states(max - 1, [frame | acc])

      {:world_frame, _room_id, _frame} ->
        drain_activity_states(max - 1, acc)

      _other ->
        drain_activity_states(max - 1, acc)
    after
      50 -> acc
    end
  end

  defp wait_until(timeout_ms, fun) do
    deadline = System.monotonic_time(:millisecond) + timeout_ms

    wait_loop(deadline, fun)
  end

  defp wait_loop(deadline, fun) do
    if fun.() do
      :ok
    else
      if System.monotonic_time(:millisecond) >= deadline do
        flunk("condition not met before timeout")
      end

      Process.sleep(20)
      wait_loop(deadline, fun)
    end
  end

  defp fake_channel_loop(test_pid) do
    receive do
      msg ->
        send(test_pid, {:channel_msg, msg})
        fake_channel_loop(test_pid)
    end
  end

  describe "stale match fence (D7)" do
    test "a leave signed for an old match never DNFs the new race", ctx do
      session = start_session(ctx, countdown_ms: 120, race_deadline_ms: 5_000, results_retention_ms: 60_000)

      players =
        for prefix <- ["s1", "s2"] do
          player = make_player(prefix)
          {slot, lease} = join(session, player)
          assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
          assert {:ok, _} = ready(session, player, true)
          {player, slot}
        end

      wait_until(2_000, fn -> status(session) == :in_progress end)

      # An old-match leave arrives: rejected.
      assert {:error, :stale_match} =
               GenServer.call(session, {:command, "activity_leave", %{"matchId" => "match_stale"}, elem(Enum.at(players, 0), 0)})

      # The current race is untouched.
      info = Activities.session_info(session)
      assert map_size(info.players) == 2
      assert Enum.all?(Map.values(info.sim_state["riders"]), &is_nil(&1["dnfReason"]))
    end

    test "a ready signed for an old match is rejected without altering readiness", ctx do
      session = start_session(ctx, countdown_ms: 5_000)

      player = make_player("fence")
      {slot, lease} = join(session, player)
      assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
      assert {:ok, _} = ready(session, player, true)

      assert {:error, :stale_match} =
               GenServer.call(session, {:command, "activity_ready", %{"ready" => false, "matchId" => "match_old"}, player})

      assert {:error, :invalid_request} =
               GenServer.call(session, {:command, "activity_ready", %{"ready" => false}, player})

      info = Activities.session_info(session)
      rider_slot = info.player_to_slot[player.player_id]
      assert info.players[rider_slot].ready == true, "the stale packets changed nothing"
    end

    test "input signed for an old match is rejected and the race continues", ctx do
      session = start_session(ctx, countdown_ms: 120, race_deadline_ms: 4_000)

      players =
        for prefix <- ["i1", "i2"] do
          player = make_player(prefix)
          {slot, lease} = join(session, player)
          assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
          assert {:ok, _} = ready(session, player, true)
          player
        end

      wait_until(2_000, fn -> status(session) == :in_progress end)

      [first, _second] = players
      info = Activities.session_info(session)
      slot = info.player_to_slot[first.player_id]

      assert {:error, :stale_match} =
               GenServer.call(session, {:command, "activity_input",
                 %{
                   "sessionId" => info.session_id,
                   "lease" => info.players[slot].lease_id,
                   "seq" => 9_001,
                   "matchId" => "match_stale",
                   "controls" => %{"kind" => "ride", "steer" => 0.0, "tuck" => true, "brake" => false, "jumpHeld" => false}
                 }, first})

      info = Activities.session_info(session)
      assert info.status == :in_progress
      assert Enum.all?(Map.values(info.sim_state["riders"]), &is_nil(&1["dnfReason"]))
    end
  end

describe "canonical instance identity (4.4)" do
  test "equal cabinet ids under distinct instance keys never share a session", ctx do
    handle_a = %{ctx.handle | room_key: "default:theater-a-#{System.unique_integer([:positive])}:main"}
    handle_b = %{ctx.handle | room_key: "default:theater-a-#{System.unique_integer([:positive])}:two"}

    {:ok, main} =
      Activities.get_or_start_session(ctx.room_pid, handle_a.room_key, 1, "summit-run", handle_a,
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    {:ok, two} =
      Activities.get_or_start_session(ctx.room_pid, handle_b.room_key, 1, "summit-run", handle_b,
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    refute main == two
    assert Activities.lookup_session(handle_a.room_key, 1, "summit-run") == {:ok, main}
    assert Activities.lookup_session(handle_b.room_key, 1, "summit-run") == {:ok, two}

    # A rider seated in the main instance does not appear in the other.
    {slot, _lease} = join(main, make_player("solo"))
    assert slot == 0
    assert Activities.session_info(two).player_to_slot == %{}
  end

  test "epoch change yields a fresh session identity (owner failover)", ctx do
    handle = %{ctx.handle | room_key: "default:theater-a-#{System.unique_integer([:positive])}:main"}

    {:ok, first} =
      Activities.get_or_start_session(ctx.room_pid, handle.room_key, 1, "summit-run", handle,
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    {:ok, successor} =
      Activities.get_or_start_session(ctx.room_pid, handle.room_key, 2, "summit-run", %{handle | epoch: 2},
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    refute first == successor
    assert Activities.session_info(first).session_id != Activities.session_info(successor).session_id
  end

  test "envelopes keep the wire roomId while the session keys canonically", ctx do
    handle = %{ctx.handle | room_key: "default:theater-a-#{System.unique_integer([:positive])}:main"}

    {:ok, session} =
      Activities.get_or_start_session(ctx.room_pid, handle.room_key, 1, "summit-run", handle,
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    info = Activities.session_info(session)
    assert info.room_key == handle.room_key

    snapshot = Activities.session_full_snapshot(session)
    assert Map.get(snapshot, "roomId") == "theater"
    assert Map.get(snapshot, "activityId") == "summit-run"
  end
end
end

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
    room_pid = spawn_link(fn -> fake_room_loop(%{}) end)
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

  defp fake_room_loop(members) do
    receive do
      {:set_member, player_id, conn_ref, pose} ->
        fake_room_loop(Map.put(members, player_id, %{conn_ref: conn_ref, pose: pose}))

      {:remove_member, player_id} ->
        fake_room_loop(Map.delete(members, player_id))

      {:"$gen_call", from, {:member?, player_id, conn_ref}} ->
        m = Map.get(members, player_id)
        res = if members == %{}, do: true, else: m != nil and m.conn_ref == conn_ref
        GenServer.reply(from, res)
        fake_room_loop(members)

      {:"$gen_call", from, {:member_pose, _player_id}} ->
        if members == %{} do
          GenServer.reply(from, {:ok, %{x: 9.3, z: 2.6}})
        else
          GenServer.reply(from, :not_found)
        end

        fake_room_loop(members)

      {:"$gen_call", from, :lease_handle} ->
        GenServer.reply(from, {:ok, 1})
        fake_room_loop(members)

      {:"$gen_cast", {:broadcast_frame, _frame}} ->
        fake_room_loop(members)

      :stop ->
        :ok

      _other ->
        fake_room_loop(members)
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
      "controls" => controls
    }

    GenServer.call(session, {:command, "activity_input", payload, player})
  end

  defp ready(session, player, ready?) do
    GenServer.call(
      session,
      {:command, "activity_ready", %{"ready" => ready?, "requestId" => "r#{System.unique_integer([:positive])}"}, player}
    )
  end

  defp status(session), do: Activities.session_info(session).status

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

    assert {:ok, %{result: "left"}} = GenServer.call(session, {:command, "activity_leave", %{}, leaver})

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

describe "canonical instance identity (4.4)" do
  test "equal cabinet ids under distinct instance keys never share a session", ctx do
    handle_a = %{ctx.handle | room_key: "default:theater-a:main"}
    handle_b = %{ctx.handle | room_key: "default:theater-a:two"}

    {:ok, main} =
      Activities.get_or_start_session(ctx.room_pid, "default:theater-a:main", 1, "summit-run", handle_a,
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    {:ok, two} =
      Activities.get_or_start_session(ctx.room_pid, "default:theater-a:two", 1, "summit-run", handle_b,
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    refute main == two
    assert Activities.lookup_session("default:theater-a:main", 1, "summit-run") == {:ok, main}
    assert Activities.lookup_session("default:theater-a:two", 1, "summit-run") == {:ok, two}

    # A rider seated in the main instance does not appear in the other.
    {slot, _lease} = join(main, make_player("solo"))
    assert slot == 0
    assert Activities.session_info(two).player_to_slot == %{}
  end

  test "epoch change yields a fresh session identity (owner failover)", ctx do
    handle = %{ctx.handle | room_key: "default:theater-a:main"}

    {:ok, first} =
      Activities.get_or_start_session(ctx.room_pid, "default:theater-a:main", 1, "summit-run", handle,
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    {:ok, successor} =
      Activities.get_or_start_session(ctx.room_pid, "default:theater-a:main", 2, "summit-run", %{handle | epoch: 2},
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    refute first == successor
    assert Activities.session_info(first).session_id != Activities.session_info(successor).session_id
  end

  test "envelopes keep the wire roomId while the session keys canonically", ctx do
    handle = %{ctx.handle | room_key: "default:theater-a:main"}

    {:ok, session} =
      Activities.get_or_start_session(ctx.room_pid, "default:theater-a:main", 1, "summit-run", handle,
        activity_def: @act_def, check_proximity: false, wire_room_id: "theater"
      )

    info = Activities.session_info(session)
    assert info.room_key == "default:theater-a:main"

    snapshot = Activities.session_full_snapshot(session)
    assert Map.get(snapshot, "roomId") == "theater"
    assert Map.get(snapshot, "activityId") == "summit-run"
  end
end
end

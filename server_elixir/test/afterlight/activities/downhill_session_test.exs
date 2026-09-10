defmodule Afterlight.Activities.DownhillSessionTest do
  @moduledoc """
  Downhill Mayhem lifecycle tests against a real SessionServer process
  (integrate-multiplayer-downhill-mayhem-arcade 8.6/8.8, design D12–D15):
  one human plus five AI, two humans plus four AI, six humans, captain
  settings and the `not_captain` rejection, readiness + the 3 s countdown
  lock, late join/queue during a race, rematch across a fresh match identity,
  disconnect grace into DNF, stale-match fencing and the disabled flag.
  """

  use ExUnit.Case, async: false

  alias Afterlight.Activities
  alias Afterlight.Activities.DownhillMayhem
  alias Afterlight.Activities.DownhillMayhem.SessionPolicy
  alias Afterlight.World.Lease

  @course DownhillMayhem.Course.load_crafted("classic")

  @act_def %{
    "id" => "orpheum-downhill-mayhem",
    "type" => "downhill-mayhem",
    "rulesVersion" => 1,
    "minPlayers" => 1,
    "readyPolicy" => "explicit",
    "course" => %{"id" => "classic", "version" => 1},
    "capacities" => %{"players" => 6, "spectators" => 32, "queue" => 16},
    "interactionRadius" => 3.0,
    "transform" => %{"position" => [10.42, 0.0, -3.85]}
  }

  setup do
    # The downhill admission flag is disabled by default; lifecycle tests run
    # with it enabled, and a dedicated test proves the closed door.
    Application.put_env(:afterlight, :downhill_mayhem_enabled, true)
    on_exit(fn -> Application.put_env(:afterlight, :downhill_mayhem_enabled, false) end)

    room_pid = spawn_link(fn -> fake_room_loop(%{}, self(), []) end)
    room_key = "theater-test-#{System.unique_integer([:positive])}"
    room_epoch = 1

    handle = %Lease.Handle{
      room_key: room_key,
      owner_node: "test_node",
      epoch: room_epoch,
      fenced: false
    }

    %{room_pid: room_pid, room_key: room_key, room_epoch: room_epoch, handle: handle}
  end

  defp fake_room_loop(members, test_pid, broadcasts) do
    receive do
      {:set_member, player_id, conn_ref, pose} ->
        fake_room_loop(
          Map.put(members, player_id, %{conn_ref: conn_ref, pose: pose}),
          test_pid,
          broadcasts
        )

      {:remove_member, player_id} ->
        fake_room_loop(Map.delete(members, player_id), test_pid, broadcasts)

      {:"$gen_call", from, {:member?, player_id, conn_ref}} ->
        m = Map.get(members, player_id)
        res = if members == %{}, do: true, else: m != nil and m.conn_ref == conn_ref
        GenServer.reply(from, res)
        fake_room_loop(members, test_pid, broadcasts)

      {:"$gen_call", from, {:member_pose, _player_id}} ->
        if members == %{} do
          GenServer.reply(from, {:ok, %{x: 9.3, z: -3.85}})
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
        "orpheum-downhill-mayhem",
        ctx.handle,
        [activity_def: @act_def, check_proximity: false] ++ extra_opts
      )

    session_pid
  end

  defp make_player(prefix) do
    uid = System.unique_integer([:positive])
    %{player_id: "#{prefix}_#{uid}", conn_ref: 1, channel_pid: self(), nickname: prefix}
  end

  defp join(session, player) do
    assert {:ok, %{result: "seated", slot: slot, lease: lease}} =
             GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, player})

    {slot, lease}
  end

  defp join_queue(session, player) do
    GenServer.call(session, {:command, "activity_join", %{"role" => "queue"}, player})
  end

  defp load(session, player, slot_lease, opts \\ %{}) do
    controls =
      Map.merge(
        %{
          "kind" => "loaded",
          "courseId" => @course.id,
          "courseVersion" => @course.version,
          "courseHash" => DownhillMayhem.Course.hash(@course)
        },
        opts
      )

    payload = %{
      "sessionId" => Activities.session_id(session),
      "lease" => elem(slot_lease, 1),
      "seq" => System.unique_integer([:monotonic, :positive]),
      "matchId" => Activities.session_info(session).match_id,
      "controls" => controls
    }

    GenServer.call(session, {:command, "activity_input", payload, player})
  end

  defp ride(session, player, slot_lease, controls) do
    payload = %{
      "sessionId" => Activities.session_id(session),
      "lease" => elem(slot_lease, 1),
      "seq" => System.unique_integer([:monotonic, :positive]),
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

  defp config(session, player, payload) do
    GenServer.call(
      session,
      {:command, "activity_config",
       Map.put(payload, "matchId", Activities.session_info(session).match_id), player}
    )
  end

  defp status(session), do: Activities.session_info(session).status

  defp rider_count(info, pred) do
    info.sim_state["riders"] |> Map.values() |> Enum.count(pred)
  end

  test "disabled flag fails admission closed with race_unavailable", ctx do
    Application.put_env(:afterlight, :downhill_mayhem_enabled, false)

    assert {:error, :race_unavailable} =
             Activities.get_or_start_session(
               ctx.room_pid,
               ctx.room_key,
               ctx.room_epoch,
               "orpheum-downhill-mayhem",
               ctx.handle,
               activity_def: @act_def,
               check_proximity: false
             )

    assert {:error, :not_found} =
             Activities.lookup_session(ctx.room_key, ctx.room_epoch, "orpheum-downhill-mayhem")
  end

  test "solo racer locks a six-rider field of one human plus five AI", ctx do
    session = start_session(ctx, countdown_ms: 120, race_deadline_ms: 5_000)

    player = make_player("solo")
    {slot, lease} = join(session, player)
    assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
    assert {:ok, _} = ready(session, player, true)

    assert status(session) == :countdown
    match_before = Activities.session_info(session).match_id

    wait_until(2_000, fn -> status(session) == :in_progress end)

    info = Activities.session_info(session)
    assert map_size(info.sim_state["riders"]) == 6
    assert rider_count(info, &(not &1.is_ai)) == 1
    assert rider_count(info, & &1.is_ai) == 5
    assert info.match_id != match_before

    # Every AI identity is deterministic and published.
    ai_names =
      info.sim_state["riders"]
      |> Map.values()
      |> Enum.filter(& &1.is_ai)
      |> Enum.map(& &1.nickname)

    assert Enum.all?(ai_names, &is_binary/1)
  end

  test "two humans plus four AI fill the field deterministically", ctx do
    session = start_session(ctx, countdown_ms: 120, race_deadline_ms: 5_000)

    players =
      for prefix <- ["a", "b"] do
        player = make_player(prefix)
        {slot, lease} = join(session, player)
        {player, slot, lease}
      end

    for {player, slot, lease} <- players do
      assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
    end

    for {player, _slot, _lease} <- players do
      assert {:ok, _} = ready(session, player, true)
    end

    wait_until(2_000, fn -> status(session) == :in_progress end)
    info = Activities.session_info(session)

    assert map_size(info.sim_state["riders"]) == 6
    assert rider_count(info, &(not &1.is_ai)) == 2
    assert rider_count(info, & &1.is_ai) == 4

    human_slots =
      info.sim_state["riders"]
      |> Map.values()
      |> Enum.filter(&(not &1.is_ai))
      |> Enum.map(& &1.slot)

    assert human_slots == [0, 1]
  end

  test "six humans fill the field with no AI", ctx do
    session = start_session(ctx, countdown_ms: 120, race_deadline_ms: 5_000)

    players =
      for i <- 1..6 do
        player = make_player("h#{i}")
        {slot, lease} = join(session, player)
        {player, slot, lease}
      end

    for {player, slot, lease} <- players do
      assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
    end

    for {player, _slot, _lease} <- players do
      assert {:ok, _} = ready(session, player, true)
    end

    wait_until(2_000, fn -> status(session) == :in_progress end)
    info = Activities.session_info(session)

    assert map_size(info.sim_state["riders"]) == 6
    assert rider_count(info, &(not &1.is_ai)) == 6
    assert rider_count(info, & &1.is_ai) == 0
  end

  test "captain alone may change mountain and difficulty; non-captains are rejected", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    captain = make_player("captain")
    other = make_player("other")
    {_s1, _l1} = join(session, captain)
    {_s2, _l2} = join(session, other)

    assert {:ok, %{result: "config", mountain: "timber", difficulty: "brutal"}} =
             config(session, captain, %{"mountain" => "timber", "difficulty" => "brutal"})

    assert Activities.session_info(session).lobby_config["mountain"] == "timber"

    assert {:error, :not_captain} =
             config(session, other, %{"mountain" => "rock"})

    assert {:error, :invalid_setting} =
             config(session, captain, %{"mountain" => "olympus"})

    assert {:error, :invalid_setting} =
             config(session, captain, %{"difficulty" => "nightmare"})
  end

  test "readiness requires the course handshake and locks a frozen countdown", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    player = make_player("p")
    {slot, lease} = join(session, player)

    assert {:error, :not_loaded} = ready(session, player, true)

    assert {:error, :course_mismatch} =
             load(session, player, {slot, lease}, %{"courseHash" => String.duplicate("0", 64)})

    assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
    assert {:ok, _} = ready(session, player, true)
    assert status(session) == :countdown

    # During the locked countdown a new human is refused a racing slot.
    late = make_player("late")

    assert {:error, :race_in_progress} =
             GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, late})

    # Unreadying a locked rider cancels the countdown and clears readiness.
    assert {:ok, _} = ready(session, player, false)
    assert status(session) == :lobby
    assert Enum.all?(Map.values(Activities.session_info(session).players), &(&1.ready == false))
  end

  test "a wrong course identity (id, version or hash) is rejected before readiness", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    player = make_player("stale")
    {slot, lease} = join(session, player)
    assert {:error, :not_loaded} = ready(session, player, true)

    for bad <- [
          %{"courseId" => "timber"},
          %{"courseVersion" => 2},
          %{"courseHash" => String.duplicate("f", 64)}
        ] do
      assert {:error, :course_mismatch} = load(session, player, {slot, lease}, bad)
      assert {:error, :not_loaded} = ready(session, player, true)
    end

    assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
    assert {:ok, _} = ready(session, player, true)
    assert status(session) == :countdown
  end

  test "a captain mountain change invalidates loads and readiness", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    captain = make_player("captain")
    {slot, lease} = join(session, captain)
    assert {:ok, %{result: "loaded"}} = load(session, captain, {slot, lease})

    assert {:ok, %{result: "config", mountain: "timber"}} =
             config(session, captain, %{"mountain" => "timber"})

    info = Activities.session_info(session)
    assert status(session) == :lobby
    assert info.players[slot].ready == false
    assert info.players[slot].loaded == false

    # The old mountain's hash is now refused; the new one loads and relocks.
    assert {:error, :course_mismatch} = load(session, captain, {slot, lease})

    timber = DownhillMayhem.Course.load_crafted("timber")

    assert {:ok, %{result: "loaded"}} =
             load(session, captain, {slot, lease}, %{
               "courseId" => "timber",
               "courseVersion" => timber.version,
               "courseHash" => DownhillMayhem.Course.hash(timber)
             })

    assert {:ok, _} = ready(session, captain, true)
    assert status(session) == :countdown
  end

  test "the Daily is server-generated and the load gate matches its published hash", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    captain = make_player("dailycap")
    {slot, lease} = join(session, captain)

    assert {:ok, %{result: "config", mountain: "daily"}} =
             config(session, captain, %{"mountain" => "daily"})

    # The committed classic identity is now stale.
    assert {:error, :course_mismatch} = load(session, captain, {slot, lease})

    daily = Afterlight.Activities.DownhillMayhem.Daily.daily()
    assert daily.id == "daily"

    assert {:ok, %{result: "loaded"}} =
             load(session, captain, {slot, lease}, %{
               "courseId" => "daily",
               "courseVersion" => daily.version,
               "courseHash" => DownhillMayhem.Course.hash(daily)
             })

    assert {:ok, _} = ready(session, captain, true)
    assert status(session) == :countdown
  end

  test "late joiners queue during a race instead of taking a slot", ctx do
    session = start_session(ctx, countdown_ms: 80, race_deadline_ms: 5_000)

    player = make_player("racer")
    {slot, lease} = join(session, player)
    assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
    assert {:ok, _} = ready(session, player, true)
    wait_until(2_000, fn -> status(session) == :in_progress end)

    late = make_player("late")

    assert {:error, :race_in_progress} =
             GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, late})

    assert {:ok, %{result: "queued", position: 1}} = join_queue(session, late)
    assert length(Activities.session_info(session).queue) == 1
  end

  test "a finished race rematches with a fresh identity and reset riders", ctx do
    session =
      start_session(ctx, countdown_ms: 80, race_deadline_ms: 250, results_retention_ms: 60_000)

    player = make_player("rematch")
    {slot, lease} = join(session, player)
    assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
    assert {:ok, _} = ready(session, player, true)

    wait_until(2_000, fn -> status(session) == :in_progress end)
    match1 = Activities.session_info(session).match_id

    wait_until(2_000, fn -> status(session) == :ended end)
    assert Activities.session_info(session).match_outcome["kind"] == "downhill_race"

    # Rematch: ready again while the loaded course is still valid.
    assert {:ok, _} = ready(session, player, true)
    assert status(session) == :countdown

    wait_until(2_000, fn -> status(session) == :in_progress end)
    info = Activities.session_info(session)
    match2 = info.match_id

    assert match1 != match2, "every locked countdown rotates the match identity"
    assert map_size(info.sim_state["riders"]) == 6
    assert Enum.all?(Map.values(info.sim_state["riders"]), &(&1.s == 0 and &1.finished == false))
  end

  test "disconnect never pauses the race; grace expiry marks DNF(disconnect)", ctx do
    test_pid = self()

    session =
      start_session(ctx, countdown_ms: 120, race_deadline_ms: 10_000, reconnect_grace_ms: 200)

    leaver = make_player("gone")
    leaver_chan = spawn(fn -> fake_channel_loop(test_pid) end)
    leaver = %{leaver | channel_pid: leaver_chan}
    keeper = make_player("keep")

    {slot1, lease1} = join(session, leaver)
    {slot2, lease2} = join(session, keeper)
    assert {:ok, %{result: "loaded"}} = load(session, leaver, {slot1, lease1})
    assert {:ok, %{result: "loaded"}} = load(session, keeper, {slot2, lease2})
    assert {:ok, _} = ready(session, leaver, true)
    assert {:ok, _} = ready(session, keeper, true)

    wait_until(2_000, fn -> status(session) == :in_progress end)

    Process.exit(leaver_chan, :kill)
    Process.sleep(50)
    assert status(session) == :in_progress, "race continues through a disconnect"

    wait_until(2_000, fn ->
      info = Activities.session_info(session)
      rider = info.sim_state["riders"][slot1]
      rider && rider[:dnf_reason] == "disconnect"
    end)

    info = Activities.session_info(session)
    assert info.sim_state["riders"][slot1][:dnf_reason] == "disconnect"
    assert info.status == :in_progress, "the remaining field keeps racing"
  end

  describe "stale match fence (D7)" do
    test "a leave signed for an old match never DNFs the new race", ctx do
      session =
        start_session(ctx,
          countdown_ms: 80,
          race_deadline_ms: 5_000,
          results_retention_ms: 60_000
        )

      player = make_player("s1")
      {slot, lease} = join(session, player)
      assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
      assert {:ok, _} = ready(session, player, true)
      wait_until(2_000, fn -> status(session) == :in_progress end)

      assert {:error, :stale_match} =
               GenServer.call(
                 session,
                 {:command, "activity_leave", %{"matchId" => "match_stale"}, player}
               )

      info = Activities.session_info(session)
      assert map_size(info.players) == 1
      assert Enum.all?(Map.values(info.sim_state["riders"]), &is_nil(&1[:dnf_reason]))
    end

    test "input signed for an old match is rejected and the race continues", ctx do
      session = start_session(ctx, countdown_ms: 80, race_deadline_ms: 5_000)

      player = make_player("i1")
      {slot, lease} = join(session, player)
      assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
      assert {:ok, _} = ready(session, player, true)
      wait_until(2_000, fn -> status(session) == :in_progress end)

      info = Activities.session_info(session)

      assert {:error, :stale_match} =
               GenServer.call(
                 session,
                 {:command, "activity_input",
                  %{
                    "sessionId" => info.session_id,
                    "lease" => info.players[slot].lease_id,
                    "seq" => info.players[slot].last_seq + 1,
                    "matchId" => "match_stale",
                    "controls" => %{
                      "kind" => "ride",
                      "steer" => 0.0,
                      "pedal" => true,
                      "brake" => false
                    }
                  }, player}
               )

      assert Activities.session_info(session).status == :in_progress
    end

    test "invalid non-finite controls are rejected", ctx do
      session = start_session(ctx, countdown_ms: 80, race_deadline_ms: 5_000)

      player = make_player("bad")
      {slot, lease} = join(session, player)
      assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})
      assert {:ok, _} = ready(session, player, true)
      wait_until(2_000, fn -> status(session) == :in_progress end)

      info = Activities.session_info(session)

      assert {:error, :invalid_input} =
               GenServer.call(
                 session,
                 {:command, "activity_input",
                  %{
                    "sessionId" => info.session_id,
                    "lease" => info.players[slot].lease_id,
                    "seq" => info.players[slot].last_seq + 1,
                    "matchId" => info.match_id,
                    "controls" => %{"kind" => "ride", "steer" => "NaN"}
                  }, player}
               )
    end
  end

  test "a queued rider is offered a vacated seat and can accept it", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    seated = make_player("seated")
    queued = make_player("queued")
    {_slot, _lease} = join(session, seated)
    assert {:ok, %{result: "queued", position: 1}} = join_queue(session, queued)

    # The seated rider leaves: the vacated slot is offered to the queue head.
    assert {:ok, _} = GenServer.call(session, {:command, "activity_leave", %{}, seated})

    assert_receive {:activity_event, %{"eventType" => "slot_offered"} = offer}, 1_000
    assert offer["slot"] == 0
    assert offer["timeoutMs"] == 30_000

    # Acceptance seats the promoted rider with the current session identity.
    assert {:ok, %{result: "accepted_offer", slot: 0, sessionId: session_id}} =
             ready(session, queued, true)

    assert session_id == Activities.session_id(session)
    info = Activities.session_info(session)
    assert info.players[0].player_id == queued.player_id
    assert info.players[0].ready == false, "a promoted downhill rider begins unready"
    assert info.queue == []
  end

  test "declining an offer advances the FIFO queue", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    seated = make_player("seated")
    first = make_player("first")
    second = make_player("second")
    {_slot, _lease} = join(session, seated)
    assert {:ok, %{result: "queued", position: 1}} = join_queue(session, first)
    assert {:ok, %{result: "queued", position: 2}} = join_queue(session, second)

    assert {:ok, _} = GenServer.call(session, {:command, "activity_leave", %{}, seated})
    assert_receive {:activity_event, %{"eventType" => "slot_offered", "slot" => 0}}, 1_000

    # The head declines; the offer advances to the next queued rider.
    assert {:ok, %{result: "declined_offer", slot: 0}} = ready(session, first, false)

    assert_receive {:activity_event, %{"eventType" => "slot_offered", "slot" => 0}}, 1_000
    assert length(Activities.session_info(session).queue) == 1
    assert Enum.at(Activities.session_info(session).queue, 0).player_id == second.player_id
  end

  test "a downhill resnapshot carries the projected six-rider field and self", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    player = make_player("snap")
    {slot, lease} = join(session, player)
    assert {:ok, %{result: "loaded"}} = load(session, player, {slot, lease})

    assert {:ok, snapshot} =
             GenServer.call(
               session,
               {:command, "activity_resnapshot", %{"sessionId" => Activities.session_id(session)},
                player}
             )

    assert snapshot["type"] == "activity_state"
    assert snapshot["audience"] == "participants"
    assert length(snapshot["riders"]) == 6
    assert Enum.count(snapshot["riders"], & &1["isAI"]) == 5
    assert snapshot["self"]["slot"] == slot
  end

  test "captain departure transfers to the longest-seated remaining human", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    first = make_player("capfirst")
    second = make_player("capsecond")
    {_s1, _l1} = join(session, first)
    Process.sleep(5)
    {_s2, _l2} = join(session, second)

    assert SessionPolicy.captain(Activities.session_info(session).players) == first.player_id

    assert {:ok, _} = GenServer.call(session, {:command, "activity_leave", %{}, first})

    info = Activities.session_info(session)
    assert SessionPolicy.captain(info.players) == second.player_id
    assert map_size(info.players) == 1
  end

  test "a ride input carrying the canonical null trick is accepted", ctx do
    session = start_session(ctx, countdown_ms: 5_000)

    player = make_player("ride")
    {slot, lease} = join(session, player)

    # The client always serializes the optional trick, so `null` must pass the
    # generic control validation (regression: null was rejected as
    # invalid_input, which ejected every racing human).
    assert {:ok, %{result: "input_accepted"}} =
             ride(session, player, {slot, lease}, %{
               "kind" => "ride",
               "steer" => 0,
               "pedal" => true,
               "brake" => false,
               "boost" => false,
               "hopPressed" => false,
               "punchPressed" => false,
               "kickPressed" => false,
               "trick" => nil
             })

    assert {:ok, %{result: "input_accepted"}} =
             ride(session, player, {slot, lease}, %{
               "kind" => "ride",
               "steer" => 0.5,
               "trick" => "heel"
             })

    assert {:error, :invalid_input} =
             ride(session, player, {slot, lease}, %{"kind" => "ride", "steer" => 0, "trick" => "warp"})

    assert {:error, :invalid_input} =
             ride(session, player, {slot, lease}, %{"kind" => "ride", "steer" => 0, "score" => 10})
  end

  # --- helpers ---------------------------------------------------------------

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
end

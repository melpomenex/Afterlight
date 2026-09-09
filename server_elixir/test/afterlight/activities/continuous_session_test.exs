defmodule Afterlight.Activities.ContinuousSessionTest do
  @moduledoc """
  Authoritative session lifecycle, prediction reconciliation, watchdog,
  and recovery tests for continuous games (Air Hockey and Foosball)
  (Phase 4, Tasks 6.5, 6.6).
  """

  use ExUnit.Case, async: false

  alias Afterlight.Activities
  alias Afterlight.World.Lease

  @air_hockey_def %{
    "id" => "orpheum-air-hockey",
    "type" => "air-hockey",
    "rulesVersion" => 1,
    "minPlayers" => 2,
    "maxPlayers" => 2,
    "capacities" => %{"players" => 2, "spectators" => 16, "queue" => 8},
    "interactionRadius" => 3.0,
    "transform" => %{"position" => [5.8, 0.0, 7.0]}
  }

  @foosball_def %{
    "id" => "orpheum-foosball",
    "type" => "foosball",
    "rulesVersion" => 1,
    "minPlayers" => 2,
    "maxPlayers" => 2,
    "capacities" => %{"players" => 2, "spectators" => 16, "queue" => 8},
    "interactionRadius" => 3.0,
    "transform" => %{"position" => [-5.8, 0.0, 7.0]}
  }

  setup do
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
        GenServer.reply(from, {:ok, %{x: 0.0, z: 0.0}})
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

  defp make_player(prefix) do
    uid = System.unique_integer([:positive])
    %{player_id: "#{prefix}_#{uid}", conn_ref: 1, channel_pid: self()}
  end

  defp start_continuous_session(ctx, act_def, extra_opts \\ []) do
    {:ok, session_pid} =
      Activities.get_or_start_session(
        ctx.room_pid,
        ctx.room_key,
        ctx.room_epoch,
        act_def["id"],
        ctx.handle,
        [activity_def: act_def, check_proximity: false, countdown_ms: 10, input_watchdog_ms: 50] ++ extra_opts
      )

    session_pid
  end

  defp join_and_ready(session, p0, p1) do
    assert {:ok, %{result: "seated", slot: 0, lease: lease0}} =
             GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, p0})

    assert {:ok, %{result: "seated", slot: 1, lease: lease1}} =
             GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, p1})

    assert {:ok, %{result: "ready"}} =
             GenServer.call(session, {:command, "activity_ready", %{"ready" => true}, p0})

    assert {:ok, %{result: "ready"}} =
             GenServer.call(session, {:command, "activity_ready", %{"ready" => true}, p1})

    Process.sleep(50)
    info = Activities.session_info(session)
    assert info.status == :in_progress

    {{0, lease0}, {1, lease1}}
  end

  describe "Task 6.5: Input sequence validation, neutral watchdog, and replay rejection" do
    test "Air Hockey accepts valid monotonic inputs and rejects stale sequences", ctx do
      session = start_continuous_session(ctx, @air_hockey_def)
      p0 = make_player("p0")
      p1 = make_player("p1")

      {{0, lease0}, _} = join_and_ready(session, p0, p1)

      payload1 = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease0,
        "seq" => 1,
        "controls" => %{"targetX" => 40.0, "targetY" => 50.0}
      }

      assert {:ok, %{result: "input_accepted", seq: 1}} =
               GenServer.call(session, {:command, "activity_input", payload1, p0})

      # Replaying seq 1 should be rejected as stale sequence
      assert {:error, :stale_sequence} =
               GenServer.call(session, {:command, "activity_input", payload1, p0})

      # Out-of-order lower sequence should be rejected
      payload0 = %{payload1 | "seq" => 0}
      assert {:error, :stale_sequence} =
               GenServer.call(session, {:command, "activity_input", payload0, p0})

      # Monotonic seq 2 should succeed
      payload2 = %{payload1 | "seq" => 2, "controls" => %{"targetX" => 45.0, "targetY" => 55.0}}
      assert {:ok, %{result: "input_accepted", seq: 2}} =
               GenServer.call(session, {:command, "activity_input", payload2, p0})
    end

    test "Foosball rejects inputs targeting a mismatched session ID", ctx do
      session = start_continuous_session(ctx, @foosball_def)
      p0 = make_player("p0")
      p1 = make_player("p1")

      {{0, lease0}, _} = join_and_ready(session, p0, p1)

      fake_payload = %{
        "sessionId" => "old-session-9999",
        "lease" => lease0,
        "seq" => 1,
        "controls" => %{"dy" => 1.0, "kick" => true}
      }

      assert {:error, :stale_session} =
               GenServer.call(session, {:command, "activity_input", fake_payload, p0})
    end

    test "Neutral input watchdog resets idle player input state after timeout", ctx do
      session = start_continuous_session(ctx, @air_hockey_def, input_watchdog_ms: 30)
      p0 = make_player("p0")
      p1 = make_player("p1")

      {{0, lease0}, _} = join_and_ready(session, p0, p1)

      # Send active motion
      payload = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease0,
        "seq" => 1,
        "controls" => %{"targetX" => 42.0, "targetY" => 52.0}
      }

      assert {:ok, %{result: "input_accepted"}} =
               GenServer.call(session, {:command, "activity_input", payload, p0})

      # Wait for watchdog timeout (> 30ms)
      Process.sleep(80)

      # Inspect session state: player input_state should be reset to empty / neutral
      state = :sys.get_state(session)
      assert state.players[0].input_state == %{}
    end
  end

  describe "Task 6.6: Disconnect recovery, match completion, and verified results" do
    test "Air Hockey match ends at target score and declares winner", ctx do
      session = start_continuous_session(ctx, @air_hockey_def)
      p0 = make_player("p0")
      p1 = make_player("p1")

      join_and_ready(session, p0, p1)

      # Inject game-winning state: score 7-4 in single game series
      state = :sys.get_state(session)
      sim = state.sim_state
      winning_sim =
        sim
        |> Map.put("state", "goal")
        |> Map.put("goalDelay", 1)
        |> Map.put("score", %{"0" => 7, "1" => 4})

      :sys.replace_state(session, fn s -> %{s | sim_state: winning_sim} end)

      # Step simulation
      Enum.each(1..4, fn _ ->
        send(session, :tick)
        Process.sleep(10)
      end)

      info = Activities.session_info(session)
      assert info.status == :ended
      assert info.match_outcome["winner"] == p0.player_id
      assert info.match_outcome["winnerSlot"] == 0
    end

    test "Foosball match ends at target score 5 and declares winner", ctx do
      session = start_continuous_session(ctx, @foosball_def)
      p0 = make_player("p0")
      p1 = make_player("p1")

      join_and_ready(session, p0, p1)

      # Inject game-winning state: score 5-2
      state = :sys.get_state(session)
      sim = state.sim_state
      winning_sim =
        sim
        |> Map.put("state", "goal")
        |> Map.put("goalDelay", 1)
        |> Map.put("score", %{"0" => 5, "1" => 2})

      :sys.replace_state(session, fn s -> %{s | sim_state: winning_sim} end)

      Enum.each(1..4, fn _ ->
        send(session, :tick)
        Process.sleep(10)
      end)

      info = Activities.session_info(session)
      assert info.status == :ended
      assert info.match_outcome["winner"] == p0.player_id
      assert info.match_outcome["winnerSlot"] == 0
    end
  end
end

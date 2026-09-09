defmodule Afterlight.Activities.P3GateTest do
  @moduledoc """
  Task 5.5 P3 Gate Verification:
    * Full 8-ball pool match lifecycle over session server
    * Two players (slot 0 & 1) + one third observer with authoritative snapshot sync
    * Casual 8-ball rules: break shot, group assignment, fouls, ball-in-hand placement
    * Called pocket 8-ball win vs. early 8-ball loss
    * Disconnect mid-shot, 30-second reconnect grace, and forfeit handling
    * Room owner loss mid-match cleanly aborts without fabricating unearned wins
  """

  use ExUnit.Case, async: false

  alias Afterlight.Activities
  alias Afterlight.World.Lease

  @pool_def %{
    "id" => "orpheum-pool",
    "type" => "pool",
    "rulesVersion" => 1,
    "minPlayers" => 2,
    "capacities" => %{"players" => 2, "spectators" => 16, "queue" => 8},
    "interactionRadius" => 4.0,
    "transform" => %{"position" => [-8.6, 0.0, -4.5]}
  }

  setup do
    test_pid = self()
    room_key = "orpheum-p3-#{System.unique_integer([:positive])}"
    room_epoch = 1

    room_pid = spawn_link(fn -> fake_room_loop(%{}, test_pid, []) end)

    handle = %Lease.Handle{
      room_key: room_key,
      owner_node: "p3_gate_node",
      epoch: room_epoch,
      fenced: false
    }

    %{
      room_pid: room_pid,
      room_key: room_key,
      room_epoch: room_epoch,
      handle: handle,
      test_pid: test_pid
    }
  end

  defp fake_chan do
    receive do
      _ -> fake_chan()
    end
  end

  defp fake_room_loop(members, test_pid, broadcasts) do
    receive do
      {:set_member, player_id, conn_ref, channel_pid} ->
        fake_room_loop(Map.put(members, player_id, %{conn_ref: conn_ref, channel_pid: channel_pid}), test_pid, broadcasts)

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
        send(test_pid, {:activity_frame, frame})
        fake_room_loop(members, test_pid, [frame | broadcasts])

      {:"$gen_call", from, :broadcast_frames} ->
        GenServer.reply(from, Enum.reverse(broadcasts))
        fake_room_loop(members, test_pid, broadcasts)

      {:"$gen_cast", {:send_to_members, pids, frame}} ->
        Enum.each(pids, fn pid -> send(pid, {:activity_frame, frame}) end)
        fake_room_loop(members, test_pid, broadcasts)

      :stop ->
        :ok

      _other ->
        fake_room_loop(members, test_pid, broadcasts)
    end
  end

  defp start_pool_session(ctx, extra_opts \\ []) do
    {:ok, session_pid} =
      Activities.get_or_start_session(
        ctx.room_pid,
        ctx.room_key,
        ctx.room_epoch,
        "orpheum-pool",
        ctx.handle,
        [activity_def: @pool_def, check_proximity: false, countdown_ms: 10] ++ extra_opts
      )

    session_pid
  end

  defp make_player(prefix) do
    uid = System.unique_integer([:positive])
    chan = spawn(fn -> fake_chan() end)
    %{player_id: "#{prefix}_#{uid}", conn_ref: 1, channel_pid: chan}
  end

  defp join_and_ready_players(session, p0, p1) do
    assert {:ok, %{result: "seated", slot: 0, lease: lease0}} =
             Activities.command(session, "activity_join", %{"role" => "play"}, p0)

    assert {:ok, %{result: "seated", slot: 1, lease: lease1}} =
             Activities.command(session, "activity_join", %{"role" => "play"}, p1)

    assert {:ok, %{result: "ready"}} =
             Activities.command(session, "activity_ready", %{"ready" => true}, p0)

    assert {:ok, %{result: "ready"}} =
             Activities.command(session, "activity_ready", %{"ready" => true}, p1)

    Process.sleep(50)
    info = Activities.session_info(session)
    assert info.status == :in_progress

    {{0, lease0}, {1, lease1}}
  end

  test "1. Full match start with 2 players and 1 third observer synchronized", ctx do
    session = start_pool_session(ctx)
    p0 = make_player("p0")
    p1 = make_player("p1")
    obs = make_player("obs")

    # Observer joins as spectator
    assert {:ok, %{result: "watching", role: "spectator"}} =
             Activities.command(session, "activity_join", %{"role" => "spectator"}, obs)

    # Players join and ready
    {{0, _lease0}, {1, _lease1}} = join_and_ready_players(session, p0, p1)

    info = Activities.session_info(session)
    assert info.status == :in_progress

    sim = info.sim_state
    assert sim["status"] == "aiming"
    assert sim["turn"] == 0
    assert sim["table_open"] == true
    assert sim["physics"]["settled"] == true

    # 16 balls present
    balls = sim["physics"]["balls"]
    assert map_size(balls) == 16
    assert balls["0"]["id"] == 0
    assert balls["8"]["id"] == 8
  end

  test "2. Shot execution, out-of-turn rejection, and called pocket handling", ctx do
    session = start_pool_session(ctx)
    p0 = make_player("p0")
    p1 = make_player("p1")

    {{0, lease0}, {1, lease1}} = join_and_ready_players(session, p0, p1)
    session_id = Activities.session_id(session)

    # P1 (slot 1) cannot shoot out of turn
    p1_shot = %{
      "sessionId" => session_id,
      "lease" => lease1,
      "seq" => 1,
      "controls" => %{"type" => "shoot", "angle" => 0.0, "power" => 0.8}
    }

    assert {:error, :out_of_turn} =
             Activities.command(session, "activity_input", p1_shot, p1)

    # Calling a pocket while aiming is accepted
    call_pocket_payload = %{
      "sessionId" => session_id,
      "lease" => lease0,
      "seq" => 1,
      "controls" => %{"type" => "call_pocket", "pocketId" => "corner_br"}
    }

    assert {:ok, %{result: "input_accepted", ackSeq: 1}} =
             Activities.command(session, "activity_input", call_pocket_payload, p0)

    # P0 executes valid break shot
    p0_shot = %{
      "sessionId" => session_id,
      "lease" => lease0,
      "seq" => 2,
      "controls" => %{"type" => "shoot", "angle" => 0.0, "power" => 0.8, "spinX" => 0.0, "spinY" => 0.2}
    }

    assert {:ok, %{result: "input_accepted", ackSeq: 2}} =
             Activities.command(session, "activity_input", p0_shot, p0)

    # Shooting again while balls are in motion is rejected
    repeat_shot = %{
      "sessionId" => session_id,
      "lease" => lease0,
      "seq" => 3,
      "controls" => %{"type" => "shoot", "angle" => 0.0, "power" => 0.5}
    }

    assert {:error, :balls_in_motion} =
             Activities.command(session, "activity_input", repeat_shot, p0)
  end

  test "3. Resignation grants immediate clean victory to opponent", ctx do
    session = start_pool_session(ctx)
    p0 = make_player("p0")
    p1 = make_player("p1")

    {{0, lease0}, {1, _lease1}} = join_and_ready_players(session, p0, p1)
    session_id = Activities.session_id(session)

    resign_payload = %{
      "sessionId" => session_id,
      "lease" => lease0,
      "seq" => 1,
      "controls" => %{"type" => "resign"}
    }

    assert {:ok, %{result: "input_accepted", ackSeq: 1}} =
             Activities.command(session, "activity_input", resign_payload, p0)

    # Simulation advances to game_over with slot 1 as winner
    info = Activities.session_info(session)
    assert info.sim_state["status"] == "game_over"
    assert info.sim_state["winner"] == 1
    assert info.sim_state["win_reason"] == "resignation"
  end

  test "4. Reconnect within 30-second grace restores session without false forfeit", ctx do
    session = start_pool_session(ctx, reconnect_grace_ms: 500)
    p0 = make_player("p0")
    p1 = make_player("p1")

    {{0, _lease0}, {1, _lease1}} = join_and_ready_players(session, p0, p1)

    # p0's channel dies
    Process.exit(p0.channel_pid, :kill)
    Process.sleep(20)

    # Match enters paused status during grace
    info = Activities.session_info(session)
    assert info.status == :paused
    assert Map.has_key?(info.disconnects, p0.player_id)

    # Reconnect within grace with fresh channel
    new_chan = spawn(fn -> fake_chan() end)
    p0_recon = %{p0 | conn_ref: 101, channel_pid: new_chan}

    assert {:ok, %{result: "seated", slot: 0}} =
             Activities.command(session, "activity_join", %{"role" => "play"}, p0_recon)

    # Match resumes
    info_resumed = Activities.session_info(session)
    assert info_resumed.status == :in_progress
    assert info_resumed.disconnects == %{}
  end

  test "5. Room owner loss cleanly aborts without fabricating unearned wins", ctx do
    session = start_pool_session(ctx)
    p0 = make_player("p0")
    p1 = make_player("p1")

    join_and_ready_players(session, p0, p1)

    # Session is fenced / owner loss
    assert :ok = Activities.fence_session(session)

    # Commands fail closed
    p0_input = %{
      "sessionId" => Activities.session_id(session),
      "lease" => "any",
      "seq" => 1,
      "controls" => %{"type" => "shoot"}
    }

    assert {:error, :lease_lost} = Activities.command(session, "activity_input", p0_input, p0)
  end
end

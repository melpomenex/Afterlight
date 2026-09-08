defmodule Afterlight.Activities.PoolSessionTest do
  @moduledoc """
  Authoritative Pool session server validation and lifecycle tests (Tasks 4.4, 4.5).
  Covers:
  - Input acknowledgments for valid shots
  - Out-of-turn shot rejection
  - Moving-ball command rejection
  - Overlap placement rejection
  - Repeated-shot / stale-sequence rejection
  - Stale-session rejection
  - Match completion and durable stats recording distinguishing aborts, forfeits, and completed play
  """

  use ExUnit.Case, async: false

  alias Afterlight.Activities
  alias Afterlight.Activities.Results
  alias Afterlight.World.Lease

  @pool_def %{
    "id" => "orpheum-pool",
    "type" => "pool",
    "rulesVersion" => 1,
    "minPlayers" => 2,
    "capacities" => %{"players" => 2, "spectators" => 16, "queue" => 8},
    "interactionRadius" => 3.0,
    "transform" => %{"position" => [0.0, 0.0, 0.0]}
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
    %{player_id: "#{prefix}_#{uid}", conn_ref: 1, channel_pid: self()}
  end

  defp join_and_ready_players(session, p0, p1) do
    assert {:ok, %{result: "seated", slot: 0, lease: lease0}} =
             GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, p0})

    assert {:ok, %{result: "seated", slot: 1, lease: lease1}} =
             GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, p1})

    assert {:ok, %{result: "ready"}} =
             GenServer.call(session, {:command, "activity_ready", %{"ready" => true}, p0})

    assert {:ok, %{result: "ready"}} =
             GenServer.call(session, {:command, "activity_ready", %{"ready" => true}, p1})

    # Wait briefly for countdown (10ms) to complete and enter in_progress
    Process.sleep(50)
    info = Activities.session_info(session)
    assert info.status == :in_progress

    {{0, lease0}, {1, lease1}}
  end

  describe "Task 4.4: shot validation and input acknowledgments" do
    test "accepts and acknowledges a valid shot from current turn player", ctx do
      session = start_pool_session(ctx)
      p0 = make_player("p0")
      p1 = make_player("p1")

      {{0, lease0}, _} = join_and_ready_players(session, p0, p1)

      payload = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease0,
        "seq" => 1,
        "controls" => %{
          "type" => "shoot",
          "angle" => 0.0,
          "power" => 3.0,
          "spinX" => 0.0,
          "spinY" => 0.0
        }
      }

      assert {:ok, %{result: "input_accepted", ackSeq: 1, seq: 1}} =
               GenServer.call(session, {:command, "activity_input", payload, p0})
    end

    test "rejects out-of-turn shots", ctx do
      session = start_pool_session(ctx)
      p0 = make_player("p0")
      p1 = make_player("p1")

      {_, {1, lease1}} = join_and_ready_players(session, p0, p1)

      # Player 1 attempts to shoot when it's Player 0's break turn
      payload = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease1,
        "seq" => 1,
        "controls" => %{
          "type" => "shoot",
          "angle" => 0.0,
          "power" => 2.0
        }
      }

      assert {:error, :out_of_turn} =
               GenServer.call(session, {:command, "activity_input", payload, p1})
    end

    test "rejects moving-ball and repeated shot commands", ctx do
      session = start_pool_session(ctx)
      p0 = make_player("p0")
      p1 = make_player("p1")

      {{0, lease0}, _} = join_and_ready_players(session, p0, p1)

      # First shot starts motion
      shot1 = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease0,
        "seq" => 1,
        "controls" => %{"type" => "shoot", "angle" => 0.0, "power" => 10.0}
      }

      assert {:ok, %{result: "input_accepted"}} =
               GenServer.call(session, {:command, "activity_input", shot1, p0})

      # Immediate second shot while balls are in motion with next seq
      shot2 = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease0,
        "seq" => 2,
        "controls" => %{"type" => "shoot", "angle" => 0.0, "power" => 5.0}
      }

      assert {:error, :balls_in_motion} =
               GenServer.call(session, {:command, "activity_input", shot2, p0})

      # Repeated shot with stale sequence
      shot_repeat = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease0,
        "seq" => 1,
        "controls" => %{"type" => "shoot", "angle" => 0.0, "power" => 5.0}
      }

      assert {:error, :stale_sequence} =
               GenServer.call(session, {:command, "activity_input", shot_repeat, p0})
    end

    test "rejects overlap ball-in-hand placement", ctx do
      session = start_pool_session(ctx)
      p0 = make_player("p0")
      p1 = make_player("p1")

      {{0, lease0}, _} = join_and_ready_players(session, p0, p1)

      # Set session sim_state to ball_in_hand
      :sys.replace_state(session, fn s ->
        new_sim =
          s.sim_state
          |> Map.put("ball_in_hand", true)
          |> Map.put("status", "awaiting_ball_in_hand")

        %{s | sim_state: new_sim}
      end)

      # Attempt placement directly overlapping ball 1 at apex (0.56, 0.0)
      overlap_payload = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease0,
        "seq" => 1,
        "controls" => %{
          "type" => "place_cue_ball",
          "x" => 0.56,
          "z" => 0.0
        }
      }

      assert {:error, :overlap_placement} =
               GenServer.call(session, {:command, "activity_input", overlap_payload, p0})

      # Valid placement in clear space succeeds
      valid_payload = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease0,
        "seq" => 2,
        "controls" => %{
          "type" => "place_cue_ball",
          "x" => -0.4,
          "z" => 0.2
        }
      }

      assert {:ok, %{result: "input_accepted"}} =
               GenServer.call(session, {:command, "activity_input", valid_payload, p0})
    end

    test "rejects stale session commands", ctx do
      session = start_pool_session(ctx)
      p0 = make_player("p0")
      p1 = make_player("p1")

      {{0, lease0}, _} = join_and_ready_players(session, p0, p1)

      stale_payload = %{
        "sessionId" => "obsolete-session-id-9999",
        "lease" => lease0,
        "seq" => 1,
        "controls" => %{"type" => "shoot", "angle" => 0.0, "power" => 2.0}
      }

      assert {:error, :stale_session} =
               GenServer.call(session, {:command, "activity_input", stale_payload, p0})
    end
  end

  describe "Task 4.5: durable match records and stats" do
    test "player resignation triggers match_ended with forfeit outcome", ctx do
      session = start_pool_session(ctx)
      p0 = make_player("p0")
      p1 = make_player("p1")

      {{0, lease0}, _} = join_and_ready_players(session, p0, p1)

      resign_payload = %{
        "sessionId" => Activities.session_id(session),
        "lease" => lease0,
        "seq" => 1,
        "controls" => %{"type" => "resign"}
      }

      assert {:ok, %{result: "input_accepted"}} =
               GenServer.call(session, {:command, "activity_input", resign_payload, p0})

      # Process ticks to finalize match ended
      Process.sleep(50)
      info = Activities.session_info(session)
      assert info.status == :ended
      assert info.match_outcome["winner"] == p1.player_id
      assert info.match_outcome["winnerSlot"] == 1
      assert info.match_outcome["reason"] == "resignation"

      # Verify Results.from_session produces valid durable match record
      session_state = :sys.get_state(session)
      record = Results.from_session("match_ended", session_state, info.match_outcome)
      assert {:match, match_fields} = record
      assert match_fields.game == "pool"
      assert match_fields.outcome == "resignation"
      assert match_fields.winner_id == p1.player_id
      assert match_fields.participants["0"] == p0.player_id
      assert match_fields.participants["1"] == p1.player_id
    end

    test "distinguishes abort, forfeit and completed outcomes in durable match records", ctx do
      session = start_pool_session(ctx)
      session_state = :sys.get_state(session)

      # 1. Completed play
      completed_outcome = %{
        "winner" => "winner_p0",
        "reason" => "eight_ball",
        "score" => %{"0" => 1, "1" => 0}
      }
      assert {:match, c_fields} = Results.from_session("match_ended", session_state, completed_outcome)
      assert c_fields.outcome == "eight_ball"
      assert c_fields.winner_id == "winner_p0"

      # 2. Forfeit / Resignation
      forfeit_outcome = %{
        "winner" => "winner_p1",
        "reason" => "resignation"
      }
      assert {:match, f_fields} = Results.from_session("match_ended", session_state, forfeit_outcome)
      assert f_fields.outcome == "resignation"

      # 3. Aborted match (e.g. disconnect timeout)
      abort_outcome = %{
        "reason" => "aborted"
      }
      assert {:match, a_fields} = Results.from_session("match_aborted", session_state, abort_outcome)
      assert a_fields.outcome == "aborted"
    end
  end
end

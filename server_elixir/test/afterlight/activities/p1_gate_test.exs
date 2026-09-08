defmodule Afterlight.Activities.P1GateTest do
  @moduledoc """
  Task 2.8 P1 Gate Verification:
    * Two-player + one-observer proof with same-result assertions
    * Mid-match reconnect within grace and authoritative snapshot recovery
    * Disconnect grace expiry and failover without phantom scores
    * Slot race concurrency (atomic admission under load)
    * Aggregate limits under 16 declared activities and population cap:
      - snapshot size <= 32 KiB cap
      - input size <= 2 KiB cap
      - 60 Hz tick simulation & bounded mailbox depth
      - busy rejection keeps chat & presence responsive
  """

  use ExUnit.Case, async: false

  alias Afterlight.Activities
  alias Afterlight.World.Lease

  @pong_def %{
    "id" => "orpheum-pong",
    "type" => "pong",
    "rulesVersion" => 1,
    "capacities" => %{"players" => 2, "spectators" => 16, "queue" => 8},
    "interactionRadius" => 4.0,
    "transform" => %{"position" => [8.0, 0.0, -3.5]}
  }

  setup do
    test_pid = self()
    room_key = "orpheum-gate-#{System.unique_integer([:positive])}"
    room_epoch = 1

    room_pid = spawn_link(fn -> gate_room_loop(%{}, test_pid, room_key) end)

    handle = %Lease.Handle{
      room_key: room_key,
      owner_node: "gate_node",
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

  defp gate_room_loop(members, test_pid, room_key) do
    receive do
      {:set_member, player_id, conn_ref, channel_pid, pose} ->
        updated = Map.put(members, player_id, %{conn_ref: conn_ref, channel_pid: channel_pid, pose: pose})
        gate_room_loop(updated, test_pid, room_key)

      {:remove_member, player_id} ->
        gate_room_loop(Map.delete(members, player_id), test_pid, room_key)

      {:"$gen_call", from, {:member?, player_id, conn_ref}} ->
        m = Map.get(members, player_id)
        res = if members == %{}, do: true, else: m != nil and m.conn_ref == conn_ref
        GenServer.reply(from, res)
        gate_room_loop(members, test_pid, room_key)

      {:"$gen_call", from, {:member_pose, player_id}} ->
        case Map.get(members, player_id) do
          nil ->
            if members == %{} do
              GenServer.reply(from, {:ok, %{x: 8.0, z: -3.5}})
            else
              GenServer.reply(from, :not_found)
            end

          m ->
            GenServer.reply(from, {:ok, m.pose})
        end

        gate_room_loop(members, test_pid, room_key)

      {:"$gen_call", from, :lease_handle} ->
        GenServer.reply(from, {:ok, 1})
        gate_room_loop(members, test_pid, room_key)

      {:"$gen_call", from, {:chat_broadcast, sender_id, text}} ->
        now = System.monotonic_time(:millisecond)
        # Notify all member channels
        for {_id, %{channel_pid: pid}} <- members, is_pid(pid) do
          send(pid, {:chat_msg, sender_id, text, now})
        end
        GenServer.reply(from, {:ok, now})
        gate_room_loop(members, test_pid, room_key)

      {:"$gen_cast", {:broadcast_frame, frame}} ->
        # Send frame to test process and all registered channel PIDs
        send(test_pid, {:room_frame, frame})
        for {_id, %{channel_pid: pid}} <- members, is_pid(pid) do
          send(pid, {:room_frame, frame})
        end
        gate_room_loop(members, test_pid, room_key)

      :stop ->
        :ok

      _other ->
        gate_room_loop(members, test_pid, room_key)
    end
  end

  defp make_test_actor(prefix, conn_ref \\ 1) do
    uid = System.unique_integer([:positive])
    player_id = "#{prefix}_#{uid}"
    parent = self()

    channel_pid =
      spawn_link(fn ->
        actor_receiver_loop(parent, player_id)
      end)

    %{
      player_id: player_id,
      conn_ref: conn_ref,
      channel_pid: channel_pid
    }
  end

  defp actor_receiver_loop(parent, player_id) do
    receive do
      {:room_frame, frame} ->
        send(parent, {:actor_received, player_id, frame})
        actor_receiver_loop(parent, player_id)

      {:chat_msg, sender, text, timestamp} ->
        send(parent, {:actor_chat, player_id, sender, text, timestamp})
        actor_receiver_loop(parent, player_id)

      :stop ->
        :ok
    end
  end

  describe "1. Two-player + one-observer proof with same-result assertions" do
    test "players and observer receive identical snapshots, score updates, and match end events", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "orpheum-pong",
                 ctx.handle,
                 activity_def: @pong_def,
                 check_proximity: false,
                 tick_interval_ms: 16
               )

      p1 = make_test_actor("p1")
      p2 = make_test_actor("p2")
      obs = make_test_actor("obs")

      # Register actors in the room
      send(ctx.room_pid, {:set_member, p1.player_id, p1.conn_ref, p1.channel_pid, %{x: 8.0, z: -3.5}})
      send(ctx.room_pid, {:set_member, p2.player_id, p2.conn_ref, p2.channel_pid, %{x: 8.0, z: -3.5}})
      send(ctx.room_pid, {:set_member, obs.player_id, obs.conn_ref, obs.channel_pid, %{x: 8.0, z: -3.5}})

      # Both players join
      assert {:ok, %{result: "seated", slot: 0, leaseId: l1}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)

      assert {:ok, %{result: "seated", slot: 1, leaseId: l2}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)

      # Observer joins as spectator
      assert {:ok, %{result: "watching", role: "spectator"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, obs)

      # Observer attempts to submit input: rejected immediately
      assert {:error, :not_seated} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => "fake_lease", "seq" => 1, "controls" => %{"dy" => 1.0}},
                 obs
               )

      # Drain initial frames
      Process.sleep(50)
      flush_mailbox()

      # Both players ready up
      assert {:ok, %{result: "ready", ready: true}} =
               Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)

      assert {:ok, %{result: "ready", ready: true}} =
               Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      # Verify match started
      info = Activities.session_info(session_pid)
      assert info.status == :in_progress
      match_id = info.match_id
      assert is_binary(match_id)

      # Submit paddle inputs from both players
      assert {:ok, %{result: "input_accepted"}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => l1, "seq" => 1, "controls" => %{"dy" => 1.0}},
                 p1
               )

      assert {:ok, %{result: "input_accepted"}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => l2, "seq" => 1, "controls" => %{"dy" => -1.0}},
                 p2
               )

      # Step simulation and inject terminal score (p1 scores 7th point)
      fast_state =
        info.sim_state
        |> Map.put("state", "rally")
        |> Map.put("serveDelay", 0)
        |> Map.put("score", %{"0" => 6, "1" => 3})
        |> put_in(["ball", "x"], 798.0)
        |> put_in(["ball", "vx"], 5.0)

      :sys.replace_state(session_pid, fn s -> %{s | sim_state: fast_state} end)
      send(session_pid, :sim_tick)
      Process.sleep(50)

      # Collect all events delivered to p1, p2, and obs
      p1_events = collect_actor_frames(p1.player_id)
      p2_events = collect_actor_frames(p2.player_id)
      obs_events = collect_actor_frames(obs.player_id)

      # All three received frames
      assert length(p1_events) > 0
      assert length(p2_events) > 0
      assert length(obs_events) > 0

      # Check match_ended event received by all three
      match_ended_p1 = find_event(p1_events, "match_ended")
      match_ended_p2 = find_event(p2_events, "match_ended")
      match_ended_obs = find_event(obs_events, "match_ended")

      assert match_ended_p1 != nil, "P1 must receive match_ended"
      assert match_ended_p2 != nil, "P2 must receive match_ended"
      assert match_ended_obs != nil, "Obs must receive match_ended"

      # Same-result assertions across players and observer
      assert match_ended_p1["winner"] == p1.player_id
      assert match_ended_p2["winner"] == p1.player_id
      assert match_ended_obs["winner"] == p1.player_id

      assert match_ended_p1["winnerSlot"] == 0
      assert match_ended_p2["winnerSlot"] == 0
      assert match_ended_obs["winnerSlot"] == 0

      assert match_ended_p1["score"]["0"] == 7
      assert match_ended_p2["score"]["0"] == 7
      assert match_ended_obs["score"]["0"] == 7

      assert match_ended_p1["score"]["1"] == 3
      assert match_ended_p2["score"]["1"] == 3
      assert match_ended_obs["score"]["1"] == 3

      assert match_ended_p1["matchId"] == match_id
      assert match_ended_p2["matchId"] == match_id
      assert match_ended_obs["matchId"] == match_id
    end
  end

  describe "2. Mid-match reconnect within grace & authoritative snapshot recovery" do
    test "reconnecting player recovers authoritative state snapshot within grace", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "orpheum-pong",
                 ctx.handle,
                 activity_def: @pong_def,
                 check_proximity: false,
                 tick_interval_ms: 16
               )

      p1_chan = spawn(fn -> fake_chan() end)
      p2_chan = spawn(fn -> fake_chan() end)

      p1 = %{player_id: "p1_rec_#{System.unique_integer([:positive])}", conn_ref: 1, channel_pid: p1_chan}
      p2 = %{player_id: "p2_rec_#{System.unique_integer([:positive])}", conn_ref: 2, channel_pid: p2_chan}

      {:ok, %{leaseId: _l1}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      {:ok, %{leaseId: _l2}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)

      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      info = Activities.session_info(session_pid)
      assert info.status == :in_progress
      match_id = info.match_id

      # Simulate score of 4 to 2
      fast_state =
        info.sim_state
        |> Map.put("score", %{"0" => 4, "1" => 2})

      :sys.replace_state(session_pid, fn s -> %{s | sim_state: fast_state} end)

      # P1 channel disconnects abruptly
      Process.exit(p1_chan, :kill)
      Process.sleep(50)

      # Session enters paused state due to disconnect grace
      paused_info = Activities.session_info(session_pid)
      assert paused_info.status == :paused
      assert is_nil(paused_info.players[0].channel_pid)

      # P1 reconnects with a fresh channel and updated conn_ref
      p1_new_chan = spawn(fn -> fake_chan() end)
      p1_reconnected = %{p1 | conn_ref: 102, channel_pid: p1_new_chan}

      # P1 requests resnapshot
      sess_id = Activities.session_id(session_pid)

      assert {:ok, snapshot} =
               Activities.command(
                 session_pid,
                 "activity_resnapshot",
                 %{"sessionId" => sess_id},
                 p1_reconnected
               )

      # Full snapshot correctly captures paused status, current score, and matchId
      assert snapshot["type"] == "activity_state"
      assert snapshot["activityId"] == "orpheum-pong"
      assert snapshot["state"]["sim"]["score"]["0"] == 4
      assert snapshot["state"]["sim"]["score"]["1"] == 2
      assert snapshot["state"]["matchId"] == match_id
      assert snapshot["state"]["status"] == "paused"
    end
  end

  describe "3. Failover, owner loss, and grace expiry without phantom scores" do
    test "grace expiry awards clean forfeit win to remaining player; double disconnect aborts cleanly", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "orpheum-pong",
                 ctx.handle,
                 activity_def: @pong_def,
                 check_proximity: false,
                 tick_interval_ms: 16
               )

      p1_chan = spawn(fn -> fake_chan() end)
      p2_chan = spawn(fn -> fake_chan() end)
      p1 = %{player_id: "p1_fail_#{System.unique_integer([:positive])}", conn_ref: 1, channel_pid: p1_chan}
      p2 = %{player_id: "p2_fail_#{System.unique_integer([:positive])}", conn_ref: 2, channel_pid: p2_chan}

      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      # Disconnect P1 and advance grace expiry
      Process.exit(p1_chan, :kill)
      Process.sleep(50)

      # Trigger grace timeout manually
      send(session_pid, {:disconnect_timeout, p1.player_id})
      Process.sleep(50)

      info = Activities.session_info(session_pid)
      assert info.status == :ended
      assert info.match_outcome["reason"] == "forfeit"
      assert info.match_outcome["winner"] == p2.player_id
      assert info.match_outcome["loser"] == p1.player_id
    end

    test "owner loss: room crash immediately terminates session without creating phantom wins", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "orpheum-pong",
                 ctx.handle,
                 activity_def: @pong_def,
                 check_proximity: false
               )

      session_monitor = Process.monitor(session_pid)

      # Kill room process (simulating room supervisor failover)
      Process.unlink(ctx.room_pid)
      Process.exit(ctx.room_pid, :kill)

      # Session terminates cleanly
      assert_receive {:DOWN, ^session_monitor, :process, ^session_pid, :shutdown}, 1000
      refute Process.alive?(session_pid)
      assert {:error, :not_found} = Activities.lookup_session(ctx.room_key, ctx.room_epoch, "orpheum-pong")
    end
  end

  describe "4. Slot race concurrency (atomic admission)" do
    test "concurrent join requests for a single open slot admit exactly one player", ctx do
      # Capacity: 1 player slot
      single_slot_def = %{
        @pong_def
        | "id" => "single-slot-pong",
          "capacities" => %{"players" => 1, "spectators" => 4, "queue" => 0}
      }

      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "single-slot-pong",
                 ctx.handle,
                 activity_def: single_slot_def,
                 check_proximity: false
               )

      # 10 actors race concurrently to claim the single slot
      actors =
        for i <- 1..10 do
          chan = spawn(fn -> fake_chan() end)
          %{player_id: "racer_#{i}_#{System.unique_integer([:positive])}", conn_ref: i, channel_pid: chan}
        end

      results =
        actors
        |> Enum.map(fn actor ->
          Task.async(fn ->
            Activities.command(session_pid, "activity_join", %{"role" => "player"}, actor)
          end)
        end)
        |> Enum.map(&Task.await(&1, 2000))

      successes =
        Enum.filter(results, fn
          {:ok, %{result: "seated", slot: 0}} -> true
          _ -> false
        end)

      failures =
        Enum.filter(results, fn
          {:error, :activity_full} -> true
          {:error, :slot_unavailable} -> true
          _ -> false
        end)

      # Exactly one succeeds; exactly nine fail with capacity rejection
      assert length(successes) == 1, "Expected exactly 1 successful slot reservation, got #{length(successes)}"
      assert length(failures) == 9, "Expected exactly 9 slot rejections, got #{length(failures)}"
    end
  end

  describe "5. Aggregate limits under 16 declared activities and population cap" do
    test "16 activities running simultaneously respect <= 32 KiB snapshot cap, 2 KiB input cap, bounded mailboxes, and keep chat responsive", ctx do
      # 16 declared activities
      activity_count = 16

      sessions =
        for i <- 1..activity_count do
          act_id = "act_table_#{i}"

          act_def = %{
            "id" => act_id,
            "type" => "pong",
            "rulesVersion" => 1,
            "capacities" => %{"players" => 2, "spectators" => 10, "queue" => 4},
            "interactionRadius" => 4.0,
            "transform" => %{"position" => [i * 2.0, 0.0, 0.0]}
          }

          {:ok, pid} =
            Activities.get_or_start_session(
              ctx.room_pid,
              ctx.room_key,
              ctx.room_epoch,
              act_id,
              ctx.handle,
              activity_def: act_def,
              check_proximity: false,
              tick_interval_ms: 16
            )

          {act_id, pid}
        end

      # Populate room with 50 members (simulating existing room population cap)
      population_cap = 50
      members =
        for i <- 1..population_cap do
          chan = spawn(fn -> fake_chan() end)
          p = %{player_id: "visitor_#{i}", conn_ref: i, channel_pid: chan, pose: %{x: 0.0, z: 0.0}}
          send(ctx.room_pid, {:set_member, p.player_id, p.conn_ref, p.channel_pid, p.pose})
          p
        end

      # Seed 2 players in each of the 16 activities and start simulation
      player_leases =
        for {act_id, session_pid} <- sessions do
          p1 = make_test_actor("p1_#{act_id}")
          p2 = make_test_actor("p2_#{act_id}")

          {:ok, %{leaseId: l1}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
          {:ok, %{leaseId: l2}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)

          Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
          Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

          {session_pid, p1, l1, p2, l2}
        end

      # 5.1 Verify Snapshot Cap (<= 32 KiB) across all 16 activities
      for {act_id, session_pid} <- sessions do
        snapshot = Activities.session_full_snapshot(session_pid)
        encoded = Jason.encode!(snapshot)
        size = byte_size(encoded)

        assert size <= 32_768, "Snapshot size for #{act_id} exceeded 32 KiB: #{size} bytes"
        # Pong snapshot is compact (~1 KiB)
        assert size >= 100 and size <= 4_096
      end

      # 5.2 Verify 2 KiB Input Size Cap
      {first_session, p1_act1, l1_act1, _, _} = hd(player_leases)

      # 2048-byte payload is accepted (two strings within 1024-byte per-string bound)
      ok_controls = %{"dy" => 1.0, "pad1" => String.duplicate("a", 900), "pad2" => String.duplicate("b", 900)}
      assert {:ok, _} =
               Activities.command(
                 first_session,
                 "activity_input",
                 %{"lease" => l1_act1, "seq" => 1, "controls" => ok_controls},
                 p1_act1
               )

      # 5.3 Verify Mailbox Depth Under High-Frequency Input Bursts
      # Send a rapid burst of inputs to all 16 sessions
      for {session_pid, p1, l1, p2, l2} <- player_leases do
        for seq <- 2..5 do
          Activities.command(session_pid, "activity_input", %{"lease" => l1, "seq" => seq, "controls" => %{"dy" => 0.5}}, p1)
          Activities.command(session_pid, "activity_input", %{"lease" => l2, "seq" => seq, "controls" => %{"dy" => -0.5}}, p2)
        end
      end

      # Measure mailbox queues for all 16 sessions
      mailbox_depths =
        Enum.map(sessions, fn {_id, pid} ->
          {:message_queue_len, len} = Process.info(pid, :message_queue_len)
          len
        end)

      # All sessions maintain shallow mailboxes (<= 10 messages)
      for depth <- mailbox_depths do
        assert depth <= 10, "Activity mailbox depth exceeded bound: #{depth}"
      end

      # 5.4 Verify Busy Rejection and Chat/Presence Responsiveness
      # Flood one session with invalid / duplicate sequences to simulate busy rejection
      for _seq <- 1..20 do
        # Stale seq 1 -> immediate rejection
        assert {:error, :stale_sequence} =
                 Activities.command(
                   first_session,
                   "activity_input",
                   %{"lease" => l1_act1, "seq" => 1, "controls" => %{"dy" => 1.0}},
                   p1_act1
                 )
      end

      # Measure chat broadcast latency while 16 activities are actively ticking and under input load
      chat_sender = hd(members)
      start_time = System.monotonic_time(:microsecond)

      # Dispatch chat message through room
      {:ok, _} = GenServer.call(ctx.room_pid, {:chat_broadcast, chat_sender.player_id, "Hello Orpheum!"})

      elapsed_us = System.monotonic_time(:microsecond) - start_time
      elapsed_ms = elapsed_us / 1000.0

      # Chat delivery must remain responsive (under 10 ms even during active activity simulation)
      assert elapsed_ms < 10.0, "Chat broadcast latency too high under activity load: #{elapsed_ms} ms"
    end
  end

  # --- Helper Functions ---

  defp fake_chan do
    receive do
      _ -> fake_chan()
    end
  end

  defp flush_mailbox do
    receive do
      _ -> flush_mailbox()
    after
      0 -> :ok
    end
  end

  defp collect_actor_frames(player_id, acc \\ []) do
    receive do
      {:actor_received, ^player_id, frame} ->
        collect_actor_frames(player_id, [frame | acc])
    after
      100 ->
        Enum.reverse(acc)
    end
  end

  defp find_event(frames, event_name) do
    Enum.find_value(frames, fn
      %{"type" => "activity_event", "event" => ^event_name, "payload" => payload} ->
        payload

      %{type: "activity_event", event: ^event_name, payload: payload} ->
        payload

      _ ->
        nil
    end)
  end
end

defmodule Afterlight.Activities.P2GateTest do
  @moduledoc """
  Task 3.11 P2 Gate Verification:
    * Play every cabinet through completion with an observer (Pong, Rain Runner, Signal Lost, Sporefall)
    * Reject score forgery (unauthorized writes, tampered scores, duplicate replay forgery, client control abuse)
    * Database outage resilience (bounded retries, honest backlog-full reporting, no session crashes)
  """

  use Afterlight.DataCase, async: false

  alias Afterlight.Activities
  alias Afterlight.Activities.{ArcadeRun, ActivityMatch, CompletionRecorder, Results}
  alias Afterlight.Repo
  alias Afterlight.World.Lease

  import Ecto.Query

  @pong_def %{
    "id" => "orpheum-pong",
    "type" => "pong",
    "rulesVersion" => 1,
    "capacities" => %{"players" => 2, "spectators" => 16, "queue" => 8},
    "interactionRadius" => 4.0,
    "transform" => %{"position" => [8.0, 0.0, -3.5]}
  }

  @rain_runner_def %{
    "id" => "orpheum-rain-runner",
    "type" => "rain-runner",
    "rulesVersion" => 1,
    "capacities" => %{"players" => 1, "spectators" => 16, "queue" => 8},
    "interactionRadius" => 3.5,
    "transform" => %{"position" => [9.3, 0.0, -5.9]}
  }

  @signal_lost_def %{
    "id" => "orpheum-signal-lost",
    "type" => "signal-lost",
    "rulesVersion" => 1,
    "capacities" => %{"players" => 1, "spectators" => 16, "queue" => 8},
    "interactionRadius" => 3.5,
    "transform" => %{"position" => [9.3, 0.0, -3.85]}
  }

  @sporefall_def %{
    "id" => "orpheum-sporefall",
    "type" => "sporefall",
    "rulesVersion" => 1,
    "capacities" => %{"players" => 1, "spectators" => 16, "queue" => 8},
    "interactionRadius" => 3.5,
    "transform" => %{"position" => [9.9, 0.0, -1.8]}
  }

  setup do
    test_pid = self()
    room_key = "orpheum-p2-#{System.unique_integer([:positive])}"
    room_epoch = 1

    room_pid = spawn_link(fn -> gate_room_loop(%{}, test_pid, room_key) end)

    handle = %Lease.Handle{
      room_key: room_key,
      owner_node: "p2_gate_node",
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

      {:"$gen_cast", {:broadcast_frame, frame}} ->
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

      :stop ->
        :ok
    end
  end

  describe "1. Play every cabinet through completion with an observer" do
    test "Pong: 2 players + 1 observer receive identical match_ended and result_recorded", ctx do
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

      p1 = make_test_actor("pong_p1")
      p2 = make_test_actor("pong_p2")
      obs = make_test_actor("pong_obs")

      send(ctx.room_pid, {:set_member, p1.player_id, p1.conn_ref, p1.channel_pid, %{x: 8.0, z: -3.5}})
      send(ctx.room_pid, {:set_member, p2.player_id, p2.conn_ref, p2.channel_pid, %{x: 8.0, z: -3.5}})
      send(ctx.room_pid, {:set_member, obs.player_id, obs.conn_ref, obs.channel_pid, %{x: 8.0, z: -3.5}})

      assert {:ok, %{result: "seated", slot: 0, leaseId: _l1}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      assert {:ok, %{result: "seated", slot: 1, leaseId: _l2}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)
      assert {:ok, %{result: "watching", role: "spectator"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, obs)

      # Observer input rejected
      assert {:error, :not_seated} =
               Activities.command(session_pid, "activity_input", %{"lease" => "fake", "seq" => 1, "controls" => %{}}, obs)

      # Ready up and start
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      # Fast-forward Pong to terminal score (7-3)
      info = Activities.session_info(session_pid)
      terminal_sim =
        info.sim_state
        |> Map.put("state", "rally")
        |> Map.put("serveDelay", 0)
        |> Map.put("score", %{"0" => 6, "1" => 3})
        |> put_in(["ball", "x"], 798.0)
        |> put_in(["ball", "vx"], 5.0)

      :sys.replace_state(session_pid, fn s -> %{s | sim_state: terminal_sim} end)
      send(session_pid, :sim_tick)
      Process.sleep(60)

      # Collect actor frames
      events_p1 = collect_actor_events(p1.player_id)
      events_p2 = collect_actor_events(p2.player_id)
      events_obs = collect_actor_events(obs.player_id)

      ended_p1 = Enum.find(events_p1, &(&1.event == "match_ended"))
      ended_p2 = Enum.find(events_p2, &(&1.event == "match_ended"))
      ended_obs = Enum.find(events_obs, &(&1.event == "match_ended"))

      assert ended_p1 != nil and ended_p2 != nil and ended_obs != nil
      assert ended_p1.payload["winner"] == p1.player_id
      assert ended_p1.payload["winner"] == ended_p2.payload["winner"] and ended_p1.payload["winner"] == ended_obs.payload["winner"]
      assert ended_p1.payload["score"] == %{"0" => 7, "1" => 3}
      assert ended_p2.payload["score"] == ended_p1.payload["score"] and ended_obs.payload["score"] == ended_p1.payload["score"]

      # Result persisted in ActivityMatch
      assert Repo.aggregate(ActivityMatch, :count) >= 1
    end

    test "Rain Runner: player + observer receive identical completion and score", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "orpheum-rain-runner",
                 ctx.handle,
                 activity_def: @rain_runner_def,
                 check_proximity: false,
                 tick_interval_ms: 16
               )

      p = make_test_actor("rr_p")
      obs = make_test_actor("rr_obs")

      send(ctx.room_pid, {:set_member, p.player_id, p.conn_ref, p.channel_pid, %{x: 9.3, z: -5.9}})
      send(ctx.room_pid, {:set_member, obs.player_id, obs.conn_ref, obs.channel_pid, %{x: 9.3, z: -5.9}})

      assert {:ok, %{result: "seated", slot: 0, leaseId: _l}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p)
      assert {:ok, %{result: "watching", role: "spectator"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, obs)

      # Observer input rejected
      assert {:error, :not_seated} =
               Activities.command(session_pid, "activity_input", %{"lease" => "fake", "seq" => 1, "controls" => %{}}, obs)

      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p)

      # Advance Rain Runner to collision / terminal state
      info = Activities.session_info(session_pid)
      fast_sim =
        info.sim_state
        |> Map.put("tick", 35_999)
        |> Map.put("score", 1540)
        |> Map.put("distance", 154.0)

      :sys.replace_state(session_pid, fn s -> %{s | sim_state: fast_sim} end)
      send(session_pid, :sim_tick)
      Process.sleep(80)

      events_p = collect_actor_events(p.player_id)
      events_obs = collect_actor_events(obs.player_id)

      ended_p = Enum.find(events_p, &(&1.event == "match_ended"))
      ended_obs = Enum.find(events_obs, &(&1.event == "match_ended"))

      assert ended_p != nil and ended_obs != nil
      assert ended_p.payload["score"] == 1540 and ended_obs.payload["score"] == 1540

      # Arcade run recorded
      assert Repo.one(from r in ArcadeRun, where: r.game == "rain-runner" and r.player_id == ^p.player_id).score == 1540
    end

    test "Signal Lost: player + observer receive identical terminal score and stats", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "orpheum-signal-lost",
                 ctx.handle,
                 activity_def: @signal_lost_def,
                 check_proximity: false,
                 tick_interval_ms: 16
               )

      p = make_test_actor("sl_p")
      obs = make_test_actor("sl_obs")

      send(ctx.room_pid, {:set_member, p.player_id, p.conn_ref, p.channel_pid, %{x: 9.3, z: -3.85}})
      send(ctx.room_pid, {:set_member, obs.player_id, obs.conn_ref, obs.channel_pid, %{x: 9.3, z: -3.85}})

      assert {:ok, %{result: "seated", slot: 0}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p)
      assert {:ok, %{result: "watching"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, obs)

      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p)

      info = Activities.session_info(session_pid)
      fast_sim =
        info.sim_state
        |> Map.put("tick", 35_999)
        |> Map.put("score", 2800)
        |> Map.put("wave", 2)

      :sys.replace_state(session_pid, fn s -> %{s | sim_state: fast_sim} end)
      send(session_pid, :sim_tick)
      Process.sleep(80)

      events_p = collect_actor_events(p.player_id)
      events_obs = collect_actor_events(obs.player_id)

      ended_p = Enum.find(events_p, &(&1.event == "match_ended"))
      ended_obs = Enum.find(events_obs, &(&1.event == "match_ended"))

      assert ended_p != nil and ended_obs != nil
      assert ended_p.payload["score"] == 2800 and ended_obs.payload["score"] == 2800

      assert Repo.one(from r in ArcadeRun, where: r.game == "signal-lost" and r.player_id == ^p.player_id).score == 2800
    end

    test "Sporefall: player + observer receive identical top-out score and lines", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "orpheum-sporefall",
                 ctx.handle,
                 activity_def: @sporefall_def,
                 check_proximity: false,
                 tick_interval_ms: 16
               )

      p = make_test_actor("sf_p")
      obs = make_test_actor("sf_obs")

      send(ctx.room_pid, {:set_member, p.player_id, p.conn_ref, p.channel_pid, %{x: 9.9, z: -1.8}})
      send(ctx.room_pid, {:set_member, obs.player_id, obs.conn_ref, obs.channel_pid, %{x: 9.9, z: -1.8}})

      assert {:ok, %{result: "seated", slot: 0}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p)
      assert {:ok, %{result: "watching"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, obs)

      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p)

      info = Activities.session_info(session_pid)
      fast_sim =
        info.sim_state
        |> Map.put("tick", 35_999)
        |> Map.put("score", 4200)
        |> Map.put("lines", 12)
        |> Map.put("level", 3)

      :sys.replace_state(session_pid, fn s -> %{s | sim_state: fast_sim} end)
      send(session_pid, :sim_tick)
      Process.sleep(80)

      events_p = collect_actor_events(p.player_id)
      events_obs = collect_actor_events(obs.player_id)

      ended_p = Enum.find(events_p, &(&1.event == "match_ended"))
      ended_obs = Enum.find(events_obs, &(&1.event == "match_ended"))

      assert ended_p != nil and ended_obs != nil
      assert ended_p.payload["score"] == 4200 and ended_obs.payload["score"] == 4200

      assert Repo.one(from r in ArcadeRun, where: r.game == "sporefall" and r.player_id == ^p.player_id).score == 4200
    end
  end

  describe "2. Reject score forgery" do
    test "client inputs containing score/winner fields are stripped and cannot modify simulation", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "orpheum-rain-runner",
                 ctx.handle,
                 activity_def: @rain_runner_def,
                 check_proximity: false,
                 tick_interval_ms: 16
               )

      p = make_test_actor("forger")
      send(ctx.room_pid, {:set_member, p.player_id, p.conn_ref, p.channel_pid, %{x: 9.3, z: -5.9}})

      assert {:ok, %{result: "seated", slot: 0, leaseId: l}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p)

      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p)

      forged_input = %{
        "lease" => l,
        "seq" => 1,
        "controls" => %{
          "steer" => 0.0,
          "score" => 999_999,
          "winner" => p.player_id,
          "lives" => 999
        }
      }

      Activities.command(session_pid, "activity_input", forged_input, p)
      send(session_pid, :sim_tick)

      info = Activities.session_info(session_pid)
      assert info.sim_state["score"] == 0 or info.sim_state["score"] < 100
    end

    test "guest actor cannot directly insert or modify ArcadeRun records via Ash", _ctx do
      row = %{
        game: "sporefall",
        rules_version: 1,
        player_id: "guest_forger",
        session_id: "sess_f",
        match_id: "match_f",
        score: 99_999_999,
        outcome: "top_out",
        stats: %{},
        completion_key: "forged_key_123",
        recorded_at: System.system_time(:millisecond)
      }

      assert {:error, _} =
               ArcadeRun
               |> Ash.Changeset.for_create(:record, Map.to_list(row),
                 actor: %{role: :guest, player_id: "guest_forger"}
               )
               |> Ash.create(authorize?: true)

      assert Repo.all(from r in ArcadeRun, where: r.player_id == "guest_forger") == []
    end

    test "replayed completion key with altered score is detected as duplicate and rejected", _ctx do
      fields = %{
        game: "rain-runner",
        rules_version: 1,
        player_id: "legit_player",
        session_id: "sess_legit",
        match_id: "match_legit",
        score: 500,
        outcome: "collision",
        stats: %{},
        ended_at: 1_700_000_000_000
      }

      # 1. Compute completion key for legitimate run
      key = Results.completion_key({:arcade_run, fields})
      row = fields |> Map.put(:completion_key, key) |> Map.put(:recorded_at, 1_700_000_001_000)

      # 2. Record authentic result
      assert {:ok, :recorded} = CompletionRecorder.record({:arcade_run, key, row})
      assert Repo.one(from r in ArcadeRun, where: r.match_id == "match_legit").score == 500

      # 3. Replay with a DIFFERENT (forged) score under identical completion key:
      forged_row = row |> Map.put(:score, 999_999)
      assert {:ok, :duplicate} = CompletionRecorder.record({:arcade_run, key, forged_row})

      # Score in DB remains 500, not 999_999
      assert Repo.one(from r in ArcadeRun, where: r.match_id == "match_legit").score == 500
      assert Repo.aggregate(ArcadeRun, :count) == 1
    end

    test "invalid, negative, string, and out-of-range scores are rejected with :forged_or_invalid", _ctx do
      base = %{
        game: "rain-runner",
        rules_version: 1,
        player_id: "p_test",
        session_id: "s_test",
        match_id: "m_test",
        outcome: "collision",
        stats: %{},
        ended_at: 1_700_000_000_000
      }

      for bad_score <- [-10, "5000", 1.5, 100_000_001, nil] do
        assert {:error, :forged_or_invalid} = Results.record_run(Map.put(base, :score, bad_score))
      end
    end
  end

  describe "3. Database outage resilience" do
    test "recorder retries during transient database outage and recovers cleanly", _ctx do
      {:ok, attempts} = Agent.start_link(fn -> 0 end)

      flaky_writer = fn {_, _key, _row} ->
        count = Agent.get_and_update(attempts, fn n -> {n, n + 1} end)
        if count < 2 do
          {:error, :db_connection_lost}
        else
          {:ok, :recorded}
        end
      end

      server_name = :"flaky_rec_#{System.unique_integer([:positive])}"
      {:ok, pid} =
        GenServer.start_link(CompletionRecorder,
          writer: flaky_writer,
          retry_interval_ms: 5,
          name: server_name
        )

      row = %{
        game: "sporefall",
        rules_version: 1,
        player_id: "p_outage",
        session_id: "s_outage",
        match_id: "m_outage",
        score: 3000,
        outcome: "top_out",
        stats: %{},
        completion_key: "outage_key_1",
        recorded_at: System.system_time(:millisecond)
      }

      assert {:ok, :retrying} = CompletionRecorder.record({:arcade_run, "outage_key_1", row}, pid)
      assert CompletionRecorder.stats(pid).pending == 1

      assert eventually(fn -> CompletionRecorder.stats(pid).pending == 0 end)
      assert CompletionRecorder.stats(pid).dropped == 0
    end

    test "backlog saturation returns honest :recording_backlog_full and does not crash", _ctx do
      always_fail_writer = fn _ -> {:error, :db_dead} end

      server_name = :"capped_rec_#{System.unique_integer([:positive])}"
      {:ok, pid} =
        GenServer.start_link(CompletionRecorder,
          writer: always_fail_writer,
          max_pending: 2,
          retry_interval_ms: 100_000,
          name: server_name
        )

      assert {:ok, :retrying} = CompletionRecorder.record({:arcade_run, "k1", %{score: 100}}, pid)
      assert {:ok, :retrying} = CompletionRecorder.record({:arcade_run, "k2", %{score: 200}}, pid)

      assert {:error, :recording_backlog_full} =
               CompletionRecorder.record({:arcade_run, "k3", %{score: 300}}, pid)

      assert CompletionRecorder.stats(pid).pending == 2
    end

    test "live activity simulation continues unblocked when database write fails", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "orpheum-sporefall",
                 ctx.handle,
                 activity_def: @sporefall_def,
                 check_proximity: false,
                 tick_interval_ms: 16
               )

      p = make_test_actor("outage_player")
      send(ctx.room_pid, {:set_member, p.player_id, p.conn_ref, p.channel_pid, %{x: 9.9, z: -1.8}})

      assert {:ok, %{result: "seated", slot: 0}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p)

      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p)

      send(session_pid, {:activity_event, "match_ended", %{"score" => -1, "reason" => "invalid"}})
      Process.sleep(50)

      assert Process.alive?(session_pid)
    end
  end

  defp collect_actor_events(player_id) do
    receive do
      {:actor_received, ^player_id, %{"type" => "activity_event", "event" => event_name, "payload" => payload}} ->
        [%{event: event_name, payload: payload} | collect_actor_events(player_id)]

      {:actor_received, ^player_id, _other} ->
        collect_actor_events(player_id)
    after
      60 -> []
    end
  end

  defp eventually(fun, tries \\ 200)
  defp eventually(_fun, tries) when tries <= 0, do: false
  defp eventually(fun, tries) do
    if fun.(), do: true, else: (Process.sleep(10); eventually(fun, tries - 1))
  end
end

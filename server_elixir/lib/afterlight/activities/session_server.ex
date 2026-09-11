defmodule Afterlight.Activities.SessionServer do
  @moduledoc """
  Authoritative room-owned activity session (tasks 2.1, 2.2, 2.3, design D2/D3).
  Session key: `{room_key, room_epoch, activity_id}`.
  A match/session ID changes on restart.
  Monitors the room process: owner loss or lease fencing shuts down the session.
  Owns atomic player slot admissions, duplicate-tab policy, readiness,
  capacity enforcement, FIFO timed offers, monitored disconnect grace,
  input watchdog, and idle session reaping.
  """
  use GenServer, restart: :transient
  require Logger

  alias Afterlight.Activities
  alias Afterlight.Activities.Admission
  alias Afterlight.Activities.{AirHockey, Foosball, WinnerStays}
  alias Afterlight.Activities.Drone
  alias Afterlight.Activities.PaperAirplane
  alias Afterlight.Activities.GutterBoat
  alias Afterlight.Activities.RcBoat
  alias Afterlight.Activities.Horseshoes
  alias Afterlight.Activities.Telescope
  alias Afterlight.Activities.HammerStrike
  alias Afterlight.Activities.ForgeChallenge
  alias Afterlight.Activities.Curling
  alias Afterlight.Activities.Chess
  alias Afterlight.Activities.Checkers
  alias Afterlight.Activities.TilePuzzle
  alias Afterlight.Activities.LightMusic
  alias Afterlight.Activities.Darts
  alias Afterlight.Activities.Piano
  alias Afterlight.Activities.PhotoBooth
  alias Afterlight.Activities.Fishing
  alias Afterlight.Activities.SkippingStones
  alias Afterlight.Activities.Environment
  alias Afterlight.Activities.Pong
  alias Afterlight.Activities.RainRunner
  alias Afterlight.Activities.SignalLost
  alias Afterlight.Activities.Snowboard
  alias Afterlight.Activities.DownhillMayhem
  alias Afterlight.Activities.Sporefall
  alias Afterlight.World.Fence
  alias Afterlight.World.RoomServer

  @default_offer_timeout_ms 30_000
  @default_reconnect_grace_ms 30_000
  @default_input_watchdog_ms 250
  @default_ready_timeout_ms 60_000
  @default_idle_reap_ms 60_000
  @default_nonready_inactivity_ms 120_000

  defstruct [
    :room_key,
    # Public wire room id for envelopes (add-multiplayer-snowboard-arcade
    # 4.4): snowboard sessions key by the owner's CANONICAL room identity,
    # while every client-visible frame keeps the real wire roomId (D3).
    :wire_room_id,
    :room_epoch,
    :activity_id,
    :session_id,
    :room_pid,
    :room_monitor_ref,
    :ownership_handle,
    :activity_def,
    :match_id,
    :match_outcome,
    :idle_timer_ref,
    :tick_timer_ref,
    :last_tick_at,
    :last_snapshot_at,
    # Snowboard race lifecycle (add-multiplayer-snowboard-arcade 4.2):
    # countdown scheduling, the 180s race deadline, results retention.
    :countdown_ref,
    :deadline_ref,
    :results_ref,
    :inactivity_ref,
    # Downhill Mayhem lifecycle (integrate-multiplayer-downhill-mayhem-arcade
    # 8.6): the locked six-rider field, the cached canonical course and the
    # wall-clock countdown/deadline anchors.
    :locked_field,
    :race_course,
    :race_started_at,
    :start_at,
    :deadline_at,
    :snapshot_seq,
    :last_summary_at,
    :last_summary_phase,
    :countdown_ms,
    :race_deadline_ms,
    :results_retention_ms,
    :nonready_inactivity_ms,
    lobby_config: %{},
    status: :lobby,
    max_players: 2,
    max_queue: 16,
    max_spectators: 32,
    players: %{},
    player_to_slot: %{},
    queue: [],
    spectators: %{},
    offers: %{},
    disconnects: %{},
    recent_events: [],
    sim_state: %{},
    sim_tick_count: 0,
    tick_interval_ms: 16,
    snapshot_interval_ms: 50,
    revision: 0,
    fenced: false,
    started_at: nil,
    offer_timeout_ms: @default_offer_timeout_ms,
    reconnect_grace_ms: @default_reconnect_grace_ms,
    input_watchdog_ms: @default_input_watchdog_ms,
    ready_timeout_ms: @default_ready_timeout_ms,
    idle_reap_ms: @default_idle_reap_ms,
    check_proximity: true,
    environment: nil,
    winner_stays_applied: false
  ]

  def start_link(args) do
    room_key = Map.fetch!(args, :room_key)
    room_epoch = Map.fetch!(args, :room_epoch)
    activity_id = Map.fetch!(args, :activity_id)

    name = Activities.via_tuple(room_key, room_epoch, activity_id)
    GenServer.start_link(__MODULE__, args, name: name)
  end

  @impl true
  def init(args) do
    room_pid = Map.fetch!(args, :room_pid)
    room_key = Map.fetch!(args, :room_key)
    room_epoch = Map.fetch!(args, :room_epoch)
    activity_id = Map.fetch!(args, :activity_id)
    handle = Map.get(args, :ownership_handle)
    act_def = Map.get(args, :activity_def, %{})

    if not Process.alive?(room_pid) do
      {:stop, :room_unavailable}
    else
      ref = Process.monitor(room_pid)

      if handle && handle.fenced do
        {:stop, :lease_lost}
      else
        capacities = Map.get(act_def, "capacities", %{})
        max_players = Map.get(capacities, "players", 2)
        max_queue = Map.get(capacities, "queue", 16)
        max_spectators = Map.get(capacities, "spectators", 32)

        offer_timeout = Map.get(args, :offer_timeout_ms, @default_offer_timeout_ms)
        reconnect_grace = Map.get(args, :reconnect_grace_ms, @default_reconnect_grace_ms)
        input_watchdog = Map.get(args, :input_watchdog_ms, @default_input_watchdog_ms)
        ready_timeout = Map.get(args, :ready_timeout_ms, @default_ready_timeout_ms)
        idle_reap = Map.get(args, :idle_reap_ms, @default_idle_reap_ms)
        check_prox = Map.get(args, :check_proximity, true)

        act_type = Map.get(act_def, "type", "unknown")
        tick_interval = Map.get(args, :tick_interval_ms, tick_interval_for(act_type))
        snapshot_interval = Map.get(args, :snapshot_interval_ms, snapshot_interval_for(act_type))
        # Race windows are overridable for tests; production uses the frozen
        # policy constants of the activity's own lifecycle policy (D4/D12).
        policy = policy_module(act_type)
        countdown_ms = Map.get(args, :countdown_ms, policy.countdown_ms())
        race_deadline_ms = Map.get(args, :race_deadline_ms, policy.race_deadline_ms())

        results_retention_ms =
          Map.get(args, :results_retention_ms, policy.results_retention_ms())

        nonready_inactivity_ms =
          Map.get(args, :nonready_inactivity_ms, @default_nonready_inactivity_ms)

        session_id = Map.get(args, :session_id) || generate_session_id()
        wire_room_id = Map.get(args, :wire_room_id) || room_key
        # D7: the initial lobby carries a nonempty matchId; every locked
        # countdown rotates it at GO.
        match_id = generate_match_id()

        env_policy = Map.get(act_def, "environmentPolicy", "none")
        now_ms = System.system_time(:millisecond)
        environment = Environment.resolve(wire_room_id, env_policy, now_ms)

        state = %__MODULE__{
          room_key: room_key,
          wire_room_id: wire_room_id,
          room_epoch: room_epoch,
          activity_id: activity_id,
          session_id: session_id,
          room_pid: room_pid,
          room_monitor_ref: ref,
          ownership_handle: handle,
          activity_def: act_def,
          environment: environment,
          max_players: max_players,
          max_queue: max_queue,
          max_spectators: max_spectators,
          players: %{},
          player_to_slot: %{},
          queue: [],
          spectators: %{},
          offers: %{},
          disconnects: %{},
          recent_events: [],
          sim_state: %{},
          sim_tick_count: 0,
          status: :lobby,
          match_id: match_id,
          revision: 0,
          fenced: false,
          started_at: System.system_time(:millisecond),
          offer_timeout_ms: offer_timeout,
          reconnect_grace_ms: reconnect_grace,
          input_watchdog_ms: input_watchdog,
          ready_timeout_ms: ready_timeout,
          idle_reap_ms: idle_reap,
          tick_interval_ms: tick_interval,
          snapshot_interval_ms: snapshot_interval,
          snapshot_seq: 0,
          last_summary_at: 0,
          last_summary_phase: nil,
          countdown_ms: countdown_ms,
          race_deadline_ms: race_deadline_ms,
          results_retention_ms: results_retention_ms,
          nonready_inactivity_ms: nonready_inactivity_ms,
          check_proximity: check_prox
        }

        # Start idle timer since session starts empty
        state = maybe_start_idle_timer(state)

        {:ok, state}
      end
    end
  end

  @impl true
  def terminate(reason, state) do
    if state do
      if state.room_monitor_ref do
        Process.demonitor(state.room_monitor_ref, [:flush])
      end

      # Cancel idle timer
      if state.idle_timer_ref, do: Process.cancel_timer(state.idle_timer_ref)

      # Cancel tick timer
      if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)

      # Cancel race lifecycle timers (countdown/deadline/results/inactivity)
      if state.countdown_ref, do: Process.cancel_timer(state.countdown_ref)
      if state.deadline_ref, do: Process.cancel_timer(state.deadline_ref)
      if state.results_ref, do: Process.cancel_timer(state.results_ref)
      if state.inactivity_ref, do: Process.cancel_timer(state.inactivity_ref)

      # Cancel pending timed offers
      for {_slot, offer} <- state.offers do
        if offer[:timer_ref], do: Process.cancel_timer(offer.timer_ref)
      end

      # Cancel disconnect grace timers
      for {_player_id, disc} <- state.disconnects do
        if disc[:timer_ref], do: Process.cancel_timer(disc.timer_ref)
      end

      # Cancel ready timers & watchdog timers, demonitor channel monitors
      for {_slot, player} <- state.players do
        if player[:channel_monitor], do: Process.demonitor(player.channel_monitor, [:flush])
        if player[:ready_timer_ref], do: Process.cancel_timer(player.ready_timer_ref)
        if player[:watchdog_timer_ref], do: Process.cancel_timer(player.watchdog_timer_ref)
        Admission.release(player.player_id)
      end
    end

    Logger.debug(
      "activity session terminated room=#{state.room_key} act=#{state.activity_id} sess=#{state.session_id} reason=#{inspect(reason)}"
    )

    :ok
  end

  # Owner-loss detection: room process terminated
  @impl true
  def handle_info(
        {:DOWN, ref, :process, room_pid, reason},
        %{room_monitor_ref: ref, room_pid: room_pid} = state
      ) do
    Logger.info(
      "activity session owner lost room=#{state.room_key} act=#{state.activity_id} reason=#{inspect(reason)}"
    )

    {:stop, :shutdown, %{state | fenced: true}}
  end

  # Channel process terminated: handle disconnect grace (Task 2.3)
  def handle_info({:DOWN, ref, :process, pid, reason}, state) do
    case find_player_by_monitor(state, ref) do
      {:player, player} ->
        handle_player_disconnect(player, reason, state)

      :not_found ->
        # Check queue or spectators
        state = purge_disconnected_channel(state, pid)
        {:noreply, state}
    end
  end

  # Room owner notify about lease fencing
  def handle_info({:lease_fenced, _reason}, state) do
    {:stop, :shutdown, %{state | fenced: true}}
  end

  # Simulation tick (Task 2.4 & 2.7): 60 Hz bounded simulation, at most 4 catch-up steps, 20 Hz snapshots
  def handle_info(:sim_tick, state) do
    if state.status == :in_progress do
      cond do
        snowboard?(state) -> snowboard_sim_tick(state)
        downhill?(state) -> downhill_sim_tick(state)
        true -> generic_sim_tick(state)
      end
    else
      if pool_practice?(state) do
        now = System.monotonic_time(:millisecond)
        last_tick = state.last_tick_at || now
        elapsed = max(now - last_tick, 0)
        steps = div(elapsed, state.tick_interval_ms)
        steps_to_run = min(max(steps, 1), 4)

        {sim, _events} =
          Afterlight.Activities.Pool.Rules.step(state.sim_state, steps_to_run * (1.0 / 60.0))

        [slot] = Map.keys(state.players)

        sim =
          if sim["status"] == "game_over",
            do: Afterlight.Activities.Pool.Rules.init_game(),
            else: sim

        sim = if sim["status"] == "shooting", do: sim, else: Map.put(sim, "turn", slot)

        state = %{
          state
          | sim_state: sim,
            last_tick_at: now,
            sim_tick_count: state.sim_tick_count + steps_to_run
        }

        shooting? = sim["status"] == "shooting"

        # Publish at the shared 20 Hz snapshot cadence (generic_sim_tick):
        # stepping runs at 60 Hz, but matches publish snapshots at 20 Hz and
        # the practice path must not flood the room at 3x that rate.
        # broadcast_activity_state returns :ok — never bind it to state.
        # A nil last_snapshot_at (fresh lobby) means DUE: System.monotonic_time
        # has an arbitrary origin, so it must never be compared against 0.
        state =
          if not shooting? or is_nil(state.last_snapshot_at) or
               now - state.last_snapshot_at >= state.snapshot_interval_ms do
            new_state = %{state | last_snapshot_at: now}
            broadcast_activity_state(new_state)
            new_state
          else
            state
          end

        ref = if shooting?, do: Process.send_after(self(), :sim_tick, state.tick_interval_ms)
        {:noreply, %{state | tick_timer_ref: ref}}
      else
        {:noreply, %{state | tick_timer_ref: nil}}
      end
    end
  end

  # Snowboard race tick (add-multiplayer-snowboard-arcade 4.2): 30 Hz fixed
  # steps over the pure reducer. Absent riders freeze (the policy skips
  # them); simulation debt beyond 500ms aborts the affected match honestly
  # (D5) instead of silently dropping competitive time.
  defp snowboard_sim_tick(state) do
    now = System.monotonic_time(:millisecond)
    last_tick = state.last_tick_at || now
    elapsed = max(now - last_tick, 0)

    if elapsed > 500 do
      snowboard_telemetry(state, :overload, %{debt_ms: elapsed})
      {:noreply, abort_snowboard_race(%{state | tick_timer_ref: nil}, "server_overload")}
    else
      steps_to_run = min(max(div(elapsed, state.tick_interval_ms), 1), 4)

      {sim_state, race_events, outcome} =
        Snowboard.SessionPolicy.step(state.sim_state, state.players, steps_to_run)

      state = %{
        state
        | sim_state: sim_state,
          sim_tick_count: state.sim_tick_count + steps_to_run,
          last_tick_at: now
      }

      state =
        Enum.reduce(race_events, state, fn {slot, event}, acc ->
          broadcast_race_event(acc, slot, event)
        end)

      case outcome do
        {:race_complete, _sim} ->
          state = %{state | tick_timer_ref: nil}
          {:noreply, finish_snowboard_race(state, "complete")}

        nil ->
          state =
            if now - (state.last_snapshot_at || 0) >= state.snapshot_interval_ms do
              broadcast_activity_state(state)
              %{state | last_snapshot_at: now}
            else
              state
            end

          tick_ref = Process.send_after(self(), :sim_tick, state.tick_interval_ms)
          {:noreply, %{state | tick_timer_ref: tick_ref}}
      end
    end
  end

  # Downhill Mayhem race tick (integrate-multiplayer-downhill-mayhem-arcade
  # 8.6): 30 Hz fixed steps (33 ms) over the pure reducer, human controls from
  # the accepted held state, server-driven AI, disconnected/DNF riders frozen.
  # Simulation debt beyond 500ms aborts the match honestly instead of silently
  # dropping competitive time.
  defp downhill_sim_tick(state) do
    now = System.monotonic_time(:millisecond)
    last_tick = state.last_tick_at || now
    elapsed = max(now - last_tick, 0)

    if elapsed > 500 do
      downhill_telemetry(state, :overload, %{debt_ms: elapsed})
      {:noreply, abort_downhill_race(%{state | tick_timer_ref: nil}, "server_overload")}
    else
      steps = min(max(div(elapsed, state.tick_interval_ms), 1), 4)
      course = state.race_course || downhill_course!(state)
      race_elapsed = max(now - (state.race_started_at || now), 0) / 1000.0
      controls = downhill_controls_by_slot(state)
      frozen = downhill_frozen_slots(state)

      {sim_state, race_events, outcome} =
        DownhillMayhem.SessionPolicy.step_many(
          course,
          state.sim_state,
          race_elapsed,
          steps,
          controls,
          frozen
        )

      state = %{
        state
        | sim_state: sim_state,
          race_course: course,
          sim_tick_count: state.sim_tick_count + steps,
          last_tick_at: now
      }

      state =
        Enum.reduce(race_events, state, fn event, acc -> broadcast_downhill_event(acc, event) end)

      case outcome do
        {:race_complete, _sim} ->
          state = %{state | tick_timer_ref: nil}
          {:noreply, finish_downhill_race(state, "complete")}

        :continue ->
          state =
            if now - (state.last_snapshot_at || 0) >= state.snapshot_interval_ms do
              broadcast_activity_state(state)
              %{state | last_snapshot_at: now}
            else
              state
            end

          tick_ref = Process.send_after(self(), :sim_tick, state.tick_interval_ms)
          {:noreply, %{state | tick_timer_ref: tick_ref}}
      end
    end
  end

  # Human controls are the accepted held state keyed by slot, normalized into
  # the reducer's atom-keyed control shape; AI riders ignore this map and are
  # driven inside the reducer by DownhillMayhem.AI.
  defp downhill_controls_by_slot(state) do
    Map.new(state.players, fn {slot, p} ->
      raw =
        if Map.has_key?(state.disconnects, p.player_id) do
          %{}
        else
          Map.get(p, :input_state) || %{}
        end

      {slot, DownhillMayhem.normalize_controls(raw)}
    end)
  end

  # Disconnected riders and riders already DNF'd are frozen at their last
  # authoritative state while the race clock continues for everyone else.
  defp downhill_frozen_slots(state) do
    disconnected =
      for {player_id, _disc} <- state.disconnects,
          slot = Map.get(state.player_to_slot, player_id),
          is_integer(slot),
          do: slot

    dnf =
      for {slot, rider} <- state.sim_state["riders"] || %{}, rider[:dnf_reason] != nil, do: slot

    MapSet.new(disconnected ++ dnf)
  end

  # D7 race events: rider_finished per rider (the Alpine Rush course has no
  # ordered checkpoints; trick/bail/pickup feedback stays client-local like
  # the source game's toasts and is not broadcast).
  defp broadcast_race_event(state, slot, event) do
    player = Map.get(state.players, slot)
    player_id = if player, do: player.player_id, else: "slot_#{slot}"

    payload =
      case event do
        %{type: :checkpoint, index: index, key: key} ->
          %{"playerId" => player_id, "index" => index, "elapsedMs" => round(key)}

        %{type: :finish, finishMs: finish_ms, score: score, bestCombo: best_combo} ->
          %{
            "playerId" => player_id,
            "elapsedMs" => finish_ms,
            "score" => score,
            "bestCombo" => best_combo
          }

        _other ->
          nil
      end

    event_name =
      case event do
        %{type: :checkpoint} -> "checkpoint"
        %{type: :finish} -> "rider_finished"
        _ -> nil
      end

    if payload && event_name do
      record_and_broadcast_event(state, event_name, payload)
    else
      state
    end
  end

  defp generic_sim_tick(state) do
    now = System.monotonic_time(:millisecond)
    last_tick = state.last_tick_at || now
    elapsed = max(now - last_tick, 0)
    steps = div(elapsed, state.tick_interval_ms)
    steps_to_run = min(max(steps, 1), 4)

    if steps > 4 do
      Logger.warning(
        "Activity #{state.activity_id} sim tick lagging (#{steps} steps), clamped to 4"
      )
    end

    act_type = snowboard_type(state)

    sim_in =
      if act_type == "fishing" do
        now_ms = System.system_time(:millisecond)
        env = Environment.resolve(wire_room_id(state), "live", now_ms)
        Fishing.apply_environment(state.sim_state, env, now_ms)
      else
        state.sim_state
      end

    {sim_state, maybe_ended} =
      step_simulation(act_type, sim_in, state.players, steps_to_run)

    sim_tick_count = state.sim_tick_count + steps_to_run

    state = %{
      state
      | sim_state: sim_state,
        sim_tick_count: sim_tick_count,
        last_tick_at: now
    }

    state =
      case maybe_ended do
        {:match_ended, winner_slot, details} ->
          winner_player = Map.get(state.players, winner_slot)
          max_players = state.max_players || 2
          is_single_player = max_players == 1

          loser_slot = if is_single_player, do: nil, else: 1 - winner_slot
          loser_player = if loser_slot, do: Map.get(state.players, loser_slot), else: nil

          winner_id = if winner_player, do: winner_player.player_id, else: "slot_#{winner_slot}"
          loser_id = if loser_player, do: loser_player.player_id, else: nil

          details_map =
            if is_map(details),
              do: details,
              else: if(is_list(details), do: Map.new(details), else: %{})

          reason = Map.get(details_map, :reason, Map.get(details_map, "reason", "score"))

          outcome = %{
            "winner" => winner_id,
            "winnerSlot" => winner_slot,
            "reason" => to_string(reason),
            "score" => Map.get(sim_state, "score", %{}),
            "matchId" => state.match_id
          }

          outcome =
            if loser_id do
              outcome
              |> Map.put("loser", loser_id)
              |> Map.put("loserSlot", loser_slot)
            else
              outcome
            end

          outcome = Map.merge(outcome, Map.take(sim_state, ["distance", "level", "lives"]))

          if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)

          players =
            Map.new(state.players, fn {slot, p} ->
              {slot, %{p | ready: false}}
            end)

          state = %{
            state
            | status: :ended,
              tick_timer_ref: nil,
              players: players,
              match_outcome: outcome,
              revision: state.revision + 1
          }

          state = record_and_broadcast_event(state, "match_ended", outcome)
          broadcast_activity_state(state)
          state

        nil ->
          # Broadcast 20 Hz snapshot if interval elapsed
          last_snap = state.last_snapshot_at || 0

          if now - last_snap >= state.snapshot_interval_ms do
            broadcast_activity_state(state)
            %{state | last_snapshot_at: now}
          else
            state
          end
      end

    if state.status == :in_progress do
      tick_ref = Process.send_after(self(), :sim_tick, state.tick_interval_ms)
      {:noreply, %{state | tick_timer_ref: tick_ref}}
    else
      {:noreply, %{state | tick_timer_ref: nil}}
    end
  end

  # Locked countdown completed at its scheduled monotonic instant (D4).
  def handle_info(:countdown_done, %{status: :countdown} = state) do
    cond do
      snowboard?(state) and
          Snowboard.SessionPolicy.start_ready?(state.players, state.activity_def) ->
        {:noreply, begin_snowboard_race(state)}

      snowboard?(state) ->
        # Roster changed mid-countdown: cancel back to the lobby.
        {:noreply, cancel_snowboard_countdown(state)}

      downhill?(state) and
          DownhillMayhem.SessionPolicy.start_locked?(state.players, state.activity_def) ->
        {:noreply, begin_downhill_race(state)}

      downhill?(state) ->
        {:noreply, cancel_downhill_countdown(state)}

      true ->
        {:noreply, state}
    end
  end

  def handle_info(:countdown_done, state), do: {:noreply, state}

  # 180s race cap: unfinished riders are DNF(deadline), then results (D6).
  def handle_info(:race_deadline, %{status: :in_progress} = state) do
    cond do
      snowboard?(state) ->
        sim =
          Enum.reduce(state.sim_state["riders"] || %{}, state.sim_state, fn {slot, rider}, acc ->
            if rider["finishTick"] == nil and rider["dnfReason"] == nil do
              Snowboard.SessionPolicy.dnf(acc, slot, "deadline")
            else
              acc
            end
          end)

        {:noreply, finish_snowboard_race(%{state | sim_state: sim}, "deadline")}

      downhill?(state) ->
        riders =
          Enum.reduce(state.sim_state["riders"] || %{}, state.sim_state["riders"] || %{}, fn
            {slot, rider}, acc ->
              if rider.finished or rider[:dnf_reason] do
                acc
              else
                DownhillMayhem.SessionPolicy.dnf(acc, slot, "deadline")
              end
          end)

        {:noreply,
         finish_downhill_race(
           %{state | sim_state: %{state.sim_state | "riders" => riders}},
           "deadline"
         )}

      true ->
        {:noreply, state}
    end
  end

  def handle_info(:race_deadline, state), do: {:noreply, state}

  # Bounded results retention: release remaining viewers, reap when empty (D4).
  def handle_info(:results_expired, state) do
    if race?(state) do
      state =
        state.player_to_slot
        |> Map.keys()
        |> Enum.reduce(state, fn player_id, acc ->
          case do_leave(player_id, %{"matchId" => acc.match_id}, acc) do
            {:reply, _reply, new_state} -> new_state
            _ -> acc
          end
        end)

      {:noreply, maybe_start_idle_timer(state)}
    else
      {:noreply, state}
    end
  end

  # Timed offer expired: advance to next queued visitor
  def handle_info({:offer_timeout, slot, player_id}, state) do
    case Map.get(state.offers, slot) do
      %{player_id: ^player_id} = offer ->
        Logger.info(
          "Offer for slot #{slot} to #{player_id} expired after #{state.offer_timeout_ms}ms"
        )

        if offer[:channel_pid] && Process.alive?(offer[:channel_pid]) do
          send(
            offer[:channel_pid],
            {:activity_event,
             %{
               "type" => "activity_event",
               "version" => 1,
               "roomId" => wire_room_id(state),
               "roomEpoch" => state.room_epoch,
               "activityId" => state.activity_id,
               "sessionId" => state.session_id,
               "eventId" => "evt_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower),
               "eventType" => "offer_expired",
               "event" => "offer_expired",
               "slot" => slot,
               "data" => %{"slot" => slot},
               "serverNow" => System.system_time(:millisecond)
             }}
          )
        end

        state = %{state | offers: Map.delete(state.offers, slot), revision: state.revision + 1}
        state = maybe_offer_next_slot(state, slot)
        broadcast_activity_state(state)
        {:noreply, state}

      _ ->
        {:noreply, state}
    end
  end

  # Reconnect grace expired (Task 2.3)
  def handle_info({:disconnect_timeout, player_id}, state) do
    case Map.get(state.disconnects, player_id) do
      %{slot: slot} ->
        Logger.info("Reconnect grace expired for player=#{player_id} slot=#{slot}")
        disconnects = Map.delete(state.disconnects, player_id)
        Admission.release(player_id)
        players = Map.delete(state.players, slot)
        player_to_slot = Map.delete(state.player_to_slot, player_id)

        cond do
          snowboard_type(state) in ["drones", "rc-boats"] and state.status == :in_progress ->
            sim =
              if snowboard_type(state) == "drones" do
                Drone.mark_dnf(state.sim_state, slot)
              else
                RcBoat.mark_dnf(state.sim_state, slot)
              end

            state = %{
              state
              | players: players,
                player_to_slot: player_to_slot,
                disconnects: disconnects,
                sim_state: sim,
                revision: state.revision + 1
            }

            if sim["status"] == "complete" do
              winner_slot = sim["winner"]
              winner_player = Map.get(players, winner_slot)

              winner_id =
                if winner_player, do: winner_player.player_id, else: "slot_#{winner_slot}"

              outcome = %{
                "winner" => winner_id,
                "winnerSlot" => winner_slot,
                "reason" => "finish"
              }

              state = record_and_broadcast_event(state, "match_ended", outcome)
              state = %{state | status: :ended, match_outcome: outcome}
              broadcast_activity_state(state)
              {:noreply, maybe_start_idle_timer(state)}
            else
              broadcast_activity_state(state)
              {:noreply, maybe_start_idle_timer(state)}
            end

          snowboard?(state) and state.status == :in_progress ->
            # D4: grace expiry marks DNF(disconnect) ONCE; the race continues
            # for everyone else — no forfeit victory is ever invented. With
            # no rider left able to race, the race aborts instead.
            sim = Snowboard.SessionPolicy.dnf(state.sim_state, slot, "disconnect")

            state = %{
              state
              | players: players,
                player_to_slot: player_to_slot,
                disconnects: disconnects,
                sim_state: sim,
                revision: state.revision + 1
            }

            cond do
              Snowboard.SessionPolicy.race_over?(sim) and
                  Enum.any?(sim["riders"], fn {_s, r} -> r["finishTick"] != nil end) ->
                state = finish_snowboard_race(state, "complete")
                state = maybe_start_idle_timer(state)
                {:noreply, state}

              Snowboard.SessionPolicy.race_over?(sim) ->
                {:noreply, abort_snowboard_race(state, "all_riders_gone")}

              true ->
                broadcast_activity_state(state)

                record_and_broadcast_event(state, "rider_dnf", %{
                  "playerId" => player_id,
                  "reason" => "disconnect"
                })

                state = maybe_start_idle_timer(state)
                {:noreply, state}
            end

          downhill?(state) and state.status == :in_progress ->
            # D14: grace expiry marks DNF(disconnect) ONCE; the race continues
            # for everyone else — no forfeit victory is ever invented. With no
            # rider left able to race, the race aborts instead.
            riders =
              DownhillMayhem.SessionPolicy.dnf(
                state.sim_state["riders"] || %{},
                slot,
                "disconnect"
              )

            sim = %{state.sim_state | "riders" => riders}

            state = %{
              state
              | players: players,
                player_to_slot: player_to_slot,
                disconnects: disconnects,
                sim_state: sim,
                revision: state.revision + 1
            }

            cond do
              DownhillMayhem.SessionPolicy.race_over?(riders) and
                  DownhillMayhem.SessionPolicy.any_finished?(riders) ->
                state = finish_downhill_race(state, "complete")
                state = maybe_start_idle_timer(state)
                {:noreply, state}

              DownhillMayhem.SessionPolicy.race_over?(riders) ->
                {:noreply, abort_downhill_race(state, "all_riders_gone")}

              true ->
                broadcast_activity_state(state)

                record_and_broadcast_event(state, "rider_dnf", %{
                  "playerId" => player_id,
                  "reason" => "disconnect"
                })

                state = maybe_start_idle_timer(state)
                {:noreply, state}
            end

          curling?(state) and state.status in [:in_progress, :paused] ->
            remaining_slots =
              players
              |> Enum.reject(fn {_s, p} -> Map.has_key?(disconnects, p.player_id) end)
              |> Enum.map(fn {s, _} -> s end)

            {sim, event} = Curling.apply_disconnect(state.sim_state, remaining_slots)

            if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)

            state = %{
              state
              | players: players,
                player_to_slot: player_to_slot,
                disconnects: disconnects,
                sim_state: sim,
                tick_timer_ref: nil,
                revision: state.revision + 1
            }

            case event do
              %{"type" => "match_ended", "winner" => winner} ->
                outcome = %{"winnerSlot" => winner, "reason" => "forfeit"}
                state = %{state | status: :ended, match_outcome: outcome}
                state = record_and_broadcast_event(state, "match_ended", outcome)
                broadcast_activity_state(state)
                {:noreply, maybe_start_idle_timer(state)}

              %{"type" => "match_aborted"} ->
                outcome = %{"reason" => "aborted"}
                state = %{state | status: :lobby, match_outcome: outcome}
                state = record_and_broadcast_event(state, "match_aborted", outcome)
                broadcast_activity_state(state)
                {:noreply, maybe_start_idle_timer(state)}

              _ ->
                broadcast_activity_state(state)
                {:noreply, maybe_start_idle_timer(state)}
            end

          state.status in [:in_progress, :paused] ->
            # Connected players are those not in disconnect grace
            connected_players =
              Enum.reject(players, fn {_slot, p} -> Map.has_key?(disconnects, p.player_id) end)

            cond do
              length(connected_players) == 1 ->
                # Exactly one connected player remains -> forfeit win!
                [{_w_slot, winner}] = connected_players

                outcome = %{
                  "winner" => winner.player_id,
                  "loser" => player_id,
                  "reason" => "forfeit"
                }

                if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)

                state = %{
                  state
                  | status: :ended,
                    match_outcome: outcome,
                    players: players,
                    player_to_slot: player_to_slot,
                    disconnects: disconnects,
                    tick_timer_ref: nil
                }

                state = record_and_broadcast_event(state, "match_ended", outcome)
                broadcast_activity_state(state)
                state = maybe_offer_next_slot(state, slot)
                state = maybe_start_idle_timer(state)
                {:noreply, state}

              length(connected_players) == 0 ->
                # With nobody remaining, it SHALL abort (no winner invented)!
                outcome = %{"reason" => "aborted"}

                if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)

                state = %{
                  state
                  | status: :lobby,
                    match_outcome: outcome,
                    players: players,
                    player_to_slot: player_to_slot,
                    disconnects: disconnects,
                    tick_timer_ref: nil
                }

                state = record_and_broadcast_event(state, "match_aborted", outcome)
                broadcast_activity_state(state)
                state = maybe_start_idle_timer(state)
                {:noreply, state}

              true ->
                state = %{
                  state
                  | players: players,
                    player_to_slot: player_to_slot,
                    disconnects: disconnects,
                    revision: state.revision + 1
                }

                broadcast_activity_state(state)
                state = maybe_offer_next_slot(state, slot)
                state = maybe_start_idle_timer(state)
                {:noreply, state}
            end

          true ->
            # Lobby disconnect expired: remove player and advance queue
            state = %{
              state
              | players: players,
                player_to_slot: player_to_slot,
                disconnects: disconnects,
                revision: state.revision + 1
            }

            broadcast_activity_state(state)
            state = maybe_offer_next_slot(state, slot)
            state = maybe_start_idle_timer(state)
            {:noreply, state}
        end

      nil ->
        {:noreply, state}
    end
  end

  # Input watchdog timeout (250ms without fresh control sample)
  def handle_info({:input_watchdog_timeout, player_id}, state) do
    case Map.get(state.player_to_slot, player_id) do
      slot when is_integer(slot) ->
        player = Map.fetch!(state.players, slot)
        # Neutralize input
        player = %{player | input_state: %{}, watchdog_timer_ref: nil}
        players = Map.put(state.players, slot, player)
        {:noreply, %{state | players: players}}

      nil ->
        {:noreply, state}
    end
  end

  # AFK readiness timeout (60s in lobby)
  def handle_info({:ready_timeout, player_id}, state) do
    case Map.get(state.player_to_slot, player_id) do
      slot when is_integer(slot) ->
        player = Map.fetch!(state.players, slot)

        if state.status == :lobby and player.ready do
          Logger.info("AFK readiness expired for #{player_id}")
          player = %{player | ready: false, ready_timer_ref: nil}
          players = Map.put(state.players, slot, player)
          state = %{state | players: players, revision: state.revision + 1}
          broadcast_activity_state(state)
          {:noreply, state}
        else
          {:noreply, state}
        end

      nil ->
        {:noreply, state}
    end
  end

  # Race D4: bounded inactivity release for nonready seated riders.
  def handle_info(:inactivity_check, state) do
    if race?(state) and state.status == :lobby do
      now = System.system_time(:millisecond)

      expired =
        for {_slot, p} <- state.players,
            p.ready == false,
            not Map.has_key?(state.disconnects, p.player_id),
            now - Map.get(p, :last_active_at, p.joined_at) >= state.nonready_inactivity_ms do
          p.player_id
        end

      state =
        Enum.reduce(expired, state, fn player_id, acc ->
          Logger.info("Snowboard inactivity release for player=#{player_id}")

          case do_leave(player_id, %{"matchId" => acc.match_id}, acc) do
            {:reply, _reply, new_state} -> new_state
            _ -> acc
          end
        end)

      state = %{state | inactivity_ref: nil}

      cond do
        state.status == :lobby and map_size(state.players) > 0 and expired == [] ->
          # Window not yet elapsed for the remaining riders: re-check shortly.
          ref = Process.send_after(self(), :inactivity_check, 250)
          {:noreply, %{state | inactivity_ref: ref}}

        true ->
          {:noreply, maybe_start_idle_timer(state)}
      end
    else
      {:noreply, %{state | inactivity_ref: nil}}
    end
  end

  # Idle session reap
  def handle_info(:idle_reap_timeout, state) do
    if empty_session?(state) do
      Logger.info("Reaping idle empty session room=#{state.room_key} act=#{state.activity_id}")
      {:stop, :normal, state}
    else
      {:noreply, %{state | idle_timer_ref: nil}}
    end
  end

  # Pacing fields computed during snapshot broadcast merge back into the
  # session state (broadcasts happen inside command/tick handlers).
  def handle_info({:snowboard_summary_paced, last_summary_at, phase}, state) do
    {:noreply, %{state | last_summary_at: last_summary_at, last_summary_phase: phase}}
  end

  def handle_info(:apply_winner_stays, state) do
    {:noreply, apply_winner_stays_rotation(state)}
  end

  def handle_info(_other, state), do: {:noreply, state}

  @impl true
  def handle_call(:get_session_info, _from, state) do
    reply = %{
      session_id: state.session_id,
      room_key: state.room_key,
      room_epoch: state.room_epoch,
      activity_id: state.activity_id,
      revision: state.revision,
      status: state.status,
      match_id: state.match_id,
      match_outcome: state.match_outcome,
      fenced: state.fenced or (state.ownership_handle != nil and state.ownership_handle.fenced),
      started_at: state.started_at,
      players: state.players,
      player_to_slot: state.player_to_slot,
      queue: state.queue,
      spectators: state.spectators,
      offers: state.offers,
      disconnects: state.disconnects,
      recent_events: state.recent_events,
      sim_state: state.sim_state,
      sim_tick_count: state.sim_tick_count,
      lobby_config: state.lobby_config,
      max_players: state.max_players,
      max_queue: state.max_queue,
      max_spectators: state.max_spectators
    }

    {:reply, reply, state}
  end

  def handle_call(:public_summary, _from, state) do
    {:reply, WinnerStays.public_summary(state), state}
  end

  def handle_call(:get_full_snapshot, _from, state) do
    {:reply, build_full_snapshot(state), state}
  end

  def handle_call({:command, action, payload, ctx}, _from, state) do
    if state.fenced or (state.ownership_handle != nil and state.ownership_handle.fenced) do
      {:reply, {:error, :lease_lost}, state}
    else
      if not Fence.allows_command?(state.ownership_handle) do
        {:reply, {:error, :lease_lost}, state}
      else
        state = touch_player_activity(state, ctx[:player_id])
        result = handle_command(action, payload, ctx, state)

        case result do
          {:reply, reply, new_state} -> {:reply, reply, maybe_arm_inactivity_timer(new_state)}
          other -> other
        end
      end
    end
  end

  # Snowboard D4: any user action refreshes that player's inactivity clock.
  defp touch_player_activity(state, player_id) when is_binary(player_id) do
    case Map.get(state.player_to_slot, player_id) do
      nil ->
        state

      slot ->
        player = Map.get(state.players, slot)

        if player do
          %{
            state
            | players:
                Map.put(
                  state.players,
                  slot,
                  Map.put(player, :last_active_at, System.system_time(:millisecond))
                )
          }
        else
          state
        end
    end
  end

  defp touch_player_activity(state, _player_id), do: state

  # Snowboard D4: nonready seated riders without any user action for the
  # bounded inactivity window are released to the world/watch. Disconnected
  # riders follow the reconnect grace instead of this timer.
  defp maybe_arm_inactivity_timer(%__MODULE__{} = state) do
    if race?(state) and state.status == :lobby and map_size(state.players) > 0 do
      if state.inactivity_ref, do: Process.cancel_timer(state.inactivity_ref)
      ref = Process.send_after(self(), :inactivity_check, state.nonready_inactivity_ms)
      %{state | inactivity_ref: ref}
    else
      state
    end
  end

  def handle_call({:fence!, _reason}, _from, state) do
    {:reply, :ok, %{state | fenced: true}}
  end

  ## Command handlers

  defp handle_command("activity_join", payload, ctx, state) do
    state = maybe_cancel_idle_timer(state)
    role = Map.get(payload, "role", "player")

    Logger.info(
      "activity join enter player=#{ctx[:player_id]} role=#{inspect(role)} act=#{state.activity_id}"
    )

    # The wire protocol (shared/activityProtocol.js) uses play/watch/queue;
    # internal callers and older clients use player/spectator/queue.
    normalized_role =
      case role do
        "play" -> "player"
        "watch" -> "spectator"
        other -> other
      end

    player_id = Map.fetch!(ctx, :player_id)

    # D13: a new human during a locked countdown or a live race never inserts
    # a rider. The existing seated player branch (reconnect) is unaffected.
    if normalized_role == "player" and downhill?(state) and
         state.status in [:countdown, :in_progress] and
         not Map.has_key?(state.player_to_slot, player_id) do
      {:reply, {:error, :race_in_progress}, state}
    else
      do_join(normalized_role, payload, ctx, player_id, state)
    end
  end

  defp handle_command("activity_leave", payload, ctx, state) do
    player_id = Map.fetch!(ctx, :player_id)
    do_leave(player_id, payload, state)
  end

  defp handle_command("activity_ready", payload, ctx, state) do
    ready = Map.get(payload, "ready", true)
    player_id = Map.fetch!(ctx, :player_id)
    do_ready(ready, payload, player_id, ctx, state)
  end

  defp handle_command("activity_input", payload, ctx, state) do
    player_id = Map.fetch!(ctx, :player_id)
    do_input(payload, player_id, ctx, state)
  end

  defp handle_command("activity_resnapshot", payload, ctx, state) do
    client_sess = Map.get(payload, "sessionId")

    cond do
      client_sess != nil and client_sess != state.session_id ->
        {:reply, {:error, :stale_session}, state}

      true ->
        # Downhill delivers its own participant snapshots (projected six-rider
        # field + private self attachment); the generic builder would drop the
        # AI filler slots. Other games keep the historical shape.
        snapshot =
          if downhill?(state) do
            full = DownhillMayhem.Presentation.full_snapshot(state)

            with slot when is_integer(slot) <- Map.get(state.player_to_slot, ctx[:player_id]),
                 %{} = player <- Map.get(state.players, slot) do
              DownhillMayhem.Presentation.attach_self(full, state, player)
            else
              _ -> full
            end
          else
            build_full_snapshot(state)
          end

        {:reply, {:ok, snapshot}, state}
    end
  end

  defp handle_command("activity_config", payload, ctx, state) do
    if downhill?(state) do
      handle_downhill_config(payload, ctx, state)
    else
      {:reply, {:error, :invalid_request}, state}
    end
  end

  defp handle_command(action, _payload, _ctx, state) do
    {:reply, {:ok, %{action: action, session_id: state.session_id, revision: state.revision}},
     state}
  end

  ## Join & Reconnect

  defp do_join("player", _payload, ctx, player_id, state) do
    case Map.get(state.player_to_slot, player_id) do
      # Duplicate tab or reconnect: update connection in place, do not allocate second slot
      # On reconnect: mint a fresh participant lease, reset sequence and unplayed inputs (spec D4)
      slot when is_integer(slot) ->
        player = Map.fetch!(state.players, slot)

        if player[:channel_monitor] do
          Process.demonitor(player.channel_monitor, [:flush])
        end

        mref = if ctx.channel_pid, do: Process.monitor(ctx.channel_pid), else: nil

        # If player was in disconnect grace, cancel disconnect timer!
        disconnects =
          case Map.get(state.disconnects, player_id) do
            nil ->
              state.disconnects

            disc ->
              if disc[:timer_ref], do: Process.cancel_timer(disc.timer_ref)
              Map.delete(state.disconnects, player_id)
          end

        new_lease = generate_lease_id()

        player = %{
          player
          | conn_ref: ctx.conn_ref,
            channel_pid: ctx.channel_pid,
            channel_monitor: mref,
            lease_id: new_lease,
            last_seq: 0,
            input_state: %{}
        }

        players = Map.put(state.players, slot, player)

        # If match was paused and no other player is in disconnect grace, resume!
        {status, state} =
          if state.status == :paused and disconnects == %{} do
            now_mono = System.monotonic_time(:millisecond)
            if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)
            tick_ref = Process.send_after(self(), :sim_tick, state.tick_interval_ms)

            s = %{
              state
              | tick_timer_ref: tick_ref,
                last_tick_at: now_mono,
                last_snapshot_at: now_mono,
                status: :in_progress
            }

            s =
              if curling?(s) do
                {sim, _} = Curling.apply_input(s.sim_state, slot, %{"kind" => "resume"})
                %{s | sim_state: sim}
              else
                s
              end

            s = record_and_broadcast_event(s, "match_resumed", %{})
            {:in_progress, s}
          else
            {state.status, state}
          end

        state = %{state | players: players, disconnects: disconnects, status: status}

        result = %{
          result: "seated",
          role: "player",
          slot: slot,
          leaseId: new_lease,
          lease: new_lease,
          sessionId: state.session_id,
          revision: state.revision,
          status: state.status,
          matchId: state.match_id
        }

        {:reply, {:ok, result}, state}

      nil ->
        free_slot =
          Enum.find(0..(state.max_players - 1), fn s ->
            not Map.has_key?(state.players, s) and not Map.has_key?(state.offers, s)
          end)

        cond do
          is_nil(free_slot) ->
            {:reply, {:error, :activity_full}, state}

          true ->
            case check_proximity(state, player_id, ctx.conn_ref) do
              {:error, reason} ->
                {:reply, {:error, reason}, state}

              :ok ->
                metadata = %{
                  room_key: state.room_key,
                  activity_id: state.activity_id,
                  session_id: state.session_id,
                  slot: free_slot
                }

                case Admission.acquire(player_id, metadata) do
                  {:error, :already_playing} ->
                    {:reply, {:error, :already_playing}, state}

                  {:ok, _} ->
                    now = System.system_time(:millisecond)
                    mref = if ctx.channel_pid, do: Process.monitor(ctx.channel_pid), else: nil
                    lease_id = generate_lease_id()

                    player = %{
                      player_id: player_id,
                      conn_ref: ctx.conn_ref,
                      channel_pid: ctx.channel_pid,
                      channel_monitor: mref,
                      slot: free_slot,
                      lease_id: lease_id,
                      last_seq: 0,
                      ready: false,
                      loaded: false,
                      ready_timer_ref: nil,
                      watchdog_timer_ref: nil,
                      input_state: %{},
                      nickname: Map.get(ctx, :nickname),
                      joined_at: now
                    }

                    players = Map.put(state.players, free_slot, player)
                    player_to_slot = Map.put(state.player_to_slot, player_id, free_slot)
                    queue = Enum.reject(state.queue, &(&1.player_id == player_id))
                    spectators = Map.delete(state.spectators, player_id)

                    state = %{
                      state
                      | players: players,
                        player_to_slot: player_to_slot,
                        queue: queue,
                        spectators: spectators,
                        revision: state.revision + 1
                    }

                    broadcast_activity_state(state)
                    if snowboard?(state), do: snowboard_telemetry(state, :join)

                    Logger.info(
                      "activity join seated player=#{player_id} slot=#{free_slot} act=#{state.activity_id}"
                    )

                    result = %{
                      result: "seated",
                      role: "player",
                      slot: free_slot,
                      leaseId: lease_id,
                      lease: lease_id,
                      sessionId: state.session_id,
                      revision: state.revision,
                      status: state.status,
                      matchId: state.match_id
                    }

                    {:reply, {:ok, result}, state}
                end
            end
        end
    end
  end

  defp do_join("queue", _payload, ctx, player_id, state) do
    cond do
      Map.has_key?(state.player_to_slot, player_id) ->
        {:reply, {:error, :already_seated}, state}

      Enum.any?(state.queue, &(&1.player_id == player_id)) ->
        queue =
          Enum.map(state.queue, fn q ->
            if q.player_id == player_id,
              do: %{q | conn_ref: ctx.conn_ref, channel_pid: ctx.channel_pid},
              else: q
          end)

        pos = Enum.find_index(queue, &(&1.player_id == player_id)) + 1
        state = %{state | queue: queue}

        {:reply,
         {:ok, %{result: "queued", role: "queue", position: pos, revision: state.revision}},
         state}

      length(state.queue) >= state.max_queue ->
        {:reply, {:error, :queue_full}, state}

      true ->
        entry = %{
          player_id: player_id,
          conn_ref: ctx.conn_ref,
          channel_pid: ctx.channel_pid,
          queued_at: System.system_time(:millisecond)
        }

        queue = state.queue ++ [entry]
        pos = length(queue)
        state = %{state | queue: queue, revision: state.revision + 1}
        broadcast_activity_state(state)

        {:reply,
         {:ok, %{result: "queued", role: "queue", position: pos, revision: state.revision}},
         state}
    end
  end

  defp do_join("spectator", _payload, ctx, player_id, state) do
    cond do
      Map.has_key?(state.player_to_slot, player_id) ->
        {:reply, {:error, :already_seated}, state}

      not Map.has_key?(state.spectators, player_id) and
          map_size(state.spectators) >= state.max_spectators ->
        {:reply, {:error, :spectators_full}, state}

      true ->
        entry = %{
          conn_ref: ctx.conn_ref,
          channel_pid: ctx.channel_pid,
          joined_at: System.system_time(:millisecond)
        }

        spectators = Map.put(state.spectators, player_id, entry)
        state = %{state | spectators: spectators, revision: state.revision + 1}
        {:reply, {:ok, %{result: "watching", role: "spectator", revision: state.revision}}, state}
    end
  end

  defp do_join(_other_role, _payload, _ctx, _player_id, state) do
    {:reply, {:error, :invalid_role}, state}
  end

  ## Leave Logic

  defp do_leave(player_id, payload, state) do
    cond do
      race?(state) and Map.has_key?(state.player_to_slot, player_id) and
          race_match_fence(state, payload) == :stale ->
        {:reply, {:error, :stale_match}, state}

      Map.has_key?(state.player_to_slot, player_id) ->
        slot = Map.fetch!(state.player_to_slot, player_id)
        player = Map.fetch!(state.players, slot)

        if player[:channel_monitor], do: Process.demonitor(player.channel_monitor, [:flush])
        if player[:ready_timer_ref], do: Process.cancel_timer(player.ready_timer_ref)
        if player[:watchdog_timer_ref], do: Process.cancel_timer(player.watchdog_timer_ref)

        Admission.release(player_id)
        players = Map.delete(state.players, slot)
        player_to_slot = Map.delete(state.player_to_slot, player_id)

        # If in an active match, explicit leave is an immediate forfeit!
        state =
          cond do
            snowboard?(state) and state.status == :countdown ->
              cancel_snowboard_countdown(state)

            downhill?(state) and state.status == :countdown ->
              cancel_downhill_countdown(state)

            snowboard?(state) and state.status == :in_progress ->
              snowboard_telemetry(state, :leave, %{}, %{reason: "exit"})
              leave_racing_snowboard(state, slot, player_id)

            downhill?(state) and state.status == :in_progress ->
              downhill_telemetry(state, :leave, %{}, %{reason: "exit"})
              leave_racing_downhill(state, slot, player_id)

            snowboard_type(state) in ["drones", "rc-boats"] and state.status == :in_progress ->
              sim =
                if snowboard_type(state) == "drones" do
                  Drone.mark_dnf(state.sim_state, slot)
                else
                  RcBoat.mark_dnf(state.sim_state, slot)
                end

              if sim["status"] == "complete" do
                winner_slot = sim["winner"]
                winner_player = Map.get(players, winner_slot)

                winner_id =
                  if winner_player, do: winner_player.player_id, else: "slot_#{winner_slot}"

                outcome = %{
                  "winner" => winner_id,
                  "winnerSlot" => winner_slot,
                  "reason" => "finish"
                }

                broadcast_activity_event(state, "match_ended", outcome)
                %{state | sim_state: sim, status: :ended, match_outcome: outcome}
              else
                %{state | sim_state: sim}
              end

            state.status in [:in_progress, :paused] ->
              remaining = map_size(players)

              if remaining == 1 do
                [{_w_slot, winner}] = Map.to_list(players)

                outcome = %{
                  "winner" => winner.player_id,
                  "loser" => player_id,
                  "reason" => "forfeit"
                }

                broadcast_activity_event(state, "match_ended", outcome)
                %{state | status: :ended, match_outcome: outcome}
              else
                outcome = %{"reason" => "aborted"}
                broadcast_activity_event(state, "match_aborted", outcome)
                %{state | status: :lobby, match_outcome: outcome}
              end

            true ->
              state
          end

        state = %{
          state
          | players: players,
            player_to_slot: player_to_slot,
            revision: state.revision + 1
        }

        state = maybe_offer_next_slot(state, slot)
        state = maybe_vacate_after_winner_leave(state, player_id)
        state = maybe_start_idle_timer(state)
        broadcast_activity_state(state)
        {:reply, {:ok, %{result: "left", role: "player", revision: state.revision}}, state}

      Enum.any?(state.queue, &(&1.player_id == player_id)) ->
        queue = Enum.reject(state.queue, &(&1.player_id == player_id))
        state = %{state | queue: queue, revision: state.revision + 1}
        broadcast_activity_state(state)
        state = maybe_start_idle_timer(state)
        {:reply, {:ok, %{result: "left", role: "queue", revision: state.revision}}, state}

      Map.has_key?(state.spectators, player_id) ->
        spectators = Map.delete(state.spectators, player_id)
        state = %{state | spectators: spectators, revision: state.revision + 1}
        state = maybe_start_idle_timer(state)
        {:reply, {:ok, %{result: "left", role: "spectator", revision: state.revision}}, state}

      Enum.any?(state.offers, fn {_s, o} -> o.player_id == player_id end) ->
        offer_slot =
          Enum.find_value(state.offers, fn {s, o} ->
            if o.player_id == player_id, do: s, else: nil
          end)

        state = cancel_and_advance_offer(state, offer_slot)
        state = maybe_start_idle_timer(state)
        {:reply, {:ok, %{result: "left", role: "offered", revision: state.revision}}, state}

      true ->
        {:reply, {:ok, %{result: "left", revision: state.revision}}, state}
    end
  end

  # D4: an active racer leaving marks DNF(leave) once and releases the lease
  # immediately; results remain for the others. A lone rider may still finish
  # validly; nobody left -> abort.
  defp leave_racing_snowboard(state, slot, player_id) do
    sim = Snowboard.SessionPolicy.dnf(state.sim_state, slot, "leave")
    state = %{state | sim_state: sim}

    record_and_broadcast_event(state, "rider_dnf", %{"playerId" => player_id, "reason" => "leave"})

    cond do
      Snowboard.SessionPolicy.race_over?(sim) and
          Enum.any?(sim["riders"], fn {_s, r} -> r["finishTick"] != nil end) ->
        finish_snowboard_race(state, "complete")

      Snowboard.SessionPolicy.race_over?(sim) ->
        abort_snowboard_race(state, "all_riders_gone")

      true ->
        state
    end
  end

  # D14: an active downhill racer leaving marks DNF(leave) once and releases
  # the lease immediately; results remain for the others. A lone rider may
  # still finish validly; nobody left -> abort.
  defp leave_racing_downhill(state, slot, player_id) do
    riders = DownhillMayhem.SessionPolicy.dnf(state.sim_state["riders"] || %{}, slot, "leave")
    sim = %{state.sim_state | "riders" => riders}
    state = %{state | sim_state: sim}

    record_and_broadcast_event(state, "rider_dnf", %{"playerId" => player_id, "reason" => "leave"})

    cond do
      DownhillMayhem.SessionPolicy.race_over?(riders) and
          DownhillMayhem.SessionPolicy.any_finished?(riders) ->
        finish_downhill_race(state, "complete")

      DownhillMayhem.SessionPolicy.race_over?(riders) ->
        abort_downhill_race(state, "all_riders_gone")

      true ->
        state
    end
  end

  ## Ready Logic

  defp do_ready(ready, payload, player_id, ctx, state) do
    case Enum.find(state.offers, fn {_s, o} -> o.player_id == player_id end) do
      {slot, offer} ->
        if ready do
          # D7: queue acceptance signs the current match too — a stale
          # acceptance never seats anyone into a newer race.
          if race?(state) and race_match_fence(state, payload) == :stale do
            {:reply, {:error, :stale_match}, state}
          else
            :continue
          end
        else
          :continue
        end
        |> case do
          :continue ->
            do_ready_offer(ready, player_id, ctx, state, slot, offer)

          rejection ->
            rejection
        end

      nil ->
        do_ready_seated_lookup(ready, payload, player_id, ctx, state)
    end
  end

  defp do_ready_offer(ready, player_id, ctx, state, slot, offer) do
    if ready do
      promote_queued_rider(player_id, ctx, state, slot, offer)
    else
      decline_queued_offer(state, slot, offer)
    end
  end

  defp promote_queued_rider(player_id, ctx, state, slot, offer) do
    case recheck_member_and_proximity(state, player_id, ctx.conn_ref) do
      :ok ->
        if offer[:timer_ref], do: Process.cancel_timer(offer.timer_ref)
        offers = Map.delete(state.offers, slot)

        metadata = %{
          room_key: state.room_key,
          activity_id: state.activity_id,
          session_id: state.session_id,
          slot: slot
        }

        case Admission.acquire(player_id, metadata) do
          {:ok, _} ->
            now = System.system_time(:millisecond)
            mref = if ctx.channel_pid, do: Process.monitor(ctx.channel_pid), else: nil
            lease_id = generate_lease_id()

            player = %{
              player_id: player_id,
              conn_ref: ctx.conn_ref,
              channel_pid: ctx.channel_pid,
              channel_monitor: mref,
              slot: slot,
              lease_id: lease_id,
              last_seq: 0,
              # D13: a promoted downhill rider replaces an AI slot and
              # begins unready; snowboard keeps its auto-ready promotion.
              ready: not downhill?(state),
              loaded: false,
              ready_timer_ref: nil,
              watchdog_timer_ref: nil,
              input_state: %{},
              nickname: Map.get(ctx, :nickname),
              joined_at: now
            }

            players = Map.put(state.players, slot, player)
            player_to_slot = Map.put(state.player_to_slot, player_id, slot)

            state = %{
              state
              | players: players,
                player_to_slot: player_to_slot,
                offers: offers,
                revision: state.revision + 1
            }

            state = maybe_start_match(state)
            broadcast_activity_state(state)

            reply = %{
              result: "accepted_offer",
              slot: slot,
              ready: not downhill?(state),
              leaseId: lease_id,
              lease: lease_id,
              sessionId: state.session_id,
              status: state.status,
              revision: state.revision
            }

            {:reply, {:ok, reply}, state}

          {:error, :already_playing} ->
            expire_offer(state, slot, offer, {:reply, {:error, :already_playing}, state})

          {:error, reason} ->
            expire_offer(state, slot, offer, {:reply, {:error, reason}, state})
        end
    end
  end

  defp decline_queued_offer(state, slot, offer) do
    expire_offer(
      state,
      slot,
      offer,
      {:reply, {:ok, %{result: "declined_offer", slot: slot, revision: state.revision}}, state}
    )
  end

  # Cancels the offer timer, drops the offer and advances the FIFO queue.
  defp expire_offer(state, slot, offer, reply) do
    if offer[:timer_ref], do: Process.cancel_timer(offer.timer_ref)
    state = %{state | offers: Map.delete(state.offers, slot)}
    state = maybe_offer_next_slot(state, slot)
    reply
  end

  defp do_ready_seated_lookup(ready, payload, player_id, ctx, state) do
    case Map.get(state.player_to_slot, player_id) do
      nil ->
        {:reply, {:error, :not_seated}, state}

      slot ->
        player = Map.fetch!(state.players, slot)

        # Snowboard explicit readiness (D4/D7): no auto-ready, the course
        # handshake must be complete, and unreading during the locked
        # countdown cancels it for everyone. A ready signed for an older
        # match never touches the current one.
        cond do
          race?(state) and race_match_fence(state, payload) == :stale ->
            {:reply, {:error, :stale_match}, state}

          race?(state) and race_match_fence(state, payload) == :missing ->
            {:reply, {:error, :invalid_request}, state}

          race?(state) and ready and not Map.get(player, :loaded, false) ->
            {:reply, {:error, :not_loaded}, state}

          snowboard?(state) and state.status == :countdown and not ready ->
            state = cancel_snowboard_countdown(state)

            {:reply,
             {:ok,
              %{
                result: "ready",
                slot: slot,
                ready: false,
                status: state.status,
                revision: state.revision
              }}, state}

          downhill?(state) and state.status == :countdown and not ready ->
            state = cancel_downhill_countdown(state)

            {:reply,
             {:ok,
              %{
                result: "ready",
                slot: slot,
                ready: false,
                status: state.status,
                revision: state.revision
              }}, state}

          true ->
            state = update_lobby_config(state, payload)
            do_ready_seated(ready, player_id, slot, player, ctx, state)
        end
    end
  end

  defp update_lobby_config(state, payload) when is_map(payload) do
    if state.status == :lobby do
      cfg = state.lobby_config || %{}

      cfg =
        case Map.get(payload, "seriesLength") || Map.get(payload, "series") do
          len when len in [1, 3, 5, 7] -> Map.put(cfg, "seriesLength", len)
          _ -> cfg
        end

      cfg =
        case Map.get(payload, "winnerStays") do
          flag when is_boolean(flag) -> Map.put(cfg, "winnerStays", flag)
          _ -> cfg
        end

      %{state | lobby_config: cfg}
    else
      state
    end
  end

  defp update_lobby_config(state, _), do: state

  # Seated ready transition shared by the generic and snowboard flows.
  defp do_ready_seated(ready, player_id, slot, player, _ctx, state) do
    # Idempotent ready retry (spec D4)
    if player.ready == ready do
      reply = %{
        result: "ready",
        slot: slot,
        ready: ready,
        status: state.status,
        revision: state.revision
      }

      {:reply, {:ok, reply}, state}
    else
      if player[:ready_timer_ref] do
        Process.cancel_timer(player.ready_timer_ref)
      end

      # AFK ready timeout (expires after 60s if match does not start)
      ready_timer_ref =
        if ready and state.status == :lobby do
          Process.send_after(self(), {:ready_timeout, player_id}, state.ready_timeout_ms)
        else
          nil
        end

      player = %{player | ready: ready, ready_timer_ref: ready_timer_ref}
      players = Map.put(state.players, slot, player)
      state = %{state | players: players, revision: state.revision + 1}
      state = maybe_start_match(state)
      broadcast_activity_state(state)

      reply = %{
        result: "ready",
        slot: slot,
        ready: ready,
        status: state.status,
        revision: state.revision
      }

      {:reply, {:ok, reply}, state}
    end
  end

  ## Input handling (Tasks 2.3 & 2.4)
  # Validates participant lease, monotonic seq, canonical authority, bounded mailbox, and watchdog

  defp do_input(payload, player_id, _ctx, state) do
    # 1. Check mailbox overload (drop obsolete inputs if queue > 100)
    {:message_queue_len, qlen} = Process.info(self(), :message_queue_len)

    if qlen > 100 do
      Logger.warning(
        "Activity #{state.activity_id} session queue overloaded (#{qlen}), dropping input"
      )

      {:reply, {:error, :input_dropped}, state}
    else
      # 2. Check stale session or stale epoch if present in payload
      client_sess = Map.get(payload, "sessionId")
      client_epoch = Map.get(payload, "roomEpoch")

      cond do
        client_sess != nil and client_sess != state.session_id ->
          {:reply, {:error, :stale_session}, state}

        client_epoch != nil and client_epoch != state.room_epoch ->
          {:reply, {:error, :stale_epoch}, state}

        race?(state) and race_match_fence(state, payload) == :stale ->
          {:reply, {:error, :stale_match}, state}

        race?(state) and race_match_fence(state, payload) == :missing ->
          {:reply, {:error, :invalid_request}, state}

        true ->
          case Map.get(state.player_to_slot, player_id) do
            nil ->
              {:reply, {:error, :not_seated}, state}

            slot ->
              player = Map.fetch!(state.players, slot)
              client_lease = Map.get(payload, "lease") || Map.get(payload, "leaseId")

              cond do
                is_nil(client_lease) or client_lease != player.lease_id ->
                  {:reply, {:error, :invalid_participant_lease}, state}

                true ->
                  seq = Map.get(payload, "seq") || Map.get(payload, "sequence")

                  cond do
                    is_nil(seq) or not is_integer(seq) or seq < 0 ->
                      {:reply, {:error, :invalid_sequence}, state}

                    seq <= Map.get(player, :last_seq, 0) ->
                      {:reply, {:error, :stale_sequence}, state}

                    true ->
                      controls = Map.get(payload, "controls") || Map.get(payload, "input") || %{}

                      cond do
                        not valid_controls?(controls) ->
                          {:reply, {:error, :invalid_input}, state}

                        downhill?(state) and not valid_downhill_controls?(controls) ->
                          {:reply, {:error, :invalid_input}, state}

                        # D7 load handshake: accepted in lobby/results or on
                        # reconnect, only with the exact server course hash.
                        snowboard?(state) and Map.get(controls, "kind") == "loaded" ->
                          accept_snowboard_loaded(state, player, slot, seq, controls)

                        snowboard?(state) and
                            Map.get(controls, "kind") not in [nil, "ride", "neutral"] ->
                          {:reply, {:error, :invalid_input}, state}

                        downhill?(state) and Map.get(controls, "kind") == "loaded" ->
                          accept_downhill_loaded(state, player, slot, seq, controls)

                        downhill?(state) and
                            Map.get(controls, "kind") not in [nil, "ride", "neutral"] ->
                          {:reply, {:error, :invalid_input}, state}

                        pool?(state) ->
                          handle_pool_input(state, player, slot, seq, controls)

                        chess?(state) ->
                          handle_chess_input(state, player, slot, seq, controls)

                        true ->
                          # Cancel previous watchdog timer if present
                          if player[:watchdog_timer_ref] do
                            Process.cancel_timer(player.watchdog_timer_ref)
                          end

                          # Reset watchdog timer (250ms)
                          watchdog_ref =
                            if state.input_watchdog_ms > 0 do
                              Process.send_after(
                                self(),
                                {:input_watchdog_timeout, player_id},
                                state.input_watchdog_ms
                              )
                            else
                              nil
                            end

                          player = %{
                            player
                            | last_seq: seq,
                              input_state: controls,
                              watchdog_timer_ref: watchdog_ref
                          }

                          players = Map.put(state.players, slot, player)
                          state = %{state | players: players}

                          reply = %{
                            result: "input_accepted",
                            ackSeq: seq,
                            seq: seq,
                            revision: state.revision
                          }

                          {:reply, {:ok, reply}, state}
                      end
                  end
              end
          end
      end
    end
  end

  ## Disconnect handling

  defp handle_player_disconnect(player, reason, state) do
    player_id = player.player_id
    slot = player.slot

    Logger.info(
      "Player #{player_id} channel disconnected (slot #{slot}) reason=#{inspect(reason)}"
    )

    if player[:channel_monitor] do
      Process.demonitor(player.channel_monitor, [:flush])
    end

    player = %{player | channel_pid: nil, channel_monitor: nil}
    players = Map.put(state.players, slot, player)

    # Start 30-second disconnect grace timer
    timer_ref =
      Process.send_after(self(), {:disconnect_timeout, player_id}, state.reconnect_grace_ms)

    disc = %{
      slot: slot,
      timer_ref: timer_ref,
      disconnected_at: System.system_time(:millisecond)
    }

    disconnects = Map.put(state.disconnects, player_id, disc)

    # Snowboard (D4): a race NEVER pauses for a disconnect. The absent rider
    # freezes at its last valid state (the policy skips them while stepping)
    # and the timer keeps running; grace expiry marks the DNF. In the lobby
    # or countdown a disconnecting locker cancels the countdown.
    {status, state} =
      cond do
        snowboard?(state) and state.status == :countdown ->
          {:lobby, cancel_snowboard_countdown(state)}

        snowboard?(state) ->
          {state.status, state}

        downhill?(state) and state.status == :countdown ->
          {:lobby, cancel_downhill_countdown(state)}

        downhill?(state) ->
          {state.status, state}

        curling?(state) and state.status == :in_progress ->
          if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)
          {sim, _} = Curling.apply_input(state.sim_state, slot, %{"kind" => "pause"})

          s = %{state | tick_timer_ref: nil, sim_state: sim}

          s =
            record_and_broadcast_event(s, "match_paused", %{
              "disconnectedPlayer" => player_id,
              "graceMs" => state.reconnect_grace_ms
            })

          {:paused, s}

        state.status == :in_progress ->
          if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)
          s = %{state | tick_timer_ref: nil}

          s =
            record_and_broadcast_event(s, "match_paused", %{
              "disconnectedPlayer" => player_id,
              "graceMs" => state.reconnect_grace_ms
            })

          {:paused, s}

        true ->
          {state.status, state}
      end

    state = %{
      state
      | players: players,
        disconnects: disconnects,
        status: status
    }

    broadcast_activity_state(state)
    {:noreply, state}
  end

  defp purge_disconnected_channel(state, pid) do
    queue = Enum.reject(state.queue, &(&1.channel_pid == pid))

    spectators =
      Enum.reject(state.spectators, fn {_id, s} -> s.channel_pid == pid end) |> Map.new()

    offers =
      Enum.reject(state.offers, fn {_slot, o} ->
        if o.channel_pid == pid do
          if o[:timer_ref], do: Process.cancel_timer(o.timer_ref)
          true
        else
          false
        end
      end)
      |> Map.new()

    %{state | queue: queue, spectators: spectators, offers: offers}
  end

  defp find_player_by_monitor(state, ref) do
    case Enum.find(state.players, fn {_s, p} -> p[:channel_monitor] == ref end) do
      {_slot, player} -> {:player, player}
      nil -> :not_found
    end
  end

  ## Idle Reaping Helpers

  defp empty_session?(state) do
    state.players == %{} and state.queue == [] and state.spectators == %{} and
      state.offers == %{} and state.disconnects == %{}
  end

  defp maybe_start_idle_timer(state) do
    if empty_session?(state) and is_nil(state.idle_timer_ref) do
      ref = Process.send_after(self(), :idle_reap_timeout, state.idle_reap_ms)
      %{state | idle_timer_ref: ref}
    else
      state
    end
  end

  defp maybe_cancel_idle_timer(state) do
    if state.idle_timer_ref do
      Process.cancel_timer(state.idle_timer_ref)
      %{state | idle_timer_ref: nil}
    else
      state
    end
  end

  ## General Helpers

  defp maybe_start_match(state) do
    cond do
      snowboard?(state) and state.status in [:lobby, :ended] and
          Snowboard.SessionPolicy.start_ready?(state.players, state.activity_def) ->
        # D4: all seated connected riders ready with count >= minPlayers locks
        # the roster and schedules ONE three-second countdown. In results this
        # is the rematch vote — a user action that cancels the bounded
        # results-retention timer. The match identity rotates at GO.
        if state.countdown_ref, do: Process.cancel_timer(state.countdown_ref)
        if state.results_ref, do: Process.cancel_timer(state.results_ref)

        ref = Process.send_after(self(), :countdown_done, state.countdown_ms)
        start_at = System.system_time(:millisecond) + state.countdown_ms

        players =
          Map.new(state.players, fn {s, p} ->
            {s, %{p | ready_timer_ref: clear_ready_timer(p)}}
          end)

        state = %{
          state
          | players: players,
            status: :countdown,
            countdown_ref: ref
        }

        state = record_and_broadcast_event(state, "countdown", %{"startAt" => start_at})
        broadcast_activity_state(state)
        state

      downhill?(state) and state.status in [:lobby, :ended] and
          DownhillMayhem.SessionPolicy.start_locked?(state.players, state.activity_def) ->
        # D12: all seated connected humans ready with at least one locks a
        # frozen six-rider field (humans + deterministic AI) and schedules ONE
        # three-second countdown. In results this is the rematch vote. The
        # match identity rotates at GO.
        if state.countdown_ref, do: Process.cancel_timer(state.countdown_ref)
        if state.results_ref, do: Process.cancel_timer(state.results_ref)

        ref = Process.send_after(self(), :countdown_done, state.countdown_ms)
        start_at = System.system_time(:millisecond) + state.countdown_ms
        field = DownhillMayhem.SessionPolicy.lock_field(state.players)

        players =
          Map.new(state.players, fn {s, p} ->
            {s, %{p | ready_timer_ref: clear_ready_timer(p)}}
          end)

        state = %{
          state
          | players: players,
            status: :countdown,
            countdown_ref: ref,
            locked_field: field,
            start_at: start_at,
            match_outcome: nil,
            revision: state.revision + 1
        }

        state =
          record_and_broadcast_event(state, "countdown", %{
            "startAt" => start_at,
            "matchId" => state.match_id
          })

        broadcast_activity_state(state)
        state

      not race?(state) and map_size(state.players) == state.max_players and
        Enum.all?(state.players, fn {_slot, p} -> p.ready end) and
          state.status != :in_progress ->
        start_race(state)

      true ->
        state
    end
  end

  defp clear_ready_timer(player) do
    if player[:ready_timer_ref] do
      Process.cancel_timer(player.ready_timer_ref)
      nil
    else
      player[:ready_timer_ref]
    end
  end

  # Generic full-capacity start (Pong/solo and prior behavior, unchanged).
  defp start_race(state) do
    match_id = "match_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)

    # Cancel ready timers since match has started
    players =
      Map.new(state.players, fn {s, p} ->
        if p[:ready_timer_ref], do: Process.cancel_timer(p.ready_timer_ref)
        {s, %{p | ready_timer_ref: nil, input_state: %{}}}
      end)

    if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)
    now_mono = System.monotonic_time(:millisecond)
    tick_ref = Process.send_after(self(), :sim_tick, state.tick_interval_ms)

    act_type = snowboard_type(state)
    sim_opts = extract_sim_opts(state)
    sim_state = init_simulation(act_type, sim_opts)

    env_policy = (state.activity_def && state.activity_def["environmentPolicy"]) || "none"

    environment =
      if env_policy in ["frozen", :frozen] do
        Environment.resolve(wire_room_id(state), "frozen", System.system_time(:millisecond))
      else
        state.environment
      end

    state = %{
      state
      | players: players,
        status: :in_progress,
        match_id: match_id,
        match_outcome: nil,
        winner_stays_applied: false,
        environment: environment,
        sim_state: sim_state,
        tick_timer_ref: tick_ref,
        last_tick_at: now_mono,
        last_snapshot_at: now_mono,
        sim_tick_count: 0
    }

    state = record_and_broadcast_event(state, "match_started", %{"matchId" => match_id})
    broadcast_activity_state(state)
    state
  end

  # GO: rotate the match identity, reset race simulation, start ticking (D4).
  defp begin_snowboard_race(%__MODULE__{} = state) do
    match_id = "match_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)

    players =
      Map.new(state.players, fn {s, p} ->
        if p[:ready_timer_ref], do: Process.cancel_timer(p.ready_timer_ref)
        # Pre-start inputs update held-state only; motion begins at GO.
        {s, %{p | ready_timer_ref: nil}}
      end)

    sim_state = Snowboard.SessionPolicy.init_sim(players)
    now_mono = System.monotonic_time(:millisecond)
    tick_ref = Process.send_after(self(), :sim_tick, state.tick_interval_ms)
    deadline_ref = Process.send_after(self(), :race_deadline, state.race_deadline_ms)

    env_policy = (state.activity_def && state.activity_def["environmentPolicy"]) || "none"

    environment =
      if env_policy in ["frozen", :frozen] do
        Environment.resolve(wire_room_id(state), "frozen", System.system_time(:millisecond))
      else
        state.environment
      end

    state = %{
      state
      | players: players,
        status: :in_progress,
        match_id: match_id,
        match_outcome: nil,
        environment: environment,
        sim_state: sim_state,
        tick_timer_ref: tick_ref,
        deadline_ref: deadline_ref,
        countdown_ref: nil,
        last_tick_at: now_mono,
        last_snapshot_at: now_mono,
        sim_tick_count: 0
    }

    state = record_and_broadcast_event(state, "match_started", %{"matchId" => match_id})
    broadcast_activity_state(state)
    snowboard_telemetry(state, :start)
    state
  end

  # Race over: session-local results, no winner/loser invention (D4/D6).
  defp finish_snowboard_race(%__MODULE__{} = state, reason) do
    if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)
    if state.deadline_ref, do: Process.cancel_timer(state.deadline_ref)

    standings = Snowboard.SessionPolicy.standings(state.sim_state, state.players)

    outcome = %{
      "kind" => "snowboard_race",
      "recordingStatus" => "session_only",
      "reason" => reason,
      "matchId" => state.match_id,
      "standings" => standings
    }

    players = Map.new(state.players, fn {s, p} -> {s, %{p | ready: false}} end)

    state = %{
      state
      | status: :ended,
        match_outcome: outcome,
        players: players,
        tick_timer_ref: nil,
        deadline_ref: nil,
        revision: state.revision + 1
    }

    state = record_and_broadcast_event(state, "match_ended", outcome)
    broadcast_activity_state(state)
    finished = Enum.count(standings, &(&1["status"] == "finished"))
    snowboard_telemetry(state, :finish, %{finished: finished}, %{reason: reason})

    # Results display is retained without user action for a bounded window,
    # then remaining viewers are released and the session may reap (D4).
    results_ref = Process.send_after(self(), :results_expired, state.results_retention_ms)
    %{state | results_ref: results_ref}
  end

  # Abort a transient race: no winner, no completed result (D4).
  defp abort_snowboard_race(%__MODULE__{} = state, reason) do
    if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)
    if state.deadline_ref, do: Process.cancel_timer(state.deadline_ref)
    if state.countdown_ref, do: Process.cancel_timer(state.countdown_ref)

    outcome = %{
      "reason" => reason,
      "kind" => "snowboard_race",
      "recordingStatus" => "session_only"
    }

    players = Map.new(state.players, fn {s, p} -> {s, %{p | ready: false}} end)

    state = %{
      state
      | status: :lobby,
        match_outcome: outcome,
        players: players,
        tick_timer_ref: nil,
        deadline_ref: nil,
        countdown_ref: nil,
        revision: state.revision + 1
    }

    state = record_and_broadcast_event(state, "race_aborted", outcome)
    broadcast_activity_state(state)
    snowboard_telemetry(state, :abort, %{}, %{reason: reason})
    maybe_start_idle_timer(state)
  end

  # Locked-countdown cancellation: roster unlock, ALL readiness cleared (D4).
  defp cancel_snowboard_countdown(%__MODULE__{} = state) do
    if state.countdown_ref, do: Process.cancel_timer(state.countdown_ref)

    players =
      Map.new(state.players, fn {s, p} ->
        if p[:ready_timer_ref], do: Process.cancel_timer(p.ready_timer_ref)
        {s, %{p | ready: false, ready_timer_ref: nil}}
      end)

    state = %{
      state
      | status: :lobby,
        countdown_ref: nil,
        players: players,
        revision: state.revision + 1
    }

    broadcast_activity_state(state)
    state
  end

  # --- Downhill Mayhem lifecycle (integrate-multiplayer-downhill-mayhem-arcade 8.6) ---

  # GO: rotate the match identity, initialise the locked six-rider field from
  # the frozen course, start ticking and arm the 180 s race deadline (D12).
  defp begin_downhill_race(%__MODULE__{} = state) do
    case downhill_course(state) do
      {:ok, course} ->
        match_id = generate_match_id()
        field = state.locked_field || DownhillMayhem.SessionPolicy.lock_field(state.players)
        difficulty = downhill_difficulty(state)
        seed = :erlang.phash2(match_id)
        sim_state = DownhillMayhem.SessionPolicy.init_sim(course, field, difficulty, seed)

        players =
          Map.new(state.players, fn {s, p} ->
            if p[:ready_timer_ref], do: Process.cancel_timer(p.ready_timer_ref)
            {s, %{p | ready_timer_ref: nil, input_state: %{}}}
          end)

        now_mono = System.monotonic_time(:millisecond)
        tick_ref = Process.send_after(self(), :sim_tick, state.tick_interval_ms)
        deadline_ref = Process.send_after(self(), :race_deadline, state.race_deadline_ms)
        deadline_at = System.system_time(:millisecond) + state.race_deadline_ms

        state = %{
          state
          | players: players,
            status: :in_progress,
            match_id: match_id,
            match_outcome: nil,
            sim_state: sim_state,
            race_course: course,
            tick_timer_ref: tick_ref,
            deadline_ref: deadline_ref,
            countdown_ref: nil,
            race_started_at: now_mono,
            deadline_at: deadline_at,
            last_tick_at: now_mono,
            last_snapshot_at: now_mono,
            sim_tick_count: 0
        }

        state = record_and_broadcast_event(state, "match_started", %{"matchId" => match_id})
        broadcast_activity_state(state)
        downhill_telemetry(state, :start)
        state

      {:error, reason} ->
        state = %{
          state
          | status: :lobby,
            countdown_ref: nil,
            locked_field: nil,
            race_course: nil,
            players: Map.new(state.players, fn {s, p} -> {s, %{p | ready: false}} end),
            revision: state.revision + 1
        }

        state =
          record_and_broadcast_event(state, "race_aborted", %{
            "reason" => to_string(reason),
            "kind" => "downhill_race"
          })

        broadcast_activity_state(state)
        downhill_telemetry(state, :abort, %{}, %{reason: "course_unavailable"})
        state
    end
  end

  # Race over: session-local six-rider results, no winner/loser invention (D15).
  defp finish_downhill_race(%__MODULE__{} = state, reason) do
    if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)
    if state.deadline_ref, do: Process.cancel_timer(state.deadline_ref)

    standings = DownhillMayhem.SessionPolicy.standings(state.sim_state, state.players)

    outcome = %{
      "kind" => "downhill_race",
      "recordingStatus" => "session_only",
      "reason" => reason,
      "matchId" => state.match_id,
      "mountain" => downhill_mountain(state),
      "difficulty" => downhill_difficulty(state),
      "standings" => standings
    }

    players = Map.new(state.players, fn {s, p} -> {s, %{p | ready: false}} end)

    state = %{
      state
      | status: :ended,
        match_outcome: outcome,
        players: players,
        tick_timer_ref: nil,
        deadline_ref: nil,
        revision: state.revision + 1
    }

    state = record_and_broadcast_event(state, "match_ended", outcome)
    broadcast_activity_state(state)
    finished = Enum.count(standings, &(&1.status == "finished"))
    downhill_telemetry(state, :finish, %{finished: finished}, %{reason: reason})

    results_ref = Process.send_after(self(), :results_expired, state.results_retention_ms)
    %{state | results_ref: results_ref}
  end

  # Abort a transient race: no winner, no completed result (D14).
  defp abort_downhill_race(%__MODULE__{} = state, reason) do
    if state.tick_timer_ref, do: Process.cancel_timer(state.tick_timer_ref)
    if state.deadline_ref, do: Process.cancel_timer(state.deadline_ref)
    if state.countdown_ref, do: Process.cancel_timer(state.countdown_ref)

    outcome = %{
      "reason" => reason,
      "kind" => "downhill_race",
      "recordingStatus" => "session_only"
    }

    players = Map.new(state.players, fn {s, p} -> {s, %{p | ready: false}} end)

    state = %{
      state
      | status: :lobby,
        match_outcome: outcome,
        players: players,
        tick_timer_ref: nil,
        deadline_ref: nil,
        countdown_ref: nil,
        locked_field: nil,
        race_course: nil,
        revision: state.revision + 1
    }

    state = record_and_broadcast_event(state, "race_aborted", outcome)
    broadcast_activity_state(state)
    downhill_telemetry(state, :abort, %{}, %{reason: reason})
    maybe_start_idle_timer(state)
  end

  # Locked-countdown cancellation: roster unlock, ALL readiness cleared (D12).
  defp cancel_downhill_countdown(%__MODULE__{} = state) do
    if state.countdown_ref, do: Process.cancel_timer(state.countdown_ref)

    players =
      Map.new(state.players, fn {s, p} ->
        if p[:ready_timer_ref], do: Process.cancel_timer(p.ready_timer_ref)
        {s, %{p | ready: false, ready_timer_ref: nil}}
      end)

    state = %{
      state
      | status: :lobby,
        countdown_ref: nil,
        locked_field: nil,
        players: players,
        revision: state.revision + 1
    }

    broadcast_activity_state(state)
    state
  end

  # Captain-only lobby settings while unlocked (D12). Non-captains are
  # rejected with :not_captain; invalid values with :invalid_setting.
  defp handle_downhill_config(payload, ctx, state) do
    player_id = Map.get(ctx, :player_id)

    cond do
      state.status != :lobby ->
        {:reply, {:error, :invalid_request}, state}

      DownhillMayhem.SessionPolicy.captain(state.players) != player_id ->
        {:reply, {:error, :not_captain}, state}

      true ->
        cfg = state.lobby_config || %{}

        mountain =
          Map.get(payload, "mountain", Map.get(payload, :mountain)) || cfg["mountain"] ||
            downhill_mountain(state)

        difficulty =
          Map.get(payload, "difficulty", Map.get(payload, :difficulty)) || cfg["difficulty"] ||
            "mayhem"

        with {:ok, mountain} <- validate_downhill_mountain(mountain),
             {:ok, difficulty} <- validate_downhill_difficulty(difficulty) do
          previous_mountain = downhill_mountain(state)
          cfg = cfg |> Map.put("mountain", mountain) |> Map.put("difficulty", difficulty)
          state = %{state | lobby_config: cfg, revision: state.revision + 1}

          # D12: a mountain change invalidates every client's loaded course and
          # readiness; each rider must re-load the selected document before the
          # roster can lock, so a stale course never starts a race.
          state =
            if mountain != previous_mountain do
              players =
                Map.new(state.players, fn {s, p} ->
                  if p[:ready_timer_ref], do: Process.cancel_timer(p.ready_timer_ref)
                  {s, %{p | loaded: false, ready: false, ready_timer_ref: nil}}
                end)

              %{state | players: players}
            else
              state
            end

          state =
            record_and_broadcast_event(state, "lobby_config", %{
              "mountain" => mountain,
              "difficulty" => difficulty
            })

          broadcast_activity_state(state)

          {:reply,
           {:ok,
            %{
              result: "config",
              mountain: mountain,
              difficulty: difficulty,
              revision: state.revision
            }}, state}
        else
          {:error, :invalid_setting} -> {:reply, {:error, :invalid_setting}, state}
        end
    end
  end

  defp validate_downhill_mountain(m) do
    if m in DownhillMayhem.SessionPolicy.mountains(),
      do: {:ok, m},
      else: {:error, :invalid_setting}
  end

  defp validate_downhill_difficulty(d) do
    if d in DownhillMayhem.SessionPolicy.difficulties(),
      do: {:ok, d},
      else: {:error, :invalid_setting}
  end

  defp downhill_mountain(state) do
    cfg = state.lobby_config || %{}
    cfg["mountain"] || get_in(state.activity_def || %{}, ["course", "id"]) || "classic"
  end

  defp downhill_difficulty(state) do
    (state.lobby_config || %{})["difficulty"] || "mayhem"
  end

  # Canonical course cache by mountain (the documents are ~128 KiB; never
  # re-read per tick). Daily is generated server-side (D5: the server is the
  # sole runtime Daily generator) and cached per UTC date inside
  # DownhillMayhem.Daily.
  defp downhill_course(state) do
    mountain = downhill_mountain(state)

    # Daily is generated server-side and cached per UTC date inside
    # DownhillMayhem.Daily; it is deliberately NOT cached here, so crossing
    # UTC midnight always serves the new day's document.
    if mountain == "daily" do
      try do
        {:ok, DownhillMayhem.Daily.daily()}
      rescue
        e -> {:error, Exception.message(e)}
      end
    else
      key = {__MODULE__, :downhill_course, mountain}

      case :persistent_term.get(key, :missing) do
        :missing ->
          try do
            course = DownhillMayhem.Course.load_crafted(mountain)
            :persistent_term.put(key, course)
            {:ok, course}
          rescue
            e -> {:error, Exception.message(e)}
          end

        course ->
          {:ok, course}
      end
    end
  end

  defp downhill_course!(state) do
    case downhill_course(state) do
      {:ok, course} -> course
      {:error, reason} -> raise "downhill course unavailable: #{inspect(reason)}"
    end
  end

  # D7 load handshake acceptance: mark the rider loaded only when the client
  # reports the exact server course identity, acknowledge with serverNow.
  defp accept_downhill_loaded(state, player, slot, seq, controls) do
    case downhill_course(state) do
      {:ok, course} ->
        if Map.get(controls, "courseId") == course.id and
             Map.get(controls, "courseVersion") == course.version and
             Map.get(controls, "courseHash") == DownhillMayhem.Course.hash(course) do
          if player[:watchdog_timer_ref], do: Process.cancel_timer(player.watchdog_timer_ref)

          player =
            player
            |> Map.put(:last_seq, seq)
            |> Map.put(:loaded, true)

          {:reply,
           {:ok,
            %{
              result: "loaded",
              ackSeq: seq,
              seq: seq,
              revision: state.revision,
              serverNow: System.system_time(:millisecond)
            }}, %{state | players: Map.put(state.players, slot, player)}}
        else
          {:reply, {:error, :course_mismatch}, state}
        end

      {:error, _reason} ->
        {:reply, {:error, :course_mismatch}, state}
    end
  end

  # Discrete race events (finish/strike) broadcast from authoritative ticks.
  defp broadcast_downhill_event(state, %{type: "finish", slot: slot, time: time}) do
    record_and_broadcast_event(state, "rider_finished", %{
      "slot" => slot,
      "playerId" => downhill_player_id(state, slot),
      "elapsedMs" => round(time * 1000)
    })
  end

  defp broadcast_downhill_event(state, %{
         type: "strike",
         landed: true,
         slot: attacker,
         target_slot: target,
         kind: kind
       }) do
    record_and_broadcast_event(state, "strike", %{
      "attackerSlot" => attacker,
      "targetSlot" => target,
      "kind" => to_string(kind)
    })
  end

  defp broadcast_downhill_event(state, _event), do: state

  defp downhill_player_id(state, slot) do
    case Map.get(state.players, slot) do
      nil -> "slot_#{slot}"
      p -> p.player_id
    end
  end

  defp extract_sim_opts(state) do
    series_len =
      (state.lobby_config && state.lobby_config["seriesLength"]) ||
        (state.activity_def &&
           (state.activity_def["seriesLength"] || state.activity_def["series_length"])) ||
        1

    [
      series_length: series_len,
      slots: Map.keys(state.players),
      environment: state.environment
    ]
  end

  defp init_simulation(act_type, opts \\ [])
  defp init_simulation("pong", _opts), do: Pong.init_sim_state()
  defp init_simulation("air-hockey", opts), do: AirHockey.init_sim_state(opts)
  defp init_simulation("foosball", opts), do: Foosball.init_sim_state(opts)
  defp init_simulation("drones", opts), do: Drone.init_sim_state(opts)
  defp init_simulation("paper-airplanes", opts), do: PaperAirplane.init_sim_state(opts)
  defp init_simulation("gutter-boats", opts), do: GutterBoat.init_sim_state(opts)
  defp init_simulation("rc-boats", opts), do: RcBoat.init_sim_state(opts)
  defp init_simulation("horseshoes", opts), do: Horseshoes.init_sim_state(opts)
  defp init_simulation("telescope", opts), do: Telescope.init_sim_state(opts)
  defp init_simulation("hammer-strike", opts), do: HammerStrike.init_sim_state(opts)
  defp init_simulation("forge-challenge", opts), do: ForgeChallenge.init_sim_state(opts)
  defp init_simulation("curling", opts), do: Curling.init_sim_state(opts)
  defp init_simulation("chess", opts), do: Chess.init_sim_state(opts)
  defp init_simulation("checkers", opts), do: Checkers.init_sim_state(opts)
  defp init_simulation("tile-puzzle", opts), do: TilePuzzle.init_sim_state(opts)
  defp init_simulation("light-music-puzzle", opts), do: LightMusic.init_sim_state(opts)
  defp init_simulation("darts", opts), do: Darts.init_sim_state(opts)
  defp init_simulation("piano", opts), do: Piano.init_sim_state(opts)
  defp init_simulation("photo-booth", opts), do: PhotoBooth.init_sim_state(opts)
  defp init_simulation("fishing", opts), do: Fishing.init_sim_state(opts)
  defp init_simulation("skipping-stones", opts), do: SkippingStones.init_sim_state(opts)
  defp init_simulation("rain-runner", _opts), do: RainRunner.init_sim_state()
  defp init_simulation("signal-lost", _opts), do: SignalLost.init_sim_state()
  defp init_simulation("sporefall", _opts), do: Sporefall.init_sim_state()
  defp init_simulation("pool", _opts), do: Afterlight.Activities.Pool.Rules.init_game()
  defp init_simulation("billiards", _opts), do: Afterlight.Activities.Pool.Rules.init_game()

  # Downhill Mayhem builds its six-rider field from a locked roster (D12); the
  # authoritative path calls this through DownhillMayhem.SessionPolicy.
  defp init_simulation("downhill-mayhem", opts) do
    mountain = Keyword.get(opts, :mountain, "classic")
    course = Keyword.get(opts, :course) || DownhillMayhem.Course.load_crafted(mountain)
    field = Keyword.get(opts, :field, [])
    difficulty = Keyword.get(opts, :difficulty, "mayhem")
    seed = Keyword.get(opts, :seed, 1)
    DownhillMayhem.SessionPolicy.init_sim(course, field, difficulty, seed)
  end

  defp init_simulation(_other, _opts), do: %{}

  defp pool?(state) do
    snowboard_type(state) in ["pool", "billiards"]
  end

  defp curling?(state) do
    snowboard_type(state) == "curling"
  end

  defp chess?(state) do
    snowboard_type(state) == "chess"
  end

  # Race policy helpers (snowboard + downhill): per-type cadence plus a single
  # discriminator, so every lifecycle branch below can stay narrowly scoped
  # without touching Pong/solo behavior.
  defp snowboard?(state) do
    Snowboard.SessionPolicy.activity_type() == snowboard_type(state)
  end

  defp downhill?(state) do
    DownhillMayhem.SessionPolicy.activity_type() == snowboard_type(state)
  end

  defp race?(state), do: snowboard?(state) or downhill?(state)

  defp policy_module("downhill-mayhem"), do: DownhillMayhem.SessionPolicy
  defp policy_module(_other), do: Snowboard.SessionPolicy

  defp wire_room_id(state) do
    state.wire_room_id || state.room_key
  end

  defp snowboard_type(state) do
    (state.activity_def && state.activity_def["type"]) || "unknown"
  end

  defp tick_interval_for("snowboard-race"), do: Snowboard.SessionPolicy.tick_interval_ms()
  defp tick_interval_for("downhill-mayhem"), do: DownhillMayhem.SessionPolicy.tick_interval_ms()
  # Kart Royale (integrate-kart-royale-arcade 4.7): admission-only session —
  # the race is client-local, so the server runs no authoritative simulation.
  # The generic tick would just count ticks 60x a second for nobody; 1s keeps
  # the idle session effectively asleep while join/leave occupancy frames
  # (broadcast immediately) stay instant.
  defp tick_interval_for("kart-royale"), do: 1_000
  defp tick_interval_for(_other), do: 16

  defp snapshot_interval_for("snowboard-race"), do: Snowboard.SessionPolicy.snapshot_interval_ms()

  defp snapshot_interval_for("downhill-mayhem"),
    do: DownhillMayhem.SessionPolicy.snapshot_interval_ms()

  # Occupancy heartbeat for the cabinet display; occupancy changes themselves
  # are broadcast on the join/leave path, not waited for.
  defp snapshot_interval_for("kart-royale"), do: 1_000
  defp snapshot_interval_for(_other), do: 50

  # D7 mutation fence (snowboard + downhill): ready/leave/input signed for an
  # older matchId are rejected with :stale_match and never mutate the current
  # race. A missing matchId is malformed for these types.
  defp race_match_fence(state, payload) do
    cond do
      not race?(state) ->
        :ok

      not is_binary(Map.get(payload, "matchId")) ->
        :missing

      Map.get(payload, "matchId") != state.match_id ->
        :stale

      true ->
        :ok
    end
  end

  # D7 load handshake acceptance: mark the rider loaded, acknowledge with
  # clock-correlated serverNow.
  defp accept_snowboard_loaded(state, player, slot, seq, controls) do
    if course_handshake_ok?(controls) do
      if player[:watchdog_timer_ref] do
        Process.cancel_timer(player.watchdog_timer_ref)
      end

      player =
        player
        |> Map.put(:last_seq, seq)
        |> Map.put(:loaded, true)
        |> Map.put(:watchdog_timer_ref, player[:watchdog_timer_ref])

      {:reply,
       {:ok,
        %{
          result: "loaded",
          ackSeq: seq,
          seq: seq,
          revision: state.revision,
          serverNow: System.system_time(:millisecond)
        }}, %{state | players: Map.put(state.players, slot, player)}}
    else
      {:reply, {:error, :course_mismatch}, state}
    end
  end

  defp course_handshake_ok?(controls) do
    course = Snowboard.SessionPolicy.course()

    Map.get(controls, "courseId") == Map.get(course.doc, "id") and
      Map.get(controls, "courseVersion") == Map.get(course.doc, "version") and
      Map.get(controls, "courseHash") == course.hash
  end

  defp step_simulation("pong", sim_state, players, steps) do
    Pong.step(sim_state, players, steps)
  end

  defp step_simulation("air-hockey", sim_state, players, steps) do
    AirHockey.step(sim_state, players, steps)
  end

  defp step_simulation("foosball", sim_state, players, steps) do
    Foosball.step(sim_state, players, steps)
  end

  defp step_simulation("drones", sim_state, players, steps) do
    Drone.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("paper-airplanes", sim_state, players, steps) do
    PaperAirplane.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("gutter-boats", sim_state, players, steps) do
    GutterBoat.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("rc-boats", sim_state, players, steps) do
    RcBoat.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("horseshoes", sim_state, players, steps) do
    Horseshoes.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("telescope", sim_state, players, steps) do
    Telescope.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("hammer-strike", sim_state, players, steps) do
    HammerStrike.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("forge-challenge", sim_state, players, steps) do
    ForgeChallenge.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("curling", sim_state, players, steps) do
    Curling.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("chess", sim_state, players, steps) do
    Chess.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("checkers", sim_state, players, steps) do
    Checkers.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("tile-puzzle", sim_state, players, steps) do
    TilePuzzle.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("light-music-puzzle", sim_state, players, steps) do
    LightMusic.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("darts", sim_state, players, steps) do
    Darts.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("piano", sim_state, players, steps) do
    Piano.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("photo-booth", sim_state, players, steps) do
    PhotoBooth.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("fishing", sim_state, players, steps) do
    Fishing.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("skipping-stones", sim_state, players, steps) do
    SkippingStones.step_simulation(sim_state, players, steps)
  end

  defp step_simulation("rain-runner", sim_state, players, steps) do
    RainRunner.step(sim_state, players, steps)
  end

  defp step_simulation("signal-lost", sim_state, players, steps) do
    SignalLost.step(sim_state, players, steps)
  end

  defp step_simulation("sporefall", sim_state, players, steps) do
    Sporefall.step(sim_state, players, steps)
  end

  defp step_simulation("pool", sim_state, _players, steps) do
    step_pool_simulation(sim_state, steps)
  end

  defp step_simulation("billiards", sim_state, _players, steps) do
    step_pool_simulation(sim_state, steps)
  end

  defp step_simulation(_other, sim_state, _players, steps) do
    curr_tick = Map.get(sim_state, "tick", 0)
    {Map.put(sim_state, "tick", curr_tick + steps), nil}
  end

  defp step_pool_simulation(sim_state, steps) do
    {final_state, _events} =
      Enum.reduce(1..steps, {sim_state, []}, fn _i, {curr, _} ->
        Afterlight.Activities.Pool.Rules.step(curr, 1.0 / 60.0)
      end)

    if final_state["status"] == "game_over" do
      winner_slot = final_state["winner"]
      reason = final_state["win_reason"] || "completed"
      {final_state, {:match_ended, winner_slot, %{reason: reason}}}
    else
      {final_state, nil}
    end
  end

  # Lobby practice never creates a competitive match or records results.
  defp pool_practice?(state) do
    pool?(state) and state.status == :lobby and map_size(state.players) == 1
  end

  defp handle_pool_input(state, player, slot, seq, controls) do
    if state.status != :in_progress and not pool_practice?(state) do
      {:reply, {:error, :not_in_progress}, state}
    else
      # Lobby practice has no match to initialize the rack; deal one for the
      # solo player on first input so turn checks have a real sim to read.
      state =
        if pool_practice?(state) and state.sim_state == %{} do
          sim =
            Afterlight.Activities.Pool.Rules.init_game()
            |> Map.put("turn", slot)

          %{state | sim_state: sim, revision: state.revision + 1}
        else
          state
        end

      action = Map.get(controls, "type") || Map.get(controls, "action") || "shoot"
      turn = state.sim_state["turn"]

      cond do
        action in ["shoot", "place_cue_ball", "call_pocket"] and turn != slot ->
          {:reply, {:error, :out_of_turn}, state}

        action == "shoot" and
            (state.sim_state["status"] == "shooting" or
               not get_in(state.sim_state, ["physics", "settled"])) ->
          {:reply, {:error, :balls_in_motion}, state}

        action == "shoot" ->
          angle = float_or(Map.get(controls, "angle"), 0.0)
          raw_power = float_or(Map.get(controls, "power"), 1.0)
          power = max(0.0, min(1.0, raw_power))
          spin_x = float_or(Map.get(controls, "spinX") || Map.get(controls, "spin_x"), 0.0)
          spin_y = float_or(Map.get(controls, "spinY") || Map.get(controls, "spin_y"), 0.0)

          case Afterlight.Activities.Pool.Rules.shoot(
                 state.sim_state,
                 slot,
                 angle,
                 power,
                 spin_x,
                 spin_y
               ) do
            {:ok, new_sim} ->
              accept_pool_input(state, player, slot, seq, controls, new_sim)

            {:error, :not_your_turn} ->
              {:reply, {:error, :out_of_turn}, state}

            {:error, :balls_in_motion} ->
              {:reply, {:error, :balls_in_motion}, state}

            {:error, err} ->
              {:reply, {:error, err}, state}
          end

        action == "place_cue_ball" ->
          x = float_or(Map.get(controls, "x"), 0.0)
          z = float_or(Map.get(controls, "z"), 0.0)

          case Afterlight.Activities.Pool.Rules.place_cue_ball(state.sim_state, slot, x, z) do
            {:ok, new_sim} ->
              accept_pool_input(state, player, slot, seq, controls, new_sim)

            {:error, :invalid_position} ->
              {:reply, {:error, :overlap_placement}, state}

            {:error, :not_your_turn} ->
              {:reply, {:error, :out_of_turn}, state}

            {:error, err} ->
              {:reply, {:error, err}, state}
          end

        action == "call_pocket" ->
          pocket_id = Map.get(controls, "pocketId") || Map.get(controls, "pocket_id")

          case Afterlight.Activities.Pool.Rules.call_pocket(state.sim_state, slot, pocket_id) do
            {:ok, new_sim} ->
              accept_pool_input(state, player, slot, seq, controls, new_sim)

            {:error, :not_your_turn} ->
              {:reply, {:error, :out_of_turn}, state}

            {:error, err} ->
              {:reply, {:error, err}, state}
          end

        action == "resign" ->
          new_sim = Afterlight.Activities.Pool.Rules.resign(state.sim_state, slot)
          accept_pool_input(state, player, slot, seq, controls, new_sim)

        true ->
          {:reply, {:error, :invalid_input}, state}
      end
    end
  end

  defp accept_pool_input(state, player, slot, seq, controls, new_sim) do
    if player[:watchdog_timer_ref], do: Process.cancel_timer(player.watchdog_timer_ref)

    watchdog_ref =
      if state.input_watchdog_ms > 0 do
        Process.send_after(
          self(),
          {:input_watchdog_timeout, player.player_id},
          state.input_watchdog_ms
        )
      else
        nil
      end

    updated_player = %{
      player
      | last_seq: seq,
        input_state: controls,
        watchdog_timer_ref: watchdog_ref
    }

    players = Map.put(state.players, slot, updated_player)
    state = %{state | players: players, sim_state: new_sim, revision: state.revision + 1}

    state =
      if pool_practice?(state) and is_nil(state.tick_timer_ref) do
        %{state | tick_timer_ref: Process.send_after(self(), :sim_tick, state.tick_interval_ms)}
      else
        state
      end

    reply = %{
      result: "input_accepted",
      ackSeq: seq,
      seq: seq,
      revision: state.revision
    }

    {:reply, {:ok, reply}, state}
  end

  defp handle_chess_input(state, player, slot, seq, controls) do
    if state.status != :in_progress do
      {:reply, {:error, :not_in_progress}, state}
    else
      case Chess.apply_input(state.sim_state, slot, controls) do
        {:ok, new_sim, _events} ->
          accept_pool_input(state, player, slot, seq, controls, new_sim)

        {:error, :out_of_turn} ->
          {:reply, {:error, :out_of_turn}, state}

        {:error, :illegal_move} ->
          {:reply, {:error, :invalid_input}, state}

        {:error, :game_over} ->
          {:reply, {:error, :not_in_progress}, state}

        {:error, reason} ->
          {:reply, {:error, reason}, state}
      end
    end
  end

  defp float_or(v, default) when is_float(v), do: v
  defp float_or(v, _default) when is_integer(v), do: v * 1.0
  defp float_or(_, default), do: default

  defp valid_controls?(controls) when is_map(controls) do
    forbidden_keys = ~w(score scores winner transform transforms)

    has_forbidden? =
      Enum.any?(forbidden_keys, fn k ->
        Map.has_key?(controls, k) or Map.has_key?(controls, String.to_atom(k))
      end)

    if has_forbidden? do
      false
    else
      Enum.all?(controls, fn {_k, v} -> valid_control_val?(v) end)
    end
  end

  defp valid_controls?(_), do: false

  # Strict D7 allowlist for downhill-mayhem inputs, mirroring
  # shared/activityProtocol.js validateDownhillControls: unknown fields are
  # rejected, steer must be a finite number in [-1, 1], the pressed edges are
  # booleans and the trick is one of the source tricks.
  @downhill_ride_keys ~w(kind steer pedal brake boost hopPressed punchPressed kickPressed trick)
  @downhill_tricks [nil, "nohander", "superman", "heel", "backflip"]
  @downhill_loaded_keys ~w(kind courseId courseVersion courseHash)
  @downhill_course_ids ~w(classic timber rock daily)

  defp valid_downhill_controls?(%{"kind" => "neutral"} = controls) do
    map_size(controls) == 1
  end

  defp valid_downhill_controls?(%{"kind" => "ride"} = controls) do
    pressed =
      for name <- ~w(pedal brake boost hopPressed punchPressed kickPressed),
          do: Map.get(controls, name)

    Enum.all?(Map.keys(controls), &(&1 in @downhill_ride_keys)) and
      is_number(Map.get(controls, "steer")) and
      Map.get(controls, "steer") >= -1 and Map.get(controls, "steer") <= 1 and
      Enum.all?(pressed, fn v -> is_nil(v) or is_boolean(v) end) and
      Map.get(controls, "trick") in @downhill_tricks
  end

  defp valid_downhill_controls?(%{"kind" => "loaded"} = controls) do
    Enum.all?(Map.keys(controls), &(&1 in @downhill_loaded_keys)) and
      Map.get(controls, "courseId") in @downhill_course_ids and
      is_integer(Map.get(controls, "courseVersion")) and
      Map.get(controls, "courseVersion") >= 1 and
      is_binary(Map.get(controls, "courseHash"))
  end

  # The generic branch only accepts nil-kind controls; anything else is noise.
  defp valid_downhill_controls?(%{"kind" => nil} = controls) do
    Enum.all?(Map.keys(controls), &(&1 in @downhill_ride_keys)) and
      is_number(Map.get(controls, "steer"))
  end

  defp valid_downhill_controls?(_), do: false

  # JSON `null` is a legitimate control value (e.g. downhill `trick: null`);
  # the type-specific validators still constrain what each field may contain.
  defp valid_control_val?(nil), do: true
  defp valid_control_val?(v) when is_boolean(v), do: true
  defp valid_control_val?(v) when is_binary(v), do: byte_size(v) <= 1024
  defp valid_control_val?(v) when is_integer(v), do: abs(v) <= 1_000_000_000
  defp valid_control_val?(v) when is_float(v), do: abs(v) <= 1_000_000.0
  defp valid_control_val?(v) when is_map(v), do: valid_controls?(v)
  defp valid_control_val?(v) when is_list(v), do: Enum.all?(v, &valid_control_val?/1)
  defp valid_control_val?(_), do: false

  defp maybe_offer_next_slot(state, slot) do
    if not Map.has_key?(state.players, slot) and not Map.has_key?(state.offers, slot) and
         state.queue != [] do
      [next | rest] = state.queue

      case recheck_member_and_proximity(state, next.player_id, next.conn_ref) do
        :ok ->
          timeout = state.offer_timeout_ms
          timer_ref = Process.send_after(self(), {:offer_timeout, slot, next.player_id}, timeout)

          offer = %{
            slot: slot,
            player_id: next.player_id,
            conn_ref: next.conn_ref,
            channel_pid: next.channel_pid,
            timer_ref: timer_ref,
            offered_at: System.system_time(:millisecond)
          }

          if next.channel_pid && Process.alive?(next.channel_pid) do
            send(
              next.channel_pid,
              {:activity_event,
               %{
                 "type" => "activity_event",
                 "version" => 1,
                 "roomId" => wire_room_id(state),
                 "roomEpoch" => state.room_epoch,
                 "activityId" => state.activity_id,
                 "sessionId" => state.session_id,
                 "eventId" => "evt_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower),
                 "eventType" => "slot_offered",
                 "event" => "slot_offered",
                 "slot" => slot,
                 "timeoutMs" => timeout,
                 "data" => %{"slot" => slot, "timeoutMs" => timeout},
                 "serverNow" => System.system_time(:millisecond)
               }}
            )
          end

          %{
            state
            | offers: Map.put(state.offers, slot, offer),
              queue: rest,
              revision: state.revision + 1
          }

        {:error, _reason} ->
          maybe_offer_next_slot(%{state | queue: rest}, slot)
      end
    else
      state
    end
  end

  defp cancel_and_advance_offer(state, slot) do
    case Map.get(state.offers, slot) do
      nil ->
        state

      offer ->
        if offer[:timer_ref], do: Process.cancel_timer(offer.timer_ref)
        state = %{state | offers: Map.delete(state.offers, slot), revision: state.revision + 1}
        maybe_offer_next_slot(state, slot)
    end
  end

  defp check_proximity(state, player_id, conn_ref) do
    if state.check_proximity do
      recheck_member_and_proximity(state, player_id, conn_ref)
    else
      :ok
    end
  end

  defp recheck_member_and_proximity(state, player_id, conn_ref) do
    if not state.check_proximity do
      :ok
    else
      cond do
        is_nil(state.room_pid) or not Process.alive?(state.room_pid) ->
          {:error, :room_unavailable}

        true ->
          try do
            if not RoomServer.member?(state.room_pid, player_id, conn_ref) do
              {:error, :not_in_room}
            else
              case RoomServer.member_pose(state.room_pid, player_id) do
                {:ok, pose} ->
                  check_pose_proximity(state, pose)

                :not_found ->
                  {:error, :not_in_room}

                _ ->
                  :ok
              end
            end
          catch
            :exit, _ -> :ok
          end
      end
    end
  end

  defp check_pose_proximity(state, pose) do
    radius = Map.get(state.activity_def, "interactionRadius", 3.5)
    transform = Map.get(state.activity_def, "transform", %{})
    pos = Map.get(transform, "position", [0.0, 0.0, 0.0])

    [tx, _ty, tz] =
      case pos do
        [x, y, z] -> [x, y, z]
        [x, z] -> [x, 0.0, z]
        _ -> [0.0, 0.0, 0.0]
      end

    px = (pose[:x] || pose["x"] || 0.0) * 1.0
    pz = (pose[:z] || pose["z"] || 0.0) * 1.0

    dx = px - tx
    dz = pz - tz
    dist_sq = dx * dx + dz * dz

    max_r = radius * 1.5

    if dist_sq <= max_r * max_r do
      :ok
    else
      {:error, :out_of_range}
    end
  end

  defp build_full_snapshot(state, ack_seq \\ nil) do
    now_ms = System.system_time(:millisecond)

    raw_state = %{
      "status" => to_string(state.status),
      "matchId" => state.match_id,
      "players" =>
        Enum.map(state.players, fn {slot, p} ->
          %{
            "slot" => slot,
            "playerId" => p.player_id,
            "ready" => p.ready,
            "lastAcceptedSeq" => Map.get(p, :last_seq, 0),
            "inputState" => p.input_state
          }
        end),
      "queue" => WinnerStays.queue_with_positions(state.queue),
      "queueLength" => length(state.queue),
      "nextPlayer" => WinnerStays.next_player(state.offers, state.queue),
      "winnerStays" => lobby_winner_stays?(state),
      "matchOutcome" => state.match_outcome,
      "spectatorCount" => map_size(state.spectators),
      "sim" => state.sim_state,
      "events" => state.recent_events || [],
      "lastAcceptedSeqs" =>
        Map.new(state.players, fn {_s, p} -> {p.player_id, Map.get(p, :last_seq, 0)} end)
    }

    raw_state =
      if state.environment do
        Map.put(raw_state, "environment", state.environment)
      else
        raw_state
      end

    envelope = %{
      "type" => "activity_state",
      "version" => 1,
      "roomId" => wire_room_id(state),
      "roomEpoch" => state.room_epoch,
      "activityId" => state.activity_id,
      "sessionId" => state.session_id,
      "revision" => state.revision,
      "serverNow" => now_ms,
      "status" => to_string(state.status),
      "matchId" => state.match_id,
      "players" => raw_state["players"],
      "queueLength" => raw_state["queueLength"],
      "nextPlayer" => raw_state["nextPlayer"],
      "winnerStays" => raw_state["winnerStays"],
      "spectatorCount" => raw_state["spectatorCount"],
      "state" => raw_state
    }

    envelope =
      if state.environment do
        Map.put(envelope, "environment", state.environment)
      else
        envelope
      end

    envelope =
      if ack_seq != nil do
        Map.put(envelope, "ackSeq", ack_seq)
      else
        envelope
      end

    case Jason.encode(envelope) do
      {:ok, json} when byte_size(json) <= 32_768 ->
        envelope

      {:ok, _json} ->
        Logger.warning("Snapshot for #{state.activity_id} exceeds 32 KiB, trimming events")
        trimmed_state = %{raw_state | "events" => []}
        %{envelope | "state" => trimmed_state}

      {:error, _} ->
        envelope
    end
  end

  # Operational telemetry (add-multiplayer-snowboard-arcade 9.6): bounded
  # low-cardinality events through :telemetry — NEVER player/session ids,
  # leases or tokens as labels or measurements.
  defp snowboard_telemetry(state, event, extra \\ %{}, meta_extra \\ %{}) do
    :telemetry.execute(
      [:afterlight, :activity, :snowboard, event],
      Map.merge(
        %{
          riders: map_size(Map.get(state, :sim_state, %{})["riders"] || %{}),
          seated: map_size(state.players),
          queue: length(state.queue),
          spectators: map_size(state.spectators)
        },
        extra
      ),
      Map.merge(
        %{activity_type: "snowboard-race", phase: Snowboard.Presentation.summary_phase(state)},
        meta_extra
      )
    )
  rescue
    _ -> :ok
  end

  # Downhill Mayhem operational telemetry (D20): bounded low-cardinality
  # events through :telemetry — NEVER player/session ids, leases or tokens.
  defp downhill_telemetry(state, event, extra \\ %{}, meta_extra \\ %{}) do
    riders = Map.get(state, :sim_state, %{})["riders"] || %{}

    :telemetry.execute(
      [:afterlight, :activity, :downhill_mayhem, event],
      Map.merge(
        %{
          riders: map_size(riders),
          humans: Enum.count(riders, fn {_s, r} -> not r.is_ai end),
          ai: Enum.count(riders, fn {_s, r} -> r.is_ai end),
          seated: map_size(state.players),
          queue: length(state.queue),
          spectators: map_size(state.spectators)
        },
        extra
      ),
      Map.merge(
        %{
          activity_type: "downhill-mayhem",
          phase: DownhillMayhem.Presentation.summary_phase(state)
        },
        meta_extra
      )
    )
  rescue
    _ -> :ok
  end

  defp broadcast_activity_state(state) do
    cond do
      snowboard?(state) ->
        broadcast_snowboard_snapshots(state)

      downhill?(state) ->
        broadcast_downhill_snapshots(state)

      true ->
        snapshot = build_full_snapshot(state)

        if state.room_pid && Process.alive?(state.room_pid) do
          try do
            RoomServer.broadcast_frame(state.room_pid, snapshot)
          catch
            :exit, _ -> :ok
          end
        end
    end
  end

  # Downhill delivery (8.6): addressed full participant snapshots (each with a
  # private self attachment) to seated riders and subscribed watchers; the
  # room-wide frame is only the <=2 Hz public summary plus immediate phase
  # changes.
  defp broadcast_downhill_snapshots(state) do
    if state.room_pid && Process.alive?(state.room_pid) do
      state = %{state | snapshot_seq: Map.get(state, :snapshot_seq, 0) + 1}
      now = System.system_time(:millisecond)
      full = DownhillMayhem.Presentation.full_snapshot(state)

      deliver_to(state.room_pid, state.players, fn p ->
        DownhillMayhem.Presentation.attach_self(full, state, p)
      end)

      deliver_frames(state.room_pid, connected_channels(state.spectators), full)

      phase = DownhillMayhem.Presentation.summary_phase(state)

      if phase != state.last_summary_phase or now - (state.last_summary_at || 0) >= 500 do
        try do
          RoomServer.broadcast_frame(state.room_pid, DownhillMayhem.Presentation.summary(state))
          send(self(), {:snowboard_summary_paced, now, phase})
        catch
          :exit, _ -> :ok
        end
      end
    end
  end

  # Snowboard delivery (5.2/5.3): full participant snapshots are ADDRESSED
  # to seated riders (with a private self attachment) and subscribed
  # watchers; the room-wide frame is only the <=2Hz public summary plus
  # immediate phase changes. Never a room-wide full-frame fanout.
  # Snowboard delivery (5.2/5.3): full participant snapshots are ADDRESSED
  # to seated riders (each with its private self attachment) and subscribed
  # watchers; the room-wide frame is only the <=2Hz public summary plus
  # immediate phase changes. Never a room-wide full-frame fanout. Snapshot
  # presentation lives in Snowboard.Presentation.
  defp broadcast_snowboard_snapshots(state) do
    if state.room_pid && Process.alive?(state.room_pid) do
      state = %{state | snapshot_seq: Map.get(state, :snapshot_seq, 0) + 1}
      now = System.system_time(:millisecond)
      full = Snowboard.Presentation.full_snapshot(state)

      deliver_to(state.room_pid, state.players, fn p ->
        Snowboard.Presentation.attach_self(full, state, p)
      end)

      deliver_frames(state.room_pid, connected_channels(state.spectators), full)

      phase = Snowboard.Presentation.summary_phase(state)

      if phase != state.last_summary_phase or now - (state.last_summary_at || 0) >= 500 do
        try do
          RoomServer.broadcast_frame(state.room_pid, Snowboard.Presentation.summary(state))
          send(self(), {:snowboard_summary_paced, now, phase})
        catch
          :exit, _ -> :ok
        end
      end
    end
  end

  defp connected_channels(participants) when is_map(participants) do
    participants
    |> Enum.map(fn {_id, p} -> p[:channel_pid] || Map.get(p, :channel_pid) end)
    |> Enum.filter(fn pid -> is_pid(pid) && Process.alive?(pid) end)
  end

  # Seated riders each get their own frame (the private self attachment);
  # watchers share one. Both audiences are bounded by the session roster.
  defp deliver_to(room_pid, players, frame_builder) do
    try do
      Enum.each(players, fn {_slot, p} ->
        if p.channel_pid && Process.alive?(p.channel_pid) do
          RoomServer.send_to_member(room_pid, p.channel_pid, frame_builder.(p))
        end
      end)
    catch
      :exit, _ -> :ok
    end
  end

  defp deliver_frames(_room_pid, [], _frame), do: :ok

  defp deliver_frames(room_pid, [pid | rest], frame) do
    if pid && Process.alive?(pid), do: RoomServer.send_to_member(room_pid, pid, frame)
    deliver_frames(room_pid, rest, frame)
  end

  defp record_and_broadcast_event(state, event_name, data) do
    maybe_record_result(event_name, state, data)
    now_ms = System.system_time(:millisecond)
    event_id = "evt_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
    event_rec = %{"id" => event_id, "type" => event_name, "data" => data, "at" => now_ms}
    recent_events = Enum.take([event_rec | state.recent_events || []], 20)
    revision = state.revision + 1
    state = %{state | recent_events: recent_events, revision: revision}

    frame = %{
      "type" => "activity_event",
      "version" => 1,
      "roomId" => wire_room_id(state),
      "roomEpoch" => state.room_epoch,
      "activityId" => state.activity_id,
      "sessionId" => state.session_id,
      "revision" => revision,
      "eventId" => event_id,
      "eventType" => event_name,
      "event" => event_name,
      "data" => data,
      "payload" => data,
      "serverNow" => now_ms
    }

    if state.room_pid && Process.alive?(state.room_pid) do
      try do
        RoomServer.broadcast_frame(state.room_pid, frame)
      catch
        :exit, _ -> :ok
      end
    end

    if event_name in ["match_ended", "match_aborted"] and
         WinnerStays.table_game?(Map.get(state.activity_def || %{}, "type")) do
      send(self(), :apply_winner_stays)
    end

    state
  end

  # Durable result recording (task 3.9, design D8): terminal events only,
  # best-effort, never blocking or crashing the session. The recording
  # status is broadcast so clients can label local results honestly
  # (verified / pending / unrecorded — task 3.10).
  # Snowboard (add-multiplayer-snowboard-arcade 4.5/D6): terminal race
  # results are bounded and SESSION-LOCAL. The generic durable Results path
  # does not express race standings and is never called for this type; the
  # honest `result_recorded` status tells clients to label records as
  # session-only.
  defp maybe_record_result(
         event_name,
         %__MODULE__{activity_def: %{"type" => "snowboard-race"}} = state,
         _outcome
       )
       when event_name in ["match_ended", "match_aborted"] do
    broadcast_activity_event(state, "result_recorded", %{
      "status" => "session_only",
      "activityId" => state.activity_id,
      "game" => "snowboard-race",
      "rulesVersion" => Map.get(state.activity_def, "rulesVersion", 1),
      "sessionId" => state.session_id,
      "matchId" => state.match_id
    })
  end

  defp maybe_record_result(
         event_name,
         %__MODULE__{activity_def: %{"type" => "downhill-mayhem"}} = state,
         _outcome
       )
       when event_name in ["match_ended", "match_aborted"] do
    broadcast_activity_event(state, "result_recorded", %{
      "status" => "session_only",
      "activityId" => state.activity_id,
      "game" => "downhill-mayhem",
      "rulesVersion" => Map.get(state.activity_def, "rulesVersion", 1),
      "sessionId" => state.session_id,
      "matchId" => state.match_id
    })
  end

  defp maybe_record_result(event_name, state, outcome)
       when event_name in ["match_ended", "match_aborted"] do
    status =
      case Afterlight.Activities.Results.maybe_record(event_name, state, outcome) do
        {:ok, s} when is_atom(s) -> s
        {:error, r} when is_atom(r) -> r
        _ -> :recording_failed
      end

    unless status == :ignore do
      final_score =
        case outcome do
          %{"score" => s} when is_integer(s) and s >= 0 -> s
          _ -> nil
        end

      data = %{
        "status" => Atom.to_string(status),
        "activityId" => state.activity_id,
        "game" => Map.get(state.activity_def, "type"),
        "rulesVersion" => Map.get(state.activity_def, "rulesVersion", 1),
        "sessionId" => state.session_id,
        "matchId" => state.match_id
      }

      data = if final_score == nil, do: data, else: Map.put(data, "score", final_score)
      broadcast_activity_event(state, "result_recorded", data)
    end
  end

  defp maybe_record_result(_event_name, _state, _outcome), do: :ok

  defp broadcast_activity_event(state, event_name, data) do
    record_and_broadcast_event(state, event_name, data)
  end

  defp lobby_winner_stays?(state) do
    cfg = state.lobby_config || %{}
    cfg["winnerStays"] == true
  end

  defp apply_winner_stays_rotation(state) do
    type = Map.get(state.activity_def || %{}, "type")

    cond do
      state.winner_stays_applied ->
        state

      state.status != :ended ->
        state

      not WinnerStays.table_game?(type) ->
        state

      not lobby_winner_stays?(state) ->
        %{state | winner_stays_applied: true}

      true ->
        winner = WinnerStays.winner_id(state.match_outcome)

        winner_player =
          Enum.find_value(state.players, fn {_slot, p} ->
            if p.player_id == winner, do: p, else: nil
          end)

        plan =
          WinnerStays.plan(state.match_outcome, Map.to_list(state.players),
            winner_stays?: lobby_winner_stays?(state),
            winner_present?: winner_player != nil,
            winner_willing?: winner_player != nil,
            queue_length: length(state.queue)
          )

        state = Enum.reduce(plan.vacate_slots, state, &vacate_slot_for_rotation/2)

        state =
          Enum.reduce(plan.vacate_slots, state, fn slot, acc ->
            maybe_offer_next_slot(acc, slot)
          end)

        status =
          if plan.waiting? or (state.players == %{} and state.queue == [] and state.offers == %{}) do
            :lobby
          else
            state.status
          end

        state = %{
          state
          | status: status,
            winner_stays_applied: true,
            revision: state.revision + 1
        }

        broadcast_activity_state(state)
        state
    end
  end

  defp vacate_slot_for_rotation(slot, state) do
    case Map.get(state.players, slot) do
      nil ->
        state

      player ->
        if player[:channel_monitor], do: Process.demonitor(player.channel_monitor, [:flush])
        if player[:ready_timer_ref], do: Process.cancel_timer(player.ready_timer_ref)
        if player[:watchdog_timer_ref], do: Process.cancel_timer(player.watchdog_timer_ref)
        Admission.release(player.player_id)

        %{
          state
          | players: Map.delete(state.players, slot),
            player_to_slot: Map.delete(state.player_to_slot, player.player_id)
        }
    end
  end

  defp maybe_vacate_after_winner_leave(state, player_id) do
    type = Map.get(state.activity_def || %{}, "type")
    winner = WinnerStays.winner_id(state.match_outcome)

    if state.status == :ended and lobby_winner_stays?(state) and WinnerStays.table_game?(type) and
         winner == player_id do
      slots = Map.keys(state.players)
      state = Enum.reduce(slots, state, &vacate_slot_for_rotation/2)

      state =
        Enum.reduce(0..(max(state.max_players, 1) - 1), state, fn slot, acc ->
          maybe_offer_next_slot(acc, slot)
        end)

      %{
        state
        | status: if(state.queue == [] and state.offers == %{}, do: :lobby, else: state.status)
      }
    else
      state
    end
  end

  defp generate_lease_id do
    "lease_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
  end

  defp generate_session_id do
    "act_sess_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
  end

  defp generate_match_id do
    "match_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
  end
end

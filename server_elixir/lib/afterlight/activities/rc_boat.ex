defmodule Afterlight.Activities.RcBoat do
  @moduledoc """
  Authoritative server-side Sluiceworks RC Boat racing simulation (Task 7.6).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Rain and water activities: Sluiceworks RC boat racing)
  - `design.md` (D5, D7)

  Guarantees:
  - 1 to 4 RC speedboats racing on 'sluice-circuit' in Sluiceworks canal basin.
  - Ordered buoy checkpoints with strict sequential completion.
  - Throttle, rudder steering, water friction, and canal wall collisions with stun response.
  - Manual recovery / reset to last buoy if stuck.
  - DNF handling for pilot disconnects, leaves, and post-finish race timeouts.
  """

  @rules_version 1
  @course_id "sluice-circuit"
  @course_version 1
  @total_laps 2
  @dt 1.0 / 60.0
  @max_speed 7.5
  @accel 9.0
  @reverse_accel 4.0
  @drag 0.94
  @turn_rate 3.2
  @stun_ticks 24
  @dnf_timeout_ticks 60 * 15
  @water_y 0.23

  @bounds %{
    minX: -2.3,
    maxX: 2.3,
    minZ: 2.3,
    maxZ: 9.0
  }

  @checkpoints [
    %{index: 0, position: [0.0, @water_y, 3.2], radius: 1.8, name: "Sluice Start"},
    %{index: 1, position: [1.3, @water_y, 5.4], radius: 1.6, name: "East Pylon"},
    %{index: 2, position: [0.6, @water_y, 7.8], radius: 1.6, name: "South Overflow"},
    %{index: 3, position: [-1.2, @water_y, 7.2], radius: 1.6, name: "West Turn"},
    %{index: 4, position: [-1.2, @water_y, 4.8], radius: 1.6, name: "Mill Culvert"}
  ]

  @spawn_docks %{
    0 => %{position: [-0.9, @water_y, 2.7], yaw: 0.0, color: "#e8563f", name: "Ruby Hydro"},
    1 => %{position: [-0.3, @water_y, 2.7], yaw: 0.0, color: "#38bdf8", name: "Cyan Wake"},
    2 => %{position: [0.3, @water_y, 2.7], yaw: 0.0, color: "#edb66c", name: "Gilded Wave"},
    3 => %{position: [0.9, @water_y, 2.7], yaw: 0.0, color: "#a78bfa", name: "Volt Foam"}
  }

  def course_id, do: @course_id
  def course_version, do: @course_version
  def total_laps, do: @total_laps
  def checkpoints, do: @checkpoints
  def bounds, do: @bounds

  @doc """
  Initializes RC boat simulation state.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1]
        list when is_list(list) -> list
      end

    env = Keyword.get(opts, :environment)
    seed = Keyword.get(opts, :seed, 42)

    boats =
      Map.new(slots, fn slot ->
        dock = Map.get(@spawn_docks, slot, Map.get(@spawn_docks, 0))
        [px, py, pz] = dock.position

        b = %{
          "slot" => slot,
          "position" => [px, py, pz],
          "yaw" => dock.yaw,
          "speed" => 0.0,
          "nextCheckpoint" => 0,
          "checkpointsHit" => 0,
          "currentLap" => 1,
          "lapTimes" => [],
          "totalTimeMs" => 0,
          "finished" => false,
          "finishTimeMs" => nil,
          "dnf" => false,
          "stunTicks" => 0,
          "collisionCount" => 0
        }

        {to_string(slot), b}
      end)

    %{
      "rulesVersion" => @rules_version,
      "courseId" => @course_id,
      "courseVersion" => @course_version,
      "totalLaps" => @total_laps,
      "status" => "racing",
      "elapsedMs" => 0,
      "tickCount" => 0,
      "seed" => seed,
      "boats" => boats,
      "winner" => nil,
      "standings" => [],
      "dnfCountdownTicks" => nil,
      "environment" => env
    }
  end

  @doc """
  Validates player controls for RC boats.
  """
  def validate_controls(controls) when is_map(controls) do
    throttle =
      case Map.get(controls, "throttle") do
        v when is_number(v) -> max(-0.5, min(1.0, v * 1.0))
        _ -> 0.0
      end

    steer =
      case Map.get(controls, "steer") do
        v when is_number(v) -> max(-1.0, min(1.0, v * 1.0))
        _ -> 0.0
      end

    recover = Map.get(controls, "recover", false) == true

    {:ok,
     %{
       "throttle" => throttle,
       "steer" => steer,
       "recover" => recover
     }}
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Marks a racer as DNF.
  """
  def mark_dnf(sim_state, slot, reason \\ nil) do
    slot_str = to_string(slot)
    boat = get_in(sim_state, ["boats", slot_str])

    if boat && !boat["finished"] && !boat["dnf"] do
      updated_boat =
        boat
        |> Map.put("dnf", true)
        |> Map.put("dnfReason", reason)
        |> Map.put("speed", 0.0)

      updated_boats = Map.put(sim_state["boats"], slot_str, updated_boat)
      sim_state = Map.put(sim_state, "boats", updated_boats)

      case maybe_finalize_race(sim_state) do
        {completed, _} -> completed
        _ -> sim_state
      end
    else
      sim_state
    end
  end

  @doc """
  Advances the RC boat simulation by steps.
  """
  def step_simulation(sim_state, players, steps \\ 1) do
    if sim_state["status"] != "racing" do
      {sim_state, nil}
    else
      do_step_simulation(sim_state, players, steps)
    end
  end

  defp do_step_simulation(sim_state, _players, 0), do: {sim_state, nil}

  defp do_step_simulation(sim_state, players, steps) do
    elapsed_ms = sim_state["elapsedMs"] + round(@dt * 1000)
    tick_count = sim_state["tickCount"] + 1

    # DNF countdown processing
    {sim_state, dnf_timed_out} =
      case sim_state["dnfCountdownTicks"] do
        nil ->
          {sim_state, false}

        n when n <= 1 ->
          # Timer expired: all unfinished become DNF
          updated_boats =
            Map.new(sim_state["boats"], fn {slot_str, b} ->
              if !b["finished"] and !b["dnf"] do
                {slot_str, b |> Map.put("dnf", true) |> Map.put("speed", 0.0)}
              else
                {slot_str, b}
              end
            end)

          {sim_state |> Map.put("boats", updated_boats) |> Map.put("dnfCountdownTicks", 0), true}

        n ->
          {Map.put(sim_state, "dnfCountdownTicks", n - 1), false}
      end

    if dnf_timed_out do
      maybe_finalize_race(sim_state)
    else
      # Step each boat
      new_boats =
        Map.new(sim_state["boats"], fn {slot_str, boat} ->
          if boat["finished"] || boat["dnf"] do
            {slot_str, boat}
          else
            slot = boat["slot"]
            player = Map.get(players, slot)
            input = (player && player[:input_state]) || %{}

            {boat, _} = step_boat(boat, input, elapsed_ms)
            {slot_str, boat}
          end
        end)

      # Check if first place just finished to start DNF countdown
      any_finished = Enum.any?(Map.values(new_boats), & &1["finished"])

      dnf_countdown =
        if any_finished and is_nil(sim_state["dnfCountdownTicks"]) do
          @dnf_timeout_ticks
        else
          sim_state["dnfCountdownTicks"]
        end

      sim_state =
        sim_state
        |> Map.put("elapsedMs", elapsed_ms)
        |> Map.put("tickCount", tick_count)
        |> Map.put("boats", new_boats)
        |> Map.put("dnfCountdownTicks", dnf_countdown)

      case maybe_finalize_race(sim_state) do
        {%{"status" => "complete"} = completed_state, outcome} ->
          {completed_state, outcome}

        {running_state, nil} ->
          do_step_simulation(running_state, players, steps - 1)
      end
    end
  end

  defp step_boat(boat, input, elapsed_ms) do
    # 1. Recovery
    if Map.get(input, "recover", false) do
      num_cps = length(@checkpoints)
      last_cp_idx = rem(boat["nextCheckpoint"] - 1 + num_cps, num_cps)
      last_cp = Enum.at(@checkpoints, last_cp_idx)
      [cpx, cpy, cpz] = last_cp.position

      updated =
        boat
        |> Map.put("position", [cpx, cpy, cpz])
        |> Map.put("speed", 0.0)
        |> Map.put("stunTicks", 15)

      {updated, :recovered}
    else
      # 2. Stun handling
      stun_ticks = boat["stunTicks"] || 0

      {speed, yaw, stun_ticks} =
        if stun_ticks > 0 do
          {boat["speed"] * 0.90, boat["yaw"], stun_ticks - 1}
        else
          steer = Map.get(input, "steer", 0.0) * 1.0
          throttle = Map.get(input, "throttle", 0.0) * 1.0

          eff_turn = steer * @turn_rate * min(1.0, 0.35 + abs(boat["speed"]) / @max_speed)
          new_yaw = boat["yaw"] + eff_turn * @dt

          raw_speed =
            if throttle > 0 do
              boat["speed"] + throttle * @accel * @dt
            else
              boat["speed"] + throttle * @reverse_accel * @dt
            end

          damped = raw_speed * :math.pow(@drag, @dt * 60)
          clamped = max(-2.5, min(@max_speed, damped))
          {clamped, new_yaw, 0}
        end

      # 3. Integrate position
      [px, py, pz] = boat["position"]
      fx = :math.sin(yaw)
      fz = :math.cos(yaw)
      new_px = px + fx * speed * @dt
      new_pz = pz + fz * speed * @dt

      # 4. Canal wall collision
      {final_px, final_pz, final_speed, final_stun, collided?} =
        check_wall_collision(new_px, new_pz, speed, stun_ticks)

      collision_count = boat["collisionCount"] + if(collided?, do: 1, else: 0)

      # 5. Checkpoint / Buoy detection
      next_cp_idx = boat["nextCheckpoint"]
      cp = Enum.at(@checkpoints, next_cp_idx)
      [cpx, _cpy, cpz] = cp.position

      dist = :math.sqrt(:math.pow(final_px - cpx, 2) + :math.pow(final_pz - cpz, 2))

      updated_boat =
        boat
        |> Map.put("position", [final_px, py, final_pz])
        |> Map.put("yaw", yaw)
        |> Map.put("speed", final_speed)
        |> Map.put("stunTicks", final_stun)
        |> Map.put("collisionCount", collision_count)
        |> Map.put("totalTimeMs", elapsed_ms)

      if dist <= cp.radius do
        hit_count = boat["checkpointsHit"] + 1

        {lap, lap_times, finished?, finish_time} =
          if next_cp_idx == 0 and hit_count > 1 do
            prev_lap_total = Enum.sum(boat["lapTimes"])
            this_lap_time = elapsed_ms - prev_lap_total
            times = boat["lapTimes"] ++ [this_lap_time]

            if boat["currentLap"] >= @total_laps do
              {boat["currentLap"], times, true, elapsed_ms}
            else
              {boat["currentLap"] + 1, times, false, nil}
            end
          else
            {boat["currentLap"], boat["lapTimes"], false, nil}
          end

        final_boat =
          updated_boat
          |> Map.put("checkpointsHit", hit_count)
          |> Map.put("nextCheckpoint", rem(next_cp_idx + 1, length(@checkpoints)))
          |> Map.put("currentLap", lap)
          |> Map.put("lapTimes", lap_times)
          |> Map.put("finished", finished?)
          |> Map.put("finishTimeMs", finish_time)
          |> Map.put("speed", if(finished?, do: 0.0, else: final_speed))

        {final_boat, :checkpoint}
      else
        {updated_boat, :tick}
      end
    end
  end

  defp check_wall_collision(px, pz, speed, stun) do
    cond do
      px < @bounds.minX ->
        {@bounds.minX, pz, speed * -0.35, @stun_ticks, true}

      px > @bounds.maxX ->
        {@bounds.maxX, pz, speed * -0.35, @stun_ticks, true}

      pz < @bounds.minZ ->
        {px, @bounds.minZ, speed * -0.35, @stun_ticks, true}

      pz > @bounds.maxZ ->
        {px, @bounds.maxZ, speed * -0.35, @stun_ticks, true}

      true ->
        {px, pz, speed, stun, false}
    end
  end

  defp maybe_finalize_race(sim_state) do
    all_boats = Map.values(sim_state["boats"])

    all_done? =
      length(all_boats) > 0 and
        Enum.all?(all_boats, fn b -> b["finished"] || b["dnf"] end)

    if all_done? do
      ranked =
        Enum.sort_by(all_boats, fn b ->
          cond do
            b["finished"] -> {0, b["finishTimeMs"], b["slot"]}
            b["dnf"] -> {1, -b["checkpointsHit"], b["slot"]}
            true -> {2, 0, b["slot"]}
          end
        end)

      winner =
        case List.first(ranked) do
          %{"finished" => true, "slot" => s} -> s
          _ -> nil
        end

      standings =
        Enum.with_index(ranked, 1)
        |> Enum.map(fn {b, rank} ->
          %{
            "rank" => rank,
            "slot" => b["slot"],
            "finished" => b["finished"],
            "dnf" => b["dnf"],
            "finishTimeMs" => b["finishTimeMs"],
            "checkpointsHit" => b["checkpointsHit"]
          }
        end)

      sim_state =
        sim_state
        |> Map.put("status", "complete")
        |> Map.put("winner", winner)
        |> Map.put("standings", standings)

      details = %{
        "winnerSlot" => winner,
        "winnerTimeMs" => if(winner, do: List.first(ranked)["finishTimeMs"], else: nil),
        "standings" => standings,
        "reason" => "finish"
      }

      {sim_state, {:match_ended, winner, details}}
    else
      {sim_state, nil}
    end
  end
end

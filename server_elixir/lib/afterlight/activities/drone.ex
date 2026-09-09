defmodule Afterlight.Activities.Drone do
  @moduledoc """
  Authoritative server-side drone racing simulation and 60 Hz physics (Task 7.2).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Rooftop flight)
  - `openspec/changes/add-place-activities-program/design.md` (D5, D7)

  Guarantees:
  - 1 to 4 racers on ordered checkpoint course 'rooftop-circuit'.
  - Strict sequential checkpoint advancement (missed checkpoints reject lap count).
  - Accurate lap times, total race times, and deterministic finish ordering.
  - 60 Hz simulation with velocity drag, thrust, frozen environment wind, and boundary collisions.
  - Collision recovery with brief control stun and bounce response.
  - DNF marking for leaving/disconnected pilots without aborting remaining racers.
  """

  @rules_version 1
  @course_id "rooftop-circuit"
  @course_version 1
  @total_laps 2
  @dt 1.0 / 60.0
  @max_speed 22.0
  @drag 0.96
  @stun_ticks 18

  @checkpoints [
    %{index: 0, position: [-3.0, 3.0, 1.0], radius: 2.2, name: "Start/Finish"},
    %{index: 1, position: [5.0, 4.0, -2.0], radius: 2.2, name: "East Awning"},
    %{index: 2, position: [7.0, 5.0, -6.0], radius: 2.2, name: "Skyline Turn"},
    %{index: 3, position: [0.0, 4.5, -7.0], radius: 2.2, name: "Lounge Overpass"},
    %{index: 4, position: [-7.0, 3.5, -4.0], radius: 2.2, name: "Utility Vault"},
    %{index: 5, position: [-6.0, 2.5, 1.0], radius: 2.2, name: "Home Stretch"}
  ]

  @spawn_pads %{
    0 => %{position: [-4.2, 2.0, 2.5], yaw: 0.0},
    1 => %{position: [-3.4, 2.0, 2.5], yaw: 0.0},
    2 => %{position: [-2.6, 2.0, 2.5], yaw: 0.0},
    3 => %{position: [-1.8, 2.0, 2.5], yaw: 0.0}
  }

  @bounds %{
    minX: -12.0,
    maxX: 12.0,
    minY: 1.0,
    maxY: 9.0,
    minZ: -10.0,
    maxZ: 8.0
  }

  def course_id, do: @course_id
  def course_version, do: @course_version
  def total_laps, do: @total_laps
  def checkpoints, do: @checkpoints
  def bounds, do: @bounds

  @doc """
  Initializes drone simulation state.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1]
        list when is_list(list) -> list
      end

    env = Keyword.get(opts, :environment)

    drones =
      Map.new(slots, fn slot ->
        pad = Map.get(@spawn_pads, slot, Map.get(@spawn_pads, 0))
        [px, py, pz] = pad.position

        drone_map = %{
          "slot" => slot,
          "position" => [px, py, pz],
          "velocity" => [0.0, 0.0, 0.0],
          "rotation" => [0.0, pad.yaw, 0.0],
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

        {to_string(slot), drone_map}
      end)

    %{
      "courseId" => @course_id,
      "courseVersion" => @course_version,
      "totalLaps" => @total_laps,
      "status" => "racing",
      "elapsedMs" => 0,
      "tickCount" => 0,
      "drones" => drones,
      "winner" => nil,
      "environment" => env
    }
  end

  @doc """
  Validates player controls for drone racing.
  """
  def validate_controls(controls) when is_map(controls) do
    kind = Map.get(controls, "kind", "flight")

    cond do
      kind == "neutral" ->
        {:ok, %{"kind" => "neutral", "throttle" => 0.0, "pitch" => 0.0, "yaw" => 0.0, "roll" => 0.0}}

      kind == "flight" ->
        throttle = clamp01(Map.get(controls, "throttle", 0.0))
        pitch = clamp_range(Map.get(controls, "pitch", 0.0), -1.0, 1.0)
        yaw = clamp_range(Map.get(controls, "yaw", 0.0), -1.0, 1.0)
        roll = clamp_range(Map.get(controls, "roll", 0.0), -1.0, 1.0)

        {:ok, %{"kind" => "flight", "throttle" => throttle, "pitch" => pitch, "yaw" => yaw, "roll" => roll}}

      true ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Advances drone simulation by steps.
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

    wind =
      case get_in(sim_state, ["environment", "wind"]) do
        [wx, wz] when is_number(wx) and is_number(wz) -> {wx, wz}
        _ -> {0.0, 0.0}
      end

    drones = sim_state["drones"]

    # Step individual drones
    drones =
      Map.new(drones, fn {slot_str, drone} ->
        slot = drone["slot"]
        player = Map.get(players, slot)
        input = (player && player[:input_state]) || %{}

        updated =
          if drone["finished"] or drone["dnf"] do
            drone
          else
            step_drone(drone, input, wind, elapsed_ms)
          end

        {slot_str, updated}
      end)

    # Step drone-drone collisions
    drones = check_drone_collisions(drones)

    # Check race completion
    active_drones =
      drones
      |> Map.values()
      |> Enum.reject(& &1["dnf"])

    all_finished? =
      length(active_drones) > 0 and Enum.all?(active_drones, & &1["finished"])

    if all_finished? do
      ranked = Enum.sort_by(active_drones, & &1["finishTimeMs"])
      winner_drone = List.first(ranked)
      winner_slot = winner_drone["slot"]

      sim_state =
        sim_state
        |> Map.put("elapsedMs", elapsed_ms)
        |> Map.put("tickCount", tick_count)
        |> Map.put("drones", drones)
        |> Map.put("status", "complete")
        |> Map.put("winner", winner_slot)

      details = %{
        "winnerSlot" => winner_slot,
        "winnerTimeMs" => winner_drone["finishTimeMs"],
        "reason" => "finish"
      }

      {sim_state, {:match_ended, winner_slot, details}}
    else
      sim_state =
        sim_state
        |> Map.put("elapsedMs", elapsed_ms)
        |> Map.put("tickCount", tick_count)
        |> Map.put("drones", drones)

      do_step_simulation(sim_state, players, steps - 1)
    end
  end

  defp step_drone(drone, input, {wind_x, wind_z}, elapsed_ms) do
    stun_ticks = max(0, drone["stunTicks"] - 1)
    [pitch, yaw, roll] = drone["rotation"]
    [vx, vy, vz] = drone["velocity"]
    [px, py, pz] = drone["position"]

    # Turning
    yaw_input = if stun_ticks > 0, do: 0.0, else: Map.get(input, "yaw", 0.0) * 1.0
    new_yaw = yaw + yaw_input * 3.5 * @dt

    target_pitch = Map.get(input, "pitch", 0.0) * 0.45
    target_roll = Map.get(input, "roll", 0.0) * 0.55
    new_pitch = pitch + (target_pitch - pitch) * 0.2
    new_roll = roll + (target_roll - roll) * 0.2

    # Forward direction
    forward_x = :math.sin(new_yaw)
    forward_z = -:math.cos(new_yaw)

    {ax, ay, az} =
      if stun_ticks == 0 do
        throttle = Map.get(input, "throttle", 0.0) * 1.0
        p_in = Map.get(input, "pitch", 0.0) * 1.0
        thrust = throttle * 18.0 + p_in * 8.0

        {
          forward_x * thrust + wind_x * 3.5,
          (throttle - 0.42) * 14.0,
          forward_z * thrust + wind_z * 3.5
        }
      else
        {wind_x * 3.5, -4.0, wind_z * 3.5}
      end

    new_vx = (vx + ax * @dt) * @drag
    new_vy = (vy + ay * @dt) * @drag
    new_vz = (vz + az * @dt) * @drag

    speed = :math.sqrt(new_vx * new_vx + new_vy * new_vy + new_vz * new_vz)

    {new_vx, new_vy, new_vz} =
      if speed > @max_speed do
        scale = @max_speed / speed
        {new_vx * scale, new_vy * scale, new_vz * scale}
      else
        {new_vx, new_vy, new_vz}
      end

    new_px = px + new_vx * @dt
    new_py = py + new_vy * @dt
    new_pz = pz + new_vz * @dt

    # Boundary collision
    {new_px, new_vx, coll_x} = clamp_axis(new_px, new_vx, @bounds.minX, @bounds.maxX)
    {new_py, new_vy, coll_y} = clamp_axis(new_py, new_vy, @bounds.minY, @bounds.maxY)
    {new_pz, new_vz, coll_z} = clamp_axis(new_pz, new_vz, @bounds.minZ, @bounds.maxZ)

    collided? = coll_x or coll_y or coll_z
    stun_ticks = if collided?, do: @stun_ticks, else: stun_ticks
    coll_count = drone["collisionCount"] + if(collided?, do: 1, else: 0)

    drone =
      drone
      |> Map.put("position", [new_px, new_py, new_pz])
      |> Map.put("velocity", [new_vx, new_vy, new_vz])
      |> Map.put("rotation", [new_pitch, new_yaw, new_roll])
      |> Map.put("stunTicks", stun_ticks)
      |> Map.put("collisionCount", coll_count)

    # Checkpoint passing
    check_checkpoint(drone, elapsed_ms)
  end

  defp check_checkpoint(drone, elapsed_ms) do
    target_idx = drone["nextCheckpoint"]
    target = Enum.find(@checkpoints, &(&1.index == target_idx))

    if target do
      [px, py, pz] = drone["position"]
      [tx, ty, tz] = target.position
      dist = :math.sqrt(:math.pow(px - tx, 2) + :math.pow(py - ty, 2) + :math.pow(pz - tz, 2))

      if dist <= target.radius do
        next_idx = rem(target_idx + 1, length(@checkpoints))
        hit_count = drone["checkpointsHit"] + 1

        drone =
          drone
          |> Map.put("nextCheckpoint", next_idx)
          |> Map.put("checkpointsHit", hit_count)

        if next_idx == 0 do
          # Lap complete
          prev_laps_total = Enum.sum(drone["lapTimes"])
          lap_duration = elapsed_ms - prev_laps_total
          lap_times = drone["lapTimes"] ++ [lap_duration]

          if length(lap_times) >= @total_laps do
            drone
            |> Map.put("lapTimes", lap_times)
            |> Map.put("finished", true)
            |> Map.put("finishTimeMs", elapsed_ms)
            |> Map.put("totalTimeMs", elapsed_ms)
          else
            drone
            |> Map.put("lapTimes", lap_times)
            |> Map.put("currentLap", drone["currentLap"] + 1)
          end
        else
          drone
        end
      else
        drone
      end
    else
      drone
    end
  end

  defp check_drone_collisions(drones) do
    keys = Map.keys(drones)

    Enum.reduce(for(i <- keys, j <- keys, i < j, do: {i, j}), drones, fn {k1, k2}, acc ->
      d1 = acc[k1]
      d2 = acc[k2]

      if d1["finished"] or d1["dnf"] or d2["finished"] or d2["dnf"] do
        acc
      else
        [x1, y1, z1] = d1["position"]
        [x2, y2, z2] = d2["position"]
        dist = :math.sqrt(:math.pow(x1 - x2, 2) + :math.pow(y1 - y2, 2) + :math.pow(z1 - z2, 2))

        if dist < 0.8 and dist > 0.001 do
          nx = (x1 - x2) / dist
          ny = (y1 - y2) / dist
          nz = (z1 - z2) / dist

          [vx1, vy1, vz1] = d1["velocity"]
          [vx2, vy2, vz2] = d2["velocity"]

          d1 =
            d1
            |> Map.put("velocity", [vx1 + nx * 4.0, vy1 + ny * 2.0, vz1 + nz * 4.0])
            |> Map.put("stunTicks", 12)
            |> Map.put("collisionCount", d1["collisionCount"] + 1)

          d2 =
            d2
            |> Map.put("velocity", [vx2 - nx * 4.0, vy2 - ny * 2.0, vz2 - nz * 4.0])
            |> Map.put("stunTicks", 12)
            |> Map.put("collisionCount", d2["collisionCount"] + 1)

          acc
          |> Map.put(k1, d1)
          |> Map.put(k2, d2)
        else
          acc
        end
      end
    end)
  end

  @doc """
  Marks a pilot as DNF.
  """
  def mark_dnf(sim_state, slot, reason \\ nil) do
    slot_str = to_string(slot)

    drones =
      case sim_state["drones"][slot_str] do
        nil ->
          sim_state["drones"]

        drone ->
          updated =
            drone
            |> Map.put("dnf", true)
            |> Map.put("dnfReason", reason)
            |> Map.put("velocity", [0.0, 0.0, 0.0])

          Map.put(sim_state["drones"], slot_str, updated)
      end

    active =
      drones
      |> Map.values()
      |> Enum.reject(& &1["dnf"])

    if length(active) > 0 and Enum.all?(active, & &1["finished"]) do
      ranked = Enum.sort_by(active, & &1["finishTimeMs"])
      winner_slot = List.first(ranked)["slot"]

      sim_state
      |> Map.put("drones", drones)
      |> Map.put("status", "complete")
      |> Map.put("winner", winner_slot)
    else
      Map.put(sim_state, "drones", drones)
    end
  end

  defp clamp_axis(p, v, min_val, max_val) do
    cond do
      p < min_val -> {min_val, v * -0.5, true}
      p > max_val -> {max_val, v * -0.5, true}
      true -> {p, v, false}
    end
  end

  defp clamp01(v) when is_number(v), do: max(0.0, min(1.0, v * 1.0))
  defp clamp01(_), do: 0.0

  defp clamp_range(v, min_v, max_v) when is_number(v), do: max(min_v * 1.0, min(max_v * 1.0, v * 1.0))
  defp clamp_range(_, min_v, _), do: min_v * 1.0
end

defmodule Afterlight.Activities.RainRunner do
  @moduledoc """
  Authoritative server-side Rain Runner rules and 60 Hz simulation.

  Single-player arcade racer in a rain-slicked industrial neon corridor:
  - Authoritative steering, throttle/brake, and physics.
  - Seeded, deterministic procedural obstacle generation (barriers, puddles, pylons).
  - Continuous forward distance tracking and score accumulation.
  - Pixel/AABB collision detection against obstacles causing run crash.
  - Strict 10-minute run cap (36,000 ticks at 60 Hz).
  - Compact serialization (< 1 KiB per snapshot).

  Conforms to:
  - openspec/changes/add-place-activities-program/specs/orpheum-arcade/spec.md
  """

  @road_width 360.0
  @half_road_width 180.0
  @player_width 32.0
  @player_length 54.0
  @base_speed 6.0
  @min_speed 3.5
  @max_speed 14.0
  @steer_speed 6.5
  @steer_friction 0.88
  # 10 minutes at 60 Hz
  @run_cap_ticks 36_000
  @horizon_distance 800.0
  @spawn_interval_distance 180.0

  @doc "Road width"
  def road_width, do: @road_width

  @doc "Run cap in ticks"
  def run_cap_ticks, do: @run_cap_ticks

  @doc """
  Initializes a fresh Rain Runner simulation state with an optional seed.
  """
  def init_sim_state(opts \\ []) do
    seed = Keyword.get(opts, :seed, :erlang.phash2(:os.system_time(:microsecond), 1_000_000))

    %{
      "roadWidth" => round(@road_width),
      "player" => %{
        "x" => 0.0,
        "vx" => 0.0,
        "speed" => @base_speed,
        "width" => round(@player_width),
        "length" => round(@player_length)
      },
      "distance" => 0.0,
      "score" => 0,
      "obstacles" => [],
      "nextObstacleDistance" => @spawn_interval_distance,
      "obstacleCounter" => 0,
      "seed" => seed,
      "rngState" => seed,
      "state" => "running",
      "tick" => 0
    }
  end

  @doc """
  Steps the Rain Runner simulation by `steps` ticks (1..4 at 60 Hz).
  `players` is a map of slot (0) => player map containing `input_state`.

  Returns `{updated_sim_state, outcome}`:
  - `outcome` is `{:match_ended, 0, [reason: reason, score: score, distance: distance]}` on crash or cap.
  - `outcome` is `nil` while the run continues.
  """
  def step(sim_state, players, steps)
      when is_map(sim_state) and is_integer(steps) and steps > 0 do
    Enum.reduce_while(1..steps, {sim_state, nil}, fn _step_idx, {curr_state, _} ->
      case step_single(curr_state, players) do
        {next_state, {:match_ended, _, _} = ended} ->
          {:halt, {round_state(next_state), ended}}

        {next_state, nil} ->
          {:cont, {next_state, nil}}
      end
    end)
    |> then(fn {final_state, maybe_ended} ->
      {round_state(final_state), maybe_ended}
    end)
  end

  # Step a single discrete tick (1/60th of a second)
  defp step_single(state, players) do
    curr_tick = Map.get(state, "tick", 0) + 1
    state = Map.put(state, "tick", curr_tick)

    # 1. Enforce 10-minute run cap
    if curr_tick >= @run_cap_ticks do
      final_score = Map.get(state, "score", 0)
      final_dist = Map.get(state, "distance", 0.0)

      ended_state =
        state
        |> Map.put("state", "completed")

      {ended_state,
       {:match_ended, 0, %{reason: "run_cap", score: final_score, distance: final_dist}}}
    else
      # Extract controls from player slot 0
      p0 = Map.get(players, 0) || Map.get(players, "0")
      controls = if p0, do: p0.input_state || %{}, else: %{}

      steer_input = extract_axis(controls, "steer", "left", "right")
      throttle_input = extract_axis(controls, "throttle", "down", "up")

      # 2. Update player speed and position
      player = state["player"]
      curr_speed = Map.get(player, "speed", @base_speed)
      curr_x = Map.get(player, "x", 0.0)
      curr_vx = Map.get(player, "vx", 0.0)

      # Target speed based on throttle/brake
      target_speed =
        cond do
          throttle_input > 0.1 ->
            min(curr_speed + 0.15, @max_speed)

          throttle_input < -0.1 ->
            max(curr_speed - 0.25, @min_speed)

          true ->
            # Gradually return towards distance-scaled cruising speed
            dist_factor = min(state["distance"] / 10_000.0, 1.0)
            cruising = @base_speed + dist_factor * 3.0

            if curr_speed > cruising,
              do: max(curr_speed - 0.05, cruising),
              else: min(curr_speed + 0.05, cruising)
        end

      # Horizontal velocity from steering
      new_vx = curr_vx * @steer_friction + steer_input * @steer_speed * 0.25
      new_x = curr_x + new_vx

      # Road boundaries clamp
      max_player_x = @half_road_width - @player_width / 2.0

      {clamped_x, final_vx} =
        cond do
          new_x > max_player_x -> {max_player_x, 0.0}
          new_x < -max_player_x -> {-max_player_x, 0.0}
          true -> {new_x, new_vx}
        end

      updated_player = %{
        player
        | "x" => clamped_x,
          "vx" => final_vx,
          "speed" => target_speed
      }

      # 3. Advance distance and score
      new_distance = state["distance"] + target_speed
      speed_multiplier = target_speed / @base_speed
      score_gain = round(target_speed * speed_multiplier * 0.2)
      new_score = state["score"] + score_gain

      # 4. Advance obstacles (move towards player as player drives forward)
      obstacles = state["obstacles"] || []
      relative_forward = target_speed

      updated_obstacles =
        Enum.map(obstacles, fn obs ->
          Map.put(obs, "z", obs["z"] - relative_forward)
        end)
        # reap passed obstacles
        |> Enum.filter(fn obs -> obs["z"] > -100.0 end)

      # 5. Spawn new obstacles
      {spawned_obstacles, next_spawn_dist, next_counter, next_rng} =
        maybe_spawn_obstacles(
          updated_obstacles,
          new_distance,
          state["nextObstacleDistance"],
          state["obstacleCounter"],
          state["rngState"]
        )

      # 6. Check collision with obstacles
      collision? = check_collisions(clamped_x, spawned_obstacles)

      if collision? do
        ended_state =
          state
          |> Map.put("player", updated_player)
          |> Map.put("distance", new_distance)
          |> Map.put("score", new_score)
          |> Map.put("obstacles", spawned_obstacles)
          |> Map.put("state", "crashed")

        {ended_state,
         {:match_ended, 0, %{reason: "collision", score: new_score, distance: new_distance}}}
      else
        next_state =
          state
          |> Map.put("player", updated_player)
          |> Map.put("distance", new_distance)
          |> Map.put("score", new_score)
          |> Map.put("obstacles", spawned_obstacles)
          |> Map.put("nextObstacleDistance", next_spawn_dist)
          |> Map.put("obstacleCounter", next_counter)
          |> Map.put("rngState", next_rng)

        {next_state, nil}
      end
    end
  end

  # Extracts normalized -1.0 .. 1.0 axis from either numeric axis or boolean keys
  defp extract_axis(controls, axis_key, neg_key, pos_key) do
    cond do
      is_number(controls[axis_key]) ->
        min(max(controls[axis_key] * 1.0, -1.0), 1.0)

      is_number(controls[String.to_atom(axis_key)]) ->
        min(max(controls[String.to_atom(axis_key)] * 1.0, -1.0), 1.0)

      true ->
        neg = if controls[neg_key] || controls[String.to_atom(neg_key)], do: 1.0, else: 0.0
        pos = if controls[pos_key] || controls[String.to_atom(pos_key)], do: 1.0, else: 0.0
        pos - neg
    end
  end

  # Spawns obstacles ahead on the horizon using deterministic LCG pseudo-random generator
  defp maybe_spawn_obstacles(obstacles, curr_distance, next_spawn_dist, counter, rng_state) do
    if curr_distance >= next_spawn_dist do
      # LCG random step: (A * state + C) mod M
      next_rng = rem(rng_state * 1_103_515_245 + 12_345, 2_147_483_648)
      lane_val = rem(next_rng, 1000) / 1000.0

      next_rng2 = rem(next_rng * 1_103_515_245 + 12_345, 2_147_483_648)
      type_val = rem(next_rng2, 1000) / 1000.0

      # Position obstacle across lanes
      # 3 primary lanes: left (-100), center (0), right (100)
      lane_x =
        cond do
          lane_val < 0.33 -> -90.0 + lane_val * 60.0
          lane_val < 0.66 -> -20.0 + (lane_val - 0.33) * 60.0
          true -> 70.0 + (lane_val - 0.66) * 60.0
        end

      {obs_type, obs_w, obs_h} =
        cond do
          type_val < 0.45 -> {"barrier", 55.0, 24.0}
          type_val < 0.75 -> {"pylon", 34.0, 34.0}
          true -> {"puddle", 65.0, 40.0}
        end

      new_obstacle = %{
        "id" => counter + 1,
        "type" => obs_type,
        "x" => lane_x,
        "z" => @horizon_distance,
        "w" => obs_w,
        "h" => obs_h
      }

      # Distance spacing decreases slightly as run progresses
      progression = min(curr_distance / 15_000.0, 0.5)
      spacing = @spawn_interval_distance * (1.0 - progression * 0.4)

      {[new_obstacle | obstacles], curr_distance + spacing, counter + 1, next_rng2}
    else
      {obstacles, next_spawn_dist, counter, rng_state}
    end
  end

  # Check if player collides with any solid obstacle near z = 0
  defp check_collisions(player_x, obstacles) do
    # Player bounding box at z = 0
    p_half_w = @player_width / 2.0
    p_half_l = @player_length / 2.0
    p_min_x = player_x - p_half_w
    p_max_x = player_x + p_half_w
    p_min_z = -p_half_l
    p_max_z = p_half_l

    Enum.any?(obstacles, fn obs ->
      # Puddles are slippery/visual, only barriers and pylons are crash collisions
      is_solid = obs["type"] == "barrier" or obs["type"] == "pylon"

      if is_solid do
        o_half_w = obs["w"] / 2.0
        o_half_h = obs["h"] / 2.0
        o_min_x = obs["x"] - o_half_w
        o_max_x = obs["x"] + o_half_w
        o_min_z = obs["z"] - o_half_h
        o_max_z = obs["z"] + o_half_h

        # AABB overlap test
        overlap_x = p_min_x < o_max_x and p_max_x > o_min_x
        overlap_z = p_min_z < o_max_z and p_max_z > o_min_z

        overlap_x and overlap_z
      else
        false
      end
    end)
  end

  # Round float values for compact transmission
  defp round_state(state) do
    player = state["player"]

    rounded_player = %{
      player
      | "x" => Float.round(player["x"] * 1.0, 1),
        "vx" => Float.round(player["vx"] * 1.0, 2),
        "speed" => Float.round(player["speed"] * 1.0, 2)
    }

    rounded_obstacles =
      Enum.map(state["obstacles"] || [], fn obs ->
        %{
          obs
          | "x" => Float.round(obs["x"] * 1.0, 1),
            "z" => Float.round(obs["z"] * 1.0, 1)
        }
      end)

    %{
      state
      | "player" => rounded_player,
        "distance" => Float.round(state["distance"] * 1.0, 1),
        "obstacles" => rounded_obstacles
    }
  end
end

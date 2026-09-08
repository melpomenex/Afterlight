defmodule Afterlight.Activities.SignalLost do
  @moduledoc """
  Authoritative server-side Signal Lost rules and 60 Hz simulation.

  Vector space survival shooter in an asteroid field:
  - 800x600 toroidal wrapping arena.
  - Ship inertial thrust, rotation, and laser fire.
  - 3 lives with post-respawn invulnerability timer.
  - Multi-tier asteroid splitting (large -> 2 medium -> 2 small).
  - Wave progression and score accumulation.
  - Strict 10-minute run cap (36,000 ticks at 60 Hz).
  - Compact snapshot serialization (< 1.5 KiB per state).

  Conforms to:
  - openspec/changes/add-place-activities-program/specs/orpheum-arcade/spec.md
  """

  @arena_width 800.0
  @arena_height 600.0
  @ship_radius 14.0
  @ship_drag 0.985
  @ship_accel 0.28
  @ship_max_speed 8.5
  @rotation_speed 0.08
  @fire_cooldown_ticks 10
  @projectile_speed 12.0
  @projectile_life_ticks 65
  @projectile_radius 3.0
  @max_projectiles 6
  @invulnerable_ticks 120
  # 10 minutes at 60 Hz
  @run_cap_ticks 36_000

  @large_radius 36.0
  @medium_radius 22.0
  @small_radius 12.0

  @large_score 20
  @medium_score 50
  @small_score 100

  @doc "Arena width"
  def arena_width, do: @arena_width

  @doc "Arena height"
  def arena_height, do: @arena_height

  @doc "Run cap in ticks"
  def run_cap_ticks, do: @run_cap_ticks

  @doc """
  Initializes a fresh Signal Lost simulation state.
  """
  def init_sim_state(opts \\ []) do
    seed = Keyword.get(opts, :seed, :erlang.phash2(:os.system_time(:microsecond), 1_000_000))
    initial_wave = Keyword.get(opts, :wave, 1)

    {asteroids, next_rng, next_id} = spawn_wave(initial_wave, seed, 0)

    %{
      "width" => round(@arena_width),
      "height" => round(@arena_height),
      "ship" => %{
        "x" => @arena_width / 2.0,
        "y" => @arena_height / 2.0,
        # facing up
        "angle" => -:math.pi() / 2.0,
        "vx" => 0.0,
        "vy" => 0.0,
        "thrusting" => false,
        "invulnerable" => @invulnerable_ticks
      },
      "lives" => 3,
      "score" => 0,
      "wave" => initial_wave,
      "asteroids" => asteroids,
      "projectiles" => [],
      "fireCooldown" => 0,
      "nextWaveDelay" => 0,
      "entityCounter" => next_id,
      "seed" => seed,
      "rngState" => next_rng,
      "state" => "running",
      "tick" => 0
    }
  end

  @doc """
  Steps the Signal Lost simulation by `steps` ticks (1..4 at 60 Hz).
  `players` is a map of slot (0) => player map containing `input_state`.

  Returns `{updated_sim_state, outcome}`:
  - `outcome` is `{:match_ended, 0, %{reason: reason, score: score, wave: wave}}` on game over or cap.
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

  # Single tick step
  defp step_single(state, players) do
    curr_tick = Map.get(state, "tick", 0) + 1
    state = Map.put(state, "tick", curr_tick)

    # 1. Enforce 10-minute run cap
    if curr_tick >= @run_cap_ticks do
      final_score = Map.get(state, "score", 0)
      final_wave = Map.get(state, "wave", 1)

      ended_state =
        state
        |> Map.put("state", "completed")

      {ended_state, {:match_ended, 0, %{reason: "run_cap", score: final_score, wave: final_wave}}}
    else
      # Extract controls
      p0 = Map.get(players, 0) || Map.get(players, "0")
      controls = if p0, do: p0.input_state || %{}, else: %{}

      rot_input = extract_axis(controls, "rotate", "left", "right")
      thrust_input = extract_thrust(controls)
      fire_input = extract_fire(controls)

      # 2. Update ship rotation and thrust
      ship = state["ship"]
      curr_angle = ship["angle"] + rot_input * @rotation_speed

      curr_vx = ship["vx"] * @ship_drag
      curr_vy = ship["vy"] * @ship_drag

      {new_vx, new_vy, is_thrusting} =
        if thrust_input > 0.1 do
          ax = :math.cos(curr_angle) * @ship_accel * thrust_input
          ay = :math.sin(curr_angle) * @ship_accel * thrust_input
          vx = curr_vx + ax
          vy = curr_vy + ay
          speed = :math.sqrt(vx * vx + vy * vy)

          if speed > @ship_max_speed do
            scale = @ship_max_speed / speed
            {vx * scale, vy * scale, true}
          else
            {vx, vy, true}
          end
        else
          {curr_vx, curr_vy, false}
        end

      # Move and wrap ship
      new_ship_x = wrap(ship["x"] + new_vx, @arena_width)
      new_ship_y = wrap(ship["y"] + new_vy, @arena_height)
      new_invuln = max(0, ship["invulnerable"] - 1)

      updated_ship = %{
        ship
        | "x" => new_ship_x,
          "y" => new_ship_y,
          "angle" => curr_angle,
          "vx" => new_vx,
          "vy" => new_vy,
          "thrusting" => is_thrusting,
          "invulnerable" => new_invuln
      }

      # 3. Fire projectiles
      fire_cd = max(0, Map.get(state, "fireCooldown", 0) - 1)
      current_projs = state["projectiles"] || []
      entity_counter = Map.get(state, "entityCounter", 0)

      {new_projs, next_cd, next_entity_counter} =
        if fire_input and fire_cd == 0 and length(current_projs) < @max_projectiles do
          proj_vx = :math.cos(curr_angle) * @projectile_speed + new_vx * 0.3
          proj_vy = :math.sin(curr_angle) * @projectile_speed + new_vy * 0.3
          nose_dist = @ship_radius + 4.0
          proj_x = wrap(new_ship_x + :math.cos(curr_angle) * nose_dist, @arena_width)
          proj_y = wrap(new_ship_y + :math.sin(curr_angle) * nose_dist, @arena_height)

          bullet = %{
            "id" => entity_counter + 1,
            "x" => proj_x,
            "y" => proj_y,
            "vx" => proj_vx,
            "vy" => proj_vy,
            "life" => @projectile_life_ticks
          }

          {[bullet | current_projs], @fire_cooldown_ticks, entity_counter + 1}
        else
          {current_projs, fire_cd, entity_counter}
        end

      # Move and age projectiles
      moved_projs =
        Enum.map(new_projs, fn p ->
          %{
            p
            | "x" => wrap(p["x"] + p["vx"], @arena_width),
              "y" => wrap(p["y"] + p["vy"], @arena_height),
              "life" => p["life"] - 1
          }
        end)
        |> Enum.filter(fn p -> p["life"] > 0 end)

      # 4. Move asteroids
      moved_asteroids =
        Enum.map(state["asteroids"] || [], fn ast ->
          %{
            ast
            | "x" => wrap(ast["x"] + ast["vx"], @arena_width),
              "y" => wrap(ast["y"] + ast["vy"], @arena_height)
          }
        end)

      # 5. Projectile vs Asteroid collisions
      {surviving_projs, surviving_asteroids, spawned_splits, points_earned, rng_after_hits,
       counter_after_hits} =
        resolve_projectile_hits(
          moved_projs,
          moved_asteroids,
          state["rngState"],
          next_entity_counter
        )

      all_asteroids = surviving_asteroids ++ spawned_splits
      new_score = state["score"] + points_earned

      # 6. Wave advancement check
      next_wave_delay = state["nextWaveDelay"] || 0
      curr_wave = state["wave"] || 1

      {final_asteroids, next_wave, next_delay, rng_after_wave, counter_after_wave} =
        cond do
          all_asteroids == [] and next_wave_delay == 0 ->
            # Start brief countdown before next wave
            {[], curr_wave, 60, rng_after_hits, counter_after_hits}

          all_asteroids == [] and next_wave_delay > 1 ->
            {[], curr_wave, next_wave_delay - 1, rng_after_hits, counter_after_hits}

          all_asteroids == [] and next_wave_delay == 1 ->
            # Spawn next wave
            new_w = curr_wave + 1
            {spawned_w, r, c} = spawn_wave(new_w, rng_after_hits, counter_after_hits)
            {spawned_w, new_w, 0, r, c}

          true ->
            {all_asteroids, curr_wave, 0, rng_after_hits, counter_after_hits}
        end

      # 7. Ship vs Asteroid collision (if ship is not invulnerable)
      ship_hit? =
        if updated_ship["invulnerable"] == 0 do
          check_ship_collision(updated_ship, final_asteroids)
        else
          false
        end

      if ship_hit? do
        curr_lives = state["lives"] - 1

        if curr_lives <= 0 do
          ended_state =
            state
            |> Map.put("ship", updated_ship)
            |> Map.put("lives", 0)
            |> Map.put("score", new_score)
            |> Map.put("state", "crashed")

          {ended_state,
           {:match_ended, 0, %{reason: "lives_depleted", score: new_score, wave: next_wave}}}
        else
          # Respawn ship at center with fresh invulnerability
          respawned_ship = %{
            updated_ship
            | "x" => @arena_width / 2.0,
              "y" => @arena_height / 2.0,
              "vx" => 0.0,
              "vy" => 0.0,
              "invulnerable" => @invulnerable_ticks
          }

          next_state =
            state
            |> Map.put("ship", respawned_ship)
            |> Map.put("lives", curr_lives)
            |> Map.put("score", new_score)
            |> Map.put("asteroids", final_asteroids)
            |> Map.put("projectiles", surviving_projs)
            |> Map.put("fireCooldown", next_cd)
            |> Map.put("wave", next_wave)
            |> Map.put("nextWaveDelay", next_delay)
            |> Map.put("entityCounter", counter_after_wave)
            |> Map.put("rngState", rng_after_wave)

          {next_state, nil}
        end
      else
        next_state =
          state
          |> Map.put("ship", updated_ship)
          |> Map.put("score", new_score)
          |> Map.put("asteroids", final_asteroids)
          |> Map.put("projectiles", surviving_projs)
          |> Map.put("fireCooldown", next_cd)
          |> Map.put("wave", next_wave)
          |> Map.put("nextWaveDelay", next_delay)
          |> Map.put("entityCounter", counter_after_wave)
          |> Map.put("rngState", rng_after_wave)

        {next_state, nil}
      end
    end
  end

  # Helper: toroidal wrapping in [0, max)
  defp wrap(val, max) do
    rem = :math.fmod(val, max)
    if rem < 0.0, do: rem + max, else: rem
  end

  # Extract rotation axis (-1.0 to 1.0)
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

  # Extract thrust input (0.0 to 1.0)
  defp extract_thrust(controls) do
    cond do
      is_number(controls["thrust"]) ->
        min(max(controls["thrust"] * 1.0, 0.0), 1.0)

      is_number(controls[:thrust]) ->
        min(max(controls[:thrust] * 1.0, 0.0), 1.0)

      controls["up"] || controls[:up] || controls["w"] || controls[:w] || controls["thrust"] ||
          controls[:thrust] ->
        1.0

      true ->
        0.0
    end
  end

  # Extract fire button (boolean)
  defp extract_fire(controls) do
    controls["fire"] || controls[:fire] || controls["space"] || controls[:space] || false
  end

  # Spawn initial or next wave of large asteroids
  defp spawn_wave(wave, rng_state, counter) do
    count = 3 + wave

    Enum.reduce(1..count, {[], rng_state, counter}, fn _i, {acc, rng, c} ->
      next_rng = rem(rng * 1_103_515_245 + 12_345, 2_147_483_648)
      next_rng2 = rem(next_rng * 1_103_515_245 + 12_345, 2_147_483_648)
      next_rng3 = rem(next_rng2 * 1_103_515_245 + 12_345, 2_147_483_648)

      # Spawn away from center
      edge_side = rem(next_rng, 4)

      {sx, sy} =
        case edge_side do
          0 -> {rem(next_rng2, round(@arena_width)) * 1.0, 30.0}
          1 -> {rem(next_rng2, round(@arena_width)) * 1.0, @arena_height - 30.0}
          2 -> {30.0, rem(next_rng2, round(@arena_height)) * 1.0}
          _ -> {@arena_width - 30.0, rem(next_rng2, round(@arena_height)) * 1.0}
        end

      angle = rem(next_rng3, 628) / 100.0
      speed = 0.8 + rem(next_rng, 100) / 100.0 * 1.2
      vx = :math.cos(angle) * speed
      vy = :math.sin(angle) * speed

      ast = %{
        "id" => c + 1,
        "type" => "large",
        "radius" => @large_radius,
        "x" => sx,
        "y" => sy,
        "vx" => vx,
        "vy" => vy
      }

      {[ast | acc], next_rng3, c + 1}
    end)
  end

  # Check bullet vs asteroid collisions
  defp resolve_projectile_hits(projectiles, asteroids, rng_state, counter) do
    Enum.reduce(projectiles, {[], asteroids, [], 0, rng_state, counter}, fn proj,
                                                                            {surv_projs,
                                                                             curr_asts,
                                                                             new_splits,
                                                                             score_acc, rng, c} ->
      hit_ast =
        Enum.find(curr_asts, fn ast ->
          dx = proj["x"] - ast["x"]
          dy = proj["y"] - ast["y"]
          dist_sq = dx * dx + dy * dy
          r = ast["radius"] + @projectile_radius
          dist_sq <= r * r
        end)

      if hit_ast do
        # Hit! Bullet is destroyed, asteroid is split or removed
        remaining_asts = List.delete(curr_asts, hit_ast)
        {splits, points, next_rng, next_c} = split_asteroid(hit_ast, rng, c)

        {surv_projs, remaining_asts, new_splits ++ splits, score_acc + points, next_rng, next_c}
      else
        {[proj | surv_projs], curr_asts, new_splits, score_acc, rng, c}
      end
    end)
  end

  # Split asteroid on bullet hit
  defp split_asteroid(%{"type" => "large"} = ast, rng, counter) do
    # Splits into 2 medium
    angle1 = :math.atan2(ast["vy"], ast["vx"]) + 0.6
    angle2 = :math.atan2(ast["vy"], ast["vx"]) - 0.6
    speed = 1.8

    m1 = %{
      "id" => counter + 1,
      "type" => "medium",
      "radius" => @medium_radius,
      "x" => ast["x"],
      "y" => ast["y"],
      "vx" => :math.cos(angle1) * speed,
      "vy" => :math.sin(angle1) * speed
    }

    m2 = %{
      "id" => counter + 2,
      "type" => "medium",
      "radius" => @medium_radius,
      "x" => ast["x"],
      "y" => ast["y"],
      "vx" => :math.cos(angle2) * speed,
      "vy" => :math.sin(angle2) * speed
    }

    {[m1, m2], @large_score, rng, counter + 2}
  end

  defp split_asteroid(%{"type" => "medium"} = ast, rng, counter) do
    # Splits into 2 small
    angle1 = :math.atan2(ast["vy"], ast["vx"]) + 0.8
    angle2 = :math.atan2(ast["vy"], ast["vx"]) - 0.8
    speed = 2.4

    s1 = %{
      "id" => counter + 1,
      "type" => "small",
      "radius" => @small_radius,
      "x" => ast["x"],
      "y" => ast["y"],
      "vx" => :math.cos(angle1) * speed,
      "vy" => :math.sin(angle1) * speed
    }

    s2 = %{
      "id" => counter + 2,
      "type" => "small",
      "radius" => @small_radius,
      "x" => ast["x"],
      "y" => ast["y"],
      "vx" => :math.cos(angle2) * speed,
      "vy" => :math.sin(angle2) * speed
    }

    {[s1, s2], @medium_score, rng, counter + 2}
  end

  defp split_asteroid(%{"type" => "small"}, rng, counter) do
    # Destroyed
    {[], @small_score, rng, counter}
  end

  # Check ship collision with any asteroid
  defp check_ship_collision(ship, asteroids) do
    Enum.any?(asteroids, fn ast ->
      dx = ship["x"] - ast["x"]
      dy = ship["y"] - ast["y"]
      dist_sq = dx * dx + dy * dy
      r = ast["radius"] + @ship_radius
      dist_sq <= r * r
    end)
  end

  # Round float fields for network snapshot
  defp round_state(state) do
    ship = state["ship"]

    rounded_ship = %{
      ship
      | "x" => Float.round(ship["x"] * 1.0, 1),
        "y" => Float.round(ship["y"] * 1.0, 1),
        "angle" => Float.round(ship["angle"] * 1.0, 2),
        "vx" => Float.round(ship["vx"] * 1.0, 2),
        "vy" => Float.round(ship["vy"] * 1.0, 2)
    }

    rounded_asts =
      Enum.map(state["asteroids"] || [], fn ast ->
        %{
          ast
          | "x" => Float.round(ast["x"] * 1.0, 1),
            "y" => Float.round(ast["y"] * 1.0, 1),
            "vx" => Float.round(ast["vx"] * 1.0, 2),
            "vy" => Float.round(ast["vy"] * 1.0, 2)
        }
      end)

    rounded_projs =
      Enum.map(state["projectiles"] || [], fn p ->
        %{
          p
          | "x" => Float.round(p["x"] * 1.0, 1),
            "y" => Float.round(p["y"] * 1.0, 1)
        }
      end)

    %{
      state
      | "ship" => rounded_ship,
        "asteroids" => rounded_asts,
        "projectiles" => rounded_projs
    }
  end
end

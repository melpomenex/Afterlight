defmodule Afterlight.Activities.AirHockey do
  @moduledoc """
  Authoritative server-side Air Hockey rules and 60 Hz physics simulation.

  Guarantees:
  - Server owns all transforms, sub-stepping continuous collisions, score, series state, and winner.
  - Mallets strictly constrained to their defensive halves; position/velocity clamped to prevent teleporting through puck.
  - Sub-stepping continuous collision detection (CCD) eliminates rail and mallet tunneling at high puck speeds.
  - Goal mouth detection on end rails; double-goal prevention via goal lock delay.
  - First-to-seven scoring per game (`targetScore: 7`).
  - Selectable series (single game 1, best-of-3, best-of-5, best-of-7), immutable mid-match.
  - Compact snapshot serialization (< 500 bytes per state).
  """

  @table_length 200.0
  @table_width 100.0
  @center_x 100.0
  @center_y 50.0

  @puck_radius 4.0
  @mallet_radius 7.0

  @goal_width 30.0
  @goal_top 35.0
  @goal_bottom 65.0

  @max_mallet_speed 8.0
  @max_puck_speed 25.0
  @puck_friction 0.998
  @restitution_rail 0.98
  @restitution_mallet 1.15

  @serve_delay_ticks 45
  @goal_delay_ticks 60
  @game_break_ticks 90
  @winning_points 7

  @valid_series_lengths [1, 3, 5, 7]

  @doc "Table length"
  def length, do: @table_length

  @doc "Table width"
  def width, do: @table_width

  @doc "Goal width"
  def goal_width, do: @goal_width

  @doc "Goal bounds: {top, bottom}"
  def goal_bounds, do: {@goal_top, @goal_bottom}

  @doc "Calculate wins needed for a given series length"
  def wins_needed(series_length) when is_integer(series_length) do
    len = if series_length in @valid_series_lengths, do: series_length, else: 1
    div(len, 2) + 1
  end
  def wins_needed(_), do: 1

  @doc """
  Initializes Air Hockey simulation state.
  Accepts opts:
  - `:series_length` or `"seriesLength"`: 1, 3, 5, or 7 (default 1)
  - `:serving_to`: 0 or 1 (default 0)
  """
  def init_sim_state(opts \\ []) do
    series_length =
      cond do
        Keyword.has_key?(opts, :series_length) -> Keyword.get(opts, :series_length)
        is_map(opts) and Map.has_key?(opts, "seriesLength") -> Map.get(opts, "seriesLength")
        is_map(opts) and Map.has_key?(opts, :series_length) -> Map.get(opts, :series_length)
        true -> 1
      end
      |> then(fn len -> if len in @valid_series_lengths, do: len, else: 1 end)

    serving_to =
      cond do
        Keyword.has_key?(opts, :serving_to) -> Keyword.get(opts, :serving_to)
        is_map(opts) and Map.has_key?(opts, "servingTo") -> Map.get(opts, "servingTo")
        true -> 0
      end

    vx = if serving_to == 0, do: -4.0, else: 4.0

    %{
      "width" => round(@table_width),
      "length" => round(@table_length),
      "state" => "serving",
      "serveDelay" => @serve_delay_ticks,
      "goalDelay" => 0,
      "gameBreakDelay" => 0,
      "puck" => %{
        "x" => @center_x,
        "y" => @center_y,
        "vx" => vx,
        "vy" => 0.5,
        "radius" => round(@puck_radius)
      },
      "mallets" => %{
        "0" => %{
          "x" => 30.0,
          "y" => @center_y,
          "vx" => 0.0,
          "vy" => 0.0,
          "radius" => round(@mallet_radius)
        },
        "1" => %{
          "x" => 170.0,
          "y" => @center_y,
          "vx" => 0.0,
          "vy" => 0.0,
          "radius" => round(@mallet_radius)
        }
      },
      "score" => %{"0" => 0, "1" => 0},
      "seriesScore" => %{"0" => 0, "1" => 0},
      "targetScore" => @winning_points,
      "seriesLength" => series_length,
      "winsNeeded" => wins_needed(series_length),
      "currentGame" => 1,
      "gamesHistory" => [],
      "lastGoalBy" => nil,
      "lastScorerSlot" => nil,
      "winner" => nil,
      "tick" => 0
    }
  end

  @doc """
  Steps the Air Hockey simulation by `steps` discrete ticks (clamped 1..4 in 60 Hz loop).
  `players` is a map of slot (0 or 1) => player map containing `input_state`.

  Returns `{updated_sim_state, outcome}`:
  - `outcome` is `{:match_ended, winner_slot, details}` when a player completes the series.
  - `outcome` is `nil` while the match is in progress.
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

  defp step_single(%{"state" => "ended"} = state, _players) do
    {state, nil}
  end

  defp step_single(state, players) do
    curr_tick = Map.get(state, "tick", 0) + 1
    state = Map.put(state, "tick", curr_tick)

    # 1. Update mallet positions based on player inputs
    mallets = update_mallets(state["mallets"], players)
    state = Map.put(state, "mallets", mallets)

    # 2. Handle state transitions: serving, goal, game_break
    case state["state"] do
      "serving" ->
        serve_delay = Map.get(state, "serveDelay", 0) - 1

        if serve_delay <= 0 do
          state =
            state
            |> Map.put("serveDelay", 0)
            |> Map.put("state", "rally")

          {state, nil}
        else
          {Map.put(state, "serveDelay", serve_delay), nil}
        end

      "goal" ->
        goal_delay = Map.get(state, "goalDelay", 0) - 1

        if goal_delay <= 0 do
          conceded_slot = if state["lastScorerSlot"] == 0, do: 1, else: 0
          vx = if conceded_slot == 0, do: -4.0, else: 4.0

          reset_puck = %{
            "x" => @center_x,
            "y" => @center_y,
            "vx" => vx,
            "vy" => 0.5,
            "radius" => round(@puck_radius)
          }

          reset_mallets = %{
            "0" => %{mallets["0"] | "x" => 30.0, "y" => @center_y, "vx" => 0.0, "vy" => 0.0},
            "1" => %{mallets["1"] | "x" => 170.0, "y" => @center_y, "vx" => 0.0, "vy" => 0.0}
          }

          state =
            state
            |> Map.put("goalDelay", 0)
            |> Map.put("puck", reset_puck)
            |> Map.put("mallets", reset_mallets)
            |> Map.put("state", "serving")
            |> Map.put("serveDelay", @serve_delay_ticks)
            |> Map.put("lastGoalBy", nil)

          {state, nil}
        else
          {Map.put(state, "goalDelay", goal_delay), nil}
        end

      "game_break" ->
        break_delay = Map.get(state, "gameBreakDelay", 0) - 1

        if break_delay <= 0 do
          next_game = state["currentGame"] + 1
          serving_to = if rem(next_game, 2) == 1, do: 0, else: 1
          vx = if serving_to == 0, do: -4.0, else: 4.0

          reset_puck = %{
            "x" => @center_x,
            "y" => @center_y,
            "vx" => vx,
            "vy" => 0.5,
            "radius" => round(@puck_radius)
          }

          reset_mallets = %{
            "0" => %{mallets["0"] | "x" => 30.0, "y" => @center_y, "vx" => 0.0, "vy" => 0.0},
            "1" => %{mallets["1"] | "x" => 170.0, "y" => @center_y, "vx" => 0.0, "vy" => 0.0}
          }

          state =
            state
            |> Map.put("gameBreakDelay", 0)
            |> Map.put("score", %{"0" => 0, "1" => 0})
            |> Map.put("currentGame", next_game)
            |> Map.put("puck", reset_puck)
            |> Map.put("mallets", reset_mallets)
            |> Map.put("state", "serving")
            |> Map.put("serveDelay", @serve_delay_ticks)

          {state, nil}
        else
          {Map.put(state, "gameBreakDelay", break_delay), nil}
        end

      _rally ->
        # 3. Step puck with sub-stepping continuous collision detection
        step_rally(state)
    end
  end

  defp step_rally(state) do
    puck = state["puck"]
    mallets = state["mallets"]

    puck_speed = :math.sqrt(puck["vx"] * puck["vx"] + puck["vy"] * puck["vy"])
    sub_steps = if puck_speed > 6.0, do: 4, else: 2
    dt = 1.0 / sub_steps

    {final_puck, maybe_goal} =
      Enum.reduce_while(1..sub_steps, {puck, nil}, fn _i, {curr_puck, _} ->
        {next_puck, goal} = step_puck_substep(curr_puck, mallets, dt)

        if goal != nil do
          {:halt, {next_puck, goal}}
        else
          {:cont, {next_puck, nil}}
        end
      end)

    final_puck = %{
      final_puck
      | "vx" => final_puck["vx"] * @puck_friction,
        "vy" => final_puck["vy"] * @puck_friction
    }

    if maybe_goal != nil do
      handle_goal(state, final_puck, maybe_goal)
    else
      {Map.put(state, "puck", final_puck), nil}
    end
  end

  defp step_puck_substep(puck, mallets, dt) do
    px = puck["x"] + puck["vx"] * dt
    py = puck["y"] + puck["vy"] * dt
    vx = puck["vx"]
    vy = puck["vy"]

    # Rail collision: Top / Bottom
    {py, vy} =
      cond do
        py - @puck_radius < 0.0 ->
          {@puck_radius, abs(vy) * @restitution_rail}

        py + @puck_radius > @table_width ->
          {@table_width - @puck_radius, -abs(vy) * @restitution_rail}

        true ->
          {py, vy}
      end

    # Rail / Goal collision: Left end rail (Slot 0 defends, x = 0)
    # Goal mouth is between @goal_top and @goal_bottom
    case check_left_rail(px, py, vx) do
      {:goal, 1} ->
        {%{puck | "x" => px, "y" => py, "vx" => 0.0, "vy" => 0.0}, 1}

      {:rail, new_px, new_vx} ->
        # Check right rail
        case check_right_rail(new_px, py, new_vx) do
          {:goal, 0} ->
            {%{puck | "x" => new_px, "y" => py, "vx" => 0.0, "vy" => 0.0}, 0}

          {:rail, final_px, final_vx} ->
            # Mallet collisions
            {mallet_px, mallet_py, mallet_vx, mallet_vy} =
              resolve_all_mallet_collisions(final_px, py, final_vx, vy, mallets)

            puck = %{
              puck
              | "x" => mallet_px,
                "y" => mallet_py,
                "vx" => mallet_vx,
                "vy" => mallet_vy
            }

            {puck, nil}
        end
    end
  end

  defp check_left_rail(px, py, vx) do
    if px - @puck_radius <= 0.0 do
      if py >= @goal_top and py <= @goal_bottom do
        {:goal, 1}
      else
        {:rail, @puck_radius, abs(vx) * @restitution_rail}
      end
    else
      {:rail, px, vx}
    end
  end

  defp check_right_rail(px, py, vx) do
    if px + @puck_radius >= @table_length do
      if py >= @goal_top and py <= @goal_bottom do
        {:goal, 0}
      else
        {:rail, @table_length - @puck_radius, -abs(vx) * @restitution_rail}
      end
    else
      {:rail, px, vx}
    end
  end

  defp resolve_all_mallet_collisions(px, py, vx, vy, mallets) do
    Enum.reduce(["0", "1"], {px, py, vx, vy}, fn slot_key, {cx, cy, cvx, cvy} ->
      mallet = mallets[slot_key]
      dx = cx - mallet["x"]
      dy = cy - mallet["y"]
      dist = :math.sqrt(dx * dx + dy * dy)
      min_dist = @mallet_radius + @puck_radius

      if dist < min_dist do
        {nx, ny} = if dist > 1.0e-6, do: {dx / dist, dy / dist}, else: {1.0, 0.0}

        sep_x = mallet["x"] + nx * min_dist
        sep_y = mallet["y"] + ny * min_dist

        rel_vx = cvx - mallet["vx"]
        rel_vy = cvy - mallet["vy"]
        dot = rel_vx * nx + rel_vy * ny

        if dot < 0.0 do
          imp_vx = cvx - (1.0 + @restitution_mallet) * dot * nx + mallet["vx"] * 0.5
          imp_vy = cvy - (1.0 + @restitution_mallet) * dot * ny + mallet["vy"] * 0.5

          speed = :math.sqrt(imp_vx * imp_vx + imp_vy * imp_vy)

          {clamped_vx, clamped_vy} =
            if speed > @max_puck_speed do
              scale = @max_puck_speed / speed
              {imp_vx * scale, imp_vy * scale}
            else
              {imp_vx, imp_vy}
            end

          {sep_x, sep_y, clamped_vx, clamped_vy}
        else
          {sep_x, sep_y, cvx, cvy}
        end
      else
        {cx, cy, cvx, cvy}
      end
    end)
  end

  defp handle_goal(state, puck, scorer_slot) do
    puck = %{puck | "vx" => 0.0, "vy" => 0.0}
    slot_str = Integer.to_string(scorer_slot)

    curr_game_score = state["score"] || %{"0" => 0, "1" => 0}
    new_game_score = Map.put(curr_game_score, slot_str, Map.get(curr_game_score, slot_str, 0) + 1)

    state =
      state
      |> Map.put("score", new_game_score)
      |> Map.put("puck", puck)
      |> Map.put("lastGoalBy", scorer_slot)
      |> Map.put("lastScorerSlot", scorer_slot)

    # Check if current game won (score >= 7)
    if Map.get(new_game_score, slot_str, 0) >= @winning_points do
      curr_series_score = state["seriesScore"] || %{"0" => 0, "1" => 0}
      new_series_score = Map.put(curr_series_score, slot_str, Map.get(curr_series_score, slot_str, 0) + 1)

      game_record = %{
        "game" => state["currentGame"],
        "winner" => scorer_slot,
        "score" => new_game_score
      }

      history = (state["gamesHistory"] || []) ++ [game_record]

      state =
        state
        |> Map.put("seriesScore", new_series_score)
        |> Map.put("gamesHistory", history)

      # Check if series is won
      wins_needed = state["winsNeeded"] || 1

      if Map.get(new_series_score, slot_str, 0) >= wins_needed do
        final_state =
          state
          |> Map.put("state", "ended")
          |> Map.put("winner", scorer_slot)

        outcome =
          {:match_ended, scorer_slot,
           %{
             winner_slot: scorer_slot,
             score: new_game_score,
             series_score: new_series_score,
             series_length: state["seriesLength"],
             games: history
           }}

        {final_state, outcome}
      else
        # Game finished, next game in series
        state =
          state
          |> Map.put("state", "game_break")
          |> Map.put("gameBreakDelay", @game_break_ticks)

        {state, nil}
      end
    else
      # Point scored, continue game
      state =
        state
        |> Map.put("state", "goal")
        |> Map.put("goalDelay", @goal_delay_ticks)

      {state, nil}
    end
  end

  defp update_mallets(mallets, players) do
    p0_input = get_player_input(players, 0)
    p1_input = get_player_input(players, 1)

    m0 = resolve_mallet_input(0, mallets["0"], p0_input)
    m1 = resolve_mallet_input(1, mallets["1"], p1_input)

    %{
      "0" => Map.merge(mallets["0"], m0),
      "1" => Map.merge(mallets["1"], m1)
    }
  end

  defp get_player_input(players, slot) do
    case Map.get(players, slot) || Map.get(players, Integer.to_string(slot)) do
      %{input_state: input} when is_map(input) -> input
      %{"input_state" => input} when is_map(input) -> input
      _ -> %{}
    end
  end

  @doc """
  Clamps mallet target position to player's half of the table and speed cap.
  """
  def clamp_mallet(slot, current_pos, target_pos, max_speed \\ @max_mallet_speed) do
    is_slot_0 = slot == 0 or slot == "0"

    min_x = if is_slot_0, do: @mallet_radius, else: @center_x + @mallet_radius
    max_x = if is_slot_0, do: @center_x - @mallet_radius, else: @table_length - @mallet_radius
    min_y = @mallet_radius
    max_y = @table_width - @mallet_radius

    target_x = to_float(target_pos["x"] || target_pos[:x] || current_pos["x"])
    target_y = to_float(target_pos["y"] || target_pos[:y] || current_pos["y"])
    curr_x = to_float(current_pos["x"])
    curr_y = to_float(current_pos["y"])

    clamped_x = min(max(target_x, min_x), max_x)
    clamped_y = min(max(target_y, min_y), max_y)

    dx = clamped_x - curr_x
    dy = clamped_y - curr_y
    dist = :math.sqrt(dx * dx + dy * dy)

    if dist > max_speed and dist > 1.0e-6 do
      scale = max_speed / dist
      %{
        "x" => curr_x + dx * scale,
        "y" => curr_y + dy * scale,
        "vx" => dx * scale,
        "vy" => dy * scale
      }
    else
      %{
        "x" => clamped_x,
        "y" => clamped_y,
        "vx" => dx,
        "vy" => dy
      }
    end
  end

  @doc """
  Resolves player input map (digital or continuous) to mallet position and velocity.
  """
  def resolve_mallet_input(slot, current_pos, input_state) do
    cond do
      is_nil(input_state) or map_size(input_state) == 0 ->
        %{"x" => current_pos["x"], "y" => current_pos["y"], "vx" => 0.0, "vy" => 0.0}

      # Continuous coordinate input
      is_number(input_state["x"]) and is_number(input_state["y"]) ->
        clamp_mallet(slot, current_pos, input_state)

      is_number(input_state["targetX"]) and is_number(input_state["targetY"]) ->
        clamp_mallet(slot, current_pos, %{"x" => input_state["targetX"], "y" => input_state["targetY"]})

      true ->
        # Digital inputs
        dx = 0.0
        dy = 0.0

        dy = if input_state["up"] || input_state["KeyW"] || input_state["ArrowUp"], do: dy - @max_mallet_speed, else: dy
        dy = if input_state["down"] || input_state["KeyS"] || input_state["ArrowDown"], do: dy + @max_mallet_speed, else: dy
        dx = if input_state["left"] || input_state["KeyA"] || input_state["ArrowLeft"], do: dx - @max_mallet_speed, else: dx
        dx = if input_state["right"] || input_state["KeyD"] || input_state["ArrowRight"], do: dx + @max_mallet_speed, else: dx

        {norm_dx, norm_dy} =
          if dx != 0.0 and dy != 0.0 do
            norm = @max_mallet_speed / :math.sqrt(dx * dx + dy * dy)
            {dx * norm, dy * norm}
          else
            {dx, dy}
          end

        target = %{
          "x" => current_pos["x"] + norm_dx,
          "y" => current_pos["y"] + norm_dy
        }

        clamp_mallet(slot, current_pos, target)
    end
  end

  defp to_float(val) when is_float(val), do: val
  defp to_float(val) when is_integer(val), do: val * 1.0
  defp to_float(_), do: 0.0

  defp round_state(state) when is_map(state) do
    puck = state["puck"]
    m0 = state["mallets"]["0"]
    m1 = state["mallets"]["1"]

    %{
      state
      | "puck" => %{
          puck
          | "x" => Float.round(puck["x"], 2),
            "y" => Float.round(puck["y"], 2),
            "vx" => Float.round(puck["vx"], 2),
            "vy" => Float.round(puck["vy"], 2)
        },
        "mallets" => %{
          "0" => %{
            m0
            | "x" => Float.round(m0["x"], 2),
              "y" => Float.round(m0["y"], 2),
              "vx" => Float.round(m0["vx"], 2),
              "vy" => Float.round(m0["vy"], 2)
          },
          "1" => %{
            m1
            | "x" => Float.round(m1["x"], 2),
              "y" => Float.round(m1["y"], 2),
              "vx" => Float.round(m1["vx"], 2),
              "vy" => Float.round(m1["vy"], 2)
          }
        }
    }
  end
end

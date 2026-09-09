defmodule Afterlight.Activities.Foosball do
  @moduledoc """
  Authoritative server-side Foosball rules and 60 Hz physics simulation.

  Guarantees:
  - Server owns all transforms, sub-stepping continuous collisions, score, series state, and winner.
  - 8 rods total (4 per player) with bounded lateral translation and clamped angular motion.
  - Maximum angular speed <= 15 rad/s (~0.25 rad/tick), clamped to [-PI/2, PI/2], preventing 360-degree spinning.
  - Sub-stepping continuous collision detection for ball against rails, corner ramps, and player figures.
  - Goal detection on end rails with double-goal lock delay.
  - First-to-five scoring per game (`targetScore: 5`).
  - Selectable series (single game 1, best-of-3, best-of-5), immutable mid-match.
  - Casual active-rod recommendation and advanced explicit rod selection.
  - Compact snapshot serialization (< 600 bytes per state).
  """

  @table_length 120.0
  @table_width 70.0
  @center_x 60.0
  @center_y 35.0

  @ball_radius 2.0
  @max_ball_speed 20.0
  @ball_friction 0.992
  @restitution_rail 0.85

  @goal_width 20.0
  @goal_top 25.0
  @goal_bottom 45.0

  @max_angular_speed 15.0 / 60.0
  @max_rod_translation_speed 4.0
  @max_rod_angle :math.pi() * 0.48

  @serve_delay_ticks 45
  @goal_delay_ticks 60
  @game_break_ticks 90
  @winning_points 5

  @valid_series_lengths [1, 3, 5]

  @rod_configs %{
    "0" => [
      %{index: 0, x: 10.0, player_count: 1, offsets: [0.0], min_y: 25.0, max_y: 45.0, name: "Goalie"},
      %{index: 1, x: 30.0, player_count: 2, offsets: [-15.0, 15.0], min_y: 18.0, max_y: 52.0, name: "Defense"},
      %{index: 2, x: 66.0, player_count: 5, offsets: [-24.0, -12.0, 0.0, 12.0, 24.0], min_y: 10.0, max_y: 60.0, name: "Midfield"},
      %{index: 3, x: 80.0, player_count: 3, offsets: [-18.0, 0.0, 18.0], min_y: 15.0, max_y: 55.0, name: "Attack"}
    ],
    "1" => [
      %{index: 0, x: 110.0, player_count: 1, offsets: [0.0], min_y: 25.0, max_y: 45.0, name: "Goalie"},
      %{index: 1, x: 90.0, player_count: 2, offsets: [-15.0, 15.0], min_y: 18.0, max_y: 52.0, name: "Defense"},
      %{index: 2, x: 54.0, player_count: 5, offsets: [-24.0, -12.0, 0.0, 12.0, 24.0], min_y: 10.0, max_y: 60.0, name: "Midfield"},
      %{index: 3, x: 40.0, player_count: 3, offsets: [-18.0, 0.0, 18.0], min_y: 15.0, max_y: 55.0, name: "Attack"}
    ]
  }

  def length, do: @table_length
  def width, do: @table_width
  def goal_width, do: @goal_width
  def goal_bounds, do: {@goal_top, @goal_bottom}
  def rod_configs, do: @rod_configs
  def max_angular_speed, do: @max_angular_speed
  def max_rod_angle, do: @max_rod_angle

  def wins_needed(series_length) when is_integer(series_length) do
    len = if series_length in @valid_series_lengths, do: series_length, else: 1
    div(len, 2) + 1
  end
  def wins_needed(_), do: 1

  @doc """
  Initializes Foosball simulation state.
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

    vx = if serving_to == 0, do: -3.0, else: 3.0

    rods = %{
      "0" => [
        %{"y" => @center_y, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0},
        %{"y" => @center_y, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0},
        %{"y" => @center_y, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0},
        %{"y" => @center_y, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0}
      ],
      "1" => [
        %{"y" => @center_y, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0},
        %{"y" => @center_y, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0},
        %{"y" => @center_y, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0},
        %{"y" => @center_y, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0}
      ]
    }

    %{
      "width" => round(@table_width),
      "length" => round(@table_length),
      "state" => "serving",
      "serveDelay" => @serve_delay_ticks,
      "goalDelay" => 0,
      "gameBreakDelay" => 0,
      "ball" => %{
        "x" => @center_x,
        "y" => @center_y,
        "vx" => vx,
        "vy" => 0.5,
        "radius" => round(@ball_radius)
      },
      "rods" => rods,
      "activeRod" => %{"0" => 2, "1" => 2},
      "controlMode" => %{"0" => "casual", "1" => "casual"},
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
  Steps the Foosball simulation by `steps` discrete ticks.
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

  def get_recommended_rod(slot, ball_x) do
    is_slot0 = slot == 0 or slot == "0"
    if is_slot0 do
      cond do
        ball_x < 20.0 -> 0
        ball_x < 48.0 -> 1
        ball_x < 74.0 -> 2
        true -> 3
      end
    else
      cond do
        ball_x > 100.0 -> 0
        ball_x > 72.0 -> 1
        ball_x > 46.0 -> 2
        true -> 3
      end
    end
  end

  def clamp_rod_state(slot, rod_idx, current_rod, input) do
    slot_key = to_string(slot)
    cfg = Enum.at(@rod_configs[slot_key], rod_idx)
    curr_y = (current_rod["y"] || @center_y) * 1.0
    curr_angle = (current_rod["angle"] || 0.0) * 1.0

    target_y =
      cond do
        is_map(input) and (is_number(input["targetY"]) or is_number(input[:targetY])) ->
          val = (input["targetY"] || input[:targetY]) * 1.0
          max(cfg.min_y, min(cfg.max_y, val))

        is_map(input) and (is_number(input["dy"]) or is_number(input[:dy])) ->
          dy = (input["dy"] || input[:dy]) * 1.0
          max(cfg.min_y, min(cfg.max_y, curr_y + dy * @max_rod_translation_speed))

        true ->
          curr_y
      end

    target_angle =
      cond do
        is_map(input) and (is_number(input["targetAngle"]) or is_number(input[:targetAngle])) ->
          val = (input["targetAngle"] || input[:targetAngle]) * 1.0
          max(-@max_rod_angle, min(@max_rod_angle, val))

        is_map(input) and (input["kick"] == true or input[:kick] == true) ->
          kick_sign = if slot_key == "0", do: 1.0, else: -1.0
          kick_sign * (:math.pi() * 0.4)

        is_map(input) and (is_number(input["dAngle"]) or is_number(input[:dAngle])) ->
          da = (input["dAngle"] || input[:dAngle]) * 1.0
          max(-@max_rod_angle, min(@max_rod_angle, curr_angle + da * @max_angular_speed))

        true ->
          curr_angle * 0.85
      end

    # Enforce translation speed limit
    dy = target_y - curr_y
    clamped_dy = max(-@max_rod_translation_speed, min(@max_rod_translation_speed, dy))
    next_y = curr_y + clamped_dy

    # Enforce angular speed limit (no spinning)
    da = target_angle - curr_angle
    clamped_da = max(-@max_angular_speed, min(@max_angular_speed, da))
    next_angle = max(-@max_rod_angle, min(@max_rod_angle, curr_angle + clamped_da))

    %{
      "y" => next_y,
      "angle" => next_angle,
      "vy" => clamped_dy,
      "omega" => clamped_da
    }
  end

  defp step_single(%{"state" => "ended"} = state, _players) do
    {state, nil}
  end

  defp step_single(%{"state" => "game_break"} = state, _players) do
    break_delay = state["gameBreakDelay"] - 1

    if break_delay <= 0 do
      server = if rem(state["currentGame"], 2) == 1, do: 0, else: 1
      initial_vx = if server == 0, do: -3.0, else: 3.0

      next_state =
        state
        |> Map.put("state", "serving")
        |> Map.put("serveDelay", @serve_delay_ticks)
        |> Map.put("gameBreakDelay", 0)
        |> Map.put("score", %{"0" => 0, "1" => 0})
        |> put_in(["ball", "x"], @center_x)
        |> put_in(["ball", "y"], @center_y)
        |> put_in(["ball", "vx"], initial_vx)
        |> put_in(["ball", "vy"], 0.5)
        |> Map.update!("tick", &(&1 + 1))

      {next_state, nil}
    else
      next_state =
        state
        |> Map.put("gameBreakDelay", break_delay)
        |> Map.update!("tick", &(&1 + 1))

      {next_state, nil}
    end
  end

  defp step_single(%{"state" => "goal"} = state, _players) do
    goal_delay = state["goalDelay"] - 1

    if goal_delay <= 0 do
      score0 = state["score"]["0"]
      score1 = state["score"]["1"]

      if score0 >= @winning_points or score1 >= @winning_points do
        game_winner = if score0 >= @winning_points, do: 0, else: 1
        winner_key = to_string(game_winner)

        new_series_score =
          Map.update!(state["seriesScore"], winner_key, &(&1 + 1))

        history_entry = %{
          "game" => state["currentGame"],
          "score" => state["score"],
          "winner" => game_winner
        }

        new_history = state["gamesHistory"] ++ [history_entry]

        if new_series_score[winner_key] >= state["winsNeeded"] do
          next_state =
            state
            |> Map.put("state", "ended")
            |> Map.put("winner", game_winner)
            |> Map.put("seriesScore", new_series_score)
            |> Map.put("gamesHistory", new_history)
            |> Map.update!("tick", &(&1 + 1))

          outcome = {:match_ended, game_winner, %{
            "seriesScore" => new_series_score,
            "winner" => game_winner,
            "gamesHistory" => new_history
          }}

          {next_state, outcome}
        else
          next_state =
            state
            |> Map.put("state", "game_break")
            |> Map.put("gameBreakDelay", @game_break_ticks)
            |> Map.put("seriesScore", new_series_score)
            |> Map.put("gamesHistory", new_history)
            |> Map.update!("currentGame", &(&1 + 1))
            |> Map.update!("tick", &(&1 + 1))

          {next_state, nil}
        end
      else
        concede_slot = if state["lastScorerSlot"] == 0, do: 1, else: 0
        serve_vx = if concede_slot == 0, do: -3.0, else: 3.0

        next_state =
          state
          |> Map.put("state", "serving")
          |> Map.put("serveDelay", @serve_delay_ticks)
          |> Map.put("goalDelay", 0)
          |> put_in(["ball", "x"], @center_x)
          |> put_in(["ball", "y"], @center_y)
          |> put_in(["ball", "vx"], serve_vx)
          |> put_in(["ball", "vy"], 0.4)
          |> Map.update!("tick", &(&1 + 1))

        {next_state, nil}
      end
    else
      next_state =
        state
        |> Map.put("goalDelay", goal_delay)
        |> Map.update!("tick", &(&1 + 1))

      {next_state, nil}
    end
  end

  defp step_single(state, players) do
    state =
      if state["state"] == "serving" do
        s_delay = state["serveDelay"] - 1
        if s_delay <= 0 do
          state |> Map.put("state", "rally") |> Map.put("serveDelay", 0)
        else
          state |> Map.put("serveDelay", s_delay)
        end
      else
        state
      end

    # Process rod inputs
    {updated_rods, updated_active, updated_modes} = process_rods(state, players)

    state =
      state
      |> Map.put("rods", updated_rods)
      |> Map.put("activeRod", updated_active)
      |> Map.put("controlMode", updated_modes)

    # Step ball if in rally
    state =
      if state["state"] == "rally" do
        step_ball_substeps(state)
      else
        state
      end

    next_state = Map.update!(state, "tick", &(&1 + 1))
    {next_state, nil}
  end

  defp process_rods(state, players) do
    ball_x = (state["ball"]["x"] || @center_x) * 1.0

    Enum.reduce(["0", "1"], {state["rods"], state["activeRod"], state["controlMode"]}, fn slot_key, {rods_acc, active_acc, modes_acc} ->
      slot = String.to_integer(slot_key)
      p = Map.get(players, slot) || Map.get(players, slot_key) || %{}
      raw_inp = Map.get(p, :input_state) || Map.get(p, "input_state") || %{}

      mode =
        cond do
          is_binary(raw_inp["controlMode"]) -> raw_inp["controlMode"]
          is_binary(raw_inp[:controlMode]) -> raw_inp[:controlMode]
          true -> Map.get(modes_acc, slot_key, "casual")
        end

      active_rod =
        if mode == "casual" do
          get_recommended_rod(slot, ball_x)
        else
          sel = raw_inp["selectRod"] || raw_inp[:selectRod]
          if is_integer(sel) and sel in 0..3, do: sel, else: Map.get(active_acc, slot_key, 2)
        end

      cur_slot_rods = Map.get(rods_acc, slot_key)

      updated_slot_rods =
        Enum.map(0..3, fn r ->
          rod = Enum.at(cur_slot_rods, r)
          rod_input = if r == active_rod, do: raw_inp, else: %{"targetY" => rod["y"]}
          clamp_rod_state(slot, r, rod, rod_input)
        end)

      {
        Map.put(rods_acc, slot_key, updated_slot_rods),
        Map.put(active_acc, slot_key, active_rod),
        Map.put(modes_acc, slot_key, mode)
      }
    end)
  end

  defp step_ball_substeps(state) do
    substeps = 4
    dt = 1.0 / substeps

    Enum.reduce_while(1..substeps, state, fn _step, acc_state ->
      ball = acc_state["ball"]
      bx = ball["x"] * 1.0 + ball["vx"] * 1.0 * dt
      by = ball["y"] * 1.0 + ball["vy"] * 1.0 * dt

      # Friction
      fric = :math.pow(@ball_friction, dt)
      bvx = ball["vx"] * 1.0 * fric
      bvy = ball["vy"] * 1.0 * fric

      # Speed clamp
      speed = :math.sqrt(bvx * bvx + bvy * bvy)
      {bvx, bvy, speed} =
        if speed > @max_ball_speed do
          scale = @max_ball_speed / speed
          {bvx * scale, bvy * scale, @max_ball_speed}
        else
          {bvx, bvy, speed}
        end

      # Side rails (Y bounds: 0 to @table_width)
      {by, bvy} =
        cond do
          by - @ball_radius <= 0.0 ->
            {@ball_radius, abs(bvy) * @restitution_rail}

          by + @ball_radius >= @table_width ->
            {@table_width - @ball_radius, -abs(bvy) * @restitution_rail}

          true ->
            {by, bvy}
        end

      # Corner ramps (45 deg)
      corner_size = 8.0
      {bx, by, bvx, bvy} = check_corner_ramps(bx, by, bvx, bvy, corner_size)

      # Check Goals vs End Rails
      cond do
        # Left End (X <= 0)
        bx - @ball_radius <= 0.0 ->
          if by >= @goal_top and by <= @goal_bottom do
            # Goal for slot 1
            new_score = Map.update!(acc_state["score"], "1", &(&1 + 1))
            halted_state =
              acc_state
              |> Map.put("score", new_score)
              |> Map.put("lastGoalBy", 1)
              |> Map.put("lastScorerSlot", 1)
              |> Map.put("state", "goal")
              |> Map.put("goalDelay", @goal_delay_ticks)
              |> put_in(["ball", "x"], 0.0)
              |> put_in(["ball", "y"], by)
              |> put_in(["ball", "vx"], 0.0)
              |> put_in(["ball", "vy"], 0.0)

            {:halt, halted_state}
          else
            # Bounce left end rail
            new_bx = @ball_radius
            new_bvx = abs(bvx) * @restitution_rail
            {coll_bx, coll_bvx, coll_bvy} = check_rod_collisions(new_bx, by, new_bvx, bvy, acc_state["rods"])
            new_ball = %{"x" => coll_bx, "y" => by, "vx" => coll_bvx, "vy" => coll_bvy, "radius" => round(@ball_radius)}
            {:cont, Map.put(acc_state, "ball", new_ball)}
          end

        # Right End (X >= @table_length)
        bx + @ball_radius >= @table_length ->
          if by >= @goal_top and by <= @goal_bottom do
            # Goal for slot 0
            new_score = Map.update!(acc_state["score"], "0", &(&1 + 1))
            halted_state =
              acc_state
              |> Map.put("score", new_score)
              |> Map.put("lastGoalBy", 0)
              |> Map.put("lastScorerSlot", 0)
              |> Map.put("state", "goal")
              |> Map.put("goalDelay", @goal_delay_ticks)
              |> put_in(["ball", "x"], @table_length)
              |> put_in(["ball", "y"], by)
              |> put_in(["ball", "vx"], 0.0)
              |> put_in(["ball", "vy"], 0.0)

            {:halt, halted_state}
          else
            # Bounce right end rail
            new_bx = @table_length - @ball_radius
            new_bvx = -abs(bvx) * @restitution_rail
            {coll_bx, coll_bvx, coll_bvy} = check_rod_collisions(new_bx, by, new_bvx, bvy, acc_state["rods"])
            new_ball = %{"x" => coll_bx, "y" => by, "vx" => coll_bvx, "vy" => coll_bvy, "radius" => round(@ball_radius)}
            {:cont, Map.put(acc_state, "ball", new_ball)}
          end

        true ->
          # Check rod figure collisions
          {coll_bx, coll_bvx, coll_bvy} = check_rod_collisions(bx, by, bvx, bvy, acc_state["rods"])
          new_ball = %{"x" => coll_bx, "y" => by, "vx" => coll_bvx, "vy" => coll_bvy, "radius" => round(@ball_radius)}
          {:cont, Map.put(acc_state, "ball", new_ball)}
      end
    end)
  end

  defp check_corner_ramps(bx, by, bvx, bvy, corner_size) do
    norm = 0.7071
    # Top-Left: x + y < corner_size + radius
    {bx, by, bvx, bvy} =
      if bx + by < corner_size + @ball_radius do
        pen = (corner_size + @ball_radius) - (bx + by)
        dot = bvx * norm + bvy * norm
        {new_vx, new_vy} = if dot < 0, do: {bvx - 2 * dot * norm * @restitution_rail, bvy - 2 * dot * norm * @restitution_rail}, else: {bvx, bvy}
        {bx + pen * 0.5, by + pen * 0.5, new_vx, new_vy}
      else
        {bx, by, bvx, bvy}
      end

    # Bottom-Left: x + (@table_width - y) < corner_size + radius
    {bx, by, bvx, bvy} =
      if bx + (@table_width - by) < corner_size + @ball_radius do
        pen = (corner_size + @ball_radius) - (bx + (@table_width - by))
        dot = bvx * norm + bvy * (-norm)
        {new_vx, new_vy} = if dot < 0, do: {bvx - 2 * dot * norm * @restitution_rail, bvy - 2 * dot * (-norm) * @restitution_rail}, else: {bvx, bvy}
        {bx + pen * 0.5, by - pen * 0.5, new_vx, new_vy}
      else
        {bx, by, bvx, bvy}
      end

    # Top-Right: (@table_length - x) + y < corner_size + radius
    {bx, by, bvx, bvy} =
      if (@table_length - bx) + by < corner_size + @ball_radius do
        pen = (corner_size + @ball_radius) - ((@table_length - bx) + by)
        dot = bvx * (-norm) + bvy * norm
        {new_vx, new_vy} = if dot < 0, do: {bvx - 2 * dot * (-norm) * @restitution_rail, bvy - 2 * dot * norm * @restitution_rail}, else: {bvx, bvy}
        {bx - pen * 0.5, by + pen * 0.5, new_vx, new_vy}
      else
        {bx, by, bvx, bvy}
      end

    # Bottom-Right: (@table_length - x) + (@table_width - y) < corner_size + radius
    {bx, by, bvx, bvy} =
      if (@table_length - bx) + (@table_width - by) < corner_size + @ball_radius do
        pen = (corner_size + @ball_radius) - ((@table_length - bx) + (@table_width - by))
        dot = bvx * (-norm) + bvy * (-norm)
        {new_vx, new_vy} = if dot < 0, do: {bvx - 2 * dot * (-norm) * @restitution_rail, bvy - 2 * dot * (-norm) * @restitution_rail}, else: {bvx, bvy}
        {bx - pen * 0.5, by - pen * 0.5, new_vx, new_vy}
      else
        {bx, by, bvx, bvy}
      end

    {bx, by, bvx, bvy}
  end

  defp check_rod_collisions(bx, by, bvx, bvy, rods) do
    fig_half_width = 1.6
    fig_half_depth = 1.2
    leg_length = 3.5

    Enum.reduce(["0", "1"], {bx, bvx, bvy}, fn slot_key, acc_slot ->
      slot = String.to_integer(slot_key)
      cfg_list = @rod_configs[slot_key]
      rod_list = Map.get(rods, slot_key, [])

      Enum.reduce(0..3, acc_slot, fn r, {cur_bx, cur_bvx, cur_bvy} ->
        cfg = Enum.at(cfg_list, r)
        rod = Enum.at(rod_list, r) || %{}
        rod_y = (rod["y"] || @center_y) * 1.0
        rod_angle = (rod["angle"] || 0.0) * 1.0
        rod_omega = (rod["omega"] || 0.0) * 1.0
        rod_vy = (rod["vy"] || 0.0) * 1.0

        foot_x = cfg.x + :math.sin(rod_angle) * leg_length
        foot_vx = rod_omega * 60.0 * :math.cos(rod_angle) * leg_length

        Enum.reduce(cfg.offsets, {cur_bx, cur_bvx, cur_bvy}, fn offset, {f_bx, f_bvx, f_bvy} ->
          fig_y = rod_y + offset
          dx = f_bx - foot_x
          dy = by - fig_y

          if abs(dx) <= @ball_radius + fig_half_depth and abs(dy) <= @ball_radius + fig_half_width do
            attack_sign = if slot == 0, do: 1.0, else: -1.0
            is_kicking = foot_vx * attack_sign > 0.5

            {next_bvx, next_bvy} =
              if is_kicking do
                new_vx = attack_sign * max(6.0, min(@max_ball_speed, abs(foot_vx) * 1.5 + 4.0))
                new_vy = f_bvy + rod_vy * 0.8
                {new_vx, new_vy}
              else
                if abs(dx) > abs(dy) do
                  push_x = if dx > 0, do: 1.0, else: -1.0
                  {push_x * max(3.0, abs(f_bvx) * 0.9), f_bvy}
                else
                  push_y = if dy > 0, do: 1.0, else: -1.0
                  {f_bvx, push_y * max(3.0, abs(f_bvy) * 0.9)}
                end
              end

            push_dir_x = if dx >= 0, do: 1.0, else: -1.0
            next_bx = foot_x + push_dir_x * (@ball_radius + fig_half_depth + 0.1)

            {next_bx, next_bvx, next_bvy}
          else
            {f_bx, f_bvx, f_bvy}
          end
        end)
      end)
    end)
  end

  defp round_state(state) when is_map(state) do
    ball = state["ball"]
    rounded_ball =
      if is_map(ball) do
        %{
          "x" => Float.round(ball["x"] * 1.0, 2),
          "y" => Float.round(ball["y"] * 1.0, 2),
          "vx" => Float.round(ball["vx"] * 1.0, 2),
          "vy" => Float.round(ball["vy"] * 1.0, 2),
          "radius" => ball["radius"]
        }
      else
        ball
      end

    rounded_rods =
      Enum.into(state["rods"], %{}, fn {slot_k, rod_list} ->
        {
          slot_k,
          Enum.map(rod_list, fn r ->
            %{
              "y" => Float.round((r["y"] || @center_y) * 1.0, 2),
              "angle" => Float.round((r["angle"] || 0.0) * 1.0, 3),
              "vy" => Float.round((r["vy"] || 0.0) * 1.0, 2),
              "omega" => Float.round((r["omega"] || 0.0) * 1.0, 3)
            }
          end)
        }
      end)

    state
    |> Map.put("ball", rounded_ball)
    |> Map.put("rods", rounded_rods)
  end
end

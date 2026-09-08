defmodule Afterlight.Activities.Pong do
  @moduledoc """
  Authoritative server-side Pong rules and 60 Hz physics simulation.

  Guarantees:
  - Server owns transforms, collisions, score, and winner; client inputs only convey controls.
  - Bounded paddles, rail collisions, deflection angles, and speed caps.
  - First-to-seven scoring (`winning_score: 7`).
  - Serve/reset with brief countdown delays between points.
  - Compact snapshot serialization (< 500 bytes per state).
  """

  @width 800.0
  @height 500.0
  @ball_radius 8.0
  @paddle_width 14.0
  @paddle_height 70.0
  @paddle_half_height 35.0
  @paddle_speed 7.0
  @initial_ball_speed 5.0
  @max_ball_speed 12.0
  @winning_score 7
  @serve_delay_ticks 45

  @doc "Table width"
  def width, do: @width

  @doc "Table height"
  def height, do: @height

  @doc "Initial simulation state for a new Pong match"
  def init_sim_state(opts \\ []) do
    serving_to = Keyword.get(opts, :serving_to, 0)
    vx = if serving_to == 0, do: -@initial_ball_speed, else: @initial_ball_speed

    %{
      "width" => round(@width),
      "height" => round(@height),
      "ball" => %{
        "x" => @width / 2.0,
        "y" => @height / 2.0,
        "vx" => vx,
        "vy" => 1.5,
        "radius" => round(@ball_radius)
      },
      "paddles" => %{
        "0" => %{
          "x" => 40.0,
          "y" => @height / 2.0,
          "width" => round(@paddle_width),
          "height" => round(@paddle_height)
        },
        "1" => %{
          "x" => @width - 40.0,
          "y" => @height / 2.0,
          "width" => round(@paddle_width),
          "height" => round(@paddle_height)
        }
      },
      "score" => %{"0" => 0, "1" => 0},
      "targetScore" => @winning_score,
      "state" => "serving",
      "serveDelay" => @serve_delay_ticks,
      "tick" => 0
    }
  end

  @doc """
  Steps the Pong simulation by `steps` (clamped to 1..4 in 60 Hz loop).
  `players` is a map of slot (integer 0 or 1) => player map containing `input_state`.

  Returns `{updated_sim_state, outcome}`:
  - `outcome` is `{:match_ended, winner_slot, details}` when a player reaches 7.
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

  # Step a single discrete tick (1/60th of a second)
  defp step_single(state, players) do
    curr_tick = Map.get(state, "tick", 0) + 1
    state = Map.put(state, "tick", curr_tick)

    # 1. Update paddles based on player inputs
    paddles = update_paddles(state["paddles"], players)
    state = Map.put(state, "paddles", paddles)

    # 2. Check serve delay
    serve_delay = Map.get(state, "serveDelay", 0)

    if serve_delay > 0 do
      next_delay = serve_delay - 1
      next_status = if next_delay == 0, do: "rally", else: "serving"

      state =
        state
        |> Map.put("serveDelay", next_delay)
        |> Map.put("state", next_status)

      {state, nil}
    else
      # 3. Move ball and handle collisions
      ball = state["ball"]
      score = state["score"] || %{"0" => 0, "1" => 0}

      ball_x = ball["x"] + ball["vx"]
      ball_y = ball["y"] + ball["vy"]
      ball_vx = ball["vx"]
      ball_vy = ball["vy"]

      # Rail collision (top and bottom)
      {ball_y, ball_vy} =
        cond do
          ball_y - @ball_radius <= 0.0 ->
            {@ball_radius, abs(ball_vy)}

          ball_y + @ball_radius >= @height ->
            {@height - @ball_radius, -abs(ball_vy)}

          true ->
            {ball_y, ball_vy}
        end

      # Paddle collisions
      p0 = paddles["0"]
      p1 = paddles["1"]

      # Left paddle (slot 0)
      {ball_x, ball_vx, ball_vy} =
        if ball_vx < 0 and
             ball_x - @ball_radius <= p0["x"] + @paddle_width / 2.0 and
             ball_x + @ball_radius >= p0["x"] - @paddle_width / 2.0 and
             ball_y >= p0["y"] - @paddle_half_height - @ball_radius and
             ball_y <= p0["y"] + @paddle_half_height + @ball_radius do
          offset = (ball_y - p0["y"]) / @paddle_half_height
          offset_clamped = min(max(offset, -1.0), 1.0)
          new_vx = min(abs(ball_vx) * 1.05, @max_ball_speed)
          new_vy = offset_clamped * 7.0
          new_x = p0["x"] + @paddle_width / 2.0 + @ball_radius
          {new_x, new_vx, new_vy}
        else
          {ball_x, ball_vx, ball_vy}
        end

      # Right paddle (slot 1)
      {ball_x, ball_vx, ball_vy} =
        if ball_vx > 0 and
             ball_x + @ball_radius >= p1["x"] - @paddle_width / 2.0 and
             ball_x - @ball_radius <= p1["x"] + @paddle_width / 2.0 and
             ball_y >= p1["y"] - @paddle_half_height - @ball_radius and
             ball_y <= p1["y"] + @paddle_half_height + @ball_radius do
          offset = (ball_y - p1["y"]) / @paddle_half_height
          offset_clamped = min(max(offset, -1.0), 1.0)
          new_vx = -min(abs(ball_vx) * 1.05, @max_ball_speed)
          new_vy = offset_clamped * 7.0
          new_x = p1["x"] - @paddle_width / 2.0 - @ball_radius
          {new_x, new_vx, new_vy}
        else
          {ball_x, ball_vx, ball_vy}
        end

      # 4. Check scoring
      cond do
        # Right player (slot 1) scores
        ball_x < 0.0 ->
          s1 = Map.get(score, "1", 0) + 1
          new_score = Map.put(score, "1", s1)

          if s1 >= @winning_score do
            final_ball = %{ball | "x" => ball_x, "y" => ball_y, "vx" => 0.0, "vy" => 0.0}

            final_state =
              state
              |> Map.put("ball", final_ball)
              |> Map.put("score", new_score)
              |> Map.put("state", "ended")
              |> Map.put("winner", 1)

            outcome = {:match_ended, 1, %{winner_slot: 1, score: new_score}}
            {final_state, outcome}
          else
            reset_ball = %{
              ball
              | "x" => @width / 2.0,
                "y" => @height / 2.0,
                "vx" => @initial_ball_speed,
                "vy" => 1.5
            }

            state =
              state
              |> Map.put("ball", reset_ball)
              |> Map.put("score", new_score)
              |> Map.put("state", "serving")
              |> Map.put("serveDelay", @serve_delay_ticks)
              |> Map.put("lastPointWinner", 1)

            {state, nil}
          end

        # Left player (slot 0) scores
        ball_x > @width ->
          s0 = Map.get(score, "0", 0) + 1
          new_score = Map.put(score, "0", s0)

          if s0 >= @winning_score do
            final_ball = %{ball | "x" => ball_x, "y" => ball_y, "vx" => 0.0, "vy" => 0.0}

            final_state =
              state
              |> Map.put("ball", final_ball)
              |> Map.put("score", new_score)
              |> Map.put("state", "ended")
              |> Map.put("winner", 0)

            outcome = {:match_ended, 0, %{winner_slot: 0, score: new_score}}
            {final_state, outcome}
          else
            reset_ball = %{
              ball
              | "x" => @width / 2.0,
                "y" => @height / 2.0,
                "vx" => -@initial_ball_speed,
                "vy" => -1.5
            }

            state =
              state
              |> Map.put("ball", reset_ball)
              |> Map.put("score", new_score)
              |> Map.put("state", "serving")
              |> Map.put("serveDelay", @serve_delay_ticks)
              |> Map.put("lastPointWinner", 0)

            {state, nil}
          end

        true ->
          updated_ball = %{
            ball
            | "x" => ball_x,
              "y" => ball_y,
              "vx" => ball_vx,
              "vy" => ball_vy
          }

          state =
            state
            |> Map.put("ball", updated_ball)
            |> Map.put("state", "rally")

          {state, nil}
      end
    end
  end

  # Update paddles based on player inputs
  defp update_paddles(paddles, players) do
    Enum.reduce(0..1, paddles, fn slot, acc ->
      slot_key = Integer.to_string(slot)
      paddle = acc[slot_key] || default_paddle(slot)
      player = Map.get(players, slot)
      controls = if player, do: Map.get(player, :input_state, %{}), else: %{}

      new_y = calculate_paddle_y(paddle["y"], controls)
      clamped_y = min(max(new_y, @paddle_half_height), @height - @paddle_half_height)

      Map.put(acc, slot_key, %{paddle | "y" => clamped_y})
    end)
  end

  defp default_paddle(0) do
    %{
      "x" => 40.0,
      "y" => @height / 2.0,
      "width" => round(@paddle_width),
      "height" => round(@paddle_height)
    }
  end

  defp default_paddle(1) do
    %{
      "x" => @width - 40.0,
      "y" => @height / 2.0,
      "width" => round(@paddle_width),
      "height" => round(@paddle_height)
    }
  end

  # Calculate target paddle Y based on controls
  defp calculate_paddle_y(curr_y, controls) when is_map(controls) do
    cond do
      # Continuous absolute Y (pointer / touch drag)
      Map.has_key?(controls, "y") ->
        target_y = to_number(controls["y"])
        # Move toward target_y capped by paddle speed
        diff = target_y - curr_y
        step_dir = min(max(diff, -@paddle_speed), @paddle_speed)
        curr_y + step_dir

      # Digital directional dy (-1 = up, 1 = down)
      Map.has_key?(controls, "dy") ->
        dy = to_number(controls["dy"])
        curr_y + min(max(dy, -1.0), 1.0) * @paddle_speed

      # Boolean up/down flags
      Map.get(controls, "up") == true ->
        curr_y - @paddle_speed

      Map.get(controls, "down") == true ->
        curr_y + @paddle_speed

      true ->
        curr_y
    end
  end

  defp calculate_paddle_y(curr_y, _), do: curr_y

  defp to_number(v) when is_integer(v), do: v * 1.0
  defp to_number(v) when is_float(v), do: v
  defp to_number(_), do: 0.0

  # Clean, compact float rounding for snapshots
  defp round_state(state) when is_map(state) do
    ball = state["ball"]
    paddles = state["paddles"]

    rounded_ball =
      if ball do
        %{
          ball
          | "x" => round2(ball["x"]),
            "y" => round2(ball["y"]),
            "vx" => round2(ball["vx"]),
            "vy" => round2(ball["vy"])
        }
      else
        ball
      end

    rounded_paddles =
      if paddles do
        Map.new(paddles, fn {k, pad} ->
          {k, %{pad | "x" => round2(pad["x"]), "y" => round2(pad["y"])}}
        end)
      else
        paddles
      end

    state
    |> Map.put("ball", rounded_ball)
    |> Map.put("paddles", rounded_paddles)
  end

  defp round2(v) when is_float(v), do: Float.round(v, 2)
  defp round2(v) when is_integer(v), do: v * 1.0
  defp round2(v), do: v
end

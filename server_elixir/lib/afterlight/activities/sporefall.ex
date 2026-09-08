defmodule Afterlight.Activities.Sporefall do
  @moduledoc """
  Authoritative server-side Sporefall puzzle rules and 60 Hz simulation.

  Single-player arcade falling-block puzzle in an overgrown bio-mechanical chamber:
  - 10 columns by 20 rows grid.
  - Standard 7 spore pieces (I, O, T, S, Z, J, L) with 7-bag randomizer.
  - 4-state rotation with wall kicks.
  - Soft drop, instant hard drop, and lock delay.
  - Line clears (single, double, triple, 4-line Sporefall) and combo chains.
  - Level progression and increasing gravity speed.
  - Top-out detection on piece spawn collision.
  - Strict 10-minute run cap (36,000 ticks at 60 Hz).
  - Compact snapshot serialization (< 1 KiB per snapshot).

  Conforms to:
  - openspec/changes/add-place-activities-program/specs/orpheum-arcade/spec.md
  """

  @cols 10
  @rows 20
  # 10 minutes at 60 Hz
  @run_cap_ticks 36_000
  # 0.5s at 60 Hz
  @lock_delay_ticks 30
  @max_lock_resets 15

  @piece_types ["I", "O", "T", "S", "Z", "J", "L"]

  @piece_ids %{
    "I" => 1,
    "O" => 2,
    "T" => 3,
    "S" => 4,
    "Z" => 5,
    "J" => 6,
    "L" => 7
  }

  @doc "Run cap in ticks"
  def run_cap_ticks, do: @run_cap_ticks

  @doc "Grid columns"
  def cols, do: @cols

  @doc "Grid rows"
  def rows, do: @rows

  @doc "Piece type to ID mapping"
  def piece_ids, do: @piece_ids

  @doc """
  Initializes a fresh Sporefall simulation state with an optional seed.
  """
  def init_sim_state(opts \\ []) do
    seed = Keyword.get(opts, :seed, :erlang.phash2(:os.system_time(:microsecond), 1_000_000))
    {bag, rng_state} = generate_bag(seed)
    [first_type | bag] = bag
    {next_type, bag, rng_state} = get_next_piece(bag, rng_state)

    empty_grid = for _r <- 0..(@rows - 1), do: for(_c <- 0..(@cols - 1), do: 0)

    %{
      "cols" => @cols,
      "rows" => @rows,
      "grid" => empty_grid,
      "active" => %{
        "type" => first_type,
        "x" => 4,
        "y" => 1,
        "rotation" => 0
      },
      "next" => next_type,
      "bag" => bag,
      "score" => 0,
      "lines" => 0,
      "level" => 1,
      "combo" => 0,
      "gravityTicks" => 48,
      "gravityTimer" => 0,
      "lockTimer" => 0,
      "lockResets" => 0,
      "prevInputs" => %{},
      "dasLeft" => 0,
      "dasRight" => 0,
      "seed" => seed,
      "rngState" => rng_state,
      "state" => "running",
      "tick" => 0
    }
  end

  @doc """
  Steps the Sporefall simulation by `steps` ticks (1..4 at 60 Hz).
  `players` is a map of slot (0) => player map containing `input_state`.

  Returns `{updated_sim_state, outcome}`:
  - `outcome` is `{:match_ended, 0, details}` on top-out or run cap.
  - `outcome` is `nil` while the game continues.
  """
  def step(sim_state, players, steps)
      when is_map(sim_state) and is_integer(steps) and steps > 0 do
    Enum.reduce_while(1..steps, {sim_state, nil}, fn _step_idx, {curr_state, _} ->
      case step_single(curr_state, players) do
        {next_state, {:match_ended, _, _} = ended} ->
          {:halt, {clean_state_for_snapshot(next_state), ended}}

        {next_state, nil} ->
          {:cont, {next_state, nil}}
      end
    end)
    |> then(fn {final_state, maybe_ended} ->
      {clean_state_for_snapshot(final_state), maybe_ended}
    end)
  end

  defp step_single(state, players) do
    curr_tick = Map.get(state, "tick", 0) + 1
    state = Map.put(state, "tick", curr_tick)

    # 1. Enforce 10-minute run cap
    if curr_tick >= @run_cap_ticks do
      final_score = Map.get(state, "score", 0)
      final_lines = Map.get(state, "lines", 0)
      final_level = Map.get(state, "level", 1)

      ended_state = Map.put(state, "state", "completed")

      {ended_state,
       {:match_ended, 0,
        %{reason: "run_cap", score: final_score, lines: final_lines, level: final_level}}}
    else
      player_inputs = get_player_inputs(players)
      prev_inputs = Map.get(state, "prevInputs", %{})
      active = state["active"]

      if active == nil do
        {state, nil}
      else
        # Process player inputs
        {state, active} = process_horizontal_input(state, active, player_inputs, prev_inputs)
        {state, active} = process_rotation_input(state, active, player_inputs, prev_inputs)

        {state, active, hard_dropped} =
          process_hard_drop_input(state, active, player_inputs, prev_inputs)

        # Update input tracking
        state = Map.put(state, "prevInputs", player_inputs)

        if hard_dropped do
          # Lock piece immediately and advance
          lock_piece_and_advance(state, active)
        else
          # Process vertical drop and gravity
          process_gravity(state, active, player_inputs)
        end
      end
    end
  end

  # Horizontal shift (left/right with DAS/ARR)
  defp process_horizontal_input(state, active, inputs, prev_inputs) do
    left = is_truthy(inputs["left"])
    right = is_truthy(inputs["right"])
    prev_left = is_truthy(prev_inputs["left"])
    prev_right = is_truthy(prev_inputs["right"])

    grid = state["grid"]

    cond do
      left and not right ->
        state = Map.put(state, "dasRight", 0)
        das = Map.get(state, "dasLeft", 0)

        should_shift =
          if not prev_left do
            true
          else
            das >= 12 and rem(das - 12, 4) == 0
          end

        state = Map.put(state, "dasLeft", das + 1)

        if should_shift do
          case try_move(grid, active, -1, 0) do
            {:ok, shifted} ->
              state = reset_lock_timer_if_needed(state)
              {state, shifted}

            :blocked ->
              {state, active}
          end
        else
          {state, active}
        end

      right and not left ->
        state = Map.put(state, "dasLeft", 0)
        das = Map.get(state, "dasRight", 0)

        should_shift =
          if not prev_right do
            true
          else
            das >= 12 and rem(das - 12, 4) == 0
          end

        state = Map.put(state, "dasRight", das + 1)

        if should_shift do
          case try_move(grid, active, 1, 0) do
            {:ok, shifted} ->
              state = reset_lock_timer_if_needed(state)
              {state, shifted}

            :blocked ->
              {state, active}
          end
        else
          {state, active}
        end

      true ->
        state = state |> Map.put("dasLeft", 0) |> Map.put("dasRight", 0)
        {state, active}
    end
  end

  # Rotation (CW with wall kicks)
  defp process_rotation_input(state, active, inputs, prev_inputs) do
    rot = is_truthy(inputs["rotate"]) or is_truthy(inputs["rotate_cw"]) or is_truthy(inputs["up"])

    prev_rot =
      is_truthy(prev_inputs["rotate"]) or is_truthy(prev_inputs["rotate_cw"]) or
        is_truthy(prev_inputs["up"])

    if rot and not prev_rot do
      grid = state["grid"]
      curr_rot = active["rotation"]
      next_rot = rem(curr_rot + 1, 4)
      type = active["type"]

      # Wall kick offsets to try: 0, -1, +1, -2, +2
      kick_offsets = [0, -1, 1, -2, 2]

      result =
        Enum.find_value(kick_offsets, fn dx ->
          cand = %{active | "rotation" => next_rot, "x" => active["x"] + dx}

          if valid_position?(grid, type, next_rot, cand["x"], cand["y"]) do
            {:ok, cand}
          else
            nil
          end
        end)

      case result do
        {:ok, rotated} ->
          state = reset_lock_timer_if_needed(state)
          {state, rotated}

        nil ->
          {state, active}
      end
    else
      {state, active}
    end
  end

  # Hard drop input
  defp process_hard_drop_input(state, active, inputs, prev_inputs) do
    drop =
      is_truthy(inputs["drop"]) or is_truthy(inputs["hard_drop"]) or is_truthy(inputs["space"])

    prev_drop =
      is_truthy(prev_inputs["drop"]) or is_truthy(prev_inputs["hard_drop"]) or
        is_truthy(prev_inputs["space"])

    if drop and not prev_drop do
      grid = state["grid"]
      # Drop all the way down
      {dropped_active, drop_distance} = drop_to_bottom(grid, active)
      # 2 points per cell hard dropped
      new_score = state["score"] + drop_distance * 2
      state = Map.put(state, "score", new_score)
      {state, dropped_active, true}
    else
      {state, active, false}
    end
  end

  defp drop_to_bottom(grid, active) do
    Enum.reduce_while(1..@rows, {active, 0}, fn _i, {curr, dist} ->
      case try_move(grid, curr, 0, 1) do
        {:ok, moved} -> {:cont, {moved, dist + 1}}
        :blocked -> {:halt, {curr, dist}}
      end
    end)
  end

  # Gravity & Lock Delay
  defp process_gravity(state, active, inputs) do
    soft_drop = is_truthy(inputs["down"]) or is_truthy(inputs["soft_drop"])
    grid = state["grid"]

    gravity_interval =
      if soft_drop do
        # Soft drop falls every 2 ticks (~30 rows/sec)
        2
      else
        state["gravityTicks"]
      end

    gravity_timer = state["gravityTimer"] + 1

    # Check if piece can fall
    case try_move(grid, active, 0, 1) do
      {:ok, fallen} ->
        if gravity_timer >= gravity_interval do
          score_bonus = if soft_drop, do: 1, else: 0

          state =
            state
            |> Map.put("gravityTimer", 0)
            |> Map.put("lockTimer", 0)
            |> Map.update!("score", &(&1 + score_bonus))

          {state, nil} |> put_active(fallen)
        else
          state = Map.put(state, "gravityTimer", gravity_timer)
          {state, nil} |> put_active(active)
        end

      :blocked ->
        # Piece is on a surface; advance lock timer
        lock_timer = state["lockTimer"] + 1

        if lock_timer >= @lock_delay_ticks do
          lock_piece_and_advance(state, active)
        else
          state =
            state
            |> Map.put("lockTimer", lock_timer)
            |> Map.put("gravityTimer", 0)

          {state, nil} |> put_active(active)
        end
    end
  end

  defp put_active({state, maybe_ended}, active) do
    {Map.put(state, "active", active), maybe_ended}
  end

  # Locks active piece into grid, calculates clears & combos, and spawns next piece
  defp lock_piece_and_advance(state, active) do
    grid = state["grid"]
    type = active["type"]
    rot = active["rotation"]
    px = active["x"]
    py = active["y"]
    piece_id = Map.fetch!(@piece_ids, type)

    # 1. Place cells into grid
    coords = piece_coords(type, rot)

    new_grid =
      Enum.reduce(coords, grid, fn {dx, dy}, g ->
        cx = px + dx
        cy = py + dy

        if cx in 0..(@cols - 1) and cy in 0..(@rows - 1) do
          set_cell(g, cx, cy, piece_id)
        else
          g
        end
      end)

    # 2. Check for completed rows
    {cleared_grid, lines_cleared} = clear_lines(new_grid)

    # 3. Calculate score & level
    level = state["level"]

    line_score =
      case lines_cleared do
        1 -> 100 * level
        2 -> 300 * level
        3 -> 500 * level
        # Sporefall clear!
        4 -> 800 * level
        _ -> 0
      end

    combo = if lines_cleared > 0, do: state["combo"] + 1, else: 0
    combo_score = if lines_cleared > 0 and combo > 1, do: (combo - 1) * 50 * level, else: 0

    total_lines = state["lines"] + lines_cleared
    new_level = 1 + div(total_lines, 10)
    new_score = state["score"] + line_score + combo_score
    # Gravity interval speeds up: 48, 44, 40... down to min 4
    new_gravity_ticks = max(48 - (new_level - 1) * 4, 4)

    # 4. Advance piece from bag
    next_type = state["next"]
    bag = state["bag"]
    rng_state = state["rngState"]
    {upcoming_type, new_bag, new_rng} = get_next_piece(bag, rng_state)

    # 5. Check top-out on spawn
    spawn_x = 4
    spawn_y = 1
    spawn_rot = 0

    if valid_position?(cleared_grid, next_type, spawn_rot, spawn_x, spawn_y) do
      new_active = %{
        "type" => next_type,
        "x" => spawn_x,
        "y" => spawn_y,
        "rotation" => spawn_rot
      }

      next_state =
        state
        |> Map.put("grid", cleared_grid)
        |> Map.put("active", new_active)
        |> Map.put("next", upcoming_type)
        |> Map.put("bag", new_bag)
        |> Map.put("rngState", new_rng)
        |> Map.put("score", new_score)
        |> Map.put("lines", total_lines)
        |> Map.put("level", new_level)
        |> Map.put("combo", combo)
        |> Map.put("gravityTicks", new_gravity_ticks)
        |> Map.put("gravityTimer", 0)
        |> Map.put("lockTimer", 0)
        |> Map.put("lockResets", 0)

      {next_state, nil}
    else
      # Top-out!
      ended_state =
        state
        |> Map.put("grid", cleared_grid)
        |> Map.put("active", nil)
        |> Map.put("score", new_score)
        |> Map.put("lines", total_lines)
        |> Map.put("level", new_level)
        |> Map.put("state", "completed")

      {ended_state,
       {:match_ended, 0,
        %{reason: "top_out", score: new_score, lines: total_lines, level: new_level}}}
    end
  end

  defp clear_lines(grid) do
    # A line is complete if no cell in that row is 0
    incomplete_rows = Enum.reject(grid, fn row -> Enum.all?(row, &(&1 != 0)) end)
    lines_cleared = @rows - length(incomplete_rows)

    if lines_cleared > 0 do
      empty_rows = for _i <- 1..lines_cleared, do: for(_c <- 0..(@cols - 1), do: 0)
      {empty_rows ++ incomplete_rows, lines_cleared}
    else
      {grid, 0}
    end
  end

  defp try_move(grid, active, dx, dy) do
    cand_x = active["x"] + dx
    cand_y = active["y"] + dy
    type = active["type"]
    rot = active["rotation"]

    if valid_position?(grid, type, rot, cand_x, cand_y) do
      {:ok, %{active | "x" => cand_x, "y" => cand_y}}
    else
      :blocked
    end
  end

  defp reset_lock_timer_if_needed(state) do
    resets = Map.get(state, "lockResets", 0)

    if resets < @max_lock_resets do
      state
      |> Map.put("lockTimer", 0)
      |> Map.put("lockResets", resets + 1)
    else
      state
    end
  end

  @doc """
  Checks if a piece of `type` at `rotation` is in a valid (unblocked) position at `px, py`.
  """
  def valid_position?(grid, type, rot, px, py) do
    coords = piece_coords(type, rot)

    Enum.all?(coords, fn {dx, dy} ->
      cx = px + dx
      cy = py + dy

      # x must be strictly in 0..9
      # y can be < 0 (above the board ceiling during spawn)
      # y must be < 20 (not through the floor)
      cond do
        cx < 0 or cx >= @cols -> false
        cy >= @rows -> false
        # Above ceiling is allowed
        cy < 0 -> true
        true -> get_cell(grid, cx, cy) == 0
      end
    end)
  end

  @doc """
  Coordinates `{dx, dy}` for a given piece `type` and `rotation` (0..3).
  """
  def piece_coords(type, rot) do
    rot_idx = rem(rot, 4)

    case type do
      "I" ->
        case rot_idx do
          0 -> [{-1, 0}, {0, 0}, {1, 0}, {2, 0}]
          1 -> [{1, -1}, {1, 0}, {1, 1}, {1, 2}]
          2 -> [{-1, 1}, {0, 1}, {1, 1}, {2, 1}]
          3 -> [{0, -1}, {0, 0}, {0, 1}, {0, 2}]
        end

      "O" ->
        [{0, 0}, {1, 0}, {0, 1}, {1, 1}]

      "T" ->
        case rot_idx do
          0 -> [{-1, 0}, {0, 0}, {1, 0}, {0, -1}]
          1 -> [{0, -1}, {0, 0}, {1, 0}, {0, 1}]
          2 -> [{-1, 0}, {0, 0}, {1, 0}, {0, 1}]
          3 -> [{0, -1}, {0, 0}, {-1, 0}, {0, 1}]
        end

      "S" ->
        case rot_idx do
          0 -> [{0, 0}, {1, 0}, {-1, 1}, {0, 1}]
          1 -> [{0, -1}, {0, 0}, {1, 0}, {1, 1}]
          2 -> [{0, 0}, {1, 0}, {-1, 1}, {0, 1}]
          3 -> [{0, -1}, {0, 0}, {1, 0}, {1, 1}]
        end

      "Z" ->
        case rot_idx do
          0 -> [{-1, 0}, {0, 0}, {0, 1}, {1, 1}]
          1 -> [{1, -1}, {1, 0}, {0, 0}, {0, 1}]
          2 -> [{-1, 0}, {0, 0}, {0, 1}, {1, 1}]
          3 -> [{1, -1}, {1, 0}, {0, 0}, {0, 1}]
        end

      "J" ->
        case rot_idx do
          0 -> [{-1, -1}, {-1, 0}, {0, 0}, {1, 0}]
          1 -> [{0, -1}, {1, -1}, {0, 0}, {0, 1}]
          2 -> [{-1, 0}, {0, 0}, {1, 0}, {1, 1}]
          3 -> [{0, -1}, {0, 0}, {0, 1}, {-1, 1}]
        end

      "L" ->
        case rot_idx do
          0 -> [{1, -1}, {-1, 0}, {0, 0}, {1, 0}]
          1 -> [{0, -1}, {0, 0}, {0, 1}, {1, 1}]
          2 -> [{-1, 0}, {0, 0}, {1, 0}, {-1, 1}]
          3 -> [{-1, -1}, {0, -1}, {0, 0}, {0, 1}]
        end

      _other ->
        [{0, 0}]
    end
  end

  defp get_cell(grid, x, y) do
    row = Enum.at(grid, y)
    if row, do: Enum.at(row, x, 0), else: 0
  end

  defp set_cell(grid, x, y, val) do
    List.update_at(grid, y, fn row ->
      List.replace_at(row, x, val)
    end)
  end

  defp get_next_piece([], rng_state) do
    {new_bag, new_rng} = generate_bag(rng_state)
    [next | rest] = new_bag
    {next, rest, new_rng}
  end

  defp get_next_piece([next | rest], rng_state) do
    {next, rest, rng_state}
  end

  # Deterministic 7-bag randomizer using LCG
  defp generate_bag(seed) do
    # Fisher-Yates shuffle with LCG
    {shuffled, final_seed} =
      Enum.reduce(@piece_types, {[], seed}, fn item, {acc, curr_seed} ->
        next_seed = rem(curr_seed * 1_103_515_245 + 12_345, 2_147_483_647)
        idx = rem(abs(next_seed), max(length(acc) + 1, 1))
        {List.insert_at(acc, idx, item), next_seed}
      end)

    {shuffled, final_seed}
  end

  defp get_player_inputs(players) do
    case Map.get(players, 0) do
      %{input_state: inputs} when is_map(inputs) -> inputs
      _ -> %{}
    end
  end

  defp is_truthy(v) when v in [true, 1, 1.0, "true"], do: true
  defp is_truthy(_), do: false

  defp clean_state_for_snapshot(state) do
    state
    |> Map.delete("bag")
    |> Map.delete("prevInputs")
  end
end

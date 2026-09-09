defmodule Afterlight.Activities.TilePuzzle do
  @moduledoc """
  Authoritative Paper Catacombs shared tile-arrangement puzzle (Task 8.4).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Quiet board games and puzzles — Puzzle collaboration)
  - `design.md` (D1, D5, D7)

  Concurrent slide/swap/reset inputs apply in a single `(seq, slot)` order.
  Every observer sees the same board, progress, and solved state. Reset is
  allowed after solved. No XP or currency is written.
  """

  @rules_version 1
  @grid 4
  @cell_count 16
  @empty 0
  @max_players 4

  @solved_board [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]
  @initial_board [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 1, 2, 0]

  def rules_version, do: @rules_version
  def cell_count, do: @cell_count
  def max_players, do: @max_players
  def solved_board, do: @solved_board
  def initial_board, do: @initial_board

  @doc """
  Initializes the shared manuscript board for up to four visitors.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1, 2, 3]
        list when is_list(list) -> list
      end

    start = Keyword.get(opts, :board, @initial_board) |> List.wrap() |> board_copy()
    progress = progress_fields(start)

    %{
      "rulesVersion" => @rules_version,
      "status" => progress.status,
      "board" => start,
      "initialBoard" => board_copy(start),
      "emptyIndex" => progress.empty_index,
      "correctCount" => progress.correct_count,
      "totalCells" => @cell_count,
      "progress" => progress.progress,
      "solved" => progress.solved,
      "moveCount" => 0,
      "resetCount" => 0,
      "lastMove" => nil,
      "appliedSeqBySlot" => %{},
      "tickCount" => 0,
      "activeSlots" => slots,
      "winner" => nil
    }
  end

  @doc """
  Validates a player control payload (`type` slide | swap | reset).
  """
  def validate_controls(controls) when is_map(controls) do
    type = control_type(controls)

    case type do
      "neutral" ->
        {:ok, %{"type" => "neutral"}}

      "ready" ->
        {:ok, %{"type" => "ready"}}

      type when type in ["slide", "swap", "reset"] ->
        {:ok,
         %{
           "type" => type,
           "tileId" => cell_or_nil(Map.get(controls, "tileId", Map.get(controls, :tileId)), :tile),
           "from" => cell_or_nil(Map.get(controls, "from", Map.get(controls, :from)), :cell),
           "to" => cell_or_nil(Map.get(controls, "to", Map.get(controls, :to)), :cell),
           "seq" => nonneg_or_nil(Map.get(controls, "seq", Map.get(controls, :seq)))
         }}

      _ ->
        {:error, :unknown_type}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Apply one committed input. Illegal moves consume seq without changing the board.
  Reset is allowed after solved.
  """
  def apply_input(sim_state, slot, controls) do
    case validate_controls(controls) do
      {:ok, %{"type" => type}} when type in ["neutral", "ready"] ->
        {sim_state, nil}

      {:ok, move} ->
        seq = move["seq"]
        applied = applied_seq(sim_state, slot)

        if is_integer(seq) and seq <= applied do
          {sim_state, nil}
        else
          do_apply(sim_state, slot, move, seq)
        end

      _ ->
        {sim_state, nil}
    end
  end

  @doc """
  Advance the idle tick and apply pending inputs in `(seq, slot)` order.
  """
  def step_simulation(sim_state, players, steps \\ 1)

  def step_simulation(sim_state, players, steps) do
    n = max(0, trunc(steps || 0))
    state = Map.update(sim_state, "tickCount", n, &(&1 + n))
    moves = collect_pending_moves(players, state["appliedSeqBySlot"] || %{})
    apply_ordered_moves(state, moves)
  end

  @doc """
  Stable concurrent-move ordering: lower seq first, then lower slot.
  """
  def order_concurrent_moves(moves) when is_list(moves) do
    Enum.sort_by(moves, fn move ->
      {seq_of(move), slot_of(move)}
    end)
  end

  def order_concurrent_moves(_), do: []

  def apply_ordered_moves(sim_state, moves) do
    ordered = order_concurrent_moves(moves)

    {state, events} =
      Enum.reduce(ordered, {sim_state, []}, fn move, {acc, evs} ->
        controls = controls_with_seq(move)
        {next, event} = apply_input(acc, slot_of(move), controls)
        evs = if event, do: evs ++ [event], else: evs
        {next, evs}
      end)

    event =
      Enum.find(Enum.reverse(events), &(&1["type"] == "puzzle_solved")) ||
        List.last(events)

    {state, event}
  end

  defp do_apply(sim_state, slot, %{"type" => "reset"} = _move, seq) do
    start = board_copy(sim_state["initialBoard"] || @initial_board)

    state =
      sim_state
      |> remember_seq(slot, seq)
      |> Map.put("board", start)
      |> Map.put("moveCount", 0)
      |> Map.put("resetCount", Map.get(sim_state, "resetCount", 0) + 1)
      |> Map.put("lastMove", %{
        "type" => "reset",
        "slot" => slot,
        "from" => nil,
        "to" => nil,
        "tileId" => nil
      })
      |> put_progress()

    event = %{
      "type" => "puzzle_reset",
      "slot" => slot,
      "payload" => %{
        "slot" => slot,
        "board" => board_copy(state["board"]),
        "correctCount" => state["correctCount"],
        "progress" => state["progress"],
        "solved" => state["solved"],
        "resetCount" => state["resetCount"]
      }
    }

    {state, event}
  end

  defp do_apply(sim_state, slot, move, seq) do
    state = remember_seq(sim_state, slot, seq)

    if state["status"] == "solved" or state["solved"] == true do
      {state, nil}
    else
      case resolve_move(state["board"], move) do
        {:ok, from, to, tile_id, action} ->
          board = swap_cells(state["board"], from, to)

          state =
            state
            |> Map.put("board", board)
            |> Map.put("moveCount", Map.get(state, "moveCount", 0) + 1)
            |> Map.put("lastMove", %{
              "type" => action,
              "slot" => slot,
              "from" => from,
              "to" => to,
              "tileId" => tile_id
            })
            |> put_progress()

          event_type = if state["solved"], do: "puzzle_solved", else: event_name(action)

          event = %{
            "type" => event_type,
            "slot" => slot,
            "payload" => %{
              "slot" => slot,
              "type" => action,
              "from" => from,
              "to" => to,
              "tileId" => tile_id,
              "board" => board_copy(state["board"]),
              "correctCount" => state["correctCount"],
              "progress" => state["progress"],
              "solved" => state["solved"],
              "moveCount" => state["moveCount"]
            }
          }

          {state, event}

        :error ->
          {state, nil}
      end
    end
  end

  defp resolve_move(board, %{"type" => "swap"} = move) do
    from = move["from"] || find_tile(board, move["tileId"])
    to = move["to"]

    cond do
      from == nil or to == nil -> :error
      from == to -> :error
      true -> {:ok, from, to, Enum.at(board, from), "swap"}
    end
  end

  defp resolve_move(board, move) do
    empty = empty_index(board)
    from = move["from"] || find_tile(board, move["tileId"])
    to = move["to"] || empty

    cond do
      empty < 0 or from == nil -> :error
      move["tileId"] == @empty and move["from"] == nil -> :error
      to != empty -> :error
      from == to -> :error
      not adjacent?(from, to) -> :error
      true -> {:ok, from, to, Enum.at(board, from), "slide"}
    end
  end

  defp collect_pending_moves(players, applied) when is_map(players) do
    players
    |> Enum.flat_map(fn {key, entry} ->
      slot = slot_from(key, entry)
      pending = pending_controls(entry)

      Enum.flat_map(pending, fn controls ->
        type = control_type(controls)

        if type in ["", "neutral", "ready"] do
          []
        else
          seq =
            nonneg_or_nil(Map.get(controls, "seq", Map.get(controls, :seq))) ||
              seq_from_entry(entry) ||
              0

          applied_at = applied_lookup(applied, slot)

          if seq <= applied_at do
            []
          else
            [%{slot: slot, seq: seq, controls: stringify_keys(controls)}]
          end
        end
      end)
    end)
  end

  defp collect_pending_moves(_, _), do: []

  defp pending_controls(entry) when is_map(entry) do
    cond do
      is_list(entry[:pending]) -> entry[:pending]
      is_list(entry["pending"]) -> entry["pending"]
      true ->
        controls =
          entry[:input_state] || entry["input_state"] || entry[:inputState] ||
            entry["inputState"] || entry[:controls] || entry["controls"] || entry

        if is_map(controls), do: [controls], else: []
    end
  end

  defp pending_controls(_), do: []

  defp controls_with_seq(%{controls: controls, seq: seq}) when is_map(controls) do
    controls
    |> stringify_keys()
    |> Map.put("seq", seq)
  end

  defp controls_with_seq(move) when is_map(move), do: stringify_keys(move)
  defp controls_with_seq(_), do: %{}

  defp put_progress(state) do
    fields = progress_fields(state["board"])

    state
    |> Map.put("emptyIndex", fields.empty_index)
    |> Map.put("correctCount", fields.correct_count)
    |> Map.put("progress", fields.progress)
    |> Map.put("solved", fields.solved)
    |> Map.put("status", fields.status)
    |> Map.put("winner", if(fields.solved, do: state["winner"], else: nil))
  end

  defp progress_fields(board) do
    correct = count_correct(board)
    solved? = correct == @cell_count

    %{
      correct_count: correct,
      progress: correct / @cell_count,
      solved: solved?,
      status: if(solved?, do: "solved", else: "arranging"),
      empty_index: empty_index(board)
    }
  end

  defp count_correct(board) do
    board
    |> Enum.with_index()
    |> Enum.count(fn {tile, i} -> tile == Enum.at(@solved_board, i) end)
  end

  defp empty_index(board), do: Enum.find_index(board, &(&1 == @empty)) || -1

  defp find_tile(_board, nil), do: nil

  defp find_tile(board, tile_id) do
    Enum.find_index(board, &(&1 == tile_id))
  end

  defp adjacent?(a, b) when is_integer(a) and is_integer(b) do
    ra = div(a, @grid)
    ca = rem(a, @grid)
    rb = div(b, @grid)
    cb = rem(b, @grid)
    abs(ra - rb) + abs(ca - cb) == 1
  end

  defp adjacent?(_, _), do: false

  defp swap_cells(board, from, to) do
    a = Enum.at(board, from)
    b = Enum.at(board, to)

    board
    |> List.replace_at(from, b)
    |> List.replace_at(to, a)
  end

  defp remember_seq(state, _slot, nil), do: state

  defp remember_seq(state, slot, seq) do
    applied = Map.get(state, "appliedSeqBySlot", %{})
    Map.put(state, "appliedSeqBySlot", Map.put(applied, to_string(slot), seq))
  end

  defp applied_seq(state, slot) do
    applied_lookup(Map.get(state, "appliedSeqBySlot", %{}), slot)
  end

  defp applied_lookup(applied, slot) when is_map(applied) do
    val = Map.get(applied, slot) || Map.get(applied, to_string(slot))
    if is_integer(val), do: val, else: -1
  end

  defp applied_lookup(_, _), do: -1

  defp control_type(controls) when is_map(controls) do
    raw = Map.get(controls, "type", Map.get(controls, :type, Map.get(controls, "kind", Map.get(controls, :kind, "slide"))))
    kind_string(raw)
  end

  defp control_type(_), do: ""

  defp kind_string(kind) when is_binary(kind), do: String.downcase(kind)
  defp kind_string(kind) when is_atom(kind), do: kind |> Atom.to_string() |> String.downcase()
  defp kind_string(_), do: "slide"

  defp cell_or_nil(value, kind) do
    i = int_or_nil(value)

    cond do
      is_nil(i) -> nil
      i < 0 or i >= @cell_count -> nil
      kind == :tile and i < @empty -> nil
      true -> i
    end
  end

  defp nonneg_or_nil(value) do
    i = int_or_nil(value)
    if is_integer(i) and i >= 0, do: i, else: nil
  end

  defp int_or_nil(v) when is_integer(v), do: v
  defp int_or_nil(v) when is_float(v), do: trunc(v)
  defp int_or_nil(_), do: nil

  defp seq_of(%{seq: seq}), do: seq || 0
  defp seq_of(%{"seq" => seq}) when is_integer(seq), do: seq
  defp seq_of(_), do: 0

  defp slot_of(%{slot: slot}) when is_integer(slot), do: slot
  defp slot_of(%{"slot" => slot}) when is_integer(slot), do: slot
  defp slot_of(_), do: 0

  defp slot_from(key, entry) when is_map(entry) do
    int_or_nil(entry[:slot] || entry["slot"]) || int_or_nil(key) || 0
  end

  defp slot_from(key, _), do: int_or_nil(key) || 0

  defp seq_from_entry(entry) when is_map(entry) do
    int_or_nil(entry[:last_seq] || entry["last_seq"] || entry[:lastSeq] || entry["lastSeq"])
  end

  defp seq_from_entry(_), do: nil

  defp event_name("swap"), do: "tile_swapped"
  defp event_name(_), do: "tile_slid"

  defp board_copy(board) when is_list(board), do: Enum.to_list(board)
  defp board_copy(_), do: Enum.to_list(@initial_board)

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp stringify_keys(_), do: %{}
end

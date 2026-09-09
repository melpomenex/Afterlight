defmodule Afterlight.Activities.Checkers do
  @moduledoc """
  Authoritative English draughts / American checkers (Task 8.3).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Quiet board games; illegal board move)
  - `design.md` (D1, D5, D7)

  Mandatory captures, chained jumps in one `path`, short-range kings,
  no-legal-move loss, resignation, and agreed draw. Concurrent inputs
  serialize as resign → draw → side-to-move only.
  """

  @rules_version 1
  @files "abcdefgh"

  @black_dirs [{1, 1}, {1, -1}]
  @white_dirs [{-1, 1}, {-1, -1}]
  @king_dirs [{1, 1}, {1, -1}, {-1, 1}, {-1, -1}]

  def rules_version, do: @rules_version

  @doc """
  Initializes a two-seat draughts table.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        list when is_list(list) and list != [] -> list
        _ -> [0, 1]
      end

    board =
      case Keyword.get(opts, :board) do
        map when is_map(map) -> normalize_board(map)
        _ -> starting_board()
      end

    turn = if Keyword.get(opts, :turn) == 1, do: 1, else: 0

    %{
      "rulesVersion" => @rules_version,
      "status" => "playing",
      "turn" => turn,
      "ply" => 0,
      "moveNumber" => 1,
      "board" => board,
      "lastMove" => nil,
      "drawOfferedBy" => nil,
      "winner" => nil,
      "result" => nil,
      "activeSlots" => slots,
      "players" => Map.new(slots, fn slot -> {to_string(slot), %{"slot" => slot, "ready" => false}} end)
    }
  end

  def starting_board do
    dark =
      for rank <- 1..3, file <- 0..7, playable?(file, rank), into: %{} do
        {square_name(file, rank), %{"slot" => 0, "king" => false}}
      end

    light =
      for rank <- 6..8, file <- 0..7, playable?(file, rank), into: %{} do
        {square_name(file, rank), %{"slot" => 1, "king" => false}}
      end

    Map.merge(dark, light)
  end

  @doc """
  Validates move/resign/draw controls. `type` and `kind` are accepted.
  """
  def validate_controls(controls) when is_map(controls) do
    case action_type(controls) do
      type when type in ["neutral", "ready"] ->
        {:ok, %{"type" => type}}

      type when type in ["resign", "draw"] ->
        {:ok, %{"type" => type}}

      "move" ->
        case normalize_square(get_field(controls, "from", :from)) do
          nil ->
            {:error, :invalid_from}

          from ->
            case path_landings(from, get_field(controls, "to", :to), get_field(controls, "path", :path)) do
              {:ok, landings, to} ->
                {:ok, %{"type" => "move", "from" => from, "to" => to, "path" => landings}}

              {:error, reason} ->
                {:error, reason}
            end
        end

      "" ->
        {:error, :invalid_controls}

      _ ->
        {:error, :unknown_type}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Apply one input. Illegal and out-of-turn moves return the same position.
  """
  def apply_input(%{"status" => "complete"} = sim_state, _slot, _controls) do
    {sim_state, nil}
  end

  def apply_input(sim_state, slot, controls) do
    side = slot_int(slot)

    cond do
      side not in [0, 1] ->
        {sim_state, %{"type" => "illegal_move", "reason" => "invalid_slot", "slot" => slot}}

      true ->
        case validate_controls(controls) do
          {:ok, %{"type" => type}} when type in ["neutral", "ready"] ->
            {sim_state, %{"type" => type, "slot" => side}}

          {:ok, %{"type" => "resign"}} ->
            next = finish_resign(sim_state, side)

            {next,
             %{
               "type" => "match_ended",
               "slot" => side,
               "winner" => next["winner"],
               "result" => "resign"
             }}

          {:ok, %{"type" => "draw"}} ->
            apply_draw(sim_state, side)

          {:ok, %{"type" => "move"} = want} ->
            if sim_state["turn"] != side do
              {sim_state, %{"type" => "illegal_move", "reason" => "out_of_turn", "slot" => side}}
            else
              apply_move(sim_state, side, want)
            end

          {:error, reason} ->
            {sim_state, %{"type" => "illegal_move", "reason" => to_string(reason), "slot" => side}}
        end
    end
  end

  @doc """
  Concurrent ordering: both resign → draw; one resign; draw offers;
  then only the side-to-move's move.
  """
  def step_simulation(sim_state, players, _steps \\ 1)

  def step_simulation(%{"status" => "complete"} = sim_state, _players, _steps) do
    {sim_state, nil}
  end

  def step_simulation(sim_state, players, _steps) do
    slots = active_slots(sim_state, players)
    resigners = Enum.filter(slots, fn slot -> action_type(player_input(players, slot)) == "resign" end)

    cond do
      length(resigners) >= 2 ->
        next = finish_draw(sim_state)
        {next, match_ended_tuple(next)}

      length(resigners) == 1 ->
        {next, _event} = apply_input(sim_state, hd(resigners), %{"type" => "resign"})
        {next, match_ended_tuple(next)}

      true ->
        {state, event} =
          Enum.reduce(slots, {sim_state, nil}, fn slot, {acc, last} ->
            if action_type(player_input(players, slot)) == "draw" do
              {next, ev} = apply_input(acc, slot, %{"type" => "draw"})
              {next, ev}
            else
              {acc, last}
            end
          end)

        if state["status"] == "complete" do
          {state, match_ended_tuple(state)}
        else
          turn = state["turn"]
          input = player_input(players, turn)

          {state, event} =
            if action_type(input) == "move" do
              apply_input(state, turn, input)
            else
              {state, event}
            end

          if state["status"] == "complete" do
            {state, match_ended_tuple(state)}
          else
            {state, event}
          end
        end
    end
  end

  def list_legal_moves(sim_state, slot \\ nil) do
    side = slot_int(slot || sim_state["turn"])
    board = normalize_board(sim_state["board"] || %{})

    {captures, quiets} =
      Enum.reduce(board, {[], []}, fn {from, raw}, {cap_acc, quiet_acc} ->
        piece = normalize_piece(raw)

        if piece && piece.slot == side do
          chains = capture_sequences(board, from, piece, MapSet.new())
          described = Enum.map(chains, &describe_capture/1)

          if described == [] do
            {cap_acc, quiet_acc ++ quiet_moves(board, from, piece)}
          else
            {cap_acc ++ described, quiet_acc}
          end
        else
          {cap_acc, quiet_acc}
        end
      end)

    if captures != [], do: captures, else: quiets
  end

  defp apply_draw(sim_state, side) do
    case sim_state["drawOfferedBy"] do
      ^side ->
        {sim_state, %{"type" => "draw_offered", "slot" => side}}

      other when other in [0, 1] ->
        next = finish_draw(sim_state)

        {next,
         %{
           "type" => "match_ended",
           "slot" => side,
           "winner" => nil,
           "result" => "draw"
         }}

      _ ->
        next = Map.put(sim_state, "drawOfferedBy", side)
        {next, %{"type" => "draw_offered", "slot" => side}}
    end
  end

  defp apply_move(sim_state, side, want) do
    case match_legal(list_legal_moves(sim_state, side), want) do
      {:ok, move} ->
        next = apply_legal_move(sim_state, side, move)

        event = %{
          "type" => if(next["status"] == "complete", do: "match_ended", else: "moved"),
          "slot" => side,
          "from" => move.from,
          "to" => move.to,
          "path" => move.path,
          "captures" => move.captures,
          "promoted" => move.promoted,
          "turn" => next["turn"],
          "winner" => next["winner"],
          "result" => next["result"]
        }

        {next, event}

      {:error, reason} ->
        {sim_state, %{"type" => "illegal_move", "reason" => to_string(reason), "slot" => side}}
    end
  end

  defp apply_legal_move(sim_state, slot, move) do
    board = normalize_board(sim_state["board"])
    piece = normalize_piece(Map.get(board, move.from))

    board =
      board
      |> Map.delete(move.from)
      |> then(fn b -> Enum.reduce(move.captures, b, &Map.delete(&2, &1)) end)
      |> Map.put(move.to, %{
        "slot" => slot,
        "king" => (piece && piece.king) || move.promoted
      })

    next = %{
      sim_state
      | "board" => board,
        "turn" => 1 - slot,
        "ply" => (sim_state["ply"] || 0) + 1,
        "lastMove" => %{
          "from" => move.from,
          "to" => move.to,
          "path" => move.path,
          "captures" => move.captures,
          "slot" => slot,
          "promoted" => move.promoted
        },
        "drawOfferedBy" => nil,
        "moveNumber" =>
          if(slot == 1, do: (sim_state["moveNumber"] || 1) + 1, else: sim_state["moveNumber"] || 1)
    }

    if list_legal_moves(next, next["turn"]) == [] do
      next
      |> Map.put("status", "complete")
      |> Map.put("winner", slot)
      |> Map.put("result", "no_legal_move")
    else
      next
      |> Map.put("status", "playing")
      |> Map.put("winner", nil)
      |> Map.put("result", nil)
    end
  end

  defp match_legal(legals, want) do
    matches = Enum.filter(legals, &same_move(&1, want))

    case matches do
      [move] -> {:ok, move}
      [] -> {:error, :illegal_move}
      _ -> {:error, :ambiguous_path}
    end
  end

  defp same_move(legal, want) do
    want_from = want["from"]
    want_to = want["to"]
    want_path = want["path"] || [want_to]

    legal.from == want_from and legal.to == want_to and
      (length(want_path) == 1 or legal.path == want_path)
  end

  defp capture_sequences(board, from, piece, already) do
    Enum.flat_map(dirs_for(piece), fn {d_rank, d_file} ->
      mid = offset_square(from, d_rank, d_file)
      land = offset_square(from, d_rank * 2, d_file * 2)

      victim = mid && Map.get(board, mid)

      cond do
        is_nil(mid) or is_nil(land) ->
          []

        is_nil(victim) or victim["slot"] == piece.slot ->
          []

        MapSet.member?(already, mid) or Map.has_key?(board, land) ->
          []

        true ->
          promoted = !piece.king and rank_of(land) == promotion_rank(piece.slot)
          next_piece = %{slot: piece.slot, king: piece.king or promoted}

          next_board =
            board
            |> Map.delete(from)
            |> Map.delete(mid)
            |> Map.put(land, %{"slot" => next_piece.slot, "king" => next_piece.king})

          step = %{from: from, to: land, capture: mid, promoted: promoted}

          if promoted do
            [[step]]
          else
            further = capture_sequences(next_board, land, next_piece, MapSet.put(already, mid))

            if further == [] do
              [[step]]
            else
              Enum.map(further, &[step | &1])
            end
          end
      end
    end)
  end

  defp quiet_moves(board, from, piece) do
    Enum.flat_map(dirs_for(piece), fn {d_rank, d_file} ->
      case offset_square(from, d_rank, d_file) do
        nil ->
          []

        to ->
          if Map.has_key?(board, to) do
            []
          else
            promoted = !piece.king and rank_of(to) == promotion_rank(piece.slot)

            [
              %{
                from: from,
                to: to,
                path: [to],
                captures: [],
                promoted: promoted
              }
            ]
          end
      end
    end)
  end

  defp describe_capture(steps) do
    last = List.last(steps)

    %{
      from: hd(steps).from,
      to: last.to,
      path: Enum.map(steps, & &1.to),
      captures: Enum.map(steps, & &1.capture),
      promoted: Enum.any?(steps, & &1.promoted)
    }
  end

  defp finish_resign(sim_state, slot) do
    sim_state
    |> Map.put("status", "complete")
    |> Map.put("winner", 1 - slot)
    |> Map.put("result", "resign")
    |> Map.put("drawOfferedBy", nil)
  end

  defp finish_draw(sim_state) do
    sim_state
    |> Map.put("status", "complete")
    |> Map.put("winner", nil)
    |> Map.put("result", "draw")
    |> Map.put("drawOfferedBy", nil)
  end

  defp match_ended_tuple(state) do
    {:match_ended, state["winner"],
     %{
       "winnerSlot" => state["winner"],
       "result" => state["result"],
       "reason" => state["result"]
     }}
  end

  defp dirs_for(%{king: true}), do: @king_dirs
  defp dirs_for(%{slot: 0}), do: @black_dirs
  defp dirs_for(_), do: @white_dirs

  defp promotion_rank(0), do: 8
  defp promotion_rank(_), do: 1

  defp playable?(file, rank) when file >= 0 and file <= 7 and rank >= 1 and rank <= 8 do
    rem(file + rank, 2) == 1
  end

  defp playable?(_, _), do: false

  defp square_name(file, rank) do
    String.at(@files, file) <> Integer.to_string(rank)
  end

  defp rank_of(<<_file, rank>>) do
    rank - ?0
  end

  defp rank_of(square) when is_binary(square) do
    String.to_integer(String.slice(square, 1, 1))
  end

  defp coords(square) do
    case normalize_square(square) do
      nil ->
        nil

      <<file_char, rank_char>> ->
        file = file_char - ?a
        rank = rank_char - ?0
        {file, rank}
    end
  end

  defp offset_square(square, d_rank, d_file) do
    case coords(square) do
      {file, rank} ->
        nfile = file + d_file
        nrank = rank + d_rank
        if playable?(nfile, nrank), do: square_name(nfile, nrank), else: nil

      _ ->
        nil
    end
  end

  defp normalize_board(board) when is_map(board) do
    Enum.reduce(board, %{}, fn {key, value}, acc ->
      sq = normalize_square(key)
      piece = normalize_piece(value)

      if sq && piece do
        Map.put(acc, sq, %{"slot" => piece.slot, "king" => piece.king})
      else
        acc
      end
    end)
  end

  defp normalize_board(_), do: %{}

  defp normalize_piece(raw) when is_map(raw) do
    slot = slot_int(get_field(raw, "slot", :slot) || get_field(raw, "color", :color))

    if slot in [0, 1] do
      %{slot: slot, king: truthy?(get_field(raw, "king", :king))}
    else
      nil
    end
  end

  defp normalize_piece(_), do: nil

  defp normalize_square(value) when is_binary(value) do
    raw = String.downcase(String.trim(value))

    if String.match?(raw, ~r/^[a-h][1-8]$/) do
      <<file_char, rank_char>> = raw
      file = file_char - ?a
      rank = rank_char - ?0
      if playable?(file, rank), do: raw, else: nil
    else
      nil
    end
  end

  defp normalize_square(value) when is_atom(value), do: normalize_square(Atom.to_string(value))

  defp normalize_square([file, rank]) do
    file_i = file_index(file)
    rank_i = if is_integer(rank), do: rank, else: nil
    if playable?(file_i, rank_i), do: square_name(file_i, rank_i), else: nil
  end

  defp normalize_square(%{} = value) do
    file_i = file_index(get_field(value, "file", :file) || get_field(value, "x", :x))
    rank_i = get_field(value, "rank", :rank) || get_field(value, "y", :y)
    rank_i = if is_integer(rank_i), do: rank_i, else: nil
    if playable?(file_i, rank_i), do: square_name(file_i, rank_i), else: nil
  end

  defp normalize_square(_), do: nil

  defp file_index(file) when is_integer(file), do: file

  defp file_index(file) when is_binary(file) do
    case String.downcase(file) do
      <<c>> when c >= ?a and c <= ?h -> c - ?a
      _ -> -1
    end
  end

  defp file_index(_), do: -1

  defp path_landings(from, to, path) do
    landings =
      cond do
        is_list(path) ->
          Enum.reduce_while(path, [], fn step, acc ->
            case normalize_square(step) do
              nil -> {:halt, :invalid}
              ^from -> {:cont, acc}
              sq -> {:cont, acc ++ [sq]}
            end
          end)

        true ->
          []
      end

    if landings == :invalid do
      {:error, :invalid_path}
    else
      dest = normalize_square(to)

      landings =
        if dest && (landings == [] or List.last(landings) != dest) do
          landings ++ [dest]
        else
          landings
        end

      if landings == [] do
        {:error, :missing_destination}
      else
        {:ok, landings, List.last(landings)}
      end
    end
  end

  defp action_type(controls) when is_map(controls) do
    raw = get_field(controls, "type", :type) || get_field(controls, "kind", :kind) || ""

    cond do
      is_binary(raw) -> String.downcase(String.trim(raw))
      is_atom(raw) -> raw |> Atom.to_string() |> String.downcase()
      true -> ""
    end
  end

  defp action_type(_), do: ""

  defp player_input(players, slot) when is_map(players) do
    entry = Map.get(players, slot) || Map.get(players, to_string(slot)) || Map.get(players, :"#{slot}")

    cond do
      is_nil(entry) ->
        nil

      is_map(entry) ->
        Map.get(entry, :input_state) ||
          Map.get(entry, "input_state") ||
          Map.get(entry, :inputState) ||
          Map.get(entry, :controls) ||
          entry

      true ->
        nil
    end
  end

  defp player_input(_, _), do: nil

  defp active_slots(sim_state, players) do
    declared = sim_state["activeSlots"] || [0, 1]

    extras =
      players
      |> Map.keys()
      |> Enum.map(&slot_int/1)

    (declared ++ extras)
    |> Enum.map(&slot_int/1)
    |> Enum.filter(&(&1 in [0, 1]))
    |> Enum.uniq()
    |> Enum.sort()
  end

  defp slot_int(slot) when is_integer(slot), do: slot
  defp slot_int(slot) when is_binary(slot) do
    case Integer.parse(slot) do
      {n, ""} -> n
      _ -> -1
    end
  end

  defp slot_int(_), do: -1

  defp get_field(map, string_key, atom_key) do
    Map.get(map, string_key, Map.get(map, atom_key))
  end

  defp truthy?(true), do: true
  defp truthy?("true"), do: true
  defp truthy?(_), do: false
end

defmodule Afterlight.Activities.Chess do
  @moduledoc """
  Afterlight house chess — rulesVersion 1.

  Compact original Elixir twin of `shared/chessModel.js`. FIDE special moves
  (castling, en passant, promotion to Q/R/B/N) without an npm/Hex chess
  library. House chess, not a tournament-federation claim.

  - Slot 0 is White, slot 1 is Black.
  - Out-of-turn play and moves that leave the king in check are rejected.
  - Checkmate and stalemate end automatically.
  - Fifty-move (100 half-moves) and threefold repetition draw automatically,
    and may also be claimed with `draw_offer` when already available.
  - Resignation and agreed draw (`draw_offer` + `draw_accept`) are supported.
  """

  @rules_version 1
  @rules_name "afterlight-house-chess"
  @start_board "RNBQKBNRPPPPPPPP................................pppppppprnbqkbnr"
  @files ~c"abcdefgh"
  @knight_deltas [{1, 2}, {2, 1}, {-1, 2}, {-2, 1}, {1, -2}, {2, -1}, {-1, -2}, {-2, -1}]
  @king_deltas [{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}]
  @bishop_dirs [{1, 1}, {1, -1}, {-1, 1}, {-1, -1}]
  @rook_dirs [{1, 0}, {-1, 0}, {0, 1}, {0, -1}]
  @promo_types ~w(q r b n)

  def rules_version, do: @rules_version
  def rules_name, do: @rules_name
  def start_board, do: @start_board

  @doc """
  Initializes chess simulation state.
  `opts` may include `:slots` and `:environment`.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1]
        list when is_list(list) -> list
      end

    env = Keyword.get(opts, :environment)
    board = Keyword.get(opts, :board, @start_board)
    turn = Keyword.get(opts, :turn, "w")
    castling = Keyword.get(opts, :castling, "KQkq")
    ep = Keyword.get(opts, :ep_square) || Keyword.get(opts, :epSquare)
    halfmove = Keyword.get(opts, :halfmove, 0)
    fullmove = Keyword.get(opts, :fullmove, 1)

    state = %{
      "rulesVersion" => @rules_version,
      "rulesName" => @rules_name,
      "status" => "playing",
      "turn" => turn,
      "board" => board,
      "castling" => castling || "-",
      "epSquare" => ep,
      "halfmove" => halfmove,
      "fullmove" => fullmove,
      "drawOffer" => nil,
      "winner" => nil,
      "reason" => nil,
      "inCheck" => in_check?(board, turn),
      "lastMove" => nil,
      "positionCounts" => %{},
      "activeSlots" => slots,
      "environment" => env
    }

    state
    |> bump_repetition()
    |> conclude_if_needed()
  end

  @doc """
  Applies a player input. Controls: type move|resign|draw_offer|draw_accept.
  """
  def apply_input(sim_state, slot, controls) do
    cond do
      not is_map(sim_state) ->
        {:error, :invalid_controls}

      sim_state["status"] not in [nil, "playing"] ->
        {:error, :game_over}

      true ->
        do_apply(sim_state, slot, controls)
    end
  end

  @doc """
  Board games have no per-tick physics. Returns match_ended when already complete.
  """
  def step_simulation(sim_state, _players, _steps \\ 1) do
    if sim_state["status"] == "complete" do
      details = %{"reason" => sim_state["reason"] || "complete"}
      {sim_state, {:match_ended, sim_state["winner"], details}}
    else
      {sim_state, nil}
    end
  end

  def from_fen(fen, opts \\ []) when is_binary(fen) do
    [board_part | rest] = String.split(String.trim(fen), ~r/\s+/)
    rows = String.split(board_part, "/")

    board =
      rows
      |> Enum.reverse()
      |> Enum.map(&expand_fen_row/1)
      |> Enum.join()

    turn = Enum.at(rest, 0, "w")
    castling = fen_castle(Enum.at(rest, 1, "KQkq"))
    ep = fen_ep(Enum.at(rest, 2, "-"))
    halfmove = parse_int(Enum.at(rest, 3), 0)
    fullmove = parse_int(Enum.at(rest, 4), 1)

    init_sim_state(
      Keyword.merge(opts,
        board: board,
        turn: turn,
        castling: castling,
        ep_square: ep,
        halfmove: halfmove,
        fullmove: fullmove
      )
    )
  end

  def to_fen(state) do
    ranks =
      7..0//-1
      |> Enum.map(fn r ->
        0..7
        |> Enum.map(fn f -> board_at(state["board"], r * 8 + f) end)
        |> fen_collapse()
      end)
      |> Enum.join("/")

    castle = if state["castling"] in [nil, "", "-"], do: "-", else: state["castling"]
    ep = state["epSquare"] || "-"
    "#{ranks} #{state["turn"]} #{castle} #{ep} #{state["halfmove"] || 0} #{state["fullmove"] || 1}"
  end

  def legal_moves(state, from_sq \\ nil) do
    if state["status"] != "playing" do
      []
    else
      color = state["turn"]
      from_filter = if from_sq == nil, do: -1, else: algebraic_to_index(from_sq)

      generate_pseudo(state, color)
      |> Enum.filter(fn move ->
        from_filter < 0 or move.from == from_filter
      end)
      |> Enum.filter(fn move ->
        next = apply_raw(state, move)
        not in_check?(next["board"], color)
      end)
      |> Enum.map(fn move ->
        %{
          from: index_to_algebraic(move.from),
          to: index_to_algebraic(move.to),
          promo: Map.get(move, :promo),
          castle: Map.get(move, :castle),
          en_passant: Map.get(move, :en_passant, false)
        }
      end)
    end
  end

  def same_position?(a, b) do
    a["board"] == b["board"] and a["turn"] == b["turn"] and
      (a["castling"] || "-") == (b["castling"] || "-") and
      (a["epSquare"] || nil) == (b["epSquare"] || nil) and
      (a["status"] || "playing") == (b["status"] || "playing") and
      (a["reason"] || nil) == (b["reason"] || nil) and
      (a["winner"] || nil) == (b["winner"] || nil)
  end

  def apply_moves(state, moves) do
    Enum.reduce_while(moves, {:ok, state, []}, fn move, {:ok, acc, _} ->
      slot = color_to_slot(acc["turn"])
      controls = Map.put(move, "type", Map.get(move, "type", "move"))

      case apply_input(acc, slot, controls) do
        {:ok, next, events} -> {:cont, {:ok, next, events}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp do_apply(sim_state, slot, controls) do
    case parse_controls(controls) do
      {:error, reason} ->
        {:error, reason}

      {:ok, parsed} ->
        player_slot = if is_integer(slot), do: slot, else: parse_int(slot, -1)

        if player_slot not in [0, 1] do
          {:error, :invalid_controls}
        else
          apply_parsed(sim_state, player_slot, parsed)
        end
    end
  end

  defp apply_parsed(sim_state, player_slot, %{"type" => "resign"}) do
    next =
      sim_state
      |> Map.put("status", "complete")
      |> Map.put("reason", "resignation")
      |> Map.put("winner", if(player_slot == 0, do: 1, else: 0))
      |> Map.put("drawOffer", nil)

    {:ok, next,
     [
       %{"type" => "resigned", "slot" => player_slot, "winner" => next["winner"]},
       game_over_event(next)
     ]}
  end

  defp apply_parsed(sim_state, player_slot, %{"type" => "draw_offer"}) do
    case claimable_draw(sim_state) do
      reason when is_binary(reason) ->
        next =
          sim_state
          |> Map.put("status", "complete")
          |> Map.put("reason", reason)
          |> Map.put("winner", nil)
          |> Map.put("drawOffer", nil)

        {:ok, next, [game_over_event(next)]}

      nil ->
        if slot_to_color(player_slot) != sim_state["turn"] do
          {:error, :out_of_turn}
        else
          next = Map.put(sim_state, "drawOffer", player_slot)
          {:ok, next, [%{"type" => "draw_offered", "slot" => player_slot}]}
        end
    end
  end

  defp apply_parsed(sim_state, player_slot, %{"type" => "draw_accept"}) do
    cond do
      is_nil(sim_state["drawOffer"]) ->
        {:error, :no_pending_draw}

      sim_state["drawOffer"] == player_slot ->
        {:error, :invalid_controls}

      true ->
        next =
          sim_state
          |> Map.put("status", "complete")
          |> Map.put("reason", "agreement")
          |> Map.put("winner", nil)
          |> Map.put("drawOffer", nil)

        {:ok, next, [%{"type" => "draw_agreed"}, game_over_event(next)]}
    end
  end

  defp apply_parsed(sim_state, player_slot, %{"type" => "move"} = parsed) do
    if slot_to_color(player_slot) != sim_state["turn"] do
      {:error, :out_of_turn}
    else
      from_alg = index_to_algebraic(parsed.from)
      legal = legal_moves(sim_state, from_alg)

      match =
        Enum.find(legal, fn m ->
          algebraic_to_index(m.to) == parsed.to and
            if m.promo do
              (parsed.promo || "q") == m.promo
            else
              is_nil(parsed.promo)
            end
        end)

      cond do
        is_nil(match) ->
          pseudo? =
            Enum.any?(generate_pseudo(sim_state, sim_state["turn"]), fn m ->
              m.from == parsed.from and m.to == parsed.to
            end)

          {:error, if(pseudo?, do: :king_in_check, else: :illegal_move)}

        true ->
          raw = %{
            from: parsed.from,
            to: parsed.to,
            promo: match.promo,
            castle: match.castle,
            en_passant: match.en_passant,
            double:
              piece_type(board_at(sim_state["board"], parsed.from)) == "p" and
                abs(rank_of(parsed.to) - rank_of(parsed.from)) == 2
          }

          next =
            sim_state
            |> apply_raw(raw)
            |> bump_repetition()
            |> conclude_if_needed()

          events = [
            %{
              "type" => "moved",
              "slot" => player_slot,
              "from" => next["lastMove"]["from"],
              "to" => next["lastMove"]["to"],
              "promo" => next["lastMove"]["promo"],
              "captured" => next["lastMove"]["captured"],
              "check" => next["inCheck"],
              "status" => next["status"],
              "reason" => next["reason"]
            }
          ]

          events = if next["status"] == "complete", do: events ++ [game_over_event(next)], else: events
          {:ok, next, events}
      end
    end
  end

  defp parse_controls(controls) when is_map(controls) do
    type = controls |> Map.get("type") || Map.get(controls, "action") || ""
    type = type |> to_string() |> String.downcase()

    cond do
      type not in ["move", "resign", "draw_offer", "draw_accept"] ->
        {:error, :invalid_controls}

      type != "move" ->
        {:ok, %{"type" => type}}

      true ->
        from = algebraic_to_index(Map.get(controls, "from"))
        to = algebraic_to_index(Map.get(controls, "to"))

        cond do
          from < 0 or to < 0 ->
            {:error, :invalid_controls}

          true ->
            case normalize_promo(Map.get(controls, "promo")) do
              :invalid -> {:error, :invalid_controls}
              promo -> {:ok, %{"type" => "move", from: from, to: to, promo: promo}}
            end
        end
    end
  end

  defp parse_controls(_), do: {:error, :invalid_controls}

  defp normalize_promo(nil), do: nil
  defp normalize_promo(""), do: nil

  defp normalize_promo(value) when is_binary(value) do
    promo = String.downcase(value)
    if promo in @promo_types, do: promo, else: :invalid
  end

  defp normalize_promo(_), do: :invalid

  defp game_over_event(state) do
    %{"type" => "game_over", "reason" => state["reason"], "winner" => state["winner"]}
  end

  defp claimable_draw(state) do
    cond do
      state["status"] != "playing" -> nil
      (state["halfmove"] || 0) >= 100 -> "fifty_move"
      Map.get(state["positionCounts"] || %{}, position_key(state), 0) >= 3 -> "threefold"
      true -> nil
    end
  end

  defp conclude_if_needed(state) do
    color = state["turn"]
    moves = legal_moves(state)
    checked = in_check?(state["board"], color)
    state = Map.put(state, "inCheck", checked)

    cond do
      moves == [] and checked ->
        state
        |> Map.put("status", "complete")
        |> Map.put("reason", "checkmate")
        |> Map.put("winner", color_to_slot(opponent(color)))

      moves == [] ->
        state
        |> Map.put("status", "complete")
        |> Map.put("reason", "stalemate")
        |> Map.put("winner", nil)

      (state["halfmove"] || 0) >= 100 ->
        state
        |> Map.put("status", "complete")
        |> Map.put("reason", "fifty_move")
        |> Map.put("winner", nil)

      Map.get(state["positionCounts"] || %{}, position_key(state), 0) >= 3 ->
        state
        |> Map.put("status", "complete")
        |> Map.put("reason", "threefold")
        |> Map.put("winner", nil)

      true ->
        state
    end
  end

  defp generate_pseudo(state, color) do
    board = state["board"]
    ep = if state["epSquare"], do: algebraic_to_index(state["epSquare"]), else: -1
    forward = if color == "w", do: 1, else: -1
    start_rank = if color == "w", do: 1, else: 6
    promo_rank = if color == "w", do: 7, else: 0

    moves =
      Enum.reduce(0..63, [], fn i, acc ->
        p = board_at(board, i)

        if piece_color(p) != color do
          acc
        else
          acc ++ piece_moves(board, i, p, color, ep, forward, start_rank, promo_rank)
        end
      end)

    moves ++ castling_moves(state, color)
  end

  defp piece_moves(board, i, p, color, ep, forward, start_rank, promo_rank) do
    type = piece_type(p)
    f = file_of(i)
    r = rank_of(i)

    case type do
      "p" ->
        pawn_moves(board, i, f, r, color, ep, forward, start_rank, promo_rank)

      "n" ->
        leap_moves(board, i, f, r, color, @knight_deltas)

      "k" ->
        leap_moves(board, i, f, r, color, @king_deltas)

      "b" ->
        slide_moves(board, i, f, r, color, @bishop_dirs)

      "r" ->
        slide_moves(board, i, f, r, color, @rook_dirs)

      "q" ->
        slide_moves(board, i, f, r, color, @bishop_dirs ++ @rook_dirs)

      _ ->
        []
    end
  end

  defp pawn_moves(board, i, f, r, color, ep, forward, start_rank, promo_rank) do
    quiet =
      if in_board?(f, r + forward) and board_at(board, (r + forward) * 8 + f) == "." do
        to = (r + forward) * 8 + f

        steps =
          if r + forward == promo_rank do
            Enum.map(@promo_types, fn promo -> %{from: i, to: to, promo: promo} end)
          else
            [%{from: i, to: to}]
          end

        double =
          if r == start_rank and in_board?(f, r + forward * 2) and
               board_at(board, (r + forward * 2) * 8 + f) == "." do
            [%{from: i, to: (r + forward * 2) * 8 + f, double: true}]
          else
            []
          end

        steps ++ double
      else
        []
      end

    captures =
      Enum.flat_map([-1, 1], fn df ->
        cf = f + df
        cr = r + forward

        if in_board?(cf, cr) do
          to = cr * 8 + cf
          target = board_at(board, to)

          cond do
            piece_color(target) == opponent(color) ->
              if cr == promo_rank do
                Enum.map(@promo_types, fn promo ->
                  %{from: i, to: to, promo: promo, capture: true}
                end)
              else
                [%{from: i, to: to, capture: true}]
              end

            to == ep and target == "." ->
              [%{from: i, to: to, capture: true, en_passant: true}]

            true ->
              []
          end
        else
          []
        end
      end)

    quiet ++ captures
  end

  defp leap_moves(board, i, f, r, color, deltas) do
    Enum.flat_map(deltas, fn {df, dr} ->
      nf = f + df
      nr = r + dr

      if in_board?(nf, nr) do
        to = nr * 8 + nf
        target = board_at(board, to)

        if piece_color(target) == color do
          []
        else
          [%{from: i, to: to, capture: target != "."}]
        end
      else
        []
      end
    end)
  end

  defp slide_moves(board, i, f, r, color, dirs) do
    Enum.flat_map(dirs, fn {df, dr} ->
      slide_ray(board, i, f + df, r + dr, df, dr, color, [])
    end)
  end

  defp slide_ray(_board, _i, f, r, _df, _dr, _color, acc) when not (f >= 0 and f <= 7 and r >= 0 and r <= 7),
    do: acc

  defp slide_ray(board, i, f, r, df, dr, color, acc) do
    to = r * 8 + f
    target = board_at(board, to)

    cond do
      target == "." ->
        slide_ray(board, i, f + df, r + dr, df, dr, color, [%{from: i, to: to} | acc])

      piece_color(target) != color ->
        [%{from: i, to: to, capture: true} | acc]

      true ->
        acc
    end
  end

  defp castling_moves(state, color) do
    board = state["board"]
    rights = state["castling"] || ""
    king_from = if color == "w", do: 4, else: 60
    king_piece = if color == "w", do: "K", else: "k"
    rook_piece = if color == "w", do: "R", else: "r"

    cond do
      board_at(board, king_from) != king_piece ->
        []

      in_check?(board, color) ->
        []

      true ->
        enemy = opponent(color)

        sides =
          if color == "w" do
            [
              {"K", 6, 7, [5, 6], [4, 5, 6], :kingside},
              {"Q", 2, 0, [1, 2, 3], [4, 3, 2], :queenside}
            ]
          else
            [
              {"k", 62, 63, [61, 62], [60, 61, 62], :kingside},
              {"q", 58, 56, [57, 58, 59], [60, 59, 58], :queenside}
            ]
          end

        Enum.flat_map(sides, fn {flag, king_to, rook_from, empties, path, side} ->
          if String.contains?(rights, flag) and board_at(board, rook_from) == rook_piece and
               Enum.all?(empties, &(board_at(board, &1) == ".")) and
               Enum.all?(path, &(not square_attacked?(board, &1, enemy))) do
            [%{from: king_from, to: king_to, castle: Atom.to_string(side)}]
          else
            []
          end
        end)
    end
  end

  defp apply_raw(state, move) do
    from = move.from
    to = move.to
    board = state["board"]
    mover = board_at(board, from)
    color = piece_color(mover)
    type = piece_type(mover)
    captured0 = board_at(board, to)
    captured0 = if captured0 == ".", do: nil, else: captured0

    {board, captured} =
      if Map.get(move, :en_passant) do
        cap_idx = if color == "w", do: to - 8, else: to + 8
        {put_square(board, cap_idx, "."), board_at(board, cap_idx)}
      else
        {board, captured0}
      end

    board = put_square(board, from, ".")

    placed =
      if type == "p" and rank_of(to) in [0, 7] do
        promo = String.downcase(Map.get(move, :promo) || "q")
        if color == "w", do: String.upcase(promo), else: promo
      else
        mover
      end

    board = put_square(board, to, placed)

    board =
      case Map.get(move, :castle) do
        "kingside" ->
          rook_from = if color == "w", do: 7, else: 63
          rook_to = if color == "w", do: 5, else: 61
          rook = board_at(board, rook_from)

          board
          |> put_square(rook_from, ".")
          |> put_square(rook_to, rook)

        "queenside" ->
          rook_from = if color == "w", do: 0, else: 56
          rook_to = if color == "w", do: 3, else: 59
          rook = board_at(board, rook_from)

          board
          |> put_square(rook_from, ".")
          |> put_square(rook_to, rook)

        _ ->
          board
      end

    castling = state["castling"] || "-"
    castling = if type == "k", do: strip_castling(castling, if(color == "w", do: ["K", "Q"], else: ["k", "q"])), else: castling
    castling = if from == 0 or to == 0, do: strip_castling(castling, ["Q"]), else: castling
    castling = if from == 7 or to == 7, do: strip_castling(castling, ["K"]), else: castling
    castling = if from == 56 or to == 56, do: strip_castling(castling, ["q"]), else: castling
    castling = if from == 63 or to == 63, do: strip_castling(castling, ["k"]), else: castling

    ep =
      if Map.get(move, :double) do
        mid = if color == "w", do: from + 8, else: from - 8
        index_to_algebraic(mid)
      end

    pawn_or_capture = type == "p" or not is_nil(captured) or Map.get(move, :en_passant, false)
    halfmove = if pawn_or_capture, do: 0, else: (state["halfmove"] || 0) + 1
    fullmove = if color == "b", do: (state["fullmove"] || 1) + 1, else: state["fullmove"] || 1

    state
    |> Map.put("board", board)
    |> Map.put("castling", castling)
    |> Map.put("epSquare", ep)
    |> Map.put("halfmove", halfmove)
    |> Map.put("fullmove", fullmove)
    |> Map.put("turn", opponent(color))
    |> Map.put("drawOffer", nil)
    |> Map.put("lastMove", %{
      "from" => index_to_algebraic(from),
      "to" => index_to_algebraic(to),
      "promo" => Map.get(move, :promo),
      "captured" => captured,
      "castle" => Map.get(move, :castle),
      "enPassant" => Map.get(move, :en_passant, false)
    })
  end

  defp bump_repetition(state) do
    key = position_key(state)
    counts = state["positionCounts"] || %{}
    Map.put(state, "positionCounts", Map.update(counts, key, 1, &(&1 + 1)))
  end

  defp position_key(state) do
    "#{state["board"]} #{state["turn"]} #{state["castling"] || "-"} #{state["epSquare"] || "-"}"
  end

  defp in_check?(board, color) do
    king = find_king(board, color)
    king >= 0 and square_attacked?(board, king, opponent(color))
  end

  defp find_king(board, color) do
    needle = if color == "w", do: "K", else: "k"
    index = :binary.match(board, needle)
    case index do
      {i, _} -> i
      :nomatch -> -1
    end
  end

  defp square_attacked?(board, square, by_color) do
    tf = file_of(square)
    tr = rank_of(square)

    pawn_hit? =
      Enum.any?(pawn_origins(by_color), fn {df, dr} ->
        f = tf - df
        r = tr - dr

        in_board?(f, r) and piece_color(board_at(board, r * 8 + f)) == by_color and
          piece_type(board_at(board, r * 8 + f)) == "p"
      end)

    knight_hit? =
      Enum.any?(@knight_deltas, fn {df, dr} ->
        f = tf + df
        r = tr + dr

        in_board?(f, r) and piece_color(board_at(board, r * 8 + f)) == by_color and
          piece_type(board_at(board, r * 8 + f)) == "n"
      end)

    king_hit? =
      Enum.any?(@king_deltas, fn {df, dr} ->
        f = tf + df
        r = tr + dr

        in_board?(f, r) and piece_color(board_at(board, r * 8 + f)) == by_color and
          piece_type(board_at(board, r * 8 + f)) == "k"
      end)

    pawn_hit? or knight_hit? or king_hit? or
      slider_hit?(board, tf, tr, by_color, @bishop_dirs, ["b", "q"]) or
      slider_hit?(board, tf, tr, by_color, @rook_dirs, ["r", "q"])
  end

  defp pawn_origins("w"), do: [{-1, 1}, {1, 1}]
  defp pawn_origins("b"), do: [{-1, -1}, {1, -1}]

  defp slider_hit?(board, tf, tr, by_color, dirs, types) do
    Enum.any?(dirs, fn {df, dr} ->
      ray_hit?(board, tf + df, tr + dr, df, dr, by_color, types)
    end)
  end

  defp ray_hit?(_board, f, r, _df, _dr, _by, _types) when not (f >= 0 and f <= 7 and r >= 0 and r <= 7),
    do: false

  defp ray_hit?(board, f, r, df, dr, by_color, types) do
    p = board_at(board, r * 8 + f)

    cond do
      p == "." -> ray_hit?(board, f + df, r + dr, df, dr, by_color, types)
      piece_color(p) == by_color and piece_type(p) in types -> true
      true -> false
    end
  end

  defp board_at(board, i) when i >= 0 and i < 64, do: String.at(board, i)
  defp board_at(_, _), do: "."

  defp put_square(board, i, piece) do
    <<pre::binary-size(i), _::binary-size(1), rest::binary>> = board
    pre <> piece <> rest
  end

  defp file_of(i), do: rem(i, 8)
  defp rank_of(i), do: div(i, 8)
  defp in_board?(f, r), do: f >= 0 and f <= 7 and r >= 0 and r <= 7

  defp piece_color(nil), do: nil
  defp piece_color("."), do: nil
  defp piece_color(p), do: if(p == String.upcase(p), do: "w", else: "b")

  defp piece_type(nil), do: ""
  defp piece_type("."), do: ""
  defp piece_type(p), do: String.downcase(p)

  defp opponent("w"), do: "b"
  defp opponent(_), do: "w"

  defp slot_to_color(1), do: "b"
  defp slot_to_color(_), do: "w"

  defp color_to_slot("b"), do: 1
  defp color_to_slot(_), do: 0

  defp algebraic_to_index(i) when is_integer(i) and i >= 0 and i <= 63, do: i

  defp algebraic_to_index(sq) when is_binary(sq) and byte_size(sq) >= 2 do
    <<file_c, rank_c, _::binary>> = String.downcase(sq)
    file = file_c - ?a
    rank = rank_c - ?1

    if file >= 0 and file <= 7 and rank >= 0 and rank <= 7 do
      rank * 8 + file
    else
      -1
    end
  end

  defp algebraic_to_index(_), do: -1

  defp index_to_algebraic(i) when i >= 0 and i <= 63 do
    <<Enum.at(@files, rem(i, 8))>> <> Integer.to_string(div(i, 8) + 1)
  end

  defp index_to_algebraic(_), do: nil

  defp strip_castling(castling, flags) do
    next = Enum.reduce(flags, castling || "", fn flag, acc -> String.replace(acc, flag, "") end)
    if next == "", do: "-", else: next
  end

  defp expand_fen_row(row) do
    String.replace(row, ~r/[1-8]/, fn n -> String.duplicate(".", String.to_integer(n)) end)
  end

  defp fen_collapse(squares) do
    squares
    |> Enum.chunk_by(&(&1 == "."))
    |> Enum.map(fn
      ["." | _] = empties -> Integer.to_string(length(empties))
      pieces -> Enum.join(pieces)
    end)
    |> Enum.join()
  end

  defp fen_castle(nil), do: "-"
  defp fen_castle("-"), do: "-"
  defp fen_castle(s), do: s

  defp fen_ep(nil), do: nil
  defp fen_ep("-"), do: nil
  defp fen_ep(s), do: s

  defp parse_int(nil, default), do: default
  defp parse_int(v, _default) when is_integer(v), do: v

  defp parse_int(v, default) when is_binary(v) do
    case Integer.parse(v) do
      {n, _} -> n
      :error -> default
    end
  end

  defp parse_int(_, default), do: default
end

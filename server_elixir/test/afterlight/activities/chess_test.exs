defmodule Afterlight.Activities.ChessTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Chess

  defp move(from, to, promo \\ nil) do
    base = %{"type" => "move", "from" => from, "to" => to}
    if promo, do: Map.put(base, "promo", promo), else: base
  end

  defp at(board, sq) do
    <<file_c, rank_c>> = sq
    i = file_c - ?a + (rank_c - ?1) * 8
    String.at(board, i)
  end

  test "rulesVersion 1 is Afterlight house chess" do
    state = Chess.init_sim_state(slots: [0, 1])
    assert Chess.rules_version() == 1
    assert Chess.rules_name() == "afterlight-house-chess"
    assert state["rulesVersion"] == 1
    assert state["rulesName"] == "afterlight-house-chess"
    assert state["board"] == Chess.start_board()
    assert state["turn"] == "w"
    assert Chess.to_fen(state) == "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  end

  test "out-of-turn and king-in-check moves are rejected; both boards stay identical" do
    a = Chess.init_sim_state()
    b = Chess.init_sim_state()
    assert Chess.same_position?(a, b)

    assert {:error, :out_of_turn} = Chess.apply_input(a, 1, move("e7", "e5"))
    assert Chess.same_position?(a, b)

    checked = Chess.from_fen("4k3/p7/8/4Q3/8/8/8/4K3 b - - 0 1")
    other = Chess.from_fen("4k3/p7/8/4Q3/8/8/8/4K3 b - - 0 1")
    assert checked["inCheck"] == true
    assert {:error, :king_in_check} = Chess.apply_input(checked, 1, move("a7", "a5"))
    assert Chess.same_position?(checked, other)
    assert checked["board"] == other["board"]
  end

  test "the same legal sequence keeps two boards on one position" do
    a = Chess.init_sim_state()
    b = Chess.init_sim_state()

    sequence = [{"e2", "e4"}, {"e7", "e5"}, {"g1", "f3"}, {"b8", "c6"}]

    {a, b} =
      Enum.reduce(sequence, {a, b}, fn {from, to}, {sa, sb} ->
        slot = if sa["turn"] == "w", do: 0, else: 1
        assert {:ok, na, _} = Chess.apply_input(sa, slot, move(from, to))
        assert {:ok, nb, _} = Chess.apply_input(sb, slot, move(from, to))
        assert Chess.same_position?(na, nb)
        {na, nb}
      end)

    assert at(a["board"], "e4") == "P"
    assert at(a["board"], "e5") == "p"
    assert Chess.same_position?(a, b)
  end

  test "castling kingside and queenside" do
    assert {:ok, cleared, _} =
             Chess.apply_moves(Chess.init_sim_state(), [
               move("e2", "e4"),
               move("e7", "e5"),
               move("g1", "f3"),
               move("b8", "c6"),
               move("f1", "e2"),
               move("g8", "f6")
             ])

    assert {:ok, castle, _} = Chess.apply_input(cleared, 0, move("e1", "g1"))
    assert castle["lastMove"]["castle"] == "kingside"
    assert at(castle["board"], "g1") == "K"
    assert at(castle["board"], "f1") == "R"
    assert at(castle["board"], "e1") == "."
    assert at(castle["board"], "h1") == "."
    refute String.contains?(castle["castling"], "K")
    refute String.contains?(castle["castling"], "Q")

    queen_side = Chess.from_fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
    assert {:ok, oooo, _} = Chess.apply_input(queen_side, 0, move("e1", "c1"))
    assert oooo["lastMove"]["castle"] == "queenside"
    assert at(oooo["board"], "c1") == "K"
    assert at(oooo["board"], "d1") == "R"
  end

  test "en passant" do
    assert {:ok, ready, _} =
             Chess.apply_moves(Chess.init_sim_state(), [
               move("e2", "e4"),
               move("a7", "a6"),
               move("e4", "e5"),
               move("d7", "d5")
             ])

    assert ready["epSquare"] == "d6"
    assert {:ok, ep, _} = Chess.apply_input(ready, 0, move("e5", "d6"))
    assert ep["lastMove"]["enPassant"] == true
    assert at(ep["board"], "d6") == "P"
    assert at(ep["board"], "d5") == "."
    assert at(ep["board"], "e5") == "."
  end

  test "promotion defaults to queen and accepts underpromotion" do
    queen = Chess.from_fen("4k3/P7/8/8/8/8/8/4K3 w - - 0 1")
    assert {:ok, q, _} = Chess.apply_input(queen, 0, move("a7", "a8"))
    assert at(q["board"], "a8") == "Q"

    knight = Chess.from_fen("4k3/P7/8/8/8/8/8/4K3 w - - 0 1")
    assert {:ok, n, _} = Chess.apply_input(knight, 0, move("a7", "a8", "n"))
    assert at(n["board"], "a8") == "N"
  end

  test "checkmate (fool's mate)" do
    assert {:ok, result, _} =
             Chess.apply_moves(Chess.init_sim_state(), [
               move("f2", "f3"),
               move("e7", "e5"),
               move("g2", "g4"),
               move("d8", "h4")
             ])

    assert result["status"] == "complete"
    assert result["reason"] == "checkmate"
    assert result["winner"] == 1
    assert Chess.legal_moves(result) == []

    {stepped, ended} = Chess.step_simulation(result, [], 1)
    assert stepped["reason"] == "checkmate"
    assert {:match_ended, 1, %{"reason" => "checkmate"}} = ended
  end

  test "stalemate" do
    state = Chess.from_fen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")
    assert state["status"] == "complete"
    assert state["reason"] == "stalemate"
    assert state["winner"] == nil
    assert state["inCheck"] == false
  end

  test "fifty-move draw after 100 quiet half-moves" do
    state = Chess.from_fen("4k3/8/8/8/8/8/8/4K3 w - - 99 1")
    assert state["status"] == "playing"
    assert {:ok, quiet, _} = Chess.apply_input(state, 0, move("e1", "e2"))
    assert quiet["halfmove"] == 100
    assert quiet["status"] == "complete"
    assert quiet["reason"] == "fifty_move"
    assert quiet["winner"] == nil
  end

  test "threefold repetition of the start position" do
    assert {:ok, result, _} =
             Chess.apply_moves(Chess.init_sim_state(), [
               move("g1", "f3"),
               move("g8", "f6"),
               move("f3", "g1"),
               move("f6", "g8"),
               move("g1", "f3"),
               move("g8", "f6"),
               move("f3", "g1"),
               move("f6", "g8")
             ])

    assert result["status"] == "complete"
    assert result["reason"] == "threefold"
    assert result["winner"] == nil
  end

  test "resignation awards the opponent" do
    state = Chess.init_sim_state()
    assert {:ok, white, _} = Chess.apply_input(state, 0, %{"type" => "resign"})
    assert white["status"] == "complete"
    assert white["reason"] == "resignation"
    assert white["winner"] == 1

    assert {:ok, black, _} = Chess.apply_input(Chess.init_sim_state(), 1, %{"type" => "resign"})
    assert black["winner"] == 0
  end

  test "agreed draw via offer and accept" do
    assert {:ok, opening, _} = Chess.apply_input(Chess.init_sim_state(), 0, move("e2", "e4"))
    assert {:ok, offered, _} = Chess.apply_input(opening, 1, %{"type" => "draw_offer"})
    assert offered["drawOffer"] == 1
    assert {:ok, accepted, _} = Chess.apply_input(offered, 0, %{"type" => "draw_accept"})
    assert accepted["reason"] == "agreement"
    assert accepted["winner"] == nil
  end
end

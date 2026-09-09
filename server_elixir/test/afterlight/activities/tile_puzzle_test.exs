defmodule Afterlight.Activities.TilePuzzleTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.TilePuzzle

  describe "init_sim_state/1" do
    test "starts four visitors on the same unsolved manuscript" do
      a = TilePuzzle.init_sim_state()
      b = TilePuzzle.init_sim_state(slots: [0, 1, 2, 3])

      assert a["status"] == "arranging"
      assert a["solved"] == false
      assert a["winner"] == nil
      assert a["board"] == TilePuzzle.initial_board()
      assert b["board"] == a["board"]
      assert a["activeSlots"] == [0, 1, 2, 3]
      refute Map.has_key?(a, "xp")
      refute Map.has_key?(a, "currency")
    end
  end

  describe "validate_controls/1" do
    test "accepts slide/swap/reset and rejects junk" do
      assert {:error, :invalid_controls} = TilePuzzle.validate_controls("nope")
      assert {:error, :unknown_type} = TilePuzzle.validate_controls(%{"type" => "teleport"})
      assert {:ok, %{"type" => "ready"}} = TilePuzzle.validate_controls(%{"kind" => "ready"})
      assert {:ok, %{"type" => "slide"}} = TilePuzzle.validate_controls(%{"type" => "slide", "from" => 14, "to" => 15})
      assert {:ok, %{"type" => "reset"}} = TilePuzzle.validate_controls(%{"type" => "reset"})
    end
  end

  describe "apply_input/3" do
    test "a legal slide into the well can solve the board for everyone" do
      state = TilePuzzle.init_sim_state(board: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15])
      {state, event} = TilePuzzle.apply_input(state, 0, %{"type" => "slide", "tileId" => 15, "from" => 15, "to" => 14, "seq" => 1})

      assert event["type"] == "puzzle_solved"
      assert state["solved"] == true
      assert state["status"] == "solved"
      assert state["board"] == TilePuzzle.solved_board()
      assert state["progress"] == 1.0
      assert state["winner"] == nil
    end

    test "illegal slides are rejected and consume seq" do
      state = TilePuzzle.init_sim_state()
      before = state["board"]
      {state, event} = TilePuzzle.apply_input(state, 0, %{"type" => "slide", "from" => 0, "to" => 15, "seq" => 1})

      assert event == nil
      assert state["board"] == before
      assert state["appliedSeqBySlot"]["0"] == 1
    end

    test "solved boards reject slides but accept reset" do
      almost = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15]
      state = TilePuzzle.init_sim_state(board: almost)
      {state, _} = TilePuzzle.apply_input(state, 0, %{"type" => "slide", "from" => 15, "to" => 14, "seq" => 1})
      assert state["solved"] == true

      {blocked, ev} = TilePuzzle.apply_input(state, 1, %{"type" => "swap", "from" => 0, "to" => 1, "seq" => 2})
      assert ev == nil
      assert blocked["board"] == TilePuzzle.solved_board()

      {reset, event} = TilePuzzle.apply_input(blocked, 3, %{"type" => "reset", "seq" => 3})
      assert event["type"] == "puzzle_reset"
      assert reset["solved"] == false
      assert reset["status"] == "arranging"
      assert reset["board"] == almost
      assert reset["resetCount"] == 1
    end
  end

  describe "concurrent ordering" do
    test "two arrival orders produce the same board" do
      board = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0]

      moves = [
        %{slot: 3, seq: 2, controls: %{"type" => "swap", "from" => 2, "to" => 3}},
        %{slot: 0, seq: 1, controls: %{"type" => "swap", "from" => 0, "to" => 1}},
        %{slot: 1, seq: 1, controls: %{"type" => "swap", "from" => 4, "to" => 5}}
      ]

      {late, _} = TilePuzzle.apply_ordered_moves(TilePuzzle.init_sim_state(board: board), Enum.reverse(moves))
      {early, _} = TilePuzzle.apply_ordered_moves(TilePuzzle.init_sim_state(board: board), moves)

      assert late["board"] == early["board"]
      assert late["solved"] == early["solved"]
      assert late["correctCount"] == early["correctCount"]

      assert late["board"] == [
               2, 1, 4, 3,
               6, 5, 7, 8,
               9, 10, 11, 12,
               13, 15, 14, 0
             ]
    end

    test "conflicting slides keep the first seq then slot move" do
      board = [1, 2, 3, 4, 5, 0, 7, 8, 9, 6, 10, 12, 13, 14, 11, 15]

      moves = [
        %{slot: 1, seq: 8, controls: %{"type" => "slide", "from" => 4, "to" => 5}},
        %{slot: 0, seq: 8, controls: %{"type" => "slide", "from" => 6, "to" => 5}}
      ]

      {a, event} = TilePuzzle.apply_ordered_moves(TilePuzzle.init_sim_state(board: board), moves)
      {b, _} = TilePuzzle.apply_ordered_moves(TilePuzzle.init_sim_state(board: board), Enum.reverse(moves))

      assert a["board"] == b["board"]
      assert Enum.at(a["board"], 5) == 7
      assert Enum.at(a["board"], 6) == 0
      assert Enum.at(a["board"], 4) == 5
      assert event["payload"]["slot"] == 0
    end
  end

  describe "step_simulation/3" do
    test "applies pending inputs once in seq-slot order" do
      state = TilePuzzle.init_sim_state(board: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0])

      players = %{
        1 => %{last_seq: 4, input_state: %{"type" => "swap", "from" => 2, "to" => 3}},
        0 => %{last_seq: 4, input_state: %{"type" => "swap", "from" => 0, "to" => 1}}
      }

      {state, _event} = TilePuzzle.step_simulation(state, players, 2)
      assert state["tickCount"] == 2

      assert state["board"] == [
               2, 1, 4, 3,
               5, 6, 7, 8,
               9, 10, 11, 12,
               13, 15, 14, 0
             ]

      {again, second} = TilePuzzle.step_simulation(state, players, 1)
      assert second == nil
      assert again["board"] == state["board"]
    end
  end
end

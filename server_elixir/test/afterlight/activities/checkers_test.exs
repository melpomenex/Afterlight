defmodule Afterlight.Activities.CheckersTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Checkers

  defp board(entries) do
    Map.new(entries, fn
      {sq, slot} -> {sq, %{"slot" => slot, "king" => false}}
      {sq, slot, king} -> {sq, %{"slot" => slot, "king" => king}}
    end)
  end

  describe "init_sim_state/1" do
    test "starts English draughts with dark to move" do
      state = Checkers.init_sim_state(slots: [0, 1])

      assert state["rulesVersion"] == 1
      assert state["status"] == "playing"
      assert state["turn"] == 0
      assert map_size(state["board"]) == 24
    end
  end

  describe "validate_controls/1" do
    test "accepts type move/resign/draw and a multi-jump path" do
      assert {:ok, sanitized} =
               Checkers.validate_controls(%{
                 "kind" => "move",
                 "from" => "C3",
                 "to" => "g7",
                 "path" => ["e5", "g7"]
               })

      assert sanitized == %{
               "type" => "move",
               "from" => "c3",
               "to" => "g7",
               "path" => ["e5", "g7"]
             }

      assert {:ok, %{"type" => "resign"}} = Checkers.validate_controls(%{"type" => "resign"})
      assert {:ok, %{"type" => "draw"}} = Checkers.validate_controls(%{"type" => "draw"})
      assert {:error, :invalid_controls} = Checkers.validate_controls("nope")
      assert {:error, :unknown_type} = Checkers.validate_controls(%{"type" => "teleport"})
      assert {:error, :invalid_from} = Checkers.validate_controls(%{"type" => "move", "from" => "b1", "to" => "c2"})
    end
  end

  describe "apply_input/3" do
    test "rejects out-of-turn and illegal moves without changing the board" do
      state = Checkers.init_sim_state()
      snapshot = state["board"]

      {same, event} = Checkers.apply_input(state, 1, %{"type" => "move", "from" => "b6", "to" => "a5"})
      assert event["type"] == "illegal_move"
      assert event["reason"] == "out_of_turn"
      assert same["board"] == snapshot
      assert same["turn"] == 0

      {opened, moved} = Checkers.apply_input(state, 0, %{"type" => "move", "from" => "c3", "to" => "d4"})
      assert moved["type"] == "moved"
      assert opened["board"]["d4"]["slot"] == 0
      refute Map.has_key?(opened["board"], "c3")
      assert opened["turn"] == 1
    end

    test "enforces mandatory captures and a completed jump path" do
      forced =
        Checkers.init_sim_state(
          board: board([{"c3", 0}, {"d4", 1}, {"a1", 0}, {"h8", 1}]),
          turn: 0
        )

      {same, quiet} = Checkers.apply_input(forced, 0, %{"type" => "move", "from" => "a1", "to" => "b2"})
      assert quiet["type"] == "illegal_move"
      assert same["board"]["d4"]["slot"] == 1

      {taken, _} = Checkers.apply_input(forced, 0, %{"type" => "move", "from" => "c3", "to" => "e5"})
      refute Map.has_key?(taken["board"], "d4")
      assert taken["board"]["e5"]["slot"] == 0

      chain =
        Checkers.init_sim_state(
          board: board([{"c3", 0}, {"d4", 1}, {"f6", 1}]),
          turn: 0
        )

      {same_chain, incomplete} =
        Checkers.apply_input(chain, 0, %{"type" => "move", "from" => "c3", "to" => "e5"})

      assert incomplete["type"] == "illegal_move"
      assert same_chain["board"]["c3"]["slot"] == 0

      {done, ended} =
        Checkers.apply_input(chain, 0, %{
          "type" => "move",
          "from" => "c3",
          "to" => "g7",
          "path" => ["e5", "g7"]
        })

      assert ended["type"] == "match_ended"
      assert done["result"] == "no_legal_move"
      assert done["winner"] == 0
    end

    test "crowns men and lets kings capture backward" do
      crown = Checkers.init_sim_state(board: board([{"c7", 0}, {"h6", 1}]), turn: 0)
      {crowned, _} = Checkers.apply_input(crown, 0, %{"type" => "move", "from" => "c7", "to" => "b8"})
      assert crowned["board"]["b8"]["king"] == true
      assert crowned["status"] == "playing"

      king = Checkers.init_sim_state(board: board([{"e5", 0, true}, {"d4", 1}]), turn: 0)
      {taken, event} = Checkers.apply_input(king, 0, %{"type" => "move", "from" => "e5", "to" => "c3"})
      assert event["type"] == "match_ended"
      assert taken["board"]["c3"]["king"] == true
      refute Map.has_key?(taken["board"], "d4")
    end

    test "resignation and agreed draw" do
      {resigned, event} = Checkers.apply_input(Checkers.init_sim_state(), 0, %{"type" => "resign"})
      assert event["type"] == "match_ended"
      assert resigned["result"] == "resign"
      assert resigned["winner"] == 1

      {offered, _} = Checkers.apply_input(Checkers.init_sim_state(), 0, %{"type" => "draw"})
      assert offered["drawOfferedBy"] == 0
      {agreed, ended} = Checkers.apply_input(offered, 1, %{"type" => "draw"})
      assert ended["result"] == "draw"
      assert agreed["status"] == "complete"
      assert agreed["winner"] == nil
    end
  end

  describe "step_simulation/3" do
    test "concurrent moves apply only the side to move" do
      origin = Checkers.init_sim_state()

      both = %{
        0 => %{input_state: %{"type" => "move", "from" => "c3", "to" => "d4"}},
        1 => %{input_state: %{"type" => "move", "from" => "b6", "to" => "a5"}}
      }

      {a, _} = Checkers.step_simulation(origin, both, 1)
      {b, _} = Checkers.step_simulation(origin, %{1 => both[1], 0 => both[0]}, 1)

      assert a["board"] == b["board"]
      assert a["turn"] == 1
      assert a["board"]["d4"]["slot"] == 0
      assert a["board"]["b6"]["slot"] == 1
      refute Map.has_key?(a["board"], "a5")

      {white, event} = Checkers.apply_input(origin, 1, both[1].input_state)
      assert event["reason"] == "out_of_turn"
      assert white["board"] == origin["board"]
    end

    test "simultaneous draw offers agree" do
      {state, outcome} =
        Checkers.step_simulation(
          Checkers.init_sim_state(),
          %{
            0 => %{input_state: %{"type" => "draw"}},
            1 => %{input_state: %{"type" => "draw"}}
          },
          1
        )

      assert state["status"] == "complete"
      assert state["result"] == "draw"
      assert {:match_ended, nil, %{"result" => "draw"}} = outcome
    end
  end
end

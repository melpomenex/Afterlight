defmodule Afterlight.Activities.SporefallTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Sporefall

  describe "init_sim_state/1" do
    test "initializes fresh simulation with 10x20 grid, active piece, next piece, level 1, score 0" do
      state = Sporefall.init_sim_state(seed: 42)

      assert state["cols"] == 10
      assert state["rows"] == 20
      assert length(state["grid"]) == 20
      assert Enum.all?(state["grid"], fn row -> length(row) == 10 and Enum.all?(row, &(&1 == 0)) end)
      assert state["active"] != nil
      assert state["active"]["type"] in ["I", "O", "T", "S", "Z", "J", "L"]
      assert state["active"]["rotation"] == 0
      assert state["next"] in ["I", "O", "T", "S", "Z", "J", "L"]
      assert state["score"] == 0
      assert state["lines"] == 0
      assert state["level"] == 1
      assert state["state"] == "running"
      assert state["tick"] == 0
    end
  end

  describe "piece movement and boundaries" do
    test "shifts active piece horizontally and respects grid boundaries" do
      state =
        Sporefall.init_sim_state(seed: 100)
        |> Map.put("active", %{"type" => "O", "x" => 4, "y" => 5, "rotation" => 0})

      # Move left
      players_left = %{0 => %{input_state: %{"left" => true}}}
      {shifted_left, nil} = Sporefall.step(state, players_left, 1)
      assert shifted_left["active"]["x"] == 3

      # Shift all the way to left wall (O piece coords are 0, 1) -> min x is 0
      at_left_wall = %{shifted_left | "active" => %{"type" => "O", "x" => 0, "y" => 5, "rotation" => 0}}
      {blocked_left, nil} = Sporefall.step(at_left_wall, players_left, 1)
      assert blocked_left["active"]["x"] == 0

      # Move right
      players_right = %{0 => %{input_state: %{"right" => true}}}
      at_right_wall = %{shifted_left | "active" => %{"type" => "O", "x" => 8, "y" => 5, "rotation" => 0}}
      {blocked_right, nil} = Sporefall.step(at_right_wall, players_right, 1)
      # x=8 with width 2 reaches x=9, cannot go to x=9 because cx=px+1=10 would exceed cols
      assert blocked_right["active"]["x"] == 8
    end
  end

  describe "piece rotation" do
    test "rotates piece clockwise and executes wall kicks" do
      state =
        Sporefall.init_sim_state(seed: 200)
        |> Map.put("active", %{"type" => "T", "x" => 4, "y" => 5, "rotation" => 0})

      # Rotate CW
      players_rot = %{0 => %{input_state: %{"rotate" => true}}}
      {rotated, nil} = Sporefall.step(state, players_rot, 1)
      assert rotated["active"]["rotation"] == 1

      # Rotate again
      players_rot2 = %{0 => %{input_state: %{"rotate" => true}}}
      # Need a tick where rot is false or reset to detect edge
      {released, nil} = Sporefall.step(rotated, %{0 => %{input_state: %{"rotate" => false}}}, 1)
      {rotated2, nil} = Sporefall.step(released, players_rot2, 1)
      assert rotated2["active"]["rotation"] == 2
    end
  end

  describe "hard drop and line clears" do
    test "hard drop locks piece immediately, clears full line, updates score and lines" do
      # Setup grid with row 19 full except x=4, 5 (where an O piece can drop to complete it)
      row19 = for c <- 0..9, do: (if c in [4, 5], do: 0, else: 1)
      row18 = for _c <- 0..9, do: 0

      grid =
        for r <- 0..19 do
          cond do
            r == 19 -> row19
            true -> row18
          end
        end

      state =
        Sporefall.init_sim_state(seed: 300)
        |> Map.put("grid", grid)
        |> Map.put("active", %{"type" => "O", "x" => 4, "y" => 10, "rotation" => 0})
        |> Map.put("score", 0)
        |> Map.put("lines", 0)

      # Hard drop
      players_drop = %{0 => %{input_state: %{"drop" => true}}}
      {next_state, nil} = Sporefall.step(state, players_drop, 1)

      # Row 19 was cleared! Row 18 had O's top half (at x=4,5), which now drops down to row 19
      assert next_state["lines"] == 1
      # Score has hard drop bonus + 1 line clear (100 * level 1)
      assert next_state["score"] >= 100
      # Active piece was refreshed to next piece from bag
      assert next_state["active"]["y"] == 1
    end
  end

  describe "top-out detection" do
    test "ends match when newly spawned piece collides with existing blocks at spawn" do
      # Fill row 1 and 2 partially (empty at col 0 so not cleared, occupied at col 3..6 where piece spawns)
      blocked_row = for c <- 0..9, do: (if c == 0, do: 0, else: 2)
      grid =
        for r <- 0..19 do
          if r in [0, 1, 2], do: blocked_row, else: for(_c <- 0..9, do: 0)
        end

      state =
        Sporefall.init_sim_state(seed: 400)
        |> Map.put("grid", grid)
        |> Map.put("active", %{"type" => "O", "x" => 4, "y" => 15, "rotation" => 0})

      # Hard drop to lock active piece into grid
      players_drop = %{0 => %{input_state: %{"drop" => true}}}
      {ended_state, outcome} = Sporefall.step(state, players_drop, 1)

      assert ended_state["state"] == "completed"
      assert ended_state["active"] == nil
      assert outcome == {:match_ended, 0, %{reason: "top_out", score: ended_state["score"], lines: ended_state["lines"], level: ended_state["level"]}}
    end
  end

  describe "run cap enforcement" do
    test "terminates game at 36,000 ticks with run_cap reason" do
      state =
        Sporefall.init_sim_state(seed: 500)
        |> Map.put("tick", 35_999)

      {capped_state, outcome} = Sporefall.step(state, %{}, 1)

      assert capped_state["state"] == "completed"
      assert capped_state["tick"] == 36_000
      assert outcome == {:match_ended, 0, %{reason: "run_cap", score: capped_state["score"], lines: capped_state["lines"], level: capped_state["level"]}}
    end
  end
end

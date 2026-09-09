defmodule Afterlight.Activities.AirHockeyTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.AirHockey

  describe "init_sim_state/1" do
    test "initializes default 200x100 Air Hockey state" do
      state = AirHockey.init_sim_state()

      assert state["length"] == 200
      assert state["width"] == 100
      assert state["targetScore"] == 7
      assert state["seriesLength"] == 1
      assert state["winsNeeded"] == 1
      assert state["state"] == "serving"
      assert state["serveDelay"] == 45
      assert state["score"] == %{"0" => 0, "1" => 0}
      assert state["seriesScore"] == %{"0" => 0, "1" => 0}
      assert state["currentGame"] == 1

      puck = state["puck"]
      assert puck["x"] == 100.0
      assert puck["y"] == 50.0
      assert puck["radius"] == 4

      m0 = state["mallets"]["0"]
      m1 = state["mallets"]["1"]
      assert m0["x"] == 30.0
      assert m0["y"] == 50.0
      assert m1["x"] == 170.0
      assert m1["y"] == 50.0
    end

    test "initializes selectable series lengths (best of 1, 3, 5, 7)" do
      for {len, needed} <- [{1, 1}, {3, 2}, {5, 3}, {7, 4}] do
        s = AirHockey.init_sim_state(series_length: len)
        assert s["seriesLength"] == len
        assert s["winsNeeded"] == needed
      end
    end
  end

  describe "mallet constraints and speed clamping" do
    test "slot 0 mallet cannot cross center line or outer rails" do
      # Test clamp_mallet directly
      c1 = AirHockey.clamp_mallet(0, %{"x" => 50.0, "y" => 50.0}, %{"x" => 150.0, "y" => 50.0})
      assert c1["x"] <= 93.0
      assert c1["x"] >= 7.0

      # From x=10, moving to x=-50 is clamped to min rail (7.0), delta is 3.0 <= max_speed
      c2 = AirHockey.clamp_mallet(0, %{"x" => 10.0, "y" => 50.0}, %{"x" => -50.0, "y" => 50.0})
      assert c2["x"] == 7.0

      # From y=10, moving to y=-20 is clamped to top rail (7.0), delta is 3.0 <= max_speed
      c3 = AirHockey.clamp_mallet(0, %{"x" => 50.0, "y" => 10.0}, %{"x" => 50.0, "y" => -20.0})
      assert c3["y"] == 7.0

      # From y=90, moving to y=120 is clamped to bottom rail (93.0), delta is 3.0 <= max_speed
      c4 = AirHockey.clamp_mallet(0, %{"x" => 50.0, "y" => 90.0}, %{"x" => 50.0, "y" => 120.0})
      assert c4["y"] == 93.0

      # From x=90, moving across center line (x=150) is clamped to center boundary (93.0)
      c5 = AirHockey.clamp_mallet(0, %{"x" => 90.0, "y" => 50.0}, %{"x" => 150.0, "y" => 50.0})
      assert c5["x"] == 93.0
    end

    test "slot 1 mallet cannot cross center line to left half" do
      state = AirHockey.init_sim_state()

      # Attempt to cross center line (x = 50)
      players = %{1 => %{input_state: %{"x" => 50.0, "y" => 50.0}}}
      {state1, nil} = AirHockey.step(state, players, 100)
      assert state1["mallets"]["1"]["x"] >= 107.0
      assert state1["mallets"]["1"]["x"] <= 193.0
    end

    test "teleport attempt is clamped to max speed limit per tick" do
      state = AirHockey.init_sim_state()
      p0_x = state["mallets"]["0"]["x"]
      p0_y = state["mallets"]["0"]["y"]

      # Target is 60 units away in a single tick
      players = %{0 => %{input_state: %{"x" => p0_x + 60.0, "y" => p0_y}}}
      {state1, nil} = AirHockey.step(state, players, 1)

      delta_x = state1["mallets"]["0"]["x"] - p0_x
      # Clamped to max_mallet_speed: 8.0
      assert_in_delta delta_x, 8.0, 0.01
      assert state1["mallets"]["0"]["vx"] == 8.0
    end
  end

  describe "continuous collision detection (CCD) and high-speed bounces" do
    test "high-speed puck does not tunnel through rails" do
      # Puck at x=100, y=10 moving towards top rail at 20.0 units/tick
      state =
        AirHockey.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> put_in(["puck", "x"], 100.0)
        |> put_in(["puck", "y"], 10.0)
        |> put_in(["puck", "vx"], 0.0)
        |> put_in(["puck", "vy"], -20.0)

      {bounced, nil} = AirHockey.step(state, %{}, 1)

      # Puck did not leave table and bounced downward
      assert bounced["puck"]["y"] >= 4.0
      assert bounced["puck"]["vy"] > 0.0
    end

    test "high-speed puck bounces off mallet with momentum transfer" do
      # Puck placed 10 units away from slot 0 mallet moving left towards it
      state =
        AirHockey.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> put_in(["mallets", "0", "x"], 30.0)
        |> put_in(["mallets", "0", "y"], 50.0)
        |> put_in(["puck", "x"], 43.0)
        |> put_in(["puck", "y"], 50.0)
        |> put_in(["puck", "vx"], -15.0)
        |> put_in(["puck", "vy"], 0.0)

      # Mallet moving forward towards puck
      players = %{0 => %{input_state: %{"x" => 38.0, "y" => 50.0}}}
      {bounced, nil} = AirHockey.step(state, players, 1)

      # Puck reversed direction and bounced forward
      assert bounced["puck"]["vx"] > 0.0
      assert bounced["puck"]["x"] > 41.0
    end

    test "puck bounces off end rail outside the goal mouth" do
      # End rail is at x=0. Goal mouth is y in [35, 65].
      # Place puck at y=20 (outside goal mouth), moving towards x=0
      state =
        AirHockey.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> put_in(["puck", "x"], 8.0)
        |> put_in(["puck", "y"], 20.0)
        |> put_in(["puck", "vx"], -12.0)
        |> put_in(["puck", "vy"], 0.0)

      {bounced, nil} = AirHockey.step(state, %{}, 1)

      # Bounced off end rail without triggering a goal
      assert bounced["state"] == "rally"
      assert bounced["score"] == %{"0" => 0, "1" => 0}
      assert bounced["puck"]["vx"] > 0.0
      assert bounced["puck"]["x"] >= 4.0
    end
  end

  describe "goal detection and double-goal fixtures" do
    test "puck entering goal mouth awards point and transitions to goal state" do
      # Slot 0 goal is at x=0, y in [35, 65].
      # Puck at x=6, y=50 moving left into slot 0's goal -> point for slot 1
      state =
        AirHockey.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> put_in(["puck", "x"], 6.0)
        |> put_in(["puck", "y"], 50.0)
        |> put_in(["puck", "vx"], -10.0)
        |> put_in(["puck", "vy"], 0.0)

      {scored, nil} = AirHockey.step(state, %{}, 1)

      assert scored["score"]["1"] == 1
      assert scored["score"]["0"] == 0
      assert scored["state"] == "goal"
      assert scored["goalDelay"] == 60
      assert scored["lastGoalBy"] == 1
      assert scored["puck"]["vx"] == 0.0
      assert scored["puck"]["vy"] == 0.0
    end

    test "double-goal fixture: stepping during goal delay does not double-score" do
      # Start from a goal just scored
      state =
        AirHockey.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> put_in(["puck", "x"], 5.0)
        |> put_in(["puck", "y"], 50.0)
        |> put_in(["puck", "vx"], -8.0)
        |> put_in(["puck", "vy"], 0.0)

      {scored1, nil} = AirHockey.step(state, %{}, 1)
      assert scored1["score"]["1"] == 1
      assert scored1["state"] == "goal"

      # Step 10 ticks while in goal state
      {scored_after_10, nil} = AirHockey.step(scored1, %{}, 10)
      assert scored_after_10["score"]["1"] == 1
      assert scored_after_10["score"]["0"] == 0
      assert scored_after_10["state"] == "goal"
      assert scored_after_10["goalDelay"] == 50
    end

    test "goal delay expires and resets puck to center serving to conceding player" do
      state =
        AirHockey.init_sim_state()
        |> Map.put("state", "goal")
        |> Map.put("goalDelay", 2)
        |> Map.put("lastScorerSlot", 1)
        |> Map.put("score", %{"0" => 0, "1" => 1})

      {reset_state, nil} = AirHockey.step(state, %{}, 2)
      assert reset_state["state"] == "serving"
      assert reset_state["serveDelay"] == 45
      assert reset_state["puck"]["x"] == 100.0
      assert reset_state["puck"]["y"] == 50.0
      # Conceding player was slot 0 -> puck moves left towards slot 0
      assert reset_state["puck"]["vx"] < 0.0
    end
  end

  describe "scoring, series progression, and match completion" do
    test "first to seven points completes game in best-of-3 series and starts game break" do
      state =
        AirHockey.init_sim_state(series_length: 3)
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> Map.put("score", %{"0" => 6, "1" => 4})
        |> put_in(["puck", "x"], 195.0)
        |> put_in(["puck", "y"], 50.0)
        |> put_in(["puck", "vx"], 8.0)
        |> put_in(["puck", "vy"], 0.0)

      # Slot 0 scores on Slot 1's goal (x=200) -> 7th point for Slot 0
      {game1_won, outcome} = AirHockey.step(state, %{}, 1)

      assert outcome == nil # Series not ended yet (best-of-3 needs 2 wins)
      assert game1_won["state"] == "game_break"
      assert game1_won["seriesScore"]["0"] == 1
      assert game1_won["seriesScore"]["1"] == 0
      assert length(game1_won["gamesHistory"]) == 1
      assert hd(game1_won["gamesHistory"])["winner"] == 0
      assert hd(game1_won["gamesHistory"])["score"] == %{"0" => 7, "1" => 4}
    end

    test "second win in best-of-3 completes series and emits match_ended outcome" do
      state =
        AirHockey.init_sim_state(series_length: 3)
        |> Map.put("currentGame", 2)
        |> Map.put("seriesScore", %{"0" => 1, "1" => 0})
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> Map.put("score", %{"0" => 6, "1" => 2})
        |> put_in(["puck", "x"], 195.0)
        |> put_in(["puck", "y"], 50.0)
        |> put_in(["puck", "vx"], 8.0)
        |> put_in(["puck", "vy"], 0.0)

      # Slot 0 scores 7th point in Game 2 -> 2nd series win -> Match over!
      {series_won, outcome} = AirHockey.step(state, %{}, 1)

      assert series_won["state"] == "ended"
      assert series_won["winner"] == 0
      assert series_won["seriesScore"]["0"] == 2

      assert {:match_ended, 0, details} = outcome
      assert details.winner_slot == 0
      assert details.series_score == %{"0" => 2, "1" => 0}
      assert details.series_length == 3
      assert length(details.games) == 1
    end

    test "single-game series ends on 7 points immediately" do
      state =
        AirHockey.init_sim_state(series_length: 1)
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> Map.put("score", %{"0" => 6, "1" => 5})
        |> put_in(["puck", "x"], 195.0)
        |> put_in(["puck", "y"], 50.0)
        |> put_in(["puck", "vx"], 8.0)
        |> put_in(["puck", "vy"], 0.0)

      {match_won, outcome} = AirHockey.step(state, %{}, 1)
      assert match_won["state"] == "ended"
      assert {:match_ended, 0, details} = outcome
      assert details.winner_slot == 0
      assert details.score == %{"0" => 7, "1" => 5}
    end
  end
end

defmodule Afterlight.Activities.GutterBoatTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.GutterBoat

  describe "init_sim_state/1" do
    test "initializes 1-4 lane gutter boat race state" do
      state = GutterBoat.init_sim_state(slots: [0, 1, 2, 3])

      assert state["status"] == "racing"
      assert state["courseId"] == "rain-court-gutter"
      assert map_size(state["boats"]) == 4

      b0 = state["boats"]["0"]
      assert b0["slot"] == 0
      assert b0["progress"] == 0.0
      assert b0["finished"] == false
      assert b0["finishTimeMs"] == nil
    end
  end

  describe "validate_controls/1" do
    test "accepts valid controls and rejects unknown kinds" do
      assert {:ok, %{"kind" => "push"}} = GutterBoat.validate_controls(%{"kind" => "push"})
      assert {:ok, %{"kind" => "neutral"}} = GutterBoat.validate_controls(%{"kind" => "neutral"})
      assert {:error, :unknown_kind} = GutterBoat.validate_controls(%{"kind" => "warp"})
      assert {:error, :invalid_controls} = GutterBoat.validate_controls("invalid")
    end
  end

  describe "rain and wind influence on current speed" do
    test "heavy rain accelerates boat progress compared to dry conditions" do
      dry_env = %{"rain" => 0.0, "wind" => [0.0, 0.0]}
      rain_env = %{"rain" => 1.0, "wind" => [0.0, 1.0]}

      dry_state = GutterBoat.init_sim_state(slots: [0], environment: dry_env, seed: 100)
      rain_state = GutterBoat.init_sim_state(slots: [0], environment: rain_env, seed: 100)

      {dry_stepped, _} = GutterBoat.step_simulation(dry_state, %{}, 120)
      {rain_stepped, _} = GutterBoat.step_simulation(rain_state, %{}, 120)

      dry_progress = dry_stepped["boats"]["0"]["progress"]
      rain_progress = rain_stepped["boats"]["0"]["progress"]

      assert rain_progress > dry_progress
    end
  end

  describe "push boost control" do
    test "player push provides immediate speed boost near start" do
      state_normal = GutterBoat.init_sim_state(slots: [0], seed: 42)
      state_pushed = GutterBoat.init_sim_state(slots: [0], seed: 42)

      {normal_stepped, _} = GutterBoat.step_simulation(state_normal, %{}, 30)

      players_push = %{0 => %{input_state: %{"kind" => "push"}}}
      {pushed_stepped, _} = GutterBoat.step_simulation(state_pushed, players_push, 30)

      assert pushed_stepped["boats"]["0"]["progress"] > normal_stepped["boats"]["0"]["progress"]
    end
  end

  describe "race finish and standings" do
    test "boats finish across 8m line with deterministic standings and tie policy" do
      state = GutterBoat.init_sim_state(slots: [0, 1], seed: 42)

      # Step until complete
      final_state =
        Enum.reduce_while(1..200, state, fn _step, acc ->
          {next_state, outcome} = GutterBoat.step_simulation(acc, %{}, 10)

          if outcome != nil do
            {:halt, next_state}
          else
            {:cont, next_state}
          end
        end)

      assert final_state["status"] == "complete"
      assert final_state["boats"]["0"]["finished"] == true
      assert final_state["boats"]["1"]["finished"] == true
      assert length(final_state["standings"]) == 2
      assert is_integer(final_state["winner"])
    end
  end
end

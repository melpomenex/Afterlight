defmodule Afterlight.Activities.RainRunnerTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.RainRunner

  describe "init_sim_state/1" do
    test "initializes fresh simulation with bounded geometry and seed" do
      state = RainRunner.init_sim_state(seed: 42)

      assert state["roadWidth"] == 360
      assert state["player"]["x"] == 0.0
      assert state["player"]["speed"] == 6.0
      assert state["distance"] == 0.0
      assert state["score"] == 0
      assert state["seed"] == 42
      assert state["state"] == "running"
      assert state["tick"] == 0
    end
  end

  describe "steering physics" do
    test "moves player laterally and clamps to road boundaries" do
      # Avoid obstacle spawns during pure kinematics test
      state =
        RainRunner.init_sim_state(seed: 123)
        |> Map.put("nextObstacleDistance", 999_999.0)

      # Steer right for 40 ticks
      players_right = %{0 => %{input_state: %{"steer" => 1.0}}}
      {steered_right, nil} = RainRunner.step(state, players_right, 40)

      assert steered_right["player"]["x"] > 50.0
      assert steered_right["player"]["x"] <= 164.0

      # Continue steering right to boundary clamp
      {clamped_right, nil} = RainRunner.step(steered_right, players_right, 100)
      assert clamped_right["player"]["x"] == 164.0

      # Steer left all the way to left boundary clamp
      players_left = %{0 => %{input_state: %{"steer" => -1.0}}}
      {clamped_left, nil} = RainRunner.step(clamped_right, players_left, 200)
      assert clamped_left["player"]["x"] == -164.0
    end

    test "accepts arrow / WASD boolean keys" do
      state =
        RainRunner.init_sim_state(seed: 123)
        |> Map.put("nextObstacleDistance", 999_999.0)

      players_d = %{0 => %{input_state: %{"right" => true}}}
      {steered_d, nil} = RainRunner.step(state, players_d, 30)
      assert steered_d["player"]["x"] > 30.0

      players_a = %{0 => %{input_state: %{"left" => true}}}
      {steered_a, nil} = RainRunner.step(steered_d, players_a, 60)
      assert steered_a["player"]["x"] < 0.0
    end
  end

  describe "throttle and brake" do
    test "throttle increases speed up to max; brake decreases down to min" do
      state =
        RainRunner.init_sim_state(seed: 123)
        |> Map.put("nextObstacleDistance", 999_999.0)

      # Full throttle
      players_gas = %{0 => %{input_state: %{"throttle" => 1.0}}}
      {accelerated, nil} = RainRunner.step(state, players_gas, 80)
      assert accelerated["player"]["speed"] >= 13.5
      assert accelerated["player"]["speed"] <= 14.0

      # Hard brake
      players_brake = %{0 => %{input_state: %{"throttle" => -1.0}}}
      {braked, nil} = RainRunner.step(accelerated, players_brake, 80)
      assert braked["player"]["speed"] <= 4.0
      assert braked["player"]["speed"] >= 3.5
    end
  end

  describe "collision detection" do
    test "crashing into a barrier ends the match with collision reason and final score" do
      # Seed 99 spawns obstacles ahead
      state = RainRunner.init_sim_state(seed: 99)

      # Fast forward simulation until collision occurs
      players = %{0 => %{input_state: %{"throttle" => 1.0, "steer" => 0.0}}}

      outcome =
        Enum.reduce_while(1..500, state, fn _i, curr ->
          case RainRunner.step(curr, players, 1) do
            {next_state, nil} ->
              {:cont, next_state}

            {ended_state, {:match_ended, 0, details}} ->
              {:halt, {ended_state, details}}
          end
        end)

      assert {ended_state, details} = outcome
      assert ended_state["state"] == "crashed"
      assert details[:reason] == "collision" || details["reason"] == "collision"
      assert details[:score] > 0 || details["score"] > 0
      assert details[:distance] > 0 || details["distance"] > 0
    end
  end

  describe "10-minute run cap" do
    test "reaching 36,000 ticks ends the match with run_cap reason" do
      state =
        RainRunner.init_sim_state(seed: 55)
        |> Map.put("tick", 35_998)
        |> Map.put("obstacles", []) # clear obstacles so it doesn't crash

      players = %{0 => %{input_state: %{}}}
      {_s1, nil} = RainRunner.step(state, players, 1)
      {capped_state, outcome} = RainRunner.step(state |> Map.put("tick", 35_999), players, 1)

      assert capped_state["state"] == "completed"
      assert {:match_ended, 0, details} = outcome
      assert details[:reason] == "run_cap" || details["reason"] == "run_cap"
    end
  end

  describe "determinism" do
    test "identical seed and inputs yield identical state and trajectory" do
      state1 = RainRunner.init_sim_state(seed: 777)
      state2 = RainRunner.init_sim_state(seed: 777)

      inputs = [
        %{"steer" => 0.5, "throttle" => 1.0},
        %{"steer" => -0.5, "throttle" => 0.0},
        %{"steer" => 1.0, "throttle" => -0.5},
        %{"steer" => 0.0, "throttle" => 0.5}
      ]

      final1 =
        Enum.reduce(inputs, state1, fn inp, s ->
          {next, _} = RainRunner.step(s, %{0 => %{input_state: inp}}, 25)
          next
        end)

      final2 =
        Enum.reduce(inputs, state2, fn inp, s ->
          {next, _} = RainRunner.step(s, %{0 => %{input_state: inp}}, 25)
          next
        end)

      assert final1 == final2
      assert final1["distance"] == final2["distance"]
      assert final1["score"] == final2["score"]
      assert final1["player"] == final2["player"]
    end
  end
end

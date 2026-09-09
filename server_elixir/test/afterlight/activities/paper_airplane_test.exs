defmodule Afterlight.Activities.PaperAirplaneTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.PaperAirplane

  describe "init_sim_state/1" do
    test "initializes 2-player paper airplane state with 3 rounds" do
      state = PaperAirplane.init_sim_state(slots: [0, 1])

      assert state["totalRounds"] == 3
      assert state["currentRound"] == 1
      assert state["status"] == "aiming"
      assert map_size(state["players"]) == 2

      p0 = state["players"]["0"]
      assert p0["slot"] == 0
      assert p0["currentRound"] == 1
      assert p0["throws"] == []
      assert p0["bestDistance"] == 0.0
    end
  end

  describe "validate_controls/1" do
    test "accepts valid launch controls with clamped values" do
      assert {:ok, %{"kind" => "launch", "foldStyle" => "classic", "yaw" => +0.0, "pitch" => 0.25, "power" => 0.6}} =
               PaperAirplane.validate_controls(%{"kind" => "launch"})

      assert {:ok, clamped} =
               PaperAirplane.validate_controls(%{
                 "kind" => "launch",
                 "foldStyle" => "GLIDER",
                 "yaw" => 4.0,
                 "pitch" => -1.0,
                 "power" => 5.0
               })

      assert clamped["foldStyle"] == "glider"
      assert clamped["yaw"] == 0.75
      assert clamped["pitch"] == -0.15
      assert clamped["power"] == 1.0
    end

    test "rejects invalid controls or unknown kind" do
      assert {:error, :invalid_controls} = PaperAirplane.validate_controls("not_a_map")
      assert {:error, :unknown_kind} = PaperAirplane.validate_controls(%{"kind" => "unknown"})
    end
  end

  describe "aerodynamic flight reproducibility and wind influence" do
    test "identical initial conditions produce identical flight distance and landing position" do
      launch = %{"foldStyle" => "dart", "yaw" => 0.1, "pitch" => 0.3, "power" => 0.8}
      env = %{"wind" => [0.4, -0.2], "windSpeed" => 0.45}
      origin = [7.5, 1.2, -7.5]

      run1 = PaperAirplane.simulate_flight(launch, env, origin)
      run2 = PaperAirplane.simulate_flight(launch, env, origin)

      assert run1.distance == run2.distance
      assert run1.flight_time_ms == run2.flight_time_ms
      assert run1.landing_pos == run2.landing_pos
      assert length(run1.trajectory) == length(run2.trajectory)
    end

    test "wind influence alters flight trajectory deterministically" do
      launch = %{"foldStyle" => "classic", "yaw" => 0.0, "pitch" => 0.25, "power" => 0.7}
      origin = [7.5, 1.2, -7.5]

      env_calm = %{"wind" => [0.0, 0.0], "windSpeed" => 0.0}
      env_crosswind = %{"wind" => [1.0, 0.0], "windSpeed" => 1.0}

      calm = PaperAirplane.simulate_flight(launch, env_calm, origin)
      crosswind = PaperAirplane.simulate_flight(launch, env_crosswind, origin)

      [calm_x, _, _] = calm.landing_pos
      [cross_x, _, _] = crosswind.landing_pos

      assert cross_x > calm_x
      assert crosswind.distance != calm.distance
    end
  end

  describe "multi-round match flow and standings" do
    test "completes 3 rounds and produces ranked standings" do
      state = PaperAirplane.init_sim_state(slots: [0, 1])

      # Round 1: Slot 0 throws
      players_r1_s0 = %{
        0 => %{input_state: %{"kind" => "launch", "foldStyle" => "classic", "yaw" => 0.0, "pitch" => 0.2, "power" => 0.6}}
      }
      {state, outcome} = PaperAirplane.step_simulation(state, players_r1_s0, 1)
      assert outcome == nil
      assert state["currentRound"] == 1

      # Round 1: Slot 1 throws -> round 1 finishes, advances to round 2
      players_r1_s1 = %{
        1 => %{input_state: %{"kind" => "launch", "foldStyle" => "classic", "yaw" => 0.0, "pitch" => 0.2, "power" => 0.5}}
      }
      {state, _} = PaperAirplane.step_simulation(state, players_r1_s1, 1)
      assert state["currentRound"] == 2

      # Round 2: both throw
      players_r2 = %{
        0 => %{input_state: %{"kind" => "launch", "foldStyle" => "dart", "yaw" => 0.0, "pitch" => 0.3, "power" => 0.8}},
        1 => %{input_state: %{"kind" => "launch", "foldStyle" => "dart", "yaw" => 0.0, "pitch" => 0.3, "power" => 0.85}}
      }
      {state, _} = PaperAirplane.step_simulation(state, players_r2, 1)
      assert state["currentRound"] == 3

      # Round 3: both throw -> contest finishes!
      players_r3 = %{
        0 => %{input_state: %{"kind" => "launch", "foldStyle" => "glider", "yaw" => 0.0, "pitch" => 0.25, "power" => 0.7}},
        1 => %{input_state: %{"kind" => "launch", "foldStyle" => "glider", "yaw" => 0.0, "pitch" => 0.25, "power" => 0.7}}
      }
      {state, outcome} = PaperAirplane.step_simulation(state, players_r3, 1)

      assert state["status"] == "complete"
      assert state["winner"] != nil
      assert length(state["standings"]) == 2
      assert {:match_ended, _winner_slot, details} = outcome
      assert details["winnerSlot"] == state["winner"]
      assert details["reason"] == "rounds_complete"
    end
  end
end

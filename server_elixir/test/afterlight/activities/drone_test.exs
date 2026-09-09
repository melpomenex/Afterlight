defmodule Afterlight.Activities.DroneTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Drone

  describe "init_sim_state/1" do
    test "initializes default 2-player state on rooftop-circuit course" do
      state = Drone.init_sim_state(slots: [0, 1])

      assert state["courseId"] == "rooftop-circuit"
      assert state["courseVersion"] == 1
      assert state["totalLaps"] == 2
      assert state["status"] == "racing"
      assert map_size(state["drones"]) == 2

      d0 = state["drones"]["0"]
      assert d0["slot"] == 0
      assert d0["nextCheckpoint"] == 0
      assert d0["currentLap"] == 1
      assert d0["finished"] == false
      assert d0["dnf"] == false
    end

    test "initializes 4-player state" do
      state = Drone.init_sim_state(slots: [0, 1, 2, 3])
      assert map_size(state["drones"]) == 4
    end
  end

  describe "validate_controls/1" do
    test "accepts neutral and flight kinds with clamped controls" do
      assert {:ok, %{"kind" => "neutral"}} = Drone.validate_controls(%{"kind" => "neutral"})

      assert {:ok, valid} =
               Drone.validate_controls(%{
                 "kind" => "flight",
                 "throttle" => 2.5,
                 "pitch" => -3.0,
                 "yaw" => 4.0,
                 "roll" => -1.5
               })

      assert valid["throttle"] == 1.0
      assert valid["pitch"] == -1.0
      assert valid["yaw"] == 1.0
      assert valid["roll"] == -1.0
    end

    test "rejects invalid controls or unknown kind" do
      assert {:error, :invalid_controls} = Drone.validate_controls("not_a_map")
      assert {:error, :unknown_kind} = Drone.validate_controls(%{"kind" => "unsupported"})
    end
  end

  describe "checkpoints and lap progression" do
    test "advances checkpoints sequentially and rejects skipped checkpoints" do
      state = Drone.init_sim_state(slots: [0])
      players = %{0 => %{input_state: %{"throttle" => 0.5}}}

      # 1. Teleport to Checkpoint 0
      cp0 = hd(Drone.checkpoints())
      state = put_in(state, ["drones", "0", "position"], cp0.position)

      {state, _} = Drone.step_simulation(state, players, 1)
      assert get_in(state, ["drones", "0", "nextCheckpoint"]) == 1
      assert get_in(state, ["drones", "0", "checkpointsHit"]) == 1

      # 2. Skip Checkpoint 1 and teleport to Checkpoint 3
      cp3 = Enum.at(Drone.checkpoints(), 3)
      state = put_in(state, ["drones", "0", "position"], cp3.position)

      {state, _} = Drone.step_simulation(state, players, 1)

      # Invariant: skipped checkpoint must be rejected!
      assert get_in(state, ["drones", "0", "nextCheckpoint"]) == 1
      assert get_in(state, ["drones", "0", "checkpointsHit"]) == 1
    end

    test "completes 2 laps and ends match with winner" do
      state = Drone.init_sim_state(slots: [0])
      players = %{0 => %{input_state: %{"throttle" => 0.5}}}
      cps = Drone.checkpoints()

      # Lap 1: checkpoints 0..5
      state =
        Enum.reduce(0..5, state, fn idx, acc ->
          cp = Enum.at(cps, idx)
          acc = put_in(acc, ["drones", "0", "position"], cp.position)
          {stepped, _} = Drone.step_simulation(acc, players, 1)
          stepped
        end)

      # Finish Lap 1 by crossing CP 0 again
      cp0 = Enum.at(cps, 0)
      state = put_in(state, ["drones", "0", "position"], cp0.position)
      {state, _} = Drone.step_simulation(state, players, 1)

      assert get_in(state, ["drones", "0", "currentLap"]) == 2
      assert length(get_in(state, ["drones", "0", "lapTimes"])) == 1
      assert get_in(state, ["drones", "0", "finished"]) == false

      # Lap 2: checkpoints 1..4
      state =
        Enum.reduce(1..4, state, fn idx, acc ->
          cp = Enum.at(cps, idx)
          acc = put_in(acc, ["drones", "0", "position"], cp.position)
          {stepped, _} = Drone.step_simulation(acc, players, 1)
          stepped
        end)

      # Checkpoint 5 finishes lap 2 and concludes race
      cp5 = Enum.at(cps, 5)
      state = put_in(state, ["drones", "0", "position"], cp5.position)
      {state, outcome} = Drone.step_simulation(state, players, 1)

      assert get_in(state, ["drones", "0", "finished"]) == true
      assert state["status"] == "complete"
      assert state["winner"] == 0
      assert {:match_ended, 0, details} = outcome
      assert details["winnerSlot"] == 0
      assert details["reason"] == "finish"
    end
  end

  describe "collisions, stun, and DNF" do
    test "boundary collisions trigger bounce and control stun" do
      state = Drone.init_sim_state(slots: [0])
      players = %{0 => %{input_state: %{"throttle" => 0.5}}}

      bounds = Drone.bounds()
      state = put_in(state, ["drones", "0", "position"], [bounds.maxX + 0.5, 3.0, 0.0])
      state = put_in(state, ["drones", "0", "velocity"], [10.0, 0.0, 0.0])

      {state, _} = Drone.step_simulation(state, players, 1)

      [vx, _, _] = get_in(state, ["drones", "0", "velocity"])
      assert vx < 0.0
      assert get_in(state, ["drones", "0", "stunTicks"]) > 0
      assert get_in(state, ["drones", "0", "collisionCount"]) == 1
    end

    test "mark_dnf leaves active racers continuing" do
      state = Drone.init_sim_state(slots: [0, 1])
      players = %{0 => %{input_state: %{"throttle" => 0.5}}}

      state = Drone.mark_dnf(state, 1, "pilot_left")
      assert get_in(state, ["drones", "1", "dnf"]) == true
      assert state["status"] == "racing"

      # Pilot 0 completes race
      cps = Drone.checkpoints()

      # Lap 1: 0..5
      state =
        Enum.reduce(0..5, state, fn idx, acc ->
          cp = Enum.at(cps, idx)
          acc = put_in(acc, ["drones", "0", "position"], cp.position)
          {stepped, _} = Drone.step_simulation(acc, players, 1)
          stepped
        end)

      # CP 0 starts Lap 2
      cp0 = Enum.at(cps, 0)
      state = put_in(state, ["drones", "0", "position"], cp0.position)
      {state, _} = Drone.step_simulation(state, players, 1)

      # Lap 2: 1..4
      state =
        Enum.reduce(1..4, state, fn idx, acc ->
          cp = Enum.at(cps, idx)
          acc = put_in(acc, ["drones", "0", "position"], cp.position)
          {stepped, _} = Drone.step_simulation(acc, players, 1)
          stepped
        end)

      # Checkpoint 5 finishes lap 2 and race
      cp5 = Enum.at(cps, 5)
      state = put_in(state, ["drones", "0", "position"], cp5.position)
      {state, outcome} = Drone.step_simulation(state, players, 1)

      assert get_in(state, ["drones", "0", "finished"]) == true
      assert state["status"] == "complete"
      assert state["winner"] == 0
      assert {:match_ended, 0, _} = outcome
    end
  end
end

defmodule Afterlight.Activities.RcBoatTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.RcBoat

  describe "init_sim_state/1" do
    test "initializes 1-4 lane RC boat race state" do
      state = RcBoat.init_sim_state(slots: [0, 1, 2, 3])

      assert state["status"] == "racing"
      assert state["courseId"] == "sluice-circuit"
      assert state["totalLaps"] == 2
      assert map_size(state["boats"]) == 4

      b0 = state["boats"]["0"]
      assert b0["slot"] == 0
      assert b0["currentLap"] == 1
      assert b0["nextCheckpoint"] == 0
      assert b0["checkpointsHit"] == 0
      assert b0["finished"] == false
      assert b0["dnf"] == false
    end
  end

  describe "validate_controls/1" do
    test "validates and clamps throttle, steer, and recover controls" do
      assert {:ok, %{"throttle" => +0.0, "steer" => +0.0, "recover" => false}} =
               RcBoat.validate_controls(%{})

      assert {:ok, %{"throttle" => 1.0, "steer" => -1.0, "recover" => true}} =
               RcBoat.validate_controls(%{"throttle" => 5.0, "steer" => -10.0, "recover" => true})

      assert {:ok, %{"throttle" => -0.5, "steer" => 1.0, "recover" => false}} =
               RcBoat.validate_controls(%{"throttle" => -2.0, "steer" => 2.0})

      assert {:error, :invalid_controls} = RcBoat.validate_controls("invalid")
    end
  end

  describe "sequential buoy checkpoint advancement" do
    test "advances checkpoint index only when passing current buoy" do
      state = RcBoat.init_sim_state(slots: [0])
      [cp0, cp1 | _] = RcBoat.checkpoints()

      # Attempt to trigger Buoy 1 first
      state_skip = put_in(state, ["boats", "0", "position"], cp1.position)
      {stepped_skip, _} = RcBoat.step_simulation(state_skip, %{}, 1)

      assert stepped_skip["boats"]["0"]["nextCheckpoint"] == 0
      assert stepped_skip["boats"]["0"]["checkpointsHit"] == 0

      # Pass Buoy 0
      state_cp0 = put_in(state, ["boats", "0", "position"], cp0.position)
      {stepped_cp0, _} = RcBoat.step_simulation(state_cp0, %{}, 1)

      assert stepped_cp0["boats"]["0"]["nextCheckpoint"] == 1
      assert stepped_cp0["boats"]["0"]["checkpointsHit"] == 1
    end
  end

  describe "wall collision and stun response" do
    test "bounces off canal bounds with negative speed and stun ticks" do
      state = RcBoat.init_sim_state(slots: [0])
      bounds = RcBoat.bounds()

      # Place boat beyond east boundary
      state_collided =
        state
        |> put_in(["boats", "0", "position"], [bounds.maxX + 0.1, 0.23, 5.0])
        |> put_in(["boats", "0", "speed"], 5.0)

      {stepped, _} = RcBoat.step_simulation(state_collided, %{}, 1)
      b = stepped["boats"]["0"]

      assert b["collisionCount"] == 1
      assert b["stunTicks"] > 0
      assert b["speed"] < 0.0
    end
  end

  describe "manual recovery reset" do
    test "resets position to last cleared checkpoint when recover requested" do
      state = RcBoat.init_sim_state(slots: [0])
      [cp0 | _] = RcBoat.checkpoints()

      # Clear Buoy 0
      state_cp0 = put_in(state, ["boats", "0", "position"], cp0.position)
      {stepped_cp0, _} = RcBoat.step_simulation(state_cp0, %{}, 1)

      # Send recover input
      players = %{0 => %{input_state: %{"recover" => true}}}
      {recovered, _} = RcBoat.step_simulation(stepped_cp0, players, 1)
      b = recovered["boats"]["0"]

      assert b["position"] == cp0.position
      assert b["speed"] == 0.0
      assert b["stunTicks"] > 0
    end
  end

  describe "DNF marking and race completion" do
    test "disconnected pilot marked DNF while other completes race" do
      state = RcBoat.init_sim_state(slots: [0, 1])

      state_dnf = RcBoat.mark_dnf(state, 1, "disconnect")
      assert state_dnf["boats"]["1"]["dnf"] == true
      assert state_dnf["status"] == "racing"

      # Simulate Slot 0 completing 2 laps through all checkpoints
      checkpoints = RcBoat.checkpoints()
      [cp0 | _] = checkpoints

      final_state =
        Enum.reduce(1..2, state_dnf, fn _lap, acc ->
          Enum.reduce(checkpoints, acc, fn cp, lap_acc ->
            s = put_in(lap_acc, ["boats", "0", "position"], cp.position)
            {next_s, _} = RcBoat.step_simulation(s, %{}, 1)
            next_s
          end)
        end)

      # Cross finish gate
      state_finish = put_in(final_state, ["boats", "0", "position"], cp0.position)
      {completed, outcome} = RcBoat.step_simulation(state_finish, %{}, 1)

      assert completed["status"] == "complete"
      assert completed["winner"] == 0
      assert length(completed["standings"]) == 2
      assert List.first(completed["standings"])["finished"] == true
      assert List.last(completed["standings"])["dnf"] == true
      assert outcome != nil
    end
  end
end

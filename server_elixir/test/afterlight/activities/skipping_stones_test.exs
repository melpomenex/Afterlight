defmodule Afterlight.Activities.SkippingStonesTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.SkippingStones

  @calm %{"wind" => [0.0, 0.0], "windSpeed" => 0.0, "rain" => 0.0, "frozenAt" => 10}
  @windy %{"wind" => [0.8, -0.2], "windSpeed" => 0.82, "rain" => 0.0, "frozenAt" => 10}
  @rainy %{"wind" => [0.0, 0.0], "windSpeed" => 0.0, "rain" => 0.95, "frozenAt" => 10}
  @launch %{"kind" => "launch", "angle" => 0.2, "power" => 0.85, "yaw" => 0.0}
  @origin [0.0, 0.95, 0.15]

  describe "init_sim_state/1 and validate_controls/1" do
    test "freezes start conditions and clamps launch bounds" do
      state = SkippingStones.init_sim_state(slots: [0, 1], environment: @calm, now_ms: 10)
      assert state["status"] == "open"
      assert state["environment"]["policy"] == "frozen"
      assert state["environment"]["frozenAt"] == 10

      assert {:ok, clamped} =
               SkippingStones.validate_controls(%{"kind" => "launch", "angle" => 4, "power" => -1, "yaw" => 2})

      assert clamped["angle"] == 0.55
      assert clamped["power"] == 0.15
      assert clamped["yaw"] == 0.35
      assert {:error, :unknown_kind} = SkippingStones.validate_controls(%{"kind" => "teleport"})
    end
  end

  describe "simulate_skip/3" do
    test "identical launches under frozen wind/rain reproduce skip count and distance" do
      a = SkippingStones.simulate_skip(@launch, @calm, @origin)
      b = SkippingStones.simulate_skip(@launch, @calm, @origin)
      assert a.skips == b.skips
      assert a.distance == b.distance
      assert a.landing_pos == b.landing_pos
      assert length(a.trajectory) == length(b.trajectory)
      assert a.skips >= 1
    end

    test "frozen wind and rain change outcomes deterministically" do
      calm = SkippingStones.simulate_skip(@launch, @calm, @origin)
      wind = SkippingStones.simulate_skip(@launch, @windy, @origin)
      rain = SkippingStones.simulate_skip(@launch, @rainy, @origin)

      assert calm.distance != wind.distance
      [calm_x, _, _] = calm.landing_pos
      [wind_x, _, _] = wind.landing_pos
      assert wind_x > calm_x
      assert rain.skips < calm.skips or rain.distance < calm.distance
    end
  end

  describe "apply_input/3 and step_simulation/3" do
    test "two throwers share outcomes; leave and cleanup are independent" do
      state = SkippingStones.init_sim_state(slots: [0, 1], environment: @calm, now_ms: 10)
      {:ok, state} = SkippingStones.apply_input(state, 0, @launch)
      assert state["throwers"]["0"]["currentThrow"]["skips"] >= 1

      {:ok, state} = SkippingStones.apply_input(state, 1, Map.put(@launch, "power", 0.7))
      assert state["throwers"]["0"]["currentThrow"]
      assert state["throwers"]["1"]["currentThrow"]

      {:ok, state} = SkippingStones.apply_input(state, 1, %{"kind" => "leave"})
      assert state["throwers"]["1"]["currentThrow"] == nil
      assert state["throwers"]["1"]["phase"] == "idle"
      assert state["throwers"]["0"]["currentThrow"]
    end

    test "later weather cannot rewrite frozen start conditions" do
      state = SkippingStones.init_sim_state(slots: [0], environment: @calm, now_ms: 10)
      before = state["environment"]
      {:ok, state} = SkippingStones.apply_input(state, 0, %{"kind" => "environment", "environment" => @windy})
      assert state["environment"] == before

      origin = state["throwers"]["0"]["origin"]
      replay = SkippingStones.simulate_skip(@launch, state["environment"], origin)
      expected = SkippingStones.simulate_skip(@launch, @calm, origin)
      assert replay.skips == expected.skips
      assert replay.distance == expected.distance
    end

    test "sunk throws clean up after the shared timeout" do
      state = SkippingStones.init_sim_state(slots: [0], environment: @calm)
      {:ok, state} = SkippingStones.apply_input(state, 0, @launch)
      flight_ms = state["throwers"]["0"]["currentThrow"]["flightTimeMs"]
      steps = ceil(flight_ms / (1000 / 60)) + 4

      {state, outcome} = SkippingStones.step_simulation(state, %{}, steps)
      assert outcome == nil
      assert state["throwers"]["0"]["phase"] == "sunk"
      assert state["throwers"]["0"]["lastThrow"]["distance"] > 0

      {state, _} = SkippingStones.step_simulation(state, %{}, SkippingStones.cleanup_ticks())
      assert state["throwers"]["0"]["currentThrow"] == nil
      assert state["throwers"]["0"]["phase"] == "idle"
    end
  end
end

defmodule Afterlight.Activities.TelescopeTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Telescope

  @t0 1_700_000_000_000

  describe "init_sim_state/1" do
    test "uses live timestamps and never freezes" do
      state =
        Telescope.init_sim_state(
          seed: 7,
          now: @t0,
          slots: [0, 1],
          environment: %{"policy" => "frozen", "frozenAt" => 99, "timePhase" => 0.4}
        )

      assert state["status"] == "observing"
      assert state["winner"] == nil
      assert state["environment"]["policy"] == "live"
      assert state["environment"]["frozenAt"] == nil
      assert state["environment"]["now"] == @t0
      assert Telescope.find_object(state["sky"], "vega")
    end
  end

  describe "seeded sky and live time" do
    test "same seed reproduces catalog; live now moves positions" do
      a = Telescope.build_sky(99)
      b = Telescope.build_sky(99)
      assert Enum.map(a, & &1["id"]) == Enum.map(b, & &1["id"])
      assert Telescope.find_object(a, "seed-0") == Telescope.find_object(b, "seed-0")

      vega = Telescope.find_object(a, "vega")
      env = %{"timePhase" => 0.25}
      at_t0 = Telescope.apparent_position(vega, @t0, env)
      again = Telescope.apparent_position(vega, @t0, env)
      later = Telescope.apparent_position(vega, @t0 + 3_600_000, env)

      assert at_t0 == again
      refute at_t0 == later
    end
  end

  describe "apply_input/3" do
    test "two observers mark and highlight the same object, then leave without a winner" do
      state = Telescope.init_sim_state(seed: 7, now: @t0, slots: [0, 1])

      {state, marked} = Telescope.apply_input(state, 0, %{"kind" => "mark", "objectId" => "vega"})
      assert marked["type"] == "object_marked"
      assert state["marks"]["vega"]["markedBy"] == 0

      {state, seen} = Telescope.apply_input(state, 1, %{"kind" => "highlight", "objectId" => "vega"})
      assert seen["type"] == "object_highlighted"
      assert state["marks"]["vega"]["highlightedBy"] == [0, 1]

      {state, left} = Telescope.apply_input(state, 0, %{"kind" => "leave"})
      assert left["type"] == "observer_left"
      assert left["winner"] == nil
      assert state["winner"] == nil
      assert state["status"] == "observing"

      {state, _} = Telescope.apply_input(state, 1, %{"kind" => "leave"})
      assert state["status"] == "idle"
      assert state["winner"] == nil
    end

    test "unknown object ids are ignored" do
      state = Telescope.init_sim_state(seed: 4, now: @t0)
      {next, event} = Telescope.apply_input(state, 0, %{"kind" => "mark", "objectId" => "not-a-star"})
      assert event == nil
      assert next["marks"] == %{}
    end
  end

  describe "step_simulation/3" do
    test "second observer locates the same live-timed object" do
      state = Telescope.init_sim_state(seed: 11, now: @t0, slots: [0, 1])

      {state, _} =
        Telescope.step_simulation(state, %{
          0 => %{input_state: %{"kind" => "mark", "objectId" => "polaris", "now" => @t0}}
        })

      {state, event} =
        Telescope.step_simulation(state, %{
          1 => %{input_state: %{"kind" => "locate", "objectId" => "polaris", "now" => @t0 + 500}}
        })

      assert state["environment"]["policy"] == "live"
      assert state["environment"]["frozenAt"] == nil
      assert state["environment"]["now"] == @t0 + 500
      assert get_in(state, ["observers", "0", "located"]) == "polaris"
      assert get_in(state, ["observers", "1", "located"]) == "polaris"
      assert state["marks"]["polaris"]["highlightedBy"] == [0, 1]
      assert event["type"] == "object_marked"
      assert state["winner"] == nil
    end
  end
end

defmodule Afterlight.Activities.LightMusicTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.LightMusic

  describe "init_sim_state/1" do
    test "seeds a shared sequence with no ranking fields" do
      state = LightMusic.init_sim_state(slots: [0, 1], seed: 42)
      assert length(state["sequence"]) == 8
      assert state["winner"] == nil
      assert state["standings"] == []
      assert state["progress"] == 0
    end
  end

  describe "generate_sequence/1" do
    test "identical seeds match" do
      assert LightMusic.generate_sequence(42) == LightMusic.generate_sequence(42)
      refute LightMusic.generate_sequence(42) == LightMusic.generate_sequence(7)
    end
  end

  describe "apply_input/3" do
    test "a miss resets; finishing is an unranked shared completion" do
      state = LightMusic.init_sim_state(slots: [0, 1], seed: 99)
      first = hd(state["sequence"])
      {state, _} = LightMusic.apply_input(state, 0, %{"kind" => "press", "pad" => first, "commitId" => 1})
      assert state["progress"] == 1

      wrong = rem(first + 1, 4)
      {state, event} = LightMusic.apply_input(state, 1, %{"kind" => "press", "pad" => wrong, "commitId" => 2})
      assert event["type"] == "sequence_reset"
      assert state["progress"] == 0

      {state, event} =
        Enum.reduce(Enum.with_index(state["sequence"], 3), {state, nil}, fn {pad, id}, {st, _} ->
          LightMusic.apply_input(st, rem(id, 2), %{"kind" => "press", "pad" => pad, "commitId" => id})
        end)

      assert event["type"] == "puzzle_complete"
      assert event["payload"]["ranked"] == false
      assert state["winner"] == nil
      assert state["standings"] == []
    end
  end

  describe "step_simulation/3" do
    test "consumes a pending press once" do
      state = LightMusic.init_sim_state(slots: [0], seed: 1)
      pad = hd(state["sequence"])
      players = %{0 => %{input_state: %{"kind" => "press", "pad" => pad, "commitId" => 9}}}
      {state, event} = LightMusic.step_simulation(state, players, 1)
      assert event["type"] == "pad_hit"
      {again, second} = LightMusic.step_simulation(state, players, 1)
      assert second == nil
      assert again["progress"] == 1
    end
  end
end

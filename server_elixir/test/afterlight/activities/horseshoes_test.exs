defmodule Afterlight.Activities.HorseshoesTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Horseshoes

  describe "init_sim_state/1" do
    test "initializes a frozen two-player match" do
      state =
        Horseshoes.init_sim_state(
          slots: [0, 1],
          environment: %{"policy" => "live", "now" => 50, "wind" => [0.0, 0.0]}
        )

      assert state["status"] == "throwing"
      assert state["nextSlot"] == 0
      assert state["environment"]["policy"] == "frozen"
      assert state["environment"]["frozenAt"] == 50
      assert map_size(state["players"]) == 2
    end
  end

  describe "validate_controls/1" do
    test "clamps throw inputs" do
      assert {:ok, sanitized} =
               Horseshoes.validate_controls(%{
                 "kind" => "throw",
                 "angle" => 4.0,
                 "power" => 9.0,
                 "lateral" => -4.0
               })

      assert sanitized["angle"] == 0.45
      assert sanitized["power"] == 1.0
      assert sanitized["lateral"] == -1.0
      assert {:error, :invalid_controls} = Horseshoes.validate_controls("nope")
      assert {:error, :unknown_kind} = Horseshoes.validate_controls(%{"kind" => "warp"})
    end
  end

  describe "overshoot and cancellation" do
    test "overshoot past the stake cannot ringer or score" do
      over = Horseshoes.simulate_throw(0, %{"angle" => 0.0, "power" => 1.0, "lateral" => 0.0})
      assert over["overshoot"]
      refute over["ringer"]

      scored =
        Horseshoes.score_round(
          [over],
          [%{"distance" => 0.4, "overshoot" => false, "ringer" => false, "close" => false}]
        )

      assert scored["points"] == [0, 0]
    end

    test "tied ringers cancel; leftover ringer scores 3" do
      ringer =
        Horseshoes.simulate_throw(0, %{
          "angle" => 0.0,
          "power" => Horseshoes.stake_power(),
          "lateral" => 0.0
        })

      assert ringer["ringer"]

      cancelled = Horseshoes.score_round([ringer, ringer], [ringer, ringer])
      assert cancelled["cancelledRingers"] == 2
      assert cancelled["points"] == [0, 0]

      one = Horseshoes.score_round([ringer], [%{"distance" => 0.12, "overshoot" => false, "ringer" => false}])
      assert one["points"] == [3, 0]
    end

    test "closest within one shoe-width scores 1; equal closest ties award none" do
      close = %{"distance" => 0.14, "overshoot" => false, "ringer" => false, "close" => true}
      far = %{"distance" => 0.4, "overshoot" => false, "ringer" => false, "close" => false}
      assert Horseshoes.score_round([close], [far])["points"] == [1, 0]

      tied = %{"distance" => 0.15, "overshoot" => false, "ringer" => false, "close" => true}
      result = Horseshoes.score_round([tied], [tied])
      assert result["closestTied"]
      assert result["points"] == [0, 0]
    end
  end

  describe "apply_input/3 and first-to-21" do
    test "reaches 21 and reports a winner; 21-21 plays an extra round" do
      state = Horseshoes.init_sim_state(slots: [0, 1], scores: [20, 18])
      ringer = %{"kind" => "throw", "angle" => 0.0, "power" => Horseshoes.stake_power(), "lateral" => 0.0}
      miss = %{"kind" => "throw", "angle" => 0.0, "power" => 1.0, "lateral" => 0.0}

      {state, _} = Horseshoes.apply_input(state, 0, ringer)
      {state, _} = Horseshoes.apply_input(state, 1, miss)
      {state, _} = Horseshoes.apply_input(state, 0, miss)
      {state, event} = Horseshoes.apply_input(state, 1, miss)

      assert state["status"] == "complete"
      assert state["winner"] == 0
      assert event["type"] == "match_ended"
      assert get_in(state, ["players", "0", "score"]) >= 21

      tied = Horseshoes.init_sim_state(slots: [0, 1], scores: [21, 21])
      {tied, _} = Horseshoes.apply_input(tied, 0, ringer)
      {tied, _} = Horseshoes.apply_input(tied, 1, ringer)
      {tied, _} = Horseshoes.apply_input(tied, 0, ringer)
      {tied, _} = Horseshoes.apply_input(tied, 1, ringer)

      assert tied["status"] == "throwing"
      assert tied["extraRound"]
      assert tied["winner"] == nil
      assert get_in(tied, ["players", "0", "score"]) == 21

      {tied, _} = Horseshoes.apply_input(tied, 0, ringer)
      {tied, _} = Horseshoes.apply_input(tied, 1, miss)
      {tied, _} = Horseshoes.apply_input(tied, 0, miss)
      {tied, _} = Horseshoes.apply_input(tied, 1, miss)

      assert tied["status"] == "complete"
      assert tied["winner"] == 0
    end
  end

  describe "step_simulation/3" do
    test "applies the current thrower and ends on first-to-21" do
      state = Horseshoes.init_sim_state(slots: [0, 1], scores: [20, 0])

      {state, outcome} =
        Horseshoes.step_simulation(state, %{
          0 => %{
            input_state: %{
              "kind" => "throw",
              "angle" => 0.0,
              "power" => Horseshoes.stake_power(),
              "lateral" => 0.0
            }
          }
        })

      assert outcome == nil
      assert state["nextSlot"] == 1

      {state, _} =
        Horseshoes.step_simulation(state, %{
          1 => %{input_state: %{"kind" => "throw", "angle" => 0.0, "power" => 1.0, "lateral" => 0.0}}
        })

      {state, _} =
        Horseshoes.step_simulation(state, %{
          0 => %{input_state: %{"kind" => "throw", "angle" => 0.0, "power" => 1.0, "lateral" => 0.0}}
        })

      {state, outcome} =
        Horseshoes.step_simulation(state, %{
          1 => %{input_state: %{"kind" => "throw", "angle" => 0.0, "power" => 1.0, "lateral" => 0.0}}
        })

      assert state["status"] == "complete"
      assert {:match_ended, 0, details} = outcome
      assert details["reason"] == "first_to_21"
    end
  end
end

defmodule Afterlight.Activities.FishingTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Fishing

  describe "init_sim_state/1" do
    test "opens a social session with idle lines and no economy fields" do
      state = Fishing.init_sim_state(slots: [0, 1], now_ms: 1_700_000_000_000)

      assert state["status"] == "open"
      assert state["environment"]["policy"] == "live"
      assert state["environmentAt"] == 1_700_000_000_000
      assert state["anglers"]["0"]["phase"] == "idle"
      assert state["anglers"]["1"]["phase"] == "idle"

      blob = inspect(state)
      refute blob =~ "gold"
      refute blob =~ "inventory"
      refute blob =~ "xp"
      refute blob =~ "crop"
    end
  end

  describe "validate_controls/1 and apply_input/3" do
    test "accepts cast/reel/release and rejects unknown kinds" do
      assert {:ok, %{"kind" => "cast", "power" => 1.0}} =
               Fishing.validate_controls(%{"kind" => "cast", "power" => 9})

      assert {:ok, %{"kind" => "reel"}} = Fishing.validate_controls(%{"kind" => "reel"})
      assert {:error, :unknown_kind} = Fishing.validate_controls(%{"kind" => "warp"})
      assert {:error, :invalid_controls} = Fishing.validate_controls("nope")
    end

    test "two visitors each see both lines after independent casts" do
      state = Fishing.init_sim_state(slots: [0, 1], seed: 7)
      {:ok, state} = Fishing.apply_input(state, 0, %{"kind" => "cast", "power" => 0.7})
      {:ok, state} = Fishing.apply_input(state, 1, %{"kind" => "cast", "power" => 0.55})
      {state, outcome} = Fishing.step_simulation(state, %{}, 24)

      assert outcome == nil
      assert state["anglers"]["0"]["phase"] == "waiting"
      assert state["anglers"]["1"]["phase"] == "waiting"
      assert is_list(state["anglers"]["0"]["line"])
      assert is_list(state["anglers"]["1"]["bobber"])
    end
  end

  describe "live environment" do
    test "rain raises bite chance versus dry defaults" do
      dry = Fishing.bite_chance(%{"rain" => 0.0, "timePhase" => 0.5})
      wet = Fishing.bite_chance(%{"rain" => 0.9, "timePhase" => 0.5})
      assert wet > dry
    end

    test "identical live weather + seed + ticks reproduce the same bite tick" do
      env = %{"rain" => 0.8, "timePhase" => 0.15, "wind" => [0.0, 0.0]}

      bite_tick = fn ->
        state = Fishing.init_sim_state(slots: [0], environment: env, seed: 99, now_ms: 5000)
        {:ok, state} = Fishing.apply_input(state, 0, %{"kind" => "cast", "power" => 0.6})

        Enum.reduce_while(1..4000, state, fn _, acc ->
          {next, _} = Fishing.step_simulation(acc, %{}, 1)

          if next["anglers"]["0"]["phase"] == "bite" do
            {:halt, next["tickCount"]}
          else
            {:cont, next}
          end
        end)
      end

      a = bite_tick.()
      b = bite_tick.()
      assert is_integer(a)
      assert a == b
    end

    test "reel and leave are independent; catch is not inventory" do
      env = %{"rain" => 1.0, "timePhase" => 0.15, "wind" => [0.0, 0.0]}
      state = Fishing.init_sim_state(slots: [0, 1], environment: env, seed: 3)
      {:ok, state} = Fishing.apply_input(state, 0, %{"kind" => "cast", "power" => 0.8})
      {:ok, state} = Fishing.apply_input(state, 1, %{"kind" => "cast", "power" => 0.8})

      state =
        Enum.reduce_while(1..5000, state, fn _, acc ->
          {next, _} = Fishing.step_simulation(acc, %{}, 1)

          if next["anglers"]["0"]["phase"] == "bite" do
            {:halt, next}
          else
            {:cont, next}
          end
        end)

      assert state["anglers"]["0"]["phase"] == "bite"
      other = state["anglers"]["1"]["phase"]
      assert other in ["waiting", "bite"]

      {:ok, state} = Fishing.apply_input(state, 0, %{"kind" => "reel"})
      hooked = state["anglers"]["0"]["lastCatch"]
      assert is_binary(hooked["species"])
      refute Map.has_key?(hooked, "gold")
      refute Map.has_key?(hooked, "inventory")
      assert state["anglers"]["1"]["phase"] == other

      {state, _} = Fishing.step_simulation(state, %{}, 90)
      assert state["anglers"]["0"]["phase"] == "catch"

      {:ok, state} = Fishing.apply_input(state, 0, %{"kind" => "release"})
      assert state["anglers"]["0"]["phase"] == "idle"
      assert hd(state["recentReleases"])["species"] == hooked["species"]
      assert state["anglers"]["1"]["phase"] == other

      {:ok, state} = Fishing.apply_input(state, 1, %{"kind" => "leave"})
      assert state["anglers"]["1"]["phase"] == "idle"
      assert state["anglers"]["1"]["bobber"] == nil
      assert state["anglers"]["0"]["phase"] == "idle"
    end
  end
end

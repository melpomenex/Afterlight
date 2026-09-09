defmodule Afterlight.Activities.ForgeChallengeTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.ForgeChallenge

  describe "init_sim_state/1" do
    test "initializes a shared target and thick stock" do
      state = ForgeChallenge.init_sim_state(slots: [0], seed: 1)

      assert state["status"] == "forging"
      assert state["maxStrikes"] == 8
      assert length(state["target"]) == 16
      assert state["profile"] == List.duplicate(1.0, 16)
      assert state["target"] == ForgeChallenge.target_profile(1)
    end
  end

  describe "target_profile/1" do
    test "same seed always yields the same bins" do
      assert ForgeChallenge.target_profile(1) == ForgeChallenge.target_profile(1)
      refute ForgeChallenge.target_profile(1) == ForgeChallenge.target_profile(2)
    end
  end

  describe "deform_profile/3" do
    test "a centered hard strike lowers the middle more than the ends" do
      after_hit = ForgeChallenge.deform_profile(ForgeChallenge.initial_profile(), 0.5, 1.0)
      assert Enum.at(after_hit, 8) < Enum.at(after_hit, 0)
      assert Enum.at(after_hit, 8) < Enum.at(after_hit, 15)
    end
  end

  describe "apply_input/3" do
    test "identical strike sequences produce identical profiles and scores" do
      strikes = [
        %{"position" => 0.2, "force" => 0.8},
        %{"position" => 0.55, "force" => 0.6},
        %{"position" => 0.8, "force" => 0.4}
      ]

      {a, _} =
        Enum.reduce(Enum.with_index(strikes, 1), {ForgeChallenge.init_sim_state(seed: 1), nil}, fn {s, id}, {st, _} ->
          ForgeChallenge.apply_input(st, 0, Map.merge(s, %{"kind" => "strike", "commitId" => id}))
        end)

      {b, _} =
        Enum.reduce(Enum.with_index(strikes, 1), {ForgeChallenge.init_sim_state(seed: 1), nil}, fn {s, id}, {st, _} ->
          ForgeChallenge.apply_input(st, 0, Map.merge(s, %{"kind" => "strike", "commitId" => id}))
        end)

      assert a["profile"] == b["profile"]
      assert a["error"] == b["error"]
      assert a["score"] == b["score"]
    end

    test "different sequences yield different profiles" do
      {left, _} =
        ForgeChallenge.apply_input(ForgeChallenge.init_sim_state(seed: 1), 0, %{
          "kind" => "strike",
          "position" => 0.15,
          "force" => 0.9,
          "commitId" => 1
        })

      {right, _} =
        ForgeChallenge.apply_input(ForgeChallenge.init_sim_state(seed: 1), 0, %{
          "kind" => "strike",
          "position" => 0.85,
          "force" => 0.9,
          "commitId" => 1
        })

      refute left["profile"] == right["profile"]
      assert Enum.at(left["profile"], 2) < Enum.at(right["profile"], 2)
      assert Enum.at(right["profile"], 13) < Enum.at(left["profile"], 13)
    end

    test "eight strikes complete and ignore further inputs" do
      {state, _} =
        Enum.reduce(1..8, {ForgeChallenge.init_sim_state(), nil}, fn i, {st, _} ->
          ForgeChallenge.apply_input(st, 0, %{
            "kind" => "strike",
            "position" => 0.1 + i * 0.1,
            "force" => 0.5,
            "commitId" => i
          })
        end)

      assert state["status"] == "complete"
      assert state["remaining"] == 0
      assert state["winner"] == 0

      {again, event} =
        ForgeChallenge.apply_input(state, 0, %{
          "kind" => "strike",
          "position" => 0.5,
          "force" => 1.0,
          "commitId" => 99
        })

      assert event == nil
      assert again["profile"] == state["profile"]
    end
  end

  describe "validate_controls/1" do
    test "clamps and rejects junk" do
      assert {:error, :invalid_controls} = ForgeChallenge.validate_controls(nil)
      assert {:error, :unknown_kind} = ForgeChallenge.validate_controls(%{"kind" => "smelt"})

      assert {:ok, sanitized} =
               ForgeChallenge.validate_controls(%{"kind" => "strike", "position" => 4, "force" => -1, "commitId" => 2})

      assert sanitized["position"] == 1.0
      assert sanitized["force"] == 0.0
    end
  end

  describe "step_simulation/3" do
    test "cools heat and consumes a pending strike once" do
      started = ForgeChallenge.init_sim_state()
      {cooled, _} = ForgeChallenge.step_simulation(started, %{}, 60)

      assert Enum.zip(cooled["heat"], started["heat"])
             |> Enum.all?(fn {after_h, before_h} -> after_h <= before_h end)

      players = %{
        0 => %{input_state: %{"kind" => "strike", "position" => 0.4, "force" => 0.7, "commitId" => 3}}
      }

      {state, event} = ForgeChallenge.step_simulation(cooled, players, 1)
      assert event == nil
      assert length(state["strikes"]) == 1

      {again, second} = ForgeChallenge.step_simulation(state, players, 1)
      assert second == nil
      assert length(again["strikes"]) == 1
    end

    test "completing the eighth strike emits match_ended for the session tick" do
      {state, _} =
        Enum.reduce(1..7, {ForgeChallenge.init_sim_state(), nil}, fn i, {st, _} ->
          ForgeChallenge.apply_input(st, 0, %{
            "kind" => "strike",
            "position" => 0.2,
            "force" => 0.5,
            "commitId" => i
          })
        end)

      players = %{
        0 => %{input_state: %{"kind" => "strike", "position" => 0.5, "force" => 0.6, "commitId" => 8}}
      }

      {state, event} = ForgeChallenge.step_simulation(state, players, 1)
      assert {:match_ended, 0, details} = event
      assert details["reason"] == "strikes_complete"
      assert is_list(details["profile"])
      assert state["status"] == "complete"
    end
  end
end

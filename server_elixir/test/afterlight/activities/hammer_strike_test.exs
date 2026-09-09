defmodule Afterlight.Activities.HammerStrikeTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.HammerStrike

  describe "init_sim_state/1" do
    test "initializes a solo swinging hammer with five strikes" do
      state = HammerStrike.init_sim_state(slots: [0])

      assert state["status"] == "swinging"
      assert state["maxStrikes"] == 5
      assert state["remaining"] == 5
      assert state["strikes"] == []
      assert state["targetPhase"] == 0.5
      assert state["activeSlots"] == [0]
    end
  end

  describe "score_timing_sample/1" do
    test "identical samples produce identical score and bell" do
      assert {:ok, a} = HammerStrike.score_timing_sample(%{"phase" => 0.5})
      assert {:ok, b} = HammerStrike.score_timing_sample(%{"phase" => 0.5})
      assert a == b
      assert a["perfect"] == true
      assert a["score"] > 0.9
      assert a["bellHz"] > a["bellAmp"]
    end

    test "late samples ring lower and quieter than the target" do
      assert {:ok, perfect} = HammerStrike.score_timing_sample(%{"phase" => 0.5})
      assert {:ok, late} = HammerStrike.score_timing_sample(%{"phase" => 0.8})
      assert perfect["score"] > late["score"]
      assert perfect["bellHz"] > late["bellHz"]
      assert perfect["bellAmp"] > late["bellAmp"]
    end

    test "millisecond error is accepted and deterministic" do
      assert {:ok, a} = HammerStrike.score_timing_sample(%{"errorMs" => 40})
      assert {:ok, b} = HammerStrike.score_timing_sample(%{"errorMs" => 40})
      assert a == b
      assert {:ok, worse} = HammerStrike.score_timing_sample(%{"errorMs" => 400})
      assert a["score"] > worse["score"]
    end

    test "phase wins when both phase and errorMs are sent" do
      assert {:ok, mixed} = HammerStrike.score_timing_sample(%{"phase" => 0.5, "errorMs" => 800})
      assert {:ok, phase_only} = HammerStrike.score_timing_sample(%{"phase" => 0.5})
      assert mixed["score"] == phase_only["score"]
      assert mixed["bellHz"] == phase_only["bellHz"]
    end
  end

  describe "validate_controls/1" do
    test "rejects junk and unknown kinds" do
      assert {:error, :invalid_controls} = HammerStrike.validate_controls("nope")
      assert {:error, :unknown_kind} = HammerStrike.validate_controls(%{"kind" => "teleport"})
      assert {:ok, %{"kind" => "ready"}} = HammerStrike.validate_controls(%{"kind" => "ready"})
    end
  end

  describe "apply_input/3" do
    test "records a strike and ignores a duplicate commitId" do
      state = HammerStrike.init_sim_state()
      {state, event} = HammerStrike.apply_input(state, 0, %{"kind" => "strike", "phase" => 0.5, "commitId" => 1})

      assert event["type"] == "hammer_struck"
      assert length(state["strikes"]) == 1
      assert state["remaining"] == 4

      {again, dup} = HammerStrike.apply_input(state, 0, %{"kind" => "strike", "phase" => 0.1, "commitId" => 1})
      assert dup == nil
      assert length(again["strikes"]) == 1
    end

    test "five identical sequences complete with the same totals" do
      sequence = [0.5, 0.48, 0.62, 0.2, 0.51]

      {a, _} =
        Enum.reduce(Enum.with_index(sequence, 1), {HammerStrike.init_sim_state(), nil}, fn {phase, id}, {st, _} ->
          HammerStrike.apply_input(st, 0, %{"kind" => "strike", "phase" => phase, "commitId" => id})
        end)

      {b, _} =
        Enum.reduce(Enum.with_index(sequence, 1), {HammerStrike.init_sim_state(), nil}, fn {phase, id}, {st, _} ->
          HammerStrike.apply_input(st, 0, %{"kind" => "strike", "phase" => phase, "commitId" => id})
        end)

      assert a["status"] == "complete"
      assert b["status"] == "complete"
      assert Enum.map(a["strikes"], & &1["score"]) == Enum.map(b["strikes"], & &1["score"])
      assert a["totalScore"] == b["totalScore"]
      assert a["winner"] == 0
    end
  end

  describe "step_simulation/3" do
    test "advances phase and consumes a pending player strike once" do
      {state, _} = HammerStrike.step_simulation(HammerStrike.init_sim_state(), %{}, 30)
      assert state["phase"] > 0.0
      assert state["strikes"] == []

      players = %{0 => %{input_state: %{"kind" => "strike", "phase" => 0.5, "commitId" => 7}}}
      {state, event} = HammerStrike.step_simulation(state, players, 1)
      assert event == nil
      assert length(state["strikes"]) == 1

      {again, second} = HammerStrike.step_simulation(state, players, 1)
      assert second == nil
      assert length(again["strikes"]) == 1
    end

    test "completing the fifth strike emits match_ended for the session tick" do
      {state, _} =
        Enum.reduce(1..4, {HammerStrike.init_sim_state(), nil}, fn i, {st, _} ->
          HammerStrike.apply_input(st, 0, %{"kind" => "strike", "phase" => 0.5, "commitId" => i})
        end)

      players = %{0 => %{input_state: %{"kind" => "strike", "phase" => 0.51, "commitId" => 5}}}
      {state, event} = HammerStrike.step_simulation(state, players, 1)

      assert {:match_ended, 0, details} = event
      assert details["reason"] == "strikes_complete"
      assert state["status"] == "complete"
      assert state["resultEmitted"] == true
    end
  end
end

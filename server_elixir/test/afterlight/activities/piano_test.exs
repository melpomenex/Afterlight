defmodule Afterlight.Activities.PianoTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Piano

  describe "apply_input/3" do
    test "rate limit, polyphony, 2s expiry, all-off and mute" do
      state = Piano.init_sim_state(slots: [0])

      {state, limited} =
        Enum.reduce(0..23, {state, 0}, fn i, {st, n} ->
          {st, ev} = Piano.apply_input(st, 0, %{"kind" => "note_on", "midi" => 48 + rem(i, 25), "commitId" => i + 1})
          {st, if(ev["type"] == "rate_limited", do: n + 1, else: n)}
        end)

      assert limited >= 4
      assert length(state["noteOnTimes"]) <= 20

      state = Piano.init_sim_state()

      {state, _} =
        Enum.reduce(0..9, {state, nil}, fn i, {st, _} ->
          Piano.apply_input(st, 0, %{"kind" => "note_on", "midi" => 48 + i, "commitId" => 100 + i})
        end)

      assert length(state["activeNotes"]) == 8

      {state, _} = Piano.apply_input(Piano.init_sim_state(), 0, %{"kind" => "note_on", "midi" => 60, "commitId" => 1})
      {state, _} = Piano.step_simulation(state, %{}, 60)
      {state, _} = Piano.apply_input(state, 0, %{"kind" => "sustain", "midi" => 60, "commitId" => 2})
      assert hd(state["activeNotes"])["expiresAt"] == state["nowMs"] + 2000
      {state, _} = Piano.step_simulation(state, %{}, 130)
      assert state["activeNotes"] == []

      {state, _} = Piano.apply_input(Piano.init_sim_state(), 0, %{"kind" => "note_on", "midi" => 60, "commitId" => 1})
      {state, _} = Piano.apply_input(state, 0, %{"kind" => "note_on", "midi" => 64, "commitId" => 2})
      {state, event} = Piano.apply_input(state, 0, %{"kind" => "all_off", "commitId" => 3})
      assert event["type"] == "all_off"
      assert state["activeNotes"] == []

      {state, _} = Piano.apply_input(Piano.init_sim_state(), 0, %{"kind" => "note_on", "midi" => 67, "commitId" => 1})
      {state, event} = Piano.apply_input(state, 0, %{"kind" => "mute", "muted" => true, "commitId" => 2})
      assert state["muted"] == true
      assert state["activeNotes"] == []
      assert event["payload"]["reason"] == "mute"
    end
  end
end

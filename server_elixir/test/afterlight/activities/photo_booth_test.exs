defmodule Afterlight.Activities.PhotoBoothTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.PhotoBooth

  describe "apply_input/3" do
    test "decline excludes that person; start waits on pending or proceeds without them" do
      state = PhotoBooth.init_sim_state(slots: [0, 1, 2])
      {state, _} = PhotoBooth.apply_input(state, 0, %{"kind" => "invite", "slots" => [0, 1, 2], "commitId" => 1})
      {state, _} = PhotoBooth.apply_input(state, 0, %{"kind" => "accept", "commitId" => 2})
      {state, _} = PhotoBooth.apply_input(state, 1, %{"kind" => "accept", "commitId" => 3})
      {state, event} = PhotoBooth.apply_input(state, 2, %{"kind" => "decline", "commitId" => 4})
      assert event["payload"]["excluded"] == true
      assert state["acceptedSlots"] == [0, 1]
      assert state["declinedSlots"] == [2]

      {_state, event} = PhotoBooth.apply_input(state, 0, %{"kind" => "start", "commitId" => 5})
      assert event["type"] == "countdown"
      assert event["payload"]["subjects"]["slots"] == [0, 1]
      assert event["payload"]["subjects"]["includeTheaterMedia"] == false
      assert event["payload"]["subjects"]["includeChat"] == false
      assert event["payload"]["subjects"]["includeBystanders"] == false

      waiting = PhotoBooth.init_sim_state(slots: [0, 1, 2])
      {waiting, _} = PhotoBooth.apply_input(waiting, 0, %{"kind" => "invite", "slots" => [0, 1, 2], "commitId" => 1})
      {waiting, _} = PhotoBooth.apply_input(waiting, 0, %{"kind" => "accept", "commitId" => 2})
      {waiting, _} = PhotoBooth.apply_input(waiting, 1, %{"kind" => "accept", "commitId" => 3})
      {_waiting, held} = PhotoBooth.apply_input(waiting, 0, %{"kind" => "start", "commitId" => 4})
      assert held["type"] == "capture_wait"
      assert held["payload"]["reason"] == "pending"
    end

    test "departure during countdown excludes that person" do
      state = PhotoBooth.init_sim_state(slots: [0, 1, 2])
      {state, _} = PhotoBooth.apply_input(state, 0, %{"kind" => "invite", "slots" => [0, 1, 2], "commitId" => 1})
      {state, _} = PhotoBooth.apply_input(state, 0, %{"kind" => "accept", "commitId" => 2})
      {state, _} = PhotoBooth.apply_input(state, 1, %{"kind" => "accept", "commitId" => 3})
      {state, _} = PhotoBooth.apply_input(state, 2, %{"kind" => "accept", "commitId" => 4})
      {state, _} = PhotoBooth.apply_input(state, 0, %{"kind" => "start", "commitId" => 5})
      {state, _} = PhotoBooth.apply_input(state, 2, %{"kind" => "depart", "commitId" => 6})
      assert state["roster"]["2"] == "departed"
      refute 2 in state["acceptedSlots"]
      assert PhotoBooth.capture_subjects(state)["slots"] == [0, 1]
    end
  end

  describe "step_simulation/3" do
    test "four poses then a local-only strip with no image bytes" do
      state = PhotoBooth.init_sim_state(slots: [0, 1])
      {state, _} = PhotoBooth.apply_input(state, 0, %{"kind" => "accept", "commitId" => 1})
      {state, _} = PhotoBooth.apply_input(state, 1, %{"kind" => "accept", "commitId" => 2})
      {state, _} = PhotoBooth.apply_input(state, 0, %{"kind" => "start", "commitId" => 3})

      {state, _} = PhotoBooth.step_simulation(state, %{}, 180)
      assert state["status"] == "posing"

      {state, event} =
        Enum.reduce(1..4, {state, nil}, fn _, {st, _} ->
          PhotoBooth.step_simulation(st, %{}, 80)
        end)

      assert state["status"] == "ready"
      assert state["stripReady"] == true
      assert state["imageBytes"] == nil
      assert state["uploadRequested"] == false
      assert event["type"] == "strip_ready"
      assert event["payload"]["upload"] == false
      assert event["payload"]["download"]["localOnly"] == true
    end
  end
end

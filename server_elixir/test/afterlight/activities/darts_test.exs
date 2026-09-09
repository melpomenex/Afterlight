defmodule Afterlight.Activities.DartsTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Darts

  defp throw_at(state, slot, segment, ring, id) do
    %{u: u, v: v} = Darts.board_point_for(segment, ring)
    Darts.apply_input(state, slot, %{"kind" => "throw", "u" => u, "v" => v, "commitId" => id})
  end

  defp pass(state, slot, id) do
    Enum.reduce(0..2, {state, id}, fn _, {st, n} ->
      {st, _} = throw_at(st, slot, 20, "miss", n)
      {st, n + 1}
    end)
  end

  describe "score_throw/2" do
    test "bulls triples doubles and misses" do
      assert Darts.score_throw(0, 0).points == 50
      assert Darts.score_throw(0, 0).double == true
      %{u: u, v: v} = Darts.board_point_for(20, "triple")
      assert Darts.score_throw(u, v).points == 60
      %{u: u, v: v} = Darts.board_point_for(20, "double")
      assert Darts.score_throw(u, v).double == true
      assert Darts.score_throw(0, 1.2).ring == "miss"
    end
  end

  describe "apply_input/3" do
    test "bust on leave-1 restores start-of-turn score and passes" do
      state = Darts.init_sim_state(slots: [0, 1])
      {state, _} = throw_at(state, 0, 20, "triple", 1)
      {state, _} = throw_at(state, 0, 20, "triple", 2)
      {state, _} = throw_at(state, 0, 20, "triple", 3)
      assert state["players"]["0"]["score"] == 121
      {state, id} = pass(state, 1, 4)
      {state, _} = throw_at(state, 0, 20, "triple", id)
      {state, event} = throw_at(state, 0, 20, "triple", id + 1)
      assert event["type"] == "bust"
      assert state["players"]["0"]["score"] == 121
      assert state["turnSlot"] == 1
    end

    test "overshooting zero busts" do
      state = Darts.init_sim_state(slots: [0, 1])
      {state, _} = throw_at(state, 0, 20, "triple", 1)
      {state, _} = throw_at(state, 0, 20, "triple", 2)
      {state, _} = throw_at(state, 0, 20, "triple", 3)
      {state, id} = pass(state, 1, 4)
      {state, _} = throw_at(state, 0, 20, "triple", id)
      {state, _} = throw_at(state, 0, 20, "single-outer", id + 1)
      {state, _} = throw_at(state, 0, 1, "single-outer", id + 2)
      assert state["players"]["0"]["score"] == 40
      {state, id} = pass(state, 1, id + 3)
      {state, event} = throw_at(state, 0, 20, "triple", id)
      assert event["type"] == "bust"
      assert state["players"]["0"]["score"] == 40
    end

    test "a complete 301 double-out match" do
      state = Darts.init_sim_state(slots: [0, 1])
      {state, _} = throw_at(state, 0, 20, "triple", 1)
      {state, _} = throw_at(state, 0, 20, "triple", 2)
      {state, _} = throw_at(state, 0, 20, "triple", 3)
      {state, id} = pass(state, 1, 4)
      {state, _} = throw_at(state, 0, 20, "triple", id)
      {state, _} = throw_at(state, 0, 11, "single-outer", id + 1)
      {state, event} = throw_at(state, 0, 50, "inner-bull", id + 2)
      assert state["status"] == "complete"
      assert state["winner"] == 0
      assert event["type"] == "match_ended"
    end
  end
end

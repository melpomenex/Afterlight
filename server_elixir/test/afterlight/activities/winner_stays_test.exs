defmodule Afterlight.Activities.WinnerStaysTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.WinnerStays

  test "ties and aborts invent no winner" do
    assert WinnerStays.winner_id(%{"reason" => "aborted", "winner" => "ghost"}) == nil
    assert WinnerStays.winner_id(%{"reason" => "tie", "winner" => "ghost"}) == nil
    assert WinnerStays.winner_id(%{"reason" => "score", "winner" => "p1"}) == "p1"
  end

  test "winner departure offers both slots in queue order" do
    plan =
      WinnerStays.plan(
        %{"winner" => "champ", "reason" => "score"},
        [{0, %{player_id: "champ"}}, {1, %{player_id: "foe"}}],
        winner_stays?: true,
        winner_present?: false,
        winner_willing?: false,
        queue_length: 2
      )

    assert plan.invent_winner? == false
    assert plan.keep_slots == []
    assert plan.offer_both? == true
  end

  test "no challenger returns the table to waiting" do
    plan =
      WinnerStays.plan(
        %{"winner" => "champ", "reason" => "score"},
        [{0, %{player_id: "champ"}}, {1, %{player_id: "foe"}}],
        winner_stays?: true,
        winner_present?: true,
        winner_willing?: true,
        queue_length: 0
      )

    assert plan.keep_slots == [0]
    assert plan.vacate_slots == [1]
    assert plan.waiting? == true
  end

  test "public summary keeps categories separate" do
    summary =
      WinnerStays.public_summary(%{
        activity_id: "pool-1",
        activity_def: %{"type" => "pool"},
        status: :in_progress,
        players: %{0 => %{}, 1 => %{}},
        spectators: %{"a" => %{}, "b" => %{}, "c" => %{}},
        queue: [%{}, %{}]
      })

    assert summary["playing"] == 2
    assert summary["watching"] == 3
    assert summary["queued"] == 2
    refute summary["playing"] + summary["watching"] + summary["queued"] == summary["occupancy"]
    refute Map.has_key?(summary, "occupancy")
  end

  test "queue positions are 1-based FIFO" do
    rows = WinnerStays.queue_with_positions([%{player_id: "q1"}, %{player_id: "q2"}])
    assert rows == [%{"playerId" => "q1", "position" => 1}, %{"playerId" => "q2", "position" => 2}]
    assert WinnerStays.next_player(%{0 => %{player_id: "offered"}}, []) == "offered"
  end
end

defmodule Afterlight.Activities.LeaderboardTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Activities
  alias Afterlight.Repo

  defp seed_run(overrides) do
    now = 1_700_000_000_000

    defaults = %{
      completion_key: "seed_#{System.unique_integer([:positive])}",
      game: "sporefall",
      rules_version: 1,
      player_id: "guest_seed",
      session_id: "sess_lb",
      match_id: "match_lb",
      score: 100,
      outcome: "top_out",
      stats: %{},
      ended_at: now,
      recorded_at: now
    }

    row = Map.merge(defaults, overrides)
    Repo.insert_all("activity_arcade_runs", [row])
    row
  end

  defp clear_runs do
    Repo.delete_all("activity_arcade_runs")
  end

  setup do
    clear_runs()
    on_exit(&clear_runs/0)
    :ok
  end

  test "ranks by score desc with stable ties by completion time" do
    seed_run(%{player_id: "a", score: 300, ended_at: 1_700_000_002_000})
    seed_run(%{player_id: "b", score: 500, ended_at: 1_700_000_003_000})
    seed_run(%{player_id: "c", score: 300, ended_at: 1_700_000_001_000})

    {:ok, board} = Activities.leaderboard("sporefall", 1, 0)

    assert Enum.map(board["entries"], & &1["playerId"]) == ["b", "c", "a"]
    assert Enum.map(board["entries"], & &1["rank"]) == [1, 2, 3]
    assert board["total"] == 3
  end

  test "aborted and forfeited runs never rank" do
    seed_run(%{player_id: "ranked", score: 200})
    seed_run(%{player_id: "gave_up", score: 9_999_999, outcome: "aborted"})
    seed_run(%{player_id: "walkover", score: 9_999_998, outcome: "forfeit"})

    {:ok, board} = Activities.leaderboard("sporefall", 1, 0)

    assert board["total"] == 1
    assert Enum.map(board["entries"], & &1["playerId"]) == ["ranked"]
  end

  test "rules versions are separated and reported" do
    seed_run(%{rules_version: 1, score: 10})
    seed_run(%{rules_version: 2, score: 20})

    {:ok, v1} = Activities.leaderboard("sporefall", 1, 0)
    {:ok, v2} = Activities.leaderboard("sporefall", 2, 0)

    assert v1["total"] == 1
    assert v2["total"] == 1
    assert Enum.sort(v1["versions"]) == [1, 2]
    assert hd(v1["entries"])["score"] == 10
    assert hd(v2["entries"])["score"] == 20
  end

  test "pagination is bounded and stable" do
    for i <- 1..25, do: seed_run(%{player_id: "p#{i}", score: 1000 - i, ended_at: i * 1000})

    {:ok, page0} = Activities.leaderboard("sporefall", 1, 0)
    {:ok, page1} = Activities.leaderboard("sporefall", 1, 1)
    {:ok, clamped} = Activities.leaderboard("sporefall", 1, 99)

    assert length(page0["entries"]) == 10
    assert length(page1["entries"]) == 10
    assert page0["total"] == 25
    assert hd(page1["entries"])["playerId"] == "p11"
    assert length(clamped["entries"]) == 5, "pages clamp to the last page"
  end

  test "games with no rows return an honest empty board" do
    {:ok, board} = Activities.leaderboard("sporefall", 7, 0)
    assert board["total"] == 0
    assert board["entries"] == []
    assert board["versions"] == []
  end
end

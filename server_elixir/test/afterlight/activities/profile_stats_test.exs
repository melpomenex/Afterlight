defmodule Afterlight.Activities.ProfileStatsTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Activities
  alias Afterlight.Repo

  defp seed_match(overrides) do
    now = 1_700_000_000_000

    defaults = %{
      completion_key: "m_#{System.unique_integer([:positive])}",
      game: "pool",
      rules_version: 1,
      session_id: "sess_p",
      match_id: "match_p_#{System.unique_integer([:positive])}",
      outcome: "completed",
      winner_id: "guest_alpha",
      participants: %{"0" => "guest_alpha", "1" => "guest_beta"},
      ended_at: now,
      recorded_at: now
    }

    row = Map.merge(defaults, overrides)
    Repo.insert_all("activity_matches", [row])
    row
  end

  defp seed_player(id, nickname) do
    Repo.insert_all("players", [
      %{
        id: id,
        nickname: nickname,
        current_room: "theater",
        last_seen: 0,
        active: false,
        shadow: false
      }
    ])
  end

  setup do
    Repo.delete_all("activity_matches")
    Repo.delete_all("activity_arcade_runs")
    :ok
  end

  test "profile games and wins ignore walkovers and follow identity across rename" do
    seed_player("guest_alpha", "OldFace")
    seed_match(%{outcome: "completed", winner_id: "guest_alpha", ended_at: 1})
    seed_match(%{outcome: "walkover", winner_id: "guest_alpha", ended_at: 2})
    seed_match(%{outcome: "forfeit", winner_id: "guest_alpha", ended_at: 3})
    seed_match(%{
      outcome: "eight_ball",
      winner_id: "guest_beta",
      participants: %{"0" => "guest_alpha", "1" => "guest_beta"},
      ended_at: 4
    })
    seed_match(%{outcome: "completed", winner_id: "guest_alpha", ended_at: 5})

    {:ok, profile} = Activities.profile("guest_alpha")
    pool = Enum.find(profile["games"], &(&1["game"] == "pool"))
    assert pool["gamesPlayed"] == 3
    assert pool["wins"] == 2
    assert profile["displayName"] == "OldFace"
    assert profile["identity"] == "guest"
    assert profile["continuityNote"] =~ "not recovered on another device"

    Repo.update_all("players", set: [nickname: "NewFace"])
    {:ok, renamed} = Activities.profile("guest_alpha")
    assert renamed["playerId"] == "guest_alpha"
    assert renamed["displayName"] == "NewFace"
    renamed_pool = Enum.find(renamed["games"], &(&1["game"] == "pool"))
    assert renamed_pool["gamesPlayed"] == 3
    assert renamed_pool["wins"] == 2
  end

  test "pool leaderboard ranks by wins with stable player-id ties and version split" do
    seed_match(%{winner_id: "a", participants: %{"0" => "a", "1" => "b"}, ended_at: 1})
    seed_match(%{winner_id: "a", participants: %{"0" => "a", "1" => "c"}, ended_at: 2})
    seed_match(%{winner_id: "b", participants: %{"0" => "a", "1" => "b"}, ended_at: 3})
    seed_match(%{rules_version: 2, winner_id: "z", participants: %{"0" => "z", "1" => "y"}, ended_at: 4})
    seed_match(%{outcome: "walkover", winner_id: "a", participants: %{"0" => "a", "1" => "x"}, ended_at: 5})

    {:ok, board} = Activities.leaderboard("pool", 1, 0)
    assert board["kind"] == "wins"
    assert Enum.map(board["entries"], & &1["playerId"]) == ["a", "b", "c"]
    assert hd(board["entries"])["wins"] == 2
    assert board["total"] == 3
    assert 1 in board["versions"] and 2 in board["versions"]

    {:ok, v2} = Activities.leaderboard("pool", 2, 0)
    assert v2["total"] == 2
    assert hd(v2["entries"])["playerId"] == "z"
  end

  test "leaderboard page size never exceeds 100" do
    {:ok, board} = Activities.leaderboard("pool", 1, 0, page_size: 500)
    assert board["pageSize"] == 100
  end
end

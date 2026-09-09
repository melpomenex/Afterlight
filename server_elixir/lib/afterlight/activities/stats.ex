defmodule Afterlight.Activities.Stats do
  @moduledoc """
  Rebuildable profile stats and match-game leaderboards (task 10.3, design D8).

  Rankings and profile rows are keyed by signed `player_id`, never by
  display name. Walkovers, forfeits and aborts never count as played games
  or wins. No XP or currency is derived here.
  """

  import Ecto.Query

  alias Afterlight.Activities.{ActivityMatch, ArcadeRun}
  alias Afterlight.Repo

  @played_outcomes ~w(completed played eight_ball early_eight wrong_pocket_eight scratch_on_eight resignation score)
  @non_ranking_run_outcomes ~w(aborted forfeit)
  @match_games ~w(pool pong billiards)
  @arcade_games ~w(rain-runner signal-lost sporefall)
  @max_page_size 100
  @default_page_size 10
  @max_page 100
  @guest_note "Guest records stay with this identity on this browser. They are not recovered on another device."

  def match_games, do: @match_games
  def arcade_games, do: @arcade_games
  def max_page_size, do: @max_page_size

  def profile(player_id) when is_binary(player_id) do
    {:ok,
     %{
       "playerId" => player_id,
       "displayName" => display_name(player_id),
       "identity" => "guest",
       "identityLabel" => "Guest (this browser)",
       "continuityNote" => @guest_note,
       "recording" => "verified",
       "games" => arcade_rows(player_id) ++ match_rows(player_id)
     }}
  end

  def profile(_), do: {:error, :invalid_player}

  def match_leaderboard(game, rules_version, page, opts \\ [])
      when is_binary(game) and is_integer(rules_version) and rules_version >= 1 do
    page_size =
      opts
      |> Keyword.get(:page_size, @default_page_size)
      |> clamp_page_size()

    rows =
      Repo.all(
        from(m in ActivityMatch,
          where: m.game == ^game and m.rules_version == ^rules_version,
          where: m.outcome in @played_outcomes
        )
      )

    versions =
      Repo.all(
        from(m in ActivityMatch,
          distinct: true,
          select: m.rules_version,
          where: m.game == ^game,
          order_by: m.rules_version
        )
      )

    tallies =
      rows
      |> Enum.reduce(%{}, fn row, acc ->
        Enum.reduce(participant_ids(row.participants), acc, fn pid, acc ->
          stats = Map.get(acc, pid, %{wins: 0, games: 0, ended_at: row.ended_at, player_id: pid})
          won = row.winner_id == pid

          Map.put(acc, pid, %{
            stats
            | wins: stats.wins + if(won, do: 1, else: 0),
              games: stats.games + 1,
              ended_at: min(stats.ended_at || row.ended_at, row.ended_at)
          })
        end)
      end)
      |> Map.values()
      |> Enum.sort_by(fn t -> {-t.wins, -t.games, t.player_id} end)

    total = length(tallies)
    page = page |> clamp_page() |> min(max(div(total + page_size - 1, page_size) - 1, 0))

    entries =
      tallies
      |> Enum.drop(page * page_size)
      |> Enum.take(page_size)
      |> Enum.with_index(1 + page * page_size)
      |> Enum.map(fn {t, rank} ->
        %{
          "rank" => rank,
          "playerId" => t.player_id,
          "displayName" => display_name(t.player_id),
          "wins" => t.wins,
          "gamesPlayed" => t.games,
          "score" => t.wins,
          "endedAt" => t.ended_at
        }
      end)

    {:ok,
     %{
       "game" => game,
       "kind" => "wins",
       "rulesVersion" => rules_version,
       "page" => page,
       "pageSize" => page_size,
       "total" => total,
       "versions" => versions,
       "entries" => entries
     }}
  end

  def clamp_page_size(size) when is_integer(size) and size >= 1, do: min(size, @max_page_size)
  def clamp_page_size(_), do: @default_page_size

  def clamp_page(page) when is_integer(page) and page >= 0, do: min(page, @max_page)
  def clamp_page(_), do: 0

  defp arcade_rows(player_id) do
    Repo.all(
      from(r in ArcadeRun,
        where: r.player_id == ^player_id,
        where: r.outcome not in @non_ranking_run_outcomes
      )
    )
    |> Enum.group_by(&{&1.game, &1.rules_version})
    |> Enum.map(fn {{game, version}, runs} ->
      best = Enum.max_by(runs, & &1.score)

      %{
        "game" => game,
        "rulesVersion" => version,
        "gamesPlayed" => length(runs),
        "wins" => 0,
        "currentStreak" => 0,
        "bestStreak" => 0,
        "bestScore" => best.score
      }
    end)
    |> Enum.sort_by(&{&1["game"], &1["rulesVersion"]})
  end

  defp match_rows(player_id) do
    Repo.all(from(m in ActivityMatch, order_by: [asc: m.ended_at, asc: m.completion_key]))
    |> Enum.filter(fn m -> player_id in participant_ids(m.participants) end)
    |> Enum.group_by(&{&1.game, &1.rules_version})
    |> Enum.map(fn {{game, version}, matches} ->
      played = Enum.filter(matches, &(&1.outcome in @played_outcomes))
      {wins, current, best, _streak} = reduce_streak(played, player_id)

      %{
        "game" => game,
        "rulesVersion" => version,
        "gamesPlayed" => length(played),
        "wins" => wins,
        "currentStreak" => current,
        "bestStreak" => best,
        "bestScore" => nil
      }
    end)
    |> Enum.sort_by(&{&1["game"], &1["rulesVersion"]})
  end

  defp reduce_streak(played, player_id) do
    Enum.reduce(played, {0, 0, 0, 0}, fn row, {wins, _current, best, streak} ->
      if row.winner_id == player_id do
        streak = streak + 1
        {wins + 1, streak, max(best, streak), streak}
      else
        {wins, 0, best, 0}
      end
    end)
    |> then(fn {wins, current, best, _} -> {wins, current, best, 0} end)
  end

  defp participant_ids(map) when is_map(map), do: Map.values(map) |> Enum.filter(&is_binary/1)
  defp participant_ids(_), do: []

  defp display_name(player_id) do
    case Repo.one(from(p in "players", where: p.id == ^player_id, select: p.nickname)) do
      nil ->
        if String.length(player_id) > 12, do: "#{String.slice(player_id, 0, 8)}…", else: player_id

      nickname ->
        nickname
    end
  rescue
    _ -> "visitor"
  end
end

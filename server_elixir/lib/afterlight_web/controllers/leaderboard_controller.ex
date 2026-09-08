defmodule AfterlightWeb.LeaderboardController do
  @moduledoc """
  Public verified leaderboard reads (task 3.10, design D8).

  Read-only: rankings derive from server-recorded arcade runs only. There is
  deliberately no write route — clients cannot submit scores, so forged
  results can never become ranked entries.
  """

  use Phoenix.Controller,
    formats: [:json]

  alias Afterlight.Activities

  @games MapSet.new(["rain-runner", "signal-lost", "sporefall"])
  @max_rules_version 1000

  def show(conn, %{"game" => game} = params) do
    if MapSet.member?(@games, game) do
      rules_version = parse_version(params["rulesVersion"])
      page = parse_page(params["page"])

      case Activities.leaderboard(game, rules_version, page) do
        {:ok, board} ->
          json(conn, %{"ok" => true, "board" => board})

        {:error, _} ->
          json(conn, %{"ok" => false, "error" => "leaderboard_unavailable"})
      end
    else
      json(conn, %{"ok" => false, "error" => "unknown_game"})
    end
  end

  def show(conn, _params), do: json(conn, %{"ok" => false, "error" => "unknown_game"})

  defp parse_version(raw) do
    case Integer.parse(raw || "") do
      {v, ""} when v >= 1 and v <= @max_rules_version -> v
      _ -> 1
    end
  end

  defp parse_page(raw) do
    case Integer.parse(raw || "") do
      {p, ""} when p >= 0 -> p
      _ -> 0
    end
  end
end

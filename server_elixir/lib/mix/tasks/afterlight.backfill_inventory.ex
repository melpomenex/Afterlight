defmodule Mix.Tasks.Afterlight.BackfillInventory do
  @moduledoc "Idempotent backfill of `inventory_balances` from players jsonb (task 4.8)."
  use Mix.Task

  @shortdoc "Backfill inventory_balances from players.inventory jsonb"

  def run(_args) do
    Mix.Task.run("app.start")

    import Ecto.Query
    alias Afterlight.{Repo}
    alias Afterlight.EconomyGroup.Inventory

    ids = Repo.all(from p in "players", select: p.id)

    Enum.each(ids, fn id ->
      Inventory.backfill_from_player_jsonb!(id)
    end)

    IO.puts("Backfilled #{length(ids)} players")
  end
end

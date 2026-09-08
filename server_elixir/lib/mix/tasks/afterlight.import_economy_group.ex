defmodule Mix.Tasks.Afterlight.ImportEconomyGroup do
  @shortdoc "Import all economy-group domains from a frozen game-state.json snapshot"
  @moduledoc """
  Idempotent importer for all economy-group domains from a frozen `game-state.json` snapshot:
  wallets, normalized inventory balances, gardens, beds, sprinklers, orders, trades,
  market multipliers, gather nodes, and machines.

      mix afterlight.import_economy_group [--file PATH] [--freeze-ack yes] [--force]
  """

  use Mix.Task

  @requirements ["app.start"]

  @impl Mix.Task
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args, strict: [file: :string, snapshot: :string, freeze_ack: :string, force: :boolean])

    path = opts[:file] || opts[:snapshot] || Afterlight.Import.EconomyGroup.default_game_state_path()

    freeze_ack? = opts[:freeze_ack] in ["yes", "true"]

    import_opts = [
      freeze_ack: freeze_ack?,
      force: opts[:force] == true
    ]

    case Afterlight.Import.EconomyGroup.run(path, import_opts) do
      {:ok, :identical, report} ->
        Mix.shell().info(
          "import no-op: snapshot #{report.snapshot_sha256} already applied (#{report.counts.players} players, #{report.counts.orders} orders)"
        )

      {:ok, :imported, report} ->
        Mix.shell().info(
          "imported economy group from #{path} sha256=#{report.snapshot_sha256} " <>
            "players=#{report.counts.players} coins=#{report.sums.coins} reserved=#{report.sums.reserved_coins} " <>
            "inventory_rows=#{report.counts.inventory_rows} validation=PASS"
        )

      {:error, :hash_mismatch, meta} ->
        Mix.shell().error(
          "snapshot hash mismatch: recorded #{meta.recorded} vs #{meta.hash} — refusing import (pass --force to override)"
        )

        exit({:shutdown, 1})

      {:error, {:validation_failed, failures, _report}} ->
        Mix.shell().error("import validation failed:\n  " <> Enum.join(failures, "\n  "))
        exit({:shutdown, 1})

      {:error, :not_found} ->
        Mix.shell().error("file not found: #{path}")
        exit({:shutdown, 1})

      {:error, reason} ->
        Mix.shell().error("import failed: #{inspect(reason)}")
        exit({:shutdown, 1})
    end
  end
end

defmodule Mix.Tasks.Afterlight.ArchiveEconomy do
  @shortdoc "Archive the retired garden/economy tables to .retired/ before dropping them"

  @moduledoc """
  One-shot pre-drop export for the gardening retirement. Reads every
  economy-group table (plus the player economy columns' table) as JSON rows
  and writes a dated file to `.retired/economy-<UTC>.json` (gitignored).

  Run this BEFORE `mix ecto.migrate` applies
  `drop_gardening_economy_domain`; afterwards the data is unrecoverable.

      mix afterlight.archive_economy [--out PATH]
  """

  use Mix.Task

  @requirements ["app.start"]

  @tables ~w(
    players gardens beds sprinklers orders trades market_multipliers
    gather_nodes machines machine_materials machine_contributions
    inventory_balances ledger_entries contracts contract_board
    import_snapshots
  )

  @impl Mix.Task
  def run(args) do
    {opts, _, _} = OptionParser.parse(args, strict: [out: :string])
    now = DateTime.utc_now()
    default_path = Path.join(".retired", "economy-#{DateTime.to_iso8601(now) |> String.replace(":", "-")}.json")
    path = Path.expand(opts[:out] || default_path)

    File.mkdir_p!(Path.dirname(path))

    tables =
      Map.new(@tables, fn table ->
        {table, %{"columns" => columns(table), "rows" => rows(table)}}
      end)

    payload = %{
      "archivedAt" => DateTime.to_iso8601(now),
      "source" => "afterlight.archive_economy",
      "tables" => tables
    }

    File.write!(path, Jason.encode!(payload, pretty: true) <> "\n")
    Mix.shell().info("archived #{length(@tables)} tables → #{path}")
  end

  defp columns(table) do
    Afterlight.Repo.query!(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [table]
    ).rows
    |> List.flatten()
  end

  defp rows(table) do
    # Table names come from the fixed @tables list above, never from input.
    %{rows: [[text]]} =
      Afterlight.Repo.query!(
        "SELECT COALESCE(json_agg(row_to_json(t))::text, '[]') FROM (SELECT * FROM #{table}) t"
      )

    Jason.decode!(text)
  end
end

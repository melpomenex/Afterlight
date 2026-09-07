defmodule Mix.Tasks.Afterlight.ImportTheaterCatalog do
  @shortdoc "Import theater + catalog snapshots into PostgreSQL"
  @moduledoc """
  Snapshot-copies and SHA-256-hashes each source file before reading, records
  the hash in `system_imports`, and imports theater (from `game-state.json`),
  IPTV (`iptv.json`), and EPG (`epg.json`) with count validation.

      mix afterlight.import_theater_catalog \\
        --game-state ../data/game-state.json \\
        --iptv ../data/iptv.json \\
        --epg ../data/epg.json

  Missing catalog files block the import unless `--attest-missing-catalog yes`.
  See `docs/architecture/elixir/cutover-theater-catalog.md`.
  """

  use Mix.Task

  @requirements ["app.start"]

  @impl Mix.Task
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args,
        strict: [
          file: :string,
          game_state: :string,
          iptv: :string,
          epg: :string,
          attest_missing_catalog: :string
        ]
      )

    import_opts = [
      file: opts[:file],
      game_state: opts[:game_state],
      iptv: opts[:iptv],
      epg: opts[:epg],
      attest_missing_catalog: opts[:attest_missing_catalog] in ["yes", "true"]
    ]

    case Afterlight.TheaterCatalog.Import.run(import_opts) do
      {:ok, %{theater: theater, iptv: iptv, epg: epg}} ->
        Mix.shell().info(format_domain("theater", theater))
        Mix.shell().info(format_domain("iptv", iptv))
        Mix.shell().info(format_domain("epg", epg))

      {:error, {domain, reason, meta}} ->
        Mix.shell().error("#{domain} import failed (#{reason}): #{inspect(meta)}")
        exit({:shutdown, 1})
    end
  end

  defp format_domain(domain, {status, meta}) do
    case status do
      :noop -> "#{domain}: nothing to import (#{meta[:reason] || meta["reason"] || "empty"})"
      :identical -> "#{domain}: no-op snapshot #{meta[:hash] || meta["hash"]} already applied"
      :imported -> "#{domain}: imported #{inspect(meta)}"
      :skipped -> "#{domain}: skipped (#{meta[:reason] || meta["reason"]})"
    end
  end
end

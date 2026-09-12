defmodule Mix.Tasks.Afterlight.ImportGameState do
  @shortdoc "Shadow-import players from a game-state.json snapshot"
  @moduledoc """
  Reads `players` from a snapshot copy of `data/game-state.json` as a
  MIGRATION SOURCE for the read-only shadow. The live file is never frozen
  or written.

      mix afterlight.import_game_state [--file PATH]

  See `docs/architecture/elixir/cutover-accounts.md`.
  """

  use Mix.Task

  @requirements ["app.start"]

  @impl Mix.Task
  def run(args) do
    {opts, _, _} = OptionParser.parse(args, strict: [file: :string, snapshot: :string])
    path = opts[:file] || opts[:snapshot] || Afterlight.Accounts.Export.default_game_state_path()

    case Afterlight.Accounts.Import.run(path) do
      {:ok, :noop, meta} ->
        Mix.shell().info("nothing to import (#{meta[:reason] || "empty players"})")

      {:ok, :identical, meta} ->
        Mix.shell().info(
          "import no-op: snapshot #{meta.hash} already applied (#{meta.count} players)"
        )

      {:ok, :imported, meta} ->
        Mix.shell().info(
          "imported #{meta.count} players sha256=#{meta.hash}"
        )

      {:error, :hash_mismatch, meta} ->
        Mix.shell().error(
          "snapshot hash mismatch: recorded #{meta.recorded} vs #{meta.hash} — refusing import"
        )

        exit({:shutdown, 1})

      {:error, :validation, meta} ->
        Mix.shell().error("import validation failed: #{inspect(meta)}")
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

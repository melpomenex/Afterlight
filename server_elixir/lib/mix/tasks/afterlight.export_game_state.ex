defmodule Mix.Tasks.Afterlight.ExportGameState do
  @shortdoc "Export game-state.json shape from PostgreSQL under a fresh write freeze"
  @moduledoc """
  Reverse-exports all game state from PostgreSQL into `game-state.json` shape (Task 6.4).
  Refuses to run without an explicit write freeze (`--freeze-ack yes`).

      mix afterlight.export_game_state --out /tmp/game-state.json --freeze-ack yes
  """

  use Mix.Task

  @requirements ["app.start"]

  @impl Mix.Task
  def run(args) do
    {opts, _, _} = OptionParser.parse(args, strict: [out: :string, freeze_ack: :string])

    unless opts[:freeze_ack] in ["yes", "true"] do
      Mix.shell().error("refusing: pass --freeze-ack yes (explicit write freeze)")
      exit({:shutdown, 1})
    end

    dest = opts[:out] || "/tmp/game-state.json"
    path = Afterlight.Export.GameState.write!(dest, freeze_ack: true)
    Mix.shell().info("exported game-state to #{path}")
  end
end

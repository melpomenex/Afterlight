defmodule Mix.Tasks.Afterlight.ExportPlayers do
  @shortdoc "Rehearsal reverse-export of shadow players to JSON"
  @moduledoc """
  Writes PostgreSQL `players` back to a JSON file. Rehearsal tooling for the
  P6 reverse-export path. Refuses to run without `--freeze-ack yes`.

      mix afterlight.export_players --out /tmp/players.json --freeze-ack yes
  """

  use Mix.Task

  @requirements ["app.start"]

  @impl Mix.Task
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args, strict: [out: :string, freeze_ack: :string])

    unless opts[:freeze_ack] in ["yes", "true"] do
      Mix.shell().error("refusing: pass --freeze-ack yes (explicit write freeze)")
      exit({:shutdown, 1})
    end

    dest = opts[:out] || Path.join(System.tmp_dir!(), "afterlight-players-export.json")
    path = Afterlight.Accounts.Export.write!(dest, freeze_ack: true)
    Mix.shell().info("exported players → #{path}")
  end
end

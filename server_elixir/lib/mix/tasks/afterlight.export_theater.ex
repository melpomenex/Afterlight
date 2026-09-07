defmodule Mix.Tasks.Afterlight.ExportTheater do
  @shortdoc "Reverse-export theater bill from PostgreSQL"
  @moduledoc """
  Writes the `{now, queue}` theater section for rollback rehearsal.
  Refuses without an explicit write freeze.

      mix afterlight.export_theater --out /tmp/theater.json --freeze-ack yes
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

    dest = opts[:out] || Path.join(System.tmp_dir!(), "afterlight-theater-export.json")
    path = Afterlight.Theater.Export.write!(dest, freeze_ack: true)
    Mix.shell().info("exported theater → #{path}")
  end
end

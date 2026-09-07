defmodule Mix.Tasks.Afterlight.ExportCatalog do
  @shortdoc "Reverse-export IPTV + EPG catalogs from PostgreSQL"
  @moduledoc """
  Writes legacy-shaped `iptv.json` and `epg.json` for rollback rehearsal.
  Refuses without an explicit write freeze.

      mix afterlight.export_catalog \\
        --iptv-out /tmp/iptv.json \\
        --epg-out /tmp/epg.json \\
        --freeze-ack yes
  """

  use Mix.Task

  @requirements ["app.start"]

  @impl Mix.Task
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args, strict: [iptv_out: :string, epg_out: :string, freeze_ack: :string])

    unless opts[:freeze_ack] in ["yes", "true"] do
      Mix.shell().error("refusing: pass --freeze-ack yes (explicit write freeze)")
      exit({:shutdown, 1})
    end

    iptv_dest = opts[:iptv_out] || Path.join(System.tmp_dir!(), "afterlight-iptv-export.json")
    epg_dest = opts[:epg_out] || Path.join(System.tmp_dir!(), "afterlight-epg-export.json")

    iptv_path = Afterlight.Catalog.Export.write_iptv!(iptv_dest, freeze_ack: true)
    epg_path = Afterlight.Catalog.Export.write_epg!(epg_dest, freeze_ack: true)
    Mix.shell().info("exported iptv → #{iptv_path}")
    Mix.shell().info("exported epg → #{epg_path}")
  end
end

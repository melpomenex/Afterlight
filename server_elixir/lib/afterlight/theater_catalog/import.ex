defmodule Afterlight.TheaterCatalog.Import do
  @moduledoc false

  alias Afterlight.Catalog.Import, as: CatalogImport
  alias Afterlight.Theater.Import, as: TheaterImport

  def default_paths do
    data = Path.expand(Path.join([File.cwd!(), "..", "data"]))

    %{
      game_state: Path.join(data, "game-state.json"),
      iptv: Path.join(data, "iptv.json"),
      epg: Path.join(data, "epg.json")
    }
  end

  def run(opts \\ []) do
    paths = %{
      game_state: opts[:game_state] || opts[:file] || default_paths().game_state,
      iptv: opts[:iptv] || default_paths().iptv,
      epg: opts[:epg] || default_paths().epg
    }

    attest_missing_catalog = opts[:attest_missing_catalog] in [true, "yes", "true"]

    with {:ok, theater} <- import_theater(paths.game_state),
         {:ok, iptv} <- import_iptv(paths.iptv, attest_missing_catalog),
         {:ok, epg} <- import_epg(paths.epg, attest_missing_catalog) do
      {:ok, %{theater: theater, iptv: iptv, epg: epg}}
    end
  end

  defp import_theater(path) do
    case TheaterImport.run(path) do
      {:ok, status, meta} -> {:ok, {status, meta}}
      {:error, reason, meta} -> {:error, {:theater, reason, meta}}
      {:error, reason} -> {:error, {:theater, reason, %{}}}
    end
  end

  defp import_iptv(path, attest_missing) do
    if File.exists?(path) do
      case CatalogImport.run_iptv(path) do
        {:ok, status, meta} -> {:ok, {status, meta}}
        {:error, reason, meta} -> {:error, {:iptv, reason, meta}}
        {:error, reason} -> {:error, {:iptv, reason, %{}}}
      end
    else
      if attest_missing do
        {:ok, {:skipped, %{reason: "missing file attested"}}}
      else
        {:error, {:iptv, :missing_file, %{path: path}}}
      end
    end
  end

  defp import_epg(path, attest_missing) do
    if File.exists?(path) do
      case CatalogImport.run_epg(path) do
        {:ok, status, meta} -> {:ok, {status, meta}}
        {:error, reason, meta} -> {:error, {:epg, reason, meta}}
        {:error, reason} -> {:error, {:epg, reason, %{}}}
      end
    else
      if attest_missing do
        {:ok, {:skipped, %{reason: "missing file attested"}}}
      else
        {:error, {:epg, :missing_file, %{path: path}}}
      end
    end
  end
end

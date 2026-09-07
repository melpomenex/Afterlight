defmodule Afterlight.Catalog.Import do
  @moduledoc false

  alias Afterlight.Accounts.SystemImport
  alias Afterlight.Catalog.Model
  alias Afterlight.Import.Snapshot
  alias Afterlight.Repo

  import Ecto.Query

  @chunk_size 1000

  def run_iptv(source_path) do
    import_file(source_path, "iptv", &import_iptv_json/2)
  end

  def run_epg(source_path) do
    import_file(source_path, "epg", &import_epg_json/2)
  end

  defp import_file(source_path, domain, importer) do
    source_path = Path.expand(source_path)

    unless File.exists?(source_path) do
      {:error, :missing_file}
    else
      {tmp, hash} = Snapshot.copy_and_hash(source_path)

      try do
        with {:ok, json} <- Jason.decode(File.read!(tmp)) do
          importer.(json, %{hash: hash, source_path: source_path, domain: domain})
        else
          {:error, _} -> {:ok, :noop, %{reason: "unreadable json", domain: domain}}
        end
      after
        File.rm(tmp)
      end
    end
  end

  defp import_iptv_json(json, ctx) when is_map(json) do
    library = Model.normalize_iptv_library(json)
    lists = Map.get(library, "lists") || []

    cond do
      lists == [] ->
        {:ok, :noop, %{reason: "empty lists", domain: "iptv"}}

      true ->
        apply_iptv(lists, ctx)
    end
  end

  defp import_iptv_json(_json, ctx), do: {:ok, :noop, %{reason: "empty lists", domain: ctx.domain}}

  defp apply_iptv(lists, %{hash: hash, source_path: source_path}) do
    snapshot_lists = length(lists)

    snapshot_channels =
      Enum.reduce(lists, 0, fn list, acc ->
        acc + length(Map.get(list, "channels") || [])
      end)

    case Repo.get(SystemImport, "iptv") do
      %{snapshot_sha256: ^hash} ->
        {:ok, :identical, %{hash: hash, lists: snapshot_lists, channels: snapshot_channels}}

      %{snapshot_sha256: recorded} when is_binary(recorded) ->
        {:error, :hash_mismatch, %{recorded: recorded, hash: hash}}

      _ ->
        do_import_iptv(lists, hash, source_path, snapshot_lists, snapshot_channels)
    end
  end

  defp do_import_iptv(lists, hash, source_path, snapshot_lists, snapshot_channels) do
    now_ms = System.system_time(:millisecond)

    Repo.transaction(fn ->
      Repo.delete_all("playlist_channels")
      Repo.delete_all("playlist_lists")

      Enum.each(lists, fn list ->
        channels = Map.get(list, "channels") || []

        Repo.insert_all("playlist_lists", [
          %{
            id: Map.get(list, "id"),
            name: Map.get(list, "name") || "",
            added_by: Map.get(list, "addedBy") || "Someone",
            added_at: int_or(Map.get(list, "addedAt"), now_ms),
            channel_count: length(channels)
          }
        ])

        channel_rows =
          Enum.with_index(channels, 0)
          |> Enum.map(fn {ch, pos} ->
            %{
              list_id: Map.get(list, "id"),
              position: pos,
              url: Map.get(ch, "url") || "",
              name: Map.get(ch, "name") || "",
              group_name: Map.get(ch, "group") || "",
              logo: Map.get(ch, "logo"),
              tvg_id: Map.get(ch, "tvgId")
            }
          end)

        if channel_rows != [] do
          Repo.insert_all("playlist_channels", channel_rows)
        end
      end)

      imported_lists = Repo.one!(from(l in "playlist_lists", select: count(l.id)))
      imported_channels = Repo.one!(from(c in "playlist_channels", select: count(c.id)))

      if imported_lists != snapshot_lists or imported_channels != snapshot_channels do
        Repo.rollback(
          {:validation,
           %{
             snapshot: %{lists: snapshot_lists, channels: snapshot_channels},
             imported: %{lists: imported_lists, channels: imported_channels}
           }}
        )
      end

      %SystemImport{
        domain: "iptv",
        snapshot_sha256: hash,
        player_count: 0,
        coins_sum: 0,
        xp_sum: 0,
        imported_at: now_ms,
        source_path: source_path,
        meta: %{"lists" => imported_lists, "channels" => imported_channels}
      }
      |> Repo.insert!(on_conflict: :replace_all, conflict_target: [:domain])

      %{hash: hash, lists: imported_lists, channels: imported_channels}
    end)
    |> case do
      {:ok, meta} -> {:ok, :imported, meta}
      {:error, {:validation, meta}} -> {:error, :validation, meta}
      {:error, reason} -> {:error, reason}
    end
  end

  defp import_epg_json(json, ctx) when is_map(json) do
    epg = Model.normalize_epg(json)

    if is_nil(epg) do
      {:ok, :noop, %{reason: "empty epg", domain: "epg"}}
    else
      apply_epg(epg, ctx)
    end
  end

  defp import_epg_json(_json, ctx), do: {:ok, :noop, %{reason: "empty epg", domain: ctx.domain}}

  defp apply_epg(epg, %{hash: hash, source_path: source_path}) do
    channels = Map.get(epg, "channels") || %{}
    programmes = Map.get(epg, "programmes") || %{}

    snapshot_channels = map_size(channels)

    snapshot_programme_channels =
      programmes
      |> Enum.count(fn {_id, progs} -> is_list(progs) and progs != [] end)

    case Repo.get(SystemImport, "epg") do
      %{snapshot_sha256: ^hash} ->
        {:ok, :identical,
         %{
           hash: hash,
           channels: snapshot_channels,
           programme_channels: snapshot_programme_channels
         }}

      %{snapshot_sha256: recorded} when is_binary(recorded) ->
        {:error, :hash_mismatch, %{recorded: recorded, hash: hash}}

      _ ->
        do_import_epg(epg, hash, source_path, snapshot_channels, snapshot_programme_channels)
    end
  end

  defp do_import_epg(epg, hash, source_path, snapshot_channels, snapshot_programme_channels) do
    guide_id = "active"
    now_ms = System.system_time(:millisecond)
    channels = Map.get(epg, "channels") || %{}
    programmes = Map.get(epg, "programmes") || %{}

    Repo.transaction(fn ->
      Repo.delete_all(from(p in "epg_programmes", where: p.guide_id == ^guide_id))
      Repo.delete_all(from(c in "epg_channels", where: c.guide_id == ^guide_id))
      Repo.delete_all(from(g in "epg_guides", where: g.id == ^guide_id))

      Repo.insert_all("epg_guides", [
        %{
          id: guide_id,
          name: Map.get(epg, "name"),
          updated_at: int_or(Map.get(epg, "updatedAt"), now_ms)
        }
      ])

      channel_rows =
        Enum.map(channels, fn {xmltv_id, ch} ->
          %{
            guide_id: guide_id,
            xmltv_id: xmltv_id,
            names: Map.get(ch, "names") || [],
            icon: Map.get(ch, "icon")
          }
        end)

      if channel_rows != [] do
        Enum.chunk_every(channel_rows, @chunk_size)
        |> Enum.each(&Repo.insert_all("epg_channels", &1))
      end

      programme_rows =
        programmes
        |> Enum.flat_map(fn {channel_key, entries} ->
          if is_list(entries) do
            Enum.map(entries, fn entry ->
              %{
                guide_id: guide_id,
                channel_key: channel_key,
                start_ms: Enum.at(entry, 0),
                stop_ms: Enum.at(entry, 1),
                title: Enum.at(entry, 2) || "",
                sub_title: nil,
                description: if(length(entry) > 3, do: Enum.at(entry, 3), else: nil)
              }
            end)
          else
            []
          end
        end)

      if programme_rows != [] do
        programme_rows
        |> Enum.chunk_every(@chunk_size)
        |> Enum.each(fn chunk ->
          Repo.insert_all(
            "epg_programmes",
            chunk,
            on_conflict: :nothing,
            conflict_target: [:guide_id, :channel_key, :start_ms]
          )
        end)
      end

      imported_channels =
        Repo.one!(
          from(c in "epg_channels", where: c.guide_id == ^guide_id, select: count(c.xmltv_id))
        )

      imported_programme_channels =
        Repo.one!(
          from(p in "epg_programmes",
            where: p.guide_id == ^guide_id,
            select: count(fragment("DISTINCT ?", p.channel_key))
          )
        )

      if imported_channels != snapshot_channels or
           imported_programme_channels != snapshot_programme_channels do
        Repo.rollback(
          {:validation,
           %{
             snapshot: %{
               channels: snapshot_channels,
               programme_channels: snapshot_programme_channels
             },
             imported: %{
               channels: imported_channels,
               programme_channels: imported_programme_channels
             }
           }}
        )
      end

      %SystemImport{
        domain: "epg",
        snapshot_sha256: hash,
        player_count: 0,
        coins_sum: 0,
        xp_sum: 0,
        imported_at: now_ms,
        source_path: source_path,
        meta: %{
          "channels" => imported_channels,
          "programme_channels" => imported_programme_channels
        }
      }
      |> Repo.insert!(on_conflict: :replace_all, conflict_target: [:domain])

      %{
        hash: hash,
        channels: imported_channels,
        programme_channels: imported_programme_channels
      }
    end)
    |> case do
      {:ok, meta} -> {:ok, :imported, meta}
      {:error, {:validation, meta}} -> {:error, :validation, meta}
      {:error, reason} -> {:error, reason}
    end
  end

  defp int_or(v, _d) when is_integer(v), do: v
  defp int_or(v, _d) when is_float(v), do: trunc(v)
  defp int_or(_, d), do: d
end

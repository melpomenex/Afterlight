defmodule Afterlight.Theater.Import do
  @moduledoc false

  alias Afterlight.Accounts.SystemImport
  alias Afterlight.Import.Snapshot
  alias Afterlight.Repo
  alias Afterlight.Theater.Reducer

  import Ecto.Query

  @room_key "theater"

  def run(source_path) do
    source_path = Path.expand(source_path)

    unless File.exists?(source_path) do
      {:error, :not_found}
    else
      {tmp, hash} = Snapshot.copy_and_hash(source_path)

      try do
        with {:ok, json} <- Jason.decode(File.read!(tmp)) do
          import_theater(json, hash, source_path)
        else
          {:error, _} -> {:ok, :noop, %{reason: "unreadable json"}}
        end
      after
        File.rm(tmp)
      end
    end
  end

  defp import_theater(json, hash, source_path) when is_map(json) do
    theater = Map.get(json, "theater")

    cond do
      theater in [nil, %{}] ->
        {:ok, :noop, %{reason: "idle theater"}}

      not is_map(theater) ->
        {:ok, :noop, %{reason: "idle theater"}}

      idle?(theater) ->
        case Repo.get(SystemImport, "theater") do
          %{snapshot_sha256: ^hash} ->
            {:ok, :identical, %{hash: hash, now: 0, queue: 0}}

          %{snapshot_sha256: recorded} when is_binary(recorded) ->
            {:error, :hash_mismatch, %{recorded: recorded, hash: hash}}

          _ ->
            record_idle_import(hash, source_path)
        end

      true ->
        apply_theater(theater, hash, source_path)
    end
  end

  defp import_theater(_json, _hash, _source_path),
    do: {:ok, :noop, %{reason: "idle theater"}}

  defp idle?(%{"now" => nil, "queue" => []}), do: true
  defp idle?(%{now: nil, queue: []}), do: true
  defp idle?(_), do: false

  defp record_idle_import(hash, source_path) do
    now_ms = System.system_time(:millisecond)

    %SystemImport{
      domain: "theater",
      snapshot_sha256: hash,
      player_count: 0,
      imported_at: now_ms,
      source_path: source_path,
      meta: %{"now" => 0, "queue" => 0, "idle" => true}
    }
    |> Repo.insert!(on_conflict: :replace_all, conflict_target: [:domain])

    {:ok, :imported, %{hash: hash, now: 0, queue: 0, idle: true}}
  end

  defp apply_theater(raw, hash, source_path) do
    state = Reducer.normalize_state(raw)

    case Repo.get(SystemImport, "theater") do
      %{snapshot_sha256: ^hash} ->
        counts = count_rows()
        {:ok, :identical, Map.merge(counts, %{hash: hash})}

      %{snapshot_sha256: recorded} when is_binary(recorded) ->
        {:error, :hash_mismatch, %{recorded: recorded, hash: hash}}

      _ ->
        do_import(state, hash, source_path)
    end
  end

  defp do_import(state, hash, source_path) do
    now_item = Map.get(state, "now")
    queue = Map.get(state, "queue") || []
    snapshot_now = if is_map(now_item), do: 1, else: 0
    snapshot_queue = length(queue)
    now_ms = System.system_time(:millisecond)

    Repo.transaction(fn ->
      Repo.delete_all(from(i in "theater_items", where: i.room_key == ^@room_key))
      Repo.delete_all(from(r in "theater_rooms", where: r.room_key == ^@room_key))

      Repo.insert_all("theater_rooms", [
        %{
          room_key: @room_key,
          revision: 1,
          epoch: 1,
          now_item_id: if(now_item, do: Map.get(now_item, "id"), else: nil),
          updated_at: now_ms
        }
      ])

      rows = build_rows(now_item, queue)

      if rows != [] do
        Repo.insert_all("theater_items", rows)
      end

      imported_now =
        Repo.one!(
          from(i in "theater_items",
            where: i.room_key == ^@room_key and i.slot == "now",
            select: count(i.id)
          )
        )

      imported_queue =
        Repo.one!(
          from(i in "theater_items",
            where: i.room_key == ^@room_key and i.slot == "queue",
            select: count(i.id)
          )
        )

      if imported_now != snapshot_now or imported_queue != snapshot_queue do
        Repo.rollback(
          {:validation,
           %{
             snapshot: %{now: snapshot_now, queue: snapshot_queue},
             imported: %{now: imported_now, queue: imported_queue}
           }}
        )
      end

      %SystemImport{
        domain: "theater",
        snapshot_sha256: hash,
        player_count: 0,
        imported_at: now_ms,
        source_path: source_path,
        meta: %{"now" => imported_now, "queue" => imported_queue}
      }
      |> Repo.insert!(on_conflict: :replace_all, conflict_target: [:domain])

      %{hash: hash, now: imported_now, queue: imported_queue}
    end)
    |> case do
      {:ok, meta} -> {:ok, :imported, meta}
      {:error, {:validation, meta}} -> {:error, :validation, meta}
      {:error, reason} -> {:error, reason}
    end
  end

  defp count_rows do
    now =
      Repo.one!(
        from(i in "theater_items",
          where: i.room_key == ^@room_key and i.slot == "now",
          select: count(i.id)
        )
      )

    queue =
      Repo.one!(
        from(i in "theater_items",
          where: i.room_key == ^@room_key and i.slot == "queue",
          select: count(i.id)
        )
      )

    %{now: now, queue: queue}
  end

  defp build_rows(now_item, queue) do
    now_rows =
      if is_map(now_item) do
        [row_from_item(now_item, "now", 0, true)]
      else
        []
      end

    queue_rows =
      Enum.with_index(queue, 1)
      |> Enum.map(fn {item, idx} -> row_from_item(item, "queue", idx, false) end)

    now_rows ++ queue_rows
  end

  defp row_from_item(item, slot, order_index, is_now) do
    %{
      id: Map.get(item, "id"),
      room_key: @room_key,
      slot: slot,
      order_index: order_index,
      kind: Map.get(item, "kind"),
      url: Map.get(item, "url"),
      video_id: Map.get(item, "videoId"),
      title: Map.get(item, "title") || "",
      position_sec: float_or(Map.get(item, "positionSec"), 0.0),
      playing: if(is_now, do: Map.get(item, "playing") != false, else: false),
      updated_at: int_or(Map.get(item, "updatedAt"), 0),
      by: truncate(Map.get(item, "by"), 40),
      queued_by: truncate(Map.get(item, "queuedBy"), 40),
      generation: int_or(Map.get(item, "generation"), 1),
      infohash: Map.get(item, "infohash"),
      file_index: int_nil(Map.get(item, "fileIndex")),
      file_path: Map.get(item, "filePath"),
      file_bytes: float_nil(Map.get(item, "fileBytes"))
    }
  end

  defp float_or(v, d) when is_number(v), do: v * 1.0
  defp float_or(_, d), do: d

  defp float_nil(v) when is_number(v), do: v * 1.0
  defp float_nil(_), do: nil

  defp int_or(v, d) when is_integer(v), do: v
  defp int_or(v, d) when is_float(v), do: trunc(v)
  defp int_or(_, d), do: d

  defp int_nil(v) when is_integer(v), do: v
  defp int_nil(v) when is_float(v), do: trunc(v)
  defp int_nil(_), do: nil

  defp truncate(v, max) when is_binary(v), do: String.slice(v, 0, max)
  defp truncate(_, _), do: "Someone"
end

defmodule Afterlight.Theater.State do
  @moduledoc """
  Converts between PostgreSQL rows and the reducer's `{now, queue}` shape.
  Generation is server-only metadata and is not included in wire snapshots.
  """

  alias Afterlight.Theater.TheaterItem

  @doc "Build reducer state from persisted rows."
  @spec from_rows([TheaterItem.t()]) :: {%{String.t() => term()}, %{String.t() => TheaterItem.t()}}
  def from_rows(items) when is_list(items) do
    by_id = Map.new(items, &{&1.id, &1})
    now_row = Enum.find(items, &(&1.slot == "now"))

    queue_rows =
      items
      |> Enum.filter(&(&1.slot == "queue"))
      |> Enum.sort_by(& &1.order_index)

    state = %{
      "now" => if(now_row, do: row_to_now(now_row), else: nil),
      "queue" => Enum.map(queue_rows, &row_to_queue/1)
    }

    {state, by_id}
  end

  @doc "Wire snapshot `{now, queue}` without generation metadata."
  @spec snapshot(%{String.t() => term()}) :: %{String.t() => term()}
  def snapshot(state) when is_map(state) do
    %{
      "now" => state["now"],
      "queue" => state["queue"] || []
    }
  end

  @doc "Expand reducer output into target row attrs keyed by id."
  @spec target_rows(String.t(), %{String.t() => term()}, %{String.t() => TheaterItem.t()}, integer()) ::
          %{String.t() => map()}
  def target_rows(room_key, state, old_by_id, now_ms) do
    now = state["now"]
    queue = state["queue"] || []

    rows =
      if is_map(now) do
        id = now["id"]
        old = Map.get(old_by_id, id)

        %{
          id =>
            row_attrs(
              room_key,
              id,
              "now",
              0,
              now,
              promotion_generation(old),
              now_ms
            )
        }
      else
        %{}
      end

    Enum.reduce(Enum.with_index(queue), rows, fn {item, idx}, acc ->
      id = item["id"]
      old = Map.get(old_by_id, id)

      Map.put(
        acc,
        id,
        row_attrs(room_key, id, "queue", idx, item, queue_generation(old), now_ms)
      )
    end)
  end

  defp promotion_generation(nil), do: 1

  defp promotion_generation(%{slot: "now", generation: gen}), do: gen

  defp promotion_generation(%{generation: gen}) when is_integer(gen) and gen > 0, do: gen + 1
  defp promotion_generation(_), do: 1

  defp queue_generation(nil), do: 0
  defp queue_generation(%{generation: gen}) when is_integer(gen), do: gen
  defp queue_generation(_), do: 0

  defp row_attrs(room_key, id, slot, order_index, item, generation, now_ms) do
    playing? = slot == "now" and Map.get(item, "playing") == true

    base = %{
      id: id,
      room_key: room_key,
      slot: slot,
      order_index: order_index,
      kind: item["kind"],
      url: item["url"],
      video_id: item["videoId"],
      title: item["title"],
      position_sec: if(slot == "now", do: item["positionSec"] || 0.0, else: 0.0),
      playing: playing?,
      updated_at: if(slot == "now", do: item["updatedAt"] || now_ms, else: now_ms),
      by: item["by"] || item["queuedBy"] || "Someone",
      queued_by: item["queuedBy"] || item["by"] || "Someone",
      generation: generation,
      infohash: item["infohash"],
      file_index: item["fileIndex"],
      file_path: item["filePath"],
      file_bytes: item["fileBytes"]
    }

    base
  end

  defp row_to_now(row) do
    base = %{
      "id" => row.id,
      "kind" => row.kind,
      "url" => row.url,
      "videoId" => row.video_id,
      "title" => row.title,
      "playing" => row.playing,
      "positionSec" => row.position_sec,
      "updatedAt" => row.updated_at,
      "by" => row.by,
      "queuedBy" => row.queued_by
    }

    torrent_fields(row, base)
  end

  defp row_to_queue(row) do
    base = %{
      "id" => row.id,
      "kind" => row.kind,
      "url" => row.url,
      "videoId" => row.video_id,
      "title" => row.title,
      "queuedBy" => row.queued_by
    }

    torrent_fields(row, base)
  end

  defp torrent_fields(%{kind: "torrent"} = row, base) do
    Map.merge(base, %{
      "infohash" => row.infohash,
      "fileIndex" => row.file_index,
      "filePath" => row.file_path,
      "fileBytes" => row.file_bytes
    })
  end

  defp torrent_fields(_row, base), do: base
end

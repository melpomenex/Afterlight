defmodule Afterlight.Theater.Export do
  @moduledoc false

  alias Afterlight.Repo
  alias Afterlight.Theater.Reducer

  import Ecto.Query

  @room_key "theater"

  def write!(dest, opts \\ []) do
    unless Keyword.get(opts, :freeze_ack) == true do
      raise ArgumentError, "export_theater requires freeze_ack: true (write freeze)"
    end

    dest = Path.expand(dest)
    theater = load_state()

    payload = %{
      "now" => Map.get(theater, "now"),
      "queue" => Map.get(theater, "queue") || []
    }

    File.mkdir_p!(Path.dirname(dest))
    File.write!(dest, Jason.encode!(payload, pretty: true) <> "\n")
    dest
  end

  def load_state do
    now_row =
      Repo.one(
        from(i in "theater_items",
          where: i.room_key == ^@room_key and i.slot == "now",
          order_by: [asc: i.order_index],
          limit: 1
        )
      )

    queue_rows =
      Repo.all(
        from(i in "theater_items",
          where: i.room_key == ^@room_key and i.slot == "queue",
          order_by: [asc: i.order_index]
        )
      )

    Reducer.normalize_state(%{
      "now" => if(now_row, do: item_from_row(now_row, true), else: nil),
      "queue" => Enum.map(queue_rows, &item_from_row(&1, false))
    })
  end

  defp item_from_row(row, is_now) do
    base = %{
      "id" => row.id,
      "kind" => row.kind,
      "url" => row.url,
      "title" => row.title,
      "queuedBy" => row.queued_by
    }

    base =
      if row.video_id do
        Map.put(base, "videoId", row.video_id)
      else
        base
      end

    base =
      cond do
        row.infohash ->
          base
          |> Map.put("infohash", row.infohash)
          |> maybe_put("fileIndex", row.file_index)
          |> maybe_put("filePath", row.file_path)
          |> maybe_put("fileBytes", row.file_bytes)

        true ->
          base
      end

    if is_now do
      base
      |> Map.put("playing", row.playing)
      |> Map.put("positionSec", row.position_sec)
      |> Map.put("updatedAt", row.updated_at)
      |> Map.put("by", row.by)
    else
      base
    end
  end

  defp maybe_put(map, key, nil), do: map
  defp maybe_put(map, key, val), do: Map.put(map, key, val)
end

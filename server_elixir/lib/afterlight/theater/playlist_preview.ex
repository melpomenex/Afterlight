defmodule Afterlight.Theater.PlaylistPreview do
  @moduledoc """
  Transient staging for resolved playlist previews (request_id, title, videos).

  Previews live in a named ETS table until the importer confirms via `addMany`
  or abandons the flow. No bill rows change until confirm.
  """

  @table :afterlight_theater_playlist_previews

  def init do
    if :ets.whereis(@table) == :undefined do
      :ets.new(@table, [:named_table, :set, :public, read_concurrency: true])
    end

    :ok
  end

  @doc "Stage a successful resolve preview for a room/request pair."
  def stage(room_key, request_id, player_id, title, videos)
      when is_binary(room_key) and is_binary(request_id) do
    init()

    :ets.insert(@table, {
      key(room_key, request_id),
      %{
        room_key: room_key,
        request_id: request_id,
        player_id: player_id,
        title: title,
        videos: videos,
        staged_at: System.system_time(:millisecond)
      }
    })

    :ok
  end

  @doc "Fetch a staged preview without removing it."
  def get(room_key, request_id) do
    init()

    case :ets.lookup(@table, key(room_key, request_id)) do
      [{_, preview}] -> {:ok, preview}
      [] -> :error
    end
  end

  @doc "Remove a staged preview after confirm or abandon."
  def delete(room_key, request_id) do
    init()
    :ets.delete(@table, key(room_key, request_id))
    :ok
  end

  @doc """
  Build the wire payload for `theater_playlist_resolved`.
  """
  def resolved_payload(request_id, title, videos) do
    %{
      "requestId" => request_id,
      "title" => title,
      "videos" => videos
    }
  end

  defp key(room_key, request_id), do: {room_key, request_id}
end

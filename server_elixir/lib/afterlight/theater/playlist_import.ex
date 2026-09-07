defmodule Afterlight.Theater.PlaylistImport do
  @moduledoc """
  Preview/confirm helpers for YouTube playlist import.

  Resolved videos are staged in `PlaylistPreview`; the confirming `addMany`
  report is computed through the pure reducer so `theater_import_result` is
  exact against the current bill and the 50-item queue cap.
  """

  alias Afterlight.Theater.{PlaylistPreview, Reducer}

  @doc """
  Map resolved videos to `addMany` items (YouTube watch URLs).
  """
  def items_from_videos(videos) when is_list(videos) do
    Enum.map(videos, fn video ->
      video_id = Map.get(video, "videoId") || Map.get(video, :video_id)

      %{
        "url" => "https://www.youtube.com/watch?v=#{video_id}",
        "title" => Map.get(video, "title") || Map.get(video, :title) || ""
      }
    end)
  end

  @doc """
  Dry-run `addMany` against `theater_state` and return the import report only.
  """
  def preview_import_result(theater_state, videos, actor) when is_list(videos) do
    items = items_from_videos(videos)

    case Reducer.apply_action(theater_state, %{"op" => "addMany", "items" => items}, actor) do
      %{"error" => nil, "report" => report} when is_map(report) ->
        {:ok, report}

      %{"error" => reason} when is_binary(reason) ->
        {:error, reason}

      _ ->
        {:error, "invalid_action"}
    end
  end

  @doc """
  Stage a successful resolve and return the `theater_playlist_resolved` payload.
  """
  def stage_resolved(room_key, request_id, player_id, title, videos) do
    PlaylistPreview.stage(room_key, request_id, player_id, title, videos)

    {:ok,
     PlaylistPreview.resolved_payload(request_id, title, videos)}
  end

  @doc """
  Confirm a staged preview: compute `theater_import_result` for the current bill.
  Does not mutate persistence — the caller applies the reducer result.
  """
  def confirm_preview(room_key, request_id, theater_state, actor) do
    with {:ok, %{videos: videos}} <- PlaylistPreview.get(room_key, request_id),
         {:ok, report} <- preview_import_result(theater_state, videos, actor) do
      PlaylistPreview.delete(room_key, request_id)
      {:ok, report}
    else
      :error -> {:error, :preview_not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "Wire payload for `theater_import_result`."
  def import_result_payload(report) when is_map(report) do
    %{
      "queued" => Map.get(report, "queued") || Map.get(report, :queued) || 0,
      "skipped" => Map.get(report, "skipped") || Map.get(report, :skipped) || 0,
      "didNotFit" => Map.get(report, "didNotFit") || Map.get(report, :did_not_fit) || 0
    }
  end
end

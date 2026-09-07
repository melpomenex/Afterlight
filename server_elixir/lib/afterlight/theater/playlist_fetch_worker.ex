defmodule Afterlight.Theater.PlaylistFetchWorker do
  @moduledoc """
  Oban worker for `theater_playlist_resolve` fetch+extract (design D3).

  Plain Oban is used instead of AshOban: the job is imperative HTTP work
  with a side-effect-free outcome until the user confirms via `addMany`.
  Uniqueness is keyed per theater room so only one fetch runs at a time.
  """

  use Oban.Worker,
    queue: :theater_import,
    max_attempts: 3,
    unique: [
      period: 60,
      keys: [:room_key],
      states: [:available, :scheduled, :executing, :retryable]
    ]

  alias Afterlight.Theater.{PlaylistImport, PlaylistResolve, YoutubePlaylist}

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    room_key = Map.fetch!(args, "room_key")
    request_id = Map.fetch!(args, "request_id")
    list_id = Map.fetch!(args, "list_id")
    player_id = Map.get(args, "player_id")

    case YoutubePlaylist.resolve(list_id) do
      {:ok, %{title: title, videos: videos}} ->
        {:ok, payload} =
          PlaylistImport.stage_resolved(room_key, request_id, player_id, title, videos)

        notify(room_key, player_id, {:resolved, payload})
        PlaylistResolve.mark_finished(player_id)
        :ok

      {:error, reason} ->
        notify(room_key, player_id, {:failed, reason})
        PlaylistResolve.mark_finished(player_id)
        :ok
    end
  end

  @doc "Enqueue a bounded playlist fetch for a theater room."
  def enqueue(room_key, request_id, list_id, player_id) do
    job =
      new(%{
        room_key: room_key,
        request_id: request_id,
        list_id: list_id,
        player_id: player_id
      })

    if Mix.env() == :test do
      PlaylistResolve.mark_finished(player_id)
      {:ok, job}
    else
      Oban.insert(job)
    end
  end

  defp notify(room_key, player_id, message) do
    Phoenix.PubSub.broadcast(
      Afterlight.PubSub,
      topic(room_key),
      {:theater_playlist_fetch, player_id, message}
    )
  end

  defp topic(room_key), do: "theater:playlist_fetch:#{room_key}"
end

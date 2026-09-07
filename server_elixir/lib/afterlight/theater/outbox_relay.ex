defmodule Afterlight.Theater.OutboxRelay do
  @moduledoc """
  Publishes committed `theater_state` outbox rows to the theater room.
  """

  use GenServer

  require Ash.Query
  import Ecto.Query

  alias Afterlight.Accounts.{Actor, OutboxEvent}
  alias Afterlight.Repo
  alias Afterlight.Theater.SessionTracker
  alias Afterlight.World.RoomServer

  @default_room "theater"

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: Keyword.get(opts, :name, __MODULE__))

  def init(opts) do
    interval = Keyword.get(opts, :interval_ms, 1_000)
    {:ok, %{interval: interval}, {:continue, :tick}}
  end

  def handle_continue(:tick, state) do
    _ = Process.send_after(self(), :tick, state.interval)
    {:noreply, state}
  end

  def handle_info(:tick, state) do
    _ = publish_pending()
    _ = Process.send_after(self(), :tick, state.interval)
    {:noreply, state}
  end

  def publish_pending(limit \\ 100) do
    now = System.system_time(:millisecond)

    events =
      OutboxEvent
      |> Ash.Query.filter(is_nil(published_at) and aggregate == "theater")
      |> Ash.Query.sort(id: :asc)
      |> Ash.Query.limit(limit)
      |> Ash.read!(actor: Actor.system(), authorize?: false)

    Enum.each(events, fn event ->
      broadcast_theater_state(event.payload, now)

      event
      |> Ash.Changeset.for_update(:mark_published, %{published_at: now},
        actor: Actor.system(),
        authorize?: false
      )
      |> Ash.update!()
    end)

    length(events)
  end

  defp broadcast_theater_state(payload, server_now) when is_map(payload) do
    frame = %{
      "type" => "theater_state",
      "theater" => payload["theater"] || payload[:theater] || %{},
      "serverNow" => payload["serverNow"] || payload[:serverNow] || server_now
    }

    case Registry.lookup(Afterlight.World.Registry, {RoomServer, @default_room}) do
      [{pid, _}] -> RoomServer.broadcast_frame(pid, frame)
      [] -> :ok
    end
  end

  defp broadcast_theater_state(_payload, _server_now), do: :ok

  def unpublished_count do
    Repo.aggregate(
      from(e in "outbox_events", where: is_nil(e.published_at) and e.aggregate == "theater"),
      :count,
      :id
    )
  end
end

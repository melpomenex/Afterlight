defmodule Afterlight.Theater.OutboxRelay do
  @moduledoc """
  Publishes committed `theater_state` outbox rows to the theater room.
  """

  use GenServer

  require Logger
  require Ash.Query
  import Ecto.Query

  alias Afterlight.Accounts.{Actor, OutboxEvent}
  alias Afterlight.Repo
  alias Afterlight.Specialty.TorrentRules
  alias Afterlight.World.RoomServer

  # One shared definition of the theater room's wire id (change
  # fix-theater-streaming-after-elixir-cutover D3): the world runtime keys
  # rooms by wire id and the specialty adapter already names the theater
  # through TorrentRules; a second hardcoded "theater" here would silently
  # no-op every live bill broadcast if the two ever drifted.
  defp room_key, do: TorrentRules.theater_wire_id()

  @doc """
  The Registry key bill broadcasts are published through. Public for the
  regression test that pins it to the world runtime's theater wire id.
  """
  def theater_registry_key, do: {RoomServer, room_key()}

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

    Enum.reduce(events, 0, fn event, count ->
      case broadcast_theater_state(event.payload, now) do
        :delivered ->
          telemetry(event, :delivered)
          mark_published!(event, now)
          count + 1

        :no_room ->
          telemetry(event, :no_room)
          count
      end
    end)
  end

  defp broadcast_theater_state(payload, server_now) when is_map(payload) do
    frame = %{
      "type" => "theater_state",
      "theater" => payload["theater"] || payload[:theater] || %{},
      "serverNow" => payload["serverNow"] || payload[:serverNow] || server_now
    }

    case Registry.lookup(Afterlight.World.Registry, theater_registry_key()) do
      [{pid, _}] ->
        RoomServer.broadcast_frame(pid, frame)
        :delivered

      [] ->
        Logger.debug(
          "theater_state deferred: no room process under #{inspect(theater_registry_key())}"
        )

        :no_room
    end
  end

  defp broadcast_theater_state(_payload, _server_now), do: :no_room

  defp mark_published!(event, now) do
    event
    |> Ash.Changeset.for_update(:mark_published, %{published_at: now},
      actor: Actor.system(),
      authorize?: false
    )
    |> Ash.update!()
  end

  # One event per committed bill change, carrying the revision the frame
  # was built from — the observable counterpart to the outbox row, so a
  # stopped relay or a drifted room key is measurable rather than silent.
  defp telemetry(event, outcome) do
    :telemetry.execute(
      [:afterlight, :theater, :broadcast],
      %{count: 1},
      %{room: event.aggregate_id, revision: event.revision, outcome: outcome}
    )
  end

  def unpublished_count do
    Repo.aggregate(
      from(e in "outbox_events", where: is_nil(e.published_at) and e.aggregate == "theater"),
      :count,
      :id
    )
  end
end

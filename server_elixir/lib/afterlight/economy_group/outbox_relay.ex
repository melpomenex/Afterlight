defmodule Afterlight.EconomyGroup.OutboxRelay do
  @moduledoc """
  Publishes committed economy-group outbox rows to players and the market topic.
  """

  use GenServer

  require Ash.Query
  import Ecto.Query

  alias Afterlight.Accounts.{Actor, OutboxEvent}
  alias Afterlight.Repo

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

  @doc "Publish pending player-scoped outbox rows and return wire frames."
  @spec flush_player(String.t()) :: [{String.t(), map()}]
  def flush_player(player_id) when is_binary(player_id) do
    publish_aggregate("economy_group", player_id, :player)
  end

  @doc "Publish pending market-scoped outbox rows and broadcast updates."
  @spec flush_market() :: [{String.t(), map()}]
  def flush_market do
    publish_aggregate("economy_group", "market", :market)
  end

  @doc "Publish pending room-scoped outbox rows and broadcast updates."
  @spec flush_room(String.t()) :: [{String.t(), map()}]
  def flush_room(room_id) when is_binary(room_id) do
    publish_aggregate("economy_group", room_id, :room)
  end

  @doc "Periodic poller: flush all pending economy-group outbox rows."
  @spec publish_pending(non_neg_integer()) :: non_neg_integer()
  def publish_pending(limit \\ 100) do
    now = System.system_time(:millisecond)

    events =
      OutboxEvent
      |> Ash.Query.filter(is_nil(published_at) and aggregate == "economy_group")
      |> Ash.Query.sort(id: :asc)
      |> Ash.Query.limit(limit)
      |> Ash.read!(actor: Actor.system(), authorize?: false)

    Enum.each(events, fn event ->
      deliver(event, now)

      event
      |> Ash.Changeset.for_update(:mark_published, %{published_at: now},
        actor: Actor.system(),
        authorize?: false
      )
      |> Ash.update!()
    end)

    length(events)
  end

  defp publish_aggregate(aggregate, aggregate_id, _kind) do
    now = System.system_time(:millisecond)

    events =
      OutboxEvent
      |> Ash.Query.filter(
        is_nil(published_at) and aggregate == ^aggregate and aggregate_id == ^aggregate_id
      )
      |> Ash.Query.sort(id: :asc)
      |> Ash.read!(actor: Actor.system(), authorize?: false)

    Enum.map(events, fn event ->
      deliver(event, now)

      event
      |> Ash.Changeset.for_update(:mark_published, %{published_at: now},
        actor: Actor.system(),
        authorize?: false
      )
      |> Ash.update!()

      {event.event_type, wire_payload(event.payload)}
    end)
  end

  defp deliver(%OutboxEvent{aggregate_id: "market"} = event, _now) do
    Phoenix.PubSub.broadcast(
      Afterlight.PubSub,
      "market:updates",
      {:economy_frame, event.event_type, wire_payload(event.payload)}
    )
  end

  defp deliver(%OutboxEvent{aggregate_id: target} = event, _now) when is_binary(target) do
    Phoenix.PubSub.broadcast(
      Afterlight.PubSub,
      "players:#{target}",
      {:economy_frame, event.event_type, wire_payload(event.payload)}
    )

    Phoenix.PubSub.broadcast(
      Afterlight.PubSub,
      "rooms:#{target}",
      {:economy_frame, event.event_type, wire_payload(event.payload)}
    )
  end

  defp deliver(_event, _now), do: :ok

  defp wire_payload(payload) when is_map(payload) do
    Map.new(payload, fn {k, v} -> {to_string(k), v} end)
  end

  defp wire_payload(other), do: other
end

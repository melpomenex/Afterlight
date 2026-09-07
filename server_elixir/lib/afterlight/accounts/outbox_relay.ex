defmodule Afterlight.Accounts.OutboxRelay do
  @moduledoc """
  At-least-once outbox poller. Stamps `published_at` after PubSub broadcast.
  Consumers dedupe by event id and revision.
  """

  use GenServer

  require Ash.Query

  import Ecto.Query

  alias Afterlight.Accounts.{Actor, OutboxEvent}
  alias Afterlight.Repo

  @topic "accounts:outbox"

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
      |> Ash.Query.filter(is_nil(published_at))
      |> Ash.Query.sort(id: :asc)
      |> Ash.Query.limit(limit)
      |> Ash.read!(actor: Actor.system(), authorize?: false)

    Enum.each(events, fn event ->
      Phoenix.PubSub.broadcast(Afterlight.PubSub, @topic, {:outbox, event})

      event
      |> Ash.Changeset.for_update(:mark_published, %{published_at: now},
        actor: Actor.system(),
        authorize?: false
      )
      |> Ash.update!()
    end)

    length(events)
  end

  def unpublished_count do
    Repo.aggregate(from(e in "outbox_events", where: is_nil(e.published_at)), :count, :id)
  end
end

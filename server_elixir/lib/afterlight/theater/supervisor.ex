defmodule Afterlight.Theater.Supervisor do
  @moduledoc false
  use Supervisor

  def start_link(opts), do: Supervisor.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_opts) do
    theater = Application.get_env(:afterlight, :theater, [])

    children = [
      Afterlight.Theater.SessionTracker,
      Afterlight.Theater.PlaylistResolve,
      {Afterlight.Theater.OutboxRelay, interval_ms: Keyword.get(theater, :outbox_interval_ms, 1_000)}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

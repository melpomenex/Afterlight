defmodule Afterlight.Accounts.Supervisor do
  @moduledoc false
  use Supervisor

  def start_link(opts), do: Supervisor.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_opts) do
    accounts = Application.get_env(:afterlight, :accounts, [])

    children = [
      {Afterlight.Accounts.Reaper, interval_ms: Keyword.get(accounts, :reaper_interval_ms, 60_000)},
      {Afterlight.Accounts.OutboxRelay, interval_ms: Keyword.get(accounts, :outbox_interval_ms, 1_000)}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

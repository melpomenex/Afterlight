defmodule Afterlight.EconomyGroup.Supervisor do
  @moduledoc false
  use Supervisor

  def start_link(opts), do: Supervisor.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_) do
    children = [
      Afterlight.World.Weather,
      Afterlight.Gardens.Loader,
      Afterlight.Gardens.Tick,
      Afterlight.Restoration.NodeTick,
      Afterlight.Economy.ContractTick,
      {Afterlight.EconomyGroup.OutboxRelay, interval_ms: 1_000}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

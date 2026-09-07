defmodule Afterlight.Specialty.Supervisor do
  @moduledoc false
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    children = [
      {Afterlight.Specialty.CircuitBreaker, name: Afterlight.Specialty.CircuitBreaker},
      {Afterlight.Specialty.ResolveGuard, name: Afterlight.Specialty.ResolveGuard},
      {Afterlight.Specialty.BillSync, name: Afterlight.Specialty.BillSync},
      {Afterlight.Specialty.StatusRelay, name: Afterlight.Specialty.StatusRelay}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

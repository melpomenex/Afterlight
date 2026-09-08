defmodule Afterlight.Media.Supervisor do
  @moduledoc """
  Supervision tree for the conferencing media subsystem (P8 design D1, D4).
  """

  use Supervisor

  def start_link(opts \\ []) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    children = [
      {Registry, keys: :unique, name: Afterlight.Media.WorkerRegistry},
      {DynamicSupervisor, name: Afterlight.Media.WorkerSupervisor, strategy: :one_for_one},
      Afterlight.Media.Allocator
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

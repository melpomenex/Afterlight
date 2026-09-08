defmodule Afterlight.Activities.Supervisor do
  @moduledoc """
  Supervisor for place activities (task 2.1, design D3):
  A unique Registry for activity sessions plus a DynamicSupervisor owning
  the per-activity `SessionServer` processes, and the bounded result
  completion recorder (task 3.9, design D8).
  """
  use Supervisor

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      {Registry, keys: :unique, name: Afterlight.Activities.Registry},
      {Registry, keys: :unique, name: Afterlight.Activities.AdmissionRegistry},
      {DynamicSupervisor,
       name: Afterlight.Activities.DynamicSupervisor,
       strategy: :one_for_one,
       max_restarts: 100,
       max_seconds: 5},
      Afterlight.Activities.CompletionRecorder
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

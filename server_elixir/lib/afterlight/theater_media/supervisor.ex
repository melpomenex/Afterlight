defmodule Afterlight.TheaterMedia.Supervisor do
  @moduledoc false
  use Supervisor

  def start_link(opts), do: Supervisor.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_opts) do
    children = [
      {Registry, keys: :unique, name: Afterlight.TheaterMedia.Registry},
      Afterlight.TheaterMedia.Coordinator,
      {Task.Supervisor, name: Afterlight.TheaterMedia.TaskSupervisor}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

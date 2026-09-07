defmodule Afterlight.World.Supervisor do
  @moduledoc """
  World runtime supervision (task 1.1, design D2): a unique Registry for
  room names plus a DynamicSupervisor owning the per-room `RoomServer`
  processes, and a TaskSupervisor for administrative sweeps (the
  `World.Rooms.leave_all/2` channel-down fan-out). Owns nothing at boot:
  rooms start lazily on first join and stop when empty past the grace.

  Restart semantics (task 6.1, design D9): rooms are `restart: :transient`
  children — a crashed room restarts with empty transient state (members
  detect the DOWN and resnapshot via desiredRoom replay) while a graceful
  empty-room stop stays stopped. `:one_for_one` — the Registry and the
  DynamicSupervisor fail independently.
  """

  use Supervisor

  def start_link(arg), do: Supervisor.start_link(__MODULE__, arg, name: __MODULE__)

  @impl true
  def init(_arg) do
    children = [
      {Registry, keys: :unique, name: Afterlight.World.Registry},
      {DynamicSupervisor, name: Afterlight.World.DynamicSupervisor},
      {Task.Supervisor, name: Afterlight.World.TaskSupervisor}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

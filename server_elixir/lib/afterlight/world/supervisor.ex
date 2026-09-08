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
      # Restart intensity is raised well above the default (3 per 5s):
      # rooms restart on CRASH as a normal containment event (D9), and a
      # multi-room crash burst (a database outage felling many owners at
      # once, an HAProxy-style thundering herd) must NOT exhaust the
      # aggregate budget — that would take the supervisor down and evict
      # every room instead of only the crashing ones. A single child
      # looping crashes still trips this budget quickly.
      {DynamicSupervisor,
       name: Afterlight.World.DynamicSupervisor,
       strategy: :one_for_one,
       max_restarts: 100,
       max_seconds: 5},
      {Task.Supervisor, name: Afterlight.World.TaskSupervisor},
      Afterlight.World.Directory,
      # Boot-validated public place projection (task 3.1): a raise here fails
      # feature initialization loudly rather than booting a partial catalog.
      Afterlight.World.PlaceDefinitions,
      Afterlight.World.Drain
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

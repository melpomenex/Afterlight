defmodule Afterlight.World.Successor do
  @moduledoc """
  Successor rebuild after ownership loss (design D5).

  No process-state handoff: the successor acquires the lease (epoch bump),
  starts a fresh `RoomServer`, and clients resnapshot via desiredRoom replay.
  Durable state is already in PostgreSQL/Ash domains; transient poses reset
  to entrances.
  """

  alias Afterlight.World
  alias Afterlight.World.{Lease, RoomKey, Rooms}

  @doc """
  Take over a room after owner loss: acquire lease with backoff, ensure
  room process, return `{room_pid, epoch}`.
  """
  @spec rebuild(String.t()) :: {:ok, pid(), non_neg_integer()} | {:error, term}
  def rebuild(wire_room_id) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         key = RoomKey.from_room(room),
         {:ok, handle} <- Lease.acquire_with_backoff(key),
         {:ok, pid} <- World.ensure_room_with_lease(room, handle) do
      {:ok, pid, handle.epoch}
    end
  end
end

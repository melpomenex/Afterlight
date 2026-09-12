defmodule Afterlight.World.PlaceDirectory do
  @moduledoc """
  Bounded, truthful public place summaries for the Places selector
  (add-social-place-framework D8, task 3.3).

  A snapshot maps every PUBLIC manifest entry (the boot-validated
  `Afterlight.World.PlaceDefinitions` projection) to the occupancy of its
  live room:

    * occupancy counts unique roster identities in the authoritative
      `RoomServer` roster — the requester is included when present, a
      superseded duplicate connection never counts twice (the roster keys
      membership by `player_id`);
    * zero is reported ONLY for a locally-known public room with no live
      process — the lookup never starts a room;
    * an owner that cannot be read before the deadline (stuck/crashing
      room), or a room owned by a remote node when multi-node routing is
      enabled, is `null` — occupancy is never fabricated, and remote
      owners are never inferred by summing local registries.

  Bounds: at most 64 entries, one read per room capped at 100 ms with 4
  concurrent readers under the world `TaskSupervisor`, a 500 ms total
  deadline (overdue work is brutally killed), and a 16 KiB reply budget —
  entries that would not fit are omitted rather than truncated mid-entry.
  Snapshots are read-only projections: no second roster, no occupancy
  database, no capacity policy.
  """

  alias Afterlight.World
  alias Afterlight.World.{PlaceDefinitions, RoomServer, Rooms}

  @max_entries 64
  @max_reply_bytes 16 * 1024
  # Envelope allowance: requestId (≤64) + serverNow + JSON framing, so the
  # entries budget keeps the WHOLE response under the cap.
  @envelope_allowance 512
  @read_timeout_ms 100
  @total_deadline_ms 500
  @read_concurrency 4

  @type occupancy :: non_neg_integer() | nil
  @type entry :: %{required(String.t()) => term}

  @doc """
  Computes one bounded snapshot over the public projection, in manifest
  order. Never raises and never starts rooms; any unreadable room becomes
  `null`.
  """
  @spec snapshot() :: [entry()]
  def snapshot do
    places = public_entries() |> Enum.take(@max_entries)
    deadline = System.monotonic_time(:millisecond) + @total_deadline_ms

    occupancies = read_occupancies(Enum.map(places, & &1["id"]), deadline)

    places
    |> Enum.zip(occupancies)
    |> Enum.map(fn {place, occupancy} -> build_entry(place, occupancy) end)
    |> cap_reply_bytes()
  end

  @doc """
  Computes a snapshot under the world TaskSupervisor and delivers
  `{:place_directory_snapshot, request_id, entries}` to `reply_to`. The
  read is fully bounded (500 ms deadline), so it can never block the
  channel — and a failure here never blocks travel or joins.
  """
  @spec request(pid(), term) :: :ok | {:error, :read_unavailable}
  def request(reply_to, request_id) when is_pid(reply_to) do
    case Task.Supervisor.start_child(Afterlight.World.TaskSupervisor, fn ->
           send(reply_to, {:place_directory_snapshot, request_id, snapshot()})
         end) do
      {:ok, _pid} -> :ok
      {:error, _} -> {:error, :read_unavailable}
    end
  end

  @doc "Entry budget: the maximum public entries a snapshot may carry."
  @spec max_entries() :: pos_integer()
  def max_entries, do: @max_entries

  ## Internals

  # The projection is the only entry source (D8: read the projection only).
  # The `:place_entries` world-config override exists for tests and
  # deployment pinning; it is read at call time like every World knob and
  # is subject to the same bounds.
  defp public_entries do
    case World.config(:place_entries) do
      entries when is_list(entries) -> entries
      _ -> PlaceDefinitions.all()
    end
  end

  defp read_occupancies(room_ids, deadline) do
    room_ids
    |> Enum.chunk_every(@read_concurrency)
    |> Enum.flat_map(&read_chunk(&1, deadline))
  end

  # At most @read_concurrency reads in flight; each capped at 100 ms, and
  # never past the total deadline. Timed-out work is cancelled (brutal
  # kill); its entry is unknown, never zero.
  defp read_chunk(room_ids, deadline) do
    remaining = deadline - System.monotonic_time(:millisecond)

    if remaining <= 0 do
      Enum.map(room_ids, fn _ -> nil end)
    else
      room_ids
      |> Enum.map(&read_task/1)
      |> Enum.map(fn task ->
        case Task.yield(task, min(@read_timeout_ms, remaining)) do
          {:ok, occupancy} -> occupancy
          {:exit, _reason} -> nil
          nil ->
            Task.shutdown(task, :brutal_kill)
            nil
        end
      end)
    end
  end

  defp read_task(room_id) do
    Task.Supervisor.async_nolink(Afterlight.World.TaskSupervisor, fn ->
      occupancy(room_id)
    end)
  end

  defp occupancy(room_id) do
    if World.config(:multi_node_enabled, false) do
      routed_occupancy(room_id)
    else
      # Supported single-node topology: the local registry IS the owner
      # map. Absent room = zero; nothing is started by this lookup.
      local_occupancy(room_id)
    end
  end

  # Multi-node: resolve the real owner through the lease directory; a
  # remote or unresolvable owner is unknown — never a local guess.
  defp routed_occupancy(room_id) do
    case Afterlight.World.Directory.route(room_id) do
      {:ok, {:local, _epoch}} -> local_occupancy(room_id)
      _other -> nil
    end
  end

  defp local_occupancy(room_id) do
    with {:ok, %{kind: :public}} <- Rooms.resolve(room_id),
         [{pid, _}] <- Registry.lookup(Afterlight.World.Registry, {RoomServer, room_id}),
         %{roster_size: size} <- RoomServer.stats(pid) do
      size
    else
      # No live process for a known public room.
      [] -> 0
      _ -> nil
    end
  end

  defp build_entry(place, occupancy) do
    activities = Afterlight.Activities.list_public_summaries(place["id"])

    entry = %{
      "roomId" => place["id"],
      "occupancy" => occupancy,
      "observedAt" => if(is_integer(occupancy), do: System.system_time(:millisecond), else: nil),
      "activities" => activities
    }

    case atmosphere_label(place) do
      nil -> entry
      label -> Map.put(entry, "atmosphereLabel", label)
    end
  end

  # Static metadata only in change A (D8): a known preset key from the
  # projection; absent presets stay absent rather than inventing a label.
  defp atmosphere_label(%{"atmosphere" => %{"preset" => preset}}) when is_binary(preset), do: preset
  defp atmosphere_label(_place), do: nil

  # The committed projection cannot exceed the budget (≤64 tiny entries,
  # enforced at boot), but an overridden configuration could: drop the
  # trailing entries that would not fit instead of emitting an oversized
  # response. Every kept entry stays whole.
  defp cap_reply_bytes(entries) do
    budget = @max_reply_bytes - @envelope_allowance

    {kept, _size} =
      Enum.reduce_while(entries, {[], 0}, fn entry, {acc, size} ->
        entry_size = byte_size(Jason.encode!(entry))

        if size + entry_size > budget do
          {:halt, {acc, size}}
        else
          {:cont, {[entry | acc], size + entry_size}}
        end
      end)

    Enum.reverse(kept)
  end
end

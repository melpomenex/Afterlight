defmodule Afterlight.World do
  @moduledoc """
  The world room runtime (P3, `add-world-room-runtime`): supervised,
  single-writer ownership of transient world state — room membership,
  movement, presence, emotes — in per-room `RoomServer` processes instead
  of Maps inside the Node server.

  What this module does NOT own (deliberate, design D6/D7): all durable
  domains (Node until P4–P6), the chat relay (Node until the P7
  `add-social-chat-relay` flip), and weather (Node builds `welcome.weather`
  and broadcasts `weather_update` until the P6 group flip — this runtime
  keeps relaying Node's weather frames unsuppressed).

  Transient means transient: rooms, rosters, poses, and emote cooldowns
  are process memory only. No PostgreSQL writes, no persistence of any
  kind (runtime.md).
  """

  alias Afterlight.World.{Lease, Movement, RoomKey, RoomServer, Rooms}

  @doc """
  Config accessor (`config :afterlight, :world`), read at call time so
  tests and deployments can override. Keys:

    * `flush_interval_ms` — movement flush tick (default 100, Node parity)
    * `empty_room_grace_ms` — empty-room stop delay (default 60_000)
    * `outbound_queue_max` — per-transport channel mailbox ceiling before
      a stalled consumer is disconnected (design D3d)
  """
  @spec config(atom, term) :: term
  def config(key, default \\ nil) do
    :afterlight
    |> Application.get_env(:world, [])
    |> Keyword.get(key, default)
  end

  @doc """
  Joins `wire_room_id` (the exact client string) for `player_id` on the
  connection identified by `conn_ref` (design D8). Starts the room
  lazily; joins during room startup are serialized through the
  DynamicSupervisor so a joiner is never dropped.

  Returns `{:ok, room_pid, roster_frame}` — the caller pushes the roster
  to the joiner BEFORE forwarding `join_room` to the Node shadow session
  (design D6 ordering).
  """
  @spec join(String.t(), String.t(), term, pid, String.t() | nil, Movement.pose() | nil) ::
          {:ok, pid, %{String.t() => term}} | {:error, term}
  def join(wire_room_id, player_id, conn_ref, channel_pid, nickname, pose \\ nil) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         {:ok, pid} <- ensure_room(room) do
      attrs = %{
        player_id: player_id,
        conn_ref: conn_ref,
        channel_pid: channel_pid,
        nickname: nickname,
        pose: pose || default_pose()
      }

      case RoomServer.join(pid, attrs) do
        {:ok, roster} -> {:ok, pid, roster}
        error -> error
      end
    end
  end

  @doc """
  Leaves a room for a specific connection. `reason` is telemetry metadata
  only (`:travel | :disconnect | :stalled`). A stale connection's leave
  for a superseded identity is a no-op (design D8).
  """
  @spec leave(String.t() | nil, String.t(), term, atom) :: :ok
  def leave(wire_room_id, player_id, conn_ref, reason \\ :travel)

  def leave(nil, _player_id, _conn_ref, _reason), do: :ok

  def leave(wire_room_id, player_id, conn_ref, reason) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         [{pid, _}] <- Registry.lookup(registry(), {RoomServer, room.wire_id}) do
      RoomServer.leave(pid, player_id, conn_ref, reason)
    end

    :ok
  end

  @doc "Validated movement write for the member's current room (invalid input dropped)."
  @spec movement(String.t() | nil, String.t(), term, map) :: :ok
  def movement(nil, _player_id, _conn_ref, _payload), do: :ok

  def movement(wire_room_id, player_id, conn_ref, payload) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         [{pid, _}] <- Registry.lookup(registry(), {RoomServer, room.wire_id}) do
      RoomServer.movement(pid, player_id, conn_ref, payload)
    end

    :ok
  end

  @doc "Emote with allow-list + 500 ms per-connection cooldown; rejected silently."
  @spec emote(String.t() | nil, String.t(), term, term) :: :ok
  def emote(nil, _player_id, _conn_ref, _emote), do: :ok

  def emote(wire_room_id, player_id, conn_ref, emote) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         [{pid, _}] <- Registry.lookup(registry(), {RoomServer, room.wire_id}) do
      RoomServer.emote(pid, player_id, conn_ref, emote)
    end

    :ok
  end

  @doc """
  Nickname refresh (after a successful `set_nickname`) so roster entries,
  later joins' rosters, and `emote_broadcast` nicknames read live — the
  Node baseline reads `player.nickname` at emit time, and a stale name
  after a mid-session rename would be an undeclared parity failure.
  """
  @spec update_nickname(String.t() | nil, String.t(), String.t() | nil) :: :ok
  def update_nickname(nil, _player_id, _nickname), do: :ok

  def update_nickname(wire_room_id, player_id, nickname) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         [{pid, _}] <- Registry.lookup(registry(), {RoomServer, room.wire_id}) do
      RoomServer.update_nickname(pid, player_id, nickname)
    end

    :ok
  end

  @doc """
  Live membership check for a specific connection. While the world domain
  is routed to the runtime, the gateway refuses durable domain commands
  for a transport whose membership is not live (crash window) rather than
  letting Node's shadow `currentRoom` authorize actions for a player no
  room owns — room membership has one authority at every instant.
  """
  @spec member?(String.t() | nil, String.t(), term) :: boolean
  def member?(nil, _player_id, _conn_ref), do: false

  def member?(wire_room_id, player_id, conn_ref) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         [{pid, _}] <- Registry.lookup(registry(), {RoomServer, room.wire_id}) do
      RoomServer.member?(pid, player_id, conn_ref)
    else
      _ -> false
    end
  end

  @doc "Push a domain frame to every live member of a wire room."
  @spec broadcast_frame(String.t(), map()) :: :ok
  def broadcast_frame(wire_room_id, frame) when is_binary(wire_room_id) and is_map(frame) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         [{pid, _}] <- Registry.lookup(registry(), {RoomServer, room.wire_id}) do
      RoomServer.broadcast_frame(pid, frame)
    end

    :ok
  end

  def broadcast_frame(_wire_room_id, _frame), do: :ok

  @doc """
  Start (or reuse) the room process under an acquired lease handle — the
  P9 owner gate completed by B task 1.1. A `nil` handle is the degraded
  admission path (the lease system was unreachable): the room runs
  un-owned (epoch-0 frames) until an owned admission adopts its handle
  into the live process. A given `Lease.Handle` is consumed verbatim —
  admission and `Successor.rebuild` successors never re-acquire against
  themselves — and a running room that already owns the row keeps its own
  handle. A lease held by ANOTHER owner refuses admission (fail closed).
  """
  @spec ensure_room_with_lease(map(), Lease.Handle.t() | nil) :: {:ok, pid()} | {:error, term}
  def ensure_room_with_lease(room, handle) do
    case Registry.lookup(registry(), {RoomServer, room.wire_id}) do
      [{pid, _}] when is_pid(pid) and handle != nil ->
        # Running room: adopt the handle when it holds none, keep its own
        # when it does (same lease row — never a second renewal loop).
        with {:ok, _epoch} <- RoomServer.install_lease(pid, handle) do
          {:ok, pid}
        end

      _ ->
        ensure_room({room, handle}, 10)
    end
  end

  @doc "Current epoch for a wire room (0 when room or fencing absent)."
  @spec epoch(String.t() | nil) :: non_neg_integer()
  def epoch(nil), do: 0

  def epoch(wire_room_id) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         [{pid, _}] <- Registry.lookup(registry(), {RoomServer, room.wire_id}),
         true <- function_exported?(RoomServer, :epoch, 1) do
      RoomServer.epoch(pid)
    else
      _ -> 0
    end
  end

  # Bounded lease SQL at the admission seam: a stalled database degrades
  # the join quickly (un-owned room) instead of stalling it.
  @lease_query_timeout_ms 2_000

  defp ensure_room(room) do
    # Admission acquires the room's existing lease ONCE, in the joiner's
    # process (P9/B 1.1 owner gate): one SQL statement per join that
    # starts or re-owns a room — never per tick or per frame.
    case Lease.acquire(RoomKey.from_room(room), timeout: config(:lease_query_timeout_ms, @lease_query_timeout_ms)) do
      {:ok, handle} ->
        ensure_room_with_lease(room, handle)

      # Another owner holds the room: fail closed (retryable
      # room_unavailable for the joiner; the existing failover — expiry
      # then Successor backoff — owns recovery). Unreachable while
      # multi-node stays gated (every local claimant shares owner_node).
      {:error, {:held_by, holder}} ->
        {:error, {:lease_denied, holder}}

      {:error, :acquire_race} ->
        {:error, :lease_denied}

      # Lease system unavailable (database down / unmigrated): keep
      # today's transient availability by admitting an UN-OWNED room —
      # frames carry the epoch-0 wire default and no renewal runs. This
      # is a degraded room, not a claimed epoch; the next owned join
      # adopts a real handle.
      {:error, _lease_unavailable} ->
        ensure_room({room, nil}, 10)
    end
  end

  # Serialized room startup (design D2): the Registry lookup is the
  # serialization point. Races are possible against a room mid-restart
  # (crash recovery, D9) — a lookup can momentarily miss, a start can hit
  # an in-flight registration, or the "winner" can already be dead — so
  # every lost race retries the whole lookup a bounded number of times.
  defp ensure_room(_spec, 0), do: {:error, :room_unavailable}

  defp ensure_room({room, _handle} = spec, attempts) do
    case Registry.lookup(registry(), {RoomServer, room.wire_id}) do
      [{pid, _}] ->
        if Process.alive?(pid), do: {:ok, pid}, else: retry(spec, attempts)

      [] ->
        case DynamicSupervisor.start_child(dynamic_supervisor(), {RoomServer, spec}) do
          {:ok, pid} ->
            {:ok, pid}

          {:error, {:already_started, pid}} ->
            {:ok, pid}

          # Lost the init registration race. The winner is the room to use —
          # unless it died since, in which case retry from the lookup.
          {:error, {:already_registered, pid}} ->
            if Process.alive?(pid), do: {:ok, pid}, else: retry(spec, attempts)

          # Restart in flight under a reused child id.
          {:error, :already_present} ->
            retry(spec, attempts)

          # Fail-closed ownership (lease held by another claimant) and any
          # other start failure surface to the join as retryable.
          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  defp retry(spec, attempts) do
    Process.sleep(10)
    ensure_room(spec, attempts - 1)
  end

  defp registry, do: Afterlight.World.Registry
  defp dynamic_supervisor, do: Afterlight.World.DynamicSupervisor

  defp default_pose do
    # The client renders an absent pose as origin (`data.x ?? 0` in
    # src/render/avatars.js), so members start at the origin pose and
    # movement overwrites in place.
    %{x: 0.0, z: 0.0, rot_y: 0.0, walking: false, sitting: false, airborne: false}
  end
end

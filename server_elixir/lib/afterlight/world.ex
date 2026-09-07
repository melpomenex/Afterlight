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

  alias Afterlight.World.{Movement, RoomServer, Rooms}

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

  defp ensure_room(room) do
    ensure_room(room, 10)
  end

  # Serialized room startup (design D2): the Registry lookup is the
  # serialization point. Races are possible against a room mid-restart
  # (crash recovery, D9) — a lookup can momentarily miss, a start can hit
  # an in-flight registration, or the "winner" can already be dead — so
  # every lost race retries the whole lookup a bounded number of times.
  defp ensure_room(_room, 0), do: {:error, :room_unavailable}

  defp ensure_room(room, attempts) do
    case Registry.lookup(registry(), {RoomServer, room.wire_id}) do
      [{pid, _}] ->
        if Process.alive?(pid), do: {:ok, pid}, else: retry(room, attempts)

      [] ->
        case DynamicSupervisor.start_child(dynamic_supervisor(), {RoomServer, room}) do
          {:ok, pid} ->
            {:ok, pid}

          {:error, {:already_started, pid}} ->
            {:ok, pid}

          # Lost the init registration race. The winner is the room to use —
          # unless it died since, in which case retry from the lookup.
          {:error, {:already_registered, pid}} ->
            if Process.alive?(pid), do: {:ok, pid}, else: retry(room, attempts)

          # Restart in flight under a reused child id.
          {:error, :already_present} ->
            retry(room, attempts)

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  defp retry(room, attempts) do
    Process.sleep(10)
    ensure_room(room, attempts - 1)
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

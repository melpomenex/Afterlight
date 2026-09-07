defmodule Afterlight.World.Rooms do
  @moduledoc """
  Pure bidirectional mapping between internal room identity and the exact
  wire room-id strings (design D1, task 1.2).

  Wire ids are the compatibility surface: clients join with today's exact
  strings — `"market"`, `"theater"`, `` `"garden:<playerId>" ``, `"foundry"`,
  `"trestle"`, `"frost-spire"` — and every payload keeps today's shapes.
  Internally a room is the tuple `{district_id, instance_id}` with
  `instance_id = "main"` for public rooms and `{"garden", player_id}` for
  personal gardens; the tuple isolates the P4 identity decision from the
  wire convention (D1).

  Node accepts any non-empty room string (rooms are open — protocol-catalog
  §2 "any string accepted"), so any non-garden string resolves as a public
  district room. Only non-string / falsy ids are refused (`:error`); the
  `fallback/0` helper gives callers Node's `msg.roomId || 'market'`
  behavior explicitly.

  This module is pure except `leave_all/2`, which is the channel-down
  sweep API (task 6.1): it enumerates the live room processes from the
  world Registry and asks each to drop the member whose channel process
  is `member_pid` — the same closure the per-room DOWN monitor performs,
  available to the gateway as an explicit, idempotent call.
  """

  alias Afterlight.World.RoomServer

  @garden_prefix "garden:"
  @fallback "market"

  @typedoc "Internal room identity: {district_id, instance_id} (D1)."
  @type key :: {String.t(), String.t()}

  @typedoc "Resolved room: the identity plus its exact wire id."
  @type room :: %{
          required(:district) => String.t(),
          required(:instance) => String.t(),
          required(:wire_id) => String.t(),
          required(:kind) => :public | :garden
        }

  @doc "The known public wire ids (the `\"main\"` instance of each district)."
  @spec public_wire_ids() :: [String.t(), ...]
  def public_wire_ids, do: ["market", "theater", "foundry", "trestle", "frost-spire"]

  @doc "Node's falsy-roomId fallback: `" <> @fallback <> "`."
  @spec fallback() :: room()
  def fallback, do: resolve!(@fallback)

  @doc "The fallback as an internal key ({\"" <> @fallback <> "\", \"main\"})."
  @spec fallback_key() :: key()
  def fallback_key, do: {"market", "main"}

  @doc """
  Resolves a wire room id (as sent by the client, possibly absent) to the
  internal room identity. `nil`/empty/`false` → the `"market"` fallback
  (Node's `msg.roomId || 'market'`); `garden:<owner>` → the garden room;
  any other string → a public district room; anything else → `:error`.
  """
  @spec resolve(term) :: {:ok, room()} | :error
  def resolve(id)

  def resolve(nil), do: {:ok, public(@fallback)}
  def resolve(""), do: {:ok, public(@fallback)}
  def resolve(false), do: {:ok, public(@fallback)}

  def resolve(id) when is_binary(id) do
    prefix_size = byte_size(@garden_prefix)

    if String.starts_with?(id, @garden_prefix) and byte_size(id) > prefix_size do
      owner = binary_part(id, prefix_size, byte_size(id) - prefix_size)
      {:ok, %{district: "garden", instance: owner, wire_id: id, kind: :garden}}
    else
      {:ok, public(id)}
    end
  end

  def resolve(_other), do: :error

  @doc "Bang variant of `resolve/1` (raises on non-string ids)."
  @spec resolve!(term) :: room()
  def resolve!(id) do
    case resolve(id) do
      {:ok, room} -> room
      :error -> raise ArgumentError, "unknown room id: #{inspect(id)}"
    end
  end

  @doc "The internal key of a resolved room (or of anything `resolve/1` accepts)."
  @spec key(room() | term) :: {:ok, key()} | :error
  def key(%{district: district, instance: instance}), do: {:ok, {district, instance}}

  def key(id) do
    case resolve(id) do
      {:ok, room} -> {:ok, {room.district, room.instance}}
      :error -> :error
    end
  end

  @doc """
  The exact wire id for an internal key. Public rooms map
  identity-to-id (`{"market", "main"}` → `"market"`); gardens map to
  `` `"garden:<playerId>" `` (`{"garden", id}` → `"garden:<id>"`).
  Unknown keys (non-string district, non-`"main"` instance on a public
  district) → `:error`.
  """
  @spec to_wire(key()) :: {:ok, String.t()} | :error
  def to_wire({district, "main"}) when is_binary(district), do: {:ok, district}
  def to_wire({"garden", owner}) when is_binary(owner) and owner != "", do: {:ok, @garden_prefix <> owner}
  def to_wire(_other), do: :error

  @doc "Wire id → internal key. Same semantics as `resolve/1`."
  @spec to_key(term) :: {:ok, key()} | :error
  def to_key(id) do
    case resolve(id) do
      {:ok, room} -> {:ok, {room.district, room.instance}}
      :error -> :error
    end
  end

  @doc """
  Channel-down sweep (task 6.1): every live room drops the member whose
  channel process is `member_pid`, emitting one `presence_leave` per room
  that actually held them (no-op for rooms that did not). Idempotent;
  used by the gateway when a transport dies outside the room monitor's
  reach. Room calls fan out concurrently under the world TaskSupervisor
  so one stuck room cannot delay the sweep.
  """
  @spec leave_all(pid, atom) :: :ok
  def leave_all(member_pid, reason \\ :disconnect) when is_pid(member_pid) do
    tasks =
      room_pids()
      |> Enum.map(fn room_pid ->
        Task.Supervisor.async_nolink(Afterlight.World.TaskSupervisor, RoomServer, :leave_for_member, [
          room_pid,
          member_pid,
          reason
        ])
      end)

    Enum.each(tasks, fn task ->
      case Task.yield(task, 5_000) do
        {:ok, _} -> :ok
        _ -> Task.shutdown(task, :brutal_kill)
      end
    end)

    :ok
  end

  @doc false
  @spec room_pids() :: [pid]
  def room_pids do
    # Room processes are Registry-named {Afterlight.World.RoomServer, wire_id}
    # via-tuples, and a via registration stores the process pid itself as
    # the registry value. Registry entries are `{key, pid, value}` tuples
    # and a select head may only match the key position with `:_` or a
    # bound variable (tuple shapes there are not match-spec heads), so the
    # key shape is filtered with guards: capture {key, pid}, keep entries
    # whose key is a 2-tuple tagged Afterlight.World.RoomServer whose value
    # is a pid, return the pids.
    Registry.select(Afterlight.World.Registry, [
      {{:"$1", :"$2", :_},
       [
         {:==, {:tuple_size, :"$1"}, 2},
         {:==, {:element, 1, :"$1"}, Afterlight.World.RoomServer},
         {:is_pid, :"$2"}
       ], [:"$2"]}
    ])
  end

  defp public(id), do: %{district: id, instance: "main", wire_id: id, kind: :public}
end

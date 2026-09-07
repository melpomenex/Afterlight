defmodule Afterlight.World.Directory do
  @moduledoc """
  Short-TTL gateway view of `room_leases` (design D3, directory TTL 5 s).

  Gateways consult the directory before routing room messages; expired
  owners are not returned. Presence/Registry are never used for ownership.
  """

  use GenServer

  import Ecto.Query

  alias Afterlight.Repo
  alias Afterlight.World
  alias Afterlight.World.Lease.RoomLease

  @table :afterlight_room_directory
  @ttl_ms 5_000

  defstruct []

  ## Client

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "Lookup the current lease holder for a room key."
  @spec lookup(String.t()) :: {:ok, map()} | {:error, :not_found | :expired}
  def lookup(room_key) do
    GenServer.call(__MODULE__, {:lookup, room_key})
  end

  @doc """
  Route decision for a wire room id. Returns `{:local, epoch}` when this
  node should serve the room, `{:remote, node, epoch}` otherwise, or an
  error when no valid holder exists.
  """
  @spec route(String.t()) :: {:ok, {:local, non_neg_integer()} | {:remote, String.t(), non_neg_integer()}} | {:error, term}
  def route(wire_room_id) do
    GenServer.call(__MODULE__, {:route, wire_room_id})
  end

  @doc "Invalidate cached entry (tests, post-acquire)."
  @spec invalidate(String.t()) :: :ok
  def invalidate(room_key) do
    GenServer.cast(__MODULE__, {:invalidate, room_key})
  end

  ## Callbacks

  @impl true
  def init(_opts) do
    :ets.new(@table, [:named_table, :set, :protected, read_concurrency: true])
    {:ok, %__MODULE__{}}
  end

  @impl true
  def handle_call({:lookup, room_key}, _from, state) do
    {:reply, fetch(room_key), state}
  end

  def handle_call({:route, wire_room_id}, _from, state) do
    reply =
      with {:ok, key} <- Afterlight.World.RoomKey.from_wire(wire_room_id),
           {:ok, row} <- fetch(key.room_key) do
        if row.owner_node == Afterlight.World.Lease.owner_node() do
          {:ok, {:local, row.epoch}}
        else
          {:ok, {:remote, row.owner_node, row.epoch}}
        end
      end

    {:reply, reply, state}
  end

  @impl true
  def handle_cast({:invalidate, room_key}, state) do
    :ets.delete(@table, room_key)
    {:noreply, state}
  end

  defp fetch(room_key) do
    now = System.monotonic_time(:millisecond)

    case :ets.lookup(@table, room_key) do
      [{^room_key, row, cached_at}] when now - cached_at < @ttl_ms ->
        if expired?(row), do: {:error, :expired}, else: {:ok, row}

      _ ->
        load_and_cache(room_key)
    end
  end

  defp load_and_cache(room_key) do
    case Repo.one(from l in RoomLease, where: l.room_key == ^room_key) do
      nil ->
        {:error, :not_found}

      %RoomLease{} = row ->
        row = %{owner_node: row.owner_node, epoch: row.epoch, expires_at: row.expires_at, room_key: row.room_key}
        :ets.insert(@table, {room_key, row, System.monotonic_time(:millisecond)})

        if expired?(row) do
          {:error, :expired}
        else
          {:ok, row}
        end
    end
  end

  defp expired?(%{expires_at: expires}) do
    case Repo.query("SELECT $1::timestamptz < now()", [expires]) do
      {:ok, %{rows: [[true]]}} -> true
      _ -> false
    end
  end
end

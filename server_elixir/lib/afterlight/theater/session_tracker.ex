defmodule Afterlight.Theater.SessionTracker do
  @moduledoc """
  Tracks the last delivered `(revision, generation)` per session for stale
  `ended`/`failed` report rejection (design D2).
  """

  use GenServer

  @table :theater_session_delivery

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  def init(_opts) do
    :ets.new(@table, [:named_table, :set, :protected, read_concurrency: true])
    {:ok, %{}}
  end

  @doc "Stamp a session after a committed `theater_state` delivery."
  def stamp(session_key, revision, generation) do
    GenServer.call(__MODULE__, {:stamp, session_key, revision, generation})
  end

  @doc "Generation this session last saw for the room's `now` item."
  def last_generation(session_key) do
    GenServer.call(__MODULE__, {:last_generation, session_key})
  end

  def handle_call({:stamp, session_key, revision, generation}, _from, state) do
    :ets.insert(@table, {session_key, revision, generation})
    {:reply, :ok, state}
  end

  def handle_call({:last_generation, session_key}, _from, state) do
    generation =
      case :ets.lookup(@table, session_key) do
        [{_, _revision, gen}] -> gen
        [] -> 0
      end

    {:reply, generation, state}
  end

  @doc "Build a stable session key from player and connection ref."
  def session_key(player_id, conn_ref), do: {player_id, conn_ref}
end

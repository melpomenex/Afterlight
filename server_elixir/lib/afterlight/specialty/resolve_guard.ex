defmodule Afterlight.Specialty.ResolveGuard do
  @moduledoc false
  use GenServer

  alias Afterlight.Specialty
  alias Afterlight.Specialty.TorrentRules

  def start_link(opts) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  @doc """
  Attempts to acquire a resolve slot for `player_id`.

  Returns `:ok`, `{:error, :in_flight}`, `{:error, :cooldown}`, or
  `{:error, :global_cap}`.
  """
  def acquire(player_id) do
    GenServer.call(__MODULE__, {:acquire, player_id})
  end

  def release(player_id) do
    GenServer.cast(__MODULE__, {:release, player_id})
  end

  def in_flight_count do
    GenServer.call(__MODULE__, :in_flight_count)
  end

  @impl true
  def init(_opts) do
    {:ok, %{in_flight: %{}, cooldowns: %{}, global: 0}}
  end

  @impl true
  def handle_call({:acquire, player_id}, _from, state) do
    now = System.system_time(:millisecond)
    cooldown_ms = Specialty.config(:resolve_cooldown_ms, TorrentRules.resolve_cooldown_ms())
    global_cap = Specialty.config(:resolve_global_cap, 8)

    cond do
      Map.has_key?(state.in_flight, player_id) ->
        {:reply, {:error, :in_flight}, state}

      cooldown_remaining(state.cooldowns[player_id], now, cooldown_ms) > 0 ->
        {:reply, {:error, :cooldown}, state}

      state.global >= global_cap ->
        {:reply, {:error, :global_cap}, state}

      true ->
        state = %{
          state
          | in_flight: Map.put(state.in_flight, player_id, now),
            global: state.global + 1
        }

        {:reply, :ok, state}
    end
  end

  def handle_call(:in_flight_count, _from, state) do
    {:reply, map_size(state.in_flight), state}
  end

  @impl true
  def handle_cast({:release, player_id}, state) do
    now = System.system_time(:millisecond)
    cooldown_ms = Specialty.config(:resolve_cooldown_ms, TorrentRules.resolve_cooldown_ms())

    state =
      if Map.has_key?(state.in_flight, player_id) do
        %{
          state
          | in_flight: Map.delete(state.in_flight, player_id),
            global: max(0, state.global - 1),
            cooldowns: Map.put(state.cooldowns, player_id, now + cooldown_ms)
        }
      else
        state
      end

    {:noreply, state}
  end

  defp cooldown_remaining(nil, _now, _ms), do: 0

  defp cooldown_remaining(expires_at, now, _ms) when expires_at > now, do: expires_at - now
  defp cooldown_remaining(_expires_at, _now, _ms), do: 0
end

defmodule Afterlight.Theater.PlaylistResolve do
  @moduledoc """
  Interactive playlist resolve guards (design D3) plus Oban enqueue.

  Per-player in-flight and cooldown semantics match Node; the bounded
  fetch runs in `PlaylistFetchWorker` (unique per theater room).
  """

  use GenServer

  alias Afterlight.Theater.PlaylistFetchWorker

  @cooldown_ms 10_000
  @theater_room "theater"

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  def init(_opts), do: {:ok, %{in_flight: MapSet.new(), cooldowns: %{}}}

  def check_in_flight(player_id), do: GenServer.call(__MODULE__, {:check_in_flight, player_id})

  def check_cooldown(player_id), do: GenServer.call(__MODULE__, {:check_cooldown, player_id})

  def decline_mix(list_id) do
    if mix_id?(list_id), do: {:error, "is_mix"}, else: :ok
  end

  def mark_started(player_id), do: GenServer.cast(__MODULE__, {:started, player_id})

  def mark_finished(player_id), do: GenServer.cast(__MODULE__, {:finished, player_id})

  @doc "Enqueue the bounded Oban fetch for a theater room."
  def enqueue(request_id, list_id, player_id, room_key \\ @theater_room) do
    PlaylistFetchWorker.enqueue(room_key, request_id, list_id, player_id)
  end

  def mix_id?(list_id) do
    String.match?(to_string(list_id || ""), ~r/^(RD|UL)/)
  end

  def handle_call({:check_in_flight, player_id}, _from, state) do
    reply =
      if MapSet.member?(state.in_flight, player_id),
        do: {:error, "resolve_in_flight"},
        else: :ok

    {:reply, reply, state}
  end

  def handle_call({:check_cooldown, player_id}, _from, state) do
    last = Map.get(state.cooldowns, player_id, 0)
    now = System.system_time(:millisecond)

    reply =
      if now - last < @cooldown_ms,
        do: {:error, "resolve_cooldown"},
        else: :ok

    {:reply, reply, state}
  end

  def handle_cast({:started, player_id}, state) do
    now = System.system_time(:millisecond)

    {:noreply,
     %{
       state
       | in_flight: MapSet.put(state.in_flight, player_id),
         cooldowns: Map.put(state.cooldowns, player_id, now)
     }}
  end

  def handle_cast({:finished, player_id}, state) do
    {:noreply, %{state | in_flight: MapSet.delete(state.in_flight, player_id)}}
  end
end

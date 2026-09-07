defmodule Afterlight.World.Drain do
  @moduledoc """
  Bounded deploy drain (design D7): draining nodes reject new room
  allocations; existing rooms finish within lease-expiry-bounded grace.
  """

  use GenServer

  alias Afterlight.World

  @drain_deadline_ms 15_000

  defstruct draining: false, since: nil

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "Mark this node as draining (no new room allocations)."
  @spec start_drain() :: :ok
  def start_drain, do: GenServer.call(__MODULE__, :start_drain)

  @doc "Clear drain state (tests / rollback)."
  @spec clear() :: :ok
  def clear, do: GenServer.call(__MODULE__, :clear)

  @doc "Whether new room allocations are accepted on this node."
  @spec accepts_allocations?() :: boolean
  def accepts_allocations? do
    GenServer.call(__MODULE__, :accepts_allocations?)
  end

  @doc "True when drain deadline has passed."
  @spec deadline_passed?() :: boolean
  def deadline_passed? do
    GenServer.call(__MODULE__, :deadline_passed?)
  end

  @impl true
  def init(_opts) do
    {:ok, %__MODULE__{}}
  end

  @impl true
  def handle_call(:start_drain, _from, state) do
    {:reply, :ok, %{state | draining: true, since: System.monotonic_time(:millisecond)}}
  end

  def handle_call(:clear, _from, _state) do
    {:reply, :ok, %__MODULE__{}}
  end

  def handle_call(:accepts_allocations?, _from, state) do
    {:reply, not state.draining, state}
  end

  def handle_call(:deadline_passed?, _from, state) do
    passed =
      state.draining and state.since != nil and
        System.monotonic_time(:millisecond) - state.since >= drain_deadline_ms()

    {:reply, passed, state}
  end

  defp drain_deadline_ms do
    World.config(:drain_deadline_ms, @drain_deadline_ms)
  end
end

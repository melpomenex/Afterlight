defmodule Afterlight.Specialty.CircuitBreaker do
  @moduledoc false
  use GenServer

  @default_threshold 3
  @default_reset_ms 30_000

  def start_link(opts) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def allow?(breaker \\ __MODULE__) do
    GenServer.call(breaker, :allow?)
  end

  def record_success(breaker \\ __MODULE__) do
    GenServer.cast(breaker, :success)
  end

  def record_failure(breaker \\ __MODULE__) do
    GenServer.cast(breaker, :failure)
  end

  def state(breaker \\ __MODULE__) do
    GenServer.call(breaker, :state)
  end

  @impl true
  def init(opts) do
    {:ok,
     %{
       status: :closed,
       failures: 0,
       opened_at: nil,
       threshold: Keyword.get(opts, :threshold, @default_threshold),
       reset_ms: Keyword.get(opts, :reset_ms, @default_reset_ms)
     }}
  end

  @impl true
  def handle_call(:allow?, _from, %{status: :closed} = state) do
    {:reply, :ok, state}
  end

  def handle_call(:allow?, _from, %{status: :open, opened_at: opened_at, reset_ms: reset_ms} = state) do
    if monotonic_ms() - opened_at >= reset_ms do
      {:reply, :ok, %{state | status: :half_open}}
    else
      {:reply, {:error, :open}, state}
    end
  end

  def handle_call(:allow?, _from, %{status: :half_open} = state) do
    {:reply, :ok, state}
  end

  def handle_call(:state, _from, state), do: {:reply, state.status, state}

  @impl true
  def handle_cast(:success, state) do
    {:noreply, %{state | status: :closed, failures: 0, opened_at: nil}}
  end

  def handle_cast(:failure, %{status: :half_open} = state) do
    {:noreply, %{state | status: :open, failures: state.threshold, opened_at: monotonic_ms()}}
  end

  def handle_cast(:failure, %{failures: failures, threshold: threshold} = state) do
    failures = failures + 1

    state =
      if failures >= threshold do
        %{state | status: :open, failures: failures, opened_at: monotonic_ms()}
      else
        %{state | failures: failures}
      end

    {:noreply, state}
  end

  defp monotonic_ms, do: System.monotonic_time(:millisecond)
end

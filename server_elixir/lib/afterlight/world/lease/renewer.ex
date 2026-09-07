defmodule Afterlight.World.Lease.Renewer do
  @moduledoc """
  Per-room lease renewal loop (design D1: interval well under TTL, jittered).
  On failed renewal the room owner is fenced via `{:lease_fenced, reason}`.
  """
  use GenServer

  alias Afterlight.World
  alias Afterlight.World.Lease

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  @impl true
  def init(opts) do
    room_pid = Keyword.fetch!(opts, :room_pid)
    handle = Keyword.fetch!(opts, :handle)
    Process.monitor(room_pid)
    schedule_tick()
    {:ok, %{room_pid: room_pid, handle: handle}}
  end

  @impl true
  def handle_info(:tick, %{room_pid: room_pid, handle: handle} = state) do
    case Lease.renew(handle) do
      {:ok, new_handle} ->
        send(room_pid, {:lease_renewed, new_handle})
        schedule_tick()
        {:noreply, %{state | handle: new_handle}}

      {:error, :fenced} ->
        fenced = Lease.fence(handle)
        send(room_pid, {:lease_fenced, :renewal_rejected})
        {:noreply, %{state | handle: fenced}}
    end
  end

  def handle_info({:DOWN, _ref, :process, pid, _reason}, %{room_pid: pid}) do
    {:stop, :normal, nil}
  end

  def handle_info(_msg, state) do
    schedule_tick()
    {:noreply, state}
  end

  defp schedule_tick do
    base = Lease.renew_interval_ms()
    jitter = :rand.uniform(div(base, 2))
    Process.send_after(self(), :tick, base + jitter)
  end
end

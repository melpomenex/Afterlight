defmodule Afterlight.Specialty.StatusRelay do
  @moduledoc false
  use GenServer
  require Logger

  alias Afterlight.Specialty
  alias Afterlight.Specialty.{BillSource, ResolveGuard, TorrentSidecar, TorrentRules}
  alias Afterlight.World.RoomServer

  @theater TorrentRules.theater_wire_id()

  def start_link(opts) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  @impl true
  def init(_opts) do
    {:ok, %{timer: nil}, {:continue, :arm}}
  end

  @impl true
  def handle_continue(:arm, state) do
    {:noreply, schedule(state)}
  end

  @impl true
  def handle_info(:tick, state) do
    if relevant?() do
      broadcast_status()
    end

    {:noreply, schedule(state)}
  end

  defp relevant? do
    ResolveGuard.in_flight_count() > 0 or BillSource.torrent_infohashes() != []
  end

  defp broadcast_status do
    case TorrentSidecar.status() do
      {:ok, items} ->
        frame = %{"type" => "torrent_state", "items" => items}

        case Registry.lookup(Afterlight.World.Registry, {RoomServer, @theater}) do
          [{pid, _}] -> RoomServer.broadcast_frame(pid, frame)
          [] -> :ok
        end

      {:error, reason} ->
        Logger.debug("specialty status_relay skipped reason=#{reason}")
    end
  end

  defp schedule(state) do
    if state.timer, do: Process.cancel_timer(state.timer)
    interval = Specialty.config(:status_interval_ms, 2_000)
    ref = Process.send_after(self(), :tick, interval)
    %{state | timer: ref}
  end
end

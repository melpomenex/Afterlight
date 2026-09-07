defmodule Afterlight.Specialty.BillSync do
  @moduledoc false
  use GenServer
  require Logger

  alias Afterlight.Specialty.BillSource
  alias Afterlight.Specialty.TorrentSidecar

  @default_interval_ms 30_000

  def start_link(opts) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  @doc "Re-read the bill and push the exempt set immediately."
  def sync_now do
    GenServer.cast(__MODULE__, :sync)
  end

  @doc "Test hook: replace the last pushed set without HTTP."
  def last_pushed do
    GenServer.call(__MODULE__, :last_pushed)
  end

  @impl true
  def init(opts) do
    interval = Keyword.get(opts, :interval_ms, @default_interval_ms)
    state = %{interval_ms: interval, last: [], timer: nil}
    {:ok, schedule_sync(state, 0)}
  end

  @impl true
  def handle_call(:last_pushed, _from, state) do
    {:reply, state.last, state}
  end

  @impl true
  def handle_cast(:sync, state) do
    {:noreply, do_sync(state)}
  end

  @impl true
  def handle_info(:sync_tick, state) do
    {:noreply, do_sync(state)}
  end

  defp do_sync(state) do
    infohashes = BillSource.torrent_infohashes() |> Enum.sort()

    if infohashes != state.last do
      case TorrentSidecar.push_exempt(infohashes) do
        :ok ->
          Logger.info("specialty bill_sync pushed exempt_count=#{length(infohashes)}")

        {:error, reason} ->
          Logger.warning("specialty bill_sync push failed reason=#{reason}")
      end
    end

    schedule_sync(%{state | last: infohashes}, state.interval_ms)
  end

  defp schedule_sync(state, delay_ms) do
    if state.timer, do: Process.cancel_timer(state.timer)
    ref = Process.send_after(self(), :sync_tick, delay_ms)
    %{state | timer: ref}
  end
end

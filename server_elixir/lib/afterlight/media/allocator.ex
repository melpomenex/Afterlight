defmodule Afterlight.Media.Allocator do
  @moduledoc """
  Regional media worker allocator with admission control (P8 design D4).

  Responsibilities:
    * One call per worker: scaling adds workers per call and never splits one call.
    * Admission control: evaluates projected egress and maximum capacity before admitting new calls.
    * Tracks active workers and routes requests.
  """

  use GenServer
  require Logger

  alias Afterlight.Media.Worker
  alias Afterlight.Media.WorkerSupervisor

  # Standard regional egress budget per worker release node (e.g. 100 Mbps)
  @max_node_egress_bps 100_000_000

  defstruct [
    :region,
    workers: %{},
    call_to_worker: %{}
  ]

  # --- Client API ---

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "Allocate a worker for a call with admission control"
  def allocate(call_id, opts \\ []) do
    GenServer.call(__MODULE__, {:allocate, call_id, opts})
  end

  @doc "Locate worker pid for a call"
  def whereis(call_id) do
    GenServer.call(__MODULE__, {:whereis, call_id})
  end

  @doc "Release worker allocation when call closes"
  def release(call_id) do
    GenServer.call(__MODULE__, {:release, call_id})
  end

  # --- GenServer Callbacks ---

  @impl true
  def init(opts) do
    region = Keyword.get(opts, :region, "local")
    {:ok, %__MODULE__{region: region}}
  end

  @impl true
  def handle_call({:allocate, call_id, opts}, _from, state) do
    case Map.get(state.call_to_worker, call_id) do
      worker_id when is_binary(worker_id) ->
        # Already allocated to this worker
        {:reply, {:ok, %{worker_id: worker_id, region: state.region}}, state}

      nil ->
        # Run admission control check
        case check_admission(state, opts) do
          :ok ->
            worker_id = Keyword.get(opts, :worker_id, "worker-#{state.region}-#{call_id}")

            # Start worker under DynamicSupervisor
            worker_opts = [
              call_id: call_id,
              worker_id: worker_id,
              mode: Keyword.get(opts, :mode, :voice)
            ]

            case DynamicSupervisor.start_child(WorkerSupervisor, {Worker, worker_opts}) do
              {:ok, pid} ->
                Process.monitor(pid)

                new_workers = Map.put(state.workers, worker_id, %{call_id: call_id, pid: pid})
                new_c2w = Map.put(state.call_to_worker, call_id, worker_id)

                new_state = %{state | workers: new_workers, call_to_worker: new_c2w}
                {:reply, {:ok, %{worker_id: worker_id, region: state.region}}, new_state}

              {:error, {:already_started, _pid}} ->
                {:reply, {:ok, %{worker_id: worker_id, region: state.region}}, state}

              {:error, reason} ->
                {:reply, {:error, {:worker_start_failed, reason}}, state}
            end

          {:error, reason} ->
            {:reply, {:error, reason}, state}
        end
    end
  end

  @impl true
  def handle_call({:whereis, call_id}, _from, state) do
    case Map.get(state.call_to_worker, call_id) do
      nil -> {:reply, nil, state}
      worker_id ->
        case Map.get(state.workers, worker_id) do
          nil -> {:reply, nil, state}
          %{pid: pid} -> {:reply, pid, state}
        end
    end
  end

  @impl true
  def handle_call({:release, call_id}, _from, state) do
    case Map.get(state.call_to_worker, call_id) do
      nil ->
        {:reply, :ok, state}

      worker_id ->
        Worker.close_call(call_id)
        new_workers = Map.delete(state.workers, worker_id)
        new_c2w = Map.delete(state.call_to_worker, call_id)
        {:reply, :ok, %{state | workers: new_workers, call_to_worker: new_c2w}}
    end
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, pid, _reason}, state) do
    # Find matching worker that crashed/exited
    case Enum.find(state.workers, fn {_wid, info} -> info.pid == pid end) do
      {worker_id, %{call_id: call_id}} ->
        Logger.warning("Media worker #{worker_id} crashed for call #{call_id}")
        new_workers = Map.delete(state.workers, worker_id)
        new_c2w = Map.delete(state.call_to_worker, call_id)
        {:noreply, %{state | workers: new_workers, call_to_worker: new_c2w}}

      nil ->
        {:noreply, state}
    end
  end

  defp check_admission(state, opts) do
    # Projected egress = publishers * subscribers * bitrate
    projected_pubs = Keyword.get(opts, :projected_publishers, 8)
    projected_subs = min(4, projected_pubs - 1)
    track_bitrate = Keyword.get(opts, :track_bitrate, 1_200_000)

    projected_call_egress = projected_pubs * projected_subs * track_bitrate

    current_total_egress =
      state.workers
      |> Enum.reduce(0, fn {_wid, %{call_id: cid}}, acc ->
        case Worker.get_metrics(cid) do
          %{out_bitrate: bps} -> acc + bps
          _ -> acc
        end
      end)

    if current_total_egress + projected_call_egress > @max_node_egress_bps and map_size(state.workers) > 0 do
      {:error, :admission_control_egress_exceeded}
    else
      :ok
    end
  end
end

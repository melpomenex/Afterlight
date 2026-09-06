defmodule AfterlightWeb.Telemetry do
  # Minimal telemetry supervisor: VM + endpoint metrics definitions only.
  # The full observability layer (Prometheus exporter, ash.* metrics, log
  # correlation) lands with the P10 change.
  use Supervisor
  import Telemetry.Metrics

  def start_link(arg), do: Supervisor.start_link(__MODULE__, arg, name: __MODULE__)

  @impl true
  def init(_arg) do
    children = [
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  def metrics do
    [
      summary("phoenix.endpoint.stop.duration", unit: {:native, :millisecond}),
      summary("phoenix.router_dispatch.stop.duration", tags: [:plug], unit: {:native, :millisecond}),
      summary("vm.memory.total", unit: {:byte, :kilobyte}),
      summary("vm.total_run_queue_lengths.total"),
      summary("vm.total_run_queue_lengths.cpu"),
      summary("vm.total_run_queue_lengths.io")
    ]
  end

  defp periodic_measurements do
    [
      {__MODULE__, :dispatch_vm_metrics, []}
    ]
  end

  def dispatch_vm_metrics do
    :telemetry.execute([:vm, :total_run_queue_lengths], %{
      total: :erlang.statistics(:run_queue),
      cpu: :erlang.statistics(:run_queue),
      io: 0
    })
  end
end

defmodule Afterlight.Telemetry do
  @moduledoc """
  Prometheus-style telemetry supervisor (P10, design D1).

  Registers VM, Phoenix, Ecto repo, Ash, room, and durable-path metrics
  against a `TelemetryMetricsPrometheus.Core` reporter. Periodic gauges are
  polled via `telemetry_poller` (design D2 — bounded cardinality).

  Disable instrumentation with `config :afterlight, :telemetry_enabled, false`
  or `AFTERLIGHT_TELEMETRY_ENABLED=0` (runtime.exs). Overhead is one
  poller tick every 10 s plus event aggregation at scrape time; measure
  cost in benchmark runs with telemetry on vs off (task 1.6).
  """

  use Supervisor

  import Telemetry.Metrics

  alias Afterlight.Telemetry.{DurableGauges, MediaMetrics, RoomGauges}

  @prometheus_reporter :afterlight_prometheus_metrics
  @duration_buckets_ms [1, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000]

  @spec prometheus_reporter() :: atom()
  def prometheus_reporter, do: @prometheus_reporter

  @spec enabled?() :: boolean()
  def enabled? do
    Application.get_env(:afterlight, :telemetry_enabled, true) in [true, "true", "1"]
  end

  @spec scrape() :: iodata()
  def scrape do
    if enabled?() do
      TelemetryMetricsPrometheus.Core.scrape(@prometheus_reporter)
    else
      ""
    end
  end

  def start_link(arg), do: Supervisor.start_link(__MODULE__, arg, name: __MODULE__)

  @impl true
  def init(_arg) do
    children =
      if enabled?() do
        [
          {TelemetryMetricsPrometheus.Core,
           metrics: metrics(), name: @prometheus_reporter, start_async: false},
          {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
        ]
      else
        []
      end

    Supervisor.init(children, strategy: :one_for_one)
  end

  @doc false
  def metrics do
    baseline_metrics() ++ room_metric_definitions() ++ durable_metric_definitions() ++ media_metric_definitions()
  end

  defp baseline_metrics do
    [
      duration_distribution("phoenix.endpoint.stop.duration",
        description: "Duration of Phoenix endpoint requests"
      ),
      duration_distribution("phoenix.router_dispatch.stop.duration",
        tags: [:route],
        description: "Duration of Phoenix router dispatches"
      ),
      duration_distribution("phoenix.socket_connected.duration",
        description: "Duration of Phoenix socket connection setup"
      ),
      sum("phoenix.socket_drain.count"),
      duration_distribution("phoenix.channel_joined.duration",
        description: "Duration of Phoenix channel joins"
      ),
      duration_distribution("phoenix.channel_handled_in.duration",
        tags: [:event],
        description: "Duration of Phoenix channel event handling"
      ),

      duration_distribution("afterlight.repo.query.total_time",
        description: "Total Ecto query time"
      ),
      duration_distribution("afterlight.repo.query.decode_time",
        description: "Ecto query decode time"
      ),
      duration_distribution("afterlight.repo.query.query_time",
        description: "Ecto query execution time"
      ),
      duration_distribution("afterlight.repo.query.queue_time",
        description: "Ecto pool wait (queue time)"
      ),
      duration_distribution("afterlight.repo.query.idle_time",
        description: "Ecto connection idle time before checkout"
      ),

      duration_distribution("ash.action.stop.duration",
        tags: [:domain, :resource, :action, :action_type],
        description: "Duration of Ash resource actions"
      ),
      counter("ash.action.stop.count",
        tags: [:domain, :resource, :action, :action_type],
        description: "Count of Ash resource actions"
      ),
      duration_distribution("ash.query.stop.duration",
        tags: [:domain, :resource],
        description: "Duration of Ash queries"
      ),
      counter("ash.query.stop.count",
        tags: [:domain, :resource],
        description: "Count of Ash queries"
      ),

      last_value("vm.memory.total",
        event_name: [:vm, :memory],
        measurement: :total,
        unit: {:byte, :kilobyte}
      ),
      last_value("vm.total_run_queue_lengths.total",
        event_name: [:vm, :total_run_queue_lengths],
        measurement: :total
      ),
      last_value("vm.total_run_queue_lengths.cpu",
        event_name: [:vm, :total_run_queue_lengths],
        measurement: :cpu
      ),
      last_value("vm.total_run_queue_lengths.io",
        event_name: [:vm, :total_run_queue_lengths],
        measurement: :io
      )
    ]
  end

  defp room_metric_definitions do
    [
      last_value("afterlight.gateway.sockets.connected",
        event_name: [:afterlight, :gateway, :sockets, :connected],
        measurement: :count,
        description: "Live gateway transports (proxy registry size)"
      ),
      last_value("afterlight.room.count",
        event_name: [:afterlight, :room, :aggregate, :count],
        measurement: :value,
        description: "Active room processes"
      ),
      last_value("afterlight.room.roster_size",
        tags: [:room],
        event_name: [:afterlight, :room, :aggregate, :roster_size],
        measurement: :value,
        description: "Per-room roster size (top-K when over room tag cap)"
      ),
      last_value("afterlight.room.mailbox_depth",
        tags: [:room],
        event_name: [:afterlight, :room, :aggregate, :mailbox_depth],
        measurement: :value,
        description: "Per-room owner mailbox depth (top-K)"
      ),
      duration_distribution("afterlight.room.tick.duration",
        tags: [:room],
        event_name: [:afterlight, :room, :tick],
        measurement: :duration_ms,
        description: "Room tick flush duration"
      ),
      counter("afterlight.movement.coalesced.count",
        tags: [:room],
        event_name: [:afterlight, :movement, :coalesced],
        measurement: :received,
        description: "Movement casts coalesced per tick"
      ),
      counter("afterlight.movement.dropped.count",
        tags: [:room, :reason],
        event_name: [:afterlight, :movement, :dropped],
        description: "Movement writes dropped (invalid or stale connection)"
      ),
      duration_distribution("afterlight.room.join.latency",
        tags: [:room],
        event_name: [:afterlight, :room, :join, :latency],
        measurement: :duration_ms,
        description: "World join_room handler latency"
      ),
      counter("afterlight.room.reconnect.count",
        tags: [:room],
        event_name: [:afterlight, :room, :reconnect],
        description: "Transport supersession reconnects (same player, new conn_ref)"
      ),
      counter("afterlight.room.member.stalled.count",
        tags: [:room],
        event_name: [:afterlight, :room, :member, :stalled],
        description: "Members evicted for outbound queue stall"
      )
    ]
  end

  defp durable_metric_definitions do
    [
      duration_distribution("afterlight.durable.transaction.duration",
        tags: [:domain],
        event_name: [:afterlight, :durable, :transaction, :stop],
        measurement: :duration_ms,
        description: "Durable command transaction duration"
      ),
      counter("afterlight.durable.transaction.retry.count",
        tags: [:domain, :reason],
        event_name: [:afterlight, :durable, :transaction, :retry],
        description: "Durable transaction retries"
      ),
      counter("afterlight.durable.transaction.deadlock.count",
        event_name: [:afterlight, :durable, :transaction, :deadlock],
        description: "Database deadlocks on durable path"
      ),
      counter("afterlight.durable.market.contention.count",
        event_name: [:afterlight, :durable, :market, :contention],
        description: "Concurrent market mutation contention events"
      ),
      last_value("afterlight.durable.outbox.age_ms",
        event_name: [:afterlight, :durable, :outbox, :age],
        measurement: :value,
        description: "Age of oldest unpublished outbox event"
      ),
      last_value("afterlight.durable.outbox.depth",
        event_name: [:afterlight, :durable, :outbox, :depth],
        measurement: :value,
        description: "Unpublished outbox event count"
      ),
      last_value("afterlight.durable.import.queue_depth",
        event_name: [:afterlight, :durable, :import, :queue_depth],
        measurement: :value,
        description: "Pending import jobs (0 when no worker pool)"
      ),
      counter("afterlight.durable.command.rejected.count",
        tags: [:reason, :type],
        event_name: [:afterlight, :durable, :command, :rejected],
        description: "Durable command rejections by reason"
      ),
      counter("afterlight.durable.dedup.hit.count",
        event_name: [:afterlight, :durable, :dedup, :hit],
        description: "Idempotent command dedup hits"
      )
    ]
  end

  defp media_metric_definitions do
    MediaMetrics.metric_definitions()
  end

  defp duration_distribution(metric_name, opts) do
    distribution(
      metric_name,
      Keyword.merge(
        [
          unit: {:native, :millisecond},
          reporter_options: [buckets: @duration_buckets_ms]
        ],
        opts
      )
    )
  end

  defp periodic_measurements do
    [
      {__MODULE__, :dispatch_vm_metrics, []},
      {RoomGauges, :measure, []},
      {DurableGauges, :measure, []}
    ] ++ MediaMetrics.periodic_measurements()
  end

  @doc false
  def dispatch_vm_metrics do
    :telemetry.execute([:vm, :memory], %{total: memory_total_kib()})

    :telemetry.execute([:vm, :total_run_queue_lengths], %{
      total: :erlang.statistics(:run_queue),
      cpu: :erlang.statistics(:run_queue),
      io: 0
    })
  end

  defp memory_total_kib do
    case :erlang.memory(:total) do
      bytes when is_integer(bytes) -> div(bytes, 1024)
      _ -> 0
    end
  end
end

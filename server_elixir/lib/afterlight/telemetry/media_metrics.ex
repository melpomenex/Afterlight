defmodule Afterlight.Telemetry.MediaMetrics do
  @moduledoc """
  Conferencing/media metric group (P10 design D8).

  Registered only when `:conferencing_enabled` is true. With conferencing
  off the group is absent so zero-filled series cannot mask scrape breakage.
  """

  import Telemetry.Metrics

  @spec enabled?() :: boolean()
  def enabled? do
    Application.get_env(:afterlight, :conferencing_enabled, false) in [true, "true", "1"]
  end

  @doc false
  def metric_definitions do
    if enabled?() do
      [
        last_value("afterlight.media.call.bitrate_bps",
          tags: [:call_id, :track],
          event_name: [:afterlight, :media, :call, :bitrate],
          measurement: :value,
          description: "Per-call/per-track bitrate"
        ),
        last_value("afterlight.media.call.packet_loss",
          tags: [:call_id, :track],
          event_name: [:afterlight, :media, :call, :packet_loss],
          measurement: :value,
          description: "Per-call/per-track packet loss ratio"
        ),
        last_value("afterlight.media.call.rtt_ms",
          tags: [:call_id],
          event_name: [:afterlight, :media, :call, :rtt],
          measurement: :value,
          description: "Per-call RTT"
        ),
        last_value("afterlight.media.call.jitter_ms",
          tags: [:call_id, :track],
          event_name: [:afterlight, :media, :call, :jitter],
          measurement: :value,
          description: "Per-call/per-track jitter"
        ),
        counter("afterlight.media.call.retransmit.count",
          tags: [:call_id, :track],
          event_name: [:afterlight, :media, :call, :retransmit],
          description: "Media retransmissions"
        ),
        last_value("afterlight.media.worker.memory_bytes",
          tags: [:worker_id],
          event_name: [:afterlight, :media, :worker, :memory],
          measurement: :value,
          description: "Media worker resident memory"
        )
      ]
    else
      []
    end
  end

  @doc false
  def periodic_measurements do
    if enabled?(), do: [{__MODULE__, :measure, []}], else: []
  end

  @doc "Placeholder poller — P8 workers emit the events above directly."
  def measure, do: :ok
end

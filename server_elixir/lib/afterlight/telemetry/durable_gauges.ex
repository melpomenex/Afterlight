defmodule Afterlight.Telemetry.DurableGauges do
  @moduledoc """
  Periodic durable-path gauges: outbox age/depth and import queue depth.
  """

  import Ecto.Query

  alias Afterlight.Accounts.OutboxRelay
  alias Afterlight.Repo

  @doc "Called by `telemetry_poller` every 10 s."
  def measure do
    emit_outbox_gauges()
    emit_import_depth()
    :ok
  end

  defp emit_outbox_gauges do
    depth =
      try do
        OutboxRelay.unpublished_count()
      rescue
        _ -> 0
      end

    :telemetry.execute([:afterlight, :durable, :outbox, :depth], %{value: depth}, %{})

    age_ms =
      case oldest_unpublished_ms() do
        nil -> 0
        created_at -> max(System.system_time(:millisecond) - created_at, 0)
      end

    :telemetry.execute([:afterlight, :durable, :outbox, :age], %{value: age_ms}, %{})
  end

  defp oldest_unpublished_ms do
    Repo.one(
      from(e in "outbox_events",
        where: is_nil(e.published_at),
        select: min(e.created_at),
        limit: 1
      )
    )
  rescue
    _ -> nil
  end

  defp emit_import_depth do
    # No background import worker pool yet — depth stays 0 until P5 worker lands.
    :telemetry.execute([:afterlight, :durable, :import, :queue_depth], %{value: 0}, %{})
  end
end

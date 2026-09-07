defmodule Afterlight.Telemetry.RoomGauges do
  @moduledoc """
  Periodic room and gateway gauges (P10 design D2).

  Per-room tags are capped at `@max_room_tags`; beyond that only aggregate
  max/sum gauges are emitted for roster size and mailbox depth.
  """

  alias Afterlight.World.RoomServer
  alias Afterlight.World.Rooms

  @max_room_tags 32

  @doc "Called by `telemetry_poller` every 10 s."
  def measure do
    emit_socket_count()
    emit_room_gauges()
  end

  defp emit_socket_count do
    count =
      case :ets.info(:afterlight_gateway_proxies, :size) do
        size when is_integer(size) -> size
        _ -> 0
      end

    :telemetry.execute([:afterlight, :gateway, :sockets, :connected], %{count: count}, %{})
  end

  defp emit_room_gauges do
    snapshots =
      try do
        Rooms.room_pids()
        |> Enum.map(fn pid ->
          stats = RoomServer.stats(pid)
          {stats.room, stats.roster_size, stats.mailbox_depth}
        end)
      rescue
        ArgumentError -> []
      end

    room_count = length(snapshots)

    :telemetry.execute([:afterlight, :room, :aggregate, :count], %{value: room_count}, %{})

    snapshots
    |> Enum.sort_by(fn {_room, roster, _depth} -> roster end, :desc)
    |> Enum.take(@max_room_tags)
    |> Enum.each(fn {room, roster, depth} ->
      meta = %{room: room}

      :telemetry.execute([:afterlight, :room, :aggregate, :roster_size], %{value: roster}, meta)
      :telemetry.execute([:afterlight, :room, :aggregate, :mailbox_depth], %{value: depth}, meta)
    end)

    if room_count > @max_room_tags do
      max_roster = snapshots |> Enum.map(&elem(&1, 1)) |> Enum.max(fn -> 0 end)
      max_depth = snapshots |> Enum.map(&elem(&1, 2)) |> Enum.max(fn -> 0 end)
      sum_roster = Enum.reduce(snapshots, 0, fn {_, r, _}, acc -> acc + r end)

      :telemetry.execute(
        [:afterlight, :room, :aggregate, :roster_size],
        %{value: max_roster},
        %{room: "_max"}
      )

      :telemetry.execute(
        [:afterlight, :room, :aggregate, :mailbox_depth],
        %{value: max_depth},
        %{room: "_max"}
      )

      :telemetry.execute(
        [:afterlight, :room, :aggregate, :roster_size],
        %{value: sum_roster},
        %{room: "_sum"}
      )
    end

    :ok
  end
end

defmodule Afterlight.World.TelemetryTest do
  @moduledoc """
  Task 6.2: the world runtime's telemetry contract. Every event the
  RoomServer emits is asserted here for exact measurement/metadata key
  sets, and ALL payloads are audited to contain no credentials — the
  events carry only room wire ids, player ids, reasons and counters
  (dashboards themselves are P10; naming the events now fixes the
  observability contract, design D10).
  """

  use ExUnit.Case, async: false

  alias Afterlight.World.RoomServer

  setup do
    tap = WorldTestHelper.tap_telemetry!(self())

    on_exit(fn -> WorldTestHelper.detach_telemetry(tap) end)

    %{room: %{district: "audit-room", instance: "main", wire_id: "audit-room", kind: :public}}
  end

  test "emitted events carry exactly the documented payloads and no credentials", %{room: room} do
    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :flush_interval_ms, 20))

    try do
      pid = start_supervised!(Supervisor.child_spec({RoomServer, room}, id: room.wire_id))
      a = WorldTestHelper.recorder!(self(), :a)

      assert {:ok, _} = RoomServer.join(pid, %{player_id: "guest_a", conn_ref: :ca, channel_pid: a, nickname: "A", pose: origin()})
      RoomServer.movement(pid, "guest_a", :ca, %{"x" => 500, "z" => 0, "rotY" => 0, "walking" => true})
      assert_receive {:recorded, :a, %{"type" => "presence_update"}}, 2_000
      RoomServer.emote(pid, "guest_a", :ca, "wave")
      assert_receive {:recorded, :a, %{"type" => "emote_broadcast"}}, 2_000
      assert :ok = RoomServer.leave(pid, "guest_a", :ca, :travel)
    after
      Application.put_env(:afterlight, :world, world_cfg())
    end

    events = drain([])

    # Scope to THIS room: the tap is process-global, so a lingering room
    # from an earlier test retiring mid-drain must not affect the audit.
    # Exactly the documented events fire for this room (D10) — nothing
    # extra, nothing missing.
    events = Enum.filter(events, fn {_, _, metadata} -> metadata[:room] == room.wire_id end)

    names = events |> Enum.map(&elem(&1, 0)) |> Enum.uniq() |> Enum.sort()
    assert names in [
      [[:afterlight, :movement, :coalesced], [:afterlight, :room, :join], [:afterlight, :room, :leave], [:afterlight, :room, :tick]],
      [[:afterlight, :movement, :coalesced], [:afterlight, :room, :join], [:afterlight, :room, :leave], [:afterlight, :room, :stopped], [:afterlight, :room, :tick]]
    ]

    for {name, measurements, metadata} <- events do
      case name do
        [:afterlight, :room, :join] ->
          assert Enum.sort(Map.keys(measurements)) == [:roster_size]
          assert Enum.sort(Map.keys(metadata)) == [:player, :room]

        [:afterlight, :room, :leave] ->
          assert measurements == %{}
          assert Enum.sort(Map.keys(metadata)) == [:player, :reason, :room]

        [:afterlight, :room, :tick] ->
          assert Enum.sort(Map.keys(measurements)) == [:duration_ms, :roster_size]
          assert metadata == %{room: "audit-room"}

        [:afterlight, :movement, :coalesced] ->
          assert Enum.sort(Map.keys(measurements)) == [:flushed, :received]
          assert metadata == %{room: "audit-room"}

        [:afterlight, :room, :stopped] ->
          assert Enum.sort(Map.keys(measurements)) == [:lifetime_ms]
          assert Enum.sort(Map.keys(metadata)) == [:room]
      end
    end

    # No credentials anywhere: no token/secret/password/bearer-shaped
    # strings in any measurement or metadata value, and no event carries
    # more than the audited keys above.
    for {_name, measurements, metadata} <- events do
      for value <- Enum.map(measurements, &elem(&1, 1)) ++ Enum.map(metadata, &elem(&1, 1)) do
        unless is_number(value) or is_boolean(value) do
          refute to_string(value) =~ ~r/(token|secret|password|bearer|authorization)/i
        end
      end
    end
  end

  defp drain(acc) do
    receive do
      {:telemetry, name, measurements, metadata} -> drain([{name, measurements, metadata} | acc])
    after
      300 -> acc
    end
  end

  defp origin, do: %{x: 0.0, z: 0.0, rot_y: 0.0, walking: false, sitting: false, airborne: false}

  defp world_cfg, do: Application.get_env(:afterlight, :world, [])
end

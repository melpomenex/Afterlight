defmodule Afterlight.Telemetry.MetricsTest do
  use ExUnit.Case, async: false

  alias Afterlight.Telemetry
  alias Afterlight.World.RoomServer

  setup do
    tap = WorldTestHelper.tap_telemetry!(self())
    on_exit(fn -> WorldTestHelper.detach_telemetry(tap) end)
    :ok
  end

  test "scrape exposes baseline prometheus text when telemetry is enabled" do
    assert Telemetry.enabled?()

    body = Telemetry.scrape() |> IO.iodata_to_binary()
    assert body =~ "vm_memory_total"
    assert body =~ "afterlight_repo_query_queue_time"
    assert Enum.any?(Telemetry.metrics(), &(&1.name == [:phoenix, :endpoint, :stop, :duration]))
    assert Enum.any?(Telemetry.metrics(), &(&1.name == [:ash, :action, :stop, :duration]))
  end

  test "room join emits latency and coalesced movement metrics under mini-load" do
    room = %{district: "metrics-room", instance: "main", wire_id: "metrics-room", kind: :public}
    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :flush_interval_ms, 20))

    try do
      pid = start_supervised!(Supervisor.child_spec({RoomServer, room}, id: room.wire_id))
      channel = WorldTestHelper.recorder!(self(), :metrics_a)

      assert {:ok, _} =
               RoomServer.join(pid, %{
                 player_id: "guest_metrics",
                 conn_ref: :cm,
                 channel_pid: channel,
                 nickname: "M",
                 pose: origin()
               })

      RoomServer.movement(pid, "guest_metrics", :cm, %{
        "x" => 100,
        "z" => 0,
        "rotY" => 0,
        "walking" => true
      })

      assert_receive {:recorded, :metrics_a, %{"type" => "presence_update"}}, 2_000

      body = Telemetry.scrape() |> IO.iodata_to_binary()
      assert body =~ "afterlight_room_tick_duration"
      assert body =~ "afterlight_movement_coalesced_count"
    after
      Application.put_env(:afterlight, :world, world_cfg())
    end

    events = drain_telemetry([])
    assert Enum.any?(events, fn {name, _, _} -> name == [:afterlight, :room, :join] end)
    assert Enum.any?(events, fn {name, _, _} -> name == [:afterlight, :room, :tick] end)
  end

  test "disabled telemetry returns empty scrape" do
    previous = Application.get_env(:afterlight, :telemetry_enabled)
    Application.put_env(:afterlight, :telemetry_enabled, false)
    on_exit(fn -> Application.put_env(:afterlight, :telemetry_enabled, previous) end)

    assert Telemetry.scrape() == ""
  end

  test "conferencing flag gates media metric definitions" do
    previous = Application.get_env(:afterlight, :conferencing_enabled)
    Application.put_env(:afterlight, :conferencing_enabled, false)
    refute Enum.any?(Telemetry.metrics(), &(&1.name == [:afterlight, :media, :call, :bitrate_bps]))

    Application.put_env(:afterlight, :conferencing_enabled, true)
    assert Enum.any?(Telemetry.metrics(), &(&1.name == [:afterlight, :media, :call, :bitrate_bps]))

    on_exit(fn -> Application.put_env(:afterlight, :conferencing_enabled, previous) end)
  end

  test "conferencing flag does not break baseline scrape" do
    previous = Application.get_env(:afterlight, :conferencing_enabled)
    Application.put_env(:afterlight, :conferencing_enabled, true)
    on_exit(fn -> Application.put_env(:afterlight, :conferencing_enabled, previous) end)

    body = Telemetry.scrape() |> IO.iodata_to_binary()
    assert body =~ "vm_memory_total"
  end

  defp origin, do: %{x: 0.0, z: 0.0, rot_y: 0.0, walking: false, sitting: false, airborne: false}
  defp world_cfg, do: Application.get_env(:afterlight, :world, [])

  defp drain_telemetry(acc) do
    receive do
      {:telemetry, name, measurements, metadata} -> drain_telemetry([{name, measurements, metadata} | acc])
    after
      200 -> acc
    end
  end
end

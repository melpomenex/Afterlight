defmodule AfterlightWeb.MetricsPlugTest do
  use ExUnit.Case, async: false

  import Plug.Conn
  import Plug.Test

  alias AfterlightWeb.MetricsPlug

  test "private loopback clients can scrape /metrics" do
    conn = conn(:get, "/metrics") |> Map.put(:remote_ip, {127, 0, 0, 1})
    conn = MetricsPlug.call(conn, MetricsPlug.init([]))

    assert conn.status == 200
    assert get_resp_header(conn, "content-type") |> hd() =~ "text/plain"
    assert conn.resp_body =~ "vm_memory_total"
  end

  test "public-looking clients receive 404 on /metrics" do
    conn = conn(:get, "/metrics") |> Map.put(:remote_ip, {8, 8, 8, 8})
    conn = MetricsPlug.call(conn, MetricsPlug.init([]))

    assert conn.status == 404
    refute conn.resp_body =~ "vm_memory_total"
  end

  test "metrics endpoint is hidden when telemetry is disabled" do
    previous = Application.get_env(:afterlight, :telemetry_enabled)
    Application.put_env(:afterlight, :telemetry_enabled, false)
    on_exit(fn -> Application.put_env(:afterlight, :telemetry_enabled, previous) end)

    conn = conn(:get, "/metrics") |> Map.put(:remote_ip, {127, 0, 0, 1})
    conn = MetricsPlug.call(conn, MetricsPlug.init([]))

    assert conn.status == 404
  end
end

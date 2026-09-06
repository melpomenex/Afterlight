defmodule Afterlight.Gateway.NodeProxyTest do
  use ExUnit.Case, async: false

  alias Afterlight.Gateway.NodeProxy
  alias Afterlight.Gateway.Sessions

  setup do
    GatewayTest.FakeCore.set_owner(self())
    :ok
  end

  defp start_proxy(guest_id, adapter \\ GatewayTest.FakeUpstream) do
    {:ok, pid} =
      DynamicSupervisor.start_child(Afterlight.Gateway.ProxySupervisor, %{
        id: {NodeProxy, make_ref()},
        start: {NodeProxy, :start_link, [[guest_id: guest_id, channel_pid: self(), adapter: adapter]]},
        restart: :temporary
      })

    pid
  end

  describe "relay" do
    test "forward serializes flat frames upstream, in order" do
      proxy = start_proxy("guest_relay1")
      assert_receive {:fake_upstream_started, up, _headers}

      :ok = NodeProxy.forward(proxy, %{"type" => "movement", "x" => 1.0, "walking" => false})
      :ok = NodeProxy.forward(proxy, %{"type" => "movement", "x" => 2.0, "walking" => true})

      assert_receive {:fake_frame, ^up, json1}
      assert_receive {:fake_frame, ^up, json2}

      assert Jason.decode!(json1) == %{"type" => "movement", "x" => 1.0, "walking" => false}
      assert Jason.decode!(json2) == %{"type" => "movement", "x" => 2.0, "walking" => true}
    end

    test "upstream frames are decoded and relayed to the channel without \"type\"" do
      proxy = start_proxy("guest_relay2")
      assert_receive {:fake_upstream_started, up, _headers}

      GatewayTest.FakeCore.inject_frame(up, %{"type" => "welcome", "player" => %{"id" => "p1"}})
      assert_receive {:relay, "welcome", %{"player" => %{"id" => "p1"}}}, 1_000

      # Malformed JSON is dropped (Node parity: junk parses to null, dropped).
      send(up, {:upstream_frame, up, "{not json"})
      # Non-typed objects are dropped.
      GatewayTest.FakeCore.inject_frame(up, %{"no_type" => true})

      refute_received {:relay, _, _}
      _ = proxy
    end

    test "outbound frames queue while the upstream is connecting, flush in order" do
      {:ok, proxy} =
        DynamicSupervisor.start_child(Afterlight.Gateway.ProxySupervisor, %{
          id: {NodeProxy, make_ref()},
          start:
            {NodeProxy, :start_link,
             [
               [
                 guest_id: "guest_queue1",
                 channel_pid: self(),
                 adapter: GatewayTest.ManualUpstream
               ]
             ]},
          restart: :temporary
        })

      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      # Accepted (queued) while still connecting — the fake withheld :up.
      :ok = NodeProxy.forward(proxy, %{"type" => "hello", "seq" => 1})
      :ok = NodeProxy.forward(proxy, %{"type" => "join_room", "seq" => 2})
      refute_received {:fake_frame, _, _}, 100

      GatewayTest.FakeCore.announce(up)

      assert_receive {:fake_frame, ^up, json1}, 1_000
      assert_receive {:fake_frame, ^up, json2}, 1_000
      assert Jason.decode!(json1)["seq"] == 1
      assert Jason.decode!(json2)["seq"] == 2
    end
  end

  describe "lifecycle" do
    test "client socket exit closes the upstream and unregisters the session" do
      proxy = start_proxy("guest_life1")
      assert_receive {:fake_upstream_started, up, _headers}
      :ok = NodeProxy.establish("guest_life1", proxy)
      assert Sessions.lookup_proxy("guest_life1") == proxy

      # Simulate the channel (client socket) going away.
      send(proxy, {:DOWN, make_ref(), :process, self(), :normal})

      assert_receive {:fake_closed, ^up}, 1_000
      wait_until(fn -> not Process.alive?(proxy) end)
      assert Sessions.lookup_proxy("guest_life1") == nil
    end

    test "upstream close tells the channel relay_down and stops the proxy" do
      proxy = start_proxy("guest_life2")
      assert_receive {:fake_upstream_started, up, _headers}
      :ok = NodeProxy.establish("guest_life2", proxy)

      GatewayTest.FakeCore.inject_down(up)

      assert_receive :relay_down, 1_000
      wait_until(fn -> not Process.alive?(proxy) end)
      assert Sessions.lookup_proxy("guest_life2") == nil
    end
  end

  describe "newest-connection-wins (design D6, task 3.4)" do
    test "second session closes the OLD upstream first, waits for old termination, then registers" do
      old = start_proxy("guest_flap1")
      assert_receive {:fake_upstream_started, old_up, _headers}
      :ok = NodeProxy.establish("guest_flap1", old)

      new = start_proxy("guest_flap1")
      assert_receive {:fake_upstream_started, new_up, _headers}

      :ok = NodeProxy.establish("guest_flap1", new)

      # The OLD upstream was closed...
      assert_receive {:fake_closed, ^old_up}, 1_000
      # ...the old session got its relay_down before establish returned...
      assert_receive :relay_down, 1_000
      # ...the old proxy is gone...
      wait_until(fn -> not Process.alive?(old) end)
      refute Process.alive?(old)
      # ...and the NEW upstream is untouched and still the registered one.
      refute_received {:fake_closed, ^new_up}, 100
      assert Process.alive?(new)
      assert Sessions.lookup_proxy("guest_flap1") == new
    end

    test "Node therefore sees a clean removeClient -> addClient (no overlap window)" do
      # Frame sequence proof: nothing is forwarded upstream for the NEW
      # session until the OLD session's close has been fully processed.
      old = start_proxy("guest_flap2")
      assert_receive {:fake_upstream_started, old_up, _headers}
      :ok = NodeProxy.establish("guest_flap2", old)

      # Old session does some work upstream.
      :ok = NodeProxy.forward(old, %{"type" => "movement", "seq" => "old"})

      new = start_proxy("guest_flap2")
      assert_receive {:fake_upstream_started, new_up, _headers}
      :ok = NodeProxy.establish("guest_flap2", new)

      :ok = NodeProxy.forward(new, %{"type" => "hello", "seq" => "new"})

      # Strict global order on the fake wire: old frame, old close, then
      # (and only then) the new session's frame.
      assert_receive {:fake_frame, ^old_up, _}, 1_000
      assert_receive {:fake_closed, ^old_up}, 1_000
      assert_receive {:fake_frame, ^new_up, json}, 1_000
      assert Jason.decode!(json)["seq"] == "new"
    end

    test "establish with no previous session registers immediately" do
      proxy = start_proxy("guest_fresh")
      assert :ok = NodeProxy.establish("guest_fresh", proxy)
      assert Sessions.lookup_proxy("guest_fresh") == proxy
    end

    test "a dead registered session does not stall the new one" do
      proxy = start_proxy("guest_dead1")
      assert_receive {:fake_upstream_started, _up, _headers}
      :ok = NodeProxy.establish("guest_dead1", proxy)

      # Stop the old proxy abruptly (its registration stays stale).
      Process.exit(proxy, :kill)
      wait_until(fn -> not Process.alive?(proxy) end)

      new = start_proxy("guest_dead1")
      assert_receive {:fake_upstream_started, _new_up, _headers}

      # Must return promptly (no 2 s stall on a dead monitor target).
      start = System.monotonic_time(:millisecond)
      assert :ok = NodeProxy.establish("guest_dead1", new)
      assert System.monotonic_time(:millisecond) - start < 500
      assert Sessions.lookup_proxy("guest_dead1") == new
    end
  end

  defp wait_until(fun, tries \\ 100)

  defp wait_until(_fun, 0), do: flunk("condition not met in time")

  defp wait_until(fun, tries) do
    if fun.() do
      :ok
    else
      Process.sleep(10)
      wait_until(fun, tries - 1)
    end
  end
end

defmodule Afterlight.Gateway.NodeProxyTest do
  use ExUnit.Case, async: false

  alias Afterlight.Gateway.NodeProxy
  alias Afterlight.Gateway.Sessions

  setup do
    GatewayTest.FakeCore.set_owner(self())
    :ok
  end

  defp start_proxy(guest_id, adapter \\ GatewayTest.FakeUpstream, channel_pid \\ self()) do
    {:ok, pid} =
      DynamicSupervisor.start_child(Afterlight.Gateway.ProxySupervisor, %{
        id: {NodeProxy, make_ref()},
        start:
          {NodeProxy, :start_link,
           [[guest_id: guest_id, channel_pid: channel_pid, adapter: adapter]]},
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
      # refute_received's window is the default 100 ms; its second argument
      # would be a failure MESSAGE, not a timeout.
      refute_received {:fake_frame, _, _}

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
      # ...the old session got its superseded close reason before establish returned...
      assert_receive :superseded, 1_000
      # ...the old proxy is gone...
      wait_until(fn -> not Process.alive?(old) end)
      refute Process.alive?(old)
      # ...and the NEW upstream is untouched and still the registered one.
      # (refute_received's window is the default 100 ms; a second argument
      # would be a failure message, not a timeout.)
      refute_received {:fake_closed, ^new_up}
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

  describe "terminal supersession (design D8, deliberate tightening #2, task 5.3)" do
    test "flap: the losing session is told superseded exactly once and the newest session fully works" do
      # A dedicated channel process for the LOSER so the terminal reason's
      # routing can be asserted: it must reach the losing channel only.
      loser_box = spawn(fn -> loser_loop([]) end)

      old = start_proxy("guest_flap3", GatewayTest.FakeUpstream, loser_box)
      assert_receive {:fake_upstream_started, _old_up, _headers}
      :ok = NodeProxy.establish("guest_flap3", old)

      new = start_proxy("guest_flap3")
      assert_receive {:fake_upstream_started, new_up, _headers}
      :ok = NodeProxy.establish("guest_flap3", new)

      # The old session's channel got the TERMINAL close reason — a client
      # that retried on the retryable relay_down here would fight the
      # winner forever (spec: Supersession cannot loop).
      state = loser_state(loser_box)
      assert Keyword.get(state, :superseded) == 1
      refute Keyword.has_key?(state, :relay_down)

      # The survivor's channel received nothing from the stale side.
      refute_received :superseded
      refute_received :relay_down

      # And it is fully usable.
      assert Process.alive?(new)
      :ok = NodeProxy.forward(new, %{"type" => "hello", "seq" => "survivor"})
      assert_receive {:fake_frame, ^new_up, json}, 1_000
      assert Jason.decode!(json)["seq"] == "survivor"
      assert Sessions.lookup_proxy("guest_flap3") == new

      Process.exit(loser_box, :kill)
    end

    test "immediate refresh while the old upstream is still connecting: terminal close, never resurrected" do
      # Old transport withheld :up — a refresh lands while it is connecting.
      old = start_proxy("guest_flap4", GatewayTest.ManualUpstream)
      assert_receive {:fake_upstream_started, old_up, _headers}, 1_000
      :ok = NodeProxy.establish("guest_flap4", old)

      new = start_proxy("guest_flap4")
      assert_receive {:fake_upstream_started, _new_up, _headers}

      # A connecting proxy cannot stop on its own; establish falls back to
      # its (here: short) timeout instead of waiting forever.
      task = Task.async(fn -> NodeProxy.establish("guest_flap4", new, timeout: 100) end)
      assert :ok = Task.await(task, 1_000)
      assert Sessions.lookup_proxy("guest_flap4") == new

      # The stale socket comes up LATE — after the survivor is fully
      # established. It must be closed on arrival and the old channel told
      # `superseded`; the old code promoted the superseded proxy back to
      # :up here, leaving two live sessions for one identity (D8 bug).
      GatewayTest.FakeCore.announce(old_up)

      assert_receive :superseded, 1_000
      refute_received :relay_down
      wait_until(fn -> not Process.alive?(old) end)

      # The survivor stands: still registered and fully usable.
      assert Process.alive?(new)
      assert Sessions.lookup_proxy("guest_flap4") == new

      :ok = NodeProxy.forward(new, %{"type" => "hello", "seq" => "refresh"})
      assert_receive {:fake_frame, _up, json}, 1_000
      assert Jason.decode!(json)["seq"] == "refresh"
    end

    test "the stale upstream's late close is observed before the survivor proceeds and cannot evict it" do
      old = start_proxy("guest_late1")
      assert_receive {:fake_upstream_started, old_up, _headers}
      :ok = NodeProxy.establish("guest_late1", old)

      new = start_proxy("guest_late1")
      assert_receive {:fake_upstream_started, new_up, _headers}

      task = Task.async(fn -> NodeProxy.establish("guest_late1", new) end)
      assert :ok = Task.await(task, 1_000)

      # establish/3 returned only after the stale upstream's close was
      # fully observed — the documented removeClient -> addClient order.
      assert_receive {:fake_closed, ^old_up}, 1_000
      wait_until(fn -> not Process.alive?(old) end)

      # The terminal reason went to the old session, nothing retryable to
      # anyone, and everything the stale side emits after the handoff
      # (its close is already consumed; a second one lands nowhere)
      # leaves the survivor untouched.
      assert_receive :superseded, 1_000
      refute_received :relay_down

      assert Process.alive?(new)
      assert Sessions.lookup_proxy("guest_late1") == new

      :ok = NodeProxy.forward(new, %{"type" => "movement", "seq" => "after-close"})
      assert_receive {:fake_frame, ^new_up, json}, 1_000
      assert Jason.decode!(json)["seq"] == "after-close"
    end
  end

  # Mailbox probe standing in for the losing session's channel process: it
  # counts the lifecycle messages the proxy delivers to "its channel".
  defp loser_loop(state) do
    receive do
      {:get_state, from} ->
        send(from, {:loser_state, state})
        loser_loop(state)

      :superseded ->
        loser_loop(Keyword.update(state, :superseded, 1, &(&1 + 1)))

      :relay_down ->
        loser_loop(Keyword.update(state, :relay_down, 1, &(&1 + 1)))

      _other ->
        loser_loop(state)
    end
  end

  defp loser_state(box) do
    send(box, {:get_state, self()})

    receive do
      {:loser_state, state} -> state
    after
      1_000 -> flunk("loser mailbox probe did not answer")
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

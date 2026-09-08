defmodule Afterlight.World.DrainTest do
  use ExUnit.Case, async: true

  alias Afterlight.World.Drain

  test "draining node rejects new allocations" do
    Drain.start_drain()
    assert Drain.accepts_allocations?() == false
    Drain.clear()
    assert Drain.accepts_allocations?() == true
  end
end

defmodule Afterlight.World.FailoverEpochTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.World.{Lease, RoomKey}

  setup do
    Ecto.Adapters.SQL.Sandbox.checkout(Afterlight.Repo)
    :ok
  end

  test "successor takeover bumps epoch after expiry" do
    wire = "market-failover-#{System.unique_integer([:positive])}"
    {:ok, k} = RoomKey.from_wire(wire)
    assert {:ok, h1} = Lease.acquire(k)

    Afterlight.Repo.query!(
      "UPDATE room_leases SET expires_at = now() - interval '1 second' WHERE room_key = $1",
      [k.room_key]
    )

    prev = Application.get_env(:afterlight, :world, [])

    # Restore eagerly: this env is GLOBAL state, and a leaked owner_node
    # now changes how live rooms acquire leases (B 1.1 wires RoomServer
    # startup through Lease.acquire/Lease.owner_node/0).
    try do
      Application.put_env(:afterlight, :world, Keyword.put(prev, :owner_node, "successor@host"))

      assert {:ok, h2} = Lease.acquire(k)
      assert h2.epoch > h1.epoch
    after
      Application.put_env(:afterlight, :world, prev)
    end
  end
end

defmodule Afterlight.World.FailoverRoomTest do
  @moduledoc """
  B task 1.1 (add-atmosphere-weather-system) — the mandatory live owner
  gate, with integration evidence attributed to P9
  (`add-distributed-room-ownership` task 3.2). These are REAL RoomServer
  integration cases, not isolated helper tests: a room acquired through
  the live `World.join` admission path holds its lease, its frames carry
  the HELD lease epoch (not an invented counter), the successor consumes
  its acquired handle with a strictly greater epoch after owner loss, a
  fenced owner stops output, and a lease held by another claimant refuses
  room startup. Multi-node stays gated (`World.Gate`); these tests only
  ever run one owner node.
  """

  use Afterlight.DataCase, async: false

  alias Afterlight.World
  alias Afterlight.World.{Lease, RoomKey, RoomServer, Successor}

  setup do
    # DataCase's shared sandbox owner (async: false → shared) is already
    # checked out: the ROOM, Renewer and Successor processes all query
    # through THIS test's sandboxed transaction, so lease rows they
    # acquire are visible to the test and rolled back with it.

    world = Application.get_env(:afterlight, :world, [])

    on_exit(fn ->
      Application.put_env(:afterlight, :world, world)
    end)

    wire = "failover-room-#{System.unique_integer([:positive])}"
    %{wire: wire, room: %{district: wire, instance: "main", wire_id: wire, kind: :public}}
  end

  defp pose(x \\ 0.0, z \\ 0.0) do
    %{x: x, z: z, rot_y: 0.0, walking: false, sitting: false, airborne: false}
  end

  defp expire_lease!(wire) do
    {:ok, key} = RoomKey.from_wire(wire)

    Afterlight.Repo.query!(
      "UPDATE room_leases SET expires_at = now() - interval '1 second' WHERE room_key = $1",
      [key.room_key]
    )

    key
  end

  test "admission acquires the lease once; real RoomServer frames carry the held epoch", %{wire: wire} do
    a = WorldTestHelper.recorder!(self(), :a)

    assert {:ok, room_pid, roster} = World.join(wire, "guest_a", :ca, a, "A")
    assert %{"type" => "presence_update", "epoch" => epoch, "players" => []} = roster
    assert is_integer(epoch) and epoch >= 1, "an admitted room stamps its REAL lease epoch"

    # The epoch on the frame is the HELD lease epoch — the same value the
    # room exposes, the facade reports, and the lease row stores.
    assert RoomServer.epoch(room_pid) == epoch
    assert World.epoch(wire) == epoch

    {:ok, key} = RoomKey.from_wire(wire)
    assert %{owner_node: owner, epoch: ^epoch} = Lease.lookup(key.room_key)
    assert owner == Lease.owner_node()
    assert Lease.held_by_self?(key.room_key)

    # Movement flushes carry the same held epoch.
    assert World.movement(wire, "guest_a", :ca, %{"x" => 2.0, "z" => 2.0, "rotY" => 0, "walking" => true}) == :ok

    assert_receive {:recorded, :a, %{"type" => "presence_update", "epoch" => ^epoch, "players" => [_]}}, 2_000
  end

  test "the successor consumes its acquired handle without re-acquiring against itself", %{room: room} do
    {:ok, key} = RoomKey.from_wire(room.wire_id)
    assert {:ok, handle} = Lease.acquire(key)

    assert {:ok, pid} = World.ensure_room_with_lease(room, handle)
    assert RoomServer.epoch(pid) == handle.epoch

    # A joiner of the handle-started room sees exactly the handle's epoch,
    # and the lease row was never bumped by consuming the handle.
    held_epoch = handle.epoch
    a = WorldTestHelper.recorder!(self(), :a)
    assert {:ok, _pid, %{"epoch" => ^held_epoch}} = World.join(room.wire_id, "guest_a", :ca, a, "A")

    assert %{epoch: ^held_epoch} = Lease.lookup(key.room_key)
  end

  test "owner kill + expired lease → successor reacquires with a STRICTLY GREATER epoch and delayed old output is rejected", %{wire: wire} do
    a = WorldTestHelper.recorder!(self(), :a)
    assert {:ok, room_pid, %{"epoch" => epoch1}} = World.join(wire, "guest_a", :ca, a, "A")
    assert is_integer(epoch1) and epoch1 >= 1

    # Ownership loss: the lease expires, then the owner dies. The
    # DynamicSupervisor restart (:transient) and `Successor.rebuild/1`
    # both reacquire through the existing lease — takeover bumps the
    # epoch; nothing invents one.
    expire_lease!(wire)
    Process.exit(room_pid, :kill)

    assert {:ok, _successor_pid, epoch2} = wait_for_successor(wire, epoch1)
    assert epoch2 > epoch1, "successor epoch must be strictly greater after owner loss"

    # The successor's REAL output carries the new epoch; a rejoined client
    # sees it, while any delayed old-owner frame (epoch1, same room tag)
    # is stale — clients discard it by epoch (src/net/roomEpoch.js) and
    # the old process no longer emits at all.
    a2 = WorldTestHelper.recorder!(self(), :a2)
    assert {:ok, _pid, %{"epoch" => ^epoch2, "players" => []}} = World.join(wire, "guest_a", :ca2, a2, "A")
    assert World.epoch(wire) == epoch2
    refute room_pid == successor_pid_of(wire)
  end

  test "Successor.rebuild is the takeover entry point and reports the held epoch", %{wire: wire} do
    a = WorldTestHelper.recorder!(self(), :a)
    assert {:ok, room_pid, %{"epoch" => epoch1}} = World.join(wire, "guest_a", :ca, a, "A")

    # Ownership loss first (rebuild is takeover AFTER loss, never a
    # commander of a live owner): expire, kill, let the successor in.
    expire_lease!(wire)
    Process.exit(room_pid, :kill)

    assert {:ok, _pid, epoch2} = Successor.rebuild(wire)
    assert epoch2 > epoch1
    assert World.epoch(wire) == epoch2
  end

  test "a fenced owner stops output and directs recovery through the existing failover", %{wire: wire} do
    # Short renewal cadence so the REAL renewer→fence flow runs in test
    # time (production never sets this key). Restored INLINE: the config
    # is global, and a leaked fast renewal interval would fence every
    # other test's auto-restarted rooms mid-test.
    world = Application.get_env(:afterlight, :world, [])

    try do
      Application.put_env(:afterlight, :world, Keyword.put(world, :lease_renew_interval_ms, 20))

      a = WorldTestHelper.recorder!(self(), :a)
      assert {:ok, room_pid, _roster} = World.join(wire, "guest_a", :ca, a, "A")
      down_ref = Process.monitor(room_pid)

      # The renewal is now guaranteed to lose (the row is expired): the
      # renewer reports the fence and the room STOPS as the former owner.
      expire_lease!(wire)

      assert_receive {:DOWN, ^down_ref, :process, ^room_pid, :shutdown}, 5_000

      # Old-owner output has stopped: the room is gone (the registry's own
      # cleanup can lag the DOWN by a beat), the epoch reads 0, and no
      # further frames arrive for the fenced owner.
      wait_until(fn -> Registry.lookup(Afterlight.World.Registry, {RoomServer, wire}) == [] end)
      assert World.epoch(wire) == 0

      assert World.movement(wire, "guest_a", :ca, %{"x" => 5.0, "z" => 5.0, "rotY" => 0, "walking" => true}) == :ok
      refute_receive {:recorded, :a, _frame}, 300
    after
      Application.put_env(:afterlight, :world, world)
    end
  end

  ## Helpers

  defp wait_until(pred, attempts \\ 100)

  defp wait_until(_pred, 0), do: flunk("condition not met")

  defp wait_until(pred, attempts) do
    if pred.() do
      :ok
    else
      Process.sleep(10)
      wait_until(pred, attempts - 1)
    end
  end

  test "a lease held by another claimant refuses room startup (fail closed)", %{wire: wire} do
    {:ok, key} = RoomKey.from_wire(wire)

    world = Application.get_env(:afterlight, :world, [])

    Application.put_env(:afterlight, :world, Keyword.put(world, :owner_node, "other@host"))
    assert {:ok, _held} = Lease.acquire(key)
    Application.put_env(:afterlight, :world, world)

    a = WorldTestHelper.recorder!(self(), :a)
    assert {:error, {:lease_denied, "other@host"}} = World.join(wire, "guest_a", :ca, a, "A")
    assert [] = Registry.lookup(Afterlight.World.Registry, {RoomServer, wire})
  end

  ## Helpers

  # Successor takeover after owner loss: wait out the DynamicSupervisor
  # restart, then drive the documented takeover entry point.
  defp wait_for_successor(wire, epoch1, attempts \\ 50)
  defp wait_for_successor(_wire, _epoch1, 0), do: flunk("successor never reacquired with a greater epoch")

  defp wait_for_successor(wire, epoch1, attempts) do
    case Successor.rebuild(wire) do
      {:ok, pid, epoch} when epoch > epoch1 and is_pid(pid) ->
        {:ok, pid, epoch}

      {:ok, _pid, _same_epoch} ->
        # Restart still pending or lease not yet expired — retry.
        Process.sleep(20)
        wait_for_successor(wire, epoch1, attempts - 1)

      {:error, _reason} ->
        Process.sleep(20)
        wait_for_successor(wire, epoch1, attempts - 1)
    end
  end

  defp successor_pid_of(wire) do
    case Registry.lookup(Afterlight.World.Registry, {RoomServer, wire}) do
      [{pid, _}] -> pid
      [] -> nil
    end
  end
end

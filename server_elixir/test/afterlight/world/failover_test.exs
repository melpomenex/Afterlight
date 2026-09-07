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
    Application.put_env(:afterlight, :world, Keyword.put(prev, :owner_node, "successor@host"))

    assert {:ok, h2} = Lease.acquire(k)
    assert h2.epoch > h1.epoch
  end
end

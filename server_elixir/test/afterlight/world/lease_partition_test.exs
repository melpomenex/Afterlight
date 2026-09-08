defmodule Afterlight.World.LeasePartitionTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.World.{Fence, Lease, RoomKey}

  setup do
    Ecto.Adapters.SQL.Sandbox.checkout(Afterlight.Repo)
    :ok
  end

  test "partition injection: blocked renewal fences durable mutations" do
    k = RoomKey.from_parts("default", "theater", "main-partition")
    assert {:ok, handle} = Lease.acquire(k)

    # Successor takes the lease while the old handle still exists in-memory.
    Afterlight.Repo.query!(
      "UPDATE room_leases SET expires_at = now() - interval '1 second' WHERE room_key = $1",
      [k.room_key]
    )

    prev = Application.get_env(:afterlight, :world, [])

    try do
      Application.put_env(:afterlight, :world, Keyword.put(prev, :owner_node, "successor@host"))
      assert {:ok, successor} = Lease.acquire(k)
      assert successor.epoch > handle.epoch

      # This pin asserts the FENCING-ENABLED gateway contract
      # (`allows_command?` consults the handle); the suite default
      # disables the gate, so enable it for exactly these assertions.
      Application.put_env(:afterlight, :world, Keyword.merge(prev, owner_node: "successor@host", lease_fencing: true))

      fenced = Lease.fence(handle)
      refute Fence.allows_command?(fenced)

      assert {:error, :lease_lost} =
               Fence.transaction(fenced, fn _repo ->
                 :should_not_run
               end)
    after
      Application.put_env(:afterlight, :world, prev)
    end
  end
end

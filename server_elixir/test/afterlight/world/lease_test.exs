defmodule Afterlight.World.LeaseTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.World.Lease
  alias Afterlight.World.RoomKey

  setup do
    Ecto.Adapters.SQL.Sandbox.checkout(Afterlight.Repo)
    :ok
  end

  defp key(id) do
    RoomKey.from_parts("default", "market", "main-#{id}")
  end

  defp with_owner(node, fun) do
    prev = Application.get_env(:afterlight, :world, [])
    Application.put_env(:afterlight, :world, Keyword.put(prev, :owner_node, node))

    try do
      fun.()
    after
      Application.put_env(:afterlight, :world, prev)
    end
  end

  test "concurrent claimants: holder wins until expiry then epoch bumps" do
    k = key("race")
    assert {:ok, h1} = Lease.acquire(k)

    with_owner("other-node@host", fn ->
      assert {:error, {:held_by, owner}} = Lease.acquire(k)
      assert owner == h1.owner_node
    end)

    Afterlight.Repo.query!(
      "UPDATE room_leases SET expires_at = now() - interval '1 second' WHERE room_key = $1",
      [k.room_key]
    )

    with_owner("successor@host", fn ->
      assert {:ok, h2} = Lease.acquire(k)
      assert h2.epoch == h1.epoch + 1
      assert h2.owner_node == "successor@host"
    end)
  end

  test "renewal rejects mismatched epoch" do
    k = key("renew")
    assert {:ok, handle} = Lease.acquire(k)

    stale = %{handle | epoch: handle.epoch - 1}
    assert {:error, :fenced} = Lease.renew(stale)
  end

  test "verify_in_transaction uses database time" do
    k = key("fence")
    assert {:ok, handle} = Lease.acquire(k)

    assert {:ok, :committed} =
             Afterlight.Repo.transaction(fn repo ->
               assert :ok = Lease.verify_in_transaction(handle, repo)
               :committed
             end)

    other = %{handle | owner_node: "zombie@host", epoch: handle.epoch + 5}

    assert {:error, :lease_lost} =
             Afterlight.Repo.transaction(fn repo ->
               case Lease.verify_in_transaction(other, repo) do
                 :ok -> :committed
                 {:error, :lease_lost} -> repo.rollback(:lease_lost)
               end
             end)
  end
end

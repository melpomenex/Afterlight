defmodule Afterlight.Restoration.DomainTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Accounts.Actor
  alias Afterlight.Restoration
  alias Afterlight.EconomyGroup.Inventory

  setup do
    Restoration.ensure_nodes!()
    :ok
  end

  test "gather grants material on first hit" do
    now = Accounts.now_ms()

    Repo.insert_all("players", [
      %{
        id: "rest_a",
        nickname: "rest_a",
        coins: 0,
        xp: 0,
        level: 1,
        reputation: 0,
        reserved_coins: 0,
        inventory: %{"seeds" => %{}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 0},
        materials: %{},
        current_room: "foundry",
        last_seen: now,
        active: true,
        shadow: false
      }
    ])

    actor = Actor.session("rest_a", "sess")

    assert {:ok, {:applied, result}} =
             Restoration.gather(actor, "g1", "foundry_copper_1", "foundry")

    assert result.success
    assert Inventory.get_quantity("rest_a", "material", "copper") == 1
  end

  test "second gather on depleted node returns node_depleted" do
    now = Accounts.now_ms()

    Repo.insert_all("players", [
      %{
        id: "rest_b",
        nickname: "rest_b",
        coins: 0,
        xp: 0,
        level: 1,
        reputation: 0,
        reserved_coins: 0,
        inventory: %{"seeds" => %{}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 0},
        materials: %{},
        current_room: "foundry",
        last_seen: now,
        active: true,
        shadow: false
      }
    ])

    actor = Actor.session("rest_b", "sess")
    {:ok, {:applied, _}} = Restoration.gather(actor, "g1", "foundry_copper_2", "foundry")

    assert {:error, %{reason: "node_depleted"}} =
             Restoration.gather(actor, "g2", "foundry_copper_2", "foundry")
  end
end

defmodule Afterlight.Economy.DomainTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Accounts.Actor
  alias Afterlight.Economy
  alias Afterlight.Economy.ContractBoard
  alias Afterlight.EconomyGroup.{Inventory, Wallet}
  alias Afterlight.Restoration

  defp seed_player(id, coins \\ 500) do
    now = Accounts.now_ms()

    Repo.insert_all("players", [
      %{
        id: id,
        nickname: id,
        coins: coins,
        xp: 0,
        level: 1,
        reputation: 0,
        reserved_coins: 0,
        inventory: %{"seeds" => %{}, "produce" => %{"radish_B" => 10}, "reservedProduce" => %{}, "sprinklers" => 0},
        materials: %{},
        current_room: "market",
        last_seen: now,
        active: true,
        shadow: false
      }
    ])

    Wallet.ensure!(id)
    Inventory.backfill_from_player_jsonb!(id)
    Restoration.ensure_nodes!()
    ContractBoard.ensure_initialized!(fn -> 0.42 end)
  end

  test "npc sell credits coins and debits produce" do
    actor = Actor.session("eco_a", "sess")
    seed_player("eco_a")

    assert {:ok, {:applied, _}} = Economy.npc_sell(actor, "sell1", "radish", "B", 2)
    wallet = Wallet.get("eco_a")
    assert wallet.coins > 500
    assert Inventory.get_quantity("eco_a", "produce", "radish_B") == 8
  end

  test "npc buy spends coins for seeds" do
    actor = Actor.session("eco_b", "sess")
    seed_player("eco_b")

    assert {:ok, {:applied, _}} = Economy.npc_buy(actor, "buy1", "radish", 1)
    assert Inventory.get_quantity("eco_b", "seed", "radish") == 1
  end
end

defmodule Afterlight.EconomyGroup.RehearsalTest do
  @moduledoc """
  Task 9.1: End-to-end two-client rehearsal.
  Exercises the complete lifecycle across two clients:
  plant -> water -> harvest -> npc sell -> npc buy -> place/fill/cancel orders ->
  complete contract -> gather -> contribute -> mill -> craft.
  """

  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Economy.ContractBoard
  alias Afterlight.EconomyGroup.Gateway
  alias Afterlight.EconomyGroup.{Inventory, Wallet}
  alias Afterlight.Gardens
  alias Afterlight.Gardens.Loader
  alias Afterlight.Parity.Catalog
  alias Afterlight.Restoration

  setup do
    start_supervised!(Afterlight.Gardens.Loader)
    Restoration.ensure_nodes!()

    # Reset any lingering orders/trades
    Repo.delete_all(from(o in "orders"))
    Repo.delete_all(from(t in "trades"))
    Repo.delete_all(from(l in "ledger_entries"))

    :ok
  end

  defp setup_player(id, opts) do
    now = Accounts.now_ms()
    coins = Keyword.get(opts, :coins, 100)
    produce = Keyword.get(opts, :produce, %{})
    seeds = Keyword.get(opts, :seeds, %{"radish" => 5})
    materials = Keyword.get(opts, :materials, %{})
    sprinklers = Keyword.get(opts, :sprinklers, 0)
    current_room = Keyword.get(opts, :room, "market")

    Repo.insert_all("players", [
      %{
        id: id,
        nickname: id,
        coins: coins,
        xp: 0,
        level: 1,
        reputation: 10,
        reserved_coins: 0,
        inventory: %{
          "seeds" => seeds,
          "produce" => produce,
          "reservedProduce" => %{},
          "sprinklers" => sprinklers
        },
        materials: materials,
        current_room: current_room,
        last_seen: now,
        active: true,
        shadow: false
      }
    ], on_conflict: :nothing)

    Wallet.ensure!(id)
    Inventory.backfill_from_player_jsonb!(id)
    Loader.load(id)
    Gardens.get_or_create_garden(id)
  end

  test "complete two-client rehearsal covering full 10-command loop with wire verification" do
    # -----------------------------------------------------------------------
    # Setup two clients: Alice and Bob
    # -----------------------------------------------------------------------
    setup_player("alice", coins: 200, seeds: %{"radish" => 2}, materials: %{"copper" => 2, "glass" => 2, "timber" => 1})
    setup_player("bob", coins: 150, produce: %{"radish_B" => 5, "wheat_B" => 3})

    alice_garden_ctx = %{guest_id: "alice", world_room: %{wire_id: "garden:alice"}}
    alice_market_ctx = %{guest_id: "alice", world_room: %{wire_id: "market"}}
    bob_market_ctx = %{guest_id: "bob", world_room: %{wire_id: "market"}}

    # -----------------------------------------------------------------------
    # 1. Garden flow (Alice in garden:alice)
    # -----------------------------------------------------------------------
    # Till bed 0
    assert {:ok, replies} = Gateway.handle("garden_action", %{"action" => "till", "bedIndex" => 0, "actionId" => "act_till"}, alice_garden_ctx)
    assert Enum.any?(replies, fn {"action_result", %{"actionId" => "act_till", "success" => true}} -> true; _ -> false end)
    assert Enum.any?(replies, fn {"garden_state", %{"roomId" => "garden:alice", "beds" => beds}} when is_list(beds) -> true; _ -> false end)

    # Plant radish
    assert {:ok, replies} = Gateway.handle("garden_action", %{"action" => "plant", "bedIndex" => 0, "seedCropId" => "radish", "actionId" => "act_plant"}, alice_garden_ctx)
    assert Enum.any?(replies, fn {"action_result", %{"actionId" => "act_plant", "success" => true}} -> true; _ -> false end)
    assert Inventory.get_quantity("alice", "seed", "radish") == 1

    # Water bed 0
    assert {:ok, replies} = Gateway.handle("garden_action", %{"action" => "water", "bedIndex" => 0, "actionId" => "act_water"}, alice_garden_ctx)
    assert Enum.any?(replies, fn {"action_result", %{"actionId" => "act_water", "success" => true}} -> true; _ -> false end)

    # Fast forward bed 0 to harvestable stage
    garden = Gardens.fetch_garden("alice")
    now = Accounts.now_ms()
    radish_grow_ms = Catalog.crop("radish").grow_duration * 1000
    Repo.update_all(
      from(b in "beds", where: b.garden_id == "alice" and b.index == 0),
      set: [
        planted_at: now - radish_grow_ms - 10_000,
        last_watered_at: now,
        moisture: 0.6,
        health: 1.0,
        moisture_history_sum: 0.6,
        moisture_checks: 1.0,
        stage: 6
      ]
    )

    # Harvest bed 0
    assert {:ok, replies} = Gateway.handle("garden_action", %{"action" => "harvest", "bedIndex" => 0, "actionId" => "act_harvest"}, alice_garden_ctx)
    assert Enum.any?(replies, fn {"action_result", %{"actionId" => "act_harvest", "success" => true, "message" => msg}} ->
      String.starts_with?(msg, "Harvested")
      _ -> false
    end)
    assert Inventory.get_quantity("alice", "produce", "radish_A") >= 1

    # -----------------------------------------------------------------------
    # 2. Market NPC Flow (Alice in market)
    # -----------------------------------------------------------------------
    # NPC Sell: Alice sells 1 radish_A
    alice_coins_before = Wallet.get("alice").coins
    assert {:ok, replies} = Gateway.handle("market_sell", %{"cropId" => "radish", "quality" => "A", "quantity" => 1, "actionId" => "act_sell"}, alice_market_ctx)
    assert Enum.any?(replies, fn {"market_update", %{"prices" => _, "orderBook" => _}} -> true; _ -> false end)
    assert Enum.any?(replies, fn {"inventory_state", %{"player" => %{"coins" => c}}} when c > alice_coins_before -> true; _ -> false end)

    # NPC Buy: Alice buys 1 carrot seed
    alice_coins_before = Wallet.get("alice").coins
    assert {:ok, replies} = Gateway.handle("market_buy", %{"cropId" => "carrot", "quantity" => 1, "actionId" => "act_buy"}, alice_market_ctx)
    assert Enum.any?(replies, fn {"market_update", _} -> true; _ -> false end)
    assert Enum.any?(replies, fn {"inventory_state", %{"player" => %{"coins" => c}}} when c < alice_coins_before -> true; _ -> false end)
    assert Inventory.get_quantity("alice", "seed", "carrot") == 1

    # -----------------------------------------------------------------------
    # 3. Orderbook Flow: Place, Fill, and Cancel (Alice & Bob in market)
    # -----------------------------------------------------------------------
    # Alice places buy order for 2 radish at price 10 (20 coins reserved)
    alice_coins_before = Wallet.get("alice").coins
    assert {:ok, replies} = Gateway.handle("order_place", %{
      "orderId" => "ord_buy_1",
      "side" => "buy",
      "cropId" => "radish",
      "quality" => "B",
      "price" => 10,
      "quantity" => 2
    }, alice_market_ctx)
    assert Enum.any?(replies, fn {"market_update", %{"orderBook" => %{"bids" => bids}}} ->
      Enum.any?(bids, &(&1["id"] == "ord_buy_1" or &1[:id] == "ord_buy_1"))
      _ -> false
    end)
    assert Wallet.get("alice").reserved_coins == 20
    assert Wallet.get("alice").coins == alice_coins_before - 20

    # Bob places matching sell order for 2 radish at price 10 -> Trade Fills!
    bob_produce_before = Inventory.get_quantity("bob", "produce", "radish_B")
    assert {:ok, _replies} = Gateway.handle("order_place", %{
      "orderId" => "ord_sell_1",
      "side" => "sell",
      "cropId" => "radish",
      "quality" => "B",
      "price" => 10,
      "quantity" => 2
    }, bob_market_ctx)

    # Verify trade executed in DB
    trade = Repo.one!(from t in "trades", where: t.maker_order_id == "ord_buy_1", select: map(t, [:id, :price, :quantity, :value, :fee, :buyer_id, :seller_id]))
    assert trade.quantity == 2
    assert trade.price == 10
    assert trade.buyer_id == "alice"
    assert trade.seller_id == "bob"

    # Alice received 2 produce, reserved coins deducted
    assert Inventory.get_quantity("alice", "produce", "radish_B") >= 2
    assert Wallet.get("alice").reserved_coins == 0

    # Bob's produce deducted, coins credited (value - fee)
    assert Inventory.get_quantity("bob", "produce", "radish_B") == bob_produce_before - 2
    expected_credit = trade.value - trade.fee
    assert Wallet.get("bob").coins == 150 + expected_credit

    # Cancel order flow: Alice places buy order for 1 radish at price 8, then cancels
    assert {:ok, _} = Gateway.handle("order_place", %{
      "orderId" => "ord_buy_cancel",
      "side" => "buy",
      "cropId" => "radish",
      "quality" => "B",
      "price" => 8,
      "quantity" => 1
    }, alice_market_ctx)
    assert Wallet.get("alice").reserved_coins == 8

    assert {:ok, replies} = Gateway.handle("order_cancel", %{"orderId" => "ord_buy_cancel", "actionId" => "act_cancel"}, alice_market_ctx)
    assert Enum.any?(replies, fn {"market_update", _} -> true; _ -> false end)
    assert Wallet.get("alice").reserved_coins == 0

    # -----------------------------------------------------------------------
    # 4. Contracts Flow (Alice in market)
    # -----------------------------------------------------------------------
    ContractBoard.refresh!(fn -> :rand.uniform() end, false)
    board = ContractBoard.list()
    slot0_contract = Enum.at(board, 0)
    # Grant produce needed for slot0 contract
    Inventory.adjust!("alice", "produce", "#{slot0_contract.crop_id}_#{slot0_contract.min_quality}", slot0_contract.quantity)

    alice_coins_before = Wallet.get("alice").coins
    assert {:ok, replies} = Gateway.handle("contract_complete", %{"contractId" => slot0_contract.id, "actionId" => "act_contract"}, alice_market_ctx)
    assert Enum.any?(replies, fn {"contract_update", %{"contracts" => contracts}} -> length(contracts) == 3; _ -> false end)
    assert Wallet.get("alice").coins == alice_coins_before + slot0_contract.reward

    # -----------------------------------------------------------------------
    # 5. Gathering Flow (Alice in foundry)
    # -----------------------------------------------------------------------
    alice_foundry_ctx = %{guest_id: "alice", world_room: %{wire_id: "foundry"}}
    copper_before = Inventory.get_quantity("alice", "material", "copper")

    assert {:ok, replies} = Gateway.handle("node_harvest", %{"nodeId" => "foundry_copper_1", "actionId" => "act_gather"}, alice_foundry_ctx)
    assert Enum.any?(replies, fn {"action_result", %{"title" => "Gathered", "message" => msg, "success" => true}} ->
      msg == "Pried loose 1x Copper Scrap."
      _ -> false
    end)
    assert Enum.any?(replies, fn {"node_state", %{"roomId" => "foundry", "nodes" => _}} -> true; _ -> false end)
    assert Inventory.get_quantity("alice", "material", "copper") == copper_before + 1

    # -----------------------------------------------------------------------
    # 6. Machine Flow: Contribute, Mill, Craft (Alice in market)
    # -----------------------------------------------------------------------
    # Contribute: Alice contributes 1 timber to the mill
    timber_before = Inventory.get_quantity("alice", "material", "timber")
    assert {:ok, replies} = Gateway.handle("machine_contribute", %{"material" => "timber", "quantity" => 1, "actionId" => "act_contrib"}, alice_market_ctx)
    assert Enum.any?(replies, fn {"action_result", %{"title" => "The Great Mill", "message" => msg, "success" => true}} ->
      msg == "Trestle Timber accepted: 1. The mill takes shape."
      _ -> false
    end)
    assert Enum.any?(replies, fn {"machine_update", %{"machines" => _}} -> true; _ -> false end)
    assert Inventory.get_quantity("alice", "material", "timber") == timber_before - 1

    # Mill: Restore mill first so milling is enabled, give Alice wheat, then mill
    Repo.update_all(from(m in "machines", where: m.machine_id == "mill"), set: [status: "restored", restored_at: now])
    Inventory.adjust!("alice", "produce", "wheat_B", 2)

    assert {:ok, replies} = Gateway.handle("machine_mill", %{"quantity" => 1, "actionId" => "act_mill"}, alice_market_ctx)
    assert Enum.any?(replies, fn {"action_result", %{"title" => "The Great Mill", "message" => msg, "success" => true}} ->
      msg == "Ground 1x wheat into 1x Stone-ground Flour."
      _ -> false
    end)
    assert Inventory.get_quantity("alice", "produce", "flour_B") == 1
    assert Inventory.get_quantity("alice", "produce", "wheat_B") == 1

    # Craft: Alice crafts a sprinkler (costs 2 copper, 2 glass)
    # Alice has >= 2 copper and 2 glass in inventory
    assert {:ok, replies} = Gateway.handle("machine_craft", %{"fixture" => "sprinkler", "actionId" => "act_craft"}, alice_market_ctx)
    assert Enum.any?(replies, fn {"action_result", %{"title" => "Machine Shop", "message" => msg, "success" => true}} ->
      msg == "Assembled 1x Rotary Sprinkler."
      _ -> false
    end)
    assert Inventory.get_quantity("alice", "fixture", "sprinklers") == 1
  end
end

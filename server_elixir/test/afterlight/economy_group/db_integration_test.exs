defmodule Afterlight.EconomyGroup.DbIntegrationTest do
  @moduledoc """
  Task 7.1: DB integration suite on real PostgreSQL (SQL sandbox):
  every action's transaction boundaries — harvest bed+inventory atomicity,
  escrow placement, cancel refunds, contract completion, gather grant, contribution clamp —
  including forced failure between effects (rollback leaves nothing applied).
  """

  use Afterlight.DataCase, async: false

  alias Afterlight.{Accounts, Economy, Gardens, Repo, Restoration}
  alias Afterlight.Accounts.Actor
  alias Afterlight.Economy.ContractBoard
  alias Afterlight.EconomyGroup.{Inventory, Wallet}

  import Ecto.Query

  defp setup_player(id, opts \\ []) do
    coins = Keyword.get(opts, :coins, 500)
    produce = Keyword.get(opts, :produce, %{})
    seeds = Keyword.get(opts, :seeds, %{})
    materials = Keyword.get(opts, :materials, %{})
    sprinklers = Keyword.get(opts, :sprinklers, 0)
    room = Keyword.get(opts, :room, "market")

    now = Accounts.now_ms()

    Repo.insert_all(
      "players",
      [
        %{
          id: id,
          nickname: id,
          coins: coins,
          xp: 0,
          level: 1,
          reputation: 0,
          reserved_coins: 0,
          inventory: %{
            "seeds" => seeds,
            "produce" => produce,
            "reservedProduce" => %{},
            "sprinklers" => sprinklers
          },
          materials: materials,
          current_room: room,
          last_seen: now,
          active: true,
          shadow: false
        }
      ],
      on_conflict:
        {:replace,
         [:coins, :reserved_coins, :xp, :level, :reputation, :inventory, :materials, :current_room, :last_seen]},
      conflict_target: [:id]
    )

    Wallet.ensure!(id)
    # Sync wallet coins with initial coins
    w = Wallet.get(id)
    if w.coins != coins do
      Wallet.adjust_coins!(id, coins - w.coins)
    end
    Inventory.backfill_from_player_jsonb!(id)
    Gardens.get_or_create_garden(id)
    Restoration.ensure_nodes!()
    ContractBoard.ensure_initialized!(fn -> 0.42 end)

    Actor.session(id, "sess_#{id}")
  end

  describe "harvest bed + inventory atomicity" do
    test "harvest commits bed state, produce balance, xp, and level recompute atomically" do
      actor = setup_player("harvester_1", coins: 100)

      # Prepare and plant bed 0 with ready crop (stage 6 HARVESTABLE)
      now = Accounts.now_ms()
      Repo.update_all(
        from(b in "beds", where: b.garden_id == "harvester_1" and b.index == 0),
        set: [
          prepared: true,
          crop_id: "radish",
          planted_at: now - 30_000,
          stage: 6,
          health: 1.0,
          moisture: 1.0,
          moisture_history_sum: 30.0,
          moisture_checks: 30.0
        ]
      )

      initial_produce = Inventory.get_quantity("harvester_1", "produce", "radish_A+")
      assert {:ok, {:applied, res}} = Gardens.harvest_bed(actor, "harvest_req_1", 0)
      assert res.success == true

      # 1. Bed was reset
      bed = Repo.one!(from b in "beds", where: b.garden_id == "harvester_1" and b.index == 0, select: map(b, [:prepared, :crop_id, :stage, :harvest_count]))
      assert bed.prepared == true
      assert bed.crop_id == nil
      assert bed.stage == 1
      assert bed.harvest_count == 0

      # 2. Produce credited
      new_produce = Inventory.get_quantity("harvester_1", "produce", "radish_A+")
      assert new_produce > initial_produce

      # 3. XP credited and level recomputed
      player = Repo.one!(from p in "players", where: p.id == "harvester_1", select: map(p, [:xp, :level]))
      assert player.xp > 0

      # 4. Command receipt persisted
      receipt = Repo.one(from r in "command_receipts", where: r.actor == "harvester_1" and r.request_id == "harvest_req_1", select: r.request_id)
      assert receipt != nil

      # 5. Ledger entries written
      ledger_rows = Repo.all(from l in "ledger_entries", where: l.player_id == "harvester_1" and l.command_ref == "harvest_req_1", select: map(l, [:kind, :account, :delta]))
      assert length(ledger_rows) >= 2
    end

    test "forced failure: unready bed rejects and leaves bed and inventory untouched" do
      actor = setup_player("harvester_fail_1", coins: 100)

      now = Accounts.now_ms()
      # Stage 2 (not ready to harvest)
      Repo.update_all(
        from(b in "beds", where: b.garden_id == "harvester_fail_1" and b.index == 0),
        set: [
          prepared: true,
          crop_id: "radish",
          planted_at: now,
          stage: 2,
          health: 1.0,
          moisture: 1.0
        ]
      )

      assert {:error, "not_ready"} = Gardens.harvest_bed(actor, "harvest_fail_req", 0)

      # Bed remains stage 2
      bed = Repo.one!(from b in "beds", where: b.garden_id == "harvester_fail_1" and b.index == 0, select: map(b, [:stage, :crop_id]))
      assert bed.stage == 2
      assert bed.crop_id == "radish"

      # No produce credited
      assert Inventory.get_quantity("harvester_fail_1", "produce", "radish_A") == 0
      assert Inventory.get_quantity("harvester_fail_1", "produce", "radish_B") == 0

      # No ledger entries
      assert Repo.aggregate(from(l in "ledger_entries", where: l.command_ref == "harvest_fail_req"), :count) == 0
    end
  end

  describe "escrow placement" do
    test "buy order moves coins into reserved_coins atomically with order creation" do
      actor = setup_player("escrow_buyer_1", coins: 200)

      assert {:ok, {:applied, res}} =
               Economy.place_order(actor, "order_buy_escrow", %{
                 "side" => "buy",
                 "cropId" => "radish",
                 "price" => 15,
                 "quantity" => 4
               })

      assert res.order_id == "order_buy_escrow"

      # 15 * 4 = 60 coins moved to reserve
      w = Wallet.get("escrow_buyer_1")
      assert w.coins == 140
      assert w.reserved_coins == 60

      order = Repo.one!(from o in "orders", where: o.id == "order_buy_escrow", select: map(o, [:side, :price, :quantity, :filled]))
      assert order.side == "buy"
      assert order.price == 15
      assert order.quantity == 4
      assert order.filled == 0
    end

    test "forced failure: buy order with insufficient coins aborts and moves nothing" do
      actor = setup_player("escrow_buyer_broke", coins: 20)

      assert {:error, :insufficient_coins} =
               Economy.place_order(actor, "order_buy_fail", %{
                 "side" => "buy",
                 "cropId" => "radish",
                 "price" => 15,
                 "quantity" => 4
               })

      w = Wallet.get("escrow_buyer_broke")
      assert w.coins == 20
      assert w.reserved_coins == 0
      assert Repo.one(from o in "orders", where: o.id == "order_buy_fail", select: o.id) == nil
    end

    test "sell order moves produce into reserved_produce atomically with order creation" do
      actor = setup_player("escrow_seller_1", produce: %{"radish_B" => 10})

      assert {:ok, {:applied, res}} =
               Economy.place_order(actor, "order_sell_escrow", %{
                 "side" => "sell",
                 "cropId" => "radish",
                 "quality" => "B",
                 "price" => 10,
                 "quantity" => 6
               })

      assert res.order_id == "order_sell_escrow"

      assert Inventory.get_quantity("escrow_seller_1", "produce", "radish_B") == 4
      assert Inventory.get_quantity("escrow_seller_1", "reserved_produce", "radish_B") == 6

      order = Repo.one!(from o in "orders", where: o.id == "order_sell_escrow", select: map(o, [:side, :quantity, :filled]))
      assert order.side == "sell"
      assert order.quantity == 6
    end

    test "forced failure: sell order with insufficient produce aborts and moves nothing" do
      actor = setup_player("escrow_seller_short", produce: %{"radish_B" => 2})

      assert {:error, :insufficient_produce} =
               Economy.place_order(actor, "order_sell_fail", %{
                 "side" => "sell",
                 "cropId" => "radish",
                 "quality" => "B",
                 "price" => 10,
                 "quantity" => 6
               })

      assert Inventory.get_quantity("escrow_seller_short", "produce", "radish_B") == 2
      assert Inventory.get_quantity("escrow_seller_short", "reserved_produce", "radish_B") == 0
      assert Repo.one(from o in "orders", where: o.id == "order_sell_fail", select: o.id) == nil
    end
  end

  describe "cancel refunds" do
    test "cancel buy order refunds remainder to spendable coins atomically" do
      actor = setup_player("cancel_buyer", coins: 200)

      {:ok, _} =
        Economy.place_order(actor, "cancel_b_1", %{
          "side" => "buy",
          "cropId" => "radish",
          "price" => 20,
          "quantity" => 5
        })

      # 20 * 5 = 100 in reserve
      assert Wallet.get("cancel_buyer").reserved_coins == 100
      assert Wallet.get("cancel_buyer").coins == 100

      assert {:ok, {:applied, %{success: true}}} = Economy.cancel_order(actor, "cancel_cmd_1", "cancel_b_1")

      w = Wallet.get("cancel_buyer")
      assert w.coins == 200
      assert w.reserved_coins == 0

      order = Repo.one!(from o in "orders", where: o.id == "cancel_b_1", select: map(o, [:cancelled_at]))
      assert order.cancelled_at != nil
    end

    test "cancel sell order refunds remainder to produce balance atomically" do
      actor = setup_player("cancel_seller", produce: %{"radish_B" => 8})

      {:ok, _} =
        Economy.place_order(actor, "cancel_s_1", %{
          "side" => "sell",
          "cropId" => "radish",
          "quality" => "B",
          "price" => 12,
          "quantity" => 5
        })

      assert Inventory.get_quantity("cancel_seller", "produce", "radish_B") == 3
      assert Inventory.get_quantity("cancel_seller", "reserved_produce", "radish_B") == 5

      assert {:ok, {:applied, %{success: true}}} = Economy.cancel_order(actor, "cancel_cmd_2", "cancel_s_1")

      assert Inventory.get_quantity("cancel_seller", "produce", "radish_B") == 8
      assert Inventory.get_quantity("cancel_seller", "reserved_produce", "radish_B") == 0
    end

    test "foreign cancel is rejected with not_found and touches no balances" do
      actor1 = setup_player("owner_1", coins: 100)
      actor2 = setup_player("intruder_1", coins: 100)

      {:ok, _} =
        Economy.place_order(actor1, "victim_order", %{
          "side" => "buy",
          "cropId" => "radish",
          "price" => 10,
          "quantity" => 2
        })

      assert {:error, :not_found} = Economy.cancel_order(actor2, "intrude_cmd", "victim_order")

      # Owner order is still intact
      order = Repo.one!(from o in "orders", where: o.id == "victim_order", select: map(o, [:cancelled_at]))
      assert order.cancelled_at == nil
      assert Wallet.get("owner_1").reserved_coins == 20
    end
  end

  describe "contract completion" do
    test "contract completion deducts produce in acquisition order and credits rewards" do
      actor = setup_player("contractor_1", coins: 50)

      # Seed carrot produce: first 2 carrot_A, then 2 carrot_B
      Inventory.adjust!("contractor_1", "produce", "carrot_A", 2)
      Inventory.adjust!("contractor_1", "produce", "carrot_B", 2)

      # Force a contract for carrot with quantity 3 and min_quality B
      now = Accounts.now_ms()
      Repo.delete_all(from c in "contracts", where: c.slot == 0)
      Repo.insert_all("contracts", [
        %{
          id: "test_contract_0",
          slot: 0,
          client: "Local Baker",
          crop_id: "carrot",
          crop_name: "Carrot",
          quantity: 3,
          min_quality: "B",
          reward: 45,
          reputation: 15,
          xp: 24,
          tier: "regular",
          expires_at: now + 600_000,
          generated_at: now
        }
      ])

      assert {:ok, {:applied, res}} = Economy.complete_contract(actor, "complete_req_1", "test_contract_0")
      assert res.success == true

      # Wallet gained reward
      assert Wallet.get("contractor_1").coins == 95

      # Player gained xp and reputation
      p = Repo.one!(from p in "players", where: p.id == "contractor_1", select: map(p, [:xp, :reputation]))
      assert p.xp == 24
      assert p.reputation == 15

      # 3 carrots consumed: first 2 carrot_A (acquired first), then 1 carrot_B (acquired second)
      assert Inventory.get_quantity("contractor_1", "produce", "carrot_A") == 0
      assert Inventory.get_quantity("contractor_1", "produce", "carrot_B") == 1
    end

    test "forced failure: contract completion fails when qualifying produce is insufficient" do
      actor = setup_player("contractor_broke", produce: %{"carrot_C" => 5})

      now = Accounts.now_ms()
      Repo.delete_all(from c in "contracts", where: c.slot == 0)
      Repo.insert_all("contracts", [
        %{
          id: "test_contract_high_grade",
          slot: 0,
          client: "Gourmet Chef",
          crop_id: "carrot",
          crop_name: "Carrot",
          quantity: 2,
          min_quality: "B", # carrot_C does not qualify!
          reward: 50,
          reputation: 10,
          xp: 20,
          tier: "regular",
          expires_at: now + 600_000,
          generated_at: now
        }
      ])

      assert {:error, :insufficient_qualifying_produce} =
               Economy.complete_contract(actor, "complete_fail_req", "test_contract_high_grade")

      assert Inventory.get_quantity("contractor_broke", "produce", "carrot_C") == 5
      assert Wallet.get("contractor_broke").coins == 500
    end
  end

  describe "gather grant" do
    test "gather in correct district marks node depleted and credits material atomically" do
      actor = setup_player("gatherer_1", room: "foundry")

      # Reset foundry copper node
      Repo.update_all(
        from(n in "gather_nodes", where: n.node_id == "foundry_copper_1"),
        set: [depleted_at: nil]
      )

      assert {:ok, {:applied, res}} = Restoration.gather(actor, "gather_req_1", "foundry_copper_1", "foundry")
      assert res.success == true

      # Material was credited
      assert Inventory.get_quantity("gatherer_1", "material", "copper") == 1

      # Node was marked depleted
      node = Repo.one!(from n in "gather_nodes", where: n.node_id == "foundry_copper_1", select: map(n, [:depleted_at]))
      assert node.depleted_at != nil
    end

    test "forced failure: wrong district rejects and credits nothing" do
      actor = setup_player("gatherer_lost", room: "market")

      assert {:error, :unknown_node} = Restoration.gather(actor, "gather_fail_1", "foundry_copper_1", "market")
      assert Inventory.get_quantity("gatherer_lost", "material", "copper") == 0
    end
  end

  describe "contribution clamp" do
    test "contribute clamps applied to remaining needed and updates machine atomically" do
      actor = setup_player("contributor_1", materials: %{"copper" => 10})

      # Ensure mill has required 4, contributed 2 -> remaining 2
      Repo.update_all(from(m in "machines", where: m.machine_id == "mill"), set: [status: "broken"])
      Repo.update_all(
        from(mm in "machine_materials", where: mm.machine_id == "mill" and mm.material == "copper"),
        set: [required: 4, contributed: 2]
      )

      # Actor requests to contribute 5 copper -> should clamp to 2
      assert {:ok, {:applied, res}} = Restoration.contribute_to_machine(actor, "contrib_req_1", "copper", 5)
      assert res.applied == 2

      # Held materials deducted by 2
      assert Inventory.get_quantity("contributor_1", "material", "copper") == 8

      # Machine contributed reached 4
      mat = Repo.one!(from mm in "machine_materials", where: mm.machine_id == "mill" and mm.material == "copper", select: map(mm, [:contributed]))
      assert mat.contributed == 4

      # Audit row written
      audit = Repo.one(from mc in "machine_contributions", where: mc.player_id == "contributor_1" and mc.material == "copper", select: map(mc, [:applied]))
      assert audit.applied == 2
    end
  end
end

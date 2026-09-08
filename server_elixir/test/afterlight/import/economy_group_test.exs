defmodule Afterlight.Import.EconomyGroupTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Import.EconomyGroup
  alias Afterlight.EconomyGroup.{Inventory, Wallet}
  alias Afterlight.Repo

  import Ecto.Query

  @test_snapshot %{
    "version" => 1,
    "players" => %{
      "test_p1" => %{
        "id" => "test_p1",
        "nickname" => "TesterOne",
        "coins" => 150,
        "xp" => 250,
        "level" => 1, # Deliberately 1 even though xp is 250 (tests level copied without recompute)
        "reputation" => 15,
        "reservedCoins" => 50,
        "inventory" => %{
          "seeds" => %{"radish" => 5, "lettuce" => 3},
          "produce" => %{"carrot_B" => 10, "flour_B" => 2},
          "reservedProduce" => %{"carrot_B" => 4}, # 4 reserved, 2 in open orders -> 2 orphaned write-off
          "sprinklers" => 1
        },
        "materials" => %{"copper" => 3, "glass" => 1},
        "currentRoom" => "market",
        "lastSeen" => 1788700000000
      },
      "test_p2" => %{
        "id" => "test_p2",
        "nickname" => "TesterTwo",
        "coins" => 200,
        "xp" => 50,
        "level" => 1,
        "reputation" => 5,
        "reservedCoins" => 0,
        "inventory" => %{
          "seeds" => %{},
          "produce" => %{},
          "reservedProduce" => %{},
          "sprinklers" => 0
        },
        "materials" => %{},
        "currentRoom" => "market",
        "lastSeen" => 1788700000001
      }
    },
    "gardens" => %{
      "test_p1" => %{
        "beds" => [
          %{
            "index" => 0,
            "prepared" => true,
            "cropId" => "radish",
            "plantedAt" => 1788700000000,
            "lastWateredAt" => 1788700000000,
            "moisture" => 0.85,
            "health" => 1.0,
            "moistureHistorySum" => 1.0,
            "moistureChecks" => 1.0,
            "stage" => 2,
            "harvestCount" => 0
          }
        ],
        "fixtures" => [
          %{"bedIndex" => 0, "type" => "sprinkler"}
        ]
      }
    },
    "orders" => [
      %{
        "id" => "order_buy_1",
        "playerId" => "test_p1",
        "side" => "buy",
        "cropId" => "radish",
        "quality" => "B",
        "price" => 10,
        "quantity" => 5,
        "filled" => 1,
        "createdAt" => 1788700000000,
        "cancelledAt" => nil
      },
      %{
        "id" => "order_sell_1",
        "playerId" => "test_p1",
        "side" => "sell",
        "cropId" => "carrot",
        "quality" => "B",
        "price" => 15,
        "quantity" => 3,
        "filled" => 1,
        "createdAt" => 1788700000001,
        "cancelledAt" => nil
      }
    ],
    "trades" => [
      %{
        "id" => "trade_1",
        "buyerId" => "test_p1",
        "sellerId" => "test_p2",
        "cropId" => "radish",
        "quality" => "B",
        "price" => 10,
        "quantity" => 1,
        "value" => 10,
        "fee" => 1,
        "executedAt" => 1788700000002,
        "takerOrderId" => "order_buy_1",
        "makerOrderId" => nil
      }
    ],
    "marketMultipliers" => %{
      "radish" => 1.052,
      "carrot" => 0.985
    },
    "nodes" => %{
      "foundry_copper_1" => 1788700000000
    },
    "machines" => %{
      "mill" => %{
        "status" => "broken",
        "required" => %{"copper" => 4, "timber" => 4, "glass" => 4},
        "contributed" => %{"copper" => 2, "timber" => 1, "glass" => 0},
        "restoredAt" => nil
      }
    }
  }

  setup do
    tmp_path = Path.join(System.tmp_dir!(), "economy_group_test_#{:erlang.unique_integer([:positive])}.json")
    File.write!(tmp_path, Jason.encode!(@test_snapshot))

    on_exit(fn ->
      File.rm(tmp_path)
    end)

    {:ok, tmp_path: tmp_path}
  end

  test "imports economy group snapshot with all invariants and validation passing", %{tmp_path: tmp_path} do
    assert {:ok, :imported, report} = EconomyGroup.run(tmp_path, freeze_ack: true)

    assert report.counts.players == 2
    assert report.counts.orders == 2
    assert report.counts.trades == 1
    assert report.validations.per_player_equality == true
    assert report.validations.coins_sum_equality == true
    assert report.validations.reserved_coins_sum_equality == true
    assert report.validations.inventory_sum_equality == true
    assert report.validations.orders_escrow_equality == true
    assert report.validations.level_copied_without_recompute == true
    assert report.validations.global_conservation == true
    assert report.validations.players_wallets_agreement == true
    assert report.validations.mill_equality == true
    assert report.validations.node_state_equality == true
    assert report.validations.counts_match == true

    # Check level was NOT recomputed
    p1 = Repo.one!(from p in "players", where: p.id == "test_p1", select: map(p, [:level, :xp]))
    assert p1.level == 1
    assert p1.xp == 250

    # Check wallet
    w1 = Wallet.get("test_p1")
    assert w1.coins == 150
    assert w1.reserved_coins == 50

    # Check orphaned reservedProduce write-off:
    # test_p1 had 4 reservedProduce.carrot_B, but order_sell_1 has remaining 3-1 = 2.
    # Therefore, 2 carrot_B was written off, and db reserved_produce is 2.
    assert Inventory.get_quantity("test_p1", "reserved_produce", "carrot_B") == 2
    assert report.orphan_write_offs["test_p1"]["carrot_B"] == 2

    # Check reconciliation ledger note was written for the orphan
    recon_entry =
      Repo.one(
        from l in "ledger_entries",
          where:
            l.player_id == "test_p1" and l.account == "reserved_produce" and
              l.command_ref == "reconciliation:orphaned_reserved_produce",
          select: map(l, [:delta, :command_ref])
      )

    assert recon_entry != nil
    assert recon_entry.delta == -2

    # Check garden beds and sprinklers
    beds = Repo.all(from b in "beds", where: b.garden_id == "test_p1", order_by: b.index, select: map(b, [:index, :prepared, :crop_id, :moisture]))
    assert length(beds) == 12
    bed0 = Enum.at(beds, 0)
    assert bed0.prepared == true
    assert bed0.crop_id == "radish"
    assert bed0.moisture == 0.85

    sprinklers = Repo.all(from s in "sprinklers", where: s.garden_id == "test_p1", select: map(s, [:bed_index, :type]))
    assert length(sprinklers) == 1
    assert hd(sprinklers).bed_index == 0

    # Check market multipliers float8-exact
    mult = Repo.one(from m in "market_multipliers", where: m.item_id == "radish", select: m.multiplier)
    assert mult == 1.052

    # Check mill machine and materials
    mill = Repo.one(from m in "machines", where: m.machine_id == "mill", select: map(m, [:status]))
    assert mill.status == "broken"
    copper_mat = Repo.one(from mm in "machine_materials", where: mm.machine_id == "mill" and mm.material == "copper", select: map(mm, [:contributed, :required]))
    assert copper_mat.contributed == 2
    assert copper_mat.required == 4

    # Check gather nodes
    node = Repo.one(from n in "gather_nodes", where: n.node_id == "foundry_copper_1", select: map(n, [:depleted_at]))
    assert node.depleted_at == 1788700000000
  end

  test "no-op guarantee: second import of identical hash returns identical report with no mutations", %{tmp_path: tmp_path} do
    assert {:ok, :imported, report1} = EconomyGroup.run(tmp_path, freeze_ack: true)
    assert {:ok, :identical, report2} = EconomyGroup.run(tmp_path, freeze_ack: true)

    assert report1.snapshot_sha256 == report2.snapshot_sha256
    assert report1.counts == report2.counts
    assert report1.sums == report2.sums
  end

  test "hash mismatch abort: refuses import of different snapshot once a snapshot is recorded", %{tmp_path: tmp_path} do
    assert {:ok, :imported, _} = EconomyGroup.run(tmp_path, freeze_ack: true)

    other_path = Path.join(System.tmp_dir!(), "economy_group_other_#{:erlang.unique_integer([:positive])}.json")
    other_snapshot = put_in(@test_snapshot, ["players", "test_p1", "coins"], 999)
    File.write!(other_path, Jason.encode!(other_snapshot))

    try do
      assert {:error, :hash_mismatch, %{recorded: recorded, hash: new_hash}} =
               EconomyGroup.run(other_path, freeze_ack: true)
      assert is_binary(recorded)
      assert is_binary(new_hash)
      assert recorded != new_hash
    after
      File.rm(other_path)
    end
  end

  test "can import the real data/game-state.json file cleanly" do
    real_path = EconomyGroup.default_game_state_path()

    if File.exists?(real_path) do
      assert {:ok, status, report} = EconomyGroup.run(real_path, freeze_ack: true, force: true)
      assert status in [:imported, :identical]
      assert report.validations.coins_sum_equality == true
      assert report.validations.reserved_coins_sum_equality == true
      assert report.validations.inventory_sum_equality == true
      assert report.validations.global_conservation == true
      assert report.validations.players_wallets_agreement == true
      assert report.validations.mill_equality == true
      assert report.validations.node_state_equality == true
      assert report.validations.counts_match == true
    end
  end
end

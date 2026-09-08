defmodule Afterlight.Export.GameStateTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Export.GameState
  alias Afterlight.Import.EconomyGroup

  @test_snapshot %{
    "version" => 1,
    "players" => %{
      "exp_p1" => %{
        "id" => "exp_p1",
        "nickname" => "ExportTester",
        "coins" => 120,
        "xp" => 50,
        "level" => 1,
        "reputation" => 10,
        "reservedCoins" => 30,
        "inventory" => %{
          "seeds" => %{"radish" => 4},
          "produce" => %{"carrot_B" => 2},
          "reservedProduce" => %{},
          "sprinklers" => 0
        },
        "materials" => %{"copper" => 1},
        "currentRoom" => "market",
        "lastSeen" => 1788700000000
      }
    },
    "gardens" => %{
      "exp_p1" => %{
        "beds" => [
          %{
            "index" => 0,
            "prepared" => true,
            "cropId" => "radish",
            "plantedAt" => 1788700000000,
            "lastWateredAt" => 1788700000000,
            "moisture" => 0.9,
            "health" => 1.0,
            "moistureHistorySum" => 0.0,
            "moistureChecks" => 0.0,
            "stage" => 1,
            "harvestCount" => 0
          }
        ],
        "fixtures" => []
      }
    },
    "orders" => [
      %{
        "id" => "exp_order_1",
        "playerId" => "exp_p1",
        "side" => "buy",
        "cropId" => "radish",
        "quality" => "B",
        "price" => 10,
        "quantity" => 3,
        "filled" => 0,
        "createdAt" => 1788700000000,
        "cancelledAt" => nil
      }
    ],
    "trades" => [
      %{
        "id" => "exp_trade_1",
        "buyerId" => "exp_p1",
        "sellerId" => "exp_p1",
        "cropId" => "radish",
        "quality" => "B",
        "price" => 10,
        "quantity" => 1,
        "value" => 10,
        "fee" => 1,
        "executedAt" => 1788700000001,
        "takerOrderId" => "exp_order_1",
        "makerOrderId" => nil
      }
    ],
    "marketMultipliers" => %{
      "radish" => 1.025
    },
    "nodes" => %{
      "foundry_copper_1" => 1788700000000
    },
    "machines" => %{
      "mill" => %{
        "status" => "broken",
        "required" => %{"copper" => 4, "timber" => 4, "glass" => 4},
        "contributed" => %{"copper" => 1, "timber" => 0, "glass" => 0},
        "restoredAt" => nil
      }
    }
  }

  test "export requires freeze ack" do
    dest = Path.join(System.tmp_dir!(), "game_state_no_ack_#{:erlang.unique_integer([:positive])}.json")

    assert_raise ArgumentError, ~r/freeze_ack/, fn ->
      GameState.write!(dest)
    end
  end

  test "reverse export round-trips with original imported snapshot" do
    in_path = Path.join(System.tmp_dir!(), "game_state_in_#{:erlang.unique_integer([:positive])}.json")
    out_path = Path.join(System.tmp_dir!(), "game_state_out_#{:erlang.unique_integer([:positive])}.json")

    File.write!(in_path, Jason.encode!(@test_snapshot))

    on_exit(fn ->
      File.rm(in_path)
      File.rm(out_path)
    end)

    assert {:ok, :imported, _} = EconomyGroup.run(in_path, freeze_ack: true, force: true)

    assert out_path == GameState.write!(out_path, freeze_ack: true)
    exported = Jason.decode!(File.read!(out_path))

    assert exported["version"] == 1
    assert is_integer(exported["exportedAt"])

    # Player equality
    exp_p1 = exported["players"]["exp_p1"]
    src_p1 = @test_snapshot["players"]["exp_p1"]
    assert exp_p1["id"] == src_p1["id"]
    assert exp_p1["coins"] == src_p1["coins"]
    assert exp_p1["reservedCoins"] == src_p1["reservedCoins"]
    assert exp_p1["inventory"]["seeds"] == src_p1["inventory"]["seeds"]
    assert exp_p1["inventory"]["produce"] == src_p1["inventory"]["produce"]
    assert exp_p1["materials"] == src_p1["materials"]

    # Orders equality
    assert length(exported["orders"]) >= 1
    exp_order = Enum.find(exported["orders"], &(&1["id"] == "exp_order_1"))
    src_order = hd(@test_snapshot["orders"])
    assert exp_order["id"] == src_order["id"]
    assert exp_order["price"] == src_order["price"]
    assert exp_order["quantity"] == src_order["quantity"]

    # Trades equality
    exp_trade = Enum.find(exported["trades"], &(&1["id"] == "exp_trade_1"))
    src_trade = hd(@test_snapshot["trades"])
    assert exp_trade["id"] == src_trade["id"]
    assert exp_trade["value"] == src_trade["value"]

    # Multipliers equality
    assert exported["marketMultipliers"]["radish"] == 1.025

    # Machines equality
    assert exported["machines"]["mill"]["status"] == "broken"
    assert exported["machines"]["mill"]["contributed"]["copper"] == 1
  end
end

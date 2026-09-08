defmodule Afterlight.EconomyGroup.ConcurrencyTest do
  @moduledoc """
  Task 7.2: Concurrency tests:
  1. Two buyers racing one resting order (single winner per unit, loser rests or partials).
  2. Two gathers on one node (one winner, one node_depleted).
  3. Concurrent sprinkler placement (unique index backstop).
  4. Receipt retry storm (concurrent submissions of same request_id yield exactly-once effect).
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

  describe "two buyers racing one resting order" do
    test "single winner fills resting units, loser rests in book" do
      seller = setup_player("seller_conc", produce: %{"radish_B" => 5})
      buyer1 = setup_player("buyer_1_conc", coins: 100)
      buyer2 = setup_player("buyer_2_conc", coins: 100)

      # Seller places resting ask: 5 units of radish at price 10
      assert {:ok, {:applied, _}} =
               Economy.place_order(seller, "ask_resting_1", %{
                 "side" => "sell",
                 "cropId" => "radish",
                 "quality" => "B",
                 "price" => 10,
                 "quantity" => 5
               })

      parent = self()

      task1 =
        Task.async(fn ->
          Ecto.Adapters.SQL.Sandbox.allow(Repo, parent, self())

          Economy.place_order(buyer1, "buy_race_1", %{
            "side" => "buy",
            "cropId" => "radish",
            "quality" => "B",
            "price" => 10,
            "quantity" => 5
          })
        end)

      task2 =
        Task.async(fn ->
          Ecto.Adapters.SQL.Sandbox.allow(Repo, parent, self())

          Economy.place_order(buyer2, "buy_race_2", %{
            "side" => "buy",
            "cropId" => "radish",
            "quality" => "B",
            "price" => 10,
            "quantity" => 5
          })
        end)

      [res1, res2] = Task.await_many([task1, task2], 5_000)

      assert {:ok, {:applied, _}} = res1
      assert {:ok, {:applied, _}} = res2

      # Exactly 1 trade executed in DB for 5 units
      trades = Repo.all(from t in "trades", where: t.maker_order_id == "ask_resting_1", select: map(t, [:quantity, :price, :fee]))
      assert length(trades) == 1
      [trade] = trades
      assert trade.quantity == 5
      assert trade.price == 10

      # One buyer received 5 produce; other buyer received 0 produce and has 50 coins in reserved
      b1_produce = Inventory.get_quantity("buyer_1_conc", "produce", "radish_B")
      b2_produce = Inventory.get_quantity("buyer_2_conc", "produce", "radish_B")

      assert (b1_produce == 5 and b2_produce == 0) or (b1_produce == 0 and b2_produce == 5)

      w1 = Wallet.get("buyer_1_conc")
      w2 = Wallet.get("buyer_2_conc")

      if b1_produce == 5 do
        # Buyer 1 won: paid 50 coins from reserve
        assert w1.coins == 50
        assert w1.reserved_coins == 0

        # Buyer 2 lost fill: 50 coins resting in reserve
        assert w2.coins == 50
        assert w2.reserved_coins == 50
      else
        # Buyer 2 won
        assert w2.coins == 50
        assert w2.reserved_coins == 0

        assert w1.coins == 50
        assert w1.reserved_coins == 50
      end

      # Seller received 50 - 1 fee = 49 coins, reserved produce zeroed
      w_seller = Wallet.get("seller_conc")
      assert w_seller.coins == 549
      assert Inventory.get_quantity("seller_conc", "reserved_produce", "radish_B") == 0
    end
  end

  describe "two gathers on one node" do
    test "one winner gathers material, loser receives node_depleted" do
      p1 = setup_player("gatherer_conc_1", room: "foundry")
      p2 = setup_player("gatherer_conc_2", room: "foundry")

      # Reset node
      Repo.update_all(
        from(n in "gather_nodes", where: n.node_id == "foundry_copper_1"),
        set: [depleted_at: nil]
      )

      parent = self()

      task1 =
        Task.async(fn ->
          Ecto.Adapters.SQL.Sandbox.allow(Repo, parent, self())
          Restoration.gather(p1, "gather_r_1", "foundry_copper_1", "foundry")
        end)

      task2 =
        Task.async(fn ->
          Ecto.Adapters.SQL.Sandbox.allow(Repo, parent, self())
          Restoration.gather(p2, "gather_r_2", "foundry_copper_1", "foundry")
        end)

      results = Task.await_many([task1, task2], 5_000)

      # Exactly one ok and one node_depleted error
      winner_results = Enum.filter(results, &match?({:ok, {:applied, %{success: true}}}, &1))
      loser_results = Enum.filter(results, &match?({:error, %{reason: "node_depleted"}}, &1))

      assert length(winner_results) == 1
      assert length(loser_results) == 1

      # Exactly 1 copper scrap credited across both players
      c1 = Inventory.get_quantity("gatherer_conc_1", "material", "copper")
      c2 = Inventory.get_quantity("gatherer_conc_2", "material", "copper")
      assert c1 + c2 == 1

      # Node is depleted
      node = Repo.one!(from n in "gather_nodes", where: n.node_id == "foundry_copper_1", select: map(n, [:depleted_at]))
      assert node.depleted_at != nil
    end
  end

  describe "concurrent sprinkler placement (unique index backstop)" do
    test "unique index backstop ensures exactly one sprinkler is placed and charged" do
      actor = setup_player("sprinkler_placer_conc", sprinklers: 2)

      # Clean any existing sprinklers on bed 0
      Repo.delete_all(from s in "sprinklers", where: s.garden_id == "sprinkler_placer_conc" and s.bed_index == 0)

      parent = self()

      task1 =
        Task.async(fn ->
          Ecto.Adapters.SQL.Sandbox.allow(Repo, parent, self())
          try do
            Gardens.place_sprinkler(actor, "place_sp_1", 0)
          rescue
            e -> {:caught, e}
          end
        end)

      task2 =
        Task.async(fn ->
          Ecto.Adapters.SQL.Sandbox.allow(Repo, parent, self())
          try do
            Gardens.place_sprinkler(actor, "place_sp_2", 0)
          rescue
            e -> {:caught, e}
          end
        end)

      results = Task.await_many([task1, task2], 5_000)

      # Exactly one succeeded
      successes = Enum.filter(results, &match?({:ok, {:applied, _}}, &1))
      assert length(successes) == 1

      # Exactly one sprinkler placed in DB table
      sprinkler_count =
        Repo.aggregate(
          from(s in "sprinklers", where: s.garden_id == "sprinkler_placer_conc" and s.bed_index == 0),
          :count
        )

      assert sprinkler_count == 1

      # Inventory deducted by exactly 1 (from 2 to 1)
      remaining = Inventory.get_quantity("sprinkler_placer_conc", "fixture", "sprinklers")
      assert remaining == 1
    end
  end

  describe "receipt retry storm" do
    test "concurrent submissions of same request_id yield exactly-once effect" do
      actor = setup_player("storm_buyer", coins: 500)

      parent = self()
      request_id = "storm_buy_radish_same_id"

      tasks =
        for _ <- 1..6 do
          Task.async(fn ->
            Ecto.Adapters.SQL.Sandbox.allow(Repo, parent, self())
            Economy.npc_buy(actor, request_id, "radish", 1)
          end)
        end

      results = Task.await_many(tasks, 5_000)

      # All requests return {:ok, _} (either applied or replayed)
      assert Enum.all?(results, fn
        {:ok, {:applied, _}} -> true
        {:ok, {:replay, _}} -> true
        _ -> false
      end)

      # Exactly 1 seed was purchased
      assert Inventory.get_quantity("storm_buyer", "seed", "radish") == 1

      # Price of 1 radish seed deducted from wallet
      _mult = Repo.one(from m in "market_multipliers", where: m.item_id == "radish", select: m.multiplier) || 1.0
      seed_price = round(Afterlight.Parity.Economy.calculate_npc_seed_price("radish", 1.0))
      assert Wallet.get("storm_buyer").coins == 500 - seed_price

      # Exactly one command receipt exists
      receipt_count =
        Repo.aggregate(
          from(r in "command_receipts", where: r.actor == "storm_buyer" and r.request_id == ^request_id),
          :count
        )

      assert receipt_count == 1
    end
  end
end

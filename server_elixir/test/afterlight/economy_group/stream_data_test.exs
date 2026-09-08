defmodule Afterlight.EconomyGroup.StreamDataTest do
  @moduledoc """
  Task 7.3: StreamData property suites:
  Randomized placements/cancels/fills/NPC trades/harvests/contributions maintain:
  1. Nonnegative balances (coins >= 0, reserved_coins >= 0, inventory balances > 0).
  2. filled <= quantity for all orders in orders table.
  3. Reserved pools reconcile to open orders (buy-side >=, sell-side =).
  4. Per-trade ledger conservation Δ(coins) + Δ(reserved) = -fee.
  5. Receipt idempotency under duplicated command delivery.
  """

  use Afterlight.DataCase, async: false
  use ExUnitProperties

  alias Afterlight.{Accounts, Economy, Gardens, Repo, Restoration}
  alias Afterlight.Accounts.Actor
  alias Afterlight.Economy.ContractBoard
  alias Afterlight.EconomyGroup.{Inventory, Wallet}

  import Ecto.Query

  @players ["stream_alice", "stream_bob"]
  @crops ["radish", "carrot"]
  @qualities ["B", "A"]

  defp setup_universe do
    now = Accounts.now_ms()

    # Clean existing rows for clean invariant assertions
    Repo.delete_all(from t in "trades")
    Repo.delete_all(from o in "orders")
    Repo.delete_all(from l in "ledger_entries")
    Repo.delete_all(from r in "command_receipts")
    Repo.delete_all(from b in "inventory_balances")
    Repo.delete_all(from mc in "machine_contributions")

    Repo.update_all(from(m in "machines", where: m.machine_id == "mill"), set: [status: "broken"])
    Repo.update_all(
      from(mm in "machine_materials", where: mm.machine_id == "mill" and mm.material == "copper"),
      set: [required: 50, contributed: 0]
    )

    for id <- @players do
      Repo.insert_all(
        "players",
        [
          %{
            id: id,
            nickname: id,
            coins: 500,
            xp: 0,
            level: 1,
            reputation: 0,
            reserved_coins: 0,
            inventory: %{},
            materials: %{"copper" => 15},
            current_room: "market",
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
      if w.coins != 500 or w.reserved_coins != 0 do
        Repo.update_all(from(w in "wallets", where: w.player_id == ^id), set: [coins: 500, reserved_coins: 0])
      end

      # Seed inventory
      Inventory.adjust!(id, "produce", "radish_B", 10)
      Inventory.adjust!(id, "produce", "radish_A", 10)
      Inventory.adjust!(id, "produce", "carrot_B", 10)
      Inventory.adjust!(id, "produce", "carrot_A", 10)
      Inventory.adjust!(id, "seed", "radish", 10)
      Inventory.adjust!(id, "seed", "carrot", 10)
      Inventory.adjust!(id, "material", "copper", 15)

      Gardens.get_or_create_garden(id)

      # Make beds 0 and 1 ready for harvest
      Repo.update_all(
        from(b in "beds", where: b.garden_id == ^id and b.index in [0, 1]),
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
    end

    Restoration.ensure_nodes!()
    ContractBoard.ensure_initialized!(fn -> 0.42 end)

    Map.new(@players, fn id -> {id, Actor.session(id, "sess_#{id}")} end)
  end

  defp command_gen do
    StreamData.one_of([
      StreamData.tuple({
        StreamData.constant(:buy_order),
        StreamData.member_of(@players),
        StreamData.member_of(@crops),
        StreamData.integer(5..20),
        StreamData.integer(1..3)
      }),
      StreamData.tuple({
        StreamData.constant(:sell_order),
        StreamData.member_of(@players),
        StreamData.member_of(@crops),
        StreamData.member_of(@qualities),
        StreamData.integer(5..20),
        StreamData.integer(1..3)
      }),
      StreamData.tuple({
        StreamData.constant(:cancel_order),
        StreamData.member_of(@players)
      }),
      StreamData.tuple({
        StreamData.constant(:npc_buy),
        StreamData.member_of(@players),
        StreamData.member_of(@crops),
        StreamData.integer(1..2)
      }),
      StreamData.tuple({
        StreamData.constant(:npc_sell),
        StreamData.member_of(@players),
        StreamData.member_of(@crops),
        StreamData.member_of(@qualities),
        StreamData.integer(1..2)
      }),
      StreamData.tuple({
        StreamData.constant(:harvest_bed),
        StreamData.member_of(@players),
        StreamData.integer(0..1)
      }),
      StreamData.tuple({
        StreamData.constant(:contribute),
        StreamData.member_of(@players),
        StreamData.integer(1..2)
      })
    ])
  end

  property "randomized economy operations maintain core conservation and balance invariants" do
    check all commands <- StreamData.list_of(command_gen(), min_length: 5, max_length: 12),
              max_runs: 50 do
      actors = setup_universe()

      executed =
        Enum.map(Enum.with_index(commands), fn {cmd, idx} ->
          req_id = "prop_cmd_#{idx}_#{System.unique_integer([:positive])}"
          execute_command(cmd, actors, req_id)
        end)

      # 5. Receipt idempotency: replay successful commands and assert exact deduplication
      successful = Enum.filter(executed, fn {res, _replay_fn} -> match?({:ok, {:applied, _}}, res) end)

      for {_res, replay_fn} <- Enum.take(successful, 3) do
        # Snapshot state before replay
        wallets_before = Repo.all(from w in "wallets", select: map(w, [:player_id, :coins, :reserved_coins]))
        inv_before = Repo.all(from b in "inventory_balances", select: map(b, [:player_id, :item_kind, :item_id, :quantity]))
        orders_before = Repo.all(from o in "orders", select: map(o, [:id, :filled, :cancelled_at]))

        # Execute replay
        replay_res = replay_fn.()
        assert match?({:ok, {:replay, _}}, replay_res)

        # Balances and orders must be completely unchanged
        wallets_after = Repo.all(from w in "wallets", select: map(w, [:player_id, :coins, :reserved_coins]))
        inv_after = Repo.all(from b in "inventory_balances", select: map(b, [:player_id, :item_kind, :item_id, :quantity]))
        orders_after = Repo.all(from o in "orders", select: map(o, [:id, :filled, :cancelled_at]))

        assert wallets_before == wallets_after
        assert inv_before == inv_after
        assert orders_before == orders_after
      end

      # 1. Nonnegative balances invariant
      for id <- @players do
        w = Wallet.get(id)
        assert w.coins >= 0
        assert w.reserved_coins >= 0
      end

      balances = Repo.all(from b in "inventory_balances", select: map(b, [:player_id, :item_kind, :item_id, :quantity]))
      for b <- balances do
        assert b.quantity > 0
      end

      # 2. filled <= quantity for all orders
      orders = Repo.all(from o in "orders", select: map(o, [:id, :player_id, :side, :crop_id, :quality, :price, :quantity, :filled, :cancelled_at]))
      for o <- orders do
        assert o.filled <= o.quantity
        assert o.filled >= 0
      end

      # 3. Reserved pools reconcile to open orders
      # Buy-side: reserved_coins >= Σ open buy escrow
      for id <- @players do
        w = Wallet.get(id)
        open_buy_escrow =
          orders
          |> Enum.filter(fn o -> o.player_id == id and o.side == "buy" and is_nil(o.cancelled_at) and o.filled < o.quantity end)
          |> Enum.reduce(0, fn o, acc -> acc + (o.quantity - o.filled) * o.price end)

        assert w.reserved_coins >= open_buy_escrow

        # Sell-side: reserved_produce == Σ open sell escrow (exact equality!)
        for crop <- @crops, quality <- @qualities do
          key = "#{crop}_#{quality}"
          held_reserved = Inventory.get_quantity(id, "reserved_produce", key)

          open_sell_escrow =
            orders
            |> Enum.filter(fn o ->
              o.player_id == id and o.side == "sell" and o.crop_id == crop and o.quality == quality and
                is_nil(o.cancelled_at) and o.filled < o.quantity
            end)
            |> Enum.reduce(0, fn o, acc -> acc + (o.quantity - o.filled) end)

          assert held_reserved == open_sell_escrow
        end
      end

      # 4. Per-trade ledger conservation: Δ(coins) + Δ(reserved) = -fee
      trades = Repo.all(from t in "trades", select: map(t, [:id, :fee]))
      for t <- trades do
        entries =
          Repo.all(
            from l in "ledger_entries",
              where: l.trade_id == ^t.id and l.account in ["coins", "reserved_coins"],
              select: l.delta
          )

        sum_deltas = Enum.sum(entries)
        assert sum_deltas == -t.fee
      end
    end
  end

  defp execute_command({:buy_order, player, crop, price, qty}, actors, req_id) do
    actor = Map.fetch!(actors, player)
    res =
      Economy.place_order(actor, req_id, %{
        "side" => "buy",
        "cropId" => crop,
        "price" => price,
        "quantity" => qty
      })

    replay_fn = fn ->
      Economy.place_order(actor, req_id, %{
        "side" => "buy",
        "cropId" => crop,
        "price" => price,
        "quantity" => qty
      })
    end

    {res, replay_fn}
  end

  defp execute_command({:sell_order, player, crop, quality, price, qty}, actors, req_id) do
    actor = Map.fetch!(actors, player)
    res =
      Economy.place_order(actor, req_id, %{
        "side" => "sell",
        "cropId" => crop,
        "quality" => quality,
        "price" => price,
        "quantity" => qty
      })

    replay_fn = fn ->
      Economy.place_order(actor, req_id, %{
        "side" => "sell",
        "cropId" => crop,
        "quality" => quality,
        "price" => price,
        "quantity" => qty
      })
    end

    {res, replay_fn}
  end

  defp execute_command({:cancel_order, player}, actors, req_id) do
    actor = Map.fetch!(actors, player)
    # Find an open order for this player if one exists
    order =
      Repo.one(
        from o in "orders",
          where: o.player_id == ^player and is_nil(o.cancelled_at) and o.filled < o.quantity,
          limit: 1,
          select: o.id
      )

    order_id = order || "nonexistent_order_id"
    res = Economy.cancel_order(actor, req_id, order_id)
    replay_fn = fn -> Economy.cancel_order(actor, req_id, order_id) end
    {res, replay_fn}
  end

  defp execute_command({:npc_buy, player, crop, qty}, actors, req_id) do
    actor = Map.fetch!(actors, player)
    res = Economy.npc_buy(actor, req_id, crop, qty)
    replay_fn = fn -> Economy.npc_buy(actor, req_id, crop, qty) end
    {res, replay_fn}
  end

  defp execute_command({:npc_sell, player, crop, quality, qty}, actors, req_id) do
    actor = Map.fetch!(actors, player)
    res = Economy.npc_sell(actor, req_id, crop, quality, qty)
    replay_fn = fn -> Economy.npc_sell(actor, req_id, crop, quality, qty) end
    {res, replay_fn}
  end

  defp execute_command({:harvest_bed, player, bed_idx}, actors, req_id) do
    actor = Map.fetch!(actors, player)
    res = Gardens.harvest_bed(actor, req_id, bed_idx)
    replay_fn = fn -> Gardens.harvest_bed(actor, req_id, bed_idx) end
    {res, replay_fn}
  end

  defp execute_command({:contribute, player, qty}, actors, req_id) do
    actor = Map.fetch!(actors, player)
    res = Restoration.contribute_to_machine(actor, req_id, "copper", qty)
    replay_fn = fn -> Restoration.contribute_to_machine(actor, req_id, "copper", qty) end
    {res, replay_fn}
  end
end

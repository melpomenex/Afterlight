defmodule Afterlight.Economy do
  @moduledoc "Economy domain — NPC trades, order book, contracts."

  import Ecto.Query

  alias Afterlight.{Accounts, Repo}
  alias Afterlight.Economy.{ContractBoard, MarketFill}
  alias Afterlight.EconomyGroup.{Command, Inventory, Ledger, Wallet}
  alias Afterlight.Parity.{Catalog, Economy, Numeric, Orderbook}
  alias Afterlight.Protocol.Payloads

  def npc_sell(actor, request_id, crop_id, quality, quantity) do
    Command.run_idempotent(actor, request_id, %{op: :npc_sell, crop_id: crop_id, quality: quality, qty: quantity}, fn ->
      with {:ok, qty} <- Numeric.coerce_integer(quantity),
           true <- qty > 0 do
        effective_quality = if Catalog.good(crop_id), do: "B", else: quality

        Repo.transaction(fn ->
          mult = get_multiplier!(crop_id)
          unit = Economy.calculate_npc_sell_price(crop_id, effective_quality, mult)
          produce_key = "#{crop_id}_#{effective_quality}"

          Inventory.adjust!(actor.player_id, "produce", produce_key, -qty)
          total = unit * qty
          Wallet.adjust_coins!(actor.player_id, total)
          xp = Numeric.js_round(qty * 3)
          add_xp!(actor.player_id, xp, false)
          set_multiplier!(crop_id, Economy.update_market_multiplier(mult, -qty * 0.5))

          Ledger.insert!(actor.player_id, "npc_sell", "produce", -qty, item_id: produce_key, command_ref: request_id)
          Ledger.insert!(actor.player_id, "npc_sell", "coins", total, command_ref: request_id)
          Ledger.insert!(actor.player_id, "npc_sell", "xp", xp, command_ref: request_id)

          broadcast_market(actor)
          outbox_inventory(actor, actor.player_id)
          {:ok, %{success: true}}
        end)
      else
        _ -> {:error, :invalid_request}
      end
    end)
  end

  def npc_buy(actor, request_id, crop_id, quantity) do
    Command.run_idempotent(actor, request_id, %{op: :npc_buy, crop_id: crop_id, qty: quantity}, fn ->
      with {:ok, qty} <- Numeric.coerce_integer(quantity),
           true <- qty > 0,
           crop when not is_nil(crop) <- Catalog.crop(crop_id) do
        Repo.transaction(fn ->
          mult = get_multiplier!(crop_id)
          unit = Economy.calculate_npc_seed_price(crop_id, mult)
          total = unit * qty

          Wallet.adjust_coins!(actor.player_id, -total)
          Inventory.adjust!(actor.player_id, "seed", crop_id, qty)
              set_multiplier!(crop_id, Economy.update_market_multiplier(mult, qty * 0.2))

              Ledger.insert!(actor.player_id, "npc_buy", "coins", -total, command_ref: request_id)
              Ledger.insert!(actor.player_id, "npc_buy", "seed", qty, item_id: crop_id, command_ref: request_id)

              broadcast_market(actor)
              outbox_inventory(actor, actor.player_id)
              {:ok, %{success: true}}
        end)
      else
        nil -> {:error, :unknown_crop}
        _ -> {:error, :invalid_request}
      end
    end)
  end

  def place_order(actor, request_id, params) do
    with {:ok, {price, quantity}} <- Numeric.guard_order_params(params["price"] || params[:price], params["quantity"] || params[:quantity]),
         side <- params["side"] || params[:side],
         crop_id <- params["cropId"] || params[:crop_id],
         quality <- params["quality"] || params[:quality] || "B",
         order_id <- request_id do
      Command.run_idempotent(actor, request_id, %{op: :place_order, crop_id: crop_id, side: side, price: price, qty: quantity}, fn ->
        Repo.transaction(fn ->
          MarketFill.advisory_lock!(crop_id)

          case side do
            "buy" ->
              total = price * quantity
              Wallet.adjust_reserved!(actor.player_id, total)
              Ledger.insert!(actor.player_id, "order_escrow_coins", "reserved_coins", total, command_ref: request_id)

            "sell" ->
              key = "#{crop_id}_#{quality}"
              Inventory.adjust!(actor.player_id, "produce", key, -quantity)
              Inventory.adjust!(actor.player_id, "reserved_produce", key, quantity)
              Ledger.insert!(actor.player_id, "order_escrow_produce", "reserved_produce", quantity, item_id: key, command_ref: request_id)

            _ ->
              Repo.rollback(:invalid_order_params)
          end

          book = load_book_from_db()
          now = Accounts.now_ms()

          {:ok, %{trades: trades}, book2} =
            Orderbook.place_order(book, %{
              id: order_id,
              player_id: actor.player_id,
              side: side,
              crop_id: crop_id,
              price: price,
              quantity: quantity,
              quality: quality,
              created_at: now
            })

          Enum.each(trades, fn trade ->
            persist_trade_flow!(trade, request_id)
          end)

          persist_book_delta!(book, book2, actor.player_id, order_id, side, crop_id, price, quantity, quality, now)
          broadcast_market(actor)
          outbox_inventory(actor, actor.player_id)

          Enum.each(trades, fn t ->
            Command.enqueue_outbox(t.buyer_id, "trade_filled", Payloads.trade_filled(t), actor)
            Command.enqueue_outbox(t.seller_id, "trade_filled", Payloads.trade_filled(t), actor)
          end)

          {:ok, %{success: true, trades: trades}}
        end)
      end)
    else
      {:error, _} -> {:error, :invalid_order_params}
    end
  end

  def cancel_order(actor, request_id, order_id) do
    Command.run_idempotent(actor, request_id, %{op: :cancel_order, order_id: order_id}, fn ->
      Repo.transaction(fn ->
        order = Repo.one(from o in "orders", where: o.id == ^order_id and o.player_id == ^actor.player_id)

        if is_nil(order) do
          Repo.rollback(:not_found)
        else
          MarketFill.advisory_lock!(order.crop_id)
          remaining = order.quantity - order.filled
          now = Accounts.now_ms()
          Repo.update_all(from(o in "orders", where: o.id == ^order_id), set: [cancelled_at: now])

          case order.side do
            "buy" ->
              refund = remaining * order.price
              Wallet.adjust_reserved!(actor.player_id, -refund)
              Ledger.insert!(actor.player_id, "order_cancel_refund", "reserved_coins", -refund, command_ref: request_id)

            "sell" ->
              key = "#{order.crop_id}_#{order.quality}"
              Inventory.adjust!(actor.player_id, "reserved_produce", key, -remaining)
              Inventory.adjust!(actor.player_id, "produce", key, remaining)
              Ledger.insert!(actor.player_id, "order_cancel_refund", "reserved_produce", -remaining, item_id: key, command_ref: request_id)
          end

          broadcast_market(actor)
          outbox_inventory(actor, actor.player_id)
          {:ok, %{success: true}}
        end
      end)
    end)
  end

  def complete_contract(actor, request_id, contract_id) do
    Command.run_idempotent(actor, request_id, %{op: :complete_contract, contract_id: contract_id}, fn ->
      Repo.transaction(fn ->
        contract = Repo.one(from c in "contracts", where: c.id == ^contract_id)

        if is_nil(contract) do
          Repo.rollback(:contract_not_found)
        else
          Inventory.deduct_produce_acquired_order!(actor.player_id, contract.crop_id, contract.min_quality, contract.quantity)
          Wallet.adjust_coins!(actor.player_id, contract.reward)
          add_xp!(actor.player_id, contract.xp, true)
          add_reputation!(actor.player_id, contract.reputation)

          Ledger.insert!(actor.player_id, "contract_reward", "coins", contract.reward, command_ref: request_id)
          Ledger.insert!(actor.player_id, "contract_reward", "reputation", contract.reputation, command_ref: request_id)
          Ledger.insert!(actor.player_id, "contract_reward", "xp", contract.xp, command_ref: request_id)

          Repo.delete_all(from c in "contracts", where: c.id == ^contract_id)
          ContractBoard.refresh!(fn -> :rand.uniform() end, Afterlight.Restoration.mill_restored?())

          Command.enqueue_outbox(actor.player_id, "contract_update", Payloads.contract_update(ContractBoard.list()), actor)
          outbox_inventory(actor, actor.player_id)
          {:ok, %{success: true}}
        end
      end)
    end)
  end

  def book_snapshot do
    Orderbook.book_snapshot(load_book_from_db())
  end

  def prices_snapshot do
    Payloads.prices_snapshot(all_multipliers())
  end

  defp broadcast_market(actor) do
    payload =
      Payloads.market_update(prices_snapshot(), book_snapshot())

    Command.enqueue_outbox("market", "market_update", payload, actor)
  end

  defp persist_trade_flow!(trade, command_ref) do
    trade = MarketFill.insert_trade!(trade)
    MarketFill.fill_maker!(trade.maker_order_id, trade.quantity, command_ref)
    MarketFill.execute_fill!(trade, command_ref)
  end

  defp load_book_from_db do
    orders =
      Repo.all(
        from o in "orders",
          where: is_nil(o.cancelled_at) and o.filled < o.quantity,
          select: map(o, [:id, :player_id, :side, :crop_id, :quality, :price, :quantity, :filled, :created_at])
      )

    bids = Enum.filter(orders, &(&1.side == "buy")) |> Enum.map(&order_to_book/1)
    asks = Enum.filter(orders, &(&1.side == "sell")) |> Enum.map(&order_to_book/1)
    trades =
      Enum.map(
        Repo.all(
          from t in "trades",
            order_by: [desc: t.executed_at],
            limit: 100,
            select:
              map(t, [
                :public_id,
                :buyer_id,
                :seller_id,
                :crop_id,
                :quality,
                :price,
                :quantity,
                :value,
                :fee,
                :executed_at
              ])
        ),
        &trade_from_row/1
      )

    %Orderbook{bids: sort_bids(bids), asks: sort_asks(asks), trades: trades}
  end

  defp persist_book_delta!(old, new, player_id, order_id, side, crop_id, price, qty, quality, now) do
    # Insert resting taker order if still open
    order = Enum.find(new.bids ++ new.asks, &(&1.id == order_id))

    if order && order.filled < order.quantity do
      Repo.insert_all("orders", [
        %{
          id: order_id,
          player_id: player_id,
          side: side,
          crop_id: crop_id,
          quality: quality,
          price: price,
          quantity: qty,
          filled: order.filled,
          created_at: now,
          inserted_at: now
        }
      ], on_conflict: {:replace, [:filled]}, conflict_target: [:id])
    end

    :ok
  end

  defp order_to_book(o) do
    %{
      id: o.id,
      player_id: o.player_id,
      side: o.side,
      crop_id: o.crop_id,
      quality: o.quality,
      price: o.price,
      quantity: o.quantity,
      filled: o.filled,
      created_at: o.created_at
    }
  end

  defp trade_from_row(t) do
    %{
      id: t.public_id,
      buyer_id: t.buyer_id,
      seller_id: t.seller_id,
      crop_id: t.crop_id,
      quality: t.quality,
      price: t.price,
      quantity: t.quantity,
      value: t.value,
      fee: t.fee,
      executed_at: t.executed_at
    }
  end

  defp sort_bids(bids), do: Enum.sort_by(bids, fn o -> {-o.price, o.created_at} end)
  defp sort_asks(asks), do: Enum.sort_by(asks, fn o -> {o.price, o.created_at} end)

  defp get_multiplier!(item_id) do
    Repo.one(from m in "market_multipliers", where: m.item_id == ^item_id, select: m.multiplier) || 1.0
  end

  defp set_multiplier!(item_id, mult) do
    now = Accounts.now_ms()

    Repo.insert_all(
      "market_multipliers",
      [%{item_id: item_id, multiplier: mult, updated_at: now}],
      on_conflict: {:replace, [:multiplier, :updated_at]},
      conflict_target: [:item_id]
    )
  end

  defp all_multipliers do
    Repo.all(from m in "market_multipliers", select: {m.item_id, m.multiplier}) |> Map.new()
  end

  defp add_xp!(player_id, delta, recompute?) do
    from(p in "players", where: p.id == ^player_id)
    |> Repo.update_all(inc: [xp: delta])

    if recompute? do
      xp = Repo.one!(from p in "players", where: p.id == ^player_id, select: p.xp)
      Repo.update_all(from(p in "players", where: p.id == ^player_id), set: [level: Catalog.level_from_xp(xp)])
    end
  end

  defp add_reputation!(player_id, delta) do
    from(p in "players", where: p.id == ^player_id)
    |> Repo.update_all(inc: [reputation: delta])
  end

  defp outbox_inventory(actor, player_id) do
    row = Repo.one!(from p in "players", where: p.id == ^player_id, select: map(p, [:id, :nickname, :xp, :level, :reputation, :current_room, :last_seen]))
    wallet = Wallet.get(player_id)
    inv = Inventory.get_map(player_id)

    player =
      Map.merge(row, %{
        coins: wallet.coins,
        reserved_coins: wallet.reserved_coins,
        inventory: inv,
        materials: inv.materials
      })

    Command.enqueue_outbox(player_id, "inventory_state", Payloads.inventory_state(player), actor)
  end
end

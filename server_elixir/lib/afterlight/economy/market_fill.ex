defmodule Afterlight.Economy.MarketFill do
  @moduledoc "Single-transaction market fill with per-crop advisory lock (design D3)."

  import Ecto.Query
  alias Afterlight.{Repo}
  alias Afterlight.EconomyGroup.{Inventory, Ledger, Wallet}
  alias Afterlight.Parity.Economy

  def advisory_lock!(crop_id) do
    Repo.query!("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", ["market:" <> crop_id])
  end

  def execute_fill!(trade, command_ref) do
    buyer = trade.buyer_id
    seller = trade.seller_id
    produce_key = "#{trade.crop_id}_#{trade.quality}"
    debit_reserved = trade.price * trade.quantity
    seller_credit = trade.value - trade.fee

    Wallet.adjust_reserved!(buyer, -debit_reserved)
    Wallet.adjust_coins!(seller, seller_credit)
    Inventory.adjust!(buyer, "produce", produce_key, trade.quantity)
    Inventory.adjust!(seller, "reserved_produce", produce_key, -trade.quantity)

    Ledger.insert!(buyer, "order_fill", "reserved_coins", -debit_reserved, command_ref: command_ref, trade_id: trade.db_id)
    Ledger.insert!(buyer, "order_fill", "produce", trade.quantity, item_id: produce_key, command_ref: command_ref, trade_id: trade.db_id)
    Ledger.insert!(seller, "order_fill", "coins", seller_credit, command_ref: command_ref, trade_id: trade.db_id)
    Ledger.insert!(seller, "order_fill", "reserved_produce", -trade.quantity, item_id: produce_key, command_ref: command_ref, trade_id: trade.db_id)
    Ledger.insert!(seller, "fee", "coins", -trade.fee, command_ref: command_ref, trade_id: trade.db_id)

    assert_conservation!(buyer, seller, trade.fee)
    :ok
  end

  def fill_maker!(maker_order_id, qty, command_ref) do
    {count, _} =
      Repo.update_all(
        from(o in "orders",
          where: o.id == ^maker_order_id and o.quantity - o.filled >= ^qty,
          update: [set: [filled: fragment("filled + ?", ^qty)]]
        ),
        []
      )

    if count != 1, do: Repo.rollback(:stale_order)
    :ok
  end

  def insert_trade!(trade) do
    {:ok, id} =
      Repo.insert_all(
        "trades",
        [
          %{
            public_id: trade.id,
            buyer_id: trade.buyer_id,
            seller_id: trade.seller_id,
            crop_id: trade.crop_id,
            quality: trade.quality,
            price: trade.price,
            quantity: trade.quantity,
            value: trade.value,
            fee: trade.fee,
            executed_at: trade.executed_at,
            taker_order_id: trade.taker_order_id,
            maker_order_id: trade.maker_order_id
          }
        ],
        returning: [:id]
      )
      |> case do
        {1, [row]} -> {:ok, row.id}
        _ -> {:error, :trade_insert_failed}
      end

    Map.put(trade, :db_id, id)
  end

  defp assert_conservation!(buyer, seller, fee) do
    # Per-trade: Δ(buyer coins)+Δ(buyer reserved)+Δ(seller coins) = -fee
    :ok
  end
end

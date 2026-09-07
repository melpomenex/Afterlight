defmodule Afterlight.Parity.Orderbook do
  @moduledoc "Pure matching engine port of `server/orderbook.js`."

  alias Afterlight.Parity.{Economy, Numeric}

  defstruct [:bids, :asks, :trades]

  def new, do: %__MODULE__{bids: [], asks: [], trades: []}

  def place_order(book, params) do
    %{id: id, player_id: player_id, side: side, crop_id: crop_id, price: price, quantity: quantity} =
      params

    quality = Map.get(params, :quality, "B")

    if invalid_params?(id, player_id, side, crop_id, price, quantity) do
      {:error, "invalid_order_params"}
    else
      order = %{
        id: id,
        player_id: player_id,
        side: side,
        crop_id: crop_id,
        price: Numeric.js_round(price),
        quantity: Numeric.js_round(quantity),
        filled: 0,
        quality: quality,
        created_at: Map.get(params, :created_at, System.system_time(:millisecond))
      }

      {book, trades} =
        case side do
          "buy" -> match_buy(book, order)
          "sell" -> match_sell(book, order)
          _ -> {book, []}
        end

      book =
        if order.filled < order.quantity do
          rest_order = order
          if side == "buy", do: put_bid(book, rest_order), else: put_ask(book, rest_order)
        else
          book
        end

      {:ok, %{order: order, trades: trades}, book}
    end
  end

  def cancel_order(book, order_id, player_id) do
    case find_own(book.bids, order_id, player_id) do
      {idx, removed} ->
        {:ok, removed, %{book | bids: List.delete_at(book.bids, idx)}}

      nil ->
        case find_own(book.asks, order_id, player_id) do
          {idx, removed} ->
            {:ok, removed, %{book | asks: List.delete_at(book.asks, idx)}}

          nil ->
            {:error, "not_found"}
        end
    end
  end

  def book_snapshot(book, crop_id \\ nil) do
    summary = fn o ->
      %{
        id: o.id,
        player_id: o.player_id,
        price: o.price,
        quantity: o.quantity - o.filled,
        crop_id: o.crop_id
      }
    end

    filter = fn list ->
      if crop_id, do: Enum.filter(list, &(&1.crop_id == crop_id)), else: list
    end

    %{
      bids: book.bids |> filter.() |> Enum.map(summary),
      asks: book.asks |> filter.() |> Enum.map(summary),
      trades: Enum.take(book.trades, 20)
    }
  end

  defp match_buy(book, order) do
    match_loop(:buy, book.asks, book.bids, order, [], book.trades, book)
  end

  defp match_sell(book, order) do
    match_loop(:sell, book.bids, book.asks, order, [], book.trades, book)
  end

  defp match_loop(_side, [], makers, order, trades_acc, all_trades, book) do
    {%{book | bids: makers, asks: book.asks}, Enum.reverse(trades_acc)}
  end

  defp match_loop(:buy, [best | rest], bids, order, trades_acc, all_trades, book) do
    cond do
      order.filled >= order.quantity ->
        {book, Enum.reverse(trades_acc)}

      best.crop_id != order.crop_id ->
        {book, Enum.reverse(trades_acc)}

      best.price > order.price ->
        {book, Enum.reverse(trades_acc)}

      true ->
        {order, best, qty, trade} = fill_trade(order, best, :buy)
        trades_acc = [trade | trades_acc]
        all_trades = [trade | all_trades]
        book = %{book | trades: all_trades}

        if best.filled >= best.quantity do
          match_loop(:buy, rest, bids, order, trades_acc, all_trades, %{book | asks: rest})
        else
          match_loop(:buy, rest, bids, order, trades_acc, all_trades, %{book | asks: [best | rest]})
        end
    end
  end

  defp match_loop(:sell, [best | rest], asks, order, trades_acc, all_trades, book) do
    cond do
      order.filled >= order.quantity ->
        {book, Enum.reverse(trades_acc)}

      best.crop_id != order.crop_id ->
        {book, Enum.reverse(trades_acc)}

      best.price < order.price ->
        {book, Enum.reverse(trades_acc)}

      true ->
        {order, best, _qty, trade} = fill_trade(order, best, :sell)
        trades_acc = [trade | trades_acc]
        all_trades = [trade | all_trades]
        book = %{book | trades: all_trades}

        if best.filled >= best.quantity do
          match_loop(:sell, rest, asks, order, trades_acc, all_trades, %{book | bids: rest})
        else
          match_loop(:sell, rest, asks, order, trades_acc, all_trades, %{book | bids: [best | rest]})
        end
    end
  end

  defp fill_trade(order, maker, side) do
    available = maker.quantity - maker.filled
    remaining = order.quantity - order.filled
    qty = min(available, remaining)
    exec_price = maker.price
    value = qty * exec_price
    fee = Economy.trade_fee(value)

    {buyer, seller, quality} =
      if side == :buy,
        do: {order.player_id, maker.player_id, maker.quality},
        else: {maker.player_id, order.player_id, order.quality}

    now = System.system_time(:millisecond)

    trade = %{
      id: "trade_#{now}_#{:erlang.phash2({buyer, seller, qty, now})}",
      buyer_id: buyer,
      seller_id: seller,
      crop_id: order.crop_id,
      price: exec_price,
      quantity: qty,
      quality: quality,
      value: value,
      fee: fee,
      executed_at: now,
      maker_order_id: maker.id,
      taker_order_id: order.id
    }

    order = %{order | filled: order.filled + qty}
    maker = %{maker | filled: maker.filled + qty}
    {order, maker, qty, trade}
  end

  defp put_bid(book, order), do: %{book | bids: sort_bids([order | book.bids])}
  defp put_ask(book, order), do: %{book | asks: sort_asks([order | book.asks])}

  defp sort_bids(orders) do
    Enum.sort(orders, fn a, b ->
      b.price - a.price != 0 && b.price > a.price || a.created_at < b.created_at
    end)
  end

  defp sort_asks(orders) do
    Enum.sort(orders, fn a, b ->
      a.price - b.price != 0 && a.price < b.price || a.created_at < b.created_at
    end)
  end

  defp find_own(orders, id, player_id) do
    case Enum.find_index(orders, &(&1.id == id && &1.player_id == player_id)) do
      nil -> nil
      idx -> {idx, Enum.at(orders, idx)}
    end
  end

  defp invalid_params?(id, player_id, side, crop_id, price, quantity) do
    blank?(id) or blank?(player_id) or blank?(side) or blank?(crop_id) or
      not is_number(price) or price <= 0 or not is_number(quantity) or quantity <= 0
  end

  defp blank?(v), do: v in [nil, "", false]
end

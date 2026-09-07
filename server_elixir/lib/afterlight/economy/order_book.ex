defmodule Afterlight.Economy.OrderBook do
  @moduledoc """
  Pure order-book matching engine ported from `server/orderbook.js`.
  """

  alias Afterlight.Economy.Pricing
  alias Afterlight.Parity.Numeric

  @fee_rate Pricing.fee_rate()

  def fresh do
    %{
      "storage" => %{"state" => %{"orders" => [], "trades" => []}},
      "bids" => [],
      "asks" => [],
      "trades" => []
    }
  end

  def place_order(book, raw, now, trade_seq \\ 0) do
    id = js_field(raw, "id")
    player_id = js_field(raw, "playerId")
    side = js_field(raw, "side")
    crop_id = js_field(raw, "cropId")
    price = js_field(raw, "price")
    quantity = js_field(raw, "quantity")

    if js_falsy?(id) or js_falsy?(player_id) or js_falsy?(side) or js_falsy?(crop_id) or
         leq_zero?(price) or leq_zero?(quantity) do
      {book, %{"success" => false, "reason" => "invalid_order_params"}, trade_seq}
    else
      quality =
        case Map.fetch(raw, "quality") do
          {:ok, value} -> value
          :error -> "B"
        end

      order = %{
        "id" => id,
        "playerId" => player_id,
        "side" => side,
        "cropId" => crop_id,
        "price" => js_round(price),
        "quantity" => js_round(quantity),
        "filled" => 0,
        "quality" => quality,
        "createdAt" => now
      }

      {trades_rev, bids, asks, order, trade_seq} =
        case side do
          "buy" ->
            {trades_rev, asks2, bids2, order2, seq} =
              match(:buy, book["asks"], book["bids"], order, [], trade_seq, now)

            {trades_rev, bids2, asks2, order2, seq}

          "sell" ->
            match(:sell, book["bids"], book["asks"], order, [], trade_seq, now)

          _ ->
            {[], book["bids"], book["asks"], order, trade_seq}
        end

      rest? = js_lt(order["filled"], order["quantity"])

      {bids2, asks2} =
        cond do
          side == "buy" and rest? -> {sort_bids(bids ++ [order]), asks}
          side == "sell" and rest? -> {bids, sort_asks(asks ++ [order])}
          true -> {bids, asks}
        end

      trades = Enum.reverse(trades_rev)

      book2 =
        save_state(%{
          book
          | "bids" => bids2,
            "asks" => asks2,
            "trades" => trades_rev ++ book["trades"]
        })

      {book2, %{"success" => true, "order" => order, "trades" => trades}, trade_seq}
    end
  end

  def cancel_order(book, order_id, player_id) do
    case find_own_order(book["bids"], order_id, player_id) do
      {index, removed} ->
        book2 = save_state(%{book | "bids" => List.delete_at(book["bids"], index)})
        {book2, %{"success" => true, "order" => removed}}

      nil ->
        case find_own_order(book["asks"], order_id, player_id) do
          {index, removed} ->
            book2 = save_state(%{book | "asks" => List.delete_at(book["asks"], index)})
            {book2, %{"success" => true, "order" => removed}}

          nil ->
            {book, %{"success" => false, "reason" => "not_found"}}
        end
    end
  end

  def get_book_snapshot(book, crop_id) do
    summary = fn order ->
      %{
        "id" => order["id"],
        "playerId" => order["playerId"],
        "price" => order["price"],
        "quantity" => order["quantity"] - order["filled"],
        "cropId" => order["cropId"]
      }
    end

    filter_crop = fn list ->
      if crop_id, do: Enum.filter(list, &(&1["cropId"] == crop_id)), else: list
    end

    %{
      "bids" => book["bids"] |> filter_crop.() |> Enum.map(summary),
      "asks" => book["asks"] |> filter_crop.() |> Enum.map(summary),
      "trades" => Enum.take(book["trades"], 20)
    }
  end

  defp save_state(%{"bids" => bids, "asks" => asks, "trades" => trades} = book) do
    storage = %{"state" => %{"orders" => bids ++ asks, "trades" => Enum.take(trades, -100)}}
    %{book | "storage" => storage}
  end

  defp sort_bids(bids), do: stable_sort(bids, &-&1["price"])
  defp sort_asks(asks), do: stable_sort(asks, & &1["price"])

  defp stable_sort(list, price_key) do
    list
    |> Enum.with_index()
    |> Enum.sort_by(fn {order, index} -> {price_key.(order), order["createdAt"], index} end)
    |> Enum.map(&elem(&1, 0))
  end

  defp match(side, makers, others, order, trades_rev, seq, now) do
    match_loop(side, makers, [], others, order, trades_rev, seq, now)
  end

  defp match_loop(side, makers, kept, others, order, trades_rev, seq, now) do
    cond do
      not js_lt(order["filled"], order["quantity"]) ->
        {trades_rev, Enum.reverse(kept, makers), others, order, seq}

      true ->
        case makers do
          [] ->
            {trades_rev, Enum.reverse(kept), others, order, seq}

          [best | rest] ->
            cond do
              best["cropId"] != order["cropId"] ->
                {trades_rev, Enum.reverse(kept, makers), others, order, seq}

              not crossing?(side, best, order) ->
                {trades_rev, Enum.reverse(kept, makers), others, order, seq}

              true ->
                available = best["quantity"] - best["filled"]
                remaining = order["quantity"] - order["filled"]
                match_qty = min(available, remaining)
                exec_price = best["price"]
                trade_value = match_qty * exec_price
                fee = Kernel.max(1, Numeric.js_round(trade_value * @fee_rate))

                {buyer_id, seller_id, quality} =
                  if side == :buy do
                    {order["playerId"], best["playerId"], best["quality"]}
                  else
                    {best["playerId"], order["playerId"], order["quality"]}
                  end

                trade = %{
                  "id" => trade_id(now, seq),
                  "buyerId" => buyer_id,
                  "sellerId" => seller_id,
                  "cropId" => order["cropId"],
                  "price" => exec_price,
                  "quantity" => match_qty,
                  "quality" => quality,
                  "value" => trade_value,
                  "fee" => fee,
                  "executedAt" => now
                }

                order2 = Map.put(order, "filled", order["filled"] + match_qty)
                best2 = Map.put(best, "filled", best["filled"] + match_qty)

                if best2["filled"] >= best2["quantity"] do
                  match_loop(side, rest, kept, others, order2, [trade | trades_rev], seq + 1, now)
                else
                  match_loop(side, rest, [best2 | kept], others, order2, [trade | trades_rev], seq + 1, now)
                end
            end
        end
    end
  end

  defp crossing?(:buy, best, order), do: not js_gt(best["price"], order["price"])
  defp crossing?(:sell, best, order), do: not js_lt(best["price"], order["price"])

  defp trade_id(now, seq), do: "trade_#{now}_#{seq}"

  defp find_own_order(orders, order_id, player_id) do
    Enum.find_index(orders, fn order -> order["id"] == order_id and order["playerId"] == player_id end)
    |> case do
      nil -> nil
      index -> {index, Enum.at(orders, index)}
    end
  end

  defp js_falsy?(:undefined), do: true
  defp js_falsy?(nil), do: true
  defp js_falsy?(false), do: true
  defp js_falsy?(value) when is_number(value) and value == 0, do: true
  defp js_falsy?(value) when is_binary(value), do: value == ""
  defp js_falsy?(_), do: false

  defp leq_zero?(value) when is_number(value), do: value <= 0
  defp leq_zero?(nil), do: true
  defp leq_zero?(:undefined), do: false
  defp leq_zero?(_), do: false

  defp js_gt(a, b) when is_number(a) and is_number(b), do: a > b
  defp js_gt(_, _), do: false

  defp js_lt(a, b) when is_number(a) and is_number(b), do: a < b
  defp js_lt(_, _), do: false

  defp js_round(:undefined), do: :nan
  defp js_round(value), do: Numeric.js_round(value)

  defp js_field(map, key), do: Map.get(map, key, :undefined)
end

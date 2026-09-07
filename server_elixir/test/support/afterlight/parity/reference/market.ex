defmodule Afterlight.Parity.Reference.Market do
  @moduledoc """
  Parity reference for `shared/economy.js` + `server/orderbook.js`.
  Delegates to `Afterlight.Economy.Pricing` and `Afterlight.Economy.OrderBook`.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Economy.OrderBook
  alias Afterlight.Economy.Pricing

  @t0 1_700_000_000_000
  @pd_book :parity_market_book
  @pd_pinned :parity_market_pinned
  @pd_trade_seq :parity_market_trade_seq

  @impl true
  def run_case_fn("getSellableGood", [good_id], _now), do: Pricing.get_sellable_good(good_id)

  def run_case_fn("calculateNpcSellPrice", [crop_id, quality, market_multiplier], _now),
    do: Pricing.calculate_npc_sell_price(crop_id, quality, market_multiplier)

  def run_case_fn("calculateNpcSeedPrice", [crop_id, market_multiplier], _now),
    do: Pricing.calculate_npc_seed_price(crop_id, market_multiplier)

  def run_case_fn("clampMultiplier", [mult], _now), do: Pricing.clamp_multiplier(mult)

  def run_case_fn("passThrough", [value], _now) do
    Process.put(@pd_pinned, value)
    value
  end

  def run_case_fn("updateMarketMultiplier", [prev_arg, net_demand], _now) do
    base = Process.get(@pd_pinned, prev_arg)
    Pricing.update_market_multiplier(base, net_demand)
  end

  def run_case_fn("newBook", [], _now) do
    book = OrderBook.fresh()
    Process.put(@pd_trade_seq, 0)
    put_book(book)
    book
  end

  def run_case_fn("seedBook", [orders], _now) do
    Process.put(@pd_trade_seq, 0)

    book =
      Enum.reduce(orders, OrderBook.fresh(), fn order, acc ->
        {acc2, _result, _seq} = OrderBook.place_order(acc, order, @t0, next_seq())
        acc2
      end)

    put_book(book)
    book
  end

  def run_case_fn("placeOnPrev", [prev, order], _now) do
    book = current_book(prev)
    {book2, result, seq} = OrderBook.place_order(book, order, @t0, next_seq())
    Process.put(@pd_trade_seq, seq)
    put_book(book2)
    result
  end

  def run_case_fn("cancelOnPrev", [prev, order_id, player_id], _now) do
    {book2, result} = current_book(prev) |> OrderBook.cancel_order(order_id, player_id)
    put_book(book2)
    result
  end

  def run_case_fn("snapshotPrev", [prev, crop_id], _now) do
    current_book(prev) |> OrderBook.get_book_snapshot(crop_id)
  end

  def run_case_fn(fname, _args, _now), do: raise("market reference: unknown fn #{inspect(fname)}")

  defp put_book(book), do: Process.put(@pd_book, book)

  defp current_book(prev) do
    case Process.get(@pd_book) do
      %{} = book -> book
      nil -> if is_map(prev), do: prev, else: raise("market reference: no book threaded for script")
    end
  end

  defp next_seq, do: Process.get(@pd_trade_seq, 0)
end

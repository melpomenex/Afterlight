defmodule Afterlight.Parity.Reference.Market do
  @moduledoc """
  Parity reference for `shared/economy.js` + `server/orderbook.js`, pinned by
  `tests/fixtures/parity/market.json` (exported by `scripts/parity/market.mjs`).

  Ported entry points (fixture `fn` names):

    * economy — `getSellableGood`, `calculateNpcSellPrice`,
      `calculateNpcSeedPrice`, `clampMultiplier`, `updateMarketMultiplier`
      (plus the recorder helper `passThrough`)
    * orderbook script helpers — `newBook`, `seedBook`, `placeOnPrev`,
      `cancelOnPrev`, `snapshotPrev` (thin wrappers over a pure
      `OrderBook` port of `placeOrder` / `cancelOrder` / `getBookSnapshot`)

  ## JS numeric hazards

    * `Math.round` → `Afterlight.Parity.Hazards.js_round/1` (half toward
      +Infinity): order price/quantity rounding, sell/seed price rounding,
      and the trade fee `max(1, round(value * 0.02))` (the
      `fee-half-even-divergence-tv125` case pins 125 * 0.02 → 2.5000…4 → 3,
      where half-even rounding would give 2).
    * `Number(mult.toFixed(3))` → `js_number_from_fixed_3/1`: the binary
      double is formatted with exactly 3 decimals (round-to-nearest on the
      exact value; a tie cannot occur at 3 decimals because halfway decimals
      such as 0.0005 are not dyadic rationals, so no double ever lands exactly
      on one) and parsed back. `:erlang.float_to_binary(f, decimals: 3)`
      reproduces JS `toFixed(3)` exactly here — verified against node over the
      multiplier chains and adversarial near-half values — while
      `Float.round/2` (half-even, decimal semantics) does not.

  ## Script state threading (the keepPrev hazard)

  The JS recorder pins `"<prev>"` to the STEP-0 result for `keepPrev` scripts
  and relies on JS mutating that object in place: `seedBook` returns the live
  `OrderBook`, every later `placeOnPrev` mutates it, and each step's recorded
  `expected` is only the step's RETURN value (the `placeOrder`/`cancelOrder`
  result or the snapshot). The Elixir runner instead threads `prev = previous
  step's result`, which would feed a placeOrder result where the next step
  needs the book.

  Fix: the canonical book lives in the PROCESS DICTIONARY while a book script
  runs. `newBook`/`seedBook` install a fresh book, `placeOnPrev`/`cancelOnPrev`
  fetch it, update it in place, and return ONLY the operation result the step
  `expected` pins; `snapshotPrev` fetches it. This is safe because
  `Afterlight.Parity.run_file` runs every case of the fixture sequentially in
  a single test process (`Enum.reduce`), and each book script begins with
  `newBook`/`seedBook`, which reset the slot. The same mechanism carries the
  pinned start multiplier for the `multiplier/*` scripts: the recorder passed
  the pinned step-0 value to EVERY `updateMarketMultiplier` step, so those
  calls are independent `u(start, demand)` evaluations, not a chain.

  Clock is frozen at the recorder's `T0 = 1_700_000_000_000` (the recorded
  `createdAt`/`executedAt` values). Trade ids are deterministic
  `trade_<now>_<n>` (only `[0-9a-z]`, matching the harness `trade_*`
  generated-id pattern the `<gen:N>` tokens bind against positionally).

  Known harness caveat: the fixture's case-level `expected.prev` holds the JS
  step-0 object's FINAL (mutated) state, while `Afterlight.Parity.run_steps`
  threads the LAST step's result into that comparison — these coincide only
  for `multiplier/sell-push-down` (the final step clamps back to the start
  value). The step-level expectations fully pin behavior via the process
  dictionary mechanism above.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Parity.Hazards

  @t0 1_700_000_000_000
  @fee_rate 0.02
  @min_price_multiplier 0.4
  @max_price_multiplier 2.5
  @mean_reversion_rate 0.05
  @volume_sensitivity 0.03

  @pd_book :parity_market_book
  @pd_pinned :parity_market_pinned
  @pd_trade_seq :parity_market_trade_seq

  # -- shared/crops.js + shared/materials.js catalog data ---------------------

  @quality_multipliers %{"C" => 0.8, "B" => 1.0, "A" => 1.35, "A+" => 1.8}

  @crops %{
    "radish" => %{
      "id" => "radish",
      "name" => "Red Radish",
      "tagline" => "Crisp peppery roots, fast to harvest.",
      "seedCost" => 4,
      "basePrice" => 8,
      "growDuration" => 25,
      "waterDemand" => 1.0,
      "yield" => 2,
      "repeatHarvest" => false,
      "color" => "#4d8050",
      "produceColor" => "#c93b4a",
      "xp" => 12,
      "unlockLevel" => 1
    },
    "lettuce" => %{
      "id" => "lettuce",
      "name" => "Rain Crisp Lettuce",
      "tagline" => "Tender layered greens favored by market cafes.",
      "seedCost" => 6,
      "basePrice" => 12,
      "growDuration" => 40,
      "waterDemand" => 1.2,
      "yield" => 2,
      "repeatHarvest" => false,
      "color" => "#65a759",
      "produceColor" => "#83cf72",
      "xp" => 18,
      "unlockLevel" => 1
    },
    "carrot" => %{
      "id" => "carrot",
      "name" => "Amber Carrot",
      "tagline" => "Deep sweet orange taproots grown in dark tilled soil.",
      "seedCost" => 8,
      "basePrice" => 17,
      "growDuration" => 60,
      "waterDemand" => 0.9,
      "yield" => 2,
      "repeatHarvest" => false,
      "color" => "#498845",
      "produceColor" => "#e07a2a",
      "xp" => 25,
      "unlockLevel" => 1
    },
    "kale" => %{
      "id" => "kale",
      "name" => "Winter Kale",
      "tagline" => "Hearty ruffled brassica that thrives in cold rain.",
      "seedCost" => 12,
      "basePrice" => 24,
      "growDuration" => 80,
      "waterDemand" => 0.8,
      "yield" => 3,
      "repeatHarvest" => false,
      "color" => "#2d6148",
      "produceColor" => "#3d785a",
      "xp" => 32,
      "unlockLevel" => 2
    },
    "basil" => %{
      "id" => "basil",
      "name" => "Copper Basil",
      "tagline" => "Aromatic dark purple-green leaves prized by the apothecary.",
      "seedCost" => 15,
      "basePrice" => 32,
      "growDuration" => 100,
      "waterDemand" => 1.3,
      "yield" => 3,
      "repeatHarvest" => false,
      "color" => "#425a40",
      "produceColor" => "#7b3e64",
      "xp" => 40,
      "unlockLevel" => 2
    },
    "tomato" => %{
      "id" => "tomato",
      "name" => "Lantern Tomato",
      "tagline" => "Heavy climbing vine with glowing scarlet fruit. Continues bearing.",
      "seedCost" => 22,
      "basePrice" => 28,
      "growDuration" => 120,
      "waterDemand" => 1.1,
      "yield" => 3,
      "repeatHarvest" => true,
      "regrowDuration" => 45,
      "color" => "#3f7842",
      "produceColor" => "#d6422f",
      "xp" => 50,
      "unlockLevel" => 3
    },
    "strawberry" => %{
      "id" => "strawberry",
      "name" => "Dew Strawberry",
      "tagline" => "Low creeping runners with bright sweet red berries.",
      "seedCost" => 28,
      "basePrice" => 38,
      "growDuration" => 140,
      "waterDemand" => 1.4,
      "yield" => 4,
      "repeatHarvest" => true,
      "regrowDuration" => 50,
      "color" => "#39784b",
      "produceColor" => "#e6324b",
      "xp" => 65,
      "unlockLevel" => 3
    },
    "wheat" => %{
      "id" => "wheat",
      "name" => "Hearth Wheat",
      "tagline" => "Golden milling grain. The Great Mill grinds it into flour.",
      "seedCost" => 4,
      "basePrice" => 9,
      "growDuration" => 30,
      "waterDemand" => 1.0,
      "yield" => 2,
      "repeatHarvest" => false,
      "color" => "#8a8a3d",
      "produceColor" => "#d9b45a",
      "xp" => 14,
      "unlockLevel" => 1
    }
  }

  @goods %{
    "flour" => %{
      "id" => "flour",
      "name" => "Stone-Ground Flour",
      "tagline" => "Fine milled flour from the Great Mill. Bakers pay a premium.",
      "basePrice" => 14
    }
  }

  # -- dispatch ---------------------------------------------------------------

  @impl Afterlight.Parity.Reference
  def run_case_fn("getSellableGood", [good_id], _now), do: get_sellable_good(good_id)

  def run_case_fn("calculateNpcSellPrice", [crop_id, quality, market_multiplier], _now) do
    calculate_npc_sell_price(crop_id, quality, market_multiplier)
  end

  def run_case_fn("calculateNpcSeedPrice", [crop_id, market_multiplier], _now) do
    calculate_npc_seed_price(crop_id, market_multiplier)
  end

  def run_case_fn("clampMultiplier", [mult], _now), do: clamp_multiplier(mult)

  def run_case_fn("passThrough", [value], _now) do
    # Recorder helper for the multiplier scripts: pins the start multiplier so
    # every updateMarketMultiplier step evaluates u(start, demand).
    Process.put(@pd_pinned, value)
    value
  end

  def run_case_fn("updateMarketMultiplier", [prev_arg, net_demand], _now) do
    base = Process.get(@pd_pinned, prev_arg)
    update_market_multiplier(base, net_demand)
  end

  def run_case_fn("newBook", [], _now) do
    book = new_book()
    put_book(book)
    book
  end

  def run_case_fn("seedBook", [orders], _now) do
    Process.put(@pd_trade_seq, 0)

    book =
      Enum.reduce(orders, fresh_book(), fn order, acc ->
        {acc2, _result} = place_order(acc, order, @t0)
        acc2
      end)

    put_book(book)
    book
  end

  def run_case_fn("placeOnPrev", [prev, order], _now) do
    {book2, result} = prev |> current_book() |> place_order(order, @t0)
    put_book(book2)
    result
  end

  def run_case_fn("cancelOnPrev", [prev, order_id, player_id], _now) do
    {book2, result} = prev |> current_book() |> cancel_order(order_id, player_id)
    put_book(book2)
    result
  end

  def run_case_fn("snapshotPrev", [prev, crop_id], _now) do
    prev |> current_book() |> get_book_snapshot(crop_id)
  end

  def run_case_fn(fname, _args, _now), do: raise("market reference: unknown fn #{inspect(fname)}")

  # -- shared/economy.js ------------------------------------------------------

  defp get_sellable_good(good_id), do: Map.get(@crops, good_id) || Map.get(@goods, good_id)

  defp calculate_npc_sell_price(crop_id, quality, market_multiplier) do
    case get_sellable_good(crop_id) do
      nil ->
        0

      good ->
        # QUALITY_MULTIPLIERS[quality] ?? 1.0
        qual_mult = Map.get(@quality_multipliers, quality, 1.0)
        # NPC instant buyback: 15% liquidity spread discount below market spot
        Kernel.max(1, Hazards.js_round(good["basePrice"] * market_multiplier * qual_mult * 0.85))
    end
  end

  defp calculate_npc_seed_price(crop_id, market_multiplier) do
    case Map.get(@crops, crop_id) do
      nil ->
        0

      crop ->
        # Seeds scale gently with market demand (damped by 0.4)
        damped_multiplier = 1.0 + (market_multiplier - 1.0) * 0.4
        Kernel.max(1, Hazards.js_round(crop["seedCost"] * damped_multiplier))
    end
  end

  defp clamp_multiplier(mult) do
    :erlang.max(@min_price_multiplier, :erlang.min(@max_price_multiplier, mult))
  end

  defp update_market_multiplier(current_mult, net_demand) do
    mult = current_mult + net_demand * @volume_sensitivity
    mult = mult + (1.0 - mult) * @mean_reversion_rate
    js_number_from_fixed_3(clamp_multiplier(mult))
  end

  # JS Number(x.toFixed(3)): format the exact binary double with 3 decimals
  # (round-to-nearest; no ties possible at 3 decimals) and parse back.
  defp js_number_from_fixed_3(x) do
    String.to_float(:erlang.float_to_binary(x * 1.0, decimals: 3))
  end

  # -- server/orderbook.js (pure OrderBook port) ------------------------------

  # Book shape mirrors the serialized JS instance (what the fixture records):
  # %{"storage" => %{"state" => %{"orders" => [...], "trades" => [...]}},
  #   "bids" => [...], "asks" => [...], "trades" => [...]}
  defp fresh_book do
    %{
      "storage" => %{"state" => %{"orders" => [], "trades" => []}},
      "bids" => [],
      "asks" => [],
      "trades" => []
    }
  end

  defp new_book do
    Process.put(@pd_trade_seq, 0)
    fresh_book()
  end

  defp put_book(book), do: Process.put(@pd_book, book)

  defp current_book(prev) do
    case Process.get(@pd_book) do
      %{} = book -> book
      nil -> if is_map(prev), do: prev, else: raise("market reference: no book threaded for script")
    end
  end

  # saveState(): storage.state.orders = [...bids, ...asks]; trades keep last 100.
  defp save_state(%{"bids" => bids, "asks" => asks, "trades" => trades} = book) do
    storage = %{"state" => %{"orders" => bids ++ asks, "trades" => Enum.take(trades, -100)}}
    %{book | "storage" => storage}
  end

  # sortBooks(): bids price desc then createdAt asc; asks price asc then
  # createdAt asc. JS Array#sort is stable — ties keep insertion order, so the
  # index is the final tiebreaker.
  defp sort_bids(bids), do: stable_sort(bids, &-&1["price"])
  defp sort_asks(asks), do: stable_sort(asks, & &1["price"])

  defp stable_sort(list, price_key) do
    list
    |> Enum.with_index()
    |> Enum.sort_by(fn {order, index} -> {price_key.(order), order["createdAt"], index} end)
    |> Enum.map(&elem(&1, 0))
  end

  defp place_order(book, raw, now) do
    id = js_field(raw, "id")
    player_id = js_field(raw, "playerId")
    side = js_field(raw, "side")
    crop_id = js_field(raw, "cropId")
    price = js_field(raw, "price")
    quantity = js_field(raw, "quantity")

    if js_falsy?(id) or js_falsy?(player_id) or js_falsy?(side) or js_falsy?(crop_id) or
         leq_zero?(price) or leq_zero?(quantity) do
      {book, %{"success" => false, "reason" => "invalid_order_params"}}
    else
      quality =
        case Map.fetch(raw, "quality") do
          # JS default param applies only when the key is absent (undefined)
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

      seq = Process.get(@pd_trade_seq, 0)

      {trades_rev, bids, asks, order, seq} =
        case side do
          "buy" ->
            # Taker buy matches against the asks; bids are untouched until rest.
            {trades_rev, asks2, bids2, order2, seq} = match(:buy, book["asks"], book["bids"], order, [], seq, now)
            {trades_rev, bids2, asks2, order2, seq}

          "sell" ->
            match(:sell, book["bids"], book["asks"], order, [], seq, now)

          _ ->
            # Unknown side: neither branch runs, order does not rest.
            {[], book["bids"], book["asks"], order, seq}
        end

      Process.put(@pd_trade_seq, seq)

      # while (order.filled < order.quantity) — JS `<` (NaN quantity never rests)
      rest? = js_lt(order["filled"], order["quantity"])

      {bids2, asks2} =
        cond do
          side == "buy" and rest? ->
            {sort_bids(bids ++ [order]), asks}

          side == "sell" and rest? ->
            {bids, sort_asks(asks ++ [order])}

          true ->
            {bids, asks}
        end

      trades = Enum.reverse(trades_rev)
      # this.trades.unshift(trade) per fill — newest ends up first, which is
      # exactly the accumulator order.
      book2 = save_state(%{book | "bids" => bids2, "asks" => asks2, "trades" => trades_rev ++ book["trades"]})

      {book2, %{"success" => true, "order" => order, "trades" => trades}}
    end
  end

  # Matching: only the best maker (head of the list) is considered; a crop
  # mismatch or non-crossing price BREAKS the loop (no skipping). Execution is
  # at the maker's price; fully-filled makers shift off the list. Self-match is
  # allowed. Returns {trades_reversed, makers, others, order, next_seq} where
  # `makers` is the reassembled maker-side list and `others` the other side.
  defp match(side, makers, others, order, trades_rev, seq, now) do
    match_loop(side, makers, [], others, order, trades_rev, seq, now)
  end

  # `kept` accumulates (reversed) the processed makers that remain on the book.
  # The loop condition is `while (order.filled < order.quantity)` — JS `<`
  # semantics (a NaN quantity exits immediately).
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
                fee = Kernel.max(1, Hazards.js_round(trade_value * @fee_rate))

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
                  # Fully-filled maker is removed (shift); the loop continues.
                  match_loop(side, rest, kept, others, order2, [trade | trades_rev], seq + 1, now)
                else
                  match_loop(side, rest, [best2 | kept], others, order2, [trade | trades_rev], seq + 1, now)
                end
            end
        end
    end
  end

  # buy: `if (bestAsk.price > order.price) break;`
  # sell: `if (bestBid.price < order.price) break;`
  # JS comparison with NaN is false, so a NaN-priced taker never breaks.
  defp crossing?(:buy, best, order), do: not js_gt(best["price"], order["price"])
  defp crossing?(:sell, best, order), do: not js_lt(best["price"], order["price"])

  defp js_gt(a, b) when is_number(a) and is_number(b), do: a > b
  defp js_gt(_, _), do: false

  defp js_lt(a, b) when is_number(a) and is_number(b), do: a < b
  defp js_lt(_, _), do: false

  defp trade_id(now, seq), do: "trade_#{now}_#{seq}"

  defp cancel_order(book, order_id, player_id) do
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

  defp find_own_order(orders, order_id, player_id) do
    Enum.find_index(orders, fn order -> order["id"] == order_id and order["playerId"] == player_id end)
    |> case do
      nil -> nil
      index -> {index, Enum.at(orders, index)}
    end
  end

  # getBookSnapshot(cropId): remaining = quantity - filled; trades are newest
  # first, capped at 20.
  defp get_book_snapshot(book, crop_id) do
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

  # -- JS primitives ----------------------------------------------------------

  # JS truthiness subset relevant to order fields ("", false, 0/±0.0, null,
  # undefined are falsy).
  defp js_falsy?(:undefined), do: true
  defp js_falsy?(nil), do: true
  defp js_falsy?(false), do: true
  defp js_falsy?(value) when is_number(value) and value == 0, do: true
  defp js_falsy?(value) when is_binary(value), do: value == ""
  defp js_falsy?(_), do: false

  # JS `price <= 0` with numeric coercion: numbers compare directly; null
  # coerces to 0 (true); undefined/NaN comparisons are false.
  defp leq_zero?(value) when is_number(value), do: value <= 0
  defp leq_zero?(nil), do: true
  defp leq_zero?(:undefined), do: false
  defp leq_zero?(_), do: false

  # Math.round(undefined) === NaN — represented as the :nan atom; it can never
  # enter the fixture corpus (the exporter JSON-serializes expected values).
  defp js_round(:undefined), do: :nan
  defp js_round(value), do: Hazards.js_round(value)

  defp js_field(map, key), do: Map.get(map, key, :undefined)
end

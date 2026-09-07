defmodule Afterlight.Parity.Economy do
  @moduledoc "Pure port of `shared/economy.js`."

  alias Afterlight.Parity.{Catalog, Numeric}

  @fee_rate 0.02
  @min_mult 0.4
  @max_mult 2.5
  @mean_reversion 0.05
  @volume_sensitivity 0.03

  def fee_rate, do: @fee_rate

  def calculate_npc_sell_price(crop_id, quality \\ "B", market_multiplier \\ 1.0) do
    case Catalog.sellable(crop_id) do
      nil ->
        0

      crop ->
        qual_mult = Map.get(Catalog.quality_multipliers(), quality, 1.0)
        unit = crop.base_price * market_multiplier * qual_mult * 0.85
        max(1, Numeric.js_round(unit))
    end
  end

  def calculate_npc_seed_price(crop_id, market_multiplier \\ 1.0) do
    case Catalog.crop(crop_id) do
      nil ->
        0

      crop ->
        damped = 1.0 + (market_multiplier - 1.0) * 0.4
        max(1, Numeric.js_round(crop.seed_cost * damped))
    end
  end

  def clamp_multiplier(mult) do
    max(@min_mult, min(@max_mult, mult))
  end

  def update_market_multiplier(current_mult, net_demand) do
    mult = current_mult + net_demand * @volume_sensitivity
    mult = mult + (1.0 - mult) * @mean_reversion
    Numeric.js_to_fixed_3(clamp_multiplier(mult))
  end

  def trade_fee(value) do
    max(1, Numeric.js_round(value * @fee_rate))
  end
end

defmodule Afterlight.Economy.Pricing do
  @moduledoc """
  NPC price math and market multiplier updates from `shared/economy.js`.
  """

  alias Afterlight.Economy.Catalog
  alias Afterlight.Gardens.Crops
  alias Afterlight.Parity.Numeric

  @min_price_multiplier 0.4
  @max_price_multiplier 2.5
  @mean_reversion_rate 0.05
  @volume_sensitivity 0.03

  def fee_rate, do: 0.02
  def min_price_multiplier, do: @min_price_multiplier
  def max_price_multiplier, do: @max_price_multiplier

  def get_sellable_good(good_id), do: Catalog.get_sellable(good_id)

  def calculate_npc_sell_price(crop_id, quality, market_multiplier) do
    case Catalog.get_sellable(crop_id) do
      nil ->
        0

      good ->
        qual_mult = Map.get(Crops.quality_multipliers(), quality, 1.0)
        Kernel.max(1, Numeric.js_round(good["basePrice"] * market_multiplier * qual_mult * 0.85))
    end
  end

  def calculate_npc_seed_price(crop_id, market_multiplier) do
    case Crops.get(crop_id) do
      nil ->
        0

      crop ->
        damped_multiplier = 1.0 + (market_multiplier - 1.0) * 0.4
        Kernel.max(1, Numeric.js_round(crop["seedCost"] * damped_multiplier))
    end
  end

  def clamp_multiplier(mult) do
    :erlang.max(@min_price_multiplier, :erlang.min(@max_price_multiplier, mult))
  end

  def update_market_multiplier(current_mult, net_demand) do
    mult = current_mult + net_demand * @volume_sensitivity
    mult = mult + (1.0 - mult) * @mean_reversion_rate
    Numeric.js_to_fixed_3(clamp_multiplier(mult))
  end
end

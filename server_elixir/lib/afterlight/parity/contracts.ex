defmodule Afterlight.Parity.Contracts do
  @moduledoc "Contract board generation port of `server/economy.js`."

  alias Afterlight.Parity.{Catalog, Numeric}

  @clients [
    "Lantern Café",
    "The Station Kitchen",
    "Old Canal Brewery",
    "Apothecary Green",
    "Harbor Commissary",
    "Rain Court Market Stand"
  ]

  def generate_board(rng, mill_restored?, now) do
    Enum.map(0..2, fn slot ->
      if mill_restored? and slot == floor_random(rng, 3) do
        flour_contract(rng, slot, now)
      else
        crop_contract(rng, slot, now)
      end
    end)
  end

  defp crop_contract(rng, slot, now) do
    crops = Catalog.crop_list()
    crop = Enum.at(crops, floor_random(rng, length(crops)))
    client = Enum.at(@clients, rem(slot * 2 + floor_random(rng, 2), length(@clients)))
    qty = floor_random(rng, 4) + 3
    min_quality = if rng.() > 0.4, do: "A", else: "B"
    base = crop.base_price * (if min_quality == "A", do: 1.35, else: 1.0) * qty

    %{
      id: "contract_#{now}_#{slot}",
      client: client,
      crop_id: crop.id,
      crop_name: crop.name,
      quantity: qty,
      min_quality: min_quality,
      reward: Numeric.js_round(base * 1.4),
      reputation: Numeric.js_round(qty * 5),
      xp: Numeric.js_round(qty * 8),
      expires_at: now + 10 * 60 * 1000,
      generated_at: now,
      tier: nil
    }
  end

  defp flour_contract(rng, slot, now) do
    good = Catalog.good("flour")
    client = Enum.at(@clients, rem(slot * 2 + floor_random(rng, 2), length(@clients)))
    qty = floor_random(rng, 3) + 2
    base = good.base_price * qty

    %{
      id: "contract_#{now}_#{slot}",
      client: client,
      crop_id: good.id,
      crop_name: good.name,
      quantity: qty,
      min_quality: "B",
      reward: Numeric.js_round(base * 1.4),
      reputation: Numeric.js_round(qty * 5),
      xp: Numeric.js_round(qty * 8),
      expires_at: now + 10 * 60 * 1000,
      generated_at: now,
      tier: "flour"
    }
  end

  defp floor_random(rng, n) do
    trunc(rng.() * n)
  end
end

defmodule Afterlight.Economy.Contracts do
  @moduledoc """
  Contract board generation and fulfillment from `server/economy.js`.
  """

  alias Afterlight.Economy.Catalog
  alias Afterlight.Gardens.Crops
  alias Afterlight.Parity.Numeric
  alias Afterlight.Restoration.Machines

  @clients [
    "Lantern Café",
    "The Station Kitchen",
    "Old Canal Brewery",
    "Apothecary Green",
    "Harbor Commissary",
    "Rain Court Market Stand"
  ]

  @quality_rank %{"C" => 1, "B" => 2, "A" => 3, "A+" => 4}

  @refresh_ms 5 * 60 * 1000
  @expires_ms 10 * 60 * 1000

  def refresh_ms, do: @refresh_ms

  def generate_contracts(state, now, rng) do
    mill_restored = Machines.mill_restored_in_state?(state)

    Enum.map(0..2, fn slot ->
      if mill_restored and slot == js_floor(rng.() * 3) do
        generate_flour_contract(slot, now, rng)
      else
        generate_crop_contract(slot, now, rng)
      end
    end)
  end

  def generate_flour_contract(slot_index, now, rng) do
    client = Enum.at(@clients, rem(slot_index * 2 + js_floor(rng.() * 2), length(@clients)))
    good = Catalog.get("flour")
    qty = js_floor(rng.() * 3) + 2
    base_val = good["basePrice"] * qty
    reward = Numeric.js_round(base_val * 1.4)

    %{
      "id" => "contract_#{now}_#{slot_index}",
      "client" => client,
      "cropId" => good["id"],
      "cropName" => good["name"],
      "quantity" => qty,
      "minQuality" => "B",
      "reward" => reward,
      "reputation" => Numeric.js_round(qty * 5),
      "xp" => Numeric.js_round(qty * 8),
      "expiresAt" => now + @expires_ms,
      "tier" => "flour"
    }
  end

  def generate_crop_contract(slot_index, now, rng) do
    crop = Enum.at(Crops.crop_list(), js_floor(rng.() * length(Crops.crop_list())))
    client = Enum.at(@clients, rem(slot_index * 2 + js_floor(rng.() * 2), length(@clients)))
    qty = js_floor(rng.() * 4) + 3
    min_quality = if rng.() > 0.4, do: "A", else: "B"
    base_val = crop["basePrice"] * (if min_quality == "A", do: 1.35, else: 1.0) * qty
    reward = Numeric.js_round(base_val * 1.4)

    %{
      "id" => "contract_#{now}_#{slot_index}",
      "client" => client,
      "cropId" => crop["id"],
      "cropName" => crop["name"],
      "quantity" => qty,
      "minQuality" => min_quality,
      "reward" => reward,
      "reputation" => Numeric.js_round(qty * 5),
      "xp" => Numeric.js_round(qty * 8),
      "expiresAt" => now + @expires_ms
    }
  end

  def tick_contracts(%{contracts: contracts, last_refresh_at: last} = board, now, rng) do
    if now - last > @refresh_ms do
      {%{board | contracts: generate_contracts(board.state, now, rng), last_refresh_at: now}, true}
    else
      {board, false}
    end
  end

  def refresh_contracts(board, now, rng) do
    %{board | contracts: generate_contracts(board.state, now, rng), last_refresh_at: now}
  end

  def fulfill_contract(contracts, player, contract_id) do
    case Enum.find_index(contracts, &(&1["id"] == contract_id)) do
      nil ->
        {%{"success" => false, "reason" => "contract_not_found"}, contracts, player}

      idx ->
        contract = Enum.at(contracts, idx)
        produce = get_in(player, ["inventory", "produce"]) || %{}
        min_rank = Map.get(@quality_rank, contract["minQuality"], 2)

        {available, eligible_keys} =
          Enum.reduce(produce, {0, []}, fn {key, count}, {avail, keys} ->
            [crop_id, quality] = String.split(key, "_", parts: 2)
            rank = Map.get(@quality_rank, quality, 1)

            if crop_id == contract["cropId"] and rank >= min_rank do
              {avail + count, keys ++ [%{"key" => key, "count" => count}]}
            else
              {avail, keys}
            end
          end)

        if available < contract["quantity"] do
          {%{"success" => false, "reason" => "insufficient_qualifying_produce"}, contracts, player}
        else
          {produce, _} =
            Enum.reduce(eligible_keys, {produce, contract["quantity"]}, fn item, {produce, left} ->
              if left <= 0 do
                {produce, 0}
              else
                take = min(item["count"], left)
                left_after = item["count"] - take

                produce =
                  if left_after <= 0 do
                    Map.delete(produce, item["key"])
                  else
                    Map.put(produce, item["key"], left_after)
                  end

                {produce, left - take}
              end
            end)

          player =
            player
            |> put_in(["inventory", "produce"], produce)
            |> Map.update!("coins", &(&1 + contract["reward"]))
            |> Map.update!("reputation", &((&1 || 0) + contract["reputation"]))
            |> then(fn p ->
              new_xp = p["xp"] + contract["xp"]

              p
              |> Map.put("xp", new_xp)
              |> Map.put("level", js_level(new_xp))
            end)

          contracts = List.delete_at(contracts, idx)

          result = %{
            "success" => true,
            "contract" => contract,
            "coins" => player["coins"],
            "reputation" => player["reputation"],
            "xp" => player["xp"],
            "level" => player["level"],
            "inventory" => player["inventory"]
          }

          {result, contracts, player}
        end
    end
  end

  defp js_level(xp), do: trunc(Float.floor(xp / 100)) + 1

  defp js_floor(n) when is_integer(n), do: n
  defp js_floor(n) when is_float(n), do: Float.floor(n) |> trunc()
end

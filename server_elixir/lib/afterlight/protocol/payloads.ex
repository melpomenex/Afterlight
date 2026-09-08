defmodule Afterlight.Protocol.Payloads do
  @moduledoc """
  Wire payload builders with JS object-literal insertion order (design D9).
  """

  alias Afterlight.Parity.{Catalog, Economy}

  def garden_state(room_id, beds, fixtures \\ nil) do
    base = %{roomId: room_id, beds: Enum.map(beds, &bed_wire/1)}
    if fixtures && fixtures != [], do: Map.put(base, :fixtures, fixtures), else: base
  end

  def bed_wire(bed) do
    %{
      index: bed.index,
      prepared: bed.prepared,
      cropId: bed.crop_id,
      plantedAt: bed.planted_at,
      lastWateredAt: bed.last_watered_at,
      moisture: bed.moisture,
      health: bed.health,
      moistureHistorySum: bed.moisture_history_sum,
      moistureChecks: bed.moisture_checks,
      stage: bed.stage,
      harvestCount: bed.harvest_count
    }
  end

  def inventory_state(player) do
    inv = player.inventory || %{}
    seeds = Map.get(inv, :seeds, %{})
    produce = Map.get(inv, :produce, %{})
    reserved = Map.get(inv, :reserved_produce, %{})
    sprinklers = Map.get(inv, :sprinklers, 0)
    materials = player.materials || %{}

    inventory =
      %{seeds: omit_zeros(seeds), produce: omit_zeros(produce), reservedProduce: omit_zeros(reserved)}
      |> maybe_put_sprinklers(sprinklers)

    %{
      player: %{
        id: player.id,
        nickname: player.nickname,
        coins: player.coins,
        xp: player.xp,
        level: player.level,
        reputation: player.reputation,
        reservedCoins: player.reserved_coins,
        inventory: inventory,
        materials: omit_zeros(materials),
        currentRoom: player.current_room,
        lastSeen: player.last_seen
      }
    }
  end

  def market_update(prices, order_book) do
    %{prices: prices, orderBook: order_book}
  end

  def prices_snapshot(multipliers) do
    crops =
      Enum.map(Catalog.crop_list(), fn crop ->
        mult = Map.get(multipliers, crop.id, 1.0)

        %{
          cropId: crop.id,
          name: crop.name,
          basePrice: crop.base_price,
          multiplier: mult,
          instantBid: Economy.calculate_npc_sell_price(crop.id, "B", mult),
          instantAskSeed: Economy.calculate_npc_seed_price(crop.id, mult),
          seedCost: crop.seed_cost
        }
      end)

    goods =
      Enum.map(Catalog.good_list(), fn good ->
        mult = Map.get(multipliers, good.id, 1.0)

        %{
          cropId: good.id,
          name: good.name,
          basePrice: good.base_price,
          multiplier: mult,
          instantBid: Economy.calculate_npc_sell_price(good.id, "B", mult),
          isGood: true
        }
      end)

    Map.new(crops ++ goods, fn entry -> {entry.cropId, entry} end)
  end

  def contract_update(contracts) do
    %{contracts: Enum.map(contracts, &contract_wire/1)}
  end

  def contract_wire(c) do
    base = %{
      id: c.id,
      client: c.client,
      cropId: c.crop_id,
      cropName: c.crop_name,
      quantity: c.quantity,
      minQuality: c.min_quality,
      reward: c.reward,
      reputation: c.reputation,
      xp: c.xp,
      expiresAt: c.expires_at
    }

    if c.tier, do: Map.put(base, :tier, c.tier), else: base
  end

  def node_state(room_id, nodes) do
    %{roomId: room_id, nodes: Enum.map(nodes, &node_wire/1)}
  end

  defp node_wire(n) do
    %{
      nodeId: n.node_id,
      material: n.material,
      available: n.available,
      depletedAt: n.depleted_at,
      respawnAt: n.respawn_at
    }
  end

  def machine_update(machines) do
    %{machines: machines}
  end

  def mill_status(mill) do
    %{
      mill: %{
        status: mill.status,
        required: mill.required,
        contributed: mill.contributed,
        restoredAt: mill.restored_at
      }
    }
  end

  def action_result(opts) do
    opts = if is_list(opts), do: Map.new(opts), else: opts
    base = %{success: opts[:success] || opts["success"]}

    base =
      if id = opts[:action_id] || opts["actionId"],
        do: Map.put(base, :actionId, id),
        else: base

    base =
      if title = opts[:title] || opts["title"],
        do: Map.put(base, :title, title),
        else: base

    if msg = opts[:message] || opts["message"], do: Map.put(base, :message, msg), else: base
  end

  def harvest_message(yield, quality, name) do
    "Harvested #{yield}x Grade #{quality} #{name}!"
  end

  def trade_filled(trade) do
    %{trade: trade_wire(trade)}
  end

  def trade_wire(t) do
    %{
      id: Map.get(t, :public_id) || Map.get(t, :id) || Map.get(t, "public_id") || Map.get(t, "id"),
      buyerId: Map.get(t, :buyer_id) || Map.get(t, :buyerId) || Map.get(t, "buyer_id") || Map.get(t, "buyerId"),
      sellerId: Map.get(t, :seller_id) || Map.get(t, :sellerId) || Map.get(t, "seller_id") || Map.get(t, "sellerId"),
      cropId: Map.get(t, :crop_id) || Map.get(t, :cropId) || Map.get(t, "crop_id") || Map.get(t, "cropId"),
      quality: Map.get(t, :quality) || Map.get(t, "quality"),
      price: Map.get(t, :price) || Map.get(t, "price"),
      quantity: Map.get(t, :quantity) || Map.get(t, "quantity"),
      value: Map.get(t, :value) || Map.get(t, "value"),
      fee: Map.get(t, :fee) || Map.get(t, "fee"),
      executedAt: Map.get(t, :executed_at) || Map.get(t, :executedAt) || Map.get(t, "executed_at") || Map.get(t, "executedAt")
    }
  end

  defp omit_zeros(map) do
    Map.new(map, fn {k, v} -> {k, v} end)
    |> Enum.reject(fn {_k, v} -> v == 0 end)
    |> Map.new()
  end

  defp maybe_put_sprinklers(inv, 0), do: inv
  defp maybe_put_sprinklers(inv, n), do: Map.put(inv, :sprinklers, n)
end

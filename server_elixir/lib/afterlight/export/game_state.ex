defmodule Afterlight.Export.GameState do
  @moduledoc """
  Reverse export tool: writes a `game-state.json`-shaped file from PostgreSQL
  under an explicit write freeze (Task 6.4).

  This tool is strictly for forensic comparison, validation, and emergency downgrade
  to pre-P6 builds.
  """

  import Ecto.Query

  alias Afterlight.EconomyGroup.{Inventory, Wallet}
  alias Afterlight.Repo

  def write!(dest, opts \\ []) do
    unless Keyword.get(opts, :freeze_ack) == true do
      raise ArgumentError, "export_game_state requires freeze_ack: true (fresh write freeze)"
    end

    dest = Path.expand(dest)
    payload = export_map()

    File.mkdir_p!(Path.dirname(dest))
    File.write!(dest, Jason.encode!(payload, pretty: true) <> "\n")
    dest
  end

  def export_map do
    %{
      "version" => 1,
      "exportedAt" => System.system_time(:millisecond),
      "players" => export_players(),
      "gardens" => export_gardens(),
      "orders" => export_orders(),
      "trades" => export_trades(),
      "marketMultipliers" => export_market_multipliers(),
      "nodes" => export_nodes(),
      "machines" => export_machines(),
      "theater" => export_theater()
    }
  end

  def export_players do
    players =
      Repo.all(
        from(p in "players",
          order_by: p.id,
          select: map(p, [:id, :nickname, :xp, :level, :reputation, :current_room, :last_seen])
        )
      )

    Map.new(players, fn p ->
      wallet = Wallet.get(p.id)
      inv = Inventory.get_map(p.id)

      record = %{
        "id" => p.id,
        "nickname" => p.nickname,
        "coins" => wallet.coins,
        "xp" => p.xp,
        "level" => p.level,
        "reputation" => p.reputation,
        "reservedCoins" => wallet.reserved_coins,
        "inventory" => %{
          "seeds" => inv.seeds,
          "produce" => inv.produce,
          "reservedProduce" => inv.reserved_produce,
          "sprinklers" => inv.sprinklers
        },
        "materials" => inv.materials,
        "currentRoom" => p.current_room,
        "lastSeen" => p.last_seen
      }

      {p.id, record}
    end)
  end

  def export_gardens do
    gardens = Repo.all(from(g in "gardens", order_by: g.player_id, select: g.player_id))

    Map.new(gardens, fn player_id ->
      beds =
        Repo.all(
          from(b in "beds",
            where: b.garden_id == ^player_id,
            order_by: b.index,
            select:
              map(b, [
                :index,
                :prepared,
                :crop_id,
                :planted_at,
                :last_watered_at,
                :moisture,
                :health,
                :moisture_history_sum,
                :moisture_checks,
                :stage,
                :harvest_count
              ])
          )
        )
        |> Enum.map(fn b ->
          %{
            "index" => b.index,
            "prepared" => b.prepared,
            "cropId" => b.crop_id,
            "plantedAt" => b.planted_at,
            "lastWateredAt" => b.last_watered_at,
            "moisture" => b.moisture,
            "health" => b.health,
            "moistureHistorySum" => b.moisture_history_sum,
            "moistureChecks" => b.moisture_checks,
            "stage" => b.stage,
            "harvestCount" => b.harvest_count
          }
        end)

      fixtures =
        Repo.all(
          from(s in "sprinklers",
            where: s.garden_id == ^player_id,
            order_by: s.bed_index,
            select: map(s, [:bed_index, :type])
          )
        )
        |> Enum.map(fn s ->
          %{
            "bedIndex" => s.bed_index,
            "type" => s.type
          }
        end)

      garden_record =
        if fixtures != [] do
          %{"beds" => beds, "fixtures" => fixtures}
        else
          %{"beds" => beds}
        end

      {player_id, garden_record}
    end)
  end

  def export_orders do
    Repo.all(
      from(o in "orders",
        order_by: [asc: o.created_at, asc: o.id],
        select:
          map(o, [
            :id,
            :player_id,
            :side,
            :crop_id,
            :quality,
            :price,
            :quantity,
            :filled,
            :created_at,
            :cancelled_at
          ])
      )
    )
    |> Enum.map(fn o ->
      %{
        "id" => o.id,
        "playerId" => o.player_id,
        "side" => o.side,
        "cropId" => o.crop_id,
        "quality" => o.quality,
        "price" => o.price,
        "quantity" => o.quantity,
        "filled" => o.filled,
        "createdAt" => o.created_at,
        "cancelledAt" => o.cancelled_at
      }
    end)
  end

  def export_trades do
    Repo.all(
      from(t in "trades",
        order_by: [asc: t.executed_at, asc: t.id],
        select:
          map(t, [
            :public_id,
            :buyer_id,
            :seller_id,
            :crop_id,
            :quality,
            :price,
            :quantity,
            :value,
            :fee,
            :executed_at,
            :taker_order_id,
            :maker_order_id
          ])
      )
    )
    |> Enum.map(fn t ->
      %{
        "id" => t.public_id,
        "buyerId" => t.buyer_id,
        "sellerId" => t.seller_id,
        "cropId" => t.crop_id,
        "quality" => t.quality,
        "price" => t.price,
        "quantity" => t.quantity,
        "value" => t.value,
        "fee" => t.fee,
        "executedAt" => t.executed_at,
        "takerOrderId" => t.taker_order_id,
        "makerOrderId" => t.maker_order_id
      }
    end)
  end

  def export_market_multipliers do
    Repo.all(from(m in "market_multipliers", order_by: m.item_id, select: {m.item_id, m.multiplier}))
    |> Map.new()
  end

  def export_nodes do
    Repo.all(
      from(n in "gather_nodes",
        where: not is_nil(n.depleted_at),
        order_by: n.node_id,
        select: {n.node_id, n.depleted_at}
      )
    )
    |> Map.new()
  end

  def export_machines do
    mill = Repo.one(from(m in "machines", where: m.machine_id == "mill", select: map(m, [:status, :restored_at])))

    if mill do
      mats =
        Repo.all(
          from(mm in "machine_materials",
            where: mm.machine_id == "mill",
            order_by: mm.material,
            select: {mm.material, mm.required, mm.contributed}
          )
        )

      required = Map.new(mats, fn {m, r, _} -> {m, r} end)
      contributed = Map.new(mats, fn {m, _, c} -> {m, c} end)

      %{
        "mill" => %{
          "status" => mill.status,
          "required" => required,
          "contributed" => contributed,
          "restoredAt" => mill.restored_at
        }
      }
    else
      %{}
    end
  end

  def export_theater do
    try do
      Afterlight.Theater.Export.load_state()
    rescue
      _ -> %{"now" => nil, "queue" => []}
    end
  end
end

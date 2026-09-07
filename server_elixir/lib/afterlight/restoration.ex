defmodule Afterlight.Restoration do
  @moduledoc "Restoration domain — gather nodes and mill machines."

  import Ecto.Query

  alias Afterlight.{Accounts, Repo}
  alias Afterlight.Economy.ContractBoard
  alias Afterlight.EconomyGroup.{Command, Inventory, Ledger}
  alias Afterlight.Parity.Catalog
  alias Afterlight.Protocol.Payloads

  def ensure_nodes! do
    if Repo.aggregate("gather_nodes", :count) == 0 do
      Repo.insert_all(
        "gather_nodes",
        Enum.map(Catalog.material_nodes(), fn n ->
          %{node_id: n.id, district: n.district, material: n.material, respawn_ms: n.respawn_ms}
        end)
      )
    end

    ensure_mill!()
    :ok
  end

  def gather(actor, request_id, node_id, current_room) do
    node = Catalog.node(node_id)

    with %{} = node <- node,
         true <- node.district == current_room do
      Command.run_idempotent(actor, request_id, %{op: :gather, node_id: node_id}, fn ->
        now = Accounts.now_ms()

        Repo.transaction(fn ->
          {count, _} =
            Repo.update_all(
              from(n in "gather_nodes",
                where:
                  n.node_id == ^node_id and
                    (is_nil(n.depleted_at) or ^now >= n.depleted_at + n.respawn_ms),
                update: [set: [depleted_at: ^now]]
              ),
              []
            )

          if count == 1 do
            Inventory.adjust!(actor.player_id, "material", node.material, 1)
            Ledger.insert!(actor.player_id, "node_gather", "material", 1, item_id: node.material, command_ref: request_id)
            outbox_inventory(actor, actor.player_id)
            outbox_node_state(actor, node.district)

            {:ok,
             Payloads.action_result(
               actionId: request_id,
               success: true,
               title: "Gathered",
               message: "Pried loose 1x #{material_name(node.material)}."
             )}
          else
            row = Repo.one!(from n in "gather_nodes", where: n.node_id == ^node_id)
            respawn_at = row.depleted_at + row.respawn_ms
            {:error, %{reason: "node_depleted", respawn_at: respawn_at}}
          end
        end)
      end)
    else
      _ -> {:error, :unknown_node}
    end
  end

  def contribute_to_machine(actor, request_id, material, quantity) do
    Command.run_idempotent(actor, request_id, %{op: :contribute, material: material, qty: quantity}, fn ->
      now = Accounts.now_ms()
      mill = fetch_mill!()

      Repo.transaction(fn ->
        if mill.status == "restored" do
          Repo.rollback(:mill_already_restored)
        else
          unless material in Catalog.mill_material_ids(), do: Repo.rollback(:material_not_needed)

          requested = trunc(quantity)
          if requested <= 0, do: Repo.rollback(:invalid_quantity)

          held = Inventory.get_quantity(actor.player_id, "material", material)
          remaining = mill_remaining(mill, material)
          if remaining <= 0, do: Repo.rollback(:material_fulfilled)
          if held <= 0, do: Repo.rollback(:insufficient_materials)

          applied = min(min(requested, held), remaining)
          Inventory.adjust!(actor.player_id, "material", material, -applied)

          Repo.update_all(
            from(m in "machine_materials", where: m.machine_id == "mill" and m.material == ^material),
            inc: [contributed: applied]
          )

          Repo.insert_all("machine_contributions", [
            %{machine_id: "mill", player_id: actor.player_id, material: material, applied: applied, inserted_at: now}
          ])

          Ledger.insert!(actor.player_id, "mill_contribute", "material", -applied, item_id: material, command_ref: request_id)

          restored = mill_fully_contributed?()

          if restored do
            Repo.update_all(from(m in "machines", where: m.machine_id == "mill"), set: [status: "restored", restored_at: now])
            ContractBoard.reroll_on_mill_restore!()
          end

          Command.enqueue_outbox("market", "machine_update", Payloads.machine_update(Payloads.mill_status(fetch_mill!())), actor)
          outbox_inventory(actor, actor.player_id)

          {:ok, %{success: true, applied: applied, restored: restored}}
        end
      end)
    end)
  end

  def mill_wheat(actor, request_id, quantity) do
    Command.run_idempotent(actor, request_id, %{op: :mill_wheat, qty: quantity}, fn ->
      unless mill_restored?(), do: {:error, :mill_broken}

      requested = trunc(quantity)
      if requested <= 0, do: {:error, :invalid_quantity}

      Repo.transaction(fn ->
        available =
          Enum.reduce(Catalog.wheat_grades(), 0, fn q, acc ->
            acc + Inventory.get_quantity(actor.player_id, "produce", "wheat_#{q}")
          end)

        if available <= 0, do: Repo.rollback(:no_wheat)

        milled = min(requested, available)

        left =
          Enum.reduce(Catalog.wheat_grades(), milled, fn q, remaining ->
            if remaining <= 0 do
              remaining
            else
              key = "wheat_#{q}"
              held = Inventory.get_quantity(actor.player_id, "produce", key)
              take = min(held, remaining)

              if take > 0 do
                Inventory.adjust!(actor.player_id, "produce", key, -take)
                remaining - take
              else
                remaining
              end
            end
          end)

        if left > 0, do: Repo.rollback(:no_wheat)

        Inventory.adjust!(actor.player_id, "produce", "flour_B", milled)
        Ledger.insert!(actor.player_id, "mill_output", "produce", milled, item_id: "flour_B", command_ref: request_id)
        outbox_inventory(actor, actor.player_id)
        {:ok, %{success: true, milled: milled}}
      end)
    end)
  end

  def craft_sprinkler(actor, request_id) do
    Command.run_idempotent(actor, request_id, %{op: :craft_sprinkler}, fn ->
      sprinkler = Catalog.sprinkler()

      Repo.transaction(fn ->
        for {material, cost} <- sprinkler.cost do
          if Inventory.get_quantity(actor.player_id, "material", material) < cost do
            Repo.rollback(:insufficient_materials)
          end
        end

        for {material, cost} <- sprinkler.cost do
          Inventory.adjust!(actor.player_id, "material", material, -cost)
          Ledger.insert!(actor.player_id, "craft", "material", -cost, item_id: material, command_ref: request_id)
        end

        Inventory.adjust!(actor.player_id, "fixture", "sprinklers", 1)
        Ledger.insert!(actor.player_id, "craft", "fixture", 1, item_id: "sprinklers", command_ref: request_id)
        outbox_inventory(actor, actor.player_id)

        {:ok,
         Payloads.action_result(
           actionId: request_id,
           success: true,
           title: "Crafted",
           message: "Assembled 1x #{sprinkler.name}. Place it on a garden bed from your satchel."
         )}
      end)
    end)
  end

  def mill_restored? do
    Repo.one(from m in "machines", where: m.machine_id == "mill", select: m.status) == "restored"
  end

  def district_node_snapshot(district) do
    now = Accounts.now_ms()
    reap_expired!(now)

    nodes =
      Repo.all(
        from n in "gather_nodes",
          where: n.district == ^district,
          select: map(n, [:node_id, :material, :depleted_at, :respawn_ms])
      )

    Enum.map(nodes, fn n ->
      depleted = node_depleted?(n, now)

      %{
        node_id: n.node_id,
        material: n.material,
        available: not depleted,
        depleted_at: if(depleted, do: n.depleted_at, else: nil),
        respawn_at: if(depleted, do: n.depleted_at + n.respawn_ms, else: nil)
      }
    end)
  end

  def reap_expired!(now) do
    Repo.update_all(
      from(n in "gather_nodes",
        where: not is_nil(n.depleted_at) and ^now >= n.depleted_at + n.respawn_ms,
        update: [set: [depleted_at: nil]]
      ),
      []
    )
  end

  defp ensure_mill! do
    if Repo.aggregate("machines", :count) == 0 do
      Repo.insert_all("machines", [%{machine_id: "mill", status: "broken"}])

      Repo.insert_all(
        "machine_materials",
        Enum.map(Catalog.mill_requirement(), fn {mat, req} ->
          %{machine_id: "mill", material: mat, required: req, contributed: 0}
        end)
      )
    end
  end

  defp fetch_mill! do
    status = Repo.one!(from m in "machines", where: m.machine_id == "mill", select: map(m, [:status, :restored_at]))
    mats = Repo.all(from mm in "machine_materials", where: mm.machine_id == "mill", select: {mm.material, mm.required, mm.contributed})

    required = Map.new(mats, fn {m, r, _} -> {m, r} end)
    contributed = Map.new(mats, fn {m, _, c} -> {m, c} end)

    Map.merge(status, %{required: required, contributed: contributed})
  end

  defp mill_remaining(mill, material) do
    max(0, Map.fetch!(mill.required, material) - Map.fetch!(mill.contributed, material))
  end

  defp mill_fully_contributed? do
    Enum.all?(Catalog.mill_material_ids(), fn m ->
      row = Repo.one!(from mm in "machine_materials", where: mm.machine_id == "mill" and mm.material == ^m, select: {mm.required, mm.contributed})
      elem(row, 1) >= elem(row, 0)
    end)
  end

  defp node_depleted?(n, now), do: not is_nil(n.depleted_at) and now < n.depleted_at + n.respawn_ms

  defp material_name(id) do
    case id do
      "copper" -> "Copper Scrap"
      "timber" -> "Trestle Timber"
      "glass" -> "Glass Shards"
      _ -> id
    end
  end

  defp outbox_inventory(actor, player_id) do
    row = Repo.one!(from p in "players", where: p.id == ^player_id, select: map(p, [:id, :nickname, :xp, :level, :reputation, :current_room, :last_seen]))
    wallet = Afterlight.EconomyGroup.Wallet.get(player_id)
    inv = Inventory.get_map(player_id)

    player =
      Map.merge(row, %{
        coins: wallet.coins,
        reserved_coins: wallet.reserved_coins,
        inventory: inv,
        materials: inv.materials
      })

    Command.enqueue_outbox(player_id, "inventory_state", Payloads.inventory_state(player), actor)
  end

  defp outbox_node_state(actor, district) do
    payload = Payloads.node_state(district, district_node_snapshot(district))
    Command.enqueue_outbox(district, "node_state", payload, actor)
  end
end

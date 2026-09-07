defmodule Afterlight.EconomyGroup.Inventory do
  @moduledoc """
  Normalized `inventory_balances` access with zero-row deletion semantics.
  """

  import Ecto.Query
  alias Afterlight.Repo

  @kinds ~w(seed produce reserved_produce material fixture)

  def get_map(player_id) do
    rows =
      Repo.all(
        from b in "inventory_balances",
          where: b.player_id == ^player_id,
          select: {b.item_kind, b.item_id, b.quantity, b.acquired_seq}
      )

    Enum.reduce(rows, empty_map(), fn {kind, item_id, qty, seq}, acc ->
      put_balance(acc, kind, item_id, qty, seq)
    end)
  end

  def get_quantity(player_id, kind, item_id) do
    Repo.one(
      from b in "inventory_balances",
        where: b.player_id == ^player_id and b.item_kind == ^kind and b.item_id == ^item_id,
        select: b.quantity
    ) || 0
  end

  def adjust!(player_id, kind, item_id, delta) when delta != 0 do
    unless kind in @kinds, do: Repo.rollback(:invalid_kind)

    row =
      Repo.one(
        from b in "inventory_balances",
          where: b.player_id == ^player_id and b.item_kind == ^kind and b.item_id == ^item_id,
          select: map(b, [:quantity, :acquired_seq])
      )

    new_qty = (row && row.quantity || 0) + delta

    if new_qty < 0 do
      Repo.rollback(:insufficient_balance)
    else
      if new_qty == 0 do
        Repo.delete_all(
          from b in "inventory_balances",
            where: b.player_id == ^player_id and b.item_kind == ^kind and b.item_id == ^item_id
        )
      else
        seq = row && row.acquired_seq || next_seq!()

        Repo.insert_all(
          "inventory_balances",
          [
            %{
              player_id: player_id,
              item_kind: kind,
              item_id: item_id,
              quantity: new_qty,
              acquired_seq: if(row, do: row.acquired_seq, else: seq)
            }
          ],
          on_conflict: {:replace, [:quantity]},
          conflict_target: [:player_id, :item_kind, :item_id]
        )
      end

      :ok
    end
  end

  def deduct_produce_acquired_order!(player_id, crop_id, min_quality, quantity) do
    min_rank = Afterlight.Parity.Catalog.quality_rank(min_quality)

    rows =
      Repo.all(
        from b in "inventory_balances",
          where:
            b.player_id == ^player_id and b.item_kind == "produce" and
              fragment("split_part(?, '_', 1) = ?", b.item_id, ^crop_id),
          order_by: [asc: b.acquired_seq],
          select: {b.item_id, b.quantity}
      )
      |> Enum.filter(fn {item_id, _qty} ->
        [_crop, quality] = String.split(item_id, "_", parts: 2)
        Afterlight.Parity.Catalog.quality_rank(quality) >= min_rank
      end)

    available = Enum.reduce(rows, 0, fn {_, q}, acc -> acc + q end)

    if available < quantity do
      Repo.rollback(:insufficient_qualifying_produce)
    else
      {_left, _} =
        Enum.reduce(rows, {quantity, :ok}, fn {item_id, qty}, {remaining, _} ->
          if remaining <= 0 do
            {0, :ok}
          else
            take = min(qty, remaining)
            adjust!(player_id, "produce", item_id, -take)
            {remaining - take, :ok}
          end
        end)

      :ok
    end
  end

  def backfill_from_player_jsonb!(player_id) do
    player =
      Repo.one!(from p in "players", where: p.id == ^player_id, select: %{inventory: p.inventory, materials: p.materials})

    inv = player.inventory || %{}
    seeds = Map.get(inv, "seeds", %{})
    produce = Map.get(inv, "produce", %{})
    reserved = Map.get(inv, "reservedProduce", %{})
    sprinklers = Map.get(inv, "sprinklers", 0)
    materials = player.materials || %{}

    Enum.each(seeds, fn {id, qty} -> upsert_abs!(player_id, "seed", id, qty) end)
    Enum.each(produce, fn {id, qty} -> upsert_abs!(player_id, "produce", id, qty) end)
    Enum.each(reserved, fn {id, qty} -> upsert_abs!(player_id, "reserved_produce", id, qty) end)
    Enum.each(materials, fn {id, qty} -> upsert_abs!(player_id, "material", id, qty) end)

    if sprinklers > 0, do: upsert_abs!(player_id, "fixture", "sprinklers", sprinklers)

    :ok
  end

  def upsert_abs!(player_id, kind, item_id, qty) when qty > 0 do
    Repo.insert_all(
      "inventory_balances",
      [
        %{
          player_id: player_id,
          item_kind: kind,
          item_id: item_id,
          quantity: qty,
          acquired_seq: next_seq!()
        }
      ],
      on_conflict: {:replace, [:quantity]},
      conflict_target: [:player_id, :item_kind, :item_id]
    )
  end

  defp next_seq! do
    %{rows: [[seq]]} = Ecto.Adapters.SQL.query!(Repo, "SELECT nextval('inventory_acquired_seq')")
    seq
  end

  defp empty_map do
    %{seeds: %{}, produce: %{}, reserved_produce: %{}, materials: %{}, sprinklers: 0}
  end

  defp put_balance(acc, "seed", item_id, qty, _seq),
    do: %{acc | seeds: Map.put(acc.seeds, item_id, qty)}

  defp put_balance(acc, "produce", item_id, qty, _seq),
    do: %{acc | produce: Map.put(acc.produce, item_id, qty)}

  defp put_balance(acc, "reserved_produce", item_id, qty, _seq),
    do: %{acc | reserved_produce: Map.put(acc.reserved_produce, item_id, qty)}

  defp put_balance(acc, "material", item_id, qty, _seq),
    do: %{acc | materials: Map.put(acc.materials, item_id, qty)}

  defp put_balance(acc, "fixture", "sprinklers", qty, _seq),
    do: %{acc | sprinklers: qty}

  defp put_balance(acc, _, _, _, _), do: acc
end

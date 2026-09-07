defmodule Afterlight.Restoration.Machines do
  @moduledoc """
  Mill restoration, milling, and sprinkler crafting from `server/machines.js`.
  """

  alias Afterlight.Economy.Catalog
  alias Afterlight.Parity.Numeric
  alias Afterlight.Restoration.Materials

  @quality_order ["C", "B", "A", "A+"]
  @flour Catalog.get("flour")

  def fresh_state do
    mill = default_mill()
    %{"storage" => %{"state" => %{"machines" => %{"mill" => mill}}}, "mill" => mill}
  end

  def mill_restored_in_state?(state) do
    get_in(state || %{}, ["machines", "mill", "status"]) == "restored"
  end

  def default_mill do
    %{
      "status" => "broken",
      "required" => Materials.mill_requirement(),
      "contributed" => %{"copper" => 0, "timber" => 0, "glass" => 0},
      "restoredAt" => nil
    }
  end

  def snapshot(mill) do
    %{
      "status" => mill["status"],
      "required" => mill["required"],
      "contributed" => mill["contributed"],
      "restoredAt" => mill["restoredAt"]
    }
  end

  def contribute(state, player, material, quantity, now) do
    mill = state["mill"]

    cond do
      mill["status"] != "broken" ->
        {state, %{"success" => false, "reason" => "mill_already_restored"}}

      not Map.has_key?(mill["required"], material) ->
        {state, %{"success" => false, "reason" => "material_not_needed"}}

      true ->
        case Numeric.js_to_number(quantity) do
          :nan ->
            {state, %{"success" => false, "reason" => "invalid_quantity"}}

          n ->
            requested = js_floor(n)

            if requested <= 0 do
              {state, %{"success" => false, "reason" => "invalid_quantity"}}
            else
              held = js_held(player, material)
              remaining = remaining_need(mill, material)

              cond do
                remaining <= 0 ->
                  {state, %{"success" => false, "reason" => "material_fulfilled"}}

                held <= 0 ->
                  {state, %{"success" => false, "reason" => "insufficient_materials"}}

                true ->
                  applied = Enum.min([requested, held, remaining])
                  mill = put_in(mill, ["contributed", material], mill["contributed"][material] + applied)

                  {restored, mill} =
                    if Enum.all?(Materials.material_ids(), &(remaining_need(mill, &1) <= 0)) do
                      {true, mill |> Map.put("status", "restored") |> Map.put("restoredAt", now)}
                    else
                      {false, mill}
                    end

                  state = store_mill(state, mill)

                  {state,
                   %{
                     "success" => true,
                     "material" => material,
                     "applied" => applied,
                     "restored" => restored,
                     "machine" => %{"mill" => snapshot(mill)}
                   }}
              end
            end
        end
    end
  end

  def mill_wheat(state, player, quantity) do
    mill = state["mill"]

    if mill["status"] != "restored" do
      {state, %{"success" => false, "reason" => "mill_broken"}}
    else
      case Numeric.js_to_number(quantity) do
        :nan ->
          {state, %{"success" => false, "reason" => "invalid_quantity"}}

        n ->
          requested = js_floor(n)

          if requested <= 0 do
            {state, %{"success" => false, "reason" => "invalid_quantity"}}
          else
            produce =
              case get_in(player || %{}, ["inventory", "produce"]) do
                %{} = produce -> produce
                _ -> nil
              end

            if produce == nil do
              {state, %{"success" => false, "reason" => "no_wheat"}}
            else
              available =
                Enum.sum(Enum.map(@quality_order, &Map.get(produce, "wheat_#{&1}", 0)))

              if available <= 0 do
                {state, %{"success" => false, "reason" => "no_wheat"}}
              else
                milled = min(requested, available)

                produce =
                  Enum.reduce(@quality_order, {produce, milled}, fn quality, {produce, left} ->
                    if left <= 0 do
                      {produce, 0}
                    else
                      key = "wheat_#{quality}"
                      have = Map.get(produce, key, 0)
                      take = min(have, left)

                      if take <= 0 do
                        {produce, left}
                      else
                        left_after = have - take
                        produce = if left_after <= 0, do: Map.delete(produce, key), else: Map.put(produce, key, left_after)
                        {produce, left - take}
                      end
                    end
                  end)
                  |> elem(0)

                produce = Map.put(produce, "flour_B", Map.get(produce, "flour_B", 0) + milled)
                state = store_inventory_produce(state, player, produce)

                {state, %{"success" => true, "milled" => milled, "good" => @flour}}
              end
            end
          end
      end
    end
  end

  def craft(state, player, fixture) do
    if fixture != "sprinkler" do
      {state, %{"success" => false, "reason" => "unknown_fixture"}}
    else
      materials = Map.get(player || %{}, "materials") || %{}

      failure =
        Enum.find(Materials.sprinkler_cost(), fn {material, cost} ->
          js_held(%{"materials" => materials}, material) < cost
        end)

      case failure do
        {material, _cost} ->
          {state, %{"success" => false, "reason" => "insufficient_materials", "material" => material}}

        nil ->
          {state, %{"success" => true, "fixture" => "sprinkler", "name" => "Garden Sprinkler"}}
      end
    end
  end

  defp remaining_need(mill, material) do
    required = mill["required"][material]

    if is_number(required) do
      max(0, required - (mill["contributed"][material] || 0))
    else
      0
    end
  end

  defp store_mill(state, mill) do
    state
    |> put_in(["storage", "state", "machines", "mill"], mill)
    |> Map.put("mill", mill)
  end

  defp store_inventory_produce(state, _player, _produce), do: state

  defp js_floor(n) when is_integer(n), do: n
  defp js_floor(n) when is_float(n), do: Float.floor(n) |> trunc()

  defp js_held(player, material) do
    materials = Map.get(player || %{}, "materials") || %{}

    case Numeric.js_to_number(Map.get(materials, material, :absent)) do
      :nan -> 0
      n -> js_floor(n)
    end
  end
end

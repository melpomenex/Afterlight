defmodule Afterlight.Restoration.Nodes do
  @moduledoc """
  Gather-node depletion logic from `server/nodes.js`.
  """

  alias Afterlight.Restoration.Materials

  def fresh_state do
    %{"storage" => %{"state" => %{"nodes" => %{}}}, "depletions" => %{}}
  end

  def is_depleted?(state, node_id, now) do
    case Materials.node(node_id) do
      nil -> false
      def ->
        case state["depletions"][node_id] do
          nil -> false
          depleted_at -> now < depleted_at + def.respawn_ms
        end
    end
  end

  def respawn_at(state, node_id) do
    case Materials.node(node_id) do
      nil ->
        nil

      def ->
        case state["depletions"][node_id] do
          nil -> nil
          depleted_at -> depleted_at + def.respawn_ms
        end
    end
  end

  def harvest(state, node_id, now) do
    case Materials.node(node_id) do
      nil ->
        {state, %{"success" => false, "reason" => "unknown_node"}}

      def ->
        if is_depleted?(state, node_id, now) do
          {state,
           %{
             "success" => false,
             "reason" => "node_depleted",
             "respawnAt" => respawn_at(state, node_id)
           }}
        else
          state = put_depletions(state, Map.put(state["depletions"], node_id, now))

          {state,
           %{
             "success" => true,
             "nodeId" => def.id,
             "material" => def.material,
             "district" => def.district
           }}
        end
    end
  end

  def reap_expired(state, now) do
    depletions =
      Enum.reduce(state["depletions"], state["depletions"], fn {node_id, depleted_at}, acc ->
        def = Materials.node(node_id)

        if def == nil or now >= (depleted_at || 0) + def.respawn_ms do
          Map.delete(acc, node_id)
        else
          acc
        end
      end)

    put_depletions(state, depletions)
  end

  def states_for_district(state, district, now) do
    defs = Enum.filter(Materials.material_nodes(), &(&1.district == district))

    if defs == [] do
      nil
    else
      state = reap_expired(state, now)

      Enum.map(defs, fn def ->
        depleted = is_depleted?(state, def.id, now)

        %{
          "nodeId" => def.id,
          "material" => def.material,
          "available" => not depleted,
          "depletedAt" => if(depleted, do: state["depletions"][def.id], else: nil),
          "respawnAt" => respawn_at(state, def.id)
        }
      end)
    end
  end

  def tick(state, now) do
    districts =
      Materials.material_nodes()
      |> Enum.map(& &1.district)
      |> Enum.uniq()

    changed =
      Enum.reduce(districts, [], fn district_id, acc ->
        district_changed =
          Materials.material_nodes()
          |> Enum.filter(&(&1.district == district_id))
          |> Enum.any?(fn node ->
            depleted_at = state["depletions"][node.id]

            depleted_at != nil and now >= depleted_at + node.respawn_ms
          end)

        if district_changed do
          [district_id | acc]
        else
          acc
        end
      end)

    state =
      if changed != [] do
        depletions =
          Enum.reduce(state["depletions"], %{}, fn {node_id, depleted_at}, acc ->
            def = Materials.node(node_id)

            if def != nil and depleted_at != nil and now >= depleted_at + def.respawn_ms do
              acc
            else
              Map.put(acc, node_id, depleted_at)
            end
          end)

        put_depletions(state, depletions)
      else
        state
      end

    {state, changed}
  end

  defp put_depletions(state, depletions) do
    state
    |> put_in(["storage", "state", "nodes"], depletions)
    |> Map.put("depletions", depletions)
  end
end

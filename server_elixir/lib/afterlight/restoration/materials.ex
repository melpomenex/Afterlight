defmodule Afterlight.Restoration.Materials do
  @moduledoc """
  Materials, goods, gather nodes, and machine requirements from
  `shared/materials.js`.
  """

  @material_nodes [
    %{id: "foundry_copper_1", district: "foundry", material: "copper", respawn_ms: 180_000},
    %{id: "foundry_copper_2", district: "foundry", material: "copper", respawn_ms: 180_000},
    %{id: "foundry_copper_3", district: "foundry", material: "copper", respawn_ms: 180_000},
    %{id: "trestle_timber_1", district: "trestle", material: "timber", respawn_ms: 180_000},
    %{id: "trestle_timber_2", district: "trestle", material: "timber", respawn_ms: 180_000},
    %{id: "trestle_timber_3", district: "trestle", material: "timber", respawn_ms: 180_000},
    %{id: "glasshouse_glass_1", district: "frost-spire", material: "glass", respawn_ms: 180_000},
    %{id: "glasshouse_glass_2", district: "frost-spire", material: "glass", respawn_ms: 180_000},
    %{id: "glasshouse_glass_3", district: "frost-spire", material: "glass", respawn_ms: 180_000}
  ]

  @mill_requirement %{"copper" => 4, "timber" => 4, "glass" => 4}
  @material_ids Map.keys(@mill_requirement)
  @sprinkler_cost [{"copper", 2}, {"glass", 2}]

  def material_nodes, do: @material_nodes
  def mill_requirement, do: @mill_requirement
  def material_ids, do: @material_ids
  def sprinkler_cost, do: @sprinkler_cost

  def node(id), do: Enum.find(@material_nodes, &(&1.id == id))
end

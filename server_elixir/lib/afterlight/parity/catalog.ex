defmodule Afterlight.Parity.Catalog do
  @moduledoc """
  Crop, goods, and materials catalog mirroring `shared/crops.js` and
  `shared/materials.js` insertion order.
  """

  @quality_multipliers %{"C" => 0.8, "B" => 1.0, "A" => 1.35, "A+" => 1.8}

  @crops %{
    "radish" => %{
      id: "radish",
      name: "Red Radish",
      seed_cost: 4,
      base_price: 8,
      grow_duration: 25,
      water_demand: 1.0,
      yield: 2,
      repeat_harvest: false,
      xp: 12
    },
    "lettuce" => %{
      id: "lettuce",
      name: "Rain Crisp Lettuce",
      seed_cost: 6,
      base_price: 12,
      grow_duration: 40,
      water_demand: 1.2,
      yield: 2,
      repeat_harvest: false,
      xp: 18
    },
    "carrot" => %{
      id: "carrot",
      name: "Amber Carrot",
      seed_cost: 8,
      base_price: 17,
      grow_duration: 60,
      water_demand: 0.9,
      yield: 2,
      repeat_harvest: false,
      xp: 25
    },
    "kale" => %{
      id: "kale",
      name: "Winter Kale",
      seed_cost: 12,
      base_price: 24,
      grow_duration: 80,
      water_demand: 0.8,
      yield: 3,
      repeat_harvest: false,
      xp: 32
    },
    "basil" => %{
      id: "basil",
      name: "Copper Basil",
      seed_cost: 15,
      base_price: 32,
      grow_duration: 100,
      water_demand: 1.3,
      yield: 3,
      repeat_harvest: false,
      xp: 40
    },
    "tomato" => %{
      id: "tomato",
      name: "Lantern Tomato",
      seed_cost: 22,
      base_price: 28,
      grow_duration: 120,
      water_demand: 1.1,
      yield: 3,
      repeat_harvest: true,
      regrow_duration: 45,
      xp: 50
    },
    "strawberry" => %{
      id: "strawberry",
      name: "Dew Strawberry",
      seed_cost: 28,
      base_price: 38,
      grow_duration: 140,
      water_demand: 1.4,
      yield: 4,
      repeat_harvest: true,
      regrow_duration: 50,
      xp: 65
    },
    "wheat" => %{
      id: "wheat",
      name: "Hearth Wheat",
      seed_cost: 4,
      base_price: 9,
      grow_duration: 30,
      water_demand: 1.0,
      yield: 2,
      repeat_harvest: false,
      xp: 14
    }
  }

  @crop_list Enum.map(
               ~w(radish lettuce carrot kale basil tomato strawberry wheat),
               &Map.fetch!(@crops, &1)
             )

  @goods %{
    "flour" => %{id: "flour", name: "Stone-Ground Flour", base_price: 14}
  }

  @good_list [Map.fetch!(@goods, "flour")]

  @mill_requirement %{"copper" => 4, "timber" => 4, "glass" => 4}
  @mill_material_ids ~w(copper timber glass)
  @wheat_grades ~w(C B A A+)

  @sprinkler %{
    id: "sprinkler",
    name: "Garden Sprinkler",
    cost: %{"copper" => 2, "glass" => 2},
    max_per_garden: 3
  }

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

  @growth_stages %{
    empty: 0,
    prepared: 1,
    seed: 2,
    sprout: 3,
    juvenile: 4,
    mature: 5,
    harvestable: 6
  }

  def crop_list, do: @crop_list
  def good_list, do: @good_list
  def crops, do: @crops
  def goods, do: @goods
  def crop(id), do: Map.get(@crops, id)
  def good(id), do: Map.get(@goods, id)
  def sellable(id), do: crop(id) || good(id)
  def quality_multipliers, do: @quality_multipliers
  def mill_requirement, do: @mill_requirement
  def mill_material_ids, do: @mill_material_ids
  def wheat_grades, do: @wheat_grades
  def sprinkler, do: @sprinkler
  def material_nodes, do: @material_nodes
  def node(id), do: Enum.find(@material_nodes, &(&1.id == id))
  def growth_stages, do: @growth_stages

  def quality_rank(quality) do
    %{"C" => 1, "B" => 2, "A" => 3, "A+" => 4}[quality] || 1
  end

  def level_from_xp(xp), do: div(xp, 100) + 1
end

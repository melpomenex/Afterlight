defmodule Afterlight.Gardens.Crops do
  @moduledoc """
  Crop catalog and growth/quality math ported from `shared/crops.js`.
  """

  @growth_stages %{
    "EMPTY" => 0,
    "PREPARED" => 1,
    "SEED" => 2,
    "SPROUT" => 3,
    "JUVENILE" => 4,
    "MATURE" => 5,
    "HARVESTABLE" => 6
  }

  @quality_multipliers %{"C" => 0.8, "B" => 1.0, "A" => 1.35, "A+" => 1.8}

  @crops %{
    "radish" => %{
      "id" => "radish",
      "name" => "Red Radish",
      "tagline" => "Crisp peppery roots, fast to harvest.",
      "seedCost" => 4,
      "basePrice" => 8,
      "growDuration" => 25,
      "waterDemand" => 1.0,
      "yield" => 2,
      "repeatHarvest" => false,
      "color" => "#4d8050",
      "produceColor" => "#c93b4a",
      "xp" => 12,
      "unlockLevel" => 1
    },
    "lettuce" => %{
      "id" => "lettuce",
      "name" => "Rain Crisp Lettuce",
      "tagline" => "Tender layered greens favored by market cafes.",
      "seedCost" => 6,
      "basePrice" => 12,
      "growDuration" => 40,
      "waterDemand" => 1.2,
      "yield" => 2,
      "repeatHarvest" => false,
      "color" => "#65a759",
      "produceColor" => "#83cf72",
      "xp" => 18,
      "unlockLevel" => 1
    },
    "carrot" => %{
      "id" => "carrot",
      "name" => "Amber Carrot",
      "tagline" => "Deep sweet orange taproots grown in dark tilled soil.",
      "seedCost" => 8,
      "basePrice" => 17,
      "growDuration" => 60,
      "waterDemand" => 0.9,
      "yield" => 2,
      "repeatHarvest" => false,
      "color" => "#498845",
      "produceColor" => "#e07a2a",
      "xp" => 25,
      "unlockLevel" => 1
    },
    "kale" => %{
      "id" => "kale",
      "name" => "Winter Kale",
      "tagline" => "Hearty ruffled brassica that thrives in cold rain.",
      "seedCost" => 12,
      "basePrice" => 24,
      "growDuration" => 80,
      "waterDemand" => 0.8,
      "yield" => 3,
      "repeatHarvest" => false,
      "color" => "#2d6148",
      "produceColor" => "#3d785a",
      "xp" => 32,
      "unlockLevel" => 2
    },
    "basil" => %{
      "id" => "basil",
      "name" => "Copper Basil",
      "tagline" => "Aromatic dark purple-green leaves prized by the apothecary.",
      "seedCost" => 15,
      "basePrice" => 32,
      "growDuration" => 100,
      "waterDemand" => 1.3,
      "yield" => 3,
      "repeatHarvest" => false,
      "color" => "#425a40",
      "produceColor" => "#7b3e64",
      "xp" => 40,
      "unlockLevel" => 2
    },
    "tomato" => %{
      "id" => "tomato",
      "name" => "Lantern Tomato",
      "tagline" => "Heavy climbing vine with glowing scarlet fruit. Continues bearing.",
      "seedCost" => 22,
      "basePrice" => 28,
      "growDuration" => 120,
      "waterDemand" => 1.1,
      "yield" => 3,
      "repeatHarvest" => true,
      "regrowDuration" => 45,
      "color" => "#3f7842",
      "produceColor" => "#d6422f",
      "xp" => 50,
      "unlockLevel" => 3
    },
    "strawberry" => %{
      "id" => "strawberry",
      "name" => "Dew Strawberry",
      "tagline" => "Low creeping runners with bright sweet red berries.",
      "seedCost" => 28,
      "basePrice" => 38,
      "growDuration" => 140,
      "waterDemand" => 1.4,
      "yield" => 4,
      "repeatHarvest" => true,
      "regrowDuration" => 50,
      "color" => "#39784b",
      "produceColor" => "#e6324b",
      "xp" => 65,
      "unlockLevel" => 3
    },
    "wheat" => %{
      "id" => "wheat",
      "name" => "Hearth Wheat",
      "tagline" => "Golden milling grain. The Great Mill grinds it into flour.",
      "seedCost" => 4,
      "basePrice" => 9,
      "growDuration" => 30,
      "waterDemand" => 1.0,
      "yield" => 2,
      "repeatHarvest" => false,
      "color" => "#8a8a3d",
      "produceColor" => "#d9b45a",
      "xp" => 14,
      "unlockLevel" => 1
    }
  }

  @crop_list Enum.map(
               ~w(radish lettuce carrot kale basil tomato strawberry wheat),
               &Map.fetch!(@crops, &1)
             )

  def growth_stages, do: @growth_stages
  def crop_list, do: @crop_list
  def quality_multipliers, do: @quality_multipliers

  def get(crop_id), do: Map.get(@crops, crop_id)

  def growth_stage(planted_at, duration, now) do
    if is_nil(planted_at) do
      @growth_stages["PREPARED"]
    else
      growth_stage_at(planted_at, duration, now)
    end
  end

  defp growth_stage_at(_planted_at, _duration, :nan), do: @growth_stages["HARVESTABLE"]

  defp growth_stage_at(planted_at, duration, now) do
    elapsed = (now - planted_at) / 1000
    progress = min(elapsed / duration, 1.0)

    cond do
      progress < 0.15 -> @growth_stages["SEED"]
      progress < 0.45 -> @growth_stages["SPROUT"]
      progress < 0.75 -> @growth_stages["JUVENILE"]
      progress < 1.0 -> @growth_stages["MATURE"]
      true -> @growth_stages["HARVESTABLE"]
    end
  end

  def calculate_quality(moisture_history, health) do
    score = moisture_history * 0.6 + health * 0.4

    cond do
      score >= 0.9 -> "A+"
      score >= 0.75 -> "A"
      score >= 0.55 -> "B"
      true -> "C"
    end
  end

  def grow_duration(bed, crop) do
    count = Map.get(bed, "harvestCount", 0)

    if count > 0 and crop["repeatHarvest"] and is_number(crop["regrowDuration"]) do
      crop["regrowDuration"]
    else
      crop["growDuration"]
    end
  end
end

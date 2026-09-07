defmodule Afterlight.Gardens.Model do
  @moduledoc """
  Pure garden bed model ported from `shared/gardenModel.js`.
  """

  alias Afterlight.Gardens.Crops

  @prepared Crops.growth_stages()["PREPARED"]
  @juvenile Crops.growth_stages()["JUVENILE"]
  @harvestable Crops.growth_stages()["HARVESTABLE"]

  def create_initial_beds(count \\ 12) do
    Enum.map(0..(count - 1), fn index ->
      %{
        "index" => index,
        "prepared" => false,
        "cropId" => nil,
        "plantedAt" => nil,
        "lastWateredAt" => nil,
        "moisture" => 0,
        "health" => 1.0,
        "moistureHistorySum" => 0,
        "moistureChecks" => 0,
        "stage" => Crops.growth_stages()["EMPTY"],
        "harvestCount" => 0
      }
    end)
  end

  def till_bed(nil), do: %{"success" => false, "reason" => "invalid_bed"}

  def till_bed(bed) do
    if bed["cropId"] do
      %{"success" => false, "reason" => "occupied"}
    else
      bed = Map.merge(bed, %{"prepared" => true, "stage" => @prepared})
      %{"success" => true, "bed" => bed}
    end
  end

  def plant_bed(nil, _crop_id, _now), do: %{"success" => false, "reason" => "invalid_bed"}

  def plant_bed(bed, crop_id, now) do
    cond do
      not bed["prepared"] ->
        %{"success" => false, "reason" => "not_prepared"}

      bed["cropId"] ->
        %{"success" => false, "reason" => "already_planted"}

      true ->
        case Crops.get(crop_id) do
          nil ->
            %{"success" => false, "reason" => "unknown_crop"}

          crop ->
            moisture_history_sum = if bed["moisture"] > 0, do: bed["moisture"], else: 0.5

            bed =
              bed
              |> Map.put("cropId", crop_id)
              |> Map.put("plantedAt", now)
              |> Map.put("health", 1.0)
              |> Map.put("moistureHistorySum", moisture_history_sum)
              |> Map.put("moistureChecks", 1)
              |> Map.put("stage", Crops.growth_stages()["SEED"])
              |> Map.put("harvestCount", 0)

            %{"success" => true, "crop" => crop, "bed" => bed}
        end
    end
  end

  def water_bed(nil, _now), do: %{"success" => false, "reason" => "invalid_bed"}

  def water_bed(bed, now) do
    bed =
      bed
      |> Map.put("moisture", 1.0)
      |> Map.put("lastWateredAt", now)

    bed =
      if bed["cropId"] do
        bed
        |> Map.update!("moistureHistorySum", &(&1 + 1.0))
        |> Map.update!("moistureChecks", &(&1 + 1))
      else
        bed
      end

    %{"success" => true, "bed" => bed}
  end

  def sprinkler_coverage(bed_index, cols \\ 4)

  def sprinkler_coverage(bed_index, _cols) when not is_integer(bed_index) or bed_index < 0 do
    []
  end

  def sprinkler_coverage(bed_index, cols) when is_integer(cols) and cols > 0 do
    col = rem(bed_index, cols)

    [
      if(bed_index - cols >= 0, do: [bed_index - cols], else: []),
      if(col > 0, do: [bed_index - 1], else: []),
      [bed_index],
      if(col < cols - 1, do: [bed_index + 1], else: []),
      [bed_index + cols]
    ]
    |> List.flatten()
  end

  def tick_bed(nil, _dt, _raining, _now, _sprinkled), do: nil

  def tick_bed(bed, dt, raining, now, sprinkled) do
    moisture =
      if raining || sprinkled do
        min(1.0, bed["moisture"] + dt * 0.05)
      else
        decay_rate =
          if bed["cropId"] do
            crop = Crops.get(bed["cropId"]) || %{}
            0.008 * Map.get(crop, "waterDemand", 1.0)
          else
            0.005
          end

        max(0, bed["moisture"] - dt * decay_rate)
      end

    bed = Map.put(bed, "moisture", moisture)

    if bed["cropId"] && bed["plantedAt"] do
      case Crops.get(bed["cropId"]) do
        nil ->
          bed

        crop ->
          bed =
            if moisture <= 0.05 do
              Map.put(bed, "health", max(0.2, bed["health"] - dt * 0.002))
            else
              Map.put(bed, "health", min(1.0, bed["health"] + dt * 0.001))
            end

          bed =
            bed
            |> Map.update!("moistureHistorySum", &(&1 + moisture * dt))
            |> Map.update!("moistureChecks", &(&1 + dt))

          tick_now = if now == nil, do: :nan, else: now
          duration = Crops.grow_duration(bed, crop)
          Map.put(bed, "stage", Crops.growth_stage(bed["plantedAt"], duration, tick_now))
      end
    else
      bed
    end
  end

  def can_harvest(bed, now) do
    crop_id = bed && bed["cropId"]
    planted_at = bed && bed["plantedAt"]

    if is_nil(bed) or is_nil(crop_id) or is_nil(planted_at) do
      false
    else
      case Crops.get(crop_id) do
        nil -> false
        crop -> Crops.growth_stage(planted_at, Crops.grow_duration(bed, crop), now) == @harvestable
      end
    end
  end

  def harvest_bed(bed, now) do
    if can_harvest(bed, now) do
      crop_id = bed["cropId"]
      crop = Crops.get(crop_id)

      checks = bed["moistureChecks"]
      avg_moisture = if checks > 0, do: bed["moistureHistorySum"] / checks, else: 0.8
      quality = Crops.calculate_quality(avg_moisture, bed["health"])

      bed =
        if crop["repeatHarvest"] do
          bed
          |> Map.update!("harvestCount", &(&1 + 1))
          |> Map.put("plantedAt", now)
          |> Map.put("stage", @juvenile)
          |> Map.put("moistureHistorySum", bed["moisture"])
          |> Map.put("moistureChecks", 1)
        else
          bed
          |> Map.put("cropId", nil)
          |> Map.put("plantedAt", nil)
          |> Map.put("stage", @prepared)
          |> Map.put("health", 1.0)
          |> Map.put("harvestCount", 0)
          |> Map.put("moistureHistorySum", 0)
          |> Map.put("moistureChecks", 0)
        end

      %{
        "success" => true,
        "cropId" => crop_id,
        "crop" => crop,
        "yield" => Map.get(crop, "yield", 2),
        "quality" => quality,
        "xp" => Map.get(crop, "xp", 10),
        "repeatHarvest" => crop["repeatHarvest"],
        "bed" => bed
      }
    else
      %{"success" => false, "reason" => "not_ready"}
    end
  end
end

defmodule Afterlight.Parity.GardenModel do
  @moduledoc """
  Pure port of `shared/gardenModel.js` + growth/quality from `shared/crops.js`.
  """

  alias Afterlight.Parity.Catalog

  @prepared Catalog.growth_stages().prepared
  @seed Catalog.growth_stages().seed
  @juvenile Catalog.growth_stages().juvenile
  @harvestable Catalog.growth_stages().harvestable

  def create_initial_beds(count \\ 12) do
    Enum.map(0..(count - 1), fn i ->
      %{
        index: i,
        prepared: false,
        crop_id: nil,
        planted_at: nil,
        last_watered_at: nil,
        moisture: 0.0,
        health: 1.0,
        moisture_history_sum: 0.0,
        moisture_checks: 0.0,
        stage: Catalog.growth_stages().empty,
        harvest_count: 0
      }
    end)
  end

  def till_bed(nil), do: {:error, "invalid_bed"}

  def till_bed(bed) do
    if bed.crop_id, do: {:error, "occupied"}, else: {:ok, %{bed | prepared: true, stage: @prepared}}
  end

  def plant_bed(nil, _, _), do: {:error, "invalid_bed"}

  def plant_bed(bed, crop_id, now) do
    cond do
      not bed.prepared -> {:error, "not_prepared"}
      bed.crop_id -> {:error, "already_planted"}
      is_nil(Catalog.crop(crop_id)) -> {:error, "unknown_crop"}
      true ->
        crop = Catalog.crop(crop_id)
        hist = if bed.moisture > 0, do: bed.moisture, else: 0.5

        {:ok,
         %{
           bed
           | crop_id: crop_id,
             planted_at: now,
             health: 1.0,
             moisture_history_sum: hist,
             moisture_checks: 1.0,
             stage: @seed,
             harvest_count: 0
         }, crop}
    end
  end

  def water_bed(nil), do: {:error, "invalid_bed"}

  def water_bed(bed, now) do
    bed =
      if bed.crop_id do
        %{bed | moisture_history_sum: bed.moisture_history_sum + 1.0, moisture_checks: bed.moisture_checks + 1.0}
      else
        bed
      end

    {:ok, %{bed | moisture: 1.0, last_watered_at: now}}
  end

  def sprinkler_coverage(bed_index, cols \\ 4) when is_integer(bed_index) and bed_index >= 0 do
    col = rem(bed_index, cols)

    up = if bed_index - cols >= 0, do: [bed_index - cols], else: []
    left = if col > 0, do: [bed_index - 1], else: []
    right = if col < cols - 1, do: [bed_index + 1], else: []
    down = [bed_index + cols]

    up ++ left ++ [bed_index] ++ right ++ down
  end

  def sprinkler_coverage(_, _), do: []

  def tick_bed(bed, dt \\ 1.0, is_raining \\ false, now, sprinkled \\ false) do
    moisture =
      if is_raining or sprinkled do
        min(1.0, bed.moisture + dt * 0.05)
      else
        rate =
          if bed.crop_id do
            0.008 * (Catalog.crop(bed.crop_id).water_demand || 1.0)
          else
            0.005
          end

        max(0.0, bed.moisture - dt * rate)
      end

    bed = %{bed | moisture: moisture}

    if bed.crop_id && bed.planted_at && Catalog.crop(bed.crop_id) do
      crop = Catalog.crop(bed.crop_id)

      bed =
        if moisture <= 0.05 do
          %{bed | health: max(0.2, bed.health - dt * 0.002)}
        else
          %{bed | health: min(1.0, bed.health + dt * 0.001)}
        end

      bed =
        bed
        |> Map.put(:moisture_history_sum, bed.moisture_history_sum + moisture * dt)
        |> Map.put(:moisture_checks, bed.moisture_checks + dt)

      duration = grow_duration(bed, crop)
      %{bed | stage: growth_stage(bed.planted_at, duration, now)}
    else
      bed
    end
  end

  def can_harvest?(bed, now) do
    crop_id = bed && bed.crop_id
    planted_at = bed && bed.planted_at

    if is_nil(bed) or is_nil(crop_id) or is_nil(planted_at) do
      false
    else
      case Catalog.crop(crop_id) do
        nil -> false
        crop -> growth_stage(planted_at, grow_duration(bed, crop), now) == @harvestable
      end
    end
  end

  def harvest_bed(bed, now) do
    if can_harvest?(bed, now) do
      crop = Catalog.crop(bed.crop_id)
      avg = if bed.moisture_checks > 0, do: bed.moisture_history_sum / bed.moisture_checks, else: 0.8
      quality = calculate_quality(avg, bed.health)

      bed2 =
        if crop.repeat_harvest do
          %{
            bed
            | harvest_count: bed.harvest_count + 1,
              planted_at: now,
              stage: @juvenile,
              moisture_history_sum: bed.moisture,
              moisture_checks: 1.0
          }
        else
          %{
            bed
            | crop_id: nil,
              planted_at: nil,
              stage: @prepared,
              health: 1.0,
              harvest_count: 0,
              moisture_history_sum: 0.0,
              moisture_checks: 0.0
          }
        end

      {:ok,
       %{
         crop_id: bed.crop_id,
         crop: crop,
         yield: crop.yield || 2,
         quality: quality,
         xp: crop.xp || 10,
         repeat_harvest: crop.repeat_harvest
       }, bed2}
    else
      {:error, "not_ready"}
    end
  end

  def growth_stage(nil, _, _), do: @prepared

  def growth_stage(planted_at, duration, now) when is_integer(planted_at) and is_integer(now) do
    elapsed = (now - planted_at) / 1000
    progress = min(elapsed / duration, 1.0)

    cond do
      progress < 0.15 -> @seed
      progress < 0.45 -> Catalog.growth_stages().sprout
      progress < 0.75 -> @juvenile
      progress < 1.0 -> Catalog.growth_stages().mature
      true -> @harvestable
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

  defp grow_duration(%{harvest_count: count}, %{repeat_harvest: true, regrow_duration: regrow})
       when count > 0 and is_number(regrow),
       do: regrow

  defp grow_duration(_bed, crop), do: crop.grow_duration
end

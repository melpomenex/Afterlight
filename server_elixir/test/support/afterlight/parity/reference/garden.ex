defmodule Afterlight.Parity.Reference.Garden do
  @moduledoc """
  Parity reference for `shared/gardenModel.js` + `shared/crops.js`.
  Delegates to `Afterlight.Gardens.Model` and `Afterlight.Gardens.Crops`.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Gardens.Crops
  alias Afterlight.Gardens.Model

  @bed_keys [
    "index",
    "prepared",
    "cropId",
    "plantedAt",
    "lastWateredAt",
    "moisture",
    "health",
    "moistureHistorySum",
    "moistureChecks",
    "stage",
    "harvestCount"
  ]

  @impl true
  def run_case_fn("identityBed", [bed], _now_ms) when is_map(bed) do
    Process.put({__MODULE__, :state_key}, :bed)
    Process.put({__MODULE__, :bed}, bed)
    bed
  end

  def run_case_fn("tickBed", [bed_arg, dt, raining, now, sprinkled], _now_ms) do
    case resolve_tick_bed(bed_arg, now) do
      nil ->
        nil

      bed ->
        bed |> Model.tick_bed(dt, raining, now, sprinkled) |> store_bed()
    end
  end

  def run_case_fn("harvestBed", [bed_arg, now], _now_ms) do
    bed = resolve_bed(bed_arg)

    case Model.harvest_bed(bed, now) do
      %{"success" => true, "bed" => bed2} = result ->
        store_bed(bed2)
        Map.delete(result, "bed")

      other ->
        other
    end
  end

  def run_case_fn("canHarvest", [bed_arg, now], _now_ms) do
    Model.can_harvest(resolve_bed(bed_arg), now)
  end

  def run_case_fn("sprinklerCoverage", [bed_index], _now_ms),
    do: Model.sprinkler_coverage(bed_index)

  def run_case_fn("sprinklerCoverage", [bed_index, cols], _now_ms),
    do: Model.sprinkler_coverage(bed_index, cols)

  def run_case_fn("getGrowthStage", [planted_at, duration, now], _now_ms),
    do: Crops.growth_stage(planted_at, duration, now)

  def run_case_fn("calculateQuality", [moisture_history, health], _now_ms),
    do: Crops.calculate_quality(moisture_history, health)

  def run_case_fn("stageTable", [], _now_ms), do: Crops.growth_stages()

  def run_case_fn(fname, args, _now_ms),
    do: raise("garden port: unknown fixture fn #{fname}/#{length(args)}")

  defp bed?(%{} = bed), do: Enum.all?(@bed_keys, &Map.has_key?(bed, &1))
  defp bed?(_), do: false

  defp resolve_bed(bed_arg) do
    if bed?(bed_arg), do: bed_arg, else: Process.get({__MODULE__, :bed})
  end

  defp resolve_tick_bed(nil, now) when not is_nil(now), do: nil

  defp resolve_tick_bed(bed_arg, _now) do
    if bed?(bed_arg), do: bed_arg, else: Process.get({__MODULE__, :bed})
  end

  defp store_bed(bed) do
    Process.put({__MODULE__, :bed}, bed)
    bed
  end
end

defmodule Afterlight.Parity.Reference.Garden do
  @moduledoc """
  Parity reference for `shared/gardenModel.js` + `shared/crops.js`
  (fixture file `garden-crops.json`). TEST-SIDE PARITY REFERENCE —
  never authority.

  Ported surface (fixture fn names): `tickBed`, `harvestBed`,
  `sprinklerCoverage`, `canHarvest`, `getGrowthStage`, `calculateQuality`,
  plus the exporter script helpers `identityBed` (returns its argument) and
  `stageTable` (the GROWTH_STAGES enum).

  ## JS-fidelity notes

  * `tickBed` mutates the bed in place and returns `undefined` in JS; the
    port is state-in/state-out on the bed (parity-notes hazard 15). The
    recorded script steps carry no `expected` for it (JSON drops
    `undefined`), so the updated bed returned here is exactly the value a
    result-threading harness needs to advance `"<prev>"`. `tick/null-bed`
    keeps the JS `undefined` → `nil` return.
  * Float accumulation (`moisture`, `health`, `moistureHistorySum`,
    `moistureChecks`) is IEEE-double-identical: same operation order as JS.
    `moistureChecks` is a JS float (`+= dtSeconds`) — the comparator's
    numeric tolerance covers JS's `1` vs Elixir's `1.0` serialization.
  * The tick scripts execute with `now = undefined + i * dt * 1000 = NaN`
    in JS, which JSON-serializes as `null`. The port models that as
    `:nan`: `Math.min(NaN, 1.0)` and every `progress < bound` comparison
    is false, so the stage falls through to HARVESTABLE — reproduced by
    `growth_stage/3`'s `:nan` clause.
  * `harvestBed` returns the action-result object while the bed itself
    continues to mutate (repeat-harvest reset), matching the fixture's
    per-step expecteds.

  ## Script threading (keepPrev)

  The JS recorder pinned `"<prev>"` to the step-0 object (the bed) and let
  each step mutate it in place. Beds are immutable maps in Elixir, so the
  module keeps the *current* bed in the process dictionary: `identityBed`
  (always step 0 of a garden script) registers it, mutating steps update
  it, and a step whose first arg is not bed-shaped (the harness passes the
  previous step's *result* as `"<prev>"`) falls back to the registered
  bed. Call-style cases (`tick/null-bed`, `harvest/*`, `canharvest/*`)
  pass a real bed (or literal `null`) as the argument and resolve through
  the argument first. Cases run sequentially in one process (`async:
  false`), so the registry is sound; each script re-registers at step 0.

  Known harness gap (documented here, NOT worked around by faking state):
  `Afterlight.Parity.run_steps` threads the previous step's *result* while
  the fixture's `expected.prev` holds the final *bed*, and steps without
  `expected` compare against `nil`. Under that harness the keepPrev
  scripts (`tick/*`, `harvest/repeat-harvest-strawberry`) cannot pass —
  see the run report; the port keeps the faithful JS shapes so a harness
  that honors `keepPrev` passes unchanged.
  """

  @behaviour Afterlight.Parity.Reference

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

  # shared/crops.js CROPS — keys and values exactly as the JS object literal
  # (the fixture compares the full crop object verbatim on harvest).
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

  @growth_stages %{
    "EMPTY" => 0,
    "PREPARED" => 1,
    "SEED" => 2,
    "SPROUT" => 3,
    "JUVENILE" => 4,
    "MATURE" => 5,
    "HARVESTABLE" => 6
  }

  @prepared @growth_stages["PREPARED"]
  @seed @growth_stages["SEED"]
  @sprout @growth_stages["SPROUT"]
  @juvenile @growth_stages["JUVENILE"]
  @mature @growth_stages["MATURE"]
  @harvestable @growth_stages["HARVESTABLE"]

  @impl true
  def run_case_fn("identityBed", [bed], _now_ms) when is_map(bed) do
    Process.put({__MODULE__, :state_key}, :bed)
    Process.put({__MODULE__, :bed}, bed)
    bed
  end

  def run_case_fn("tickBed", [bed_arg, dt, raining, now, sprinkled], _now_ms) do
    case resolve_tick_bed(bed_arg, now) do
      nil ->
        # JS: if (!bed) return; — undefined return, nothing threads.
        nil

      bed ->
        # State-in/state-out (parity-notes hazard 15: the JS fn mutates in
        # place and returns undefined; the recorded steps carry no expected,
        # so the updated bed is the value that threads under a
        # result-threading harness).
        bed
        |> tick(dt, raining, sprinkled, now)
        |> store_bed()
    end
  end

  def run_case_fn("harvestBed", [bed_arg, now], _now_ms) do
    bed = resolve_bed(bed_arg)

    if can_harvest(bed, now) do
      crop_id = bed["cropId"]
      crop = Map.fetch!(@crops, crop_id)

      checks = bed["moistureChecks"]
      avg_moisture = if checks > 0, do: bed["moistureHistorySum"] / checks, else: 0.8
      quality = calculate_quality(avg_moisture, bed["health"])

      bed2 =
        if crop["repeatHarvest"] do
          bed
          |> Map.put("harvestCount", bed["harvestCount"] + 1)
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

      store_bed(bed2)

      %{
        "success" => true,
        "cropId" => crop_id,
        "crop" => crop,
        "yield" => Map.get(crop, "yield", 2),
        "quality" => quality,
        "xp" => Map.get(crop, "xp", 10),
        "repeatHarvest" => crop["repeatHarvest"]
      }
    else
      %{"success" => false, "reason" => "not_ready"}
    end
  end

  def run_case_fn("canHarvest", [bed_arg, now], _now_ms) do
    can_harvest(resolve_bed(bed_arg), now)
  end

  def run_case_fn("sprinklerCoverage", [bed_index], _now_ms) do
    sprinkler_coverage(bed_index)
  end

  def run_case_fn("sprinklerCoverage", [bed_index, cols], _now_ms) do
    sprinkler_coverage(bed_index, cols)
  end

  def run_case_fn("getGrowthStage", [planted_at, duration, now], _now_ms) do
    growth_stage(planted_at, duration, now)
  end

  def run_case_fn("calculateQuality", [moisture_history, health], _now_ms) do
    calculate_quality(moisture_history, health)
  end

  def run_case_fn("stageTable", [], _now_ms), do: @growth_stages

  def run_case_fn(fname, args, _now_ms),
    do: raise("garden port: unknown fixture fn #{fname}/#{length(args)}")

  ## -- bed registry (keepPrev emulation) ------------------------------------

  defp bed?(%{} = bed), do: Enum.all?(@bed_keys, &Map.has_key?(bed, &1))
  defp bed?(_), do: false

  # Call cases pass a real bed; script steps pass the harness-threaded
  # previous RESULT (nil or an action result), which falls back to the
  # registry that identityBed (step 0) maintains.
  defp resolve_bed(bed_arg) do
    if bed?(bed_arg), do: bed_arg, else: Process.get({__MODULE__, :bed})
  end

  # `tick/null-bed` is the only recorded call with a literal null bed, and
  # its `now` is a real timestamp; every recorded tick SCRIPT step carries
  # now === null (JS NaN from `undefined + i * dt * 1000`). That separates
  # the literal null bed from a script's threaded prev (also nil under the
  # current harness).
  defp resolve_tick_bed(nil, now) when not is_nil(now), do: nil

  defp resolve_tick_bed(bed_arg, _now) do
    if bed?(bed_arg), do: bed_arg, else: Process.get({__MODULE__, :bed})
  end

  defp store_bed(bed) do
    Process.put({__MODULE__, :bed}, bed)
    bed
  end

  ## -- shared/crops.js -------------------------------------------------------

  defp growth_stage(nil, _duration, _now), do: @prepared

  # JS tick scripts run with now === NaN: Math.min(NaN, 1.0) is NaN and every
  # `progress < bound` comparison is false, so the fallthrough is HARVESTABLE.
  defp growth_stage(_planted_at, _duration, :nan), do: @harvestable

  defp growth_stage(planted_at, duration, now) do
    elapsed = (now - planted_at) / 1000
    progress = min(elapsed / duration, 1.0)

    cond do
      progress < 0.15 -> @seed
      progress < 0.45 -> @sprout
      progress < 0.75 -> @juvenile
      progress < 1.0 -> @mature
      true -> @harvestable
    end
  end

  defp calculate_quality(moisture_history, health) do
    score = moisture_history * 0.6 + health * 0.4

    cond do
      score >= 0.9 -> "A+"
      score >= 0.75 -> "A"
      score >= 0.55 -> "B"
      true -> "C"
    end
  end

  ## -- shared/gardenModel.js -------------------------------------------------

  # Bed-grid coverage: the occupied bed plus orthogonal neighbors in the
  # 4x3 grid. JS pushes in order [up, left, self, right, down].
  defp sprinkler_coverage(bed_index, cols \\ 4)

  defp sprinkler_coverage(bed_index, _cols) when not is_integer(bed_index) or bed_index < 0 do
    []
  end

  defp sprinkler_coverage(bed_index, cols) when is_integer(cols) and cols > 0 do
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

  defp tick(bed, dt, raining, sprinkled, now) do
    moisture =
      if raining || sprinkled do
        min(1.0, bed["moisture"] + dt * 0.05)
      else
        decay_rate =
          if bed["cropId"] do
            0.008 * water_demand(bed["cropId"])
          else
            0.005
          end

        max(0, bed["moisture"] - dt * decay_rate)
      end

    bed = Map.put(bed, "moisture", moisture)

    if bed["cropId"] && bed["plantedAt"] do
      case Map.get(@crops, bed["cropId"]) do
        nil ->
          # JS: const crop = CROPS[bed.cropId]; if (!crop) return;
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
            |> Map.put("moistureHistorySum", bed["moistureHistorySum"] + moisture * dt)
            |> Map.put("moistureChecks", bed["moistureChecks"] + dt)

          duration = grow_duration(bed, crop)
          # Recorded tick scripts carry now === null (JS NaN — `undefined +
          # i * dt * 1000`), which must fall through every stage comparison.
          tick_now = if now == nil, do: :nan, else: now
          Map.put(bed, "stage", growth_stage(bed["plantedAt"], duration, tick_now))
      end
    else
      bed
    end
  end

  defp water_demand(crop_id), do: Map.get(@crops, crop_id, %{})["waterDemand"] || 1.0

  # harvestCount > 0 && repeatHarvest && regrowDuration ? regrow : grow
  defp grow_duration(%{"harvestCount" => count}, %{
         "repeatHarvest" => true,
         "regrowDuration" => regrow
       })
       when count > 0 and is_number(regrow) do
    regrow
  end

  defp grow_duration(_bed, crop), do: crop["growDuration"]

  defp can_harvest(bed, now) do
    crop_id = bed && bed["cropId"]
    planted_at = bed && bed["plantedAt"]

    if is_nil(bed) or is_nil(crop_id) or is_nil(planted_at) do
      false
    else
      case Map.get(@crops, crop_id) do
        nil -> false
        crop -> growth_stage(planted_at, grow_duration(bed, crop), now) == @harvestable
      end
    end
  end
end

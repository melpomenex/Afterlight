import { CROPS, GROWTH_STAGES, getGrowthStage, calculateQuality } from './crops.js';

export function createInitialBeds(count = 12) {
  const beds = [];
  for (let i = 0; i < count; i++) {
    beds.push({
      index: i,
      prepared: false,
      cropId: null,
      plantedAt: null,
      lastWateredAt: null,
      moisture: 0,
      health: 1.0,
      moistureHistorySum: 0,
      moistureChecks: 0,
      stage: GROWTH_STAGES.EMPTY,
      harvestCount: 0,
    });
  }
  return beds;
}

export function tillBed(bed) {
  if (!bed) return { success: false, reason: 'invalid_bed' };
  if (bed.cropId) return { success: false, reason: 'occupied' };
  bed.prepared = true;
  bed.stage = GROWTH_STAGES.PREPARED;
  return { success: true };
}

export function plantBed(bed, cropId, now = Date.now()) {
  if (!bed) return { success: false, reason: 'invalid_bed' };
  if (!bed.prepared) return { success: false, reason: 'not_prepared' };
  if (bed.cropId) return { success: false, reason: 'already_planted' };
  const cropDef = CROPS[cropId];
  if (!cropDef) return { success: false, reason: 'unknown_crop' };

  bed.cropId = cropId;
  bed.plantedAt = now;
  bed.health = 1.0;
  bed.moistureHistorySum = bed.moisture > 0 ? bed.moisture : 0.5;
  bed.moistureChecks = 1;
  bed.stage = GROWTH_STAGES.SEED;
  bed.harvestCount = 0;
  return { success: true, crop: cropDef };
}

export function waterBed(bed, now = Date.now()) {
  if (!bed) return { success: false, reason: 'invalid_bed' };
  bed.moisture = 1.0;
  bed.lastWateredAt = now;
  if (bed.cropId) {
    bed.moistureHistorySum += 1.0;
    bed.moistureChecks++;
  }
  return { success: true };
}

export function tickBed(bed, dtSeconds = 1, isRaining = false, now = Date.now()) {
  if (!bed) return;

  // Moisture decay or rain replenishment
  if (isRaining) {
    bed.moisture = Math.min(1.0, bed.moisture + dtSeconds * 0.05);
  } else {
    const decayRate = bed.cropId ? 0.008 * (CROPS[bed.cropId]?.waterDemand ?? 1.0) : 0.005;
    bed.moisture = Math.max(0, bed.moisture - dtSeconds * decayRate);
  }

  // Update crop progress if planted
  if (bed.cropId && bed.plantedAt) {
    const crop = CROPS[bed.cropId];
    if (!crop) return;

    // Lack of moisture impairs health slightly
    if (bed.moisture <= 0.05) {
      bed.health = Math.max(0.2, bed.health - dtSeconds * 0.002);
    } else {
      bed.health = Math.min(1.0, bed.health + dtSeconds * 0.001);
    }

    // Accumulate moisture check occasionally
    bed.moistureHistorySum += bed.moisture * dtSeconds;
    bed.moistureChecks += dtSeconds;

    const duration = bed.harvestCount > 0 && crop.repeatHarvest && crop.regrowDuration
      ? crop.regrowDuration
      : crop.growDuration;

    bed.stage = getGrowthStage(bed.plantedAt, duration, now);
  }
}

export function canHarvest(bed, now = Date.now()) {
  if (!bed || !bed.cropId || !bed.plantedAt) return false;
  const crop = CROPS[bed.cropId];
  if (!crop) return false;
  const duration = bed.harvestCount > 0 && crop.repeatHarvest && crop.regrowDuration
    ? crop.regrowDuration
    : crop.growDuration;
  return getGrowthStage(bed.plantedAt, duration, now) === GROWTH_STAGES.HARVESTABLE;
}

export function harvestBed(bed, now = Date.now()) {
  if (!canHarvest(bed, now)) {
    return { success: false, reason: 'not_ready' };
  }

  const crop = CROPS[bed.cropId];
  const avgMoisture = bed.moistureChecks > 0 ? (bed.moistureHistorySum / bed.moistureChecks) : 0.8;
  const quality = calculateQuality(avgMoisture, bed.health);
  const yieldCount = crop.yield ?? 2;
  const xp = crop.xp ?? 10;
  const harvestedCropId = bed.cropId;

  if (crop.repeatHarvest) {
    bed.harvestCount++;
    bed.plantedAt = now; // reset timer for regrow cycle
    bed.stage = GROWTH_STAGES.JUVENILE;
    bed.moistureHistorySum = bed.moisture;
    bed.moistureChecks = 1;
  } else {
    // Single harvest crop clears bed back to prepared
    bed.cropId = null;
    bed.plantedAt = null;
    bed.stage = GROWTH_STAGES.PREPARED;
    bed.health = 1.0;
    bed.harvestCount = 0;
    bed.moistureHistorySum = 0;
    bed.moistureChecks = 0;
  }

  return {
    success: true,
    cropId: harvestedCropId,
    crop,
    yield: yieldCount,
    quality,
    xp,
    repeatHarvest: crop.repeatHarvest,
  };
}

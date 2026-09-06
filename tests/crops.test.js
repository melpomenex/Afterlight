import test from 'node:test';
import assert from 'node:assert/strict';
import { CROPS, GROWTH_STAGES, getGrowthStage, calculateQuality } from '../shared/crops.js';
import {
  createInitialBeds,
  tillBed,
  plantBed,
  waterBed,
  tickBed,
  canHarvest,
  harvestBed,
} from '../shared/gardenModel.js';

test('initial beds are empty and unprepared', () => {
  const beds = createInitialBeds(12);
  assert.equal(beds.length, 12);
  assert.equal(beds[0].prepared, false);
  assert.equal(beds[0].cropId, null);
  assert.equal(beds[0].stage, GROWTH_STAGES.EMPTY);
});

test('tilling and planting life-cycle', () => {
  const beds = createInitialBeds(2);
  const bed = beds[0];

  // Cannot plant unprepared
  const failPlant = plantBed(bed, 'radish');
  assert.equal(failPlant.success, false);
  assert.equal(failPlant.reason, 'not_prepared');

  // Till
  const tillRes = tillBed(bed);
  assert.equal(tillRes.success, true);
  assert.equal(bed.prepared, true);
  assert.equal(bed.stage, GROWTH_STAGES.PREPARED);

  // Plant
  const t0 = 100000;
  const plantRes = plantBed(bed, 'radish', t0);
  assert.equal(plantRes.success, true);
  assert.equal(bed.cropId, 'radish');
  assert.equal(bed.stage, GROWTH_STAGES.SEED);

  // Cannot plant again in occupied bed
  const duplicatePlant = plantBed(bed, 'carrot', t0);
  assert.equal(duplicatePlant.success, false);
  assert.equal(duplicatePlant.reason, 'already_planted');
});

test('growth stage transitions over time', () => {
  const duration = 100; // seconds
  const t0 = 100000;

  assert.equal(getGrowthStage(t0, duration, t0), GROWTH_STAGES.SEED);
  assert.equal(getGrowthStage(t0, duration, t0 + 10 * 1000), GROWTH_STAGES.SEED);
  assert.equal(getGrowthStage(t0, duration, t0 + 25 * 1000), GROWTH_STAGES.SPROUT);
  assert.equal(getGrowthStage(t0, duration, t0 + 55 * 1000), GROWTH_STAGES.JUVENILE);
  assert.equal(getGrowthStage(t0, duration, t0 + 85 * 1000), GROWTH_STAGES.MATURE);
  assert.equal(getGrowthStage(t0, duration, t0 + 101 * 1000), GROWTH_STAGES.HARVESTABLE);
});

test('watering, moisture decay, and quality calculation', () => {
  const beds = createInitialBeds(1);
  const bed = beds[0];
  tillBed(bed);
  plantBed(bed, 'lettuce', 1000);

  // Initial water
  waterBed(bed, 1000);
  assert.equal(bed.moisture, 1.0);

  // Tick decay
  tickBed(bed, 10, false, 11000);
  assert.ok(bed.moisture < 1.0);
  assert.ok(bed.moisture > 0.8);

  // Rain restores moisture
  tickBed(bed, 10, true, 21000);
  assert.ok(bed.moisture > 0.9);

  // Quality grades
  assert.equal(calculateQuality(1.0, 1.0), 'A+');
  assert.equal(calculateQuality(0.8, 0.8), 'A');
  assert.equal(calculateQuality(0.6, 0.6), 'B');
  assert.equal(calculateQuality(0.2, 0.4), 'C');
});

test('harvesting immature vs harvestable crops', () => {
  const beds = createInitialBeds(1);
  const bed = beds[0];
  tillBed(bed);
  const t0 = 100000;
  plantBed(bed, 'radish', t0);
  waterBed(bed, t0);

  // Radish takes 25 seconds
  assert.equal(canHarvest(bed, t0 + 10 * 1000), false);
  const earlyHarvest = harvestBed(bed, t0 + 10 * 1000);
  assert.equal(earlyHarvest.success, false);

  // After 26 seconds
  assert.equal(canHarvest(bed, t0 + 26 * 1000), true);
  const harvest = harvestBed(bed, t0 + 26 * 1000);
  assert.equal(harvest.success, true);
  assert.equal(harvest.cropId, 'radish');
  assert.equal(harvest.yield, 2);
  assert.ok(['A+', 'A', 'B'].includes(harvest.quality));
  assert.ok(harvest.xp > 0);

  // Single harvest crop resets bed to prepared
  assert.equal(bed.cropId, null);
  assert.equal(bed.prepared, true);
  assert.equal(bed.stage, GROWTH_STAGES.PREPARED);
});

test('repeat harvest crop resets to regrowing', () => {
  const beds = createInitialBeds(1);
  const bed = beds[0];
  tillBed(bed);
  const t0 = 100000;
  plantBed(bed, 'tomato', t0);
  waterBed(bed, t0);

  // Tomato takes 120s
  const harvestTime = t0 + 125 * 1000;
  assert.equal(canHarvest(bed, harvestTime), true);
  const harvest = harvestBed(bed, harvestTime);
  assert.equal(harvest.success, true);
  assert.equal(harvest.repeatHarvest, true);
  assert.equal(bed.harvestCount, 1);
  assert.equal(bed.cropId, 'tomato');
  assert.equal(bed.stage, GROWTH_STAGES.JUVENILE);
});

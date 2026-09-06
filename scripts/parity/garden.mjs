/**
 * Parity fixtures for shared/gardenModel.js and shared/crops.js — float
 * accumulation, quality boundaries, stage math, and coverage geometry.
 */

import {
  calculateQuality,
  getGrowthStage,
  GROWTH_STAGES,
  CROPS,
} from '../../shared/crops.js';
import {
  canHarvest,
  createInitialBeds,
  harvestBed,
  plantBed,
  sprinklerCoverage,
  tickBed,
  tillBed,
  waterBed,
} from '../../shared/gardenModel.js';
import { recordCall, recordScript } from './harness.mjs';

const T0 = 1_700_000_000_000;

function identityBed(bed) {
  return bed;
}

function preparedOnlyBed() {
  const b = createInitialBeds(1)[0];
  tillBed(b);
  return b;
}

function stageTable() {
  return GROWTH_STAGES;
}

function plantedBed(cropId = 'radish', now = T0) {
  const beds = createInitialBeds(1);
  tillBed(beds[0]);
  plantBed(beds[0], cropId, now);
  waterBed(beds[0], now);
  return beds[0];
}

function tickSteps(count, { dt = 1, raining = false, sprinkled = false, now } = {}) {
  const steps = [];
  for (let i = 0; i < count; i++) {
    steps.push({ fn: tickBed, args: ['<prev>', dt, raining, now + i * dt * 1000, sprinkled] });
  }
  return steps;
}

function build() {
  const cases = [];

  // ------------------------------------------------------------------
  // tickBed float accumulation — decay, rain, sprinkler, dry damage
  // ------------------------------------------------------------------
  cases.push(recordScript({
    id: 'tick/decay-60s',
    steps: [{ fn: identityBed, args: [plantedBed('radish')] }, ...tickSteps(60)],
    keepPrev: true,
  }));
  cases.push(recordScript({
    id: 'tick/rain-60s',
    steps: [{ fn: identityBed, args: [plantedBed('radish')] }, ...tickSteps(60, { raining: true })],
    keepPrev: true,
  }));
  cases.push(recordScript({
    id: 'tick/sprinkled-30s-thirsty-crop',
    steps: [{ fn: identityBed, args: [plantedBed('tomato')] }, ...tickSteps(30, { sprinkled: true })],
    keepPrev: true,
  }));
  cases.push(recordScript({
    id: 'tick/dry-damage-until-floor',
    steps: [{ fn: identityBed, args: [plantedBed('carrot')] }, ...tickSteps(1200)],
    keepPrev: true,
  }));
  cases.push(recordScript({
    id: 'tick/unplanted-prepared-bed',
    steps: [
      { fn: identityBed, args: [preparedOnlyBed()] },
      ...tickSteps(30),
    ],
    keepPrev: true,
  }));
  cases.push(recordCall({ id: 'tick/null-bed', fn: tickBed, args: [null, 1, false, T0, false] }));

  // dt variations (dt=0.5 halves per-tick drift; dt=10 is the flood case)
  cases.push(recordScript({
    id: 'tick/dt-half-120-steps',
    steps: [{ fn: identityBed, args: [plantedBed('basil')] }, ...tickSteps(120, { dt: 0.5 })],
    keepPrev: true,
  }));

  // ------------------------------------------------------------------
  // Growth stage boundaries — exact ms thresholds ±1
  // ------------------------------------------------------------------
  const radish = CROPS.radish;
  const dur = radish.growDuration * 1000;
  const thresholds = [0.15, 0.45, 0.75, 1.0];
  for (const t of thresholds) {
    for (const eps of [-1, 0, 1]) {
      const at = T0 + Math.floor(dur * t) + eps;
      cases.push(recordCall({ id: `stage/radish-${t}-${eps >= 0 ? '+' : ''}${eps}`, fn: getGrowthStage, args: [T0, radish.growDuration, at] }));
    }
  }
  cases.push(recordCall({ id: 'stage/before-start', fn: getGrowthStage, args: [T0, radish.growDuration, T0 - 1] }));
  cases.push(recordCall({ id: 'stage/unknown-crop-guard', fn: getGrowthStage, args: [T0, 100, T0 + 101_000] }));

  // ------------------------------------------------------------------
  // calculateQuality boundary table (>= 0.9 A+, >= 0.75 A, >= 0.55 B, else C)
  // ------------------------------------------------------------------
  const qualityInputs = [
    [1.0, 1.0], [0.9, 1.0], [0.8333333333333334, 1.0], [0.8333333333333333, 1.0],
    [0.5833333333333334, 1.0], [0.5833333333333333, 1.0], [0.25, 1.0], [0.0, 1.0],
    [1.0, 0.75], [1.0, 0.625], [1.0, 0.5], [0.75, 0.75], [0.5, 0.3],
    [0.2, 0.2], [1.0, 0.2],
  ];
  for (const [m, h] of qualityInputs) {
    cases.push(recordCall({ id: `quality/${m}-${h}`, fn: calculateQuality, args: [m, h] }));
  }

  // ------------------------------------------------------------------
  // harvestBed — ready, not ready, repeat-harvest reset
  // ------------------------------------------------------------------
  const readyBed = plantedBed('radish', T0 - CROPS.radish.growDuration * 1000 - 60_000);
  readyBed.moistureHistorySum = 24.0;
  readyBed.moistureChecks = 30.0;
  readyBed.health = 1.0;
  cases.push(recordCall({ id: 'harvest/radish-ready', fn: harvestBed, args: [readyBed, T0] }));

  const notReady = plantedBed('kale', T0);
  cases.push(recordCall({ id: 'harvest/not-ready', fn: harvestBed, args: [notReady, T0] }));

  cases.push(recordScript({
    id: 'harvest/repeat-harvest-strawberry',
    steps: [
      { fn: identityBed, args: [plantedBed('strawberry', T0 - CROPS.strawberry.growDuration * 1000 - 60_000)] },
      { fn: tickBed, args: ['<prev>', 1, false, T0, false] },
      { fn: harvestBed, args: ['<prev>', T0] },
      { fn: harvestBed, args: ['<prev>', T0 + CROPS.strawberry.regrowDuration * 1000 + 1000] },
    ],
    keepPrev: true,
  }));

  const emptyBed = createInitialBeds(1)[0];
  cases.push(recordCall({ id: 'harvest/untilled', fn: harvestBed, args: [emptyBed, T0] }));
  cases.push(recordCall({ id: 'canharvest/prepared-only', fn: canHarvest, args: [preparedOnlyBed(), T0] }));

  // ------------------------------------------------------------------
  // sprinklerCoverage geometry (4×3 grid)
  // ------------------------------------------------------------------
  for (const idx of [0, 3, 4, 5, 7, 11]) {
    cases.push(recordCall({ id: `sprinkler/coverage-${idx}`, fn: sprinklerCoverage, args: [idx] }));
  }

  // Stage name pins (enum stability)
  cases.push(recordCall({ id: 'stages/table', fn: stageTable, args: [] }));

  return cases;
}

export const gardenCases = build();
export const gardenHazards = {
  'float-accumulation': ['tick/*'],
  'rounding-boundaries': ['quality/*', 'stage/*'],
  'int-float-fields': ['tick/*', 'harvest/*'],
  'error-strings': ['harvest/*', 'tick/null-bed'],
  'timestamps': ['stage/*', 'harvest/*'],
};

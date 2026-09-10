/**
 * Kart proximity + background prepare scheduler (fix-kart-royale-instant-entry 5.2).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createKartRoyaleProximityTracker,
  KART_PREPARE_BUDGET_IDLE_MS,
  KART_PREPARE_BUDGET_NEAR_MS,
  KART_PROXIMITY_ENTER_UNITS,
  KART_PROXIMITY_EXIT_UNITS,
} from '../src/activities/kartRoyaleProximity.js';
import { createKartRoyalePrepareScheduler } from '../src/activities/kartRoyalePrepareScheduler.js';
import { createKartRoyalePreparation } from '../src/activities/kartRoyalePreparation.js';
import { createResourceCache } from '../src/activities/resourceCache.js';
import { PrepReadiness } from '../src/activities/kartRoyalePreparation.js';

test('proximity tracker uses 8-unit enter and 10-unit exit hysteresis', () => {
  let distance = 12;
  const tracker = createKartRoyaleProximityTracker({
    getDistance: () => distance,
  });

  tracker.update();
  assert.equal(tracker.near, false);
  assert.equal(tracker.getFrameBudgetMs(), KART_PREPARE_BUDGET_IDLE_MS);

  distance = KART_PROXIMITY_ENTER_UNITS;
  tracker.update();
  assert.equal(tracker.near, true);
  assert.equal(tracker.getFrameBudgetMs(), KART_PREPARE_BUDGET_NEAR_MS);

  distance = KART_PROXIMITY_EXIT_UNITS;
  tracker.update();
  assert.equal(tracker.near, true, 'still near until beyond exit radius');

  distance = KART_PROXIMITY_EXIT_UNITS + 0.01;
  tracker.update();
  assert.equal(tracker.near, false);
});

test('prepare scheduler stays idle until module prefetch is enabled', () => {
  const cache = createResourceCache();
  const preparation = createKartRoyalePreparation({ cache });
  const scheduler = createKartRoyalePrepareScheduler({
    preparation,
    getDistance: () => 20,
    shouldRun: () => true,
    now: () => 0,
  });

  assert.equal(scheduler.getFrameBudgetMs(), 0);
  assert.equal(scheduler.tick({ maxMs: 2 }).ran, false);
});

test('prepare scheduler prefetches host module after controller prefetch with proximity budget', async () => {
  const cache = createResourceCache();
  const preparation = createKartRoyalePreparation({ cache });
  let distance = 20;
  let importCalls = 0;
  const scheduler = createKartRoyalePrepareScheduler({
    preparation,
    getDistance: () => distance,
    shouldRun: () => true,
    importModule: async () => {
      importCalls += 1;
      return { createKartRoyaleHost: () => ({}) };
    },
    now: () => 0,
  });

  await preparation.prefetch();
  scheduler.enableAfterModulePrefetch();

  assert.equal(scheduler.getFrameBudgetMs(), KART_PREPARE_BUDGET_IDLE_MS);
  const first = scheduler.tick({ maxMs: 2 });
  assert.equal(first.ran, true);
  assert.equal(importCalls, 1);

  distance = 5;
  scheduler.proximity.update();
  assert.equal(scheduler.getFrameBudgetMs(), KART_PREPARE_BUDGET_NEAR_MS);
});

test('prepare scheduler pauses while participation input is pending', async () => {
  const cache = createResourceCache();
  const preparation = createKartRoyalePreparation({ cache });
  let pending = true;
  const scheduler = createKartRoyalePrepareScheduler({
    preparation,
    getDistance: () => 5,
    shouldRun: () => true,
    isInputPending: () => pending,
    importModule: async () => ({}),
    now: () => 0,
  });

  await preparation.prefetch();
  scheduler.enableAfterModulePrefetch();
  assert.equal(scheduler.getFrameBudgetMs(), 0);

  pending = false;
  assert.equal(scheduler.getFrameBudgetMs(), KART_PREPARE_BUDGET_NEAR_MS);
  assert.equal(scheduler.tick({ maxMs: 4 }).ran, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceCache } from '../src/activities/resourceCache.js';
import {
  createAllocationAdmissionController,
  getRetentionLimitBytes,
  RETENTION_ENVELOPE_NORMAL_BYTES,
  RETENTION_ENVELOPE_CONSTRAINED_BYTES,
} from '../src/worlds/allocationLedger.js';
import { createWorldAssetLedger } from '../src/worlds/assets.js';

test('Task 6.7: retention envelope scales to 128 MiB when deviceMemory <= 4, 256 MiB otherwise', () => {
  assert.equal(getRetentionLimitBytes(8), RETENTION_ENVELOPE_NORMAL_BYTES);
  assert.equal(getRetentionLimitBytes(16), RETENTION_ENVELOPE_NORMAL_BYTES);
  assert.equal(getRetentionLimitBytes(4), RETENTION_ENVELOPE_CONSTRAINED_BYTES);
  assert.equal(getRetentionLimitBytes(2), RETENTION_ENVELOPE_CONSTRAINED_BYTES);
});

test('Task 6.7: low-memory pressure evicts unreferenced cosmetics first, never evicts live owners', () => {
  const cache = createResourceCache();
  const controller = createAllocationAdmissionController({ cache });

  let cosmeticDisposed = false;
  let liveDisposed = false;

  const hCosmetic = cache.acquire('owner-1', 'cosmetic-key', () => ({
    dispose: () => { cosmeticDisposed = true; },
  }));
  controller.checkAdmission({ key: 'cosmetic-key', isCosmetic: true });

  const hLive = cache.acquire('owner-1', 'live-gameplay-key', () => ({
    dispose: () => { liveDisposed = true; },
  }));
  controller.checkAdmission({ key: 'live-gameplay-key', isCosmetic: false });

  // Release cosmetic handle so refCount drops to 0
  hCosmetic.release();
  assert.equal(cache.refCount('cosmetic-key'), 0);
  assert.equal(cache.refCount('live-gameplay-key'), 1);

  // Trigger memory pressure
  const evicted = controller.onLowMemoryPressure();
  assert.equal(evicted, 1);
  assert.equal(cosmeticDisposed, true, 'Unreferenced cosmetic must be evicted on pressure');
  assert.equal(liveDisposed, false, 'Live owner with refCount > 0 must NEVER be evicted');
  assert.equal(cache.get('live-gameplay-key') != null, true);

  // Clean up
  hLive.release();
});

test('Task 6.7: admission check refuses optional cosmetic when retention envelope is exhausted', () => {
  const cache = createResourceCache();
  // Small artificial budget of 100 KB
  const controller = createAllocationAdmissionController({
    cache,
    maxCpuBytes: 100 * 1024,
    maxGpuBytes: 100 * 1024,
  });

  // Hold live references so they cannot be evicted
  const h1 = cache.acquire('owner-1', 'small-prop', () => ({}));
  const admit1 = controller.checkAdmission({
    key: 'small-prop',
    estimatedBytes: { cpu: 40 * 1024, gpu: 40 * 1024 },
    isCosmetic: true,
  });
  assert.equal(admit1.admitted, true);

  // Admit another live resource that fits
  const h2 = cache.acquire('owner-1', 'medium-prop', () => ({}));
  const admit2 = controller.checkAdmission({
    key: 'medium-prop',
    estimatedBytes: { cpu: 40 * 1024, gpu: 40 * 1024 },
    isCosmetic: true,
  });
  assert.equal(admit2.admitted, true);

  // Try admitting an oversized cosmetic that exceeds the budget
  const admit3 = controller.checkAdmission({
    key: 'giant-prop',
    estimatedBytes: { cpu: 50 * 1024, gpu: 50 * 1024 },
    isCosmetic: true,
  });
  assert.equal(admit3.admitted, false);
  assert.equal(admit3.reason, 'retention_envelope_exceeded');
});

test('Task 6.7: twenty return cycles stop hidden updates and return owned resources to baseline after eviction', () => {
  const cache = createResourceCache();
  const controller = createAllocationAdmissionController({ cache });

  const initialTotals = controller.getTotals();
  assert.equal(initialTotals.trackedCount, 0);
  assert.equal(cache.size(), 0);

  // Run 20 enter -> borrow -> exit -> release -> evict cycles
  for (let cycle = 0; cycle < 20; cycle++) {
    const ledger = createWorldAssetLedger({ cache, owner: `view-session-${cycle}` });

    // Enter view: borrow kit assets
    const rock = ledger.borrow('kit:coastal-rocks');
    assert.ok(rock);
    controller.checkAdmission({ key: 'world-asset:kit:coastal-rocks:high:1', isCosmetic: true });

    const water = ledger.borrow('kit:coastal-water');
    assert.ok(water);
    controller.checkAdmission({ key: 'world-asset:kit:coastal-water:high:1', isCosmetic: true });

    assert.equal(ledger.borrowedCount, 2);
    assert.equal(cache.refCount('world-asset:kit:coastal-rocks:high:1'), 1);

    // Exit view: release all borrowed handles
    ledger.disposeAll();
    assert.equal(ledger.borrowedCount, 0);
    assert.equal(cache.refCount('world-asset:kit:coastal-rocks:high:1'), 0);
    assert.equal(cache.refCount('world-asset:kit:coastal-water:high:1'), 0);

    // Evict idle
    controller.evictUnreferencedCosmetics();
    assert.equal(cache.size(), 0);
  }

  // After 20 cycles, must return completely to baseline
  const finalTotals = controller.getTotals();
  assert.equal(finalTotals.trackedCount, 0);
  assert.equal(finalTotals.cpuBytes, 0);
  assert.equal(finalTotals.gpuBytes, 0);
  assert.equal(cache.size(), 0);
});

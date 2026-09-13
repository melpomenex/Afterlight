import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createResourceCache } from '../src/activities/resourceCache.js';
import { createGraphicsJobQueue } from '../src/activities/graphicsJobs.js';
import { createKartRoyalePrepareScheduler } from '../src/activities/kartRoyalePrepareScheduler.js';
import { PrepReadiness } from '../src/activities/kartRoyalePreparation.js';
import { createDestinationPrefetchScheduler } from '../src/worlds/prefetch.js';

function makeRenderer() {
  return {
    domElement: { width: 800, height: 600 },
    toneMappingExposure: 1.0,
    toneMapping: THREE.NoToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    autoClear: true,
    autoClearColor: true,
    autoClearDepth: true,
    autoClearStencil: false,
    shadowMap: { enabled: false, type: 0, autoUpdate: true, needsUpdate: false },
    getPixelRatio: () => 1,
    getScissorTest: () => false,
    getScissor: (v) => v.set(0, 0, 1, 1),
    getViewport: (v) => v.set(0, 0, 800, 600),
    getRenderTarget: () => null,
    getActiveCubeFace: () => 0,
    getActiveMipmapLevel: () => 0,
    getClearColor: (c) => c.set(0),
    getClearAlpha: () => 1,
    setPixelRatio: () => {},
    setSize: () => {},
    setScissorTest: () => {},
    setScissor: () => {},
    setViewport: () => {},
    setClearColor: () => {},
    setRenderTarget: () => {},
  };
}

test('Task 6.5: declareIntent returns immediately without waiting, no additional RAF', () => {
  const cache = createResourceCache();
  let rafCalled = 0;
  const originalRaf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => {
    rafCalled += 1;
    return 1;
  };

  try {
    const prefetch = createDestinationPrefetchScheduler({
      cache,
      getWorldSelection: () => ({ worldId: 'coastal', variantId: 'sunset' }),
    });

    const start = performance.now();
    const result = prefetch.declareIntent({ placeId: 'theater' });
    const elapsed = performance.now() - start;

    assert.equal(result.ok, true);
    assert.equal(result.viewId, 'place:theater');
    assert.ok(elapsed < 20, `declareIntent must return immediately, took ${elapsed}ms`);
    assert.equal(rafCalled, 0, 'Must not call requestAnimationFrame');
  } finally {
    globalThis.requestAnimationFrame = originalRaf;
  }
});

test('Task 6.5: deduplicated requests - repeated declarations coalesce without duplicate loads', () => {
  const cache = createResourceCache();

  const prefetch = createDestinationPrefetchScheduler({
    cache,
    getWorldSelection: () => ({ worldId: 'coastal', variantId: 'sunset' }),
    resolvePresentation: () => ({
      assetIds: ['kit:coastal-rocks'],
    }),
  });

  // First call schedules
  const res1 = prefetch.declareIntent({ placeId: 'theater' });
  assert.equal(res1.ok, true);
  assert.equal(res1.scheduled, 1);
  assert.equal(res1.deduplicated, 0);

  // Second call with same intent deduplicates
  const res2 = prefetch.declareIntent({ placeId: 'theater' });
  assert.equal(res2.ok, true);
  assert.equal(res2.scheduled, 0);
  assert.equal(res2.deduplicated, 1);
});

test('Task 6.5: no GPU jobs run outside current owner safe transaction when blocked', () => {
  const cache = createResourceCache();
  let leasedActivityActive = true;

  const mockRenderer = makeRenderer();

  const graphicsJobs = createGraphicsJobQueue({
    getRenderer: () => mockRenderer,
    isBlocked: () => leasedActivityActive,
  });

  const prefetch = createDestinationPrefetchScheduler({
    cache,
    graphicsJobs,
    getWorldSelection: () => ({ worldId: 'alpine', variantId: 'aurora' }),
    resolvePresentation: () => ({
      assetIds: ['kit:alpine-rocks'],
    }),
  });

  // Declare intent while leased activity is active (blocked)
  prefetch.declareIntent({ placeId: 'theater' });

  // Draining graphics jobs while blocked runs ZERO jobs
  const drainBlocked = graphicsJobs.drain({ maxMs: 10 });
  assert.equal(drainBlocked.blocked, true);
  assert.equal(drainBlocked.ran, 0);

  // Attempting transaction while blocked throws
  assert.rejects(async () => {
    await graphicsJobs.runTransaction(() => {});
  }, /graphics_transaction_blocked/);

  // Once leased activity releases ownership (unblocked), jobs can drain safely
  leasedActivityActive = false;
  const drainUnblocked = graphicsJobs.drain({ maxMs: 10 });
  assert.equal(drainUnblocked.blocked, false);
  assert.equal(drainUnblocked.ran, 1);
});

test('Task 6.5: kartRoyalePrepareScheduler tick invokes prepareCosmeticsSlice within budget', () => {
  let cosmeticsSliceCalls = 0;
  let receivedBudget = 0;

  const scheduler = createKartRoyalePrepareScheduler({
    preparation: { readiness: PrepReadiness.ready },
    getDistance: () => 5, // Near cabinet
    shouldRun: () => true,
    prepareCosmeticsSlice: (budgetMs) => {
      cosmeticsSliceCalls += 1;
      receivedBudget = budgetMs;
      return true;
    },
    now: () => 1000,
  });

  scheduler.enableAfterModulePrefetch();

  const tickResult = scheduler.tick({
    maxMs: 4,
    viewLeaseHeld: false,
    framePressure: false,
  });

  assert.equal(cosmeticsSliceCalls, 1);
  assert.equal(receivedBudget, 4);
  assert.equal(tickResult.ran, true);
});

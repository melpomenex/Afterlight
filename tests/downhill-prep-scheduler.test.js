/**
 * Downhill Mayhem background preparation scheduler tests
 * (integrate-multiplayer-downhill-mayhem-arcade 7.2–7.4).
 *
 * The scheduler's data/import/host inputs are faked so the budget, gating,
 * single-flight preparation, cancellation and exactly-once disposal contracts
 * are exercised without a browser or a real renderer.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createDownhillMayhemPrepareScheduler } from '../src/activities/downhillMayhemPrepareScheduler.js';
import { PrepReadiness } from '../src/activities/downhillMayhemPreparation.js';

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeFakePreparation(readiness = PrepReadiness.prefetched) {
  const state = {
    readiness,
    retained: null,
    prepareCalls: 0,
    releaseCalls: 0,
  };
  return {
    state,
    get readiness() { return state.readiness; },
    async prepare({ signal, factory }) {
      state.prepareCalls += 1;
      const built = await factory({ signal, generation: 1 });
      if (signal?.aborted) return { ok: false, reason: 'aborted' };
      state.retained = built?.ready ? { host: built.host, ready: true, disposed: false } : null;
      state.readiness = built?.ready ? PrepReadiness.ready : PrepReadiness.failed;
      return { ...built, generation: 1, readiness: state.readiness };
    },
    getRetainedHost() { return state.retained; },
    releaseRetainedHost() {
      state.releaseCalls += 1;
      state.retained = null;
      state.readiness = PrepReadiness.unloaded;
    },
  };
}

function makeHost({ prepared = true, onPrepare = null, disposeCounter } = {}) {
  return {
    prepared,
    disposed: false,
    async prepare() {
      if (onPrepare) await onPrepare(this);
      return { ok: prepared };
    },
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      if (disposeCounter) disposeCounter.count += 1;
    },
  };
}

test('budget is 2 ms idle / 4 ms near with 8/10-unit hysteresis', () => {
  let distance = 100;
  const scheduler = createDownhillMayhemPrepareScheduler({
    preparation: makeFakePreparation(),
    getDistance: () => distance,
  });

  assert.equal(scheduler.getFrameBudgetMs(), 0, 'no budget before the prefetch unlocks warming');

  scheduler.enableAfterModulePrefetch();
  assert.equal(scheduler.getFrameBudgetMs(), 2, 'idle budget');
  assert.equal(scheduler.proximity.near, false);

  distance = 7;
  assert.equal(scheduler.getFrameBudgetMs(), 4, 'near budget');
  assert.equal(scheduler.proximity.near, true);

  distance = 9;
  assert.equal(scheduler.getFrameBudgetMs(), 4, 'hysteresis holds near between 8 and 10');

  distance = 11;
  assert.equal(scheduler.getFrameBudgetMs(), 2, 'exits near past 10');
  assert.equal(scheduler.proximity.near, false);
});

test('tick refuses while a view lease is held, under frame pressure, or off-place', () => {
  const scheduler = createDownhillMayhemPrepareScheduler({
    preparation: makeFakePreparation(),
    createBackgroundHost: () => makeHost(),
  });
  scheduler.enableAfterModulePrefetch();

  assert.equal(scheduler.tick({ maxMs: 4, viewLeaseHeld: true }).reason, 'view-lease');
  assert.equal(scheduler.tick({ maxMs: 4, framePressure: true }).reason, 'frame-pressure');

  const offPlace = createDownhillMayhemPrepareScheduler({
    preparation: makeFakePreparation(),
    shouldRun: () => false,
    createBackgroundHost: () => makeHost(),
  });
  offPlace.enableAfterModulePrefetch();
  assert.equal(offPlace.tick({ maxMs: 4 }).reason, 'place-inactive');
});

test('tick imports once then prepares one hidden host and retains it', async () => {
  const preparation = makeFakePreparation();
  let imports = 0;
  const disposeCounter = { count: 0 };
  const scheduler = createDownhillMayhemPrepareScheduler({
    preparation,
    importModule: async () => { imports += 1; return { createDownhillMayhemHost: () => makeHost({ disposeCounter }) }; },
    resolveCourseDocument: async () => ({ id: 'classic', mountain: 'classic', hash: 'h' }),
    createBackgroundHost: () => makeHost({ disposeCounter }),
  });
  scheduler.enableAfterModulePrefetch();

  const first = scheduler.tick({ maxMs: 4 });
  assert.equal(first.ran, true);
  await flush();
  await flush();

  const second = scheduler.tick({ maxMs: 4 });
  assert.equal(second.hostModuleLoaded, true);
  await flush();
  await flush();

  assert.equal(imports, 1, 'the host module is imported once');
  assert.equal(preparation.state.prepareCalls, 1, 'one hidden prepare');
  assert.equal(scheduler.prepared, true, 'a prepared host is retained');
  assert.equal(disposeCounter.count, 0, 'the retained host is not disposed');

  // A third tick does not prepare again.
  scheduler.tick({ maxMs: 4 });
  await flush();
  assert.equal(preparation.state.prepareCalls, 1);
});

test('cancelled preparation attaches to nothing and disposes its host exactly once', async () => {
  const preparation = makeFakePreparation();
  const disposeCounter = { count: 0 };
  let releasePrepare;
  const gate = new Promise((resolve) => { releasePrepare = resolve; });

  const scheduler = createDownhillMayhemPrepareScheduler({
    preparation,
    importModule: async () => ({ createDownhillMayhemHost: () => makeHost() }),
    resolveCourseDocument: async () => ({ id: 'classic', mountain: 'classic', hash: 'h' }),
    createBackgroundHost: () => makeHost({
      onPrepare: () => gate,
      disposeCounter,
    }),
  });
  scheduler.enableAfterModulePrefetch();
  scheduler.tick({ maxMs: 4 });
  await flush();
  scheduler.tick({ maxMs: 4 });
  await flush();
  await flush();

  scheduler.disable();
  releasePrepare();
  await flush();
  await flush();

  assert.equal(disposeCounter.count, 1, 'the aborted host is disposed exactly once');
  assert.equal(scheduler.prepared, false, 'nothing is retained after cancellation');
});

test('a preparation failure retains nothing and does not throw from tick', async () => {
  const preparation = makeFakePreparation();
  const scheduler = createDownhillMayhemPrepareScheduler({
    preparation,
    importModule: async () => ({ createDownhillMayhemHost: () => makeHost() }),
    resolveCourseDocument: async () => { throw new Error('course unavailable'); },
    createBackgroundHost: () => makeHost(),
  });
  scheduler.enableAfterModulePrefetch();
  scheduler.tick({ maxMs: 4 });
  await flush();
  await flush();

  assert.equal(scheduler.prepared, false);
  assert.equal(preparation.state.retained, null);
});

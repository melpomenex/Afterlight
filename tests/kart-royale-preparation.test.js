/**
 * Kart Royale preparation handle (fix-kart-royale-instant-entry 4.1).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceCache } from '../src/activities/resourceCache.js';
import {
  createKartRoyalePreparation,
  PrepReadiness,
} from '../src/activities/kartRoyalePreparation.js';

function makeCache({ idleEvictMs = 60_000 } = {}) {
  const timers = [];
  const cache = createResourceCache({
    idleEvictMs,
    now: () => 0,
    schedule: {
      after: (_ms, fn) => {
        timers.push(fn);
        return timers.length;
      },
      cancel: (id) => {
        timers[id - 1] = null;
      },
    },
  });
  return { cache, timers };
}

test('prepare stores a cache handle, not a bare promise', async () => {
  const { cache } = makeCache();
  const prep = createKartRoyalePreparation({ cache });
  let built = 0;
  const result = await prep.prepare({
    factory: async () => {
      built += 1;
      return { host: { id: 'host-1' }, ready: true };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(prep.readiness, PrepReadiness.ready);
  assert.equal(built, 1);
  assert.equal(cache.refCount('kart-royale:prepared-runtime:0'), 1);
  assert.equal(result.handle.value.host.id, 'host-1');

  const second = await prep.prepare({
    factory: async () => ({ host: { id: 'host-2' }, ready: true }),
  });
  assert.equal(second.ok, true);
  assert.equal(built, 1, 'second prepare reuses in-flight result');
});

test('invalidate bumps generation and releases the cache handle', async () => {
  const { cache } = makeCache();
  const prep = createKartRoyalePreparation({ cache });
  await prep.prepare({
    factory: async () => ({ host: { id: 'a' }, ready: true }),
  });
  assert.equal(cache.refCount('kart-royale:prepared-runtime:0'), 1);
  const inv = prep.invalidate('travel');
  assert.equal(inv.generation, 1);
  assert.equal(prep.readiness, PrepReadiness.unloaded);
  assert.equal(cache.refCount('kart-royale:prepared-runtime:0'), 0);
});

test('stale factory result does not publish ready after invalidate', async () => {
  const { cache } = makeCache();
  const prep = createKartRoyalePreparation({ cache });
  let resolveLate;
  const late = new Promise((r) => { resolveLate = r; });
  const pending = prep.prepare({
    factory: async () => {
      await late;
      return { host: { id: 'late' }, ready: true };
    },
  });
  prep.invalidate('cancel');
  resolveLate();
  const result = await pending;
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'stale');
  assert.equal(prep.readiness, PrepReadiness.unloaded);
  assert.equal(cache.refCount('kart-royale:prepared-runtime:0'), 0);
});

test('idle eviction reclaims zero-ref prepared values', async () => {
  const { cache, timers } = makeCache();
  const prep = createKartRoyalePreparation({ cache });
  const disposed = [];
  await prep.prepare({
    factory: async () => ({
      host: { id: 'host' },
      ready: true,
    }),
  });
  const key = 'kart-royale:prepared-runtime:0';
  const entry = cache.get(key);
  entry.dispose = () => disposed.push('host');
  prep.dispose();
  assert.equal(disposed.length, 0);
  timers.filter(Boolean).forEach((fn) => fn());
  assert.equal(disposed.length, 1);
  assert.equal(cache.size(), 0);
});

test('activate requires ready or suspended state', async () => {
  const { cache } = makeCache();
  const prep = createKartRoyalePreparation({ cache });
  assert.equal(prep.activate().ok, false);
  await prep.prepare({
    factory: async () => ({ host: {}, ready: true }),
  });
  assert.equal(prep.activate().ok, true);
  assert.equal(prep.readiness, PrepReadiness.active);
  prep.suspend();
  assert.equal(prep.readiness, PrepReadiness.suspended);
  assert.equal(prep.activate().ok, true);
});

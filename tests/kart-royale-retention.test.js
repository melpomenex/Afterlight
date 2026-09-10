/**
 * Kart preparation retention and suspend (fix-kart-royale-instant-entry 6.2/6.3).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceCache } from '../src/activities/resourceCache.js';
import { createKartRoyalePreparation, PrepReadiness } from '../src/activities/kartRoyalePreparation.js';

function makeCache() {
  const timers = [];
  return {
    cache: createResourceCache({
      idleEvictMs: 60_000,
      schedule: {
        after: (_ms, fn) => {
          timers.push(fn);
          return timers.length;
        },
        cancel: (id) => { timers[id - 1] = null; },
      },
    }),
    timers,
  };
}

test('retainHost suspends without disposing and can be reused', async () => {
  const { cache } = makeCache();
  const prep = createKartRoyalePreparation({ cache });
  const host = { id: 'host-1', dispose: () => { host.disposed = true; } };
  host.disposed = false;

  await prep.prepare({ factory: async () => ({ host, ready: true }) });
  prep.activate();
  assert.equal(prep.readiness, PrepReadiness.active);

  prep.suspend();
  prep.retainHost(host, { ready: true });
  assert.equal(prep.readiness, PrepReadiness.suspended);
  assert.equal(prep.getRetainedHost()?.host, host);
  assert.equal(host.disposed, false);

  const reactivate = prep.activate();
  assert.equal(reactivate.ok, true);
  assert.equal(prep.readiness, PrepReadiness.active);
});

test('releaseRetainedHost disposes host and clears cache handle', async () => {
  const { cache } = makeCache();
  const prep = createKartRoyalePreparation({ cache });
  const host = { id: 'host-2', disposed: false, dispose() { this.disposed = true; } };
  await prep.prepare({ factory: async () => ({ host, ready: true }) });
  prep.retainHost(host, { ready: true });
  prep.releaseRetainedHost();
  assert.equal(host.disposed, true);
  assert.equal(prep.getRetainedHost(), null);
  assert.equal(prep.readiness, PrepReadiness.unloaded);
});

test('idle eviction clears zero-ref prepared slot', async () => {
  const { cache, timers } = makeCache();
  const prep = createKartRoyalePreparation({ cache });
  const host = { id: 'host-3' };
  await prep.prepare({ factory: async () => ({ host, ready: true }) });
  assert.equal(cache.size(), 1);
  prep.handle.release();
  timers.filter(Boolean).forEach((fn) => fn());
  assert.equal(cache.size(), 0);
});

/**
 * Retained entry/exit cycle soak (fix-kart-royale-instant-entry 6.5).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceCache } from '../src/activities/resourceCache.js';
import { createKartRoyalePreparation } from '../src/activities/kartRoyalePreparation.js';

test('twenty retain/release cycles keep one cache slot and dispose on final release', async () => {
  const timers = [];
  const cache = createResourceCache({
    schedule: {
      after: (_ms, fn) => {
        timers.push(fn);
        return timers.length;
      },
      cancel: (id) => { timers[id - 1] = null; },
    },
  });
  const prep = createKartRoyalePreparation({ cache });

  for (let i = 0; i < 20; i++) {
    const host = {
      id: `host-${i}`,
      disposed: false,
      dispose() { this.disposed = true; },
    };
    await prep.prepare({ factory: async () => ({ host, ready: true }) });
    prep.activate();
    prep.suspend();
    prep.retainHost(host, { ready: true });
    assert.equal(prep.getRetainedHost()?.host.id, `host-${i}`);
    prep.releaseRetainedHost();
    assert.equal(host.disposed, true);
    timers.filter(Boolean).forEach((fn) => fn());
  }

  assert.equal(cache.size(), 0);
});

test('twenty eviction/rebuild cycles reclaim idle slots', async () => {
  const timers = [];
  const cache = createResourceCache({
    idleEvictMs: 60_000,
    schedule: {
      after: (_ms, fn) => {
        timers.push(fn);
        return timers.length;
      },
      cancel: (id) => { timers[id - 1] = null; },
    },
  });
  const prep = createKartRoyalePreparation({ cache });

  for (let i = 0; i < 20; i++) {
    const host = {
      id: `evict-${i}`,
      disposed: false,
      dispose() { this.disposed = true; },
    };
    await prep.prepare({ factory: async () => ({ host, ready: true }) });
    assert.equal(cache.size(), 1);
    prep.handle.release();
    timers.filter(Boolean).forEach((fn) => fn());
    assert.equal(cache.size(), 0);
  }
});

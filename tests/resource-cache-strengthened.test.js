import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceCache } from '../src/activities/resourceCache.js';

function makeCache({ idleEvictMs = 60_000 } = {}) {
  const timers = [];
  const cache = createResourceCache({
    idleEvictMs,
    now: () => 1000,
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
  return {
    cache,
    timers,
    triggerIdleTimer: (idx = 0) => {
      if (timers[idx]) timers[idx]();
    },
  };
}

test('Task 6.1: handle.release() is idempotent and returns already_released on subsequent calls', () => {
  const { cache } = makeCache();
  let disposed = 0;
  const mockResource = {
    id: 'res1',
    dispose: () => {
      disposed += 1;
    },
  };

  const handle = cache.acquire('owner-1', 'key-1', () => mockResource);
  assert.equal(cache.refCount('key-1'), 1);
  assert.equal(handle.isReleased, false);

  const res1 = handle.release();
  assert.equal(res1.released, true);
  assert.equal(res1.refCount, 0);
  assert.equal(handle.isReleased, true);
  assert.equal(cache.refCount('key-1'), 0);

  // Second release on same handle
  const res2 = handle.release();
  assert.equal(res2.released, false);
  assert.equal(res2.reason, 'already_released');
  assert.equal(cache.refCount('key-1'), 0);
});

test('Task 6.1: unauthorized release is rejected with not_owner and does not corrupt refCount', () => {
  const { cache } = makeCache();
  const handle = cache.acquire('legit-owner', 'shared-key', () => ({ tag: 'mesh' }));
  assert.equal(cache.refCount('shared-key'), 1);

  // Imposter tries to release
  const reject1 = cache.release('imposter-owner', 'shared-key');
  assert.equal(reject1.released, false);
  assert.equal(reject1.reason, 'not_owner');
  assert.equal(cache.refCount('shared-key'), 1);

  // Releasing null or undefined owner
  const rejectNull = cache.release(null, 'shared-key');
  assert.equal(rejectNull.released, false);
  assert.equal(rejectNull.reason, 'not_owner');
  assert.equal(cache.refCount('shared-key'), 1);

  // Legitimate release works
  const success = handle.release();
  assert.equal(success.released, true);
  assert.equal(cache.refCount('shared-key'), 0);
});

test('Task 6.1: same-owner repeated acquire tracking and multi-release / disposeOwner', () => {
  const { cache } = makeCache();
  const res = { id: 'repeat-res' };

  const h1 = cache.acquire('owner-alpha', 'tex-1', () => res);
  const h2 = cache.acquire('owner-alpha', 'tex-1', () => res);

  assert.equal(cache.refCount('tex-1'), 2);
  assert.equal(h1.shared, false);
  assert.equal(h2.shared, true);

  // Releasing h1 decrements count to 1
  const rel1 = h1.release();
  assert.equal(rel1.released, true);
  assert.equal(cache.refCount('tex-1'), 1);

  // Owner still holds 1 reference via h2
  assert.equal(cache.get('tex-1'), res);

  // Releasing h2 decrements count to 0
  const rel2 = h2.release();
  assert.equal(rel2.released, true);
  assert.equal(cache.refCount('tex-1'), 0);

  // Test disposeOwner across multiple keys for same owner
  cache.acquire('owner-beta', 'k1', () => ({}));
  cache.acquire('owner-beta', 'k1', () => ({}));
  cache.acquire('owner-beta', 'k2', () => ({}));
  assert.equal(cache.refCount('k1'), 2);
  assert.equal(cache.refCount('k2'), 1);

  const releasedKeys = cache.disposeOwner('owner-beta');
  assert.deepEqual(releasedKeys.sort(), ['k1', 'k2']);
  assert.equal(cache.refCount('k1'), 0);
  assert.equal(cache.refCount('k2'), 0);
});

test('Task 6.1: multi-owner retention keeps value valid until all owners release', () => {
  const { cache } = makeCache();
  let disposedCount = 0;
  const sharedVal = {
    name: 'shared-glb',
    dispose: () => {
      disposedCount += 1;
    },
  };

  const hA = cache.acquire('ownerA', 'model', () => sharedVal);
  const hB = cache.acquire('ownerB', 'model', () => sharedVal);

  assert.equal(cache.refCount('model'), 2);
  assert.equal(hA.value, sharedVal);
  assert.equal(hB.value, sharedVal);

  // Owner A releases; value must NOT be disposed and must stay in cache
  hA.release();
  assert.equal(cache.refCount('model'), 1);
  assert.equal(cache.get('model'), sharedVal);
  assert.equal(disposedCount, 0);

  // Owner B releases; refCount drops to 0
  hB.release();
  assert.equal(cache.refCount('model'), 0);

  // When evicted, dispose is invoked
  cache.evictIdle();
  assert.equal(disposedCount, 1);
  assert.equal(cache.get('model'), null);
});

test('Task 6.2: pending-factory deduplication shares one in-flight promise across owners', async () => {
  const { cache } = makeCache();
  let factoryCalls = 0;
  let resolvePromise;
  const factoryPromise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const h1 = cache.acquire('user1', 'async-key', () => {
    factoryCalls += 1;
    return factoryPromise;
  });

  const h2 = cache.acquire('user2', 'async-key', () => {
    factoryCalls += 1;
    return factoryPromise;
  });

  assert.equal(factoryCalls, 1);
  assert.equal(h1.promise, factoryPromise);
  assert.equal(h2.promise, factoryPromise);
  assert.equal(cache.refCount('async-key'), 2);

  resolvePromise({ loaded: true });
  await factoryPromise;

  assert.deepEqual(cache.get('async-key'), { loaded: true });
  assert.deepEqual(h1.value, { loaded: true });
  assert.deepEqual(h2.value, { loaded: true });
});

test('Task 6.2: cancellation isolation - one consumer cancellation does not cancel another', async () => {
  const { cache } = makeCache();
  let resolveFn;
  const p = new Promise((resolve) => {
    resolveFn = resolve;
  });

  const h1 = cache.acquire('client1', 'shared-async', () => p);
  const h2 = cache.acquire('client2', 'shared-async', () => p);

  assert.equal(cache.refCount('shared-async'), 2);

  // client1 cancels while pending
  const rel1 = h1.release();
  assert.equal(rel1.released, true);
  assert.equal(cache.refCount('shared-async'), 1);

  // Resolve the pending promise
  let disposed = 0;
  const resource = {
    id: 'res-async',
    dispose: () => {
      disposed += 1;
    },
  };
  resolveFn(resource);
  await p;

  // client2 still retains the resolved resource, not disposed
  assert.equal(disposed, 0);
  assert.equal(cache.get('shared-async'), resource);
  assert.equal(h2.value, resource);

  // Now client2 releases
  h2.release();
  assert.equal(cache.refCount('shared-async'), 0);
});

test('Task 6.2: late completion disposal - if all consumers cancel before resolution, value is disposed immediately without leak', async () => {
  const { cache } = makeCache();
  let resolveFn;
  const p = new Promise((resolve) => {
    resolveFn = resolve;
  });

  const h1 = cache.acquire('client1', 'abandoned-key', () => p);
  const h2 = cache.acquire('client2', 'abandoned-key', () => p);

  // Both cancel before completion
  h1.release();
  h2.release();
  assert.equal(cache.refCount('abandoned-key'), 0);

  let disposedCount = 0;
  const lateResource = {
    id: 'late',
    dispose: () => {
      disposedCount += 1;
    },
  };

  resolveFn(lateResource);
  await p;

  // Must have disposed immediately upon settlement and removed from cache
  assert.equal(disposedCount, 1);
  assert.equal(cache.get('abandoned-key'), null);
  assert.equal(cache.size(), 0);
});

test('Task 6.2: rejection retry - rejected promise is evicted so subsequent acquire retries factory', async () => {
  const { cache } = makeCache();
  let attempt = 0;

  async function failingFactory() {
    attempt += 1;
    if (attempt === 1) {
      throw new Error('Network error on load');
    }
    return { id: 'success-on-retry' };
  }

  const h1 = cache.acquire('owner1', 'retry-key', failingFactory);
  await assert.rejects(async () => {
    await h1.promise;
  }, /Network error on load/);

  // Entry should have been removed on rejection
  assert.equal(cache.get('retry-key'), null);

  // Retry acquire
  const h2 = cache.acquire('owner1', 'retry-key', failingFactory);
  const result = await h2.promise;
  assert.equal(result.id, 'success-on-retry');
  assert.equal(attempt, 2);
  assert.equal(cache.get('retry-key'), result);
});

test('Task 6.2: context invalidation evicts GPU/graphics resources bound to specific context', () => {
  const { cache } = makeCache();
  let ctx1Disposed = 0;
  let ctx2Disposed = 0;

  cache.acquire('o1', 'gpu-buf-1', () => ({
    dispose: () => {
      ctx1Disposed += 1;
    },
  }), { contextId: 'webgl-context-1' });

  cache.acquire('o1', 'gpu-buf-2', () => ({
    dispose: () => {
      ctx2Disposed += 1;
    },
  }), { contextId: 'webgl-context-2' });

  assert.equal(cache.size(), 2);

  // Invalidate context 1
  const evicted = cache.invalidateContext('webgl-context-1');
  assert.equal(evicted, 1);
  assert.equal(ctx1Disposed, 1);
  assert.equal(ctx2Disposed, 0);
  assert.equal(cache.get('gpu-buf-1'), null);
  assert.notEqual(cache.get('gpu-buf-2'), null);
});

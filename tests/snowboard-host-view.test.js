/**
 * Host-view seam tests (add-multiplayer-snowboard-arcade 6.1/6.3):
 * the generation-bound view lease and the application-owned resource cache.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityViewLease } from '../src/activities/viewLease.js';
import { createResourceCache } from '../src/activities/resourceCache.js';

const view = { name: 'social' };

function makeHost({ gen = 3 } = {}) {
  const applied = [];
  const restored = [];
  const leaseSystem = createActivityViewLease({
    generation: () => gen,
    apply: (info) => applied.push(info),
    restore: (info) => restored.push(info),
  });
  return { leaseSystem, applied, restored };
}

test('view lease: acquire applies scene+camera together and only once', () => {
  const { leaseSystem, applied } = makeHost();

  const result = leaseSystem.acquireView({ owner: 'summit', generation: 3, scene: 'mountain', camera: 'chase' });
  assert.equal(result.ok, true);
  // The full request (resize hook included) is forwarded so the host can
  // size a freshly borrowed camera immediately.
  assert.deepEqual(applied, [{ scene: 'mountain', camera: 'chase', owner: 'summit', resize: null, onRelease: null }]);

  const second = leaseSystem.acquireView({ owner: 'other', generation: 3, scene: 'x', camera: 'y' });
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'already_owned');
  assert.equal(applied.length, 1, 'second acquire never re-applies');
});

test('view lease: stale generation is rejected (travel supersedes)', () => {
  const { leaseSystem } = makeHost({ gen: 5 });
  const result = leaseSystem.acquireView({ owner: 'summit', generation: 3, scene: 'm', camera: 'c' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'stale_generation');
  assert.equal(leaseSystem.held, false);
});

test('view lease: release is owner-checked and idempotent; restore runs once', () => {
  const { leaseSystem, restored } = makeHost();
  leaseSystem.acquireView({ owner: 'summit', generation: 3, scene: 'm', camera: 'c' });

  assert.equal(leaseSystem.release('other', 'exit').released, false, 'a non-owner cannot release');
  assert.deepEqual(restored, []);

  assert.equal(leaseSystem.release('summit', 'exit').released, true);
  assert.equal(restored.length, 1);
  assert.equal(leaseSystem.release('summit', 'exit').released, false, 'second release is a no-op');
  assert.equal(restored.length, 1, 'restore never runs twice');
  assert.equal(leaseSystem.lastReleased().reason, 'exit');
});

test('view lease: revoke forces release and fires the lease hook once', () => {
  const hooks = [];
  const { leaseSystem } = makeHost();
  const result = leaseSystem.acquireView({
    owner: 'summit',
    generation: 3,
    scene: 'm',
    camera: 'c',
    onRelease: (reason) => hooks.push(reason),
  });
  assert.equal(result.ok, true);

  leaseSystem.revoke('travel');
  assert.deepEqual(hooks, ['travel']);
  assert.equal(leaseSystem.held, false);
  // Re-acquire works after revoke.
  assert.equal(leaseSystem.acquireView({ owner: 'summit2', generation: 4, scene: 'm2', camera: 'c2' }).ok, true);
});

// --- resource cache -------------------------------------------------------------

function makeCache({ idleEvictMs = 60_000 } = {}) {
  const timers = [];
  const cache = createResourceCache({
    idleEvictMs,
    now: () => 0,
    schedule: {
      after: (ms, fn) => {
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

test('resource cache: first acquire builds, later acquires share the value', () => {
  const { cache } = makeCache();
  let built = 0;
  const factory = () => {
    built += 1;
    return { id: built };
  };

  const a = cache.acquire('attempt-1', 'course', factory);
  const b = cache.acquire('attempt-2', 'course', factory);
  assert.equal(built, 1, 'factory runs once');
  assert.equal(a.value, b.value);
  assert.equal(cache.refCount('course'), 2);

  a.release();
  b.release();
  assert.equal(cache.refCount('course'), 0);
});

test('resource cache: zero-ref values evict after the idle window, not before', () => {
  const { cache, timers } = makeCache({ idleEvictMs: 60_000 });
  const disposed = [];
  const handle = cache.acquire('a', 'scene', () => ({ dispose: () => disposed.push('scene') }));

  handle.release();
  assert.equal(disposed.length, 0, 'value survives release for rematches');
  assert.equal(cache.size(), 1);

  // Re-acquire before eviction: timer canceled, value retained.
  const again = cache.acquire('b', 'scene', () => ({ dispose: () => disposed.push('again') }));
  assert.equal(again.shared, true);
  again.release();

  timers.filter(Boolean).forEach((fn) => fn());
  assert.equal(disposed.length, 1, 'idle eviction disposes exactly once after the window');
  assert.equal(cache.size(), 0);
});

test('resource cache: disposeOwner releases only that attempt handles', () => {
  const { cache } = makeCache();
  const h1 = cache.acquire('attempt-1', 'terrain', () => ({}));
  const h2 = cache.acquire('attempt-1', 'audio', () => ({}));
  const other = cache.acquire('attempt-2', 'terrain', () => ({}));

  const keys = cache.disposeOwner('attempt-1');
  assert.deepEqual(keys.sort(), ['audio', 'terrain']);
  assert.equal(cache.refCount('terrain'), 1, 'the other owner keeps its handle');
  assert.equal(cache.refCount('audio'), 0);
  void h1;
  void h2;
  other.release();
});

test('resource cache: revoked attempts retain nothing; the cached value still serves live owners', () => {
  const { cache } = makeCache();
  // Attempt built the value then was revoked before using it: the handle is
  // gone, the value stays cached until idle eviction (rematch reuse).
  const handle = cache.acquire('dead-attempt', 'mountain', () => ({ v: 1 }));
  cache.disposeOwner('dead-attempt');
  assert.equal(cache.refCount('mountain'), 0, 'the dead attempt holds no handle');

  const late = cache.acquire('live-attempt', 'mountain', () => ({ v: 2 }));
  assert.equal(late.value.v, 1, 'the still-cached value is shared, not rebuilt');
  assert.equal(late.shared, true);
  late.release();

  cache.evictIdle();
  const fresh = cache.acquire('attempt-3', 'mountain', () => ({ v: 3 }));
  assert.equal(fresh.value.v, 3, 'after eviction the factory runs again');
  fresh.release();
});

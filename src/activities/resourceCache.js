/**
 * Application-owned activity resource cache
 * (add-multiplayer-snowboard-arcade 6.3, design D1/D9).
 *
 * Reference-counted cache for mountain-scene resources that must survive
 * activity disposal so rematches never rebuild or refetch:
 *   - `acquire(owner, key, factory)` returns `{ handle, value }`; the first
 *     caller's factory builds the value; later acquires share it;
 *   - each handle is per-attempt: `handle.release()` decrements; the shared
 *     value is evicted when the count reaches zero AND 60s pass unused
 *     (idle timer re-armed by an injected scheduler — never a global
 *     setTimeout in pure tests);
 *   - `disposeOwner(owner)` releases every handle an activity attempt owns
 *     without touching values another live owner still holds;
 *   - a factory that resolves after its attempt was revoked (stale token)
 *     still lands in the cache, but the revoked owner holds no handle and
 *     nothing retains the attempt.
 *
 * Pure: clocks and scheduling are injected.
 */

export function createResourceCache({ idleEvictMs = 60_000, schedule = null, now = () => 0 } = {}) {
  // key -> { value, refCount, lastUsedAt, evictTimer, factoryMeta }
  const entries = new Map();
  // owner -> Set(key)
  const owners = new Map();
  let scheduler = schedule;

  function armEvict(key) {
    const entry = entries.get(key);
    if (!entry || entry.refCount > 0) return;
    if (entry.evictTimer != null && scheduler) scheduler.cancel(entry.evictTimer);
    entry.evictTimer = scheduler
      ? scheduler.after(idleEvictMs, () => {
          const current = entries.get(key);
          if (current && current.refCount <= 0) {
            disposeValue(current);
            entries.delete(key);
          }
        })
      : null;
  }

  function disposeValue(entry) {
    if (entry.evictTimer != null && scheduler) scheduler.cancel(entry.evictTimer);
    entry.evictTimer = null;
    if (entry.value && typeof entry.value.dispose === 'function') {
      try {
        entry.value.dispose();
      } catch (error) {
        console.warn('[ResourceCache] value dispose failed:', error);
      }
    }
  }

  function acquire(owner, key, factory) {
    let entry = entries.get(key);
    const isNew = !entry;

    if (!entry) {
      entry = { value: typeof factory === 'function' ? factory() : factory, refCount: 0, lastUsedAt: now(), evictTimer: null };
      entries.set(key, entry);
    }

    entry.refCount += 1;
    entry.lastUsedAt = now();
    if (entry.refCount === 1) armEvict(key); // cancels any pending evict

    if (!owners.has(owner)) owners.set(owner, new Set());
    owners.get(owner).add(key);

    const cache = this_cache;
    return {
      value: entry.value,
      key,
      shared: !isNew,
      release() {
        cache.release(owner, key);
      },
    };
  }

  const this_cache = {
    acquire,

    release(owner, key) {
      const entry = entries.get(key);
      if (!entry || entry.refCount <= 0) return { released: false, reason: 'not_held' };

      entry.refCount -= 1;
      const ownerKeys = owners.get(owner);
      if (ownerKeys) {
        ownerKeys.delete(key);
        if (ownerKeys.size === 0) owners.delete(owner);
      }

      if (entry.refCount === 0) {
        entry.lastUsedAt = now();
        armEvict(key);
      }
      return { released: true, refCount: entry.refCount };
    },

    /** Release every handle belonging to one activity attempt. */
    disposeOwner(owner) {
      const keys = [...(owners.get(owner) ?? [])];
      for (const key of keys) this.release(owner, key);
      return keys;
    },

    get(key) {
      return entries.get(key)?.value ?? null;
    },

    refCount(key) {
      return entries.get(key)?.refCount ?? 0;
    },

    size() {
      return entries.size;
    },

    /** Immediate sweep of zero-ref entries (memory pressure, teardown). */
    evictIdle() {
      let evicted = 0;
      for (const [key, entry] of [...entries]) {
        if (entry.refCount <= 0) {
          disposeValue(entry);
          entries.delete(key);
          evicted += 1;
        }
      }
      return evicted;
    },

    /** Test hook: run the pending evict timer immediately. */
    flushEvictTimers() {
      for (const [key, entry] of [...entries]) {
        if (entry.refCount <= 0 && entry.evictTimer) {
          disposeValue(entry);
          entries.delete(key);
          evicted_flush += 1;
        }
      }
    },
  };

  let evicted_flush = 0;

  return this_cache;
}

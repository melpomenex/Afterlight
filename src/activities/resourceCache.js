/**
 * Application-owned activity resource cache
 * (add-multiplayer-snowboard-arcade 6.3, introduce-global-world-system 6.1/6.2).
 *
 * Reference-counted cache for shared graphics/audio/activity resources:
 *   - `acquire(owner, key, factory, options)` returns `{ handle, value }`; the first
 *     caller's factory builds the value; concurrent/subsequent acquires share it;
 *   - idempotent handle release: calling handle.release() multiple times is a no-op;
 *   - owner-checked releases: unauthorized releases are rejected and do not corrupt refCounts;
 *   - same-owner repeated acquires: accurately tracked per owner per key;
 *   - multi-owner retention: shared values remain valid until all owners release;
 *   - pending-factory deduplication: concurrent async loads share one in-flight promise;
 *   - rejection retry: rejected promises are evicted so subsequent acquires can retry;
 *   - isolated cancellation: canceling one consumer's pending acquire does not cancel others;
 *   - late completion disposal: if all consumers cancel before resolution, the late value is disposed;
 *   - idle eviction: 60s idle timer (injected scheduler) or explicit `evictIdle()`;
 *   - context invalidation: evicts GPU/graphics resources on renderer reset.
 *
 * Pure: clocks and scheduling are injected.
 */

function isPromise(val) {
  return val && typeof val === 'object' && typeof val.then === 'function';
}

function disposeRawValue(val) {
  if (!val) return;
  if (typeof val.dispose === 'function') {
    try {
      val.dispose();
    } catch (error) {
      console.warn('[ResourceCache] value dispose failed:', error);
    }
  }
}

export function createResourceCache({ idleEvictMs = 60_000, schedule = null, now = () => 0 } = {}) {
  // key -> { key, value, promise, refCount, lastUsedAt, evictTimer, cancelled, contextId }
  const entries = new Map();
  // owner -> Map(key -> count)
  const owners = new Map();
  let scheduler = schedule;
  let evicted_flush = 0;

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
    entry.cancelled = true;
    if (entry.value) {
      disposeRawValue(entry.value);
      entry.value = null;
    }
  }

  function acquire(owner, key, factory, { contextId = null } = {}) {
    if (owner == null) throw new Error('acquire requires a valid owner identifier');
    if (typeof key !== 'string' || key.length === 0) throw new Error('acquire requires a non-empty string key');

    let entry = entries.get(key);
    const isNew = !entry;

    if (!entry) {
      let factoryResult;
      try {
        factoryResult = typeof factory === 'function' ? factory() : factory;
      } catch (err) {
        throw err;
      }

      if (isPromise(factoryResult)) {
        entry = {
          key,
          value: null,
          promise: factoryResult,
          refCount: 0,
          lastUsedAt: now(),
          evictTimer: null,
          cancelled: false,
          contextId,
        };
        entries.set(key, entry);

        // Deduplicated pending promise handling
        factoryResult
          .then((resolved) => {
            if (entry.cancelled || entry.refCount <= 0) {
              // All consumers cancelled while loading: dispose late completion immediately without leak
              disposeRawValue(resolved);
              if (entries.get(key) === entry) {
                entries.delete(key);
              }
              return resolved;
            }
            entry.value = resolved;
            entry.promise = null;
            return resolved;
          })
          .catch((_err) => {
            // Rejection: remove from entries so subsequent acquire can retry
            if (entries.get(key) === entry) {
              entries.delete(key);
            }
          });
      } else {
        entry = {
          key,
          value: factoryResult,
          promise: null,
          refCount: 0,
          lastUsedAt: now(),
          evictTimer: null,
          cancelled: false,
          contextId,
        };
        entries.set(key, entry);
      }
    } else {
      // Re-activating an existing entry
      entry.cancelled = false;
      if (entry.evictTimer != null && scheduler) {
        scheduler.cancel(entry.evictTimer);
        entry.evictTimer = null;
      }
    }

    entry.refCount += 1;
    entry.lastUsedAt = now();

    // Track acquires per owner per key to support same-owner repeated acquires
    let ownerMap = owners.get(owner);
    if (!ownerMap) {
      ownerMap = new Map();
      owners.set(owner, ownerMap);
    }
    const currentCount = ownerMap.get(key) ?? 0;
    ownerMap.set(key, currentCount + 1);

    const cache = this_cache;
    let released = false;

    return {
      get value() {
        return entry.value ?? entry.promise;
      },
      get promise() {
        return entry.promise;
      },
      key,
      owner,
      shared: !isNew,
      get refCount() {
        return entry.refCount;
      },
      get isReleased() {
        return released;
      },
      release() {
        if (released) {
          return { released: false, reason: 'already_released' };
        }
        released = true;
        return cache.release(owner, key);
      },
    };
  }

  const this_cache = {
    acquire,

    release(owner, key) {
      if (owner == null || !owners.has(owner)) {
        return { released: false, reason: 'not_owner' };
      }
      const ownerMap = owners.get(owner);
      const heldCount = ownerMap.get(key) ?? 0;
      if (heldCount <= 0) {
        return { released: false, reason: 'not_owner' };
      }

      const entry = entries.get(key);
      if (!entry || entry.refCount <= 0) {
        return { released: false, reason: 'not_held' };
      }

      // Decrement owner's count for this key
      if (heldCount === 1) {
        ownerMap.delete(key);
        if (ownerMap.size === 0) {
          owners.delete(owner);
        }
      } else {
        ownerMap.set(key, heldCount - 1);
      }

      entry.refCount -= 1;

      if (entry.refCount === 0) {
        if (entry.promise) {
          entry.cancelled = true;
        } else {
          entry.lastUsedAt = now();
          armEvict(key);
        }
      }

      return { released: true, refCount: entry.refCount };
    },

    /** Release every handle belonging to one activity attempt. */
    disposeOwner(owner) {
      const ownerMap = owners.get(owner);
      if (!ownerMap) return [];
      const releasedKeys = [];
      for (const [key, count] of [...ownerMap.entries()]) {
        for (let i = 0; i < count; i++) {
          this.release(owner, key);
        }
        releasedKeys.push(key);
      }
      return releasedKeys;
    },

    get(key) {
      const entry = entries.get(key);
      return entry ? (entry.value ?? entry.promise) : null;
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

    /** Evicts entries bound to an invalidated renderer/graphics context. */
    invalidateContext(contextId = null) {
      let evicted = 0;
      for (const [key, entry] of [...entries]) {
        if (!contextId || entry.contextId === contextId) {
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

  return this_cache;
}

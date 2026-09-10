/**
 * Downhill Mayhem preparation handle (integrate-multiplayer-downhill-mayhem-
 * arcade 7.1). Owns prefetch/prepare single-flight promises and stores a
 * disposable cache handle (never a bare Promise) through the shared
 * `resourceCache`, exactly like `kartRoyalePreparation.js`: one prepared
 * runtime may be retained for a fast re-entry, cancelled/stale preparation
 * attaches to nothing, and disposal releases only this activity's handle.
 */

export const PrepReadiness = Object.freeze({
  unloaded: 'unloaded',
  prefetching: 'prefetching',
  prefetched: 'prefetched',
  warming: 'warming',
  ready: 'ready',
  failed: 'failed',
  active: 'active',
  suspended: 'suspended',
});

/**
 * @param {object} options
 * @param {ReturnType<import('./resourceCache.js').createResourceCache>} options.cache
 * @param {string} [options.cacheKey]
 * @param {number} [options.placeGeneration]
 */
export function createDownhillMayhemPreparation({
  cache,
  cacheKey = 'downhill-mayhem:prepared-runtime',
  placeGeneration = 0,
} = {}) {
  if (!cache) throw new Error('downhill preparation requires a resource cache');

  let readiness = PrepReadiness.unloaded;
  let resourceGeneration = 0;
  let prefetchPromise = null;
  let preparePromise = null;
  let prefetchedModule = null;
  let ownerToken = { id: 'downhill-prep', generation: placeGeneration };
  let cacheHandle = null;
  let quarantined = false;
  let prepStartedAt = 0;

  function releaseCacheHandle() {
    if (cacheHandle) {
      cacheHandle.release();
      cacheHandle = null;
    }
  }

  function bumpGeneration() {
    resourceGeneration += 1;
    preparePromise = null;
    releaseCacheHandle();
    if (readiness !== PrepReadiness.active) readiness = PrepReadiness.unloaded;
    return resourceGeneration;
  }

  return {
    get readiness() { return readiness; },
    get resourceGeneration() { return resourceGeneration; },
    get prefetched() { return prefetchedModule != null; },
    get handle() { return cacheHandle; },

    async prefetch({ signal = null } = {}) {
      if (signal?.aborted) return { ok: false, reason: 'aborted' };
      if (prefetchedModule) return { ok: true, shared: true };
      if (prefetchPromise) return prefetchPromise;

      readiness = PrepReadiness.prefetching;
      prefetchPromise = import('./downhill/controller.js')
        .then((mod) => {
          if (signal?.aborted) throw new Error('aborted');
          prefetchedModule = mod;
          readiness = readiness === PrepReadiness.failed ? PrepReadiness.failed : PrepReadiness.prefetched;
          return { ok: true, shared: false };
        })
        .catch((err) => {
          readiness = PrepReadiness.failed;
          prefetchPromise = null;
          throw err;
        });
      return prefetchPromise;
    },

    async prepare({ signal = null, factory = null } = {}) {
      if (typeof factory !== 'function') return { ok: false, reason: 'no_factory' };
      if (signal?.aborted) return { ok: false, reason: 'aborted' };
      if (quarantined) return { ok: false, reason: 'quarantined' };

      const gen = resourceGeneration;
      if (cacheHandle) {
        const held = cache.refCount(cacheHandle.key) > 0;
        if (!held || cache.get(cacheHandle.key) == null) {
          cacheHandle = null;
          preparePromise = null;
        }
      } else {
        preparePromise = null;
      }
      if (preparePromise) return preparePromise;

      prepStartedAt = Date.now();
      readiness = PrepReadiness.warming;
      preparePromise = (async () => {
        const handle = cache.acquire(ownerToken, `${cacheKey}:${gen}`, () => ({
          generation: gen,
          host: null,
          ready: false,
          disposed: false,
        }));
        try {
          const built = await factory({ signal, generation: gen });
          if (gen !== resourceGeneration || signal?.aborted) {
            handle.release();
            return { ok: false, reason: 'stale', generation: gen };
          }
          handle.value.host = built?.host ?? null;
          handle.value.ready = Boolean(built?.ready);
          cacheHandle = handle;
          readiness = handle.value.ready ? PrepReadiness.ready : PrepReadiness.failed;
          return { ok: handle.value.ready, handle, generation: gen, readiness };
        } catch (error) {
          handle.release();
          readiness = PrepReadiness.failed;
          preparePromise = null;
          throw error;
        }
      })();

      return preparePromise;
    },

    activate() {
      if (readiness !== PrepReadiness.ready && readiness !== PrepReadiness.suspended) {
        return { ok: false, reason: 'not_ready', readiness };
      }
      readiness = PrepReadiness.active;
      return { ok: true, handle: cacheHandle };
    },

    suspend() {
      if (readiness === PrepReadiness.active || readiness === PrepReadiness.ready) {
        readiness = PrepReadiness.suspended;
      }
      return { ok: true, readiness };
    },

    retainHost(hostRef, { ready = true } = {}) {
      if (!hostRef) return { ok: false, reason: 'no_host' };
      if (!cacheHandle) {
        cacheHandle = cache.acquire(ownerToken, `${cacheKey}:${resourceGeneration}`, () => ({
          generation: resourceGeneration,
          host: hostRef,
          ready,
          disposed: false,
        }));
      } else {
        cacheHandle.value.host = hostRef;
        cacheHandle.value.ready = ready;
        cacheHandle.value.disposed = false;
      }
      readiness = PrepReadiness.suspended;
      return { ok: true, readiness };
    },

    getRetainedHost() {
      const slot = cacheHandle?.value;
      if (!slot || slot.disposed || !slot.host) return null;
      return slot;
    },

    releaseRetainedHost() {
      const slot = cacheHandle?.value;
      if (slot?.host && typeof slot.host.dispose === 'function') {
        try { slot.host.dispose(); } catch { /* best effort */ }
      }
      if (slot) {
        slot.host = null;
        slot.disposed = true;
      }
      releaseCacheHandle();
      preparePromise = null;
      readiness = PrepReadiness.unloaded;
      return { ok: true };
    },

    quarantine(reason = 'compile-timeout') {
      quarantined = true;
      return { ok: true, reason };
    },

    clearQuarantine() {
      quarantined = false;
    },

    get prepLeadSeconds() {
      if (!prepStartedAt) return 0;
      return Math.max(0, (Date.now() - prepStartedAt) / 1000);
    },

    invalidate(reason = 'invalidated') {
      bumpGeneration();
      preparePromise = null;
      return { generation: resourceGeneration, reason };
    },

    dispose() {
      const slot = cacheHandle?.value;
      if (slot?.host && typeof slot.host.dispose === 'function') {
        try { slot.host.dispose(); } catch { /* best effort */ }
      }
      if (slot) {
        slot.host = null;
        slot.disposed = true;
      }
      releaseCacheHandle();
      preparePromise = null;
      bumpGeneration();
      prefetchPromise = null;
      prefetchedModule = null;
      ownerToken = { id: 'downhill-prep', generation: placeGeneration };
      quarantined = false;
      prepStartedAt = 0;
      readiness = PrepReadiness.unloaded;
    },
  };
}

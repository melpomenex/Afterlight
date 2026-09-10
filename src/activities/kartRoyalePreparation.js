/**
 * Kart Royale preparation handle (fix-kart-royale-instant-entry D2).
 *
 * Owns prefetch/prepare single-flight promises and stores a disposable cache
 * handle (never a bare Promise) via `createResourceCache`.
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
export function createKartRoyalePreparation({
  cache,
  cacheKey = 'kart-royale:prepared-runtime',
  placeGeneration = 0,
} = {}) {
  if (!cache) throw new Error('kart preparation requires a resource cache');

  let readiness = PrepReadiness.unloaded;
  let resourceGeneration = 0;
  let prefetchPromise = null;
  let preparePromise = null;
  let prefetchedModule = null;
  let ownerToken = { id: 'kart-prep', generation: placeGeneration };
  /** @type {{ release: () => void, value: object } | null} */
  let cacheHandle = null;

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
    if (readiness !== PrepReadiness.active) {
      readiness = PrepReadiness.unloaded;
    }
    return resourceGeneration;
  }

  return {
    get readiness() {
      return readiness;
    },

    get resourceGeneration() {
      return resourceGeneration;
    },

    get prefetched() {
      return prefetchedModule != null;
    },

    get handle() {
      return cacheHandle;
    },

    async prefetch({ signal = null } = {}) {
      if (signal?.aborted) return { ok: false, reason: 'aborted' };
      if (prefetchedModule) return { ok: true, shared: true };
      if (prefetchPromise) return prefetchPromise;

      readiness = PrepReadiness.prefetching;
      prefetchPromise = import('./kart-royale/controller.js')
        .then((mod) => {
          if (signal?.aborted) throw new Error('aborted');
          prefetchedModule = mod;
          readiness = readiness === PrepReadiness.failed
            ? PrepReadiness.failed
            : PrepReadiness.prefetched;
          return { ok: true, shared: false };
        })
        .catch((err) => {
          readiness = PrepReadiness.failed;
          prefetchPromise = null;
          throw err;
        });
      return prefetchPromise;
    },

    /**
     * @param {{ signal?: AbortSignal, factory?: (ctx: { signal?: AbortSignal, generation: number }) => Promise<{ host?: unknown, ready?: boolean }> }} [options]
     */
    async prepare({ signal = null, factory = null } = {}) {
      if (typeof factory !== 'function') return { ok: false, reason: 'no_factory' };
      if (signal?.aborted) return { ok: false, reason: 'aborted' };

      const gen = resourceGeneration;
      if (preparePromise) return preparePromise;

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
          return {
            ok: handle.value.ready,
            handle,
            generation: gen,
            readiness,
          };
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
      if (readiness === PrepReadiness.active) {
        readiness = PrepReadiness.suspended;
      }
      return { ok: true, readiness };
    },

    invalidate(reason = 'invalidated') {
      bumpGeneration();
      preparePromise = null;
      return { generation: resourceGeneration, reason };
    },

    dispose() {
      bumpGeneration();
      prefetchPromise = null;
      prefetchedModule = null;
      ownerToken = { id: 'kart-prep', generation: placeGeneration };
      readiness = PrepReadiness.unloaded;
    },
  };
}

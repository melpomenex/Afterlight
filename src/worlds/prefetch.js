/**
 * Destination & Activity Intent Prefetch Coordinator (introduce-global-world-system D6, Task 6.5).
 *
 * Coordinates low-priority background prefetching of optional World cosmetic assets
 * and profiles when player intent is signaled (e.g. place selector hover/focus,
 * proximity to arcade cabinets).
 *
 * Guarantees:
 *   - NO additional requestAnimationFrame: driven by host frame budget or graphicsJobs.drain().
 *   - NO wait on optional cosmetics: travel and entry proceed immediately without awaiting.
 *   - Deduplicated requests: identical intents/assets share in-flight promises without duplicates.
 *   - NO GPU jobs outside current owner's safe transaction: graphics jobs respect graphicsJobs.isBlocked().
 */

import { resolveWorldPresentation } from './resolver.js';
import { getWorldAssetDefinition, getDefaultResourceCache } from './assets.js';

/**
 * Creates a destination prefetch coordinator.
 *
 * @param {object} params
 * @param {object} [params.cache] Shared ResourceCache instance
 * @param {object} [params.graphicsJobs] Graphics job queue for GPU operations
 * @param {() => { worldId: string, variantId?: string }} params.getWorldSelection Active world selection getter
 * @param {(params: object) => object} [params.resolvePresentation=resolveWorldPresentation]
 * @param {(assetId: string, asset: any) => void} [params.onAssetLoaded]
 * @returns {object} Prefetch coordinator
 */
export function createDestinationPrefetchScheduler({
  cache = getDefaultResourceCache(),
  graphicsJobs = null,
  getWorldSelection,
  resolvePresentation = resolveWorldPresentation,
  onAssetLoaded = null,
} = {}) {
  if (!cache || typeof cache.acquire !== 'function') {
    throw new Error('createDestinationPrefetchScheduler requires a valid ResourceCache');
  }
  if (typeof getWorldSelection !== 'function') {
    throw new Error('createDestinationPrefetchScheduler requires a getWorldSelection function');
  }

  const OWNER_ID = 'world-prefetch-scheduler';
  const inFlightKeys = new Set();
  let lastIntent = null;

  /**
   * Declares intent to visit a place or enter an activity.
   * Resolves optional World assets and schedules deduplicated background prefetching.
   *
   * NEVER blocks: returns immediate status synchronously.
   *
   * @param {object} intent
   * @param {string} [intent.placeId] Target place ID (e.g. 'theater', 'courtyard')
   * @param {string} [intent.activityType] Target activity type (e.g. 'kart-royale')
   * @param {'low'|'medium'|'high'|'ultra'} [intent.tier='high']
   * @returns {{ ok: boolean, viewId: string, assetIds: string[], scheduled: number, deduplicated: number }}
   */
  function declareIntent({ placeId = null, activityType = null, tier = 'high' } = {}) {
    const viewId = placeId ? `place:${placeId}` : activityType ? `activity:${activityType}` : null;
    if (!viewId) {
      return { ok: false, viewId: null, assetIds: [], scheduled: 0, deduplicated: 0 };
    }

    const selection = getWorldSelection();
    lastIntent = { viewId, selection, tier, timestamp: Date.now() };

    const plan = resolvePresentation({
      selection,
      viewId,
      quality: tier,
    });

    const assetIds = plan?.assetIds ?? [];
    let scheduled = 0;
    let deduplicated = 0;

    for (const assetId of assetIds) {
      const def = getWorldAssetDefinition(assetId);
      if (!def) continue;

      const cacheKey = `world-asset:${assetId}:${tier}:${def.revision}`;

      // Check if already loaded in cache or already in-flight
      if (cache.get(cacheKey) != null || inFlightKeys.has(cacheKey)) {
        deduplicated += 1;
        continue;
      }

      inFlightKeys.add(cacheKey);
      scheduled += 1;

      // Acquire asset through cache (deduplicated pending promise)
      try {
        const handle = cache.acquire(
          OWNER_ID,
          cacheKey,
          () => {
            const raw = def.create({ tier });
            return raw;
          },
        );

        // If asset has a promise, await settlement
        if (handle.promise) {
          handle.promise
            .then((val) => {
              inFlightKeys.delete(cacheKey);
              if (onAssetLoaded) onAssetLoaded(assetId, val);
              scheduleGpuWarming(assetId, val, tier);
            })
            .catch(() => {
              inFlightKeys.delete(cacheKey);
            });
        } else {
          inFlightKeys.delete(cacheKey);
          if (onAssetLoaded) onAssetLoaded(assetId, handle.value);
          scheduleGpuWarming(assetId, handle.value, tier);
        }
      } catch (err) {
        inFlightKeys.delete(cacheKey);
        console.warn(`[PrefetchScheduler] Failed to prefetch "${assetId}":`, err);
      }
    }

    return {
      ok: true,
      viewId,
      assetIds,
      scheduled,
      deduplicated,
    };
  }

  /**
   * Submits low-priority GPU warming job through graphicsJobs if available.
   * GraphicsJobs ensures no GPU jobs run while another activity is leased (isBlocked).
   */
  function scheduleGpuWarming(assetId, resource, tier) {
    if (!graphicsJobs || typeof graphicsJobs.schedule !== 'function') return;

    graphicsJobs.schedule({
      id: `prefetch-gpu:${assetId}:${tier}`,
      priority: -10, // Low priority background task
      run: ({ renderer }) => {
        if (!renderer) return;
        // Warm/compile resource if applicable
        if (resource?.isBufferGeometry && renderer.renderLists) {
          // Geometry buffer warming is handled by renderer internally on draw
        }
        if (resource?.isTexture && renderer.initTexture) {
          try {
            renderer.initTexture(resource);
          } catch {}
        }
      },
    });
  }

  /**
   * Resets and releases any handles held directly by the prefetch coordinator.
   */
  function dispose() {
    inFlightKeys.clear();
    lastIntent = null;
    cache.disposeOwner(OWNER_ID);
  }

  return {
    declareIntent,
    dispose,
    get lastIntent() {
      return lastIntent;
    },
    get inFlightCount() {
      return inFlightKeys.size;
    },
    isPrefetched(assetId, tier = 'high') {
      const def = getWorldAssetDefinition(assetId);
      if (!def) return false;
      const cacheKey = `world-asset:${assetId}:${tier}:${def.revision}`;
      return cache.get(cacheKey) != null;
    },
  };
}

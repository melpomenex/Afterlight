/**
 * World Presentation Host Lifecycle & Anchor/Exclusion Contract (introduce-global-world-system D3, D4, Task 3.3).
 *
 * Owns the cosmetic root group, enforces generation fencing,
 * rejects decorative props overlapping protected gameplay/navigation clearance,
 * and guarantees idempotent teardown without gameplay state mutation.
 */

import * as THREE from 'three';
import { disposeLocalGroup } from './assets.js';

/**
 * Checks whether a bounding box intersects an exclusion volume.
 * @param {object} box
 * @param {object} exclusion
 * @param {number} [margin=0]
 * @returns {boolean}
 */
export function intersectsExclusion(box, exclusion, margin = 0) {
  const bMinX = (box.minX !== undefined ? box.minX : (box.x - (box.w ?? 0) / 2)) - margin;
  const bMaxX = (box.maxX !== undefined ? box.maxX : (box.x + (box.w ?? 0) / 2)) + margin;
  const bMinZ = (box.minZ !== undefined ? box.minZ : (box.z - (box.d ?? 0) / 2)) - margin;
  const bMaxZ = (box.maxZ !== undefined ? box.maxZ : (box.z + (box.d ?? 0) / 2)) + margin;

  const eMinX = exclusion.minX !== undefined ? exclusion.minX : (exclusion.x - (exclusion.w ?? 0) / 2);
  const eMaxX = exclusion.maxX !== undefined ? exclusion.maxX : (exclusion.x + (exclusion.w ?? 0) / 2);
  const eMinZ = exclusion.minZ !== undefined ? exclusion.minZ : (exclusion.z - (exclusion.d ?? 0) / 2);
  const eMaxZ = exclusion.maxZ !== undefined ? exclusion.maxZ : (exclusion.z + (exclusion.d ?? 0) / 2);

  const overlapX = bMinX <= eMaxX && bMaxX >= eMinX;
  const overlapZ = bMinZ <= eMaxZ && bMaxZ >= eMinZ;

  if (!overlapX || !overlapZ) return false;

  if (box.minY !== undefined && box.maxY !== undefined && exclusion.minY !== undefined && exclusion.maxY !== undefined) {
    return box.minY <= exclusion.maxY && box.maxY >= exclusion.minY;
  }

  return true;
}

/**
 * Creates a presentation host for a place world or activity view.
 *
 * @param {object} params
 * @param {THREE.Group} params.containerGroup Parent group to attach cosmetic root to
 * @param {string} params.viewId View identifier ('place:<id>' or 'activity:<type>')
 * @param {Array<object>} [params.exclusions=[]] Protected volumes (spawns, seats, routes, tables)
 * @param {object} [params.anchors={}] Named anchors for regional prop placement
 * @param {(atmospherePlan: object|null) => void} [params.applyAtmosphere]
 * @param {(audioProfile: string|null) => void} [params.applyAudio]
 * @returns {object} Presentation host controller
 */
export function createWorldPresentationHost({
  containerGroup,
  viewId,
  exclusions = [],
  anchors = {},
  applyAtmosphere = null,
  applyAudio = null,
} = {}) {
  let activeGeneration = 1;
  let requestCounter = 0;
  let latestCommittedRequest = 0;
  let currentPlan = null;
  let currentCosmeticRoot = null;
  let disposed = false;
  let pendingLoadsCount = 0;
  let lastFailure = null;
  let lastAttempt = null;
  let fallbackStatus = null;

  // Freeze exclusions to guarantee immutability
  const frozenExclusions = Object.freeze(
    exclusions.map((e) => Object.freeze({ ...e })),
  );

  // Freeze anchors
  const frozenAnchors = Object.freeze({ ...anchors });

  /**
   * Tests whether a prop can be placed without violating protected clearances.
   * @param {object} box { minX, maxX, minZ, maxZ } or { x, z, w, d }
   * @param {number} [margin=0.38] Actor near-plane / approach clearance
   * @returns {{ allowed: boolean, conflictingExclusion: object | null }}
   */
  function canPlaceProp(box, margin = 0.38) {
    if (!box) return { allowed: false, conflictingExclusion: null };
    for (const excl of frozenExclusions) {
      if (intersectsExclusion(box, excl, margin)) {
        return { allowed: false, conflictingExclusion: excl };
      }
    }
    return { allowed: true, conflictingExclusion: null };
  }

  /**
   * Mounts a resolved presentation plan onto the host.
   *
   * @param {object} params
   * @param {object} params.plan Resolved presentation plan
   * @param {number} params.generation Activation generation fence
   * @param {number} [params.worldRevision] Selection revision
   * @param {(ctx: { stagingGroup: THREE.Group, canPlaceProp: Function, anchors: object }) => Promise<void>|void} [params.buildCosmetics]
   * @returns {Promise<boolean>} True if mounted, false if discarded due to generation mismatch or error
   */
  async function mountPresentation({ plan, generation, worldRevision = null, buildCosmetics = null }) {
    requestCounter += 1;
    const requestId = requestCounter;
    lastAttempt = { plan, generation, worldRevision, buildCosmetics };

    if (disposed || generation !== activeGeneration) {
      return false;
    }

    pendingLoadsCount += 1;
    let stagingGroup = null;

    try {
      if (typeof buildCosmetics === 'function') {
        stagingGroup = new THREE.Group();
        stagingGroup.name = `world-cosmetics-${plan.worldId}-${plan.variantId}`;
        await buildCosmetics({
          stagingGroup,
          canPlaceProp,
          anchors: frozenAnchors,
        });
      }

      // Generation fence check after async build
      if (disposed || generation !== activeGeneration) {
        if (stagingGroup) {
          disposeLocalGroup(stagingGroup);
        }
        pendingLoadsCount -= 1;
        return false;
      }

      // Out-of-order completion check (latest request wins)
      if (requestId < latestCommittedRequest) {
        if (stagingGroup) {
          disposeLocalGroup(stagingGroup);
        }
        pendingLoadsCount -= 1;
        return false;
      }

      // Apply atmosphere and audio setters
      if (applyAtmosphere) {
        applyAtmosphere(plan.atmosphere);
      }
      if (applyAudio) {
        applyAudio(plan.audioProfile);
      }

      // Swap cosmetic root atomically at frame boundary
      if (currentCosmeticRoot && containerGroup) {
        containerGroup.remove(currentCosmeticRoot);
        disposeLocalGroup(currentCosmeticRoot);
        currentCosmeticRoot = null;
      }

      if (stagingGroup && containerGroup) {
        containerGroup.add(stagingGroup);
        currentCosmeticRoot = stagingGroup;
      }

      currentPlan = plan;
      latestCommittedRequest = requestId;
      fallbackStatus = null;
      lastFailure = null;
      pendingLoadsCount -= 1;
      return true;
    } catch (err) {
      console.error(`[world-host:${viewId}] cosmetic build error:`, err);
      if (stagingGroup) {
        disposeLocalGroup(stagingGroup);
      }
      lastFailure = {
        plan,
        error: err,
        failedAt: Date.now(),
        generation,
        requestId,
      };
      fallbackStatus = {
        inFallback: true,
        level: currentCosmeticRoot ? 'retained_scene' : 'native',
        reason: 'cosmetic_build_failed',
        attemptedPlan: plan,
        error: err?.message || String(err),
      };
      pendingLoadsCount -= 1;
      return false;
    }
  }

  /**
   * Explicit retry of the last attempted plan.
   * @returns {Promise<boolean>}
   */
  async function retry() {
    if (!lastAttempt || disposed) return false;
    return mountPresentation({
      plan: lastAttempt.plan,
      generation: activeGeneration,
      worldRevision: lastAttempt.worldRevision,
      buildCosmetics: lastAttempt.buildCosmetics,
    });
  }

  /**
   * Idempotent teardown of the host.
   */
  function teardown() {
    activeGeneration += 1;
    requestCounter += 1;
    pendingLoadsCount = 0;
    if (currentCosmeticRoot && containerGroup) {
      containerGroup.remove(currentCosmeticRoot);
      disposeLocalGroup(currentCosmeticRoot);
      currentCosmeticRoot = null;
    }
    if (applyAtmosphere) {
      try { applyAtmosphere(null); } catch {}
    }
    if (applyAudio) {
      try { applyAudio(null); } catch {}
    }
    currentPlan = null;
    fallbackStatus = null;
    lastFailure = null;
    disposed = true;
  }

  return Object.freeze({
    get viewId() {
      return viewId;
    },
    get activeGeneration() {
      return activeGeneration;
    },
    get currentPlan() {
      return currentPlan;
    },
    get currentRoot() {
      return currentCosmeticRoot;
    },
    get isAttached() {
      return currentCosmeticRoot !== null;
    },
    get exclusions() {
      return frozenExclusions;
    },
    get anchors() {
      return frozenAnchors;
    },
    get lastFailure() {
      return lastFailure;
    },
    get fallbackStatus() {
      return fallbackStatus;
    },
    get hasPendingLoad() {
      return pendingLoadsCount > 0;
    },

    nextGeneration() {
      activeGeneration += 1;
      requestCounter += 1;
      return activeGeneration;
    },

    canPlaceProp,
    mountPresentation,
    retry,
    teardown,
  });
}

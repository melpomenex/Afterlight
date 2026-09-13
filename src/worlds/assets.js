/**
 * Shared World Assets Catalog, Allocation Metadata, and Borrowed-Resource Ledger
 * (introduce-global-world-system D3, D6, D8, Task 6.3).
 *
 * Maps logical kit asset IDs to procedural factories, estimated allocation metadata
 * (revision, tier, estimated CPU/GPU bytes, disposer), and provides safe ledger
 * conventions ensuring borrowed geometry/textures are released exclusively through
 * cache handles and never disposed by local scene/group traversal.
 */

import * as THREE from 'three';
import { createResourceCache } from '../activities/resourceCache.js';

let sharedResourceCache = null;

export function getDefaultResourceCache() {
  if (!sharedResourceCache) {
    sharedResourceCache = createResourceCache();
  }
  return sharedResourceCache;
}

export function resetDefaultResourceCache() {
  if (sharedResourceCache) {
    sharedResourceCache.evictIdle();
    sharedResourceCache = null;
  }
}

/** WeakSet of resources currently borrowed from the shared cache */
const BORROWED_RESOURCES = new WeakSet();

/**
 * Marks a Three.js resource (geometry, material, texture) as borrowed from cache.
 * @template T
 * @param {T} resource
 * @returns {T}
 */
export function markBorrowedResource(resource) {
  if (resource && (typeof resource === 'object' || typeof resource === 'function')) {
    BORROWED_RESOURCES.add(resource);
    resource._isBorrowedAsset = true;
  }
  return resource;
}

/**
 * Checks whether a Three.js resource is borrowed from cache.
 * @param {any} resource
 * @returns {boolean}
 */
export function isBorrowedResource(resource) {
  if (!resource) return false;
  return BORROWED_RESOURCES.has(resource) || resource._isBorrowedAsset === true;
}

/**
 * Estimated memory sizes per asset kind (conservative estimates in bytes).
 */
const ESTIMATED_SIZES = {
  mesh_sm: { cpu: 24_000, gpu: 48_000 },
  mesh_md: { cpu: 64_000, gpu: 128_000 },
  mesh_lg: { cpu: 140_000, gpu: 280_000 },
  texture_512: { cpu: 1_048_576, gpu: 1_398_101 }, // 512x512 RGBA8 + mipmaps
  texture_256: { cpu: 262_144, gpu: 349_525 },   // 256x256 RGBA8 + mipmaps
  material_pbr: { cpu: 4_096, gpu: 16_384 },
};

/**
 * Canonical logical asset definitions for all 18 declared environment kits.
 */
export const WORLD_ASSET_DEFINITIONS = Object.freeze({
  // 1. Coastal Dusk Kits
  'kit:coastal-rocks': Object.freeze({
    id: 'kit:coastal-rocks',
    name: 'Coastal Sea Rocks & Stacks',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_lg,
    create: () => new THREE.DodecahedronGeometry(2.5, 1),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:coastal-water': Object.freeze({
    id: 'kit:coastal-water',
    name: 'Coastal Water Surface Plane',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_md,
    create: () => new THREE.PlaneGeometry(80, 80, 16, 16),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:coastal-vegetation': Object.freeze({
    id: 'kit:coastal-vegetation',
    name: 'Coastal Dune Grass & Shrubs',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_sm,
    create: () => new THREE.ConeGeometry(0.4, 1.2, 4),
    dispose: (geo) => geo.dispose(),
  }),

  // 2. Rainforest Kits
  'kit:rainforest-trees': Object.freeze({
    id: 'kit:rainforest-trees',
    name: 'Rainforest Canopy Trunks & Buttress Roots',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_lg,
    create: () => new THREE.CylinderGeometry(0.8, 1.4, 12, 8),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:rainforest-vegetation': Object.freeze({
    id: 'kit:rainforest-vegetation',
    name: 'Rainforest Broadleaf Ferns & Palms',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_md,
    create: () => new THREE.PlaneGeometry(1.5, 2.5, 3, 3),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:rainforest-mist': Object.freeze({
    id: 'kit:rainforest-mist',
    name: 'Rainforest Low Mist Volume',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_sm,
    create: () => new THREE.PlaneGeometry(24, 12, 4, 2),
    dispose: (geo) => geo.dispose(),
  }),

  // 3. Alpine Snow Kits
  'kit:alpine-conifers': Object.freeze({
    id: 'kit:alpine-conifers',
    name: 'Alpine Pine Conifers',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_lg,
    create: () => new THREE.ConeGeometry(1.6, 6.0, 6),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:alpine-rocks': Object.freeze({
    id: 'kit:alpine-rocks',
    name: 'Alpine Crags & Scree',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_md,
    create: () => new THREE.DodecahedronGeometry(2.0, 0),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:alpine-snow': Object.freeze({
    id: 'kit:alpine-snow',
    name: 'Alpine Snow Drifts',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_sm,
    create: () => new THREE.PlaneGeometry(12, 12, 6, 6),
    dispose: (geo) => geo.dispose(),
  }),

  // 4. Desert Mesa Kits
  'kit:desert-mesas': Object.freeze({
    id: 'kit:desert-mesas',
    name: 'Desert Red Sandstone Mesas',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_lg,
    create: () => new THREE.CylinderGeometry(5.0, 6.5, 8.0, 8),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:desert-palms': Object.freeze({
    id: 'kit:desert-palms',
    name: 'Desert Oasis Palms & Cacti',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_md,
    create: () => new THREE.CylinderGeometry(0.3, 0.4, 4.0, 6),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:desert-sand': Object.freeze({
    id: 'kit:desert-sand',
    name: 'Desert Dunes & Ripples',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_sm,
    create: () => new THREE.PlaneGeometry(40, 40, 8, 8),
    dispose: (geo) => geo.dispose(),
  }),

  // 5. Redwood Cathedral Kits
  'kit:redwood-trunks': Object.freeze({
    id: 'kit:redwood-trunks',
    name: 'Redwood Giant Trunks',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_lg,
    create: () => new THREE.CylinderGeometry(2.2, 3.2, 28.0, 10),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:redwood-ferns': Object.freeze({
    id: 'kit:redwood-ferns',
    name: 'Redwood Forest Understory Ferns',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_sm,
    create: () => new THREE.PlaneGeometry(1.2, 1.8, 2, 2),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:redwood-moss': Object.freeze({
    id: 'kit:redwood-moss',
    name: 'Redwood Fallen Logs & Moss Carpets',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_md,
    create: () => new THREE.CylinderGeometry(0.6, 0.7, 8.0, 6),
    dispose: (geo) => geo.dispose(),
  }),

  // 6. Cloud Isles Kits
  'kit:cloud-islands': Object.freeze({
    id: 'kit:cloud-islands',
    name: 'Cloud Floating Isles & Keystone Rocks',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_lg,
    create: () => new THREE.DodecahedronGeometry(3.5, 1),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:cloud-sea': Object.freeze({
    id: 'kit:cloud-sea',
    name: 'Cloud Sea Cumulus Banks',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_md,
    create: () => new THREE.PlaneGeometry(60, 60, 12, 12),
    dispose: (geo) => geo.dispose(),
  }),
  'kit:cloud-flora': Object.freeze({
    id: 'kit:cloud-flora',
    name: 'Cloud Island Pastel Flora & Spores',
    revision: 1,
    kind: 'geometry',
    tier: 'high',
    url: null,
    estimatedBytes: ESTIMATED_SIZES.mesh_sm,
    create: () => new THREE.SphereGeometry(0.3, 5, 4),
    dispose: (geo) => geo.dispose(),
  }),
});

/**
 * Returns definition for a logical asset ID.
 * @param {string} assetId
 * @returns {object|null}
 */
export function getWorldAssetDefinition(assetId) {
  return WORLD_ASSET_DEFINITIONS[assetId] ?? null;
}

/**
 * Returns all logical asset definitions as an array.
 * @returns {Array<object>}
 */
export function listWorldAssetDefinitions() {
  return Object.values(WORLD_ASSET_DEFINITIONS);
}

/**
 * Calculates labeled CPU and GPU byte estimates for a list of logical asset IDs.
 * @param {Array<string>} [assetIds]
 * @returns {{ cpu: number, gpu: number, total: number }}
 */
export function estimateWorldAssetBytes(assetIds) {
  let cpu = 0;
  let gpu = 0;
  for (const id of assetIds || []) {
    const def = WORLD_ASSET_DEFINITIONS[id];
    if (def?.estimatedBytes) {
      cpu += def.estimatedBytes.cpu || 0;
      gpu += def.estimatedBytes.gpu || 0;
    }
  }
  return { cpu, gpu, total: cpu + gpu };
}

/**
 * Safely disposes a local Three.js group, ensuring borrowed geometries and materials
 * are never disposed by group traversal.
 *
 * @param {THREE.Object3D} root
 * @param {object} [options]
 * @param {(resource: any) => boolean} [options.isBorrowed=isBorrowedResource]
 */
export function disposeLocalGroup(root, { isBorrowed = isBorrowedResource } = {}) {
  if (!root) return;

  root.traverse((obj) => {
    if (obj.geometry) {
      if (!isBorrowed(obj.geometry)) {
        try {
          obj.geometry.dispose();
        } catch {}
      }
    }

    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if (!mat) continue;
        if (!isBorrowed(mat)) {
          // Dispose owned textures attached to material
          for (const key of Object.keys(mat)) {
            const prop = mat[key];
            if (prop && prop.isTexture && !isBorrowed(prop)) {
              try {
                prop.dispose();
              } catch {}
            }
          }
          try {
            mat.dispose();
          } catch {}
        }
      }
    }
  });

  if (typeof root.clear === 'function') {
    root.clear();
  }
}

/**
 * Creates a borrowed-safe asset ledger for a world presentation host or environment kit.
 *
 * Distinguishes:
 *   - Borrowed resources: held via ResourceCache handles; released on disposeAll, NEVER disposed directly.
 *   - Owned resources: local geometries/materials created for this instance; disposed on disposeAll.
 *
 * @param {object} params
 * @param {object} params.cache ResourceCache instance
 * @param {string} params.owner Unique owner/view identifier
 * @param {string} [params.contextId=null] Context identifier for GPU invalidation
 * @returns {object} Ledger controller
 */
export function createWorldAssetLedger({ cache, owner, contextId = null } = {}) {
  if (!cache || typeof cache.acquire !== 'function') {
    throw new Error('createWorldAssetLedger requires a valid ResourceCache');
  }
  if (!owner) {
    throw new Error('createWorldAssetLedger requires an owner identifier');
  }

  // Handle map: assetId -> handle
  const handles = new Map();
  // Owned local resources that must be disposed directly
  const ownedResources = new Set();

  /**
   * Borrows a shared asset from the cache by logical ID.
   * @param {string} assetId
   * @param {object} [options]
   * @param {'low'|'medium'|'high'|'ultra'} [options.tier='high']
   * @returns {any} The borrowed Three.js resource
   */
  function borrow(assetId, { tier = 'high' } = {}) {
    const def = getWorldAssetDefinition(assetId);
    if (!def) {
      throw new Error(`[WorldAssets] Unknown asset ID: "${assetId}"`);
    }

    const cacheKey = `world-asset:${assetId}:${tier}:${def.revision}`;
    const handle = cache.acquire(
      owner,
      cacheKey,
      () => {
        const raw = def.create({ tier });
        markBorrowedResource(raw);
        return raw;
      },
      { contextId },
    );

    markBorrowedResource(handle.value);
    handles.set(assetId, handle);
    return handle.value;
  }

  /**
   * Tracks a locally-owned resource for explicit disposal on teardown.
   * @template T
   * @param {T} resource
   * @returns {T}
   */
  function trackOwned(resource) {
    if (resource && typeof resource.dispose === 'function') {
      ownedResources.add(resource);
    }
    return resource;
  }

  /**
   * Releases a specific borrowed asset handle.
   * @param {string} assetId
   * @returns {boolean}
   */
  function releaseBorrowed(assetId) {
    const handle = handles.get(assetId);
    if (!handle) return false;
    handle.release();
    handles.delete(assetId);
    return true;
  }

  /**
   * Releases all borrowed handles and disposes all owned resources.
   */
  function disposeAll() {
    // 1. Release borrowed cache handles (never call .dispose() on their values directly)
    for (const [_id, handle] of handles) {
      try {
        handle.release();
      } catch (err) {
        console.warn('[WorldAssets] handle release failed:', err);
      }
    }
    handles.clear();

    // 2. Dispose owned resources
    for (const res of ownedResources) {
      try {
        res.dispose();
      } catch {}
    }
    ownedResources.clear();
  }

  return {
    borrow,
    trackOwned,
    releaseBorrowed,
    disposeAll,
    get borrowedCount() {
      return handles.size;
    },
    get ownedCount() {
      return ownedResources.size;
    },
    getHandle(assetId) {
      return handles.get(assetId) ?? null;
    },
  };
}

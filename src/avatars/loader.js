/**
 * Avatar GLB Loader & Template Cache.
 *
 * Implements the arcade cabinet template pattern (AGENTS.md §3 / design D4):
 *   - Fetch and parse each authored avatar GLB ONCE per session.
 *   - Deduplicate concurrent in-flight fetches for the same avatar id.
 *   - Retry failed fetches once before marking as unavailable.
 *   - Validate node hierarchy against the rig contract by name.
 *   - Instantiate via scene graph clone, cloning materials ONLY for
 *     declared tintMaterials and FX_* materials (shared materials stay shared).
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getAvatarDefinition, normalizeAvatarId } from '../../shared/avatarDefinitions.js';

const DEV = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

export const CONTRACT_NODES_HUMANOID = Object.freeze([
  'AL_Rig',
  'AL_Root',
  'AL_Head',
  'AL_Arm_L',
  'AL_Arm_R',
  'AL_Leg_L',
  'AL_Leg_R',
]);

export const CONTRACT_NODES_FLOATING = Object.freeze([
  'AL_Rig',
  'AL_Root',
  'AL_Head',
]);

export function getContractNodes(rigKind = 'humanoid') {
  if (rigKind === 'floating') return CONTRACT_NODES_FLOATING;
  return CONTRACT_NODES_HUMANOID;
}

export function getRequiredNodes(rigKind = 'humanoid') {
  if (rigKind === 'floating') return CONTRACT_NODES_FLOATING;
  return CONTRACT_NODES_HUMANOID;
}

/**
 * Validates that an avatar scene satisfies the contract node requirements.
 *
 * @param {THREE.Object3D} scene
 * @param {object} definition
 * @returns {{ valid: boolean, degraded: boolean, missingNodes: string[], nodes: Record<string, THREE.Object3D> }}
 */
export function validateAvatarScene(scene, definition = {}) {
  const rigKind = definition.rig || 'humanoid';
  const required = getRequiredNodes(rigKind);
  const contract = getContractNodes(rigKind);

  const foundNodes = {};
  const missingNodes = [];

  for (const name of contract) {
    const node = scene.getObjectByName(name);
    if (node) {
      foundNodes[name] = node;
    } else if (required.includes(name)) {
      missingNodes.push(name);
    }
  }

  // Check optional nodes if humanoid
  if (rigKind !== 'floating') {
    for (const req of required) {
      if (!foundNodes[req] && !missingNodes.includes(req)) {
        missingNodes.push(req);
      }
    }
  }

  const degraded = missingNodes.length > 0;
  return {
    valid: true,
    degraded,
    missingNodes,
    nodes: foundNodes,
  };
}

/**
 * Clones the template scene graph, cloning materials ONLY for tint/FX materials.
 *
 * @param {THREE.Object3D} templateScene
 * @param {object} definition
 * @returns {THREE.Object3D}
 */
export function cloneAvatarHierarchy(templateScene, definition = {}) {
  const clonedRoot = templateScene.clone(true);
  const tintMaterials = new Set(definition.tintMaterials || []);
  const clonedMaterialMap = new Map();

  clonedRoot.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const cloneIfEligible = (mat) => {
      if (!mat) return mat;
      const isTint = mat.name && tintMaterials.has(mat.name);
      const isFx = mat.name && mat.name.startsWith('FX_');
      if (isTint || isFx) {
        if (!clonedMaterialMap.has(mat)) {
          clonedMaterialMap.set(mat, mat.clone());
        }
        return clonedMaterialMap.get(mat);
      }
      return mat; // Unmodified materials stay shared
    };

    if (Array.isArray(child.material)) {
      child.material = child.material.map(cloneIfEligible);
    } else {
      child.material = cloneIfEligible(child.material);
    }
  });

  return clonedRoot;
}

export const MANNEQUIN_DEFINITION = Object.freeze({
  id: 'mannequin',
  name: 'Test Mannequin',
  assetPath: 'avatars/_test/mannequin.glb',
  rig: 'humanoid',
  scale: 1.0,
  nameplateY: 2.3,
  tintMaterials: ['MAT_Accent'],
  effect: null,
  rarity: 'common',
  weight: 0,
  tags: ['test'],
});

export function resolveAvatarDefinition(id) {
  if (id === 'mannequin') return MANNEQUIN_DEFINITION;
  const normId = normalizeAvatarId(id);
  return normId ? getAvatarDefinition(normId) : null;
}

export class AvatarLoader {
  constructor({ baseUrl = '/', fetchFn = null, loaderFn = null } = {}) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    this.fetchFn = fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    this.loaderFn = loaderFn || null;
    this.templates = new Map(); // id -> templateRecord
    this.inFlight = new Map();  // id -> Promise<templateRecord>
    this.reportedDegradations = new Set();
  }

  /**
   * Register a pre-constructed template (useful in tests or synthetic scenes).
   */
  registerTemplate(id, rootScene, definition = null) {
    const normId = normalizeAvatarId(id);
    const def = definition || getAvatarDefinition(normId) || { id: normId, rig: 'humanoid' };
    const validation = validateAvatarScene(rootScene, def);

    const record = {
      id: normId,
      root: rootScene,
      definition: def,
      degraded: validation.degraded,
      missingNodes: validation.missingNodes,
      unavailable: false,
    };

    this.templates.set(normId, record);
    return record;
  }

  /**
   * Parse a GLTF ArrayBuffer into a scene graph.
   */
  async _parseBuffer(buffer) {
    if (this.loaderFn) {
      return this.loaderFn(buffer);
    }
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.parse(buffer, '', resolve, reject);
    });
  }

  /**
   * Fetch and parse an asset with 1 retry before failing.
   */
  async _fetchWithRetry(url) {
    if (!this.fetchFn) {
      throw new Error('fetchFn unavailable in this environment');
    }

    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await this.fetchFn(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} for ${url}`);
        }
        const buffer = await res.arrayBuffer();
        const gltf = await this._parseBuffer(buffer);
        const root = gltf.scene || gltf;
        return root;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  /**
   * Loads the template for an avatar id. Returns a template record.
   */
  async loadTemplate(id) {
    const normId = id === 'mannequin' ? 'mannequin' : normalizeAvatarId(id);
    if (!normId) {
      return { id: null, unavailable: true };
    }

    if (this.templates.has(normId)) {
      return this.templates.get(normId);
    }

    if (this.inFlight.has(normId)) {
      return this.inFlight.get(normId);
    }

    const definition = resolveAvatarDefinition(normId);
    if (!definition) {
      const record = { id: normId, unavailable: true, reason: 'unknown_avatar' };
      this.templates.set(normId, record);
      return record;
    }

    const fetchPromise = (async () => {
      const url = `${this.baseUrl}${definition.assetPath}`;
      try {
        const root = await this._fetchWithRetry(url);
        const validation = validateAvatarScene(root, definition);

        if (validation.degraded && !this.reportedDegradations.has(normId)) {
          this.reportedDegradations.add(normId);
          if (DEV) {
            console.warn(`[AvatarLoader] Avatar "${normId}" missing contract nodes: ${validation.missingNodes.join(', ')}`);
          }
        }

        const record = {
          id: normId,
          root,
          definition,
          degraded: validation.degraded,
          missingNodes: validation.missingNodes,
          unavailable: false,
        };

        this.templates.set(normId, record);
        return record;
      } catch (err) {
        const record = {
          id: normId,
          definition,
          unavailable: true,
          error: err,
        };
        this.templates.set(normId, record);
        return record;
      } finally {
        this.inFlight.delete(normId);
      }
    })();

    this.inFlight.set(normId, fetchPromise);
    return fetchPromise;
  }

  /**
   * Synchronously or asynchronously instantiate an avatar.
   * If the template is already loaded, returns the cloned instance immediately.
   * Otherwise returns null (callers can fall back to procedural and upgrade).
   */
  instantiate(id) {
    const normId = id === 'mannequin' ? 'mannequin' : normalizeAvatarId(id);
    const template = this.templates.get(normId);
    if (!template || template.unavailable || !template.root) {
      return null;
    }

    const scene = cloneAvatarHierarchy(template.root, template.definition);
    const rigKind = template.definition?.rig || 'humanoid';
    const contract = getContractNodes(rigKind);
    const nodes = {};

    for (const name of contract) {
      const node = scene.getObjectByName(name);
      if (node) nodes[name] = node;
    }

    return {
      scene,
      nodes,
      definition: template.definition,
      degraded: template.degraded,
      missingNodes: template.missingNodes,
    };
  }

  /**
   * Check if a template is already loaded and available.
   */
  isAvailable(id) {
    const normId = id === 'mannequin' ? 'mannequin' : normalizeAvatarId(id);
    const t = this.templates.get(normId);
    return Boolean(t && !t.unavailable && t.root);
  }

  /**
   * Check if a template is known to be unavailable.
   */
  isUnavailable(id) {
    const normId = id === 'mannequin' ? 'mannequin' : normalizeAvatarId(id);
    const t = this.templates.get(normId);
    return Boolean(t && t.unavailable);
  }

  clear() {
    this.templates.clear();
    this.inFlight.clear();
    this.reportedDegradations.clear();
  }
}

// Canonical singleton instance for client runtime
export const avatarLoader = new AvatarLoader({
  baseUrl: typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/',
});

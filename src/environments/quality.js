/**
 * Environment quality tiers and persistent World preferences (pure module: no
 * Three.js, no DOM). One additive storage key; unavailable storage yields
 * conservative session defaults, never a throw.
 *
 * Version 2 format: { version: 2, quality, worldId, variantId, environment, variant, ...unrelated }
 * Compatibility mirrors 'environment' and 'variant' are maintained for older readers.
 */

import {
  WORLD_IDS,
  getWorldDefinition,
} from '../../shared/worldDefinitions.js';

export const ENVIRONMENT_QUALITY_KEY = 'afterlight-environment-v1';
export const ENVIRONMENT_TIERS = Object.freeze(['low', 'medium', 'high', 'ultra']);
export const ENVIRONMENT_VARIANT_KEY = 'afterlight-theater-environment';

/** Per-tier budgets. Values are ceilings the builders may read; nothing in
 * this module can raise them. */
export const ENVIRONMENT_BUDGETS = Object.freeze({
  low: Object.freeze({
    terrainSegments: 72,
    terrainSize: 260,
    waterSegments: 48,
    openWaterSegments: 128,
    vegetationScale: 0.35,
    rockScale: 0.4,
    grassScale: 0.3,
    particleScale: 0.35,
    cloudLayers: 1,
    cloudPuffs: 5,
    birdCount: 4,
    shadowDetail: 0.5,
    shoreDetail: 0.5,
  }),
  medium: Object.freeze({
    terrainSegments: 112,
    terrainSize: 300,
    waterSegments: 72,
    openWaterSegments: 192,
    vegetationScale: 0.6,
    rockScale: 0.7,
    grassScale: 0.6,
    particleScale: 0.6,
    cloudLayers: 2,
    cloudPuffs: 9,
    birdCount: 7,
    shadowDetail: 0.75,
    shoreDetail: 0.75,
  }),
  high: Object.freeze({
    terrainSegments: 160,
    terrainSize: 340,
    waterSegments: 96,
    openWaterSegments: 288,
    vegetationScale: 1,
    rockScale: 1,
    grassScale: 1,
    particleScale: 1,
    cloudLayers: 3,
    cloudPuffs: 14,
    birdCount: 10,
    shadowDetail: 1,
    shoreDetail: 1,
  }),
  ultra: Object.freeze({
    terrainSegments: 208,
    terrainSize: 380,
    waterSegments: 128,
    openWaterSegments: 384,
    vegetationScale: 1.5,
    rockScale: 1.35,
    grassScale: 1.6,
    particleScale: 1.45,
    cloudLayers: 4,
    cloudPuffs: 20,
    birdCount: 14,
    shadowDetail: 1,
    shoreDetail: 1.25,
  }),
});

export function budgetForEnvironmentTier(tier) {
  return ENVIRONMENT_BUDGETS[ENVIRONMENT_TIERS.includes(tier) ? tier : 'high'];
}

/** Scale a requested count by the tier's family budget (always floors ≥ 1). */
export function scaleForTier(tier, family, requested) {
  const budget = budgetForEnvironmentTier(tier)[family];
  if (!Number.isFinite(budget)) return Math.max(1, Math.round(requested));
  return Math.max(1, Math.round(requested * budget));
}

/**
 * Device-derived default. Touch-first narrow devices start LOW; modest CPUs
 * start MEDIUM; everything else starts HIGH. ULTRA is only ever an explicit
 * user choice.
 */
export function defaultEnvironmentTier({
  hardwareConcurrency = 8,
  maxTouchPoints = 0,
  innerWidth = 1920,
  deviceMemory = 8,
} = {}) {
  const narrowTouch = maxTouchPoints > 0 && innerWidth < 900;
  if (narrowTouch || hardwareConcurrency <= 2 || deviceMemory <= 2) return 'low';
  if (hardwareConcurrency <= 4 || deviceMemory <= 4) return 'medium';
  return 'high';
}

function oneOf(value, allowed, fallback) {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

export function normalizeWorldPreferences(raw) {
  const result = { worldId: null, variantId: null };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;

  const isV2 = raw.version >= 2;
  if (isV2) {
    if (typeof raw.worldId === 'string' && WORLD_IDS.includes(raw.worldId)) {
      result.worldId = raw.worldId;
      const def = getWorldDefinition(raw.worldId);
      if (def) {
        if (typeof raw.variantId === 'string' && Object.prototype.hasOwnProperty.call(def.variants, raw.variantId)) {
          result.variantId = raw.variantId;
        } else {
          result.variantId = def.defaultVariant;
        }
      }
    }
    // A v2 record with an invalid World is repaired rather than allowing stale mirrors to override it
    return result;
  }

  // v1 / legacy format migration
  const candidateWorld = typeof raw.worldId === 'string' ? raw.worldId : (typeof raw.environment === 'string' ? raw.environment : null);
  if (candidateWorld && WORLD_IDS.includes(candidateWorld)) {
    result.worldId = candidateWorld;
    const def = getWorldDefinition(candidateWorld);
    if (def) {
      const candidateVariant = typeof raw.variantId === 'string' ? raw.variantId : (typeof raw.variant === 'string' ? raw.variant : null);
      if (candidateVariant && Object.prototype.hasOwnProperty.call(def.variants, candidateVariant)) {
        result.variantId = candidateVariant;
      } else {
        result.variantId = def.defaultVariant;
      }
    }
  }

  return result;
}

export function normalizeEnvironmentPreferences(raw) {
  const prefs = { quality: null, environment: null, variant: null, worldId: null, variantId: null };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return prefs;
  if (ENVIRONMENT_TIERS.includes(raw.quality)) prefs.quality = raw.quality;

  const worldPrefs = normalizeWorldPreferences(raw);
  if (worldPrefs.worldId) {
    prefs.worldId = worldPrefs.worldId;
    prefs.variantId = worldPrefs.variantId;
    prefs.environment = worldPrefs.worldId;
    prefs.variant = worldPrefs.variantId;
  }
  return prefs;
}

export function loadEnvironmentPreferences({ storage = typeof localStorage !== 'undefined' ? localStorage : null, device = {} } = {}) {
  let stored = null;
  try {
    const raw = storage?.getItem?.(ENVIRONMENT_QUALITY_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    stored = null;
  }
  const prefs = normalizeEnvironmentPreferences(stored);
  if (!prefs.quality) prefs.quality = defaultEnvironmentTier(device);
  return { prefs, fromStorage: stored !== null && !!stored, raw: stored };
}

export function saveEnvironmentPreferences(prefs, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage || typeof storage.setItem !== 'function') return false;
  try {
    let existing = {};
    try {
      const currentRaw = storage.getItem?.(ENVIRONMENT_QUALITY_KEY);
      if (currentRaw) {
        const parsed = JSON.parse(currentRaw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          existing = parsed;
        }
      }
    } catch {
      existing = {};
    }

    const merged = { ...existing };
    if (prefs && typeof prefs === 'object') {
      if (ENVIRONMENT_TIERS.includes(prefs.quality)) {
        merged.quality = prefs.quality;
      }
      const candidateWorld = prefs.worldId ?? prefs.environment;
      if (candidateWorld !== undefined) {
        if (WORLD_IDS.includes(candidateWorld)) {
          merged.worldId = candidateWorld;
          merged.environment = candidateWorld; // compatibility mirror
          const def = getWorldDefinition(candidateWorld);
          const candidateVariant = prefs.variantId ?? prefs.variant;
          if (candidateVariant && def && Object.prototype.hasOwnProperty.call(def.variants, candidateVariant)) {
            merged.variantId = candidateVariant;
            merged.variant = candidateVariant; // compatibility mirror
          } else if (def) {
            merged.variantId = def.defaultVariant;
            merged.variant = def.defaultVariant; // compatibility mirror
          }
        }
      }
      // Preserve unrelated custom fields
      for (const [k, v] of Object.entries(prefs)) {
        if (!['quality', 'worldId', 'variantId', 'environment', 'variant', 'version'].includes(k)) {
          merged[k] = v;
        }
      }
    }

    merged.version = 2;
    storage.setItem(ENVIRONMENT_QUALITY_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}

export { oneOf };

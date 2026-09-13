/**
 * Deterministic World Presentation Resolver (introduce-global-world-system D3, Task 3.2).
 *
 * Resolves the presentation plan for a given personal World selection and View,
 * implementing the fallback chain:
 *   exact interpretation -> generic World profile -> native View -> retained scene.
 */

import {
  getWorldDefinition,
  getWorldVariant,
  DEFAULT_WORLD_ID,
  DEFAULT_WORLD_VARIANT,
} from '../../shared/worldDefinitions.js';
import { getViewWorldSupport } from './registry.js';
import { validateAndRepairSelection } from './state.js';

/**
 * Resolves the visual/audio presentation plan for a view.
 *
 * @param {object} params
 * @param {{ worldId: string, variantId?: string }} params.selection Active world selection
 * @param {string} params.viewId View identifier ('place:<id>' or 'activity:<type>')
 * @param {object} [params.support] Optional WorldSupport override (resolved from registry by default)
 * @param {'low'|'medium'|'high'|'ultra'} [params.quality='high'] Quality tier
 * @param {{ reducedMotion?: boolean, particles?: boolean }} [params.comfort] Comfort settings
 * @param {Set<string>|Array<string>|null} [params.availableAdapters] Registered adapter keys
 * @param {Set<string>|Array<string>|null} [params.availableAssets] Available asset IDs
 * @param {object|null} [params.currentPresentation] Currently applied presentation
 * @returns {object} Resolved presentation plan
 */
export function resolveWorldPresentation({
  selection,
  viewId,
  support: explicitSupport = null,
  quality = 'high',
  comfort = {},
  availableAdapters = null,
  availableAssets = null,
  currentPresentation = null,
} = {}) {
  // 1. Validate & repair world and variant selection
  const { worldId, variantId } = validateAndRepairSelection(
    selection?.worldId,
    selection?.variantId,
  );
  const worldDef = getWorldDefinition(worldId);
  const variantDef = getWorldVariant(worldId, variantId);

  // 2. Resolve View support policy
  const support = explicitSupport ?? getViewWorldSupport(viewId);
  const mode = support?.mode ?? 'none';
  const host = support?.host ?? 'self';
  const supportedSlots = new Set(support?.slots ?? []);

  // Helper to check adapter availability
  const isAdapterAvailable = (key) => {
    if (!key) return true;
    if (!availableAdapters) return true;
    return availableAdapters instanceof Set
      ? availableAdapters.has(key)
      : availableAdapters.includes(key);
  };

  // Helper to check asset availability
  const isAssetAvailable = (assetId) => {
    if (!availableAssets) return true;
    return availableAssets instanceof Set
      ? availableAssets.has(assetId)
      : availableAssets.includes(assetId);
  };

  // 3. Handle 'none' mode: pure native presentation immediately
  if (mode === 'none') {
    return Object.freeze({
      selection: Object.freeze({ worldId, variantId }),
      worldId,
      variantId,
      viewId,
      mode: 'none',
      host,
      slots: Object.freeze([]),
      fallback: false,
      fallbackLevel: 'native',
      fallbackReason: 'mode_none',
      adapterKey: support.adapterKey ?? null,
      assetIds: Object.freeze([]),
      atmosphere: null,
      audioProfile: null,
      inheritedFromParent: host === 'parent',
    });
  }

  // 4. Handle 'parent' host: in-place or table activity inherits parent surroundings
  if (host === 'parent') {
    return Object.freeze({
      selection: Object.freeze({ worldId, variantId }),
      worldId,
      variantId,
      viewId,
      mode,
      host: 'parent',
      slots: Object.freeze([]),
      fallback: false,
      fallbackLevel: 'exact',
      fallbackReason: null,
      adapterKey: null,
      assetIds: Object.freeze([]),
      atmosphere: null,
      audioProfile: null,
      inheritedFromParent: true,
    });
  }

  // 5. Self host resolution: exact interpretation -> generic -> native -> retained
  let fallbackLevel = 'exact';
  let fallbackReason = null;
  let adapterKey = support.adapterKey ?? null;
  let assetIds = [];

  const interpretation = worldDef?.interpretations?.[viewId];
  if (interpretation) {
    if (interpretation.adapterKey && !isAdapterAvailable(interpretation.adapterKey)) {
      fallbackLevel = 'generic';
      fallbackReason = 'adapter_unavailable';
    } else {
      adapterKey = interpretation.adapterKey || adapterKey;
      if (Array.isArray(interpretation.assetIds)) {
        assetIds = interpretation.assetIds.filter(isAssetAvailable);
      }
    }
  } else {
    // No bespoke interpretation declared
    if (mode === 'ambient') {
      fallbackLevel = 'generic';
      fallbackReason = null; // ambient is expected to use generic profile
    } else {
      fallbackLevel = 'generic';
      fallbackReason = 'no_view_interpretation';
    }
  }

  // If the resolved adapter is unavailable and we have an existing presentation, retain it
  if (adapterKey && !isAdapterAvailable(adapterKey)) {
    if (currentPresentation) {
      return Object.freeze({
        ...currentPresentation,
        fallback: true,
        fallbackLevel: 'retained',
        fallbackReason: 'adapter_unavailable_retained',
      });
    }
    // Fall back to native
    return Object.freeze({
      selection: Object.freeze({ worldId, variantId }),
      worldId,
      variantId,
      viewId,
      mode: 'none',
      host,
      slots: Object.freeze([]),
      fallback: true,
      fallbackLevel: 'native',
      fallbackReason: 'adapter_unavailable',
      adapterKey: null,
      assetIds: Object.freeze([]),
      atmosphere: null,
      audioProfile: null,
      inheritedFromParent: false,
    });
  }

  // 6. Build permitted atmosphere fields strictly according to supportedSlots
  const atmosphere = {};
  const visuals = variantDef?.visuals ?? {};
  const features = variantDef?.features ?? {};

  if (supportedSlots.has('sky')) {
    atmosphere.sky = {
      skyColor: visuals.skyColor,
      skyPhase: visuals.skyPhase,
      sunColor: visuals.sunColor,
      sunIntensity: visuals.sunIntensity,
      sunElevation: visuals.sunElevation,
      sunAzimuth: visuals.sunAzimuth,
      sunDisc: visuals.sunDisc,
      moonDisc: visuals.moonDisc,
      aurora: visuals.aurora,
      auroraColor: visuals.auroraColor,
      horizonGlow: visuals.horizonGlow,
      horizonGlowColor: visuals.horizonGlowColor,
      cloudSharpness: visuals.cloudSharpness,
      cloudDrift: visuals.cloudDrift,
    };
  }

  if (supportedSlots.has('lighting')) {
    atmosphere.lighting = {
      sunColor: visuals.sunColor,
      sunIntensity: visuals.sunIntensity,
      groundColor: visuals.groundColor,
      ambientColor: visuals.ambientColor,
      hemisphereIntensity: visuals.hemisphereIntensity,
      exposure: visuals.exposure,
    };
  }

  if (supportedSlots.has('fog')) {
    atmosphere.fog = {
      fogColor: visuals.fogColor,
      fogDensity: visuals.fogDensity,
    };
  }

  if (supportedSlots.has('particles')) {
    const allowParticles = comfort.particles !== false;
    atmosphere.particles = allowParticles ? {
      mist: features.mist ?? 0,
      birds: features.birds ?? 0,
      fireflies: features.fireflies ?? 0,
      spores: features.spores ?? 0,
      dust: features.dust ?? 0,
      sandstorm: features.sandstorm ?? 0,
      snow: features.snow ?? 0,
      rainParticles: features.rainParticles ?? 0,
      cloudDeck: features.cloudDeck ?? 0,
      cloudSea: features.cloudSea ?? 0,
      leafFall: features.leafFall ?? 0,
    } : null;
  }

  const audioProfile = supportedSlots.has('audio')
    ? (variantDef?.audio?.ambience ?? null)
    : null;

  return Object.freeze({
    selection: Object.freeze({ worldId, variantId }),
    worldId,
    variantId,
    viewId,
    mode,
    host,
    slots: Object.freeze([...supportedSlots]),
    fallback: fallbackReason !== null,
    fallbackLevel,
    fallbackReason,
    adapterKey,
    assetIds: Object.freeze(assetIds),
    atmosphere: Object.keys(atmosphere).length > 0 ? Object.freeze(atmosphere) : null,
    audioProfile,
    inheritedFromParent: false,
  });
}

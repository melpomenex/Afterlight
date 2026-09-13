/**
 * Canonical World State Owner (introduce-global-world-system D1, D2).
 *
 * Single owner for the visitor's personal World selection, revision,
 * and persistence status across places, activities, reconnects and reloads.
 */

import {
  WORLD_IDS,
  DEFAULT_WORLD_ID,
  DEFAULT_WORLD_VARIANT,
  getWorldDefinition,
  randomWorldSelection,
  isWorldPreset,
  worldForPreset,
} from '../../shared/worldDefinitions.js';
import {
  loadEnvironmentPreferences,
  saveEnvironmentPreferences,
} from '../environments/quality.js';

/**
 * Validates and repairs a world/variant selection against the registered catalog.
 * @param {string} worldId
 * @param {string} [variantId]
 * @returns {{ worldId: string, variantId: string }}
 */
export function validateAndRepairSelection(worldId, variantId) {
  const targetWorld = typeof worldId === 'string' && WORLD_IDS.includes(worldId)
    ? worldId
    : DEFAULT_WORLD_ID;
  const def = getWorldDefinition(targetWorld);
  if (!def) {
    return { worldId: DEFAULT_WORLD_ID, variantId: DEFAULT_WORLD_VARIANT };
  }
  const targetVariant = typeof variantId === 'string' && Object.prototype.hasOwnProperty.call(def.variants, variantId)
    ? variantId
    : def.defaultVariant;
  return { worldId: targetWorld, variantId: targetVariant };
}

/**
 * Resolves a URL preview from search params or a query string.
 * Valid ?preset takes precedence over valid ?world; invalid parameters fall through.
 *
 * @param {string|URLSearchParams|Location} search
 * @returns {{ worldId: string, variantId: string, preset?: string } | null}
 */
export function resolveWorldUrlPreview(search) {
  if (!search) return null;
  let params;
  try {
    if (typeof search === 'string') {
      params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    } else if (search instanceof URLSearchParams) {
      params = search;
    } else if (search && typeof search.search === 'string') {
      params = new URLSearchParams(search.search.startsWith('?') ? search.search.slice(1) : search.search);
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const presetParam = params.get('preset');
  if (presetParam && isWorldPreset(presetParam)) {
    const matched = worldForPreset(presetParam);
    if (matched) {
      return {
        worldId: matched.worldId,
        variantId: matched.variantId,
        preset: presetParam,
      };
    }
  }

  const worldParam = params.get('world');
  if (worldParam && WORLD_IDS.includes(worldParam)) {
    const def = getWorldDefinition(worldParam);
    const variantParam = params.get('variant');
    const variantId = variantParam && def && Object.prototype.hasOwnProperty.call(def.variants, variantParam)
      ? variantParam
      : (def?.defaultVariant ?? DEFAULT_WORLD_VARIANT);
    return {
      worldId: worldParam,
      variantId,
    };
  }

  return null;
}

/**
 * Creates the single personal World state owner.
 *
 * @param {object} [options]
 * @param {Storage|null} [options.storage] Storage backend (defaults to localStorage)
 * @param {() => number} [options.rng=Math.random] Injected RNG for reproducible assignment
 * @param {{ worldId: string, variantId?: string }} [options.initialSelection] Optional override / preview selection
 * @param {boolean} [options.isPreview=false] True if initialSelection is a session preview (not yet durable)
 */
export function createWorldState({
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  rng = Math.random,
  initialSelection = null,
  isPreview = false,
} = {}) {
  const listeners = new Set();
  let revision = 1;
  let storageAvailable = true;

  // 1. Resolve durable selection from storage or initial assignment
  let durableSelection = null;
  const loaded = loadEnvironmentPreferences({ storage });
  if (loaded.prefs?.worldId && WORLD_IDS.includes(loaded.prefs.worldId)) {
    durableSelection = validateAndRepairSelection(loaded.prefs.worldId, loaded.prefs.variantId);
  } else {
    // Missing or invalid saved selection: assign once uniformly among registered worlds
    const assigned = randomWorldSelection(rng);
    durableSelection = validateAndRepairSelection(assigned.worldId, assigned.variantId);
    // Persist the initial assignment
    const saved = saveEnvironmentPreferences(
      { worldId: durableSelection.worldId, variantId: durableSelection.variantId },
      storage,
    );
    if (!saved) {
      storageAvailable = false;
    }
  }

  // 2. Resolve active selection (preview vs durable)
  let activeSelection = durableSelection;
  let activeIsPreview = false;
  let isSaved = storageAvailable;

  if (initialSelection) {
    const repaired = validateAndRepairSelection(initialSelection.worldId, initialSelection.variantId);
    activeSelection = repaired;
    if (isPreview) {
      activeIsPreview = true;
      isSaved = false;
    } else {
      durableSelection = repaired;
      const ok = saveEnvironmentPreferences(repaired, storage);
      isSaved = ok;
      if (!ok) storageAvailable = false;
    }
  }

  function notify() {
    const snap = snapshot();
    for (const fn of listeners) {
      try {
        fn(snap);
      } catch (err) {
        console.error('[world-state] listener error:', err);
      }
    }
  }

  function snapshot() {
    return Object.freeze({
      worldId: activeSelection.worldId,
      variantId: activeSelection.variantId,
      revision,
      saved: isSaved,
      storageAvailable,
      isPreview: activeIsPreview,
      durableWorldId: durableSelection.worldId,
      durableVariantId: durableSelection.variantId,
    });
  }

  return {
    get selection() {
      return activeSelection;
    },
    get durableSelection() {
      return durableSelection;
    },
    get revision() {
      return revision;
    },
    get saved() {
      return isSaved;
    },
    get isPreview() {
      return activeIsPreview;
    },
    get storageAvailable() {
      return storageAvailable;
    },

    snapshot,

    /**
     * Change active world and variant.
     * @param {object} params
     * @param {string} params.worldId
     * @param {string} [params.variantId]
     * @param {boolean} [params.persist=true] Whether to save durably to storage
     */
    select({ worldId, variantId, persist = true }) {
      const repaired = validateAndRepairSelection(worldId, variantId);
      const isSame = activeSelection.worldId === repaired.worldId && activeSelection.variantId === repaired.variantId;

      if (isSame && !activeIsPreview && isSaved === persist) {
        return snapshot();
      }

      activeSelection = repaired;
      revision += 1;

      if (persist) {
        const ok = saveEnvironmentPreferences(
          { worldId: repaired.worldId, variantId: repaired.variantId },
          storage,
        );
        if (ok) {
          durableSelection = repaired;
          isSaved = true;
          activeIsPreview = false;
          storageAvailable = true;
        } else {
          isSaved = false;
          storageAvailable = false;
        }
      } else {
        activeIsPreview = true;
        isSaved = false;
      }

      notify();
      return snapshot();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/**
 * Resolves the bootstrap world state taking into account URL previews,
 * persisted storage preferences, and one-time initial assignment.
 *
 * @param {object} [options]
 * @param {string|URLSearchParams|Location} [options.search]
 * @param {Storage|null} [options.storage]
 * @param {() => number} [options.rng]
 * @returns {ReturnType<typeof createWorldState>}
 */
export function resolveBootstrapWorldState({
  search = typeof location !== 'undefined' ? location.search : '',
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  rng = Math.random,
} = {}) {
  const preview = resolveWorldUrlPreview(search);
  if (preview) {
    return createWorldState({
      storage,
      rng,
      initialSelection: { worldId: preview.worldId, variantId: preview.variantId },
      isPreview: true,
    });
  }
  return createWorldState({
    storage,
    rng,
  });
}

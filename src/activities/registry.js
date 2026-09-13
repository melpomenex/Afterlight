/**
 * Registry of client-side activity modules.
 *
 * Maps an activity type (e.g. 'pong', 'rain_runner', etc.) to an activity module.
 * Modules implement:
 *   - initialize({ activityDef, world, net, generation, ... }) -> instance
 * Instance implements:
 *   - update(time, delta)
 *   - acceptSnapshot(snapshotEnvelope)
 *   - acceptEvent(eventEnvelope)
 *   - acceptResult(resultEnvelope)
 *   - acceptError(errorEnvelope)
 *   - dispose()
 */

import { ACTIVITY_TYPES } from '../../shared/placeDefinitions.js';

const modules = new Map();
const mediaPolicies = new Map();
const worldSupports = new Map();

/**
 * Default client-only presentation policy for an activity module
 * (add-floating-minigame-media D2). Play participation floats the current
 * theater media by default; a module can opt out with
 * `mediaPolicy: { floatingMedia: false }` and expose bounded HUD
 * reservations through `mediaPolicy.reservedRects()`.
 */
export const DEFAULT_ACTIVITY_MEDIA_POLICY = Object.freeze({
  floatingMedia: true,
  reservedRects: null,
  reservedSelectors: Object.freeze([]),
});

export function normalizeActivityMediaPolicy(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return Object.freeze({
    floatingMedia: source.floatingMedia !== false,
    reservedRects: typeof source.reservedRects === 'function' ? source.reservedRects : null,
    reservedSelectors: Object.freeze(
      Array.isArray(source.reservedSelectors)
        ? source.reservedSelectors.filter((s) => typeof s === 'string' && s.length > 0).slice(0, 8)
        : [],
    ),
  });
}

/**
 * World presentation inheritance policy for activities (introduce-global-world-system D3).
 */
export const DEFAULT_ACTIVITY_WORLD_SUPPORT = Object.freeze({
  mode: 'none',
  host: 'parent',
  slots: Object.freeze([]),
  adapterKey: null,
  defaultPresentationKey: null,
});

export function normalizeActivityWorldSupport(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const mode = ['full', 'partial', 'ambient', 'none'].includes(source.mode) ? source.mode : 'none';
  const host = ['self', 'parent'].includes(source.host) ? source.host : 'parent';
  const slots = Array.isArray(source.slots)
    ? Object.freeze([...new Set(source.slots.filter((s) => typeof s === 'string'))])
    : Object.freeze([]);
  const adapterKey = typeof source.adapterKey === 'string' && source.adapterKey.length > 0 ? source.adapterKey : null;
  return Object.freeze({
    mode,
    host,
    slots,
    adapterKey,
    defaultPresentationKey: typeof source.defaultPresentationKey === 'string' ? source.defaultPresentationKey : null,
  });
}

function resolveCanonicalActivityWorldSupport(type) {
  switch (type) {
    case 'kart-royale':
      return Object.freeze({
        mode: 'partial',
        host: 'self',
        slots: Object.freeze(['sky', 'lighting', 'fog', 'distant-scenery', 'audio']),
        adapterKey: 'activity:kart-royale',
        defaultPresentationKey: null,
      });
    case 'snowboard-race':
      return Object.freeze({
        mode: 'partial',
        host: 'self',
        slots: Object.freeze(['sky', 'lighting', 'fog', 'distant-scenery', 'audio']),
        adapterKey: 'activity:snowboard-race',
        defaultPresentationKey: null,
      });
    case 'downhill-mayhem':
      return Object.freeze({
        mode: 'ambient',
        host: 'self',
        slots: Object.freeze(['sky', 'lighting', 'audio']),
        adapterKey: 'activity:downhill-mayhem',
        defaultPresentationKey: null,
      });
    case 'pool':
    case 'billiards':
    case 'air-hockey':
    case 'foosball':
    case 'darts':
    case 'piano':
    case 'photo-booth':
      return Object.freeze({
        mode: 'full',
        host: 'parent',
        slots: Object.freeze([]),
        adapterKey: null,
        defaultPresentationKey: null,
      });
    case 'pong':
    case 'rain-runner':
    case 'signal-lost':
    case 'sporefall':
      return Object.freeze({
        mode: 'none',
        host: 'parent',
        slots: Object.freeze([]),
        adapterKey: null,
        defaultPresentationKey: null,
      });
    default:
      // In-place activities at other places inherit parent ambient presentation
      if (ACTIVITY_TYPES.includes(type)) {
        return Object.freeze({
          mode: 'ambient',
          host: 'parent',
          slots: Object.freeze([]),
          adapterKey: null,
          defaultPresentationKey: null,
        });
      }
      return DEFAULT_ACTIVITY_WORLD_SUPPORT;
  }
}

/**
 * Register an activity module for a supported activity type.
 * @param {string} type
 * @param {object} moduleDef
 * @returns {object} moduleDef
 */
export function registerActivityModule(type, moduleDef) {
  if (typeof type !== 'string' || type.length === 0) {
    throw new Error('Activity type must be a non-empty string');
  }
  if (!ACTIVITY_TYPES.includes(type)) {
    throw new Error(`Cannot register unknown activity type "${type}". Must be in ACTIVITY_TYPES.`);
  }
  if (!moduleDef || typeof moduleDef !== 'object') {
    throw new Error(`Activity module for "${type}" must be an object`);
  }
  if (typeof moduleDef.initialize !== 'function') {
    throw new Error(`Activity module for "${type}" must implement initialize()`);
  }
  if (modules.has(type)) {
    throw new Error(`Duplicate activity module registration for "${type}"`);
  }
  modules.set(type, moduleDef);
  mediaPolicies.set(type, normalizeActivityMediaPolicy(moduleDef.mediaPolicy));
  if (moduleDef.worldSupport) {
    worldSupports.set(type, normalizeActivityWorldSupport(moduleDef.worldSupport));
  } else {
    worldSupports.set(type, resolveCanonicalActivityWorldSupport(type));
  }
  return moduleDef;
}

/**
 * Check if a module is registered for a type.
 * @param {string} type
 * @returns {boolean}
 */
export function hasActivityModule(type) {
  return modules.has(type);
}

/**
 * Get the registered module for a type.
 * @param {string} type
 * @returns {object | undefined}
 */
export function getActivityModule(type) {
  return modules.get(type);
}

/**
 * Client-only media presentation policy for a registered module.
 * @param {string} type
 * @returns {{ floatingMedia: boolean, reservedRects: Function|null }}
 */
export function getActivityMediaPolicy(type) {
  return mediaPolicies.get(type) || DEFAULT_ACTIVITY_MEDIA_POLICY;
}

/**
 * World presentation support for an activity type.
 * @param {string} type
 * @returns {object}
 */
export function getActivityWorldSupport(type) {
  if (worldSupports.has(type)) {
    return worldSupports.get(type);
  }
  return resolveCanonicalActivityWorldSupport(type);
}

/**
 * Unregister an activity module (useful in tests or hot reloading).
 * @param {string} type
 * @returns {boolean}
 */
export function unregisterActivityModule(type) {
  mediaPolicies.delete(type);
  worldSupports.delete(type);
  return modules.delete(type);
}

/**
 * Clear all registered activity modules.
 */
export function clearActivityModules() {
  modules.clear();
  mediaPolicies.clear();
  worldSupports.clear();
}

/**
 * Get all registered module keys.
 * @returns {string[]}
 */
export function activityModuleKeys() {
  return [...modules.keys()];
}

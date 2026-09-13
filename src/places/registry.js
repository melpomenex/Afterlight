/**
 * Registry mapping place builder keys, specialized controller keys, and
 * world presentation support to functions/metadata.
 * Metadata authority stays in shared/placeDefinitions.js.
 */

const builders = new Map();
const controllers = new Map();
const placeWorldSupports = new Map();

export const THEATER_WORLD_SUPPORT = Object.freeze({
  mode: 'full',
  host: 'self',
  slots: Object.freeze(['sky', 'distant-scenery', 'decoration', 'lighting', 'fog', 'particles', 'audio']),
  adapterKey: 'place:theater',
  defaultPresentationKey: null,
});

export const DEFAULT_PLACE_WORLD_SUPPORT = Object.freeze({
  mode: 'ambient',
  host: 'self',
  slots: Object.freeze(['lighting', 'audio']),
  adapterKey: 'place:ambient',
  defaultPresentationKey: null,
});

export function normalizePlaceWorldSupport(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const mode = ['full', 'partial', 'ambient', 'none'].includes(source.mode) ? source.mode : 'ambient';
  const host = ['self', 'parent'].includes(source.host) ? source.host : 'self';
  const slots = Array.isArray(source.slots)
    ? Object.freeze([...new Set(source.slots.filter((s) => typeof s === 'string'))])
    : (mode === 'full' ? THEATER_WORLD_SUPPORT.slots : DEFAULT_PLACE_WORLD_SUPPORT.slots);
  const adapterKey = typeof source.adapterKey === 'string' && source.adapterKey.length > 0
    ? source.adapterKey
    : (mode === 'full' ? 'place:theater' : (mode === 'none' ? null : 'place:ambient'));
  return Object.freeze({
    mode,
    host,
    slots,
    adapterKey,
    defaultPresentationKey: typeof source.defaultPresentationKey === 'string' ? source.defaultPresentationKey : null,
  });
}

export function registerPlaceWorldSupport(key, support) {
  if (typeof key !== 'string' || key.length === 0) throw new Error('Place key must be a non-empty string');
  placeWorldSupports.set(key, normalizePlaceWorldSupport(support));
}

export function getPlaceWorldSupport(key) {
  if (placeWorldSupports.has(key)) return placeWorldSupports.get(key);
  if (key === 'theater') return THEATER_WORLD_SUPPORT;
  return DEFAULT_PLACE_WORLD_SUPPORT;
}

export function registerPlaceBuilder(key, build) {
  if (typeof key !== 'string' || key.length === 0) throw new Error('Place builder keys must be non-empty strings');
  if (typeof build !== 'function') throw new Error(`Place builder "${key}" must be a function`);
  if (builders.has(key)) throw new Error(`Duplicate place builder key: ${key}`);
  builders.set(key, build);
  return build;
}

export function hasPlaceBuilder(key) {
  return builders.has(key);
}

export function getPlaceBuilder(key) {
  return builders.get(key);
}

export function placeBuilderKeys() {
  return [...builders.keys()];
}

// Resolves the builder a definition declares (builderKey, falling back to the
// id for legacy entries). Throws naming the definition before any geometry is
// built.
export function requirePlaceBuilder(def) {
  const key = def?.builderKey || def?.id;
  const build = builders.get(key);
  if (!build) throw new Error(`Place "${def?.id ?? 'unknown'}" declares unknown builder key: ${key}`);
  return build;
}

// Specialized venue controllers (Theater now, future adapters later) register
// the same way. Registration is by key so definitions never carry functions.
export function registerPlaceController(key, controller) {
  if (typeof key !== 'string' || key.length === 0) throw new Error('Place controller keys must be non-empty strings');
  if (!controller || typeof controller !== 'object') throw new Error(`Place controller "${key}" must be an object`);
  if (controllers.has(key)) throw new Error(`Duplicate place controller key: ${key}`);
  controllers.set(key, controller);
  return controller;
}

export function hasPlaceController(key) {
  return controllers.has(key);
}

export function getPlaceController(key) {
  return controllers.get(key);
}

// Tests and lifecycle wrappers may release a controller key so a new
// context (isolated stub UI, hot reload) can register its own without
// colliding with the previous one.
export function unregisterPlaceController(key) {
  return controllers.delete(key);
}

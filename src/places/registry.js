/**
 * Registry mapping place builder keys and specialized controller keys to
 * functions. It owns renderer references only — metadata authority stays in
 * shared/placeDefinitions.js. Definitions declared in the manifest resolve
 * through here at build time, so an unknown builder key is a named error on
 * the offending definition instead of silent fallback scenery.
 */

const builders = new Map();
const controllers = new Map();

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

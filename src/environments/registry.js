/**
 * Registry mapping Theater environment ids to their builder functions.
 * Mirrors the place builder registry: the shared manifest carries metadata,
 * this module carries renderer references, and an unknown id is a named
 * error instead of fallback scenery.
 */

const builders = new Map();

export function registerEnvironmentBuilder(id, build) {
  if (typeof id !== 'string' || id.length === 0) throw new Error('Environment builder ids must be non-empty strings');
  if (typeof build !== 'function') throw new Error(`Environment builder "${id}" must be a function`);
  if (builders.has(id)) throw new Error(`Duplicate environment builder id: ${id}`);
  builders.set(id, build);
  return build;
}

export function hasEnvironmentBuilder(id) {
  return builders.has(id);
}

export function getEnvironmentBuilder(id) {
  return builders.get(id);
}

export function environmentBuilderIds() {
  return [...builders.keys()];
}

export function requireEnvironmentBuilder(id) {
  const build = builders.get(id);
  if (!build) throw new Error(`Theater environment "${id}" declares no registered builder`);
  return build;
}

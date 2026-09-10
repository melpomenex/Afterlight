/**
 * Downhill Mayhem game-side course helpers
 * (integrate-multiplayer-downhill-mayhem-arcade 2.3). A thin adapter over the
 * canonical `shared/downhill/course.js` sampler: it re-exports the pure math the
 * renderer needs and derives the per-course knobs (relief offset, biome edges,
 * forest/rock densities) from the loaded document so `world.js` and the physics
 * read the SAME contact surface.
 *
 * No Three.js, DOM, renderer or RAF ownership here: this module is pure and
 * runs in Node.
 */

import {
  loadCourse,
  generateCourseDocument,
  validateCourse,
  MOUNTAINS,
  dailySeedFromDate,
  clamp,
  lerp,
  smoothstep,
  mulberry32,
  hash2,
  vnoise2,
  SEED,
  S_MIN,
  S_MAX,
  DS,
  FINISH_S,
  HALF_W,
  RIDE_W,
  LAT_CLAMP,
  START_LATS,
} from '../../../../shared/downhill/course.js';

export {
  loadCourse,
  generateCourseDocument,
  validateCourse,
  MOUNTAINS,
  dailySeedFromDate,
  clamp,
  lerp,
  smoothstep,
  mulberry32,
  hash2,
  vnoise2,
  SEED,
  S_MIN,
  S_MAX,
  DS,
  FINISH_S,
  HALF_W,
  RIDE_W,
  LAT_CLAMP,
  START_LATS,
};

/**
 * Derive the renderer-facing course knobs the source game kept in globals
 * (`NOFF`, `COLD_EDGE`, `WARM_EDGE`, `TREE_D`, `ROCK_D`, `ramps`, `drops`). The
 * physics sampler and this config come from one document, so render and contact
 * cannot drift.
 */
export function courseConfig(course) {
  const doc = course.doc ?? {};
  const knobs = doc.knobs ?? {};
  return {
    seed: course.seed,
    noff: (course.seed % 977) * 13.7,
    coldEdge: knobs.cold ?? 0.32,
    warmEdge: knobs.warm ?? 0.68,
    treeD: knobs.trees ?? 1,
    rockD: knobs.rocks ?? 0,
    finishS: course.finishS,
    ramps: course.ramps,
    drops: course.drops,
    colliders: course.colliders,
  };
}

/** Human-readable label for a mountain id (Daily carries a date label). */
export function terrainLabel(id) {
  if (id === 'daily') return 'DAILY';
  return (MOUNTAINS[id] && MOUNTAINS[id].label) || String(id || '').toUpperCase();
}

/**
 * Configuration and helpers for world bounds, movement limits, click target clamping, and minimap projections.
 */

import { PLACE_DEFINITIONS } from '../../shared/placeDefinitions.js';

export const WORLD_BOUNDS = {
  market: {
    id: 'market',
    minX: -11.3,
    maxX: 11.3,
    minZ: -9.5,
    maxZ: 10.3,
    spawn: [0, 3],
    exitGarden: [10.7, 0],
  },
  garden: {
    id: 'garden',
    minX: -11.5,
    maxX: 11.5,
    minZ: -10.0,
    maxZ: 10.5,
    spawn: [-9.5, 0],
    exitMarket: [-10.7, 0],
  },
};

// Bounds belong to place definitions: every registered public place
// contributes its declared bounds here, and additional definitions (the
// test-only view fixture, runtime-registered views) can register through
// registerPlaceBounds. The explicit market/personal-garden entries above
// stay authoritative for their rooms.
const registeredPlaces = new Map();
for (const def of PLACE_DEFINITIONS) {
  if (def.bounds) registeredPlaces.set(def.id, def);
}

export function registerPlaceBounds(def) {
  if (!def || typeof def.id !== 'string' || !def.bounds) {
    throw new Error(`Cannot register bounds for place: ${def?.id ?? 'unknown'}`);
  }
  registeredPlaces.set(def.id, def);
  return def;
}

const exitPosition = (def, exitId, fallback) => def.exits?.find(exit => exit.id === exitId)?.position ?? fallback;

export function getBoundsForRoom(roomId) {
  // Checked before the manifest: `garden` the room id keeps its personal
  // cultivation bounds, while `garden` the Glass Garden district retains the
  // existing behavior for ?room=garden shorthand.
  if (!roomId || roomId === 'market') return WORLD_BOUNDS.market;
  if (roomId.startsWith('garden:') || roomId === 'garden') return WORLD_BOUNDS.garden;
  const def = registeredPlaces.get(roomId);
  if (def) {
    return {
      id: roomId,
      minX: def.bounds.minX,
      maxX: def.bounds.maxX,
      minZ: def.bounds.minZ,
      maxZ: def.bounds.maxZ,
      spawn: def.spawn ?? [-9, 0],
      exitWest: exitPosition(def, 'west', [-10.7, 0]),
      exitEast: exitPosition(def, 'east', [10.7, 0]),
    };
  }
  return {
    id: roomId,
    minX: -11.3,
    maxX: 11.3,
    minZ: -9.5,
    maxZ: 10.3,
    spawn: [-9, 0],
    exitWest: [-10.7, 0],
    exitEast: [10.7, 0],
  };
}

export function isWalkable(bounds, obstacles, x, z) {
  if (x <= bounds.minX || x >= bounds.maxX || z <= bounds.minZ || z >= bounds.maxZ) {
    return false;
  }
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (Math.abs(x - o.x) < o.w && Math.abs(z - o.z) < o.d) {
      return false;
    }
  }
  return true;
}

export function clampClickTarget(bounds, x, z) {
  const margin = 0.35;
  return {
    x: Math.max(bounds.minX + margin, Math.min(bounds.maxX - margin, x)),
    z: Math.max(bounds.minZ + margin, Math.min(bounds.maxZ - margin, z)),
  };
}

export function projectToMinimap(bounds, x, z, svgBox = { x: 24, y: 24, w: 106, h: 72 }) {
  const normX = (x - bounds.minX) / (bounds.maxX - bounds.minX);
  const normZ = (z - bounds.minZ) / (bounds.maxZ - bounds.minZ);
  return {
    cx: svgBox.x + Math.max(0, Math.min(1, normX)) * svgBox.w,
    cy: svgBox.y + Math.max(0, Math.min(1, normZ)) * svgBox.h,
  };
}

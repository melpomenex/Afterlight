/**
 * Configuration and helpers for world bounds, movement limits, click target clamping, and minimap projections.
 */

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

export function getBoundsForRoom(roomId) {
  if (!roomId || roomId === 'market') return WORLD_BOUNDS.market;
  if (roomId.startsWith('garden:') || roomId === 'garden') return WORLD_BOUNDS.garden;
  if (WORLD_BOUNDS[roomId]) return WORLD_BOUNDS[roomId];
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

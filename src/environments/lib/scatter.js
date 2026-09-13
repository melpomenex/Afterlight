/**
 * Deterministic scatter placement for environment vegetation and props.
 *
 * Rejection sampling with a spatial hash so instances keep a minimum spacing
 * without O(n²) checks. The caller supplies `float()` (a seeded stream) and a
 * height function; `accept({x, z, h, radial})` gates placement by terrain
 * (water, slope, clearing) so trees never float above geometry.
 */

export function createScatterGrid(cellSize = 4) {
  const cells = new Map();
  const key = (x, z) => `${Math.floor(x / cellSize)}:${Math.floor(z / cellSize)}`;
  return {
    hasNeighbor(x, z, radius) {
      const cx = Math.floor(x / cellSize);
      const cz = Math.floor(z / cellSize);
      const reach = Math.ceil(radius / cellSize);
      for (let dz = -reach; dz <= reach; dz++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const bucket = cells.get(`${cx + dx}:${cz + dz}`);
          if (!bucket) continue;
          for (const p of bucket) {
            if (Math.hypot(p.x - x, p.z - z) < radius) return true;
          }
        }
      }
      return false;
    },
    add(x, z) {
      const k = key(x, z);
      let bucket = cells.get(k);
      if (!bucket) { bucket = []; cells.set(k, bucket); }
      bucket.push({ x, z });
    },
  };
}

/**
 * @param {object} options
 * @param {number} options.count              requested instances
 * @param {number} [options.minRadius]        inner placement radius
 * @param {number} [options.maxRadius]        outer placement radius
 * @param {() => number} options.float         seeded [0,1) stream
 * @param {(x:number,z:number)=>number} options.heightAt
 * @param {(ctx:{x:number,z:number,h:number,radial:number,angle:number})=>boolean} [options.accept]
 * @param {number} [options.minSpacing]        minimum center distance
 * @param {number} [options.maxTriesFactor]    attempts = count × factor
 * @param {number} [options.angleBias]         -1 = even ring, 0 = full disc
 */
export function scatter({
  count,
  minRadius = 0,
  maxRadius = 100,
  float,
  heightAt = () => 0,
  accept = null,
  minSpacing = 1.2,
  maxTriesFactor = 22,
  square = false,
} = {}) {
  if (typeof float !== 'function') throw new Error('scatter requires a float() stream');
  const grid = createScatterGrid(Math.max(1, minSpacing));
  const placements = [];
  const maxTries = Math.max(count, Math.floor(count * maxTriesFactor));
  for (let tries = 0; tries < maxTries && placements.length < count; tries++) {
    let x, z;
    if (square) {
      x = (float() * 2 - 1) * maxRadius;
      z = (float() * 2 - 1) * maxRadius;
    } else {
      const angle = float() * Math.PI * 2;
      // sqrt keeps the density even across the annulus; the min radius keeps
      // the walkable Theater terrace clear.
      const r = Math.sqrt(minRadius * minRadius + float() * (maxRadius * maxRadius - minRadius * minRadius));
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
    }
    const radial = Math.hypot(x, z);
    const h = heightAt(x, z);
    const angle = Math.atan2(z, x);
    if (accept && !accept({ x, z, h, radial, angle })) continue;
    if (minSpacing > 0 && grid.hasNeighbor(x, z, minSpacing)) continue;
    grid.add(x, z);
    placements.push({ x, z, h, radial, angle });
  }
  return placements;
}


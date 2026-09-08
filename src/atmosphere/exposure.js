/**
 * Authored shelter/exposure classification (add-atmosphere-weather-system
 * task 3.2, design D5). Builders declare up to 16 zones as roof-height x/z
 * rectangles:
 *
 *   { id, rect: { minX, maxX, minZ, maxZ }, roofY, exposure,
 *     priority, feather = 0.5, audio: {...}, acoustic: {...} }
 *
 * Rules pinned here (all deterministic — no randomness, no raycasts):
 *   - a point fully outside every zone has exposure 1 (fully exposed);
 *   - closed rectangle boundaries; inside a zone the exposure moves from
 *     the outdoor value 1 toward the zone's authored `exposure` across a
 *     feather band of `feather` units straddling each boundary (clamped
 *     smoothstep, so the boundary itself mixes exactly halfway);
 *   - overlap is deterministic: highest priority wins; equal priority
 *     takes the LOWER exposure; full tie resolves by lexicographic id.
 *
 * The same normalized rectangles feed the rain shader's fixed-size cover
 * uniforms (`coverUniforms`) and the CPU-side splash clipping
 * (`coverRoofAt`), so the JS mask decision and the GLSL mask stay the same
 * rule. Pure module: no Three.js, no DOM, no scene mutation.
 */

/** Zone declarations are hard-capped (design D5). */
export const MAX_EXPOSURE_ZONES = 16;

/** Default feather band width in world units (design D5). */
export const DEFAULT_ZONE_FEATHER = 0.5;

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** Smoothstep u*u*(3-2u) over an already-clamped input. */
function smoothstep01(u) {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
}

/**
 * Normalize one authored zone: finite numbers, defaults filled, feather
 * positive. Returns null for a zone that can never classify (malformed).
 */
export function normalizeZone(zone) {
  if (!zone || typeof zone !== 'object') return null;
  const rect = zone.rect;
  if (!rect) return null;
  const { minX, maxX, minZ, maxZ } = rect;
  if (![minX, maxX, minZ, maxZ].every(Number.isFinite)) return null;
  if (!(minX < maxX) || !(minZ < maxZ)) return null;
  const roofY = Number.isFinite(zone.roofY) ? zone.roofY : 3;
  const exposure = clamp01(Number.isFinite(zone.exposure) ? zone.exposure : 0);
  const priority = Number.isFinite(zone.priority) ? zone.priority : 0;
  const feather = Number.isFinite(zone.feather) && zone.feather > 0 ? zone.feather : DEFAULT_ZONE_FEATHER;
  return {
    id: typeof zone.id === 'string' && zone.id.length > 0 ? zone.id : 'zone',
    rect: { minX, maxX, minZ, maxZ },
    roofY,
    exposure,
    priority,
    feather,
    audio: zone.audio ?? null,
    acoustic: zone.acoustic ?? null,
  };
}

/**
 * Normalize and select the authoritative zone list: at most
 * MAX_EXPOSURE_ZONES valid zones, ordered deterministically with the same
 * total order classification uses (priority descending, exposure ascending,
 * id ascending) so index-based consumers (shader uniform slots) are stable
 * regardless of builder declaration order.
 */
export function normalizeZones(zones) {
  const list = [];
  if (Array.isArray(zones)) {
    for (const zone of zones) {
      const normalized = normalizeZone(zone);
      if (normalized) list.push(normalized);
      if (list.length >= MAX_EXPOSURE_ZONES) break;
    }
  }
  list.sort(zonePrecedes);
  return list;
}

/**
 * Signed inside distance of a point from a rectangle's boundary: positive
 * inside (distance to the nearest edge), negative outside (euclidean
 * distance to the rectangle). d = 0 exactly on the boundary.
 */
export function signedInsideDistance(rect, x, z) {
  const insideDx = Math.min(x - rect.minX, rect.maxX - x);
  const insideDz = Math.min(z - rect.minZ, rect.maxZ - z);
  const inside = Math.min(insideDx, insideDz);
  if (inside >= 0) return inside;
  const dx = Math.max(rect.minX - x, 0, x - rect.maxX);
  const dz = Math.max(rect.minZ - z, 0, z - rect.maxZ);
  return -Math.hypot(dx, dz);
}

/** Zone influence weight at a point: 0 outside the feather band, 1 past it
 * inside, smoothstep between; exactly 0.5 on the boundary itself. */
export function zoneWeight(zone, x, z) {
  const d = signedInsideDistance(zone.rect, x, z);
  // Feather band straddles the boundary: from d = -feather (weight 0) to
  // d = +feather (weight 1), clamped smoothstep in between.
  return smoothstep01((d + zone.feather) / (2 * zone.feather));
}

function zonePrecedence(zone) {
  // Ascending "winner-first" order: higher priority, then the SHIELDING
  // zone (lower exposure), then lexical id — a total order, so overlaps
  // never flicker. normalizeZones sorts with this same comparator, so
  // uniform slots and classification agree.
  return [-zone.priority, zone.exposure, zone.id];
}

function zonePrecedes(a, b) {
  const pa = zonePrecedence(a);
  const pb = zonePrecedence(b);
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

/**
 * Classify a point against the normalized zones, writing into the retained
 * `out` and returning it: `{ exposure, zoneId, weight }`. Outside every
 * zone's feather band exposure is 1 and zoneId is null. Overlapping zones
 * resolve by `zonePrecedes`; the winner's weight feathers its exposure.
 * `exposure` stays clamped to [0, 1] (0 = fully sheltered, 1 = open sky).
 */
export function classifyExposure(zones, x, z, out = {}) {
  let winner = null;
  let winnerWeight = 0;
  for (const zone of zones) {
    const weight = zoneWeight(zone, x, z);
    if (weight <= 0) continue;
    if (winner === null || zonePrecedes(zone, winner) < 0) {
      winner = zone;
      winnerWeight = weight;
    }
  }
  if (!winner) {
    out.exposure = 1;
    out.zoneId = null;
    out.weight = 0;
    return out;
  }
  // Full weight returns the authored value byte-exactly (no blend float dust).
  out.exposure = winnerWeight >= 1 ? winner.exposure : clamp01(1 + (winner.exposure - 1) * winnerWeight);
  out.zoneId = winner.id;
  out.weight = winnerWeight;
  return out;
}

/**
 * The roof plane that clips a 3D sample point, or null when the point is
 * unsheltered: returns the winning zone's roofY when the point sits inside
 * that zone's rectangle (closed boundary, no feather — shelter geometry is
 * a hard mask) at or below its roof height. This is the exact rule the rain
 * shader implements per segment vertex (uCovers/uRoofY uniforms), kept in
 * JS so tests and the GLSL agree.
 */
export function coverRoofAt(zones, x, y, z) {
  let roof = null;
  for (const zone of zones) {
    const { rect } = zone;
    if (x < rect.minX || x > rect.maxX || z < rect.minZ || z > rect.maxZ) continue;
    if (y > zone.roofY) continue;
    if (roof === null || zonePrecedes(zone, roof.zone) < 0) roof = { zone };
  }
  return roof ? roof.zone.roofY : null;
}

/**
 * Fixed-size uniform payload for the precipitation shaders: `covers[i]` is
 * (minX, minZ, maxX, maxZ) and `roofY[i]` the clip plane; extra slots are
 * zero-filled and inactive. Returned arrays are retained by the caller.
 */
export function coverUniforms(zones, covers, roofY) {
  const count = Math.min(zones.length, MAX_EXPOSURE_ZONES);
  for (let i = 0; i < count; i++) {
    const { rect } = zones[i];
    covers[i * 4] = rect.minX;
    covers[i * 4 + 1] = rect.minZ;
    covers[i * 4 + 2] = rect.maxX;
    covers[i * 4 + 3] = rect.maxZ;
    roofY[i] = zones[i].roofY;
  }
  for (let i = count; i < MAX_EXPOSURE_ZONES; i++) {
    covers[i * 4] = 0;
    covers[i * 4 + 1] = 0;
    covers[i * 4 + 2] = 0;
    covers[i * 4 + 3] = 0;
    roofY[i] = 0;
  }
  return count;
}

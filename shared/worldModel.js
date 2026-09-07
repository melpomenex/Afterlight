/**
 * Pure world-model rules shared by the Node server and the parity fixture
 * exporter (and re-implemented — fixture-pinned — by the Elixir world
 * runtime). Node semantics: finite checks + `!!` flag coercion, NO bounds
 * clamping. The P3 Elixir runtime adds a documented server-side clamp
 * (deliberate tightening #1) on top of these semantics.
 */

/**
 * Validate and coerce a client movement pose. Returns the sanitized pose
 * (same x/z/rotY values, boolean flags) or null when any coordinate is
 * non-finite — mirroring `server/world.js updateMovement` exactly.
 */
export function sanitizeMovement(pose) {
  if (!pose || typeof pose !== 'object') return null;
  const { x, z, rotY, walking, sitting, airborne } = pose;
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(rotY)) {
    return null;
  }
  return {
    x,
    z,
    rotY,
    walking: !!walking,
    sitting: !!sitting,
    airborne: !!airborne,
  };
}

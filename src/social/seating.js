/**
 * Reusable sitting: pure seat normalization, safe dismount choice and one
 * injected seat controller. Seats are ordinary interactable items — no
 * reservation, no durable occupancy, no network seat ids. The existing
 * sitting/airborne wire flags stay the only pose representation.
 *
 * A seat item is either a historical Theater seat (no extended metadata —
 * its facing, seated offset and clear front dismount are reproduced exactly)
 * or an explicitly authored pose:
 *
 *   { type: 'seat', id, x, z,
 *     sit: { x, y: 0, z, rotY },          // world-space sitting pose
 *     dismount: [{ x, z }, ...],          // 1-4 authored escape candidates
 *     groupId?, acousticZoneId?, animationProfile: 'folded' }
 */

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

// The exact legacy Theater offsets: the seated spot sits just inside the
// chair's collision rectangle and standing steps 0.8 units out the way the
// chair faces (rotY = PI, toward the screen).
export const LEGACY_SEAT_POSE = Object.freeze({
  sitZOffset: -0.08,
  rotY: Math.PI,
  standZOffset: -0.8,
});

export const SEAT_ANIMATION_PROFILES = Object.freeze(['folded']);
const MAX_DISMOUNT_POINTS = 4;

function readDismountPoint(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return `${label} must be a { x, z } point`;
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.z)) return `${label} must have finite x and z`;
  return null;
}

/**
 * Normalize one seat item to the full seated contract. Legacy seats
 * (missing `sit`) normalize to the exact historical Theater offsets; every
 * other seat must declare an explicit pose and 1-4 dismount candidates.
 * Throws with a readable authoring message — invalid seat metadata is a
 * builder bug that tests must catch, not a silent fallback.
 */
export function normalizeSeat(item) {
  if (!item || typeof item !== 'object') throw new Error('Seat item is not an object');
  if (item.type !== 'seat') throw new Error(`Seat item has unexpected type: ${String(item.type)}`);
  if (!isFiniteNumber(item.x) || !isFiniteNumber(item.z)) throw new Error('Seat item must have finite x and z');

  if (item.sit == null) {
    // Historical Theater seat: reproduce the existing offsets exactly.
    return Object.freeze({
      type: 'seat',
      id: item.id ?? null,
      x: item.x,
      z: item.z,
      sit: { x: item.x, y: 0, z: item.z + LEGACY_SEAT_POSE.sitZOffset, rotY: LEGACY_SEAT_POSE.rotY },
      dismount: [{ x: item.x, z: item.z + LEGACY_SEAT_POSE.standZOffset }],
      groupId: item.groupId ?? null,
      acousticZoneId: item.acousticZoneId ?? null,
      animationProfile: 'folded',
      title: item.title,
      sub: item.sub,
      legacy: true,
    });
  }

  const sit = item.sit;
  if (typeof sit !== 'object' || Array.isArray(sit)) throw new Error('Seat sit pose must be a { x, y, z, rotY } object');
  if (!isFiniteNumber(sit.x) || !isFiniteNumber(sit.z)) throw new Error('Seat sit pose must have finite x and z');
  if (sit.y != null && sit.y !== 0) throw new Error('Seat sit pose y must stay zero: seated avatars and remote poses assume ground level');
  if (!isFiniteNumber(sit.rotY)) throw new Error('Seat sit pose must declare a finite rotY (the avatar faces where the seat faces)');

  const dismount = item.dismount;
  if (!Array.isArray(dismount) || dismount.length < 1 || dismount.length > MAX_DISMOUNT_POINTS) {
    throw new Error(`Seat dismount must list 1-${MAX_DISMOUNT_POINTS} authored escape points`);
  }
  const points = dismount.map((point, i) => {
    const problem = readDismountPoint(point, `Seat dismount[${i}]`);
    if (problem) throw new Error(problem);
    return { x: point.x, z: point.z };
  });

  const profile = item.animationProfile ?? 'folded';
  if (!SEAT_ANIMATION_PROFILES.includes(profile)) {
    throw new Error(`Unknown seat animationProfile: ${String(profile)}`);
  }

  return Object.freeze({
    type: 'seat',
    id: item.id ?? null,
    x: item.x,
    z: item.z,
    sit: { x: sit.x, y: 0, z: sit.z, rotY: sit.rotY },
    dismount: points.map(point => Object.freeze({ ...point })),
    groupId: item.groupId ?? null,
    acousticZoneId: item.acousticZoneId ?? null,
    animationProfile: profile,
    title: item.title,
    sub: item.sub,
    legacy: false,
  });
}

/**
 * Choose where a standing player lands: the first authored dismount point
 * that is currently walkable, otherwise the place's verified safe spawn.
 * The spawned fallback keeps the escape guaranteed even when every authored
 * point is blocked.
 */
export function chooseDismount(seat, { bounds, obstacles = [], isWalkable, spawn }) {
  for (const point of seat?.dismount ?? []) {
    if (isWalkable(bounds, obstacles, point.x, point.z)) {
      return { x: point.x, z: point.z, fallback: false };
    }
  }
  const safe = Array.isArray(spawn) ? { x: spawn[0], z: spawn[1] } : spawn;
  if (!safe || !isFiniteNumber(safe.x) || !isFiniteNumber(safe.z)) {
    // Last resort: step out in front of the seat the way it faces — the
    // historical standZ behavior — rather than trap the avatar.
    return { x: seat.x, z: seat.z + LEGACY_SEAT_POSE.standZOffset, fallback: true };
  }
  return { x: safe.x, z: safe.z, fallback: true };
}

/**
 * The one seat controller. Sequencing matches the historical sitOn/standUp
 * exactly: apply the pose, clear the old movement intent through the
 * injected apply hooks, send the pose flags (the ~12 Hz movement throttle
 * may drop the immediate packet; the frame loop's next permitted send
 * carries `!!controller.current` so the pose always lands), then notify the
 * active place controller (only the Theater's adapter turns that into
 * cinema view) and announce to the player.
 */
export function createSeatController({
  applySit,        // (seat, pose) -> void: snap the avatar into the chair, fold legs
  applyStand,      // (seat, point) -> void: place the avatar, unfold legs, clear jump
  sendMovement,    // (sitting) -> void: transmit the pose flags
  onSeatChanged = null, // ({ seated, seat, point?, fallback? }) -> void
  announce = null, // (seat) -> void: player-facing seat toast
  worldFacts = null,   // () => ({ bounds, obstacles, spawn }) for dismount choice
  chooseDismountPoint = null, // (seat) => { x, z, fallback? } overrides the default chooser
}) {
  if (typeof applySit !== 'function') throw new Error('createSeatController requires applySit');
  if (typeof applyStand !== 'function') throw new Error('createSeatController requires applyStand');
  if (typeof sendMovement !== 'function') throw new Error('createSeatController requires sendMovement');

  let current = null;

  function dismountPoint(seat) {
    if (typeof chooseDismountPoint === 'function') return chooseDismountPoint(seat);
    const facts = worldFacts?.() ?? null;
    if (!facts || typeof facts.isWalkable !== 'function') {
      // No world facts injected (or partial ones): trust the authored
      // candidates in order; chooseDismount's last resort keeps the
      // historical front-step escape rather than trapping the avatar.
      return chooseDismount(seat, { isWalkable: () => true, spawn: null });
    }
    return chooseDismount(seat, facts);
  }

  return {
    get current() { return current; },

    sit(item) {
      if (current) return null; // already seated: the guard stays exact
      const seat = normalizeSeat(item);
      current = seat;
      applySit(seat, seat.sit);
      sendMovement(true);
      try {
        onSeatChanged?.({ seated: true, seat });
      } catch { /* place presentation stays best-effort */ }
      announce?.(seat);
      return seat;
    },

    stand() {
      if (!current) return null;
      const seat = current;
      const point = dismountPoint(seat);
      current = null;
      applyStand(seat, point);
      sendMovement(false);
      try {
        onSeatChanged?.({ seated: false, seat, point, fallback: point?.fallback === true });
      } catch { /* place presentation stays best-effort */ }
      return point;
    },
  };
}

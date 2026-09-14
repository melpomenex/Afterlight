/**
 * Server-authoritative activity availability state (client presentation).
 *
 * The server pushes one additive `activity_availability` snapshot per world
 * join: the admission-gated games it currently has closed. Clients use it to
 * present those cabinets as coming soon instead of advertising a cabinet the
 * server is guaranteed to reject — presentation only, never permission. The
 * activity join path on the server remains the authority.
 *
 * Pure module: no DOM, no network, node-testable.
 */

export const EMPTY_ACTIVITY_AVAILABILITY = Object.freeze({
  roomId: null,
  closedById: Object.freeze(new Map()),
  closedTypes: Object.freeze(new Set()),
});

/**
 * Normalize an `activity_availability` frame into lookup state.
 * Malformed or room-mismatched frames normalize to the empty state.
 *
 * @param {object|null} frame `{ roomId, closed: [{ id, type, title }] }`
 * @param {{ roomId?: string|null }} [scope] active-room scope; a frame for
 *   another room is ignored (stale flushes never leak across travel)
 * @returns {object} frozen `{ roomId, closedById: Map, closedTypes: Set }`
 */
export function normalizeActivityAvailability(frame, { roomId: activeRoomId = null } = {}) {
  if (!frame || typeof frame !== 'object' || !Array.isArray(frame.closed)) {
    return EMPTY_ACTIVITY_AVAILABILITY;
  }
  const frameRoom = typeof frame.roomId === 'string' ? frame.roomId : null;
  if (activeRoomId && frameRoom && frameRoom !== activeRoomId) {
    return EMPTY_ACTIVITY_AVAILABILITY;
  }

  const closedById = new Map();
  const closedTypes = new Set();
  for (const row of frame.closed) {
    if (!row || typeof row !== 'object') continue;
    const id = typeof row.id === 'string' && row.id.length > 0 ? row.id.slice(0, 64) : null;
    const type = typeof row.type === 'string' && row.type.length > 0 ? row.type.slice(0, 64) : null;
    if (!id && !type) continue;
    if (id) {
      closedById.set(id, {
        id,
        type,
        title: typeof row.title === 'string' && row.title.length > 0 ? row.title.slice(0, 64) : id,
      });
    }
    if (type) closedTypes.add(type);
  }
  return Object.freeze({ roomId: frameRoom, closedById, closedTypes });
}

/**
 * True when the server marked this activity (by id, falling back to type)
 * closed in the latest snapshot. Unknown/absent state never blocks play —
 * an old server that never sends availability keeps every cabinet playable.
 *
 * @param {object} state normalized availability state
 * @param {object} activityDef `{ id, type }` manifest activity definition
 */
export function isActivityClosed(state, activityDef) {
  if (!state || !activityDef) return false;
  if (activityDef.id && state.closedById?.has(activityDef.id)) return true;
  if (activityDef.type && state.closedTypes?.has(activityDef.type)) return true;
  return false;
}

/**
 * Player-facing label for a closed activity cabinet, consistent with the
 * game's quiet tone.
 *
 * @param {object|null} closedRow `{ title }` from the snapshot, when known
 * @param {object} activityDef manifest activity (fallback title)
 */
export function closedActivityLabel(closedRow, activityDef) {
  const title = closedRow?.title || activityDef?.title || 'This cabinet';
  return {
    title,
    sub: 'Coming soon · not open on this server',
  };
}

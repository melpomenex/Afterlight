/**
 * Shared seat/snapshot binding for place activities.
 *
 * Many table games defined `onJoin` / `onLeave` but never polled the
 * participation controller, so pressing E seated the avatar and left the
 * HUD dark. Chess already did this per frame; this helper is that pattern
 * without copying it into every module.
 *
 * Snapshot envelopes from SessionServer nest the rules state at
 * `state.sim`. Reading `envelope.state` first treats the lobby wrapper as
 * the sim and drops turn/score/board fields.
 */

export function extractActivitySim(envelope) {
  if (!envelope || typeof envelope !== 'object') return null;
  return (
    envelope.sim ||
    envelope.simState ||
    envelope.state?.sim ||
    envelope.state?.simState ||
    envelope.state ||
    envelope
  );
}

/**
 * @param {object} opts
 * @param {Function} [opts.getParticipation]
 * @param {string} opts.activityId
 * @param {boolean} opts.isParticipant
 * @param {Function} opts.onJoin
 * @param {Function} opts.onLeave
 * @returns {boolean} whether this instance is now the local participant
 */
export function bindParticipation({
  getParticipation = null,
  activityId,
  isParticipant,
  onJoin,
  onLeave,
} = {}) {
  const p = getParticipation?.();
  const mine = !!(p?.isParticipating && p.currentActivity?.id === activityId);
  const slot = typeof p?.currentSlot === 'number' ? p.currentSlot : null;
  const rawRole = p?.currentRole || p?.role;
  const role = rawRole === 'watch' || rawRole === 'spectator' ? 'spectator' : 'player';

  if (mine && !isParticipant && slot != null) {
    onJoin?.({ slot, role });
    return true;
  }
  if (!mine && isParticipant) {
    onLeave?.();
    return false;
  }
  return !!isParticipant;
}

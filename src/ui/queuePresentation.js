/**
 * Visible queue / next-player / winner-stays copy for pool, air hockey, foosball.
 * Pure: formats authoritative snapshots. Never invents a winner.
 */

export const WINNER_STAYS_TYPES = Object.freeze(['pool', 'air-hockey', 'foosball']);

const NO_WINNER_REASONS = new Set(['aborted', 'tie', 'draw', 'both_left']);

export function isWinnerStaysType(type) {
  return WINNER_STAYS_TYPES.includes(type);
}

export function inventsWinner(outcome) {
  if (!outcome || typeof outcome !== 'object') return false;
  const reason = String(outcome.reason || outcome.reasonCode || '');
  if (NO_WINNER_REASONS.has(reason)) return false;
  return typeof outcome.winner === 'string' && outcome.winner.length > 0;
}

/**
 * Queue rows with 1-based positions. Uses server `position` when present.
 */
export function queueRows(state) {
  const raw = state?.queue ?? state?.state?.queue ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, i) => {
    const playerId = typeof entry === 'string' ? entry : entry?.playerId;
    const position = Number.isSafeInteger(entry?.position) && entry.position > 0 ? entry.position : i + 1;
    return { playerId, position };
  }).filter((row) => typeof row.playerId === 'string' && row.playerId.length > 0);
}

export function queuePositionFor(state, playerId) {
  if (!playerId) return null;
  const row = queueRows(state).find((r) => r.playerId === playerId);
  return row ? row.position : null;
}

/**
 * Next eligible player: current offer, else FIFO head.
 */
export function nextPlayerId(state) {
  if (typeof state?.nextPlayer === 'string' && state.nextPlayer) return state.nextPlayer;
  const offers = state?.offers ?? state?.state?.offers;
  if (Array.isArray(offers) && offers[0]?.playerId) return offers[0].playerId;
  if (offers && typeof offers === 'object' && !Array.isArray(offers)) {
    const first = Object.values(offers)[0];
    if (first?.playerId) return first.playerId;
  }
  const rows = queueRows(state);
  return rows[0]?.playerId ?? null;
}

export function winnerKeepsSlot(outcome, { present = false, willing = false } = {}) {
  if (!inventsWinner(outcome)) return false;
  return present === true && willing === true;
}

/**
 * After a series: which slots stay / empty. Ties, aborts, both-leave invent
 * no winner. Winner keeps a slot only if present and willing.
 */
export function rotationPlan({
  outcome = null,
  seated = [],
  winnerPresent = false,
  winnerWilling = false,
  queueLength = 0,
} = {}) {
  const slots = seated.map((p) => p.slot).filter((s) => s === 0 || s === 1 || Number.isInteger(s));
  if (!inventsWinner(outcome) || !winnerKeepsSlot(outcome, { present: winnerPresent, willing: winnerWilling })) {
    return {
      inventWinner: false,
      keepSlots: [],
      vacateSlots: slots,
      offerBoth: true,
      waiting: queueLength === 0,
    };
  }
  const winnerSlot = seated.find((p) => p.playerId === outcome.winner)?.slot;
  const keep = winnerSlot === 0 || winnerSlot === 1 || Number.isInteger(winnerSlot) ? [winnerSlot] : [];
  const vacate = slots.filter((s) => !keep.includes(s));
  return {
    inventWinner: false,
    keepSlots: keep,
    vacateSlots: vacate,
    offerBoth: false,
    waiting: vacate.length > 0 && queueLength === 0 && keep.length > 0,
  };
}

export function describeQueue(state, localPlayerId = null) {
  const rows = queueRows(state);
  const position = queuePositionFor(state, localPlayerId);
  const next = nextPlayerId(state);
  const winnerStays = state?.winnerStays === true || state?.state?.winnerStays === true;
  const outcome = state?.matchOutcome || state?.state?.matchOutcome || null;
  const parts = [];
  if (position) parts.push(`You are #${position} in line`);
  else if (rows.length > 0) parts.push(`${rows.length} waiting`);
  if (next) parts.push(next === localPlayerId ? 'You are next' : 'Next player is ready');
  if (winnerStays) parts.push(inventsWinner(outcome) ? 'Winner stays if they remain' : 'Winner stays is on');
  if (!inventsWinner(outcome) && (outcome?.reason === 'aborted' || outcome?.reason === 'tie')) {
    parts.push('No winner — seats open in line order');
  }
  return {
    position,
    nextPlayer: next,
    winnerStays,
    queueLength: rows.length,
    text: parts.join(' · ') || 'Table is waiting',
  };
}

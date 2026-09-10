/**
 * Truthful activity discovery helpers for Places and nearby HUD.
 * Unknown, stale (>10s), or offline data is unavailable — never zero/empty.
 * Playing / watching / queued are separate; they are never summed as one count.
 */

export const ACTIVITY_SUMMARY_TTL_MS = 10_000;

export function sanitizeActivitySummaries(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const id = typeof row.id === 'string' ? row.id.slice(0, 64) : '';
    const type = typeof row.type === 'string' ? row.type.slice(0, 64) : '';
    if (!id && !type) continue;
    const playing = Number.isSafeInteger(row.playing) && row.playing >= 0 ? row.playing : null;
    const watching = Number.isSafeInteger(row.watching) && row.watching >= 0 ? row.watching : null;
    const queued = Number.isSafeInteger(row.queued) && row.queued >= 0 ? row.queued : null;
    out.push({
      id: id || type,
      type: type || id,
      playing,
      watching,
      queued,
      status: typeof row.status === 'string' ? row.status.slice(0, 32) : null,
    });
    if (out.length >= 8) break;
  }
  return out;
}

export function summariesFresh(fetchedAt, now, ttl = ACTIVITY_SUMMARY_TTL_MS) {
  if (!Number.isFinite(fetchedAt)) return false;
  return now - fetchedAt <= ttl;
}

/**
 * A table looks occupied when a fresh playing count is > 0.
 * Stale/unknown never claims empty.
 */
export function tableLooksOccupied(summaries, { fresh = true } = {}) {
  if (!fresh || !Array.isArray(summaries) || summaries.length === 0) return false;
  return summaries.some((row) => Number.isSafeInteger(row.playing) && row.playing > 0);
}

export function anyCountUnknown(summaries) {
  if (!Array.isArray(summaries) || summaries.length === 0) return true;
  return summaries.some((row) => row.playing == null && row.watching == null && row.queued == null);
}

/**
 * Compact line. Categories stay separate — never "5 people" from 2+3+1.
 */
export function formatActivityLine(summaries, { fresh = true, typeLabel = labelForType } = {}) {
  if (!fresh) return { text: 'Tables unknown', unknown: true, occupied: false };
  if (!Array.isArray(summaries) || summaries.length === 0) {
    return { text: '', unknown: true, occupied: false };
  }
  const parts = [];
  let occupied = false;
  for (const row of summaries) {
    const bits = [];
    if (Number.isSafeInteger(row.playing)) {
      bits.push(`${row.playing} playing`);
      if (row.playing > 0) occupied = true;
    }
    if (Number.isSafeInteger(row.watching)) bits.push(`${row.watching} watching`);
    if (Number.isSafeInteger(row.queued)) bits.push(`${row.queued} queued`);
    if (bits.length === 0) {
      parts.push(`${typeLabel(row.type)} unknown`);
      continue;
    }
    parts.push(`${typeLabel(row.type)} · ${bits.join(' · ')}`);
  }
  if (parts.length === 0) return { text: 'Tables unknown', unknown: true, occupied: false };
  return { text: parts.join(' · '), unknown: false, occupied };
}

export function labelForType(type) {
  switch (type) {
    case 'pool': return 'Pool';
    case 'air-hockey': return 'Air hockey';
    case 'foosball': return 'Foosball';
    case 'pong': return 'Pong';
    case 'kart-royale': return 'Kart Royale';
    default: return type ? String(type).replace(/-/g, ' ') : 'Table';
  }
}

/**
 * Occupancy copy that will not call an occupied table empty.
 * Unknown occupancy stays "—".
 */
export function describePlaceOccupancy(occupancy, { occupiedTable = false, occupancyKnown = false } = {}) {
  if (!occupancyKnown) {
    return { text: '—', label: 'Occupancy unknown', empty: false };
  }
  if (occupancy === 0 && occupiedTable) {
    return { text: 'Tables occupied', label: 'A table is occupied', empty: false };
  }
  if (occupancy === 0) {
    return { text: 'Empty right now', label: 'Nobody here right now', empty: true };
  }
  return { text: `${occupancy} here`, label: `${occupancy} here now`, empty: false };
}

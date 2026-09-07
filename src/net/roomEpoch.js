/**
 * Per-room epoch tracking for distributed ownership (P9).
 * Clients discard any room-scoped frame whose epoch is lower than the
 * newest seen for that room.
 */

const ROOM_SCOPED_TYPES = new Set([
  'presence_update',
  'presence_join',
  'presence_leave',
  'emote_broadcast',
  'theater_state',
  'torrent_state',
  'garden_state',
  'welcome',
]);

/**
 * @param {Map<string, number>} epochs
 * @param {string | null | undefined} roomId
 * @param {{ type?: string, epoch?: number, roomId?: string }} frame
 * @returns {boolean} true when the frame should be applied
 */
export function shouldApplyRoomFrame(epochs, roomId, frame) {
  if (!frame?.type || !ROOM_SCOPED_TYPES.has(frame.type)) return true;
  const epoch = typeof frame.epoch === 'number' ? frame.epoch : 0;
  const key = roomId || frame.roomId || '_default';
  const newest = epochs.get(key) ?? 0;
  if (epoch < newest) return false;
  if (epoch > newest) epochs.set(key, epoch);
  return true;
}

/** Jittered reconnect delay after lease loss / directed failover (ms). */
export function jitteredRejoinDelay(baseMs = 1000) {
  const jitter = Math.floor(Math.random() * baseMs);
  return baseMs + jitter;
}

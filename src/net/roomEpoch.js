/**
 * Per-room epoch tracking for distributed ownership (P9) plus the travel
 * room filter (add-social-place-framework D3, task 3.2). Clients discard
 * any room-scoped frame whose epoch is lower than the newest seen for that
 * room, and any TAGGED frame whose roomId is not the desired room — the
 * latter before any epoch bookkeeping. Server world frames and rt_binary
 * envelopes carry the additive `roomId` tag; untagged legacy frames keep
 * the pre-tag behavior.
 */

const ROOM_SCOPED_TYPES = new Set([
  'presence_update',
  'presence_join',
  'presence_leave',
  'emote_broadcast',
  'theater_state',
  'torrent_state',
  // Playback grants are targeted and room-tagged: a queued old-room grant
  // must never authorize the new room's stream (fix-torrent-playback-grant-
  // regression).
  'torrent_grant',
  'welcome',
  // Room atmosphere (add-atmosphere-weather-system 2.2): snapshots are
  // room-scoped, so a queued old-room frame — even carrying a higher
  // epoch — is rejected by room identity before any epoch bookkeeping.
  'atmosphere_state',
  // Place activities program (P1): activity envelopes are room-scoped.
  'activity_state',
  'activity_event',
  'activity_result',
  'activity_error',
  // Join-time closed-game snapshots are room-tagged the same way: a queued
  // old-room availability frame must never mark the new room's cabinets.
  'activity_availability',
]);

/**
 * Travel isolation (add-social-place-framework D3, task 3.2): true when a
 * tagged envelope — a JSON world frame or the outer rt_binary envelope —
 * belongs to the desired room. Absent tags are legacy (old servers never
 * tagged anything) and always apply. This is the explicit wrong-room
 * filter the epoch helper needs: one game:v1 transport multiplexes rooms,
 * so stale output is rejected by room identity BEFORE any bookkeeping,
 * never by epoch arithmetic alone.
 *
 * @param {string | null | undefined} desiredRoom
 * @param {string | null | undefined} taggedRoomId
 * @returns {boolean}
 */
export function envelopeMatchesRoom(desiredRoom, taggedRoomId) {
  if (typeof taggedRoomId !== 'string') return true; // untagged legacy
  if (typeof desiredRoom !== 'string') return true; // no room joined yet: nothing to mismatch
  return taggedRoomId === desiredRoom;
}

/**
 * @param {Map<string, number>} epochs
 * @param {string | null | undefined} roomId the desired room (desiredRoom)
 * @param {{ type?: string, epoch?: number, roomEpoch?: number, roomId?: string }} frame
 * @returns {boolean} true when the frame should be applied
 */
export function shouldApplyRoomFrame(epochs, roomId, frame) {
  if (!frame?.type || !ROOM_SCOPED_TYPES.has(frame.type)) return true;
  // Wrong-room rejection happens BEFORE any epoch bookkeeping: a queued
  // old-room frame (even carrying a higher epoch) must neither update the
  // old room's entry nor leak into the new room's epoch key.
  if (!envelopeMatchesRoom(roomId, frame.roomId)) return false;
  // Bill snapshots (theater_state, etc.) and other authoritative frames
  // often omit epoch; only compare when the server stamped one explicitly.
  const rawEpoch = typeof frame.roomEpoch === 'number' ? frame.roomEpoch : frame.epoch;
  if (typeof rawEpoch !== 'number') return true;
  const epoch = rawEpoch;
  // Tagged frames key by their explicit room when the desired room is not
  // known yet; untagged legacy frames keep keying by desiredRoom.
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

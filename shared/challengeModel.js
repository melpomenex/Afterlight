/**
 * Direct activity challenges — pure invite state, limits, and validators.
 *
 * Acceptance never teleports or auto-seats. Blocked senders do not deliver.
 * One pending invite per sender; at most three invites per minute; 30s expiry.
 *
 * Spec: openspec/changes/add-place-activities-program/specs/activity-social-layer
 */

export const CHALLENGE_EXPIRY_MS = 30_000;
export const CHALLENGE_MAX_PER_MINUTE = 3;
export const CHALLENGE_RATE_WINDOW_MS = 60_000;
export const CHALLENGE_MAX_ID_LENGTH = 64;

export const CHALLENGE_COMMANDS = Object.freeze({
  INVITE: 'activity_challenge',
  RESPOND: 'activity_challenge_respond',
  MUTE: 'activity_challenge_mute',
  BLOCK: 'activity_challenge_block',
});

export const CHALLENGE_EVENTS = Object.freeze({
  INVITE: 'activity_challenge',
  RESULT: 'activity_challenge_result',
});

export const CHALLENGE_STATUSES = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  STALE: 'stale',
  UNAVAILABLE: 'unavailable',
});

export const CHALLENGE_ERRORS = Object.freeze({
  INVALID_REQUEST: 'invalid_request',
  RATE_LIMITED: 'rate_limited',
  PENDING_INVITE: 'pending_invite',
  EXPIRED: 'challenge_expired',
  TARGET_UNAVAILABLE: 'target_unavailable',
  NOT_FOUND: 'challenge_not_found',
  BLOCKED: 'not_delivered',
  MUTED: 'not_delivered',
  UNAVAILABLE: 'challenges_unavailable',
  UNAUTHORIZED: 'unauthorized',
});

function isValidId(val) {
  return typeof val === 'string' && val.length > 0 && val.length <= CHALLENGE_MAX_ID_LENGTH;
}

function clipName(val) {
  if (typeof val !== 'string') return '';
  return val.slice(0, CHALLENGE_MAX_ID_LENGTH);
}

/**
 * Validates an invite command: named target + activity, optional requestId.
 */
export function validateChallengeInvite(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }
  const { requestId, activityId, targetId, targetName } = payload;
  if (requestId !== undefined && !isValidId(requestId)) {
    return { valid: false, error: 'requestId must be a non-empty string <= 64 chars' };
  }
  if (!isValidId(activityId)) {
    return { valid: false, error: 'activityId must be a non-empty string <= 64 chars' };
  }
  const named = targetId || targetName;
  if (!isValidId(named)) {
    return { valid: false, error: 'targetId or targetName must name a player' };
  }
  return {
    valid: true,
    sanitized: {
      ...(requestId ? { requestId } : {}),
      activityId,
      targetId: clipName(targetId || targetName),
    },
  };
}

/**
 * Validates accept/decline. Accepting does not join, seat, or travel.
 */
export function validateChallengeRespond(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }
  const { requestId, inviteId, accept } = payload;
  if (requestId !== undefined && !isValidId(requestId)) {
    return { valid: false, error: 'requestId must be a non-empty string <= 64 chars' };
  }
  if (!isValidId(inviteId)) {
    return { valid: false, error: 'inviteId must be a non-empty string <= 64 chars' };
  }
  if (typeof accept !== 'boolean') {
    return { valid: false, error: 'accept must be a boolean' };
  }
  return {
    valid: true,
    sanitized: {
      ...(requestId ? { requestId } : {}),
      inviteId,
      accept,
    },
  };
}

export function validateChallengeMute(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }
  if (typeof payload.muted !== 'boolean') {
    return { valid: false, error: 'muted must be a boolean' };
  }
  return { valid: true, sanitized: { muted: payload.muted } };
}

export function validateChallengeBlock(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }
  if (!isValidId(payload.playerId)) {
    return { valid: false, error: 'playerId must be a non-empty string <= 64 chars' };
  }
  const blocked = payload.blocked !== false;
  return { valid: true, sanitized: { playerId: payload.playerId, blocked } };
}

/**
 * True when an invite's clock has passed expiry (default 30s).
 */
export function isChallengeExpired(invite, now = Date.now()) {
  if (!invite || typeof invite !== 'object') return true;
  const expiresAt = Number(invite.expiresAt);
  if (!Number.isFinite(expiresAt)) return true;
  return now >= expiresAt;
}

/**
 * Rate-limit: at most three invites in any 60s window per sender.
 * `sentAt` is a sorted-or-unsorted list of timestamps.
 */
export function allowChallengeSend(sentAt, now = Date.now()) {
  const recent = (Array.isArray(sentAt) ? sentAt : [])
    .filter((t) => Number.isFinite(t) && now - t < CHALLENGE_RATE_WINDOW_MS);
  if (recent.length >= CHALLENGE_MAX_PER_MINUTE) {
    return { ok: false, error: CHALLENGE_ERRORS.RATE_LIMITED, sentAt: recent };
  }
  return { ok: true, sentAt: [...recent, now] };
}

/**
 * Delivery gate: blocked senders never deliver; muted recipients drop invites.
 */
export function canDeliverChallenge({ senderId, targetId, blockedPairs, mutedTargets } = {}) {
  if (!isValidId(senderId) || !isValidId(targetId) || senderId === targetId) {
    return { ok: false, error: CHALLENGE_ERRORS.INVALID_REQUEST };
  }
  const blocked = blockedPairs instanceof Set ? blockedPairs : new Set(blockedPairs || []);
  if (blocked.has(`${targetId}\0${senderId}`)) {
    return { ok: false, error: CHALLENGE_ERRORS.BLOCKED };
  }
  const muted = mutedTargets instanceof Set ? mutedTargets : new Set(mutedTargets || []);
  if (muted.has(targetId)) {
    return { ok: false, error: CHALLENGE_ERRORS.MUTED };
  }
  return { ok: true };
}

/**
 * Build a pending invite record. Caller assigns unique inviteId.
 */
export function createChallengeInvite({
  inviteId,
  senderId,
  senderName = '',
  targetId,
  activityId,
  roomId = null,
  now = Date.now(),
} = {}) {
  if (!isValidId(inviteId) || !isValidId(senderId) || !isValidId(targetId) || !isValidId(activityId)) {
    return null;
  }
  return Object.freeze({
    inviteId,
    senderId,
    senderName: clipName(senderName),
    targetId,
    activityId,
    roomId: typeof roomId === 'string' ? clipName(roomId) : null,
    status: CHALLENGE_STATUSES.PENDING,
    createdAt: now,
    expiresAt: now + CHALLENGE_EXPIRY_MS,
  });
}

/**
 * Resolve accept against current table availability.
 * Acceptance never seats or travels; a stale table returns watch/queue options.
 *
 * @param {object} invite
 * @param {object} availability { available, playing, watching, queued, canWatch, canQueue }
 * @param {number} [now]
 */
export function resolveChallengeAccept(invite, availability, now = Date.now()) {
  if (!invite || invite.status !== CHALLENGE_STATUSES.PENDING) {
    return { ok: false, error: CHALLENGE_ERRORS.NOT_FOUND, teleport: false, autoSeat: false };
  }
  if (isChallengeExpired(invite, now)) {
    return {
      ok: false,
      error: CHALLENGE_ERRORS.EXPIRED,
      status: CHALLENGE_STATUSES.EXPIRED,
      teleport: false,
      autoSeat: false,
    };
  }
  const avail = availability && typeof availability === 'object' ? availability : {};
  const playing = Number.isSafeInteger(avail.playing) ? avail.playing : null;
  const watching = Number.isSafeInteger(avail.watching) ? avail.watching : null;
  const queued = Number.isSafeInteger(avail.queued) ? avail.queued : null;
  const tableOpen = avail.available === true;
  if (!tableOpen) {
    return {
      ok: true,
      status: CHALLENGE_STATUSES.STALE,
      teleport: false,
      autoSeat: false,
      highlight: false,
      availability: {
        playing,
        watching,
        queued,
        canWatch: avail.canWatch !== false,
        canQueue: avail.canQueue !== false,
      },
    };
  }
  return {
    ok: true,
    status: CHALLENGE_STATUSES.ACCEPTED,
    teleport: false,
    autoSeat: false,
    highlight: true,
    activityId: invite.activityId,
    roomId: invite.roomId,
  };
}

/**
 * Decline: no participation or room-state change.
 */
export function resolveChallengeDecline(invite, now = Date.now()) {
  if (!invite || invite.status !== CHALLENGE_STATUSES.PENDING) {
    return { ok: false, error: CHALLENGE_ERRORS.NOT_FOUND };
  }
  if (isChallengeExpired(invite, now)) {
    return { ok: true, status: CHALLENGE_STATUSES.EXPIRED, participationChanged: false };
  }
  return { ok: true, status: CHALLENGE_STATUSES.DECLINED, participationChanged: false };
}

export function blockKey(blockerId, blockedId) {
  return `${blockerId}\0${blockedId}`;
}

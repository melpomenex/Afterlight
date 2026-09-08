/**
 * Shared place activities protocol constants, limits, validators, and envelopes.
 *
 * Part of the Place Activities Program (Phase 1: Contracts and session authority).
 *
 * Specifications:
 *   - openspec/changes/add-place-activities-program/specs/activity-sessions/spec.md
 *   - openspec/changes/add-place-activities-program/specs/place-activities/spec.md
 *   - openspec/changes/add-place-activities-program/design.md (D2, D3, D4)
 */

export const ACTIVITY_PROTOCOL_VERSION = 1;

export const ACTIVITY_COMMANDS = Object.freeze({
  JOIN: 'activity_join',
  LEAVE: 'activity_leave',
  READY: 'activity_ready',
  INPUT: 'activity_input',
  RESNAPSHOT: 'activity_resnapshot',
});

export const ACTIVITY_EVENTS = Object.freeze({
  STATE: 'activity_state',
  EVENT: 'activity_event',
  RESULT: 'activity_result',
  ERROR: 'activity_error',
});

export const ACTIVITY_ROLES = Object.freeze(['play', 'watch', 'queue']);

// Summit Run (add-multiplayer-snowboard-arcade, design D7): the race adds a
// type-scoped mutation fence (matchId) and a strict controls allowlist per
// control kind. Server roles normalize from wire roles: play→player,
// watch→spectator, queue→queue.
export const SNOWBOARD_ACTIVITY_TYPE = 'snowboard-race';
export const SNOWBOARD_ROLES = Object.freeze(['play', 'watch', 'queue']);
export const SNOWBOARD_LEAVE_REASONS = Object.freeze(['exit', 'travel', 'load_failed']);
export const SNOWBOARD_COURSE_ID = 'summit-night';
export const SNOWBOARD_COURSE_VERSION = 1;

/**
 * Strict D7 controls validation for snowboard-race inputs. Returns
 * `{ valid, error?, sanitized? }`. Unknown fields are rejected (exact
 * allowlist), steer must be a finite number in [-1, 1], and the load
 * handshake must name the exact course identity (hash compared against the
 * authoritative copy by the server).
 */
export function validateSnowboardControls(controls, { courseHash = null } = {}) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be an object' };
  }

  const kind = controls.kind;

  if (kind === 'neutral') {
    const keys = Object.keys(controls);
    if (keys.length > 1) return { valid: false, error: 'neutral controls take no fields' };
    return { valid: true, sanitized: { kind: 'neutral' } };
  }

  if (kind === 'ride') {
    const allowed = ['kind', 'steer', 'tuck', 'brake', 'jumpHeld'];
    for (const key of Object.keys(controls)) {
      if (!allowed.includes(key)) return { valid: false, error: `unknown ride control field: ${key}` };
    }
    const { steer, tuck, brake, jumpHeld } = controls;
    if (!Number.isFinite(steer) || steer < -1 || steer > 1) {
      return { valid: false, error: 'steer must be a finite number in [-1, 1]' };
    }
    if (tuck !== undefined && typeof tuck !== 'boolean') {
      return { valid: false, error: 'tuck must be a boolean' };
    }
    if (brake !== undefined && typeof brake !== 'boolean') {
      return { valid: false, error: 'brake must be a boolean' };
    }
    if (jumpHeld !== undefined && typeof jumpHeld !== 'boolean') {
      return { valid: false, error: 'jumpHeld must be a boolean' };
    }
    return {
      valid: true,
      sanitized: {
        kind: 'ride',
        steer,
        tuck: tuck === true,
        brake: brake !== false,
        jumpHeld: jumpHeld === true,
      },
    };
  }

  if (kind === 'loaded') {
    const allowed = ['kind', 'courseId', 'courseVersion', 'courseHash'];
    for (const key of Object.keys(controls)) {
      if (!allowed.includes(key)) return { valid: false, error: `unknown loaded control field: ${key}` };
    }
    if (controls.courseId !== SNOWBOARD_COURSE_ID) {
      return { valid: false, error: `courseId must be ${SNOWBOARD_COURSE_ID}` };
    }
    if (controls.courseVersion !== SNOWBOARD_COURSE_VERSION) {
      return { valid: false, error: `courseVersion must be ${SNOWBOARD_COURSE_VERSION}` };
    }
    if (typeof controls.courseHash !== 'string' || !/^[0-9a-f]{64}$/.test(controls.courseHash)) {
      return { valid: false, error: 'courseHash must be sha256 hex' };
    }
    if (courseHash !== null && controls.courseHash !== courseHash) {
      return { valid: false, error: 'courseHash does not match the authoritative course' };
    }
    return {
      valid: true,
      sanitized: {
        kind: 'loaded',
        courseId: controls.courseId,
        courseVersion: controls.courseVersion,
        courseHash: controls.courseHash,
      },
    };
  }

  return { valid: false, error: 'controls.kind must be ride, neutral or loaded' };
}

/**
 * Strict D7 mutation fence for snowboard commands that require it:
 * {activityId, roomEpoch, sessionId, matchId, lease}. Additive fence fields
 * are retained by validators, never silently stripped.
 */
export function validateSnowboardFence(payload, { requireMatchId = true } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'payload must be an object' };
  }
  for (const field of ['sessionId', 'lease']) {
    const value = payload[field];
    if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
      return { valid: false, error: `fence.${field} must be a string of 1..64 chars` };
    }
  }
  if (requireMatchId) {
    const value = payload.matchId;
    if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
      return { valid: false, error: 'fence.matchId must be a string of 1..64 chars' };
    }
  }
  if (payload.roomEpoch !== undefined && !Number.isInteger(payload.roomEpoch)) {
    return { valid: false, error: 'fence.roomEpoch must be an integer when present' };
  }
  return { valid: true };
}

export const ACTIVITY_LIMITS = Object.freeze({
  MAX_INPUT_BYTES: 2048, // 2 KiB input cap
  MAX_SNAPSHOT_BYTES: 32768, // 32 KiB full snapshot cap
  MAX_INPUT_HZ: 60, // 60 messages/second per participant
  MAX_INPUT_BURST: 10, // burst tolerance
  MAX_CONTROL_HZ: 5, // 5 control actions/second
  MIN_RESNAPSHOT_INTERVAL_MS: 5000, // at most 1 resnapshot per 5 seconds
  RECONNECT_GRACE_MS: 30000, // 30 seconds reconnect grace
  IDLE_SESSION_TIMEOUT_MS: 60000, // 60 seconds empty/idle session termination
  MAX_SPECTATORS: 32, // default cap for focused spectators
  MAX_QUEUE: 16, // default cap for queued players
  MAX_ID_LENGTH: 64, // max identifier length (activityId, sessionId, requestId, lease)
});

export const ACTIVITY_ERRORS = Object.freeze({
  ACTIVITIES_UNAVAILABLE: 'activities_unavailable',
  ACTIVITY_NOT_FOUND: 'activity_not_found',
  ROOM_UNAVAILABLE: 'room_unavailable',
  INVALID_REQUEST: 'invalid_request',
  UNAUTHORIZED: 'unauthorized',
  RATE_LIMITED: 'rate_limited',
  STALE_SESSION: 'stale_session',
  STALE_EPOCH: 'stale_epoch',
  STALE_SEQUENCE: 'stale_sequence',
  SLOT_FULL: 'slot_full',
  QUEUE_FULL: 'queue_full',
  ALREADY_PARTICIPATING: 'already_participating',
  PAYLOAD_TOO_LARGE: 'payload_too_large',
  INPUT_DROPPED: 'input_dropped',
  STALE_MATCH: 'stale_match',
});

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

/**
 * Returns the UTF-8 byte length of a value when serialized to JSON.
 * @param {any} val
 * @returns {number}
 */
export function getPayloadByteLength(val) {
  if (val === undefined || val === null) return 0;
  try {
    const json = typeof val === 'string' ? val : JSON.stringify(val);
    if (!json) return 0;
    if (textEncoder) {
      return textEncoder.encode(json).length;
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.byteLength(json, 'utf8');
    }
    return unescape(encodeURIComponent(json)).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/**
 * Generates a unique, bounded activity request ID (<= 64 chars).
 * @param {string} [prefix='act_req']
 * @returns {string}
 */
export function generateActivityRequestId(prefix = 'act_req') {
  const cleanPrefix = String(prefix || 'act_req').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const id = `${cleanPrefix}_${ts}_${rand}`;
  return id.slice(0, ACTIVITY_LIMITS.MAX_ID_LENGTH);
}

function isValidStringId(val) {
  return typeof val === 'string' && val.length > 0 && val.length <= ACTIVITY_LIMITS.MAX_ID_LENGTH;
}

/**
 * Validates an activity_join command payload.
 * @param {any} payload
 * @returns {{ valid: boolean, error?: string, sanitized?: { requestId: string, activityId: string, role: string } }}
 */
export function validateActivityJoin(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }
  const { requestId, activityId, role = 'play' } = payload;
  if (!isValidStringId(requestId)) {
    return { valid: false, error: 'requestId must be a non-empty string <= 64 chars' };
  }
  if (!isValidStringId(activityId)) {
    return { valid: false, error: 'activityId must be a non-empty string <= 64 chars' };
  }
  if (!ACTIVITY_ROLES.includes(role)) {
    return { valid: false, error: `role must be one of: ${ACTIVITY_ROLES.join(', ')}` };
  }
  return {
    valid: true,
    sanitized: {
      requestId,
      activityId,
      role,
    },
  };
}

/**
 * Validates an activity_leave command payload.
 * @param {any} payload
 * @returns {{ valid: boolean, error?: string, sanitized?: { requestId: string, activityId: string, reason?: string } }}
 */
export function validateActivityLeave(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }
  const { requestId, activityId, reason, matchId } = payload;
  if (!isValidStringId(requestId)) {
    return { valid: false, error: 'requestId must be a non-empty string <= 64 chars' };
  }
  if (!isValidStringId(activityId)) {
    return { valid: false, error: 'activityId must be a non-empty string <= 64 chars' };
  }
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > ACTIVITY_LIMITS.MAX_ID_LENGTH)) {
    return { valid: false, error: 'reason must be a string <= 64 chars if provided' };
  }
  if (matchId !== undefined && !isValidStringId(matchId)) {
    return { valid: false, error: 'matchId must be a non-empty string <= 64 chars if provided' };
  }
  return {
    valid: true,
    sanitized: {
      requestId,
      activityId,
      ...(reason ? { reason } : {}),
      // Summit Run mutation fence (D7): carried through when present so the
      // authority can reject leaves signed for an older match.
      ...(matchId ? { matchId } : {}),
    },
  };
}

/**
 * Validates an activity_ready command payload.
 * @param {any} payload
 * @returns {{ valid: boolean, error?: string, sanitized?: { requestId: string, activityId: string, ready: boolean } }}
 */
export function validateActivityReady(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }
  const { requestId, activityId, ready, matchId } = payload;
  if (!isValidStringId(requestId)) {
    return { valid: false, error: 'requestId must be a non-empty string <= 64 chars' };
  }
  if (!isValidStringId(activityId)) {
    return { valid: false, error: 'activityId must be a non-empty string <= 64 chars' };
  }
  if (typeof ready !== 'boolean') {
    return { valid: false, error: 'ready must be a boolean' };
  }
  if (matchId !== undefined && !isValidStringId(matchId)) {
    return { valid: false, error: 'matchId must be a non-empty string <= 64 chars if provided' };
  }
  return {
    valid: true,
    sanitized: {
      requestId,
      activityId,
      ready,
      ...(matchId ? { matchId } : {}),
    },
  };
}

/**
 * Validates an activity_input command payload.
 * Inputs must carry monotonic sequence scoped to session & participant lease, and be bounded to 2 KiB.
 * Clients cannot submit scores, transforms or winners.
 * @param {any} payload
 * @returns {{ valid: boolean, error?: string, sizeBytes?: number, sanitized?: { activityId: string, sessionId: string, lease: string, seq: number, controls: object } }}
 */
export function validateActivityInput(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }
  const { activityId, sessionId, lease, seq, controls } = payload;
  if (!isValidStringId(activityId)) {
    return { valid: false, error: 'activityId must be a non-empty string <= 64 chars' };
  }
  if (!isValidStringId(sessionId)) {
    return { valid: false, error: 'sessionId must be a non-empty string <= 64 chars' };
  }
  if (!isValidStringId(lease)) {
    return { valid: false, error: 'lease must be a non-empty string <= 64 chars' };
  }
  if (!Number.isInteger(seq) || seq < 0 || !Number.isFinite(seq)) {
    return { valid: false, error: 'seq must be a non-negative finite integer' };
  }
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be a non-null object' };
  }

  // Canonical authority guard: clients SHALL NOT submit canonical scores, transforms, or winners
  if ('score' in controls || 'scores' in controls || 'winner' in controls || 'transform' in controls || 'transforms' in controls) {
    return { valid: false, error: 'controls cannot contain canonical score, winner, or transform fields' };
  }

  const sizeBytes = getPayloadByteLength({ activityId, sessionId, lease, seq, controls });
  if (sizeBytes > ACTIVITY_LIMITS.MAX_INPUT_BYTES) {
    return {
      valid: false,
      error: `Input payload exceeds 2 KiB cap (${sizeBytes} > ${ACTIVITY_LIMITS.MAX_INPUT_BYTES})`,
      sizeBytes,
    };
  }

  return {
    valid: true,
    sizeBytes,
    sanitized: {
      activityId,
      sessionId,
      lease,
      seq,
      controls,
      // Summit Run mutation fence (D7): carried through when present.
      ...(typeof payload.matchId === 'string' && payload.matchId ? { matchId: payload.matchId } : {}),
    },
  };
}

/**
 * Validates an activity_resnapshot command payload.
 * @param {any} payload
 * @returns {{ valid: boolean, error?: string, sanitized?: { requestId: string, activityId: string, sessionId?: string } }}
 */
export function validateActivityResnapshot(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be an object' };
  }
  const { requestId, activityId, sessionId } = payload;
  if (!isValidStringId(requestId)) {
    return { valid: false, error: 'requestId must be a non-empty string <= 64 chars' };
  }
  if (!isValidStringId(activityId)) {
    return { valid: false, error: 'activityId must be a non-empty string <= 64 chars' };
  }
  if (sessionId !== undefined && !isValidStringId(sessionId)) {
    return { valid: false, error: 'sessionId must be a non-empty string <= 64 chars if provided' };
  }
  return {
    valid: true,
    sanitized: {
      requestId,
      activityId,
      ...(sessionId ? { sessionId } : {}),
    },
  };
}

/**
 * Validates standard envelope header fields common to state, event, and result envelopes.
 * Envelope: { version, roomId, roomEpoch, activityId, sessionId, revision, serverNow }
 * @param {any} envelope
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateActivityEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, error: 'Envelope must be an object' };
  }
  if (envelope.version !== ACTIVITY_PROTOCOL_VERSION) {
    return { valid: false, error: `Invalid protocol version: expected ${ACTIVITY_PROTOCOL_VERSION}, got ${envelope.version}` };
  }
  if (!isValidStringId(envelope.roomId)) {
    return { valid: false, error: 'roomId must be a non-empty string <= 64 chars' };
  }
  if (!Number.isInteger(envelope.roomEpoch) || envelope.roomEpoch < 0 || !Number.isFinite(envelope.roomEpoch)) {
    return { valid: false, error: 'roomEpoch must be a non-negative finite integer' };
  }
  if (!isValidStringId(envelope.activityId)) {
    return { valid: false, error: 'activityId must be a non-empty string <= 64 chars' };
  }
  if (!isValidStringId(envelope.sessionId)) {
    return { valid: false, error: 'sessionId must be a non-empty string <= 64 chars' };
  }
  if (!Number.isInteger(envelope.revision) || envelope.revision < 0 || !Number.isFinite(envelope.revision)) {
    return { valid: false, error: 'revision must be a non-negative finite integer' };
  }
  if (typeof envelope.serverNow !== 'number' || !Number.isFinite(envelope.serverNow) || envelope.serverNow <= 0) {
    return { valid: false, error: 'serverNow must be a positive finite number' };
  }
  return { valid: true };
}

/**
 * Validates an activity_state snapshot envelope.
 * Full snapshots must be <= 32 KiB.
 * @param {any} envelope
 * @returns {{ valid: boolean, error?: string, sizeBytes?: number }}
 */
export function validateActivityState(envelope) {
  const base = validateActivityEnvelope(envelope);
  if (!base.valid) return base;
  if (!('state' in envelope) || envelope.state === null || typeof envelope.state !== 'object') {
    return { valid: false, error: 'state must be an object' };
  }
  if (envelope.ackSeq !== undefined && (!Number.isInteger(envelope.ackSeq) || envelope.ackSeq < 0)) {
    return { valid: false, error: 'ackSeq must be a non-negative integer if present' };
  }
  const sizeBytes = getPayloadByteLength(envelope);
  if (sizeBytes > ACTIVITY_LIMITS.MAX_SNAPSHOT_BYTES) {
    return {
      valid: false,
      error: `Snapshot envelope exceeds 32 KiB cap (${sizeBytes} > ${ACTIVITY_LIMITS.MAX_SNAPSHOT_BYTES})`,
      sizeBytes,
    };
  }
  return { valid: true, sizeBytes };
}

/**
 * Validates an activity_event envelope.
 * @param {any} envelope
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateActivityEvent(envelope) {
  const base = validateActivityEnvelope(envelope);
  if (!base.valid) return base;
  if (!isValidStringId(envelope.eventId)) {
    return { valid: false, error: 'eventId must be a non-empty string <= 64 chars' };
  }
  if (!isValidStringId(envelope.eventType)) {
    return { valid: false, error: 'eventType must be a non-empty string <= 64 chars' };
  }
  return { valid: true };
}

/**
 * Validates an activity_result envelope.
 * @param {any} envelope
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateActivityResult(envelope) {
  const base = validateActivityEnvelope(envelope);
  if (!base.valid) return base;
  if (!envelope.result || typeof envelope.result !== 'object' || Array.isArray(envelope.result)) {
    return { valid: false, error: 'result must be a non-null object' };
  }
  return { valid: true };
}

/**
 * Validates an activity_error envelope.
 * @param {any} envelope
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateActivityError(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, error: 'Envelope must be an object' };
  }
  if (!isValidStringId(envelope.error)) {
    return { valid: false, error: 'error must be a non-empty string <= 64 chars' };
  }
  if (typeof envelope.message !== 'string') {
    return { valid: false, error: 'message must be a string' };
  }
  return { valid: true };
}

/**
 * Builds an activity_state snapshot envelope.
 * @param {object} params
 * @returns {object}
 */
export function buildActivityStateEnvelope({
  roomId,
  roomEpoch,
  activityId,
  sessionId,
  revision,
  serverNow,
  state,
  ackSeq,
}) {
  const envelope = {
    type: ACTIVITY_EVENTS.STATE,
    version: ACTIVITY_PROTOCOL_VERSION,
    roomId,
    roomEpoch,
    activityId,
    sessionId,
    revision,
    serverNow: serverNow ?? Date.now(),
    state,
    ...(ackSeq !== undefined ? { ackSeq } : {}),
  };
  const check = validateActivityState(envelope);
  if (!check.valid) {
    throw new Error(`Cannot build invalid activity state envelope: ${check.error}`);
  }
  return envelope;
}

/**
 * Builds an activity_event envelope.
 * @param {object} params
 * @returns {object}
 */
export function buildActivityEventEnvelope({
  roomId,
  roomEpoch,
  activityId,
  sessionId,
  revision,
  serverNow,
  eventId,
  eventType,
  payload = {},
}) {
  const envelope = {
    type: ACTIVITY_EVENTS.EVENT,
    version: ACTIVITY_PROTOCOL_VERSION,
    roomId,
    roomEpoch,
    activityId,
    sessionId,
    revision,
    serverNow: serverNow ?? Date.now(),
    eventId,
    eventType,
    payload,
  };
  const check = validateActivityEvent(envelope);
  if (!check.valid) {
    throw new Error(`Cannot build invalid activity event envelope: ${check.error}`);
  }
  return envelope;
}

/**
 * Builds an activity_result envelope.
 * @param {object} params
 * @returns {object}
 */
export function buildActivityResultEnvelope({
  roomId,
  roomEpoch,
  activityId,
  sessionId,
  revision,
  serverNow,
  result,
}) {
  const envelope = {
    type: ACTIVITY_EVENTS.RESULT,
    version: ACTIVITY_PROTOCOL_VERSION,
    roomId,
    roomEpoch,
    activityId,
    sessionId,
    revision,
    serverNow: serverNow ?? Date.now(),
    result,
  };
  const check = validateActivityResult(envelope);
  if (!check.valid) {
    throw new Error(`Cannot build invalid activity result envelope: ${check.error}`);
  }
  return envelope;
}

/**
 * Builds an activity_error envelope.
 * @param {object} params
 * @returns {object}
 */
export function buildActivityErrorEnvelope({
  roomId = null,
  roomEpoch = null,
  activityId = null,
  requestId = null,
  error,
  message,
}) {
  const envelope = {
    type: ACTIVITY_EVENTS.ERROR,
    version: ACTIVITY_PROTOCOL_VERSION,
    ...(roomId ? { roomId } : {}),
    ...(typeof roomEpoch === 'number' ? { roomEpoch } : {}),
    ...(activityId ? { activityId } : {}),
    ...(requestId ? { requestId } : {}),
    error,
    message: message || error,
  };
  const check = validateActivityError(envelope);
  if (!check.valid) {
    throw new Error(`Cannot build invalid activity error envelope: ${check.error}`);
  }
  return envelope;
}

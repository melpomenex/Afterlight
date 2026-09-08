import test from 'node:test';
import assert from 'node:assert/strict';
import { MSG_TYPES } from '../shared/protocol.js';
import {
  ACTIVITY_PROTOCOL_VERSION,
  ACTIVITY_COMMANDS,
  ACTIVITY_EVENTS,
  ACTIVITY_ROLES,
  ACTIVITY_LIMITS,
  ACTIVITY_ERRORS,
  generateActivityRequestId,
  getPayloadByteLength,
  validateActivityJoin,
  validateActivityLeave,
  validateActivityReady,
  validateActivityInput,
  validateActivityResnapshot,
  validateActivityEnvelope,
  validateActivityState,
  validateActivityEvent,
  validateActivityResult,
  validateActivityError,
  buildActivityStateEnvelope,
  buildActivityEventEnvelope,
  buildActivityResultEnvelope,
  buildActivityErrorEnvelope,
} from '../shared/activityProtocol.js';
import { shouldApplyRoomFrame } from '../src/net/roomEpoch.js';
import { NetworkClient } from '../src/net/client.js';

test('activity constants and message types align with shared protocol', () => {
  assert.equal(ACTIVITY_PROTOCOL_VERSION, 1);
  assert.equal(ACTIVITY_COMMANDS.JOIN, MSG_TYPES.ACTIVITY_JOIN);
  assert.equal(ACTIVITY_COMMANDS.LEAVE, MSG_TYPES.ACTIVITY_LEAVE);
  assert.equal(ACTIVITY_COMMANDS.READY, MSG_TYPES.ACTIVITY_READY);
  assert.equal(ACTIVITY_COMMANDS.INPUT, MSG_TYPES.ACTIVITY_INPUT);
  assert.equal(ACTIVITY_COMMANDS.RESNAPSHOT, MSG_TYPES.ACTIVITY_RESNAPSHOT);

  assert.equal(ACTIVITY_EVENTS.STATE, MSG_TYPES.ACTIVITY_STATE);
  assert.equal(ACTIVITY_EVENTS.EVENT, MSG_TYPES.ACTIVITY_EVENT);
  assert.equal(ACTIVITY_EVENTS.RESULT, MSG_TYPES.ACTIVITY_RESULT);
  assert.equal(ACTIVITY_EVENTS.ERROR, MSG_TYPES.ACTIVITY_ERROR);

  assert.deepEqual(ACTIVITY_ROLES, ['play', 'watch', 'queue']);
  assert.equal(ACTIVITY_LIMITS.MAX_INPUT_BYTES, 2048);
  assert.equal(ACTIVITY_LIMITS.MAX_SNAPSHOT_BYTES, 32768);
});

test('generateActivityRequestId produces unique, bounded strings', () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    const id = generateActivityRequestId('test');
    assert.ok(typeof id === 'string');
    assert.ok(id.length > 0 && id.length <= 64);
    assert.ok(id.startsWith('test_'));
    ids.add(id);
  }
  assert.equal(ids.size, 100, 'all generated request IDs must be unique');
});

test('getPayloadByteLength measures utf8 JSON length correctly', () => {
  assert.equal(getPayloadByteLength(null), 0);
  assert.equal(getPayloadByteLength(undefined), 0);
  assert.equal(getPayloadByteLength({ a: 'hello' }), 13);
  // Multibyte unicode character (3 bytes in UTF-8)
  const unicodeObj = { char: '★' };
  assert.equal(getPayloadByteLength(unicodeObj), 14);
});

test('validateActivityJoin validates request fields and roles', () => {
  const valid = validateActivityJoin({
    requestId: 'req_1',
    activityId: 'pong_court',
    role: 'play',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.sanitized, {
    requestId: 'req_1',
    activityId: 'pong_court',
    role: 'play',
  });

  // Default role 'play'
  const defaultRole = validateActivityJoin({
    requestId: 'req_2',
    activityId: 'pong_court',
  });
  assert.equal(defaultRole.valid, true);
  assert.equal(defaultRole.sanitized.role, 'play');

  // Watch role
  const watchRole = validateActivityJoin({
    requestId: 'req_3',
    activityId: 'pong_court',
    role: 'watch',
  });
  assert.equal(watchRole.valid, true);
  assert.equal(watchRole.sanitized.role, 'watch');

  // Rejections
  assert.equal(validateActivityJoin(null).valid, false);
  assert.equal(validateActivityJoin([]).valid, false);
  assert.equal(validateActivityJoin({ requestId: '', activityId: 'pong' }).valid, false);
  assert.equal(validateActivityJoin({ requestId: 'a'.repeat(65), activityId: 'pong' }).valid, false);
  assert.equal(validateActivityJoin({ requestId: 'req_1', activityId: '' }).valid, false);
  assert.equal(validateActivityJoin({ requestId: 'req_1', activityId: 'pong', role: 'admin' }).valid, false);
});

test('validateActivityLeave validates leave requests and optional reason', () => {
  const valid = validateActivityLeave({
    requestId: 'req_leave_1',
    activityId: 'pong_court',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.sanitized, {
    requestId: 'req_leave_1',
    activityId: 'pong_court',
  });

  const withReason = validateActivityLeave({
    requestId: 'req_leave_2',
    activityId: 'pong_court',
    reason: 'teleport',
  });
  assert.equal(withReason.valid, true);
  assert.equal(withReason.sanitized.reason, 'teleport');

  assert.equal(validateActivityLeave({ requestId: 'req', activityId: 'pong', reason: 'r'.repeat(65) }).valid, false);
  assert.equal(validateActivityLeave({ requestId: '', activityId: 'pong' }).valid, false);
});

test('validateActivityReady enforces boolean ready flag', () => {
  const readyTrue = validateActivityReady({
    requestId: 'req_r1',
    activityId: 'pong_court',
    ready: true,
  });
  assert.equal(readyTrue.valid, true);
  assert.equal(readyTrue.sanitized.ready, true);

  const readyFalse = validateActivityReady({
    requestId: 'req_r2',
    activityId: 'pong_court',
    ready: false,
  });
  assert.equal(readyFalse.valid, true);
  assert.equal(readyFalse.sanitized.ready, false);

  assert.equal(validateActivityReady({ requestId: 'req', activityId: 'pong', ready: 'true' }).valid, false);
  assert.equal(validateActivityReady({ requestId: 'req', activityId: 'pong', ready: 1 }).valid, false);
  assert.equal(validateActivityReady({ requestId: 'req', activityId: 'pong' }).valid, false);
});

test('validateActivityInput enforces lease, monotonic seq, 2 KiB cap and canonical boundaries', () => {
  const valid = validateActivityInput({
    activityId: 'pong_court',
    sessionId: 'sess_123',
    lease: 'lease_abc',
    seq: 42,
    controls: { paddleY: 0.5, boost: false },
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.sanitized.seq, 42);
  assert.ok(valid.sizeBytes <= 2048);

  // Invalid sequences
  assert.equal(validateActivityInput({ activityId: 'p', sessionId: 's', lease: 'l', seq: -1, controls: {} }).valid, false);
  assert.equal(validateActivityInput({ activityId: 'p', sessionId: 's', lease: 'l', seq: 1.5, controls: {} }).valid, false);
  assert.equal(validateActivityInput({ activityId: 'p', sessionId: 's', lease: 'l', seq: NaN, controls: {} }).valid, false);
  assert.equal(validateActivityInput({ activityId: 'p', sessionId: 's', lease: 'l', seq: Infinity, controls: {} }).valid, false);

  // Canonical authority violations: client cannot submit canonical score, winner, or transform
  assert.equal(validateActivityInput({ activityId: 'p', sessionId: 's', lease: 'l', seq: 1, controls: { score: 10 } }).valid, false);
  assert.equal(validateActivityInput({ activityId: 'p', sessionId: 's', lease: 'l', seq: 1, controls: { winner: 'player_a' } }).valid, false);
  assert.equal(validateActivityInput({ activityId: 'p', sessionId: 's', lease: 'l', seq: 1, controls: { transform: [0, 0, 0] } }).valid, false);

  // Payload > 2 KiB (2048 bytes) rejected
  const bigControls = { data: 'x'.repeat(2100) };
  const oversized = validateActivityInput({
    activityId: 'p',
    sessionId: 's',
    lease: 'l',
    seq: 1,
    controls: bigControls,
  });
  assert.equal(oversized.valid, false);
  assert.ok(oversized.error.includes('exceeds 2 KiB cap'));
});

test('validateActivityResnapshot validates resnapshot requests', () => {
  const valid = validateActivityResnapshot({
    requestId: 'req_snap_1',
    activityId: 'pong_court',
  });
  assert.equal(valid.valid, true);

  const withSession = validateActivityResnapshot({
    requestId: 'req_snap_2',
    activityId: 'pong_court',
    sessionId: 'sess_1',
  });
  assert.equal(withSession.valid, true);
  assert.equal(withSession.sanitized.sessionId, 'sess_1');

  assert.equal(validateActivityResnapshot({ requestId: '', activityId: 'p' }).valid, false);
});

test('validateActivityEnvelope and builders enforce version and bounds', () => {
  const validEnvelope = {
    version: 1,
    roomId: 'court',
    roomEpoch: 2,
    activityId: 'pong_court',
    sessionId: 'sess_100',
    revision: 5,
    serverNow: 1725800000000,
  };
  assert.equal(validateActivityEnvelope(validEnvelope).valid, true);

  // Mismatched version
  assert.equal(validateActivityEnvelope({ ...validEnvelope, version: 2 }).valid, false);
  // Negative epoch
  assert.equal(validateActivityEnvelope({ ...validEnvelope, roomEpoch: -1 }).valid, false);
  // Non-finite serverNow
  assert.equal(validateActivityEnvelope({ ...validEnvelope, serverNow: NaN }).valid, false);

  // State snapshot builder & validator
  const stateEnv = buildActivityStateEnvelope({
    roomId: 'court',
    roomEpoch: 2,
    activityId: 'pong_court',
    sessionId: 'sess_100',
    revision: 5,
    serverNow: 1725800000000,
    state: { ball: { x: 0, y: 0 }, paddles: { left: 0, right: 0 } },
    ackSeq: 12,
  });
  assert.equal(stateEnv.type, MSG_TYPES.ACTIVITY_STATE);
  assert.equal(stateEnv.ackSeq, 12);
  assert.equal(validateActivityState(stateEnv).valid, true);

  // Oversized state snapshot (> 32 KiB) rejected
  const oversizedState = {
    ...validEnvelope,
    type: MSG_TYPES.ACTIVITY_STATE,
    state: { largeData: 'y'.repeat(33000) },
  };
  const snapCheck = validateActivityState(oversizedState);
  assert.equal(snapCheck.valid, false);
  assert.ok(snapCheck.error.includes('exceeds 32 KiB cap'));

  // Event builder
  const eventEnv = buildActivityEventEnvelope({
    roomId: 'court',
    roomEpoch: 2,
    activityId: 'pong_court',
    sessionId: 'sess_100',
    revision: 6,
    serverNow: 1725800000010,
    eventId: 'evt_point_1',
    eventType: 'point_scored',
    payload: { scorer: 'left' },
  });
  assert.equal(eventEnv.type, MSG_TYPES.ACTIVITY_EVENT);
  assert.equal(eventEnv.eventId, 'evt_point_1');
  assert.equal(validateActivityEvent(eventEnv).valid, true);

  // Result builder
  const resultEnv = buildActivityResultEnvelope({
    roomId: 'court',
    roomEpoch: 2,
    activityId: 'pong_court',
    sessionId: 'sess_100',
    revision: 10,
    serverNow: 1725800000100,
    result: { winner: 'left', finalScore: [7, 5] },
  });
  assert.equal(resultEnv.type, MSG_TYPES.ACTIVITY_RESULT);
  assert.equal(validateActivityResult(resultEnv).valid, true);

  // Error builder
  const errEnv = buildActivityErrorEnvelope({
    roomId: 'court',
    roomEpoch: 2,
    activityId: 'pong_court',
    requestId: 'req_1',
    error: ACTIVITY_ERRORS.SLOT_FULL,
    message: 'The match already has two players',
  });
  assert.equal(errEnv.type, MSG_TYPES.ACTIVITY_ERROR);
  assert.equal(errEnv.error, ACTIVITY_ERRORS.SLOT_FULL);
  assert.equal(validateActivityError(errEnv).valid, true);
});

test('roomEpoch: activity frames are room-scoped and filter out stale epochs and wrong rooms', () => {
  const epochs = new Map([['court', 3]]);

  // Same room, newer epoch: accepted
  assert.equal(
    shouldApplyRoomFrame(epochs, 'court', {
      type: 'activity_state',
      roomId: 'court',
      roomEpoch: 4,
      activityId: 'pong_court',
    }),
    true,
  );
  assert.equal(epochs.get('court'), 4);

  // Same room, stale epoch: rejected
  assert.equal(
    shouldApplyRoomFrame(epochs, 'court', {
      type: 'activity_state',
      roomId: 'court',
      roomEpoch: 2,
      activityId: 'pong_court',
    }),
    false,
  );

  // Different room: rejected before epoch check
  assert.equal(
    shouldApplyRoomFrame(epochs, 'court', {
      type: 'activity_event',
      roomId: 'theater',
      roomEpoch: 10,
      activityId: 'arcade_runner',
    }),
    false,
  );

  // Activity error with same room: accepted
  assert.equal(
    shouldApplyRoomFrame(epochs, 'court', {
      type: 'activity_error',
      roomId: 'court',
      roomEpoch: 4,
      error: 'slot_full',
    }),
    true,
  );
});

test('NetworkClient on Node transport: fails closed locally, dispatches activity_error, and keeps world play', () => {
  const client = new NetworkClient('ws://127.0.0.1:3001/ws');
  assert.equal(client.transportMode, 'node');
  assert.equal(client.supportsActivities, false);

  const errors = [];
  client.on(MSG_TYPES.ACTIVITY_ERROR, (err) => errors.push(err));

  // Mock socket send tracking
  const sentFrames = [];
  client.transport = {
    isOpen: () => true,
    isConnecting: () => false,
    send: (frame) => sentFrames.push(frame),
    close: () => {},
  };

  // Join command on Node transport fails closed
  const joinRes = client.sendActivityJoin({ activityId: 'pong_court', role: 'play' });
  assert.equal(joinRes.ok, false);
  assert.equal(joinRes.error, ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE);
  assert.equal(sentFrames.length, 0, 'no frame sent to Node transport');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].type, MSG_TYPES.ACTIVITY_ERROR);
  assert.equal(errors[0].error, ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE);

  // Leave command fails closed
  const leaveRes = client.sendActivityLeave({ activityId: 'pong_court' });
  assert.equal(leaveRes.ok, false);
  assert.equal(leaveRes.error, ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE);
  assert.equal(sentFrames.length, 0);

  // Ready command fails closed
  const readyRes = client.sendActivityReady({ activityId: 'pong_court', ready: true });
  assert.equal(readyRes.ok, false);
  assert.equal(readyRes.error, ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE);
  assert.equal(sentFrames.length, 0);

  // Input command fails closed
  const inputRes = client.sendActivityInput({
    activityId: 'pong_court',
    sessionId: 's',
    lease: 'l',
    seq: 0,
    controls: { y: 1 },
  });
  assert.equal(inputRes.ok, false);
  assert.equal(inputRes.error, ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE);
  assert.equal(sentFrames.length, 0);

  // Resnapshot command fails closed
  const snapRes = client.sendActivityResnapshot({ activityId: 'pong_court' });
  assert.equal(snapRes.ok, false);
  assert.equal(snapRes.error, ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE);
  assert.equal(sentFrames.length, 0);

  // Standard gameplay retains normal operation on Node transport
  client.joinRoom('court');
  assert.equal(sentFrames.length, 1);
  assert.equal(sentFrames[0].type, MSG_TYPES.JOIN_ROOM);
  assert.equal(sentFrames[0].roomId, 'court');

  client.sendChat('Hello world');
  assert.equal(sentFrames.length, 2);
  assert.equal(sentFrames[1].type, MSG_TYPES.CHAT_SEND);
  assert.equal(sentFrames[1].text, 'Hello world');
});

test('NetworkClient on Phoenix transport: supportsActivities is true, sends commands, validates input', () => {
  const client = new NetworkClient('ws://127.0.0.1:4000/ws');
  client.transportMode = 'phoenix';
  assert.equal(client.supportsActivities, true);

  const sentFrames = [];
  client.transport = {
    isOpen: () => true,
    isConnecting: () => false,
    send: (frame) => sentFrames.push(frame),
    close: () => {},
  };

  const errors = [];
  client.on(MSG_TYPES.ACTIVITY_ERROR, (err) => errors.push(err));

  // Valid join
  const joinRes = client.sendActivityJoin({ activityId: 'pong_court', role: 'play', requestId: 'req_join_1' });
  assert.equal(joinRes.ok, true);
  assert.equal(joinRes.requestId, 'req_join_1');
  assert.equal(sentFrames.length, 1);
  assert.equal(sentFrames[0].type, MSG_TYPES.ACTIVITY_JOIN);
  assert.equal(sentFrames[0].activityId, 'pong_court');
  assert.equal(sentFrames[0].role, 'play');
  assert.equal(sentFrames[0].requestId, 'req_join_1');

  // Invalid join fails closed locally
  const badJoin = client.sendActivityJoin({ activityId: '', role: 'cheat' });
  assert.equal(badJoin.ok, false);
  assert.equal(badJoin.error, ACTIVITY_ERRORS.INVALID_REQUEST);
  assert.equal(sentFrames.length, 1, 'invalid join frame was not sent');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].error, ACTIVITY_ERRORS.INVALID_REQUEST);

  // Valid input
  const inputRes = client.sendActivityInput({
    activityId: 'pong_court',
    sessionId: 'sess_1',
    lease: 'lease_1',
    seq: 0,
    controls: { paddleY: 0.2 },
  });
  assert.equal(inputRes.ok, true);
  assert.equal(inputRes.seq, 0);
  assert.equal(sentFrames.length, 2);
  assert.equal(sentFrames[1].type, MSG_TYPES.ACTIVITY_INPUT);
  assert.equal(sentFrames[1].seq, 0);

  // Invalid input (seq < 0) fails closed
  const badInput = client.sendActivityInput({
    activityId: 'pong_court',
    sessionId: 'sess_1',
    lease: 'lease_1',
    seq: -5,
    controls: { paddleY: 0.2 },
  });
  assert.equal(badInput.ok, false);
  assert.equal(badInput.error, ACTIVITY_ERRORS.INVALID_REQUEST);
  assert.equal(sentFrames.length, 2, 'invalid input was not sent');
});

test('Old clients: receiving activity frames without registered handlers does not throw or crash', () => {
  const client = new NetworkClient('ws://127.0.0.1:4000/ws');
  client.desiredRoom = 'court';

  // Client has no activity listeners registered
  assert.doesNotThrow(() => {
    client.handleFrame({
      type: MSG_TYPES.ACTIVITY_STATE,
      roomId: 'court',
      roomEpoch: 1,
      activityId: 'pong_court',
      sessionId: 'sess_1',
      revision: 1,
      serverNow: Date.now(),
      state: { running: true },
    });
  });

  assert.doesNotThrow(() => {
    client.handleFrame({
      type: MSG_TYPES.ACTIVITY_EVENT,
      roomId: 'court',
      roomEpoch: 1,
      activityId: 'pong_court',
      sessionId: 'sess_1',
      revision: 2,
      serverNow: Date.now(),
      eventId: 'e1',
      eventType: 'bounce',
      payload: {},
    });
  });

  assert.doesNotThrow(() => {
    client.handleFrame({
      type: MSG_TYPES.ACTIVITY_RESULT,
      roomId: 'court',
      roomEpoch: 1,
      activityId: 'pong_court',
      sessionId: 'sess_1',
      revision: 3,
      serverNow: Date.now(),
      result: { winner: 'left' },
    });
  });

  assert.doesNotThrow(() => {
    client.handleFrame({
      type: MSG_TYPES.ACTIVITY_ERROR,
      roomId: 'court',
      roomEpoch: 1,
      error: 'activities_unavailable',
      message: 'Not yet available',
    });
  });
});

// --- Summit Run fence (add-multiplayer-snowboard-arcade 5.1/D7) ------------------

test('snowboard controls: strict allowlist per kind', async () => {
  const { validateSnowboardControls, validateSnowboardFence } = await import('../shared/activityProtocol.js');

  assert.equal(validateSnowboardControls({ kind: 'ride', steer: 0.5, tuck: false, brake: false, jumpHeld: false }).valid, true);
  assert.equal(validateSnowboardControls({ kind: 'ride', steer: 2 }).valid, false, 'steer clamps rejected');
  assert.equal(validateSnowboardControls({ kind: 'ride', steer: NaN }).valid, false, 'non-finite steer rejected');
  assert.equal(validateSnowboardControls({ kind: 'ride', steer: 0, boost: true }).valid, false, 'unknown field rejected');
  assert.equal(validateSnowboardControls({ kind: 'neutral' }).valid, true);
  assert.equal(validateSnowboardControls({ kind: 'teleport', s: 1800 }).valid, false, 'forged kinds rejected');
  assert.equal(
    validateSnowboardControls({
      kind: 'loaded', courseId: 'summit-night', courseVersion: 1,
      courseHash: 'a'.repeat(64),
    }).valid,
    true,
  );
  assert.equal(validateSnowboardControls({ kind: 'loaded' }).valid, false);

  assert.equal(validateSnowboardFence({ sessionId: 's', lease: 'l', matchId: 'm' }).valid, true);
  assert.equal(validateSnowboardFence({ sessionId: 's', lease: 'l' }).valid, false, 'matchId required by default');
});

test('leave/ready/input validators carry the matchId fence through when present', async () => {
  const { validateActivityLeave, validateActivityReady, validateActivityInput } = await import('../shared/activityProtocol.js');

  const leave = validateActivityLeave({ requestId: 'r', activityId: 'summit-run', matchId: 'match-1' });
  assert.equal(leave.valid, true);
  assert.equal(leave.sanitized.matchId, 'match-1', 'leave fence retained (never stripped)');

  const ready = validateActivityReady({ requestId: 'r', activityId: 'summit-run', ready: true, matchId: 'match-1' });
  assert.equal(ready.valid, true);
  assert.equal(ready.sanitized.matchId, 'match-1');

  const input = validateActivityInput({
    activityId: 'summit-run', sessionId: 's', lease: 'l', seq: 1,
    controls: { kind: 'neutral' }, matchId: 'match-1',
  });
  assert.equal(input.valid, true);
  assert.equal(input.sanitized.matchId, 'match-1');

  // Generic clients that never send matchId are unaffected.
  const plain = validateActivityLeave({ requestId: 'r', activityId: 'x' });
  assert.equal('matchId' in plain.sanitized, false);
});

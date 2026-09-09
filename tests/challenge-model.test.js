import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHALLENGE_EXPIRY_MS,
  CHALLENGE_MAX_PER_MINUTE,
  CHALLENGE_ERRORS,
  CHALLENGE_STATUSES,
  validateChallengeInvite,
  validateChallengeRespond,
  validateChallengeMute,
  validateChallengeBlock,
  isChallengeExpired,
  allowChallengeSend,
  canDeliverChallenge,
  createChallengeInvite,
  resolveChallengeAccept,
  resolveChallengeDecline,
  blockKey,
} from '../shared/challengeModel.js';
import { ACTIVITY_COMMANDS, ACTIVITY_EVENTS } from '../shared/activityProtocol.js';
import { MSG_TYPES } from '../shared/protocol.js';

test('challenge commands align with the shared protocol', () => {
  assert.equal(ACTIVITY_COMMANDS.CHALLENGE, MSG_TYPES.ACTIVITY_CHALLENGE);
  assert.equal(ACTIVITY_COMMANDS.CHALLENGE_RESPOND, MSG_TYPES.ACTIVITY_CHALLENGE_RESPOND);
  assert.equal(ACTIVITY_EVENTS.CHALLENGE_RESULT, MSG_TYPES.ACTIVITY_CHALLENGE_RESULT);
  assert.equal(CHALLENGE_EXPIRY_MS, 30_000);
  assert.equal(CHALLENGE_MAX_PER_MINUTE, 3);
});

test('invite names a player and an activity', () => {
  assert.equal(validateChallengeInvite({}).valid, false);
  assert.equal(validateChallengeInvite({ activityId: 'pool-1' }).valid, false);
  const ok = validateChallengeInvite({ requestId: 'r1', activityId: 'pool-1', targetName: 'Kiln' });
  assert.equal(ok.valid, true);
  assert.equal(ok.sanitized.targetId, 'Kiln');
});

test('respond requires an explicit accept boolean', () => {
  assert.equal(validateChallengeRespond({ inviteId: 'i1' }).valid, false);
  const ok = validateChallengeRespond({ inviteId: 'i1', accept: false });
  assert.equal(ok.valid, true);
  assert.equal(ok.sanitized.accept, false);
});

test('mute and block validate their flags', () => {
  assert.equal(validateChallengeMute({ muted: true }).valid, true);
  assert.equal(validateChallengeBlock({ playerId: 'guest_x', blocked: true }).valid, true);
  assert.equal(validateChallengeBlock({}).valid, false);
});

test('one pending invite and three per minute', () => {
  const t0 = 1_000_000;
  let gate = allowChallengeSend([], t0);
  assert.equal(gate.ok, true);
  gate = allowChallengeSend(gate.sentAt, t0 + 1000);
  assert.equal(gate.ok, true);
  gate = allowChallengeSend(gate.sentAt, t0 + 2000);
  assert.equal(gate.ok, true);
  gate = allowChallengeSend(gate.sentAt, t0 + 3000);
  assert.equal(gate.ok, false);
  assert.equal(gate.error, CHALLENGE_ERRORS.RATE_LIMITED);
  gate = allowChallengeSend(gate.sentAt, t0 + 61_000);
  assert.equal(gate.ok, true);
});

test('blocked senders and muted recipients do not deliver', () => {
  const blocked = new Set([blockKey('recv', 'send')]);
  assert.equal(canDeliverChallenge({
    senderId: 'send', targetId: 'recv', blockedPairs: blocked,
  }).ok, false);
  assert.equal(canDeliverChallenge({
    senderId: 'send', targetId: 'recv', mutedTargets: new Set(['recv']),
  }).ok, false);
  assert.equal(canDeliverChallenge({ senderId: 'send', targetId: 'recv' }).ok, true);
});

test('decline changes no participation', () => {
  const invite = createChallengeInvite({
    inviteId: 'i1', senderId: 'a', targetId: 'b', activityId: 'pool-1', now: 10,
  });
  const declined = resolveChallengeDecline(invite, 20);
  assert.equal(declined.ok, true);
  assert.equal(declined.status, CHALLENGE_STATUSES.DECLINED);
  assert.equal(declined.participationChanged, false);
});

test('expired invite is stale on the clock, not after accept of a live table', () => {
  const invite = createChallengeInvite({
    inviteId: 'i1', senderId: 'a', targetId: 'b', activityId: 'pool-1', now: 0,
  });
  assert.equal(isChallengeExpired(invite, CHALLENGE_EXPIRY_MS - 1), false);
  assert.equal(isChallengeExpired(invite, CHALLENGE_EXPIRY_MS), true);
});

test('accept never teleports or auto-seats; stale tables offer watch/queue', () => {
  const invite = createChallengeInvite({
    inviteId: 'i1', senderId: 'a', targetId: 'b', activityId: 'pool-1', roomId: 'theater', now: 0,
  });
  const open = resolveChallengeAccept(invite, { available: true }, 10);
  assert.equal(open.ok, true);
  assert.equal(open.status, CHALLENGE_STATUSES.ACCEPTED);
  assert.equal(open.teleport, false);
  assert.equal(open.autoSeat, false);
  assert.equal(open.highlight, true);

  const stale = resolveChallengeAccept(invite, {
    available: false, playing: 2, watching: 3, queued: 1, canWatch: true, canQueue: true,
  }, 10);
  assert.equal(stale.status, CHALLENGE_STATUSES.STALE);
  assert.equal(stale.teleport, false);
  assert.equal(stale.autoSeat, false);
  assert.equal(stale.highlight, false);
  assert.equal(stale.availability.playing, 2);
  assert.equal(stale.availability.canWatch, true);
});

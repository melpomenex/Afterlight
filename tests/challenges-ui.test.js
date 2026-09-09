import test from 'node:test';
import assert from 'node:assert/strict';
import { initChallenges } from '../src/ui/challenges.js';
import { CHALLENGE_COMMANDS, CHALLENGE_EVENTS, CHALLENGE_STATUSES } from '../shared/challengeModel.js';

function createNet({ supports = true } = {}) {
  const net = {
    supportsActivities: supports,
    handlers: new Map(),
    sent: [],
    localErrors: [],
    on(type, fn) {
      if (!net.handlers.has(type)) net.handlers.set(type, []);
      net.handlers.get(type).push(fn);
    },
    send(type, payload) { net.sent.push({ type, payload }); },
    dispatch(type, msg) { for (const fn of net.handlers.get(type) ?? []) fn(msg); },
    dispatchLocalActivityError(frame) { net.localErrors.push(frame); },
  };
  return net;
}

test('Node transport fails closed and sends nothing', () => {
  const net = createNet({ supports: false });
  const toasts = [];
  const ui = initChallenges({
    net,
    toast: (title, body) => toasts.push([title, body]),
    onHighlight: () => { throw new Error('must not highlight on fail-closed'); },
  });
  const result = ui.invite({ activityId: 'pool-1', targetId: 'guest_b' });
  assert.equal(result.ok, false);
  assert.equal(net.sent.length, 0);
  assert.ok(net.localErrors.length > 0);
});

test('accept highlights the destination and never claims a teleport', () => {
  const net = createNet();
  const highlights = [];
  const ui = initChallenges({
    net,
    onHighlight: (info) => highlights.push(info),
    getLocalId: () => 'guest_b',
  });
  net.dispatch(CHALLENGE_EVENTS.INVITE, {
    inviteId: 'i1',
    senderId: 'guest_a',
    senderName: 'Piper',
    targetId: 'guest_b',
    activityId: 'pool-1',
    expiresAt: Date.now() + 30_000,
  });
  assert.ok(ui.incoming());
  net.dispatch(CHALLENGE_EVENTS.RESULT, {
    status: CHALLENGE_STATUSES.ACCEPTED,
    activityId: 'pool-1',
    roomId: 'theater',
    highlight: true,
    teleport: false,
    autoSeat: false,
  });
  assert.deepEqual(highlights, [{
    activityId: 'pool-1',
    roomId: 'theater',
    teleport: false,
    autoSeat: false,
  }]);
});

test('decline is a local respond that does not travel', () => {
  const net = createNet();
  const ui = initChallenges({ net, getLocalId: () => 'guest_b' });
  net.dispatch(CHALLENGE_EVENTS.INVITE, {
    inviteId: 'i1',
    senderId: 'guest_a',
    targetId: 'guest_b',
    activityId: 'pool-1',
    expiresAt: Date.now() + 30_000,
  });
  ui.respond(false);
  assert.equal(net.sent.at(-1).type, CHALLENGE_COMMANDS.RESPOND);
  assert.equal(net.sent.at(-1).payload.accept, false);
  assert.equal(ui.incoming(), null);
});

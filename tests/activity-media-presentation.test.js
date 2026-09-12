/**
 * Activity media presentation lease + registry policy tests
 * (add-floating-minigame-media, task 3.1; design D2).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createMediaPresentationLease, MEDIA_LEASE_PHASE } from '../src/activities/mediaPresentation.js';
import {
  DEFAULT_ACTIVITY_MEDIA_POLICY,
  clearActivityModules,
  getActivityMediaPolicy,
  registerActivityModule,
  unregisterActivityModule,
} from '../src/activities/registry.js';

const activity = (id = 'orpheum-pool', type = 'pool') => ({ id, type, title: id });

function makeLease(policies = {}, options = {}) {
  const events = [];
  const lease = createMediaPresentationLease({
    getPolicy: (type) => policies[type] || DEFAULT_ACTIVITY_MEDIA_POLICY,
    onEnter: (active) => events.push(['enter', active.token.activityId, active.token.attempt]),
    onPhase: (active, phase) => events.push(['phase', active.token.activityId, phase]),
    onReplace: (active, previous) => events.push(['replace', previous.token.activityId, active.token.activityId, active.token.attempt]),
    onExit: (active, reason) => events.push(['exit', active.token.activityId, reason]),
    now: () => 1000,
    ...options,
  });
  return { lease, events };
}

test('begin acquires a token before any join/load and enters once', () => {
  const { lease, events } = makeLease();
  const token = lease.begin(activity(), { generation: 4 });
  assert.deepEqual(
    { activityId: token.activityId, generation: token.generation, role: token.role, phase: token.phase },
    { activityId: 'orpheum-pool', generation: 4, role: 'play', phase: MEDIA_LEASE_PHASE.LOADING },
  );
  assert.equal(typeof token.attempt, 'number');
  assert.deepEqual(events, [['enter', 'orpheum-pool', token.attempt]]);
});

test('duplicate begin for the same activity and generation reuses the token without a second entry', () => {
  const { lease, events } = makeLease();
  const first = lease.begin(activity(), { generation: 4 });
  const second = lease.begin(activity(), { generation: 4 });
  assert.equal(second, first, 'same token object is reused');
  assert.equal(events.filter((e) => e[0] === 'enter').length, 1);
});

test('an explicitly opted-out module never acquires a lease', () => {
  const { lease, events } = makeLease({ pong: { floatingMedia: false } });
  assert.equal(lease.begin({ id: 'pong', type: 'pong' }, { generation: 1 }), null);
  assert.equal(lease.active, null);
  assert.deepEqual(events, []);
});

test('watching and queued roles never auto-float', () => {
  const { lease } = makeLease();
  assert.equal(lease.begin(activity(), { generation: 1, role: 'watch' }), null);
  assert.equal(lease.begin(activity(), { generation: 1, role: 'queue' }), null);
  assert.equal(lease.begin(activity(), { generation: 1, role: 'spectator' }), null);
  assert.equal(lease.begin(activity(), { generation: 1, role: 'player' })?.role, 'play');
});

test('a stale generation cannot acquire a lease and a newer generation releases the old span', () => {
  const { lease, events } = makeLease();
  const token = lease.begin(activity(), { generation: 5 });
  assert.ok(token);
  assert.equal(lease.begin(activity('other', 'pool'), { generation: 4 }), null, 'stale generation rejected');
  assert.equal(lease.active.token, token, 'the current span is untouched by the stale request');
  const next = lease.begin(activity('new', 'pool'), { generation: 6 });
  assert.ok(next);
  assert.deepEqual(events.find((e) => e[0] === 'exit'), ['exit', 'orpheum-pool', 'generation']);
  assert.equal(lease.active.token, next);
});

test('end only acts on the matching token, is idempotent and reports the reason', () => {
  const { lease, events } = makeLease();
  const token = lease.begin(activity(), { generation: 1 });
  assert.equal(lease.end({ ...token }, 'stale'), false, 'a copied/stale token ends nothing');
  assert.equal(lease.end(token, 'cancel'), true);
  assert.deepEqual(events.find((e) => e[0] === 'exit'), ['exit', 'orpheum-pool', 'cancel']);
  assert.equal(lease.end(token, 'again'), false, 'idempotent');
  assert.equal(events.filter((e) => e[0] === 'exit').length, 1);
  assert.equal(lease.active, null);
});

test('stale completion cannot terminate a newer span', () => {
  const { lease } = makeLease();
  const first = lease.begin(activity(), { generation: 1, attempt: 1 });
  const second = lease.replace(first, activity('orpheum-kart', 'kart'));
  assert.equal(lease.active.token, second);
  assert.equal(lease.end(first, 'late-completion'), false, 'the old token has no effect');
  assert.equal(lease.active.token, second);
  assert.equal(lease.end(second, 'leave'), true);
});

test('phase updates apply only to the current token', () => {
  const { lease, events } = makeLease();
  const token = lease.begin(activity(), { generation: 1 });
  assert.equal(lease.phase(token, MEDIA_LEASE_PHASE.JOINING), true);
  assert.equal(lease.phase(token, MEDIA_LEASE_PHASE.PARTICIPATING), true);
  assert.equal(token.phase, MEDIA_LEASE_PHASE.PARTICIPATING);
  assert.equal(lease.phase(token, 'nonsense'), false);
  const stale = { ...token };
  lease.release('test');
  assert.equal(lease.phase(stale, MEDIA_LEASE_PHASE.JOINING), false);
  assert.deepEqual(
    events.filter((e) => e[0] === 'phase').map((e) => e[2]),
    [MEDIA_LEASE_PHASE.JOINING, MEDIA_LEASE_PHASE.PARTICIPATING],
  );
});

test('same-room replacement keeps the generation, bumps the attempt and never exits the span', () => {
  const { lease, events } = makeLease();
  const first = lease.begin(activity(), { generation: 7, attempt: 3 });
  const next = lease.replace(first, activity('orpheum-kart', 'kart'), { attempt: 8 });
  assert.equal(next.generation, 7);
  assert.equal(next.attempt, 8);
  assert.equal(lease.active.activity.id, 'orpheum-kart');
  assert.equal(events.filter((e) => e[0] === 'exit').length, 0, 'the media span continues');
  assert.deepEqual(events.find((e) => e[0] === 'replace'), ['replace', 'orpheum-pool', 'orpheum-kart', 8]);
  assert.equal(lease.end(first, 'stale'), false);
});

test('release ends whatever is active (runtime deactivate) and is idempotent', () => {
  const { lease, events } = makeLease();
  lease.begin(activity(), { generation: 1 });
  assert.equal(lease.release('deactivate'), true);
  assert.equal(lease.release('deactivate'), false);
  assert.deepEqual(events.find((e) => e[0] === 'exit'), ['exit', 'orpheum-pool', 'deactivate']);
});

test('the global developer gate disables all acquisition', () => {
  let enabled = false;
  const { lease } = makeLease({}, { isEnabled: () => enabled });
  assert.equal(lease.begin(activity(), { generation: 1 }), null);
  enabled = true;
  assert.ok(lease.begin(activity(), { generation: 1 }));
});

// --- registry policy --------------------------------------------------------

test('registry: default policy floats media, opt-out disables it, reservations normalize', () => {
  try {
    const reservations = () => [{ x: 0, y: 0, width: 10, height: 10 }];
    registerActivityModule('pool', { initialize() {}, mediaPolicy: { floatingMedia: false, reservedRects: reservations } });
    assert.deepEqual(
      { floatingMedia: getActivityMediaPolicy('pool').floatingMedia, reservedRects: getActivityMediaPolicy('pool').reservedRects },
      { floatingMedia: false, reservedRects: reservations },
    );
    assert.deepEqual([...getActivityMediaPolicy('pool').reservedSelectors], []);
    registerActivityModule('pong', { initialize() {} });
    assert.equal(getActivityMediaPolicy('pong').floatingMedia, true);
    assert.equal(getActivityMediaPolicy('unregistered').floatingMedia, true, 'unknown types inherit the permissive default');
    assert.deepEqual(
      { floatingMedia: DEFAULT_ACTIVITY_MEDIA_POLICY.floatingMedia, reservedRects: DEFAULT_ACTIVITY_MEDIA_POLICY.reservedRects },
      { floatingMedia: true, reservedRects: null },
    );
  } finally {
    clearActivityModules();
  }
});

test('registry: unregistering a module clears its media policy', () => {
  try {
    registerActivityModule('pong', { initialize() {}, mediaPolicy: { floatingMedia: false } });
    assert.equal(getActivityMediaPolicy('pong').floatingMedia, false);
    unregisterActivityModule('pong');
    assert.equal(getActivityMediaPolicy('pong').floatingMedia, true);
  } finally {
    clearActivityModules();
  }
});

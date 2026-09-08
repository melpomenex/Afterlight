/**
 * Summit Run lightweight module tests (add-multiplayer-snowboard-arcade 2.4).
 *
 * The module behind `snowboard-race` must stay a synchronous registry
 * bootstrap plus a bounded public summary/attract display. These tests prove:
 *   - registration and synchronous initialization at the manifest transform;
 *   - summary-audience snapshots drive the cabinet display (lobby, racing,
 *     results) with the eight-rider cap;
 *   - full participant snapshots NEVER change the bystander display;
 *   - results and countdown/abort events repaint honestly, deduped by
 *     eventId;
 *   - disposal is idempotent and leaves the world clean;
 *   - the module imports no mountain code for passive bystanders.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { getActivityModule } from '../src/activities/registry.js';
import { SUMMIT_RUN_ACTIVITY_DEFINITION } from '../shared/placeDefinitions.js';
import { summaryToDisplayState } from '../src/activities/snowboard.js';
import '../src/activities/snowboard.js';

const summaryFrame = (overrides = {}) => ({
  type: 'activity_state',
  version: 1,
  roomId: 'theater',
  roomEpoch: 7,
  activityId: 'summit-run',
  sessionId: 'sb-1',
  revision: 3,
  serverNow: 1771000000000,
  audience: 'summary',
  status: 'lobby',
  matchId: 'match-0001',
  summary: {
    riderCount: 2,
    readyCount: 1,
    capacity: 8,
    progress: [
      { playerId: 'u1', nickname: 'Robo', nextCheckpoint: 0, normalizedProgress: 0, status: 'unready' },
      { playerId: 'u2', nickname: 'Kiln', nextCheckpoint: 0, normalizedProgress: 0, status: 'unready' },
    ],
    result: null,
  },
  queueLength: 0,
  spectatorCount: 1,
  ...overrides,
});

function makeInstance() {
  const worldGroup = new THREE.Group();
  const instance = getActivityModule('snowboard-race').initialize({
    activityDef: SUMMIT_RUN_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: null,
    generation: 1,
    roomId: 'theater',
    getPlayer: () => ({ position: new THREE.Vector3(9.3, 0, 2.45) }),
  });
  return { instance, worldGroup };
}

test('snowboard-race module registers and initializes synchronously', () => {
  const mod = getActivityModule('snowboard-race');
  assert.ok(mod, 'snowboard-race is registered');
  assert.equal(typeof mod.initialize, 'function');

  const { instance, worldGroup } = makeInstance();
  assert.equal(instance.id, 'summit-run');
  assert.equal(instance.type, 'snowboard-race');
  assert.ok(instance.group instanceof THREE.Group);
  assert.ok(worldGroup.children.includes(instance.group));
  const [tx, , tz] = SUMMIT_RUN_ACTIVITY_DEFINITION.transform.position;
  assert.ok(Math.abs(instance.group.position.x - tx) < 1e-6);
  assert.ok(Math.abs(instance.group.position.z - tz) < 1e-6);
  instance.dispose();
});

test('summary snapshots drive the cabinet display through every phase', () => {
  const { instance } = makeInstance();

  instance.acceptSnapshot(summaryFrame());
  assert.equal(instance.getDisplayState().status, 'lobby');
  assert.equal(instance.getDisplayState().riderCount, 2);
  assert.equal(instance.getDisplayState().readyCount, 1);

  instance.acceptSnapshot(summaryFrame({
    status: 'racing',
    matchId: 'match-0002',
    summary: {
      riderCount: 3,
      readyCount: 3,
      capacity: 8,
      progress: [
        { playerId: 'u2', nickname: 'Kiln', nextCheckpoint: 4, normalizedProgress: 0.6, status: 'racing' },
        { playerId: 'u1', nickname: 'Robo', nextCheckpoint: 2, normalizedProgress: 0.3, status: 'racing' },
        { playerId: 'u3', nickname: 'Flux', nextCheckpoint: 1, normalizedProgress: 0.1, status: 'dnf', dnfReason: 'disconnect' },
      ],
      result: null,
    },
  }));
  const racing = instance.getDisplayState();
  assert.equal(racing.status, 'racing');
  assert.equal(racing.riders[0].nickname, 'Kiln', 'progress display is ranked by normalized progress');
  assert.equal(racing.riders.length, 3);

  instance.acceptSnapshot(summaryFrame({
    status: 'results',
    summary: {
      riderCount: 2, readyCount: 0, capacity: 8, progress: [],
      result: {
        kind: 'snowboard_race',
        recordingStatus: 'session_only',
        reason: 'complete',
        standings: [{ playerId: 'u1', slot: 0, place: 1, timeMs: 61233, status: 'finished', dnfReason: null }],
      },
    },
  }));
  const results = instance.getDisplayState();
  assert.equal(results.status, 'results');
  assert.equal(results.result.recordingStatus, 'session_only');
  assert.equal(results.result.standings[0].timeMs, 61233);
  instance.dispose();
});

test('summary riders are capped at eight and progress clamped to [0, 1]', () => {
  const progress = Array.from({ length: 12 }, (_, i) => ({
    playerId: `u${i}`, nickname: `R${i}`, nextCheckpoint: 1, normalizedProgress: i / 10, status: 'racing',
  }));
  const state = summaryToDisplayState(summaryFrame({ summary: { riderCount: 12, readyCount: 0, capacity: 8, progress, result: null } }));
  assert.equal(state.riders.length, 8, 'never more than eight riders on the display');
  for (const rider of state.riders) {
    assert.ok(rider.normalizedProgress >= 0 && rider.normalizedProgress <= 1, 'progress clamped');
  }
});

test('full participant snapshots never touch the bystander display', () => {
  const { instance } = makeInstance();
  instance.acceptSnapshot(summaryFrame());
  const before = JSON.stringify(instance.getDisplayState());

  instance.acceptSnapshot({
    ...summaryFrame({ audience: 'participants', status: 'racing', matchId: 'match-9' }),
    state: {
      players: [{ playerId: 'u1', nickname: 'Robo', accent: '#edb66c', slot: 0, connected: true, loaded: true, ready: true, status: 'racing' }],
      sim: { riders: [{ playerId: 'u1', s: 500, u: 0, v: 30, vu: 0, y: 10, vy: 0, grounded: true, jumpCharge: 0, recoveryTicks: 0, nextCheckpoint: 3, splitsMs: [], finishMs: null, finishKey: null, dnfReason: null, resetSeq: 0 }], tick: 300 },
    },
    lastAcceptedSeqs: { u1: 42 },
    self: { appliedSeq: 41, heldControls: { kind: 'ride', steer: 0, tuck: false, brake: false, jumpHeld: false }, serverTick: 300 },
  });

  assert.equal(JSON.stringify(instance.getDisplayState()), before, 'participant-only data is invisible to bystanders');
  instance.dispose();
});

test('countdown and abort events repaint; duplicate eventIds are ignored', () => {
  const { instance } = makeInstance();
  instance.acceptEvent({
    activityId: 'summit-run', eventId: 'ev-1', eventType: 'countdown', matchId: 'match-1',
    payload: { startAt: 1771000009000 },
  });
  assert.equal(instance.getDisplayState().status, 'countdown');
  assert.equal(instance.getDisplayState().countdownStartAt, 1771000009000);

  instance.acceptEvent({
    activityId: 'summit-run', eventId: 'ev-1', eventType: 'countdown', matchId: 'match-1',
    payload: { startAt: 999 },
  });
  assert.equal(instance.getDisplayState().countdownStartAt, 1771000009000, 'duplicate eventId deduped');

  instance.acceptEvent({
    activityId: 'summit-run', eventId: 'ev-2', eventType: 'race_aborted', matchId: 'match-1',
    payload: { reason: 'server_overload' },
  });
  assert.equal(instance.getDisplayState().status, 'aborted');
  assert.equal(instance.getDisplayState().abortedReason, 'server_overload');
  instance.dispose();
});

test('activity_result recovers the display after event loss and disposes idempotently', () => {
  const { instance, worldGroup } = makeInstance();
  instance.acceptResult({
    activityId: 'summit-run',
    matchId: 'match-2',
    result: {
      kind: 'snowboard_race', recordingStatus: 'session_only', reason: 'deadline',
      standings: [{ playerId: 'u1', slot: 0, place: 1, timeMs: null, status: 'dnf', dnfReason: 'deadline' }],
    },
  });
  assert.equal(instance.getDisplayState().status, 'results');
  assert.equal(instance.getDisplayState().result.reason, 'deadline');

  instance.dispose();
  instance.dispose();
  assert.equal(worldGroup.children.length, 0, 'disposed instance leaves the world');
});

test('the lightweight module imports no mountain code', () => {
  const source = readFileSync(new URL('../src/activities/snowboard.js', import.meta.url), 'utf8');
  const imports = [...source.matchAll(/import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g)].map(m => m[1]);
  for (const spec of imports) {
    assert.ok(!spec.includes('snowboard/'), `static import "${spec}" would pull mountain code for bystanders`);
    assert.ok(!/scene|prediction|controller|hud|audio/.test(spec.split('/').pop() ?? ''), `import "${spec}" is outside the lightweight set`);
  }
  assert.ok(!/import\(/.test(source), 'no dynamic import in the bystander module');
});

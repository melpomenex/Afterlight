/**
 * Downhill Mayhem bystander-module tests
 * (integrate-multiplayer-downhill-mayhem-arcade 6.1).
 *
 * The module behind `downhill-mayhem` must stay a synchronous registry
 * bootstrap plus a bounded summary/attract cabinet display. These tests prove:
 *   - registration and synchronous initialization at the manifest transform
 *     (the repurposed Signal Lost slot);
 *   - `audience:'summary'` frames drive the display through lobby, racing and
 *     results with the six-rider cap and an honest AI distinction;
 *   - full participant snapshots NEVER change the bystander display or load a
 *     mountain;
 *   - disposal is idempotent and leaves the world group empty;
 *   - the BYSTANDER ECONOMY: no static game/controller import, exactly one
 *     dynamic import (the lazy controller).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { getActivityModule } from '../src/activities/registry.js';
import { injectArcadeCabinetTemplate } from '../src/arcade/cabinet.js';
import { DOWNHILL_MAYHEM_ACTIVITY_DEFINITION } from '../shared/placeDefinitions.js';
import { summaryToDisplayState, createDownhillMayhemInstance } from '../src/activities/downhill-mayhem.js';
import '../src/activities/downhill-mayhem.js';

function makeFakeTemplate() {
  const root = new THREE.Group();
  root.name = 'ARC_Cabinet_ROOT';
  const named = (name) => new THREE.MeshStandardMaterial({ name, color: 0x888888 });
  const add = (name, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), mat);
    mesh.name = name;
    root.add(mesh);
    return mesh;
  };
  add('Cabinet_Body', named('MAT_Cabinet_Black'));
  add('Screen_Display', named('MAT_ScreenContent'));
  add('Screen_Glass', named('MAT_Glass'));
  add('Artwork_Marquee', named('MAT_Skin_Marquee'));
  add('Trim_ControlDeck', named('MAT_LED_Emissive'));
  add('P1_Joystick_Ball', named('MAT_Plastic_Blue'));
  add('P2_Joystick_Ball', named('MAT_Plastic_Red'));
  const stand = new THREE.Object3D();
  stand.name = 'INT_PlayerStand';
  stand.position.set(0, 0, 1.05);
  root.add(stand);
  return root;
}

const summaryFrame = (overrides = {}) => ({
  type: 'activity_state',
  version: 1,
  roomId: 'theater',
  roomEpoch: 3,
  activityId: 'orpheum-downhill-mayhem',
  sessionId: 'dm-1',
  revision: 5,
  serverNow: 1771000000000,
  audience: 'summary',
  status: 'lobby',
  matchId: 'match-0001',
  summary: {
    riderCount: 2,
    readyCount: 1,
    capacity: 6,
    mountain: 'classic',
    difficulty: 'mayhem',
    captainName: 'Robo',
    riders: [
      { slot: 0, playerId: 'u1', nickname: 'Robo', isAI: false, ready: true, normalizedProgress: 0, status: 'unready' },
      { slot: 1, playerId: 'ai-1', nickname: 'DIESEL', isAI: true, ready: false, normalizedProgress: 0, status: 'unready' },
    ],
    result: null,
  },
  ...overrides,
});

function makeInstance(overrides = {}) {
  injectArcadeCabinetTemplate(makeFakeTemplate());
  const worldGroup = new THREE.Group();
  const instance = getActivityModule('downhill-mayhem').initialize({
    activityDef: DOWNHILL_MAYHEM_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: null,
    generation: 1,
    roomId: 'theater',
    getPlayer: () => ({ position: new THREE.Vector3(9.3, 0, -3.85) }),
    ...overrides,
  });
  return { instance, worldGroup };
}

// --- pure display reduction -----------------------------------------------------

test('summaryToDisplayState derives idle/lobby/racing/results with AI distinction', () => {
  const idle = summaryToDisplayState({ status: 'idle', summary: {} }, null);
  assert.equal(idle.status, 'idle');
  assert.deepEqual(idle.riders, []);

  const lobby = summaryToDisplayState(summaryFrame(), null);
  assert.equal(lobby.status, 'lobby');
  assert.equal(lobby.riderCount, 2);
  assert.equal(lobby.readyCount, 1);
  assert.equal(lobby.mountain, 'classic');
  assert.equal(lobby.riders[1].isAI, true);

  const racing = summaryToDisplayState(summaryFrame({
    status: 'racing',
    summary: {
      riderCount: 3, readyCount: 3, capacity: 6, mountain: 'timber', difficulty: 'brutal',
      riders: [
        { slot: 0, playerId: 'u1', nickname: 'Robo', normalizedProgress: 0.2, status: 'racing' },
        { slot: 1, playerId: 'ai-1', nickname: 'DIESEL', isAI: true, normalizedProgress: 0.6, status: 'racing' },
        { slot: 2, playerId: 'u2', nickname: 'Kiln', normalizedProgress: 0.4, status: 'racing' },
      ],
      result: null,
    },
  }), lobby);
  assert.equal(racing.riders[0].nickname, 'DIESEL', 'field ranked by progress');
  assert.equal(racing.mountain, 'timber');

  const results = summaryToDisplayState(summaryFrame({
    status: 'results',
    summary: {
      riderCount: 2, readyCount: 0, capacity: 6, riders: [],
      result: {
        kind: 'downhill-mayhem', recordingStatus: 'session_only', reason: 'complete',
        standings: [{ slot: 0, playerId: 'u1', nickname: 'Robo', place: 1, timeMs: 61233, status: 'finished' }],
      },
    },
  }), racing);
  assert.equal(results.status, 'results');
  assert.equal(results.result.standings[0].timeMs, 61233);

  // Non-object frames keep the previous state.
  assert.equal(summaryToDisplayState(null, results), results);
});

test('summary riders are capped at six and progress is clamped', () => {
  const riders = Array.from({ length: 12 }, (_, i) => ({
    slot: i, playerId: `u${i}`, nickname: `R${i}`, normalizedProgress: i / 10, status: 'racing',
  }));
  const state = summaryToDisplayState(summaryFrame({ summary: { riders, result: null } }));
  assert.equal(state.riders.length, 6, 'never more than six riders on the display');
  for (const rider of state.riders) {
    assert.ok(rider.normalizedProgress >= 0 && rider.normalizedProgress <= 1);
  }
});

// --- module registration + cabinet lifecycle ------------------------------------

test('downhill-mayhem registers and initializes synchronously at the row slot', () => {
  const mod = getActivityModule('downhill-mayhem');
  assert.ok(mod, 'downhill-mayhem is registered');
  assert.equal(typeof mod.initialize, 'function');

  const { instance, worldGroup } = makeInstance();
  assert.equal(instance.id, 'orpheum-downhill-mayhem');
  assert.equal(instance.type, 'downhill-mayhem');
  assert.ok(instance.group instanceof THREE.Group);
  assert.ok(worldGroup.children.includes(instance.group));
  const [tx, , tz] = DOWNHILL_MAYHEM_ACTIVITY_DEFINITION.transform.position;
  assert.ok(Math.abs(instance.group.position.x - tx) < 1e-6);
  assert.ok(Math.abs(instance.group.position.z - tz) < 1e-6);
  instance.dispose();
});

test('summary snapshots drive the display; participant frames are invisible', () => {
  const { instance } = makeInstance();
  assert.equal(instance.getDisplayState().status, 'idle');

  instance.acceptSnapshot(summaryFrame());
  assert.equal(instance.getDisplayState().status, 'lobby');
  assert.equal(instance.getDisplayState().riderCount, 2);

  const before = JSON.stringify(instance.getDisplayState());
  instance.acceptSnapshot({
    ...summaryFrame({ audience: 'participants', status: 'racing', matchId: 'm2' }),
    state: { sim: { riders: { 0: { slot: 0, s: 500, vs: 30 } } } },
  });
  assert.equal(JSON.stringify(instance.getDisplayState()), before, 'participant data never reaches bystanders');

  // Stranger activity frames are ignored entirely.
  instance.acceptSnapshot(summaryFrame({ activityId: 'orpheum-pong', status: 'idle' }));
  assert.equal(instance.getDisplayState().status, 'lobby');
  instance.dispose();
});

test('countdown/abort events repaint and duplicate eventIds are deduped', () => {
  const { instance } = makeInstance();
  instance.acceptEvent({
    activityId: 'orpheum-downhill-mayhem', eventId: 'ev-1', eventType: 'countdown',
    matchId: 'm1', payload: { startAt: 1771000009000 },
  });
  assert.equal(instance.getDisplayState().status, 'countdown');
  assert.equal(instance.getDisplayState().countdownStartAt, 1771000009000);

  instance.acceptEvent({
    activityId: 'orpheum-downhill-mayhem', eventId: 'ev-1', eventType: 'countdown',
    matchId: 'm1', payload: { startAt: 999 },
  });
  assert.equal(instance.getDisplayState().countdownStartAt, 1771000009000, 'duplicate deduped');

  instance.acceptEvent({
    activityId: 'orpheum-downhill-mayhem', eventId: 'ev-2', eventType: 'race_aborted',
    matchId: 'm1', payload: { reason: 'server_overload' },
  });
  assert.equal(instance.getDisplayState().status, 'aborted');
  instance.dispose();
});

test('activity_result recovers the display and disposal is idempotent', () => {
  const { instance, worldGroup } = makeInstance();
  instance.acceptResult({
    activityId: 'orpheum-downhill-mayhem',
    result: {
      kind: 'downhill-mayhem', recordingStatus: 'session_only', reason: 'deadline',
      standings: [{ playerId: 'u1', place: 1, timeMs: null, status: 'dnf', dnfReason: 'deadline' }],
    },
  });
  assert.equal(instance.getDisplayState().status, 'results');

  assert.doesNotThrow(() => { instance.update(1.5, 1 / 60); });
  instance.dispose();
  instance.dispose();
  assert.equal(worldGroup.children.length, 0, 'world group empty after dispose');
});

test('beginParticipation forwards to the lazy controller', async () => {
  const participations = [];
  const worldGroup = new THREE.Group();
  const fresh = createDownhillMayhemInstance({
    activityDef: DOWNHILL_MAYHEM_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    getParticipation: () => ({
      currentActivity: null,
      isParticipating: false,
      join: (def, opts) => participations.push({ def, opts }),
    }),
  });
  const ok = await fresh.beginParticipation();
  assert.equal(ok, true);
  assert.equal(participations.length, 1, 'join requested through the controller');
  assert.equal(participations[0].opts.role, 'play');
  fresh.dispose();
});

// --- bystander economy ----------------------------------------------------------

test('bystander module never statically imports game/controller code and has one dynamic import', () => {
  const source = readFileSync(new URL('../src/activities/downhill-mayhem.js', import.meta.url), 'utf8');
  const imports = [...source.matchAll(/import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of imports) {
    assert.ok(!spec.includes('games/downhill-mayhem'), `static import "${spec}" must not reach the game`);
    assert.ok(!spec.includes('./downhill/'), `static import "${spec}" must not reach the controller`);
  }
  const dynamicImports = [...source.matchAll(/import\((['"])([^'"]+)\1\)/g)].map((m) => m[2]);
  assert.deepEqual(dynamicImports, ['./downhill/controller.js'], 'exactly one dynamic import: the lazy controller');
});

test('the Orpheum row places Downhill Mayhem in the Signal Lost slot', () => {
  const ids = DOWNHILL_MAYHEM_ACTIVITY_DEFINITION;
  assert.equal(ids.id, 'orpheum-downhill-mayhem');
  assert.equal(ids.cabinet.skin.motif, 'downhill');
  assert.equal(ids.capacities.players, 6);
  assert.equal(ids.minPlayers, 1);
  assert.equal(ids.readyPolicy, 'explicit');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getActivityModule } from '../src/activities/registry.js';
import { SPOREFALL_ACTIVITY_DEFINITION } from '../shared/placeDefinitions.js';
import '../src/activities/sporefall.js';

const sporefallEnvelope = (overrides = {}) => ({
  type: 'activity_state',
  version: 1,
  roomId: 'theater',
  activityId: 'orpheum-sporefall',
  revision: 7,
  status: 'in_progress',
  matchId: 'match_1',
  state: {
    sim: {
      state: 'running',
      tick: 120,
      grid: Array.from({ length: 20 }, (_, r) =>
        Array.from({ length: 10 }, () => (r === 19 && r % 2 === 1 ? 3 : 0)),
      ),
      active: { type: 'T', x: 4, y: 3, rotation: 0 },
      next: 'J',
      score: 240,
      lines: 3,
      level: 2,
    },
  },
  ...overrides,
});

test('sporefall module is registered in activity registry', () => {
  const mod = getActivityModule('sporefall');
  assert.ok(mod, 'sporefall is registered');
  assert.equal(typeof mod.initialize, 'function');
});

test('createSporefallInstance builds 3D cabinet, screen, and camera at its transform', () => {
  const worldGroup = new THREE.Group();
  const instance = getActivityModule('sporefall').initialize({
    activityDef: SPOREFALL_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
    generation: 1,
    roomId: 'theater',
    getPlayer: () => ({ position: new THREE.Vector3(9.8, 0, -2.6) }),
  });

  assert.equal(instance.id, 'orpheum-sporefall');
  assert.equal(instance.type, 'sporefall');
  assert.ok(instance.group instanceof THREE.Group);
  assert.ok(worldGroup.children.includes(instance.group));
  assert.ok(instance.cabinetMesh instanceof THREE.Mesh);
  assert.ok(instance.screenMesh instanceof THREE.Mesh);
  assert.ok(instance.activityCamera instanceof THREE.PerspectiveCamera);

  // Manifest transform position [9.8, 0, -3.5]
  assert.equal(instance.group.position.x, 9.8);
  assert.equal(instance.group.position.z, -3.5);

  instance.dispose();
  assert.equal(worldGroup.children.includes(instance.group), false);
});

test('sporefall renders attract mode while idle and live run state from acceptSnapshot', () => {
  const instance = getActivityModule('sporefall').initialize({
    activityDef: SPOREFALL_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getPlayer: () => ({ position: new THREE.Vector3(9.8, 0, -2.6) }),
  });

  // Idle: attract update runs without crashing and stays out of the live state
  instance.update(0, 0.016);
  assert.equal(instance.matchState, 'idle');

  // Authoritative envelope (session server shape: status + state.sim)
  instance.acceptSnapshot(sporefallEnvelope());
  assert.equal(instance.matchState, 'running');
  assert.equal(instance.latestSnapshot.simState.score, 240);
  assert.equal(instance.latestSnapshot.simState.next, 'J');

  // Spectator updates continue while the run is live
  instance.update(0, 0.016);

  // Terminal envelope + event
  instance.acceptSnapshot(sporefallEnvelope({ status: 'ended' }));
  instance.acceptEvent({ eventType: 'match_ended', data: { reason: 'top_out', score: 240 } });
  assert.equal(instance.matchState, 'completed');
  instance.update(0, 0.016);

  instance.dispose();
});

test('sporefall participation focus acquires the cabinet camera and unfocus restores it', () => {
  let activeCamera = null;
  const instance = getActivityModule('sporefall').initialize({
    activityDef: SPOREFALL_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    setActivityCamera: (cam) => { activeCamera = cam; },
    clearActivityCamera: () => { activeCamera = null; },
  });

  instance.setParticipation(true, 0);
  assert.equal(instance.isParticipating, true);
  assert.equal(activeCamera, instance.activityCamera);

  instance.setParticipation(false, 0);
  assert.equal(instance.isParticipating, false);
  assert.equal(activeCamera, null);

  instance.dispose();
});

test('sporefall focus derives from participation snapshots (spectators stay in world control)', () => {
  let activeCamera = null;
  let participation = null;
  const instance = getActivityModule('sporefall').initialize({
    activityDef: SPOREFALL_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getParticipation: () => participation,
    setActivityCamera: (cam) => { activeCamera = cam; },
    clearActivityCamera: () => { activeCamera = null; },
  });

  // Spectating: snapshot arrives but no seat is held
  participation = { isParticipating: false };
  instance.acceptSnapshot(sporefallEnvelope());
  assert.equal(instance.isParticipating, false);
  assert.equal(activeCamera, null);

  // Seated at slot 0: focus follows the session
  participation = {
    isParticipating: true,
    currentActivity: { id: 'orpheum-sporefall' },
    currentSlot: 0,
  };
  instance.acceptSnapshot(sporefallEnvelope());
  assert.equal(instance.isParticipating, true);
  assert.equal(activeCamera, instance.activityCamera);

  // Seat lost: focus and camera release
  participation = { isParticipating: false };
  instance.acceptSnapshot(sporefallEnvelope());
  assert.equal(instance.isParticipating, false);
  assert.equal(activeCamera, null);

  instance.dispose();
});

test('sporefall inputs carry sessionId, lease and monotonic sequence', () => {
  const sentInputs = [];
  const instance = getActivityModule('sporefall').initialize({
    activityDef: SPOREFALL_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getParticipation: () => ({
      lease: 'lease_sf_1',
      sessionId: 'sess_sf_1',
      isParticipating: true,
      currentActivity: { id: 'orpheum-sporefall' },
      currentSlot: 0,
    }),
    setActivityCamera: () => {},
    net: {
      sendActivityInput: (payload) => sentInputs.push(payload),
    },
  });

  instance.setParticipation(true, 0);
  instance.inputManager.sampleInput({ left: false, right: true, rotate: false, down: false, drop: false });

  assert.equal(sentInputs.length, 1);
  const payload = sentInputs[0];
  assert.equal(payload.sessionId, 'sess_sf_1');
  assert.equal(payload.lease, 'lease_sf_1');
  assert.equal(payload.activityId, 'orpheum-sporefall');
  assert.equal(typeof payload.seq, 'number');
  assert.ok(payload.seq >= 1);
  assert.equal(payload.controls.right, true);

  instance.dispose();
});

test('sporefall neutralizeInput releases controls (blur, chat focus, dialogs)', () => {
  const sentInputs = [];
  const instance = getActivityModule('sporefall').initialize({
    activityDef: SPOREFALL_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getParticipation: () => ({
      lease: 'lease_sf_1',
      sessionId: 'sess_sf_1',
      isParticipating: true,
      currentActivity: { id: 'orpheum-sporefall' },
      currentSlot: 0,
    }),
    setActivityCamera: () => {},
    net: {
      sendActivityInput: (payload) => sentInputs.push(payload),
    },
  });

  instance.setParticipation(true, 0);
  instance.inputManager.sampleInput({ left: true, right: false, rotate: false, down: false, drop: false });

  instance.neutralizeInput();
  assert.equal(instance.inputManager.isNeutralized, true);
  // Neutralization releases held controls with a zero-controls sample
  const last = sentInputs[sentInputs.length - 1];
  assert.deepEqual(last.controls, {});

  instance.dispose();
});

test('sporefall acceptResult and acceptError record terminal envelopes without touching rules', () => {
  const instance = getActivityModule('sporefall').initialize({
    activityDef: SPOREFALL_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
  });

  instance.acceptResult({
    type: 'activity_result',
    roomId: 'theater',
    activityId: 'orpheum-sporefall',
    result: { result: 'seated', role: 'player', slot: 0, lease: 'lease_sf_1', sessionId: 'sess_sf_1' },
  });
  assert.equal(instance.lastResult.result, 'seated');
  assert.equal(instance.lastResult.sessionId, 'sess_sf_1');

  instance.acceptError({
    type: 'activity_error',
    activityId: 'orpheum-sporefall',
    error: 'activity_full',
    message: 'Activity is full',
  });
  assert.equal(instance.lastError.error, 'activity_full');

  instance.dispose();
});

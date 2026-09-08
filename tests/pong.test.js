import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getActivityModule, hasActivityModule } from '../src/activities/registry.js';
import { createPongInstance, PongModule } from '../src/activities/pong.js';
import { PONG_ACTIVITY_DEFINITION } from '../shared/placeDefinitions.js';

test('pong module is registered in activity registry', () => {
  assert.equal(hasActivityModule('pong'), true);
  assert.equal(getActivityModule('pong'), PongModule);
});

test('createPongInstance creates 3D cabinet, screen, and camera', () => {
  const worldGroup = new THREE.Group();
  let acquiredCamera = null;
  let releasedCamera = false;

  const instance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
    generation: 1,
    roomId: 'theater',
    getActiveCamera: () => null,
    getPlayer: () => ({ position: new THREE.Vector3(8, 0, -3.5) }),
    setActivityCamera: (cam) => { acquiredCamera = cam; },
    clearActivityCamera: () => { releasedCamera = true; },
  });

  assert.equal(instance.id, 'orpheum-pong');
  assert.ok(instance.group instanceof THREE.Group);
  assert.ok(worldGroup.children.includes(instance.group));
  assert.ok(instance.cabinetMesh instanceof THREE.Mesh);
  assert.ok(instance.screenMesh instanceof THREE.Mesh);
  assert.ok(instance.activityCamera instanceof THREE.Camera);

  // Position matches transform
  assert.equal(instance.group.position.x, 8.0);
  assert.equal(instance.group.position.z, -3.5);

  instance.dispose();
  assert.equal(worldGroup.children.includes(instance.group), false);
});

test('pong instance renders attract mode when idle', () => {
  const worldGroup = new THREE.Group();
  const instance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
  });

  // Calling update in attract mode advances attract demo and does not error
  assert.doesNotThrow(() => {
    instance.update(0, 0.016);
    instance.update(0.016, 0.016);
    instance.update(0.032, 0.016);
  });

  instance.dispose();
});

test('pong instance accepts authoritative snapshots and sound events', () => {
  const worldGroup = new THREE.Group();
  const instance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
  });

  const snapshot = {
    activityId: 'orpheum-pong',
    sessionId: 'sess_123',
    status: 'in_progress',
    sim: {
      width: 800,
      height: 500,
      ball: { x: 410, y: 255, vx: 5, vy: 1.5, radius: 8 },
      paddles: {
        '0': { x: 40, y: 240, width: 14, height: 70 },
        '1': { x: 760, y: 260, width: 14, height: 70 },
      },
      score: { '0': 3, '1': 2 },
      targetScore: 7,
      state: 'rally',
    },
  };

  assert.doesNotThrow(() => {
    instance.acceptSnapshot({ payload: snapshot });
    instance.update(0.05, 0.016);
  });

  assert.equal(instance.latestSnapshot.status, 'in_progress');

  // Match started and ended events
  assert.doesNotThrow(() => {
    instance.acceptEvent({ type: 'match_started', payload: { matchId: 'm1' } });
    instance.acceptEvent({ type: 'match_ended', payload: { winner: 'p1', reason: 'score' } });
  });

  instance.dispose();
});

test('pong focusActivity acquires activity camera and unfocusActivity restores world camera', () => {
  const worldGroup = new THREE.Group();
  let currentCamera = null;
  let cleared = false;

  const instance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
    setActivityCamera: (cam) => { currentCamera = cam; },
    clearActivityCamera: () => { cleared = true; currentCamera = null; },
  });

  instance.focusActivity(0);
  assert.equal(currentCamera, instance.activityCamera);

  instance.unfocusActivity();
  assert.equal(cleared, true);
  assert.equal(currentCamera, null);

  instance.dispose();
});

test('pong input manager sends inputs during active participation', () => {
  const worldGroup = new THREE.Group();
  const sentInputs = [];

  const listeners = {};
  globalThis.window = {
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener: (type, fn) => {
      if (listeners[type]) listeners[type] = listeners[type].filter(f => f !== fn);
    },
  };

  const mockNet = {
    sendActivityReady: () => {},
    sendActivityInput: (req) => { sentInputs.push(req); },
  };

  const instance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: mockNet,
    getParticipation: () => ({
      isParticipating: true,
      currentSlot: 0,
      currentActivity: { id: 'orpheum-pong' },
      lease: 'lease_xyz',
    }),
  });

  // Focus and trigger simulated key down and update
  instance.focusActivity(0);
  listeners['keydown']?.forEach(fn => fn({ code: 'KeyW', preventDefault: () => {} }));

  instance.update(0, 0.016);

  assert.ok(sentInputs.length > 0, 'Input was sent to network client');
  const input = sentInputs[0];
  assert.equal(input.activityId, 'orpheum-pong');
  assert.equal(input.lease, 'lease_xyz');
  assert.equal(input.seq, 1);
  assert.equal(input.controls.up, true);

  listeners['keyup']?.forEach(fn => fn({ code: 'KeyW' }));

  instance.unfocusActivity();
  instance.dispose();
  delete globalThis.window;
});

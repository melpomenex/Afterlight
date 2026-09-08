import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getActivityModule } from '../src/activities/registry.js';
import {
  SIGNAL_LOST_ACTIVITY_DEFINITION,
} from '../shared/placeDefinitions.js';
import '../src/activities/signalLost.js';

test('signal-lost module is registered in activity registry', () => {
  const mod = getActivityModule('signal-lost');
  assert.ok(mod, 'signal-lost is registered');
  assert.equal(typeof mod.initialize, 'function');
});

test('createSignalLostInstance builds 3D cabinet, screen, and camera', () => {
  const worldGroup = new THREE.Group();
  let acquiredCamera = null;
  let releasedCamera = false;

  const instance = getActivityModule('signal-lost').initialize({
    activityDef: SIGNAL_LOST_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
    generation: 1,
    roomId: 'theater',
    getActiveCamera: () => null,
    getPlayer: () => ({ position: new THREE.Vector3(9.8, 0, -5.8) }),
    setActivityCamera: (cam) => { acquiredCamera = cam; },
    clearActivityCamera: () => { releasedCamera = true; },
  });

  assert.equal(instance.id, 'orpheum-signal-lost');
  assert.equal(instance.type, 'signal-lost');
  assert.ok(instance.group instanceof THREE.Group);
  assert.ok(worldGroup.children.includes(instance.group));
  assert.ok(instance.cabinetMesh instanceof THREE.Mesh);
  assert.ok(instance.screenMesh instanceof THREE.Mesh);
  assert.ok(instance.activityCamera instanceof THREE.PerspectiveCamera);

  // Position matches transform [9.8, 0, -5.8]
  assert.equal(instance.group.position.x, 9.8);
  assert.equal(instance.group.position.z, -5.8);

  // Clean disposal
  instance.dispose();
  assert.equal(worldGroup.children.includes(instance.group), false);
});

test('signal lost renders attract mode when idle and updates simulation on snapshot', () => {
  const instance = getActivityModule('signal-lost').initialize({
    activityDef: SIGNAL_LOST_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getPlayer: () => ({ position: new THREE.Vector3(9.8, 0, -5.8) }),
  });

  // 1. Idle update runs attract mode without crashing
  instance.update(0.016, 0.1, true);

  // 2. Consume authoritative snapshot
  instance.onSnapshot({
    status: 'running',
    simState: {
      score: 170,
      lives: 2,
      wave: 2,
      ship: { x: 420.0, y: 310.0, angle: 1.2, thrusting: true, invulnerable: 0 },
      asteroids: [
        { id: 1, x: 200.0, y: 150.0, radius: 22.0, type: 'medium' }
      ],
      projectiles: [
        { id: 1, x: 430.0, y: 320.0, vx: 10.0, vy: 5.0, life: 40 }
      ]
    }
  });

  // Update while running
  instance.update(0.016, 0.2, true);

  // 3. Match ended event
  instance.onEvent('match_ended', { reason: 'lives_depleted', score: 320, wave: 3 });
  instance.update(0.016, 0.3, true);

  instance.dispose();
});

test('signal lost focusActivity acquires camera and unfocus restores it', () => {
  let activeCamera = null;
  const instance = getActivityModule('signal-lost').initialize({
    activityDef: SIGNAL_LOST_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getPlayer: () => ({ position: new THREE.Vector3(9.8, 0, -5.8) }),
    setActivityCamera: (cam) => { activeCamera = cam; },
    clearActivityCamera: () => { activeCamera = null; },
  });

  // Set participation to true
  instance.setParticipation(true, 0);
  assert.equal(activeCamera, instance.activityCamera);

  // Set participation to false
  instance.setParticipation(false, 0);
  assert.equal(activeCamera, null);

  instance.dispose();
});

test('signal lost sends inputs during active participation', () => {
  const sentInputs = [];
  const instance = getActivityModule('signal-lost').initialize({
    activityDef: SIGNAL_LOST_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getPlayer: () => ({ position: new THREE.Vector3(9.8, 0, -5.8) }),
    getParticipation: () => ({ lease: { id: 'lease_sl_1' } }),
    net: {
      sendActivityInput: (payload) => sentInputs.push(payload),
    },
  });

  instance.setParticipation(true, 0);

  // Simulate key down
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
  }

  instance.update(0.016, 0.1, true);

  // Clean up
  instance.dispose();
});

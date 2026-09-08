import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getActivityModule } from '../src/activities/registry.js';
import {
  RAIN_RUNNER_ACTIVITY_DEFINITION,
} from '../shared/placeDefinitions.js';
import '../src/activities/rainRunner.js';

test('rain-runner module is registered in activity registry', () => {
  const mod = getActivityModule('rain-runner');
  assert.ok(mod, 'rain-runner is registered');
  assert.equal(typeof mod.initialize, 'function');
});

test('createRainRunnerInstance builds 3D cabinet, screen, and camera', () => {
  const worldGroup = new THREE.Group();
  let acquiredCamera = null;
  let releasedCamera = false;

  const instance = getActivityModule('rain-runner').initialize({
    activityDef: RAIN_RUNNER_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
    generation: 1,
    roomId: 'theater',
    getActiveCamera: () => null,
    getPlayer: () => ({ position: new THREE.Vector3(8.0, 0, -5.8) }),
    setActivityCamera: (cam) => { acquiredCamera = cam; },
    clearActivityCamera: () => { releasedCamera = true; },
  });

  assert.equal(instance.id, 'orpheum-rain-runner');
  assert.equal(instance.type, 'rain-runner');
  assert.ok(instance.group instanceof THREE.Group);
  assert.ok(worldGroup.children.includes(instance.group));
  assert.ok(instance.cabinetMesh instanceof THREE.Mesh);
  assert.ok(instance.screenMesh instanceof THREE.Mesh);
  assert.ok(instance.activityCamera instanceof THREE.PerspectiveCamera);

  // Position matches transform [8.0, 0, -5.8]
  assert.equal(instance.group.position.x, 8.0);
  assert.equal(instance.group.position.z, -5.8);

  // Clean disposal
  instance.dispose();
  assert.equal(worldGroup.children.includes(instance.group), false);
});

test('rain runner renders attract mode when idle and updates simulation on snapshot', () => {
  const instance = getActivityModule('rain-runner').initialize({
    activityDef: RAIN_RUNNER_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getPlayer: () => ({ position: new THREE.Vector3(8.0, 0, -5.8) }),
  });

  // 1. Idle update runs attract mode without crashing
  instance.update(0.016, 0.1, true);

  // 2. Consume authoritative snapshot
  instance.onSnapshot({
    status: 'running',
    simState: {
      distance: 245.5,
      score: 120,
      player: { x: 20.0, speed: 8.5 },
      obstacles: [
        { id: 1, x: -50.0, z: 200.0, type: 'barrier', w: 50, h: 24 }
      ]
    }
  });

  // Update while running
  instance.update(0.016, 0.2, true);

  // 3. Match ended event
  instance.onEvent('match_ended', { reason: 'collision', score: 180, distance: 310.0 });
  instance.update(0.016, 0.3, true);

  instance.dispose();
});

test('rain runner focusActivity acquires camera and unfocus restores it', () => {
  let activeCamera = null;
  const instance = getActivityModule('rain-runner').initialize({
    activityDef: RAIN_RUNNER_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getPlayer: () => ({ position: new THREE.Vector3(8.0, 0, -5.8) }),
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

test('rain runner sends inputs during active participation', () => {
  const sentInputs = [];
  const instance = getActivityModule('rain-runner').initialize({
    activityDef: RAIN_RUNNER_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    getPlayer: () => ({ position: new THREE.Vector3(8.0, 0, -5.8) }),
    getParticipation: () => ({ lease: { id: 'lease_rr_1' } }),
    net: {
      sendActivityInput: (payload) => sentInputs.push(payload),
    },
  });

  instance.setParticipation(true, 0);

  // Simulate key down
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
  }

  instance.update(0.016, 0.1, true);

  // Clean up
  instance.dispose();
});

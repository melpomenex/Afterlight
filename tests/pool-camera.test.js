import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createPoolCamera,
  POOL_CAMERA_MODES,
  POOL_SHOT_CAMERA_OFFSET_LOCAL,
  POOL_STANDING_CAMERA_OFFSET_LOCAL,
  tableLocalToWorld,
} from '../src/activities/pool/camera.js';

test('pool camera: cue mode + settled balls uses cue view aligned with aim', () => {
  const tablePosition = [-8.6, 0, -4.5];
  const tableRotationY = Math.PI / 2;
  const poolCam = createPoolCamera({ tablePosition, tableRotationY });
  poolCam.activate();

  assert.equal(poolCam.mode, 'cue');
  poolCam.update({ cueX: -0.56, cueZ: 0, angle: 0, power: 0.5, settled: true }, 1.0);

  assert.equal(poolCam.presentationState, 'aiming');
  const target = poolCam.targetPosition;
  // With table rotation PI/2, cue ball at (-0.56, 0) is at world X = -8.6, Z = -3.94
  // Aim angle 0 points in local +X, which is world -Z
  // Camera target sits behind the cue ball along local -X, which is world +Z
  assert.ok(target.z > -3.94, 'cue camera is positioned behind cue ball');
  assert.ok(target.y < 1.5, 'cue camera is at low elevation');
  assert.notEqual(target.x, tablePosition[0] + 10, 'camera targets near table');
});

test('pool camera: cue mode + shot release does NOT use direct overhead camera', () => {
  const tablePosition = [-8.6, 0, -4.5];
  const tableRotationY = Math.PI / 2;
  const poolCam = createPoolCamera({ tablePosition, tableRotationY });
  poolCam.activate();

  // 1. Aiming before shot
  poolCam.update({ cueX: -0.56, cueZ: 0, angle: 0, power: 0.5, settled: true }, 1.0);
  assert.equal(poolCam.presentationState, 'aiming');

  // 2. Shot released: balls moving (!settled)
  poolCam.update({ cueX: -0.56, cueZ: 0, angle: 0, power: 0.5, settled: false }, 1.0);
  assert.equal(poolCam.presentationState, 'shot_follow');

  const target = poolCam.targetPosition;
  // The fatal bug was setting targetPos directly at (tableX, 3.8, tableZ)
  const isDirectOverhead = Math.abs(target.x - tablePosition[0]) < 0.1 && Math.abs(target.z - tablePosition[2]) < 0.1;
  assert.equal(isDirectOverhead, false, 'shot camera MUST NOT sit directly above table center');

  // Must have substantial horizontal displacement from table center
  const horizontalDist = Math.hypot(target.x - tablePosition[0], target.z - tablePosition[2]);
  assert.ok(horizontalDist >= 2.0, `shot camera horizontal offset (${horizontalDist}m) should exceed 2.0m`);
});

test('pool camera: shot-follow camera guarantees line-of-sight clears hanging lamp', () => {
  const tablePosition = [-8.6, 0, -4.5];
  const tableRotationY = Math.PI / 2;
  const poolCam = createPoolCamera({ tablePosition, tableRotationY });
  poolCam.activate();

  poolCam.update({ cueX: 0, cueZ: 0, angle: 0, power: 0, settled: false }, 1.0);
  const camPos = poolCam.targetPosition;
  const lookTarget = poolCam.lookTarget;

  // The Orpheum hanging lamp:
  // Center: x = -8.6, y = 2.6, z = -4.5. Shade width in X = 0.55m -> bounds x in [-8.875, -8.325].
  // Lamp glow is at y = 2.48m. Lamp cord extends from y = 2.7m to 3.9m.
  // Verify camera is outside lamp bounding cylinder:
  assert.ok(camPos.x > -8.325, 'camera position is well to the east of the lamp footprint');

  // Evaluate the ray from camera to table lookTarget:
  // At the eastern edge of the lamp (x = -8.325):
  const t = (-8.325 - camPos.x) / (lookTarget.x - camPos.x);
  const rayYAtLampEdge = camPos.y + t * (lookTarget.y - camPos.y);

  // Bottom of lamp is at y = 2.48m. The line of sight must pass safely beneath it:
  const clearance = 2.48 - rayYAtLampEdge;
  assert.ok(clearance > 1.0, `line-of-sight ray passes ${clearance.toFixed(2)}m beneath the lamp (must be > 1.0m)`);
});

test('pool camera: settled balls smoothly return from shot-follow to cue view', () => {
  const tablePosition = [-8.6, 0, -4.5];
  const tableRotationY = Math.PI / 2;
  const poolCam = createPoolCamera({ tablePosition, tableRotationY });
  poolCam.activate();

  // Shot active
  poolCam.update({ cueX: 0.2, cueZ: -0.1, angle: 0.5, power: 0.7, settled: false, status: 'shooting' }, 1.0);
  assert.equal(poolCam.presentationState, 'shot_follow');
  assert.equal(poolCam.mode, 'cue', 'base mode index is never corrupted by automatic shot camera');

  // Shot settles
  poolCam.update({ cueX: 0.2, cueZ: -0.1, angle: 0.5, power: 0.4, settled: true, status: 'aiming' }, 1.0);
  assert.equal(poolCam.presentationState, 'aiming');
  assert.equal(poolCam.mode, 'cue');
});

test('pool camera: explicit manual overhead and standing modes are preserved', () => {
  const tablePosition = [-8.6, 0, -4.5];
  const tableRotationY = Math.PI / 2;
  const poolCam = createPoolCamera({ tablePosition, tableRotationY });
  poolCam.activate();

  // 1. Cycle to standing
  assert.equal(poolCam.cycleMode(), 'standing');
  poolCam.update({ cueX: 0, cueZ: 0, angle: 0, power: 0, settled: false }, 1.0);
  assert.equal(poolCam.presentationState, 'standing');
  assert.ok(poolCam.targetPosition.x > -8.6);

  // 2. Cycle to overhead
  assert.equal(poolCam.cycleMode(), 'overhead');
  poolCam.update({ cueX: 0, cueZ: 0, angle: 0, power: 0, settled: false }, 1.0);
  assert.equal(poolCam.presentationState, 'overhead');
  // In manual overhead mode, directly centered over the table
  assert.ok(Math.abs(poolCam.targetPosition.x - (-8.6)) < 0.01);
  assert.ok(Math.abs(poolCam.targetPosition.z - (-4.5)) < 0.01);
  assert.ok(poolCam.targetPosition.y >= 3.5);

  // 3. Cycle back to cue
  assert.equal(poolCam.cycleMode(), 'cue');
  poolCam.update({ cueX: 0, cueZ: 0, angle: 0, power: 0, settled: true }, 1.0);
  assert.equal(poolCam.presentationState, 'aiming');
});

test('pool camera: reduced motion respects accessibility while avoiding obstruction', () => {
  const tablePosition = [-8.6, 0, -4.5];
  const tableRotationY = Math.PI / 2;

  // Mock prefers-reduced-motion in global window
  const originalWindow = global.window;
  global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    matchMedia: (query) => ({
      matches: query.includes('prefers-reduced-motion'),
    }),
  };

  try {
    const poolCam = createPoolCamera({ tablePosition, tableRotationY });
    poolCam.activate();

    // With reduced motion, update with slow lerpSpeed should still snap immediately
    poolCam.update({ cueX: 0, cueZ: 0, angle: 0, power: 0, settled: false }, 0.01);
    assert.equal(poolCam.presentationState, 'shot_follow');

    const cam = poolCam.camera;
    const target = poolCam.targetPosition;
    assert.ok(Math.abs(cam.position.x - target.x) < 0.001, 'position snapped immediately without lerping');
    assert.ok(Math.abs(cam.position.z - target.z) < 0.001);

    // Obstruction check still holds under reduced motion
    const isDirectOverhead = Math.abs(cam.position.x - tablePosition[0]) < 0.1 && Math.abs(cam.position.z - tablePosition[2]) < 0.1;
    assert.equal(isDirectOverhead, false, 'reduced motion does not use lamp-obstructed overhead view');
  } finally {
    global.window = originalWindow;
  }
});

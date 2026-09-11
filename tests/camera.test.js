import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextCameraMode, clampPitch, moveBasis, classifyDrag, applyLookDelta,
  FP_MODE, PITCH_MIN, PITCH_MAX, DRAG_THRESHOLD_PX, LOOK_SENS_YAW, LOOK_SENS_PITCH, MAX_LOOK_STEP_PX,
} from '../src/cameraControl.js';

const near = (a, b, eps = 1e-12) => Math.abs(a - b) < eps;

test('camera cycle passes through first person and wraps', () => {
  assert.deepEqual([0, 1, 2, 3].map(nextCameraMode), [1, 2, 3, 0]);
});

test('isometric movement basis matches the original rotation table', () => {
  const angles = [Math.PI / 4, 0, -Math.PI / 4];
  const inputs = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]];
  for (let mode = 0; mode < angles.length; mode++) {
    for (const [mx, mz] of inputs) {
      // applyAxisAngle around +Y rotates (x, z) to (x cos + z sin, -x sin + z cos)
      const expected = {
        x: mx * Math.cos(angles[mode]) + mz * Math.sin(angles[mode]),
        z: -mx * Math.sin(angles[mode]) + mz * Math.cos(angles[mode]),
      };
      const got = moveBasis(mode, 0, mx, mz);
      assert.ok(near(got.x, expected.x) && near(got.z, expected.z),
        `mode ${mode} input (${mx}, ${mz}) diverged from the original basis`);
    }
  }
});

test('first person walks toward the view heading and strafes', () => {
  // The camera looks down -Z at yaw 0: W walks -Z, A strafes to the view's left (-X).
  let dir = moveBasis(FP_MODE, 0, 0, -1);
  assert.ok(near(dir.x, 0) && near(dir.z, -1), `yaw 0 forward was (${dir.x}, ${dir.z})`);
  dir = moveBasis(FP_MODE, 0, -1, 0);
  assert.ok(near(dir.x, -1) && near(dir.z, 0), `yaw 0 left-strafe was (${dir.x}, ${dir.z})`);

  // Turning the view 180 degrees reverses W (yaw PI faces +Z).
  dir = moveBasis(FP_MODE, Math.PI, 0, -1);
  assert.ok(near(dir.x, 0) && near(dir.z, 1), `yaw PI forward was (${dir.x}, ${dir.z})`);

  // Diagonal input arrives at move() at sqrt(2) length, like the isometric path.
  dir = moveBasis(FP_MODE, 0, 1, -1);
  assert.ok(near(Math.hypot(dir.x, dir.z), Math.SQRT2));
});

test('pitch clamps within look limits', () => {
  assert.equal(clampPitch(10), PITCH_MAX);
  assert.equal(clampPitch(-10), PITCH_MIN);
  assert.equal(clampPitch(0.2), 0.2);
});

test('pointer gesture: sub-threshold is a click, beyond is a drag that sticks', () => {
  assert.equal(classifyDrag(100, 100, 100 + DRAG_THRESHOLD_PX, 100, false), false,
    'travel exactly at the threshold is still a click');
  assert.equal(classifyDrag(100, 100, 100 + DRAG_THRESHOLD_PX + 0.5, 100, false), true);
  assert.equal(classifyDrag(100, 100, 90, 108, false), true);
  // Once dragging, a release back near the origin must not re-classify as a click.
  assert.equal(classifyDrag(100, 100, 100, 100, true), true);
});

test('look delta: direct, non-inverted, shared by drag and hover paths', () => {
  // Mouse right looks right (yaw decreases); mouse up (dy < 0) looks up.
  let { yaw, pitch } = applyLookDelta(0, 0, 100, 0);
  assert.ok(near(yaw, -100 * LOOK_SENS_YAW), `mouse-right yaw was ${yaw}`);
  ({ yaw, pitch } = applyLookDelta(yaw, pitch, 0, -100));
  assert.ok(near(pitch, 100 * LOOK_SENS_PITCH), `mouse-up pitch was ${pitch}`);

  // Both paths get the same rule: the old inline drag arithmetic is identical.
  const dx = 37, dy = -23;
  const direct = { yaw: -dx * LOOK_SENS_YAW, pitch: clampPitch(-dy * LOOK_SENS_PITCH) };
  assert.deepEqual(applyLookDelta(0, 0, dx, dy), direct);
});

test('look delta: pitch saturates at its limit', () => {
  const { pitch } = applyLookDelta(0, PITCH_MAX - 0.01, 0, -10000);
  assert.equal(pitch, PITCH_MAX);
  assert.equal(applyLookDelta(0, PITCH_MIN + 0.01, 0, 10000).pitch, PITCH_MIN);
});

test('look delta: absurd per-event spikes are clamped, not applied raw', () => {
  // A pointer re-entry can report a huge jump; it must move the view no more
  // than MAX_LOOK_STEP_PX worth of travel.
  const { yaw } = applyLookDelta(0, 0, 1e6, 0);
  assert.ok(near(yaw, -MAX_LOOK_STEP_PX * LOOK_SENS_YAW), `spike yaw was ${yaw}`);
  const { yaw: negYaw } = applyLookDelta(0, 0, -1e6, 0);
  assert.ok(near(negYaw, MAX_LOOK_STEP_PX * LOOK_SENS_YAW));
});

test('look delta: zero movement leaves the view untouched', () => {
  assert.deepEqual(applyLookDelta(0.42, -0.1, 0, 0), { yaw: 0.42, pitch: -0.1 });
});

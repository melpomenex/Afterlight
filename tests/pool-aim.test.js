import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoolController } from '../src/activities/pool/controller.js';

function makeSim(cueX = 0, cueZ = 0) {
  return {
    turn: 0,
    status: 'aiming',
    physics: {
      settled: true,
      balls: { 0: { id: 0, x: cueX, z: cueZ, state: 'in_play' } },
    },
  };
}

function makeController() {
  const c = createPoolController({ tablePosition: [0, 0, 0], tableRotationY: 0 });
  c.activate(0);
  c.update(1 / 60, makeSim());
  return c;
}

test('mouse aim does not snap instantly; it converges smoothly', () => {
  const c = makeController();
  try {
    const before = c.aimAngle;
    c.handleTablePointerMove(1, 0); // target angle 0-ish
    assert.equal(c.aimAngle, before, 'pointer move must not change rendered angle instantly');
    for (let i = 0; i < 120; i++) c.update(1 / 60, makeSim());
    assert.ok(Math.abs(c.aimAngle - 0) < 0.02, `cue converges to target, got ${c.aimAngle}`);
  } finally {
    c.deactivate();
  }
});

test('small pointer jitter produces bounded angle change', () => {
  const c = makeController();
  try {
    c.handleTablePointerMove(1, 0);
    for (let i = 0; i < 120; i++) c.update(1 / 60, makeSim());
    const settled = c.aimAngle;
    c.handleTablePointerMove(1, 0.01); // ~0.01 rad target nudge
    c.update(1 / 60, makeSim());
    assert.ok(
      Math.abs(c.aimAngle - settled) < 0.05,
      `single-frame jitter step bounded, moved ${c.aimAngle - settled}`,
    );
  } finally {
    c.deactivate();
  }
});

test('pointer jitter inside the near-ball dead zone does not move the cue', () => {
  const c = makeController();
  try {
    c.handleTablePointerMove(1, 0);
    for (let i = 0; i < 120; i++) c.update(1 / 60, makeSim());
    const settled = c.aimAngle;
    const targetBefore = c.aimTargetAngle;
    c.handleTablePointerMove(0.01, 0.01); // well inside dead zone around cue ball
    c.handleTablePointerMove(-0.02, 0.015);
    for (let i = 0; i < 30; i++) c.update(1 / 60, makeSim());
    assert.equal(c.aimTargetAngle, targetBefore, 'dead-zone hover must not retarget aim');
    assert.ok(Math.abs(c.aimAngle - settled) < 1e-6, 'cue stays planted on near-ball jitter');
  } finally {
    c.deactivate();
  }
});

test('fast sweep follows at a bounded rate without oscillation', () => {
  const c = makeController();
  try {
    c.handleTablePointerMove(1, 0);
    for (let i = 0; i < 120; i++) c.update(1 / 60, makeSim());
    c.handleTablePointerMove(0, 1); // 90-degree sweep, target = PI/2
    let peak = -Infinity;
    for (let i = 0; i < 10; i++) {
      c.update(1 / 60, makeSim());
      peak = Math.max(peak, c.aimAngle);
      assert.ok(c.aimAngle >= -0.05, 'no backward snap on fast sweep');
    }
    assert.ok(peak < Math.PI / 2 + 0.05, `no overshoot past target, peak ${peak}`);
    for (let i = 0; i < 300; i++) c.update(1 / 60, makeSim());
    assert.ok(Math.abs(c.aimAngle - Math.PI / 2) < 0.02, `settles on target, got ${c.aimAngle}`);
  } finally {
    c.deactivate();
  }
});

test('convergence takes the short arc across the +-PI seam', () => {
  const c = makeController();
  try {
    c.aimAngle = Math.PI - 0.04; // target syncs here too
    c.handleTablePointerMove(-1, -0.04); // angle ≈ -PI + 0.04, just across the seam
    const target = c.aimTargetAngle;
    assert.ok(target < -Math.PI + 0.1, `target sits across the seam, got ${target}`);
    const before = c.aimAngle;
    c.update(1 / 60, makeSim());
    const step = c.aimAngle - before;
    assert.ok(step > 0 && step < 0.2, `short-arc step forward past PI, got ${step}`);
  } finally {
    c.deactivate();
  }
});

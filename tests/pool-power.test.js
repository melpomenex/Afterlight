import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POOL_MIN_CUE_SPEED,
  POOL_MAX_CUE_SPEED,
  POOL_POWER_EXPONENT,
  normalizedPowerToCueSpeed,
  initRack,
  strikeCueBall,
  step as physicsStep,
} from '../shared/pool/physics.js';
import { initGame, shoot, step as rulesStep } from '../shared/pool/rules.js';
import { createPoolController } from '../src/activities/pool/controller.js';

test('pool power: power curve maps calibrated speed checkpoints accurately', () => {
  assert.equal(POOL_MIN_CUE_SPEED, 0.65);
  assert.equal(POOL_MAX_CUE_SPEED, 32.0);
  assert.equal(POOL_POWER_EXPONENT, 1.35);

  // Checkpoint: 0.0 -> MIN_CUE_SPEED (gentle tap)
  assert.equal(normalizedPowerToCueSpeed(0.0), 0.65);

  // Checkpoint: 0.10 -> ~2.05 m/s (finesse shot)
  const sp10 = normalizedPowerToCueSpeed(0.10);
  assert.ok(Math.abs(sp10 - 2.05) < 0.05, `0.10 power -> ${sp10} m/s (expected ~2.05)`);

  // Checkpoint: 0.25 -> ~5.47 m/s (controlled positional roll)
  const sp25 = normalizedPowerToCueSpeed(0.25);
  assert.ok(Math.abs(sp25 - 5.47) < 0.05, `0.25 power -> ${sp25} m/s (expected ~5.47)`);

  // Checkpoint: 0.50 -> ~12.95 m/s (medium table shot)
  const sp50 = normalizedPowerToCueSpeed(0.50);
  assert.ok(Math.abs(sp50 - 12.95) < 0.05, `0.50 power -> ${sp50} m/s (expected ~12.95)`);

  // Checkpoint: 0.75 -> ~21.91 m/s (firm power shot)
  const sp75 = normalizedPowerToCueSpeed(0.75);
  assert.ok(Math.abs(sp75 - 21.91) < 0.05, `0.75 power -> ${sp75} m/s (expected ~21.91)`);

  // Checkpoint: 1.00 -> 32.00 m/s (full break)
  assert.equal(normalizedPowerToCueSpeed(1.00), 32.0);
});

test('pool power: power curve is strictly monotonic across [0.0, 1.0]', () => {
  const steps = [0.0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 1.0];
  for (let i = 0; i < steps.length - 1; i++) {
    const s1 = normalizedPowerToCueSpeed(steps[i]);
    const s2 = normalizedPowerToCueSpeed(steps[i + 1]);
    assert.ok(s1 < s2, `speed(${steps[i]}) = ${s1} must be strictly less than speed(${steps[i + 1]}) = ${s2}`);
  }
});

test('pool power: bounds clamping and resilient handling of invalid inputs', () => {
  // Clamped lower bound
  assert.equal(normalizedPowerToCueSpeed(-0.5), POOL_MIN_CUE_SPEED);
  assert.equal(normalizedPowerToCueSpeed(-99999), POOL_MIN_CUE_SPEED);

  // Clamped upper bound
  assert.equal(normalizedPowerToCueSpeed(1.5), POOL_MAX_CUE_SPEED);
  assert.equal(normalizedPowerToCueSpeed(99999), POOL_MAX_CUE_SPEED);

  // Non-finite and invalid inputs safely yield valid numbers in [MIN, MAX]
  const badInputs = [NaN, null, undefined, 'invalid', Infinity, -Infinity];
  for (const bad of badInputs) {
    const res = normalizedPowerToCueSpeed(bad);
    assert.ok(Number.isFinite(res), `input ${bad} must yield finite number, got ${res}`);
    assert.ok(res >= POOL_MIN_CUE_SPEED && res <= POOL_MAX_CUE_SPEED, `result ${res} must be within bounds`);
  }
});

test('pool power: full-power break forcefully disperses the rack vs old weak 1.0 m/s roll', () => {
  // 1. Simulate break at the old 1.0 m/s speed
  let oldState = initRack();
  oldState = strikeCueBall(oldState, 0.0, 1.0, 0.0, 0.0);
  const oldInitial = {};
  for (const [id, b] of Object.entries(oldState.balls)) {
    oldInitial[id] = { x: b.x, z: b.z };
  }
  let oldSteps = 0;
  let oldRailHits = 0;
  while (!oldState.settled && oldSteps < 500) {
    const res = physicsStep(oldState, 1 / 60);
    oldState = res.state;
    oldSteps++;
    for (const e of res.events) {
      if (e.type === 'cushion_hit') oldRailHits++;
    }
  }
  let oldDisplaced = 0;
  for (const [id, b] of Object.entries(oldState.balls)) {
    if (id === '0') continue;
    if (Math.hypot(b.x - oldInitial[id].x, b.z - oldInitial[id].z) > 0.05) oldDisplaced++;
  }

  // 2. Simulate break at the new 32.0 m/s maximum power
  let newState = initRack();
  newState = strikeCueBall(newState, 0.0, POOL_MAX_CUE_SPEED, 0.0, 0.0);
  const newInitial = {};
  for (const [id, b] of Object.entries(newState.balls)) {
    newInitial[id] = { x: b.x, z: b.z };
  }
  let newSteps = 0;
  let newRailHits = 0;
  while (!newState.settled && newSteps < 600) {
    const res = physicsStep(newState, 1 / 60);
    newState = res.state;
    newSteps++;
    for (const e of res.events) {
      if (e.type === 'cushion_hit') newRailHits++;
    }
  }
  let newDisplaced = 0;
  for (const [id, b] of Object.entries(newState.balls)) {
    if (id === '0') continue;
    if (Math.hypot(b.x - newInitial[id].x, b.z - newInitial[id].z) > 0.05) newDisplaced++;
  }

  // Comparative assertions:
  // At 1.0 m/s: rack stays clumped; barely 1 ball moves > 5cm; 0 rail hits.
  assert.ok(oldDisplaced <= 2, `old weak shot displaced ${oldDisplaced} balls`);
  assert.equal(oldRailHits, 0, 'old weak shot had 0 rail hits');

  // At 32.0 m/s: full rack separation! All 15 balls forcefully displaced!
  assert.equal(newDisplaced, 15, `new break must displace all 15 object balls, displaced ${newDisplaced}`);
  assert.ok(newSteps > 150, 'break motion persists across substantial physics simulation');
});

test('pool power: shoot() rules integration converts normalized power authoritatively', () => {
  let game = initGame();
  // Aim along center line at rack apex
  const res = shoot(game, 0, 0.0, 1.0); // 100% normalized power
  assert.equal(res.ok, true);
  const cueBall = res.state.physics.balls['0'];

  // Physical launch velocity must reflect ~32.0 m/s, NOT ~1.0 m/s
  assert.ok(Math.abs(cueBall.vx - 32.0) < 0.01, `cue ball vx should be ~32.0 m/s, got ${cueBall.vx}`);
  assert.ok(Math.abs(cueBall.vz) < 0.001);
});

test('pool power: hold-to-charge ramps monotonically, clamps firmly at 1.0, and executes at 1.0 upon release', () => {
  let executedShot = null;
  const controller = createPoolController({
    onShoot: (shot) => { executedShot = shot; },
  });

  controller.activate(0);
  const sim = { turn: 0, status: 'aiming', physics: { settled: true } };
  controller.update(0.016, sim);

  // Initiate charging
  const started = controller.setShotCharging(true);
  assert.equal(started, true);
  assert.equal(controller.isCharging, true);
  assert.equal(controller.shotPower, 0.05);

  // Advance by 0.5 seconds: power increases smoothly
  controller.update(0.5, sim);
  const midPower = controller.shotPower;
  assert.ok(midPower > 0.40 && midPower < 0.55, `expected power ~0.475, got ${midPower}`);

  // Advance by another 1.0 second: power reaches 1.0
  controller.update(1.0, sim);
  assert.equal(controller.shotPower, 1.0);

  // Crucial test: hold for 3.0 more seconds at maximum charge.
  // In popular pool games, power MUST stay clamped at 1.0 and NOT oscillate or drain down!
  controller.update(3.0, sim);
  assert.equal(controller.shotPower, 1.0, 'power must remain firmly clamped at 1.0 while holding');
  assert.equal(controller.isCharging, true);

  // Release charge: executes shot with 1.0 power!
  const stopped = controller.setShotCharging(false);
  assert.equal(stopped, true);
  assert.equal(controller.isCharging, false);
  assert.notEqual(executedShot, null);
  assert.equal(executedShot.power, 1.0, 'executed shot must have full 1.0 power');

  controller.deactivate();
});

test('pool power: cancelShotCharging() aborts active charge and resets power to baseline without shooting', () => {
  let executedShot = null;
  const controller = createPoolController({
    onShoot: (shot) => { executedShot = shot; },
  });

  controller.activate(0);
  const sim = { turn: 0, status: 'aiming', physics: { settled: true } };
  controller.update(0.016, sim);

  controller.setShotCharging(true);
  controller.update(0.5, sim);
  assert.equal(controller.isCharging, true);
  assert.ok(controller.shotPower > 0.4);

  // Cancel charge explicitly (e.g. user pressed Escape or right-click)
  const cancelled = controller.cancelShotCharging();
  assert.equal(cancelled, true);
  assert.equal(controller.isCharging, false);
  assert.equal(controller.shotPower, 0.35, 'power resets to neutral baseline upon cancellation');
  assert.equal(executedShot, null, 'no shot must be executed on cancel');

  // Calling setShotCharging(false) after cancellation is a no-op and does not shoot
  const releasedAfterCancel = controller.setShotCharging(false);
  assert.equal(releasedAfterCancel, false);
  assert.equal(executedShot, null);

  controller.deactivate();
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DRONE_CHECKPOINTS,
  DRONE_SPAWN_PADS,
  DRONE_BOUNDS,
  DRONE_TOTAL_LAPS,
  initDroneSimState,
  validateDroneControls,
  stepDroneSimulation,
  markDroneDnf,
} from '../shared/droneModel.js';

test('drone model: initializes default 2-player state on rooftop-circuit course', () => {
  const state = initDroneSimState({ activeSlots: [0, 1] });

  assert.equal(state.courseId, 'rooftop-circuit');
  assert.equal(state.courseVersion, 1);
  assert.equal(state.totalLaps, DRONE_TOTAL_LAPS);
  assert.equal(state.status, 'racing');
  assert.equal(Object.keys(state.drones).length, 2);

  const d0 = state.drones[0];
  assert.equal(d0.slot, 0);
  assert.deepEqual(d0.position, DRONE_SPAWN_PADS[0].position);
  assert.equal(d0.nextCheckpoint, 0);
  assert.equal(d0.currentLap, 1);
  assert.equal(d0.finished, false);
  assert.equal(d0.dnf, false);
});

test('drone model: validateDroneControls clamps values safely', () => {
  const neutral = validateDroneControls({ kind: 'neutral' });
  assert.equal(neutral.valid, true);
  assert.deepEqual(neutral.sanitized, { kind: 'neutral', throttle: 0, pitch: 0, yaw: 0, roll: 0 });

  const clamped = validateDroneControls({
    kind: 'flight',
    throttle: 5.5,
    pitch: -2.0,
    yaw: 3.0,
    roll: -99,
  });
  assert.equal(clamped.valid, true);
  assert.equal(clamped.sanitized.throttle, 1.0);
  assert.equal(clamped.sanitized.pitch, -1.0);
  assert.equal(clamped.sanitized.yaw, 1.0);
  assert.equal(clamped.sanitized.roll, -1.0);

  const invalid = validateDroneControls(null);
  assert.equal(invalid.valid, false);
});

test('drone model: advances checkpoints sequentially and rejects skipped checkpoints', () => {
  let state = initDroneSimState({ activeSlots: [0] });

  // 1. Teleport near Checkpoint 0 (Start/Finish)
  const cp0 = DRONE_CHECKPOINTS[0];
  state.drones[0].position = [...cp0.position];

  // Step simulation: should hit Checkpoint 0 and advance nextCheckpoint to 1
  let res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
  state = res.simState;
  assert.equal(state.drones[0].nextCheckpoint, 1);
  assert.equal(state.drones[0].checkpointsHit, 1);

  // 2. Try to skip Checkpoint 1 and fly to Checkpoint 3 directly
  const cp3 = DRONE_CHECKPOINTS[3];
  state.drones[0].position = [...cp3.position];
  res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
  state = res.simState;

  // Invariant: nextCheckpoint must REMAIN 1. Skipped checkpoints are rejected!
  assert.equal(state.drones[0].nextCheckpoint, 1);
  assert.equal(state.drones[0].checkpointsHit, 1);
  assert.equal(state.drones[0].currentLap, 1);

  // 3. Now fly to Checkpoint 1 properly
  const cp1 = DRONE_CHECKPOINTS[1];
  state.drones[0].position = [...cp1.position];
  res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
  state = res.simState;
  assert.equal(state.drones[0].nextCheckpoint, 2);
  assert.equal(state.drones[0].checkpointsHit, 2);
});

test('drone model: completes laps and finishes after 2 laps with recorded times', () => {
  let state = initDroneSimState({ activeSlots: [0] });

  // Fly through checkpoints 0..5 for Lap 1
  for (let cpIdx = 0; cpIdx < 6; cpIdx++) {
    state.drones[0].position = [...DRONE_CHECKPOINTS[cpIdx].position];
    const res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
    state = res.simState;
  }

  // Completing CP 0 again starts Lap 2
  state.drones[0].position = [...DRONE_CHECKPOINTS[0].position];
  let res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
  state = res.simState;
  assert.equal(state.drones[0].currentLap, 2);
  assert.equal(state.drones[0].lapTimes.length, 1);
  assert.equal(state.drones[0].finished, false);

  // Fly through checkpoints 1..5 for Lap 2
  for (let cpIdx = 1; cpIdx < 6; cpIdx++) {
    state.drones[0].position = [...DRONE_CHECKPOINTS[cpIdx].position];
    const stepRes = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
    state = stepRes.simState;
  }

  // Cross CP 0 at the end of Lap 2: finish race!
  state.drones[0].position = [...DRONE_CHECKPOINTS[0].position];
  res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
  state = res.simState;

  assert.equal(state.drones[0].finished, true);
  assert.equal(state.drones[0].lapTimes.length, 2);
  assert.ok(state.drones[0].finishTimeMs > 0);
  assert.equal(state.status, 'complete');
  assert.equal(state.winner, 0);
});

test('drone model: boundary collisions trigger bounce and control stun', () => {
  let state = initDroneSimState({ activeSlots: [0] });

  // Place drone past the maxX boundary traveling fast +X
  state.drones[0].position = [DRONE_BOUNDS.maxX + 0.5, 3.0, 0.0];
  state.drones[0].velocity = [10.0, 0.0, 0.0];

  const res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
  state = res.simState;

  // Velocity should be inverted/bounced and stun applied
  assert.ok(state.drones[0].velocity[0] < 0, 'velocity X should bounce negative');
  assert.ok(state.drones[0].stunTicks > 0, 'stun ticks should be set');
  assert.equal(state.drones[0].collisionCount, 1);
});

test('drone model: DNF marks leaving pilot and does not abort remaining racers', () => {
  let state = initDroneSimState({ activeSlots: [0, 1] });

  state = markDroneDnf(state, 1);

  assert.equal(state.drones[1].dnf, true);
  assert.equal(state.status, 'racing', 'race continues for pilot 0');

  // Pilot 0 finishes Lap 1
  for (let cpIdx = 0; cpIdx < 6; cpIdx++) {
    state.drones[0].position = [...DRONE_CHECKPOINTS[cpIdx].position];
    const res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
    state = res.simState;
  }

  // Completing CP 0 again starts Lap 2
  state.drones[0].position = [...DRONE_CHECKPOINTS[0].position];
  let res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
  state = res.simState;

  // Fly through checkpoints 1..5 for Lap 2
  for (let cpIdx = 1; cpIdx < 6; cpIdx++) {
    state.drones[0].position = [...DRONE_CHECKPOINTS[cpIdx].position];
    const stepRes = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
    state = stepRes.simState;
  }

  // Cross CP 0 at the end of Lap 2: finish race!
  state.drones[0].position = [...DRONE_CHECKPOINTS[0].position];
  res = stepDroneSimulation(state, { 0: { throttle: 0.5 } }, 1);
  state = res.simState;

  assert.equal(state.drones[0].finished, true);
  assert.equal(state.status, 'complete');
  assert.equal(state.winner, 0);
});

test('drone model: wind influences flight trajectory', () => {
  let stateNoWind = initDroneSimState({ activeSlots: [0] });
  let stateWithWind = initDroneSimState({
    activeSlots: [0],
    environment: { wind: [1.0, 0.0], windSpeed: 1.0 },
  });

  // Step both with same neutral controls for 30 ticks
  for (let i = 0; i < 30; i++) {
    const res1 = stepDroneSimulation(stateNoWind, { 0: { throttle: 0.5 } }, 1);
    stateNoWind = res1.simState;
    const res2 = stepDroneSimulation(stateWithWind, { 0: { throttle: 0.5 } }, 1);
    stateWithWind = res2.simState;
  }

  const posXNoWind = stateNoWind.drones[0].position[0];
  const posXWithWind = stateWithWind.drones[0].position[0];

  assert.ok(
    posXWithWind > posXNoWind,
    `Wind in +X should push drone further +X: ${posXWithWind} vs ${posXNoWind}`
  );
});

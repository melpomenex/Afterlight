import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FOLD_STYLES,
  AIRPLANE_ROUNDS,
  AIRPLANE_LAUNCH_BOUNDS,
  validateAirplaneLaunch,
  simulateAirplaneTrajectory,
  initAirplaneSimState,
  executeAirplaneLaunch,
} from '../shared/paperAirplaneModel.js';

test('paper airplanes: validateAirplaneLaunch validates and clamps inputs', () => {
  const invalid = validateAirplaneLaunch(null);
  assert.equal(invalid.valid, false);

  const def = validateAirplaneLaunch({});
  assert.equal(def.valid, true);
  assert.equal(def.sanitized.foldStyle, 'classic');
  assert.equal(def.sanitized.yaw, 0.0);
  assert.equal(def.sanitized.pitch, 0.25);
  assert.equal(def.sanitized.power, 0.6);

  const clamped = validateAirplaneLaunch({
    foldStyle: 'GLIDER',
    yaw: 5.0,
    pitch: -2.0,
    power: 10.0,
  });
  assert.equal(clamped.valid, true);
  assert.equal(clamped.sanitized.foldStyle, 'glider');
  assert.equal(clamped.sanitized.yaw, AIRPLANE_LAUNCH_BOUNDS.maxYaw);
  assert.equal(clamped.sanitized.pitch, AIRPLANE_LAUNCH_BOUNDS.minPitch);
  assert.equal(clamped.sanitized.power, AIRPLANE_LAUNCH_BOUNDS.maxPower);
});

test('paper airplanes: identical initial conditions reproduce identical trajectories and distances', () => {
  const launch = { foldStyle: 'dart', yaw: 0.1, pitch: 0.3, power: 0.8 };
  const env = { wind: [0.5, -0.2], windSpeed: 0.54 };
  const origin = [7.5, 1.2, -7.5];

  const run1 = simulateAirplaneTrajectory(launch, env, origin);
  const run2 = simulateAirplaneTrajectory(launch, env, origin);

  assert.equal(run1.distance, run2.distance);
  assert.equal(run1.flightTimeMs, run2.flightTimeMs);
  assert.deepEqual(run1.landingPos, run2.landingPos);
  assert.equal(run1.trajectory.length, run2.trajectory.length);
  assert.deepEqual(run1.trajectory[10], run2.trajectory[10]);
});

test('paper airplanes: different wind conditions produce distinct trajectories and distances', () => {
  const launch = { foldStyle: 'classic', yaw: 0.0, pitch: 0.25, power: 0.7 };
  const origin = [7.5, 1.2, -7.5];

  const envCalm = { wind: [0.0, 0.0], windSpeed: 0.0 };
  const envTailwind = { wind: [0.0, -1.0], windSpeed: 1.0 }; // Tailwind blowing North (-Z)
  const envCrosswind = { wind: [1.0, 0.0], windSpeed: 1.0 }; // Crosswind blowing East (+X)

  const calmResult = simulateAirplaneTrajectory(launch, envCalm, origin);
  const tailwindResult = simulateAirplaneTrajectory(launch, envTailwind, origin);
  const crosswindResult = simulateAirplaneTrajectory(launch, envCrosswind, origin);

  assert.notEqual(calmResult.distance, tailwindResult.distance);
  // Crosswind pushes the plane East (+X)
  assert.ok(
    crosswindResult.landingPos[0] > calmResult.landingPos[0],
    `Crosswind should push landing East: ${crosswindResult.landingPos[0]} vs ${calmResult.landingPos[0]}`
  );
});

test('paper airplanes: fold styles exhibit distinctive aerodynamics', () => {
  const origin = [7.5, 1.2, -7.5];
  const env = { wind: [0.8, 0.0], windSpeed: 0.8 }; // Strong crosswind East

  const dartResult = simulateAirplaneTrajectory({ foldStyle: 'dart', yaw: 0, pitch: 0.25, power: 0.7 }, env, origin);
  const gliderResult = simulateAirplaneTrajectory({ foldStyle: 'glider', yaw: 0, pitch: 0.25, power: 0.7 }, env, origin);

  // Glider has higher wind sensitivity (1.45 vs 0.65) and drifts significantly more with the crosswind
  const dartLateralDrift = Math.abs(dartResult.landingPos[0] - origin[0]);
  const gliderLateralDrift = Math.abs(gliderResult.landingPos[0] - origin[0]);

  assert.ok(
    gliderLateralDrift > dartLateralDrift,
    `Glider should drift more than Dart in crosswind: ${gliderLateralDrift} vs ${dartLateralDrift}`
  );
});

test('paper airplanes: 3 rounds of throws determine winner and apply tie scoring', () => {
  let state = initAirplaneSimState({ activeSlots: [0, 1] });

  assert.equal(state.totalRounds, AIRPLANE_ROUNDS);
  assert.equal(state.currentRound, 1);
  assert.equal(state.status, 'aiming');

  // Round 1
  let res0 = executeAirplaneLaunch(state, 0, { foldStyle: 'classic', yaw: 0.0, pitch: 0.2, power: 0.6 });
  state = res0.simState;
  assert.equal(state.currentRound, 1); // Waiting for slot 1

  let res1 = executeAirplaneLaunch(state, 1, { foldStyle: 'classic', yaw: 0.0, pitch: 0.2, power: 0.5 });
  state = res1.simState;
  assert.equal(state.currentRound, 2); // Both finished round 1 -> advances to round 2

  // Round 2
  state = executeAirplaneLaunch(state, 0, { foldStyle: 'dart', yaw: 0.0, pitch: 0.3, power: 0.8 }).simState;
  state = executeAirplaneLaunch(state, 1, { foldStyle: 'dart', yaw: 0.0, pitch: 0.3, power: 0.85 }).simState;
  assert.equal(state.currentRound, 3);

  // Round 3 (Final)
  state = executeAirplaneLaunch(state, 0, { foldStyle: 'glider', yaw: 0.0, pitch: 0.25, power: 0.7 }).simState;
  state = executeAirplaneLaunch(state, 1, { foldStyle: 'glider', yaw: 0.0, pitch: 0.25, power: 0.7 }).simState;

  assert.equal(state.status, 'complete');
  assert.ok(state.winner !== null);
  assert.equal(state.standings.length, 2);
  assert.equal(state.standings[0].rank, 1);
  assert.equal(state.standings[1].rank, 2);
  assert.ok(state.standings[0].bestDistance >= state.standings[1].bestDistance);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SKIP_RULES_VERSION,
  SKIP_CLEANUP_TICKS,
  SKIP_LAUNCH_BOUNDS,
  DEFAULT_SKIP_ENVIRONMENT,
  initSkippingState,
  validateSkippingInput,
  validateSkipLaunch,
  simulateSkipTrajectory,
  applySkippingInput,
  clearThrow,
  stepSkippingSimulation,
} from '../shared/skippingStonesModel.js';

const CALM = { ...DEFAULT_SKIP_ENVIRONMENT, wind: [0, 0], windSpeed: 0, rain: 0, frozenAt: 10 };
const WINDY = { ...DEFAULT_SKIP_ENVIRONMENT, wind: [0.8, -0.2], windSpeed: 0.82, rain: 0, frozenAt: 10 };
const RAINY = { ...DEFAULT_SKIP_ENVIRONMENT, wind: [0, 0], windSpeed: 0, rain: 0.95, frozenAt: 10 };

const LAUNCH = { kind: 'launch', angle: 0.2, power: 0.85, yaw: 0 };

test('skipping stones: validate clamps angle/power and rejects junk', () => {
  assert.equal(validateSkipLaunch(null).valid, false);
  assert.equal(validateSkippingInput({ kind: 'teleport' }).valid, false);

  const clamped = validateSkipLaunch({ angle: 4, power: -1, yaw: 2 });
  assert.equal(clamped.valid, true);
  assert.equal(clamped.sanitized.angle, SKIP_LAUNCH_BOUNDS.maxAngle);
  assert.equal(clamped.sanitized.power, SKIP_LAUNCH_BOUNDS.minPower);
  assert.equal(clamped.sanitized.yaw, 0.35);
});

test('skipping stones: identical launches under frozen wind/rain reproduce skip count and distance', () => {
  const origin = [0, 0.95, 0.15];
  const a = simulateSkipTrajectory(LAUNCH, CALM, origin);
  const b = simulateSkipTrajectory(LAUNCH, CALM, origin);
  assert.equal(a.skips, b.skips);
  assert.equal(a.distance, b.distance);
  assert.deepEqual(a.landingPos, b.landingPos);
  assert.equal(a.trajectory.length, b.trajectory.length);
  assert.deepEqual(a.trajectory[12], b.trajectory[12]);
  assert.ok(a.skips >= 1, `calm water should skip at least once, got ${a.skips}`);
});

test('skipping stones: frozen wind and rain change shared outcomes deterministically', () => {
  const origin = [0, 0.95, 0.15];
  const calm = simulateSkipTrajectory(LAUNCH, CALM, origin);
  const wind = simulateSkipTrajectory(LAUNCH, WINDY, origin);
  const rain = simulateSkipTrajectory(LAUNCH, RAINY, origin);

  assert.notEqual(calm.distance, wind.distance);
  assert.ok(wind.landingPos[0] > calm.landingPos[0], 'east wind should push the stone +X');
  assert.ok(
    rain.skips < calm.skips || rain.distance < calm.distance,
    `rain should shorten the run: calm ${calm.skips}/${calm.distance} rain ${rain.skips}/${rain.distance}`,
  );
});

test('skipping stones: two throwers share outcomes and leave independently', () => {
  let state = initSkippingState({ activeSlots: [0, 1], environment: CALM, nowMs: 10 });
  assert.equal(state.rulesVersion, SKIP_RULES_VERSION);
  assert.equal(state.environment.policy, 'frozen');

  const first = applySkippingInput(state, 0, LAUNCH);
  state = first.simState;
  assert.equal(first.event?.type, 'stone_launched');
  assert.equal(state.throwers[0].currentThrow.skips, first.event.payload.skips);

  const second = applySkippingInput(state, 1, { ...LAUNCH, power: 0.7 });
  state = second.simState;
  assert.ok(state.throwers[0].currentThrow);
  assert.ok(state.throwers[1].currentThrow);
  assert.equal(state.throwers[0].currentThrow.distance, first.event.payload.distance);

  state = clearThrow(state, 1);
  assert.equal(state.throwers[1].currentThrow, null);
  assert.equal(state.throwers[1].phase, 'idle');
  assert.ok(state.throwers[0].currentThrow);
});

test('skipping stones: live weather after start cannot rewrite frozen conditions', () => {
  let state = initSkippingState({ activeSlots: [0], environment: CALM, nowMs: 10 });
  const before = state.environment;
  state = applySkippingInput(state, 0, {
    kind: 'environment',
    environment: WINDY,
  }).simState;
  assert.deepEqual(state.environment, before);

  const replay = simulateSkipTrajectory(LAUNCH, state.environment, state.throwers[0].origin);
  const expected = simulateSkipTrajectory(LAUNCH, CALM, state.throwers[0].origin);
  assert.equal(replay.skips, expected.skips);
  assert.equal(replay.distance, expected.distance);
});

test('skipping stones: sunk throws clean up after the shared timeout', () => {
  let state = initSkippingState({ activeSlots: [0], environment: CALM });
  state = applySkippingInput(state, 0, LAUNCH).simState;
  const flightMs = state.throwers[0].currentThrow.flightTimeMs;
  const flightSteps = Math.ceil(flightMs / (1000 / 60)) + 1;

  let res = stepSkippingSimulation(state, {}, flightSteps);
  state = res.simState;
  assert.ok(res.events.some((e) => e.type === 'stone_sunk'));
  assert.equal(state.throwers[0].phase, 'sunk');
  assert.ok(state.throwers[0].lastThrow.distance > 0);

  res = stepSkippingSimulation(state, {}, SKIP_CLEANUP_TICKS);
  state = res.simState;
  assert.ok(res.events.some((e) => e.type === 'stone_cleared'));
  assert.equal(state.throwers[0].currentThrow, null);
  assert.equal(state.throwers[0].phase, 'idle');
});

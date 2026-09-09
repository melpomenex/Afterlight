import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVITY_ENVIRONMENT_VERSION,
  ACTIVITY_ENVIRONMENT_POLICIES,
  defaultActivityEnvironment,
  resolveActivityEnvironment,
  validateActivityEnvironment,
} from '../shared/activityEnvironment.js';

test('activity environment schema version and policies', () => {
  assert.equal(ACTIVITY_ENVIRONMENT_VERSION, 1);
  assert.deepEqual(ACTIVITY_ENVIRONMENT_POLICIES, ['none', 'frozen', 'live']);
});

test('defaultActivityEnvironment with policy none returns neutral default', () => {
  const env = defaultActivityEnvironment('none');
  assert.equal(env.version, 1);
  assert.equal(env.policy, 'none');
  assert.equal(env.preset, null);
  assert.deepEqual(env.wind, [0, 0]);
  assert.equal(env.windSpeed, 0);
  assert.equal(env.rain, 0);
  assert.equal(env.intensity, 0);
  assert.equal(env.wetness, 0);
  assert.equal(env.timePhase, 0);
  assert.equal(env.frozenAt, null);

  const check = validateActivityEnvironment(env);
  assert.equal(check.valid, true);
});

test('defaultActivityEnvironment with policy frozen and known preset captures preset targets', () => {
  const now = 1725840000000;
  const env = defaultActivityEnvironment('frozen', { presetId: 'rain', now });
  assert.equal(env.version, 1);
  assert.equal(env.policy, 'frozen');
  assert.equal(env.preset, 'rain');
  assert.equal(env.frozenAt, now);
  assert.ok(env.rain > 0);
  assert.ok(env.intensity > 0);
  assert.ok(env.wetness > 0);
  assert.ok(env.windSpeed > 0);

  const check = validateActivityEnvironment(env);
  assert.equal(check.valid, true);
});

test('resolveActivityEnvironment samples live atmosphere snapshot and calculates windSpeed', () => {
  const now = 1725840050000;
  const fakeSnapshot = {
    state: {
      preset: 'rain-night',
      seed: 42,
      mode: 'fixed',
      intensity: 0.6,
      wind: [0.3, 0.4],
      startedAt: now - 10000,
      time: { mode: 'fixed', phase: 0.8, anchorAt: now, rate: 0 },
      events: [],
    },
  };

  const env = resolveActivityEnvironment({
    policy: 'frozen',
    atmosphereSnapshot: fakeSnapshot,
    now,
  });

  assert.equal(env.version, 1);
  assert.equal(env.policy, 'frozen');
  assert.equal(env.preset, 'rain-night');
  assert.deepEqual(env.wind, [0.3, 0.4]);
  // Math.hypot(0.3, 0.4) = 0.5
  assert.ok(Math.abs(env.windSpeed - 0.5) < 1e-6);
  assert.equal(env.frozenAt, now);

  const check = validateActivityEnvironment(env);
  assert.equal(check.valid, true);
});

test('frozen competitive conditions: once frozen, environment remains identical despite subsequent weather changes', () => {
  const matchStart = 1725840100000;
  const initialSnapshot = {
    state: {
      preset: 'clear',
      seed: 10,
      mode: 'fixed',
      intensity: 0.1,
      wind: [0.1, 0.0],
      startedAt: matchStart,
      time: { mode: 'fixed', phase: 0.2, anchorAt: matchStart, rate: 0 },
      events: [],
    },
  };

  const matchEnvironment = resolveActivityEnvironment({
    policy: 'frozen',
    atmosphereSnapshot: initialSnapshot,
    now: matchStart,
  });

  // Later in the match, weather changes to storm
  const stormSnapshot = {
    state: {
      preset: 'storm',
      seed: 10,
      mode: 'fixed',
      intensity: 1.0,
      wind: [-0.7, 0.35],
      startedAt: matchStart + 30000,
      time: { mode: 'fixed', phase: 0.9, anchorAt: matchStart + 30000, rate: 0 },
      events: [],
    },
  };

  // Resolving fresh for the ongoing match would be wrong; the match environment retains frozen start
  assert.equal(matchEnvironment.policy, 'frozen');
  assert.equal(matchEnvironment.preset, 'clear');
  assert.deepEqual(matchEnvironment.wind, [0.1, 0.0]);
  assert.equal(matchEnvironment.frozenAt, matchStart);

  // A subsequent new attempt/match at t+30000 freezes the new conditions
  const nextMatchEnvironment = resolveActivityEnvironment({
    policy: 'frozen',
    atmosphereSnapshot: stormSnapshot,
    now: matchStart + 30000,
  });

  assert.equal(nextMatchEnvironment.preset, 'storm');
  assert.deepEqual(nextMatchEnvironment.wind, [-0.7, 0.35]);
  assert.equal(nextMatchEnvironment.frozenAt, matchStart + 30000);
});

test('missing or unavailable snapshot falls back to declared place preset', () => {
  const env = resolveActivityEnvironment({
    policy: 'frozen',
    atmosphereSnapshot: null,
    placePresetId: 'rain-night',
    now: 12345,
  });

  assert.equal(env.version, 1);
  assert.equal(env.policy, 'frozen');
  assert.equal(env.preset, 'rain-night');
  assert.equal(env.frozenAt, 12345);
  assert.equal(validateActivityEnvironment(env).valid, true);
});

test('validateActivityEnvironment rejects malformed, out of bounds or missing fields', () => {
  assert.equal(validateActivityEnvironment(null).valid, false);
  assert.equal(validateActivityEnvironment({ version: 2, policy: 'none' }).valid, false);
  assert.equal(validateActivityEnvironment({ version: 1, policy: 'invalid' }).valid, false);

  assert.equal(validateActivityEnvironment({
    version: 1,
    policy: 'frozen',
    wind: [2.5, 0], // out of [-1, 1]
    windSpeed: 2.5,
    rain: 0,
    intensity: 0,
    wetness: 0,
    timePhase: 0,
    frozenAt: 100,
  }).valid, false);

  assert.equal(validateActivityEnvironment({
    version: 1,
    policy: 'frozen',
    wind: [0, 0],
    windSpeed: 0,
    rain: 1.5, // > 1
    intensity: 0,
    wetness: 0,
    timePhase: 0,
    frozenAt: 100,
  }).valid, false);

  assert.equal(validateActivityEnvironment({
    version: 1,
    policy: 'frozen',
    wind: [0, 0],
    windSpeed: 0,
    rain: 0,
    intensity: 0,
    wetness: 0,
    timePhase: 0,
    frozenAt: null, // missing frozenAt for frozen policy
  }).valid, false);
});

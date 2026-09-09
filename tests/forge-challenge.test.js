import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FORGE_BINS,
  FORGE_MAX_STRIKES,
  FORGE_DEFAULT_SEED,
  targetProfile,
  initialProfile,
  deformProfile,
  profileError,
  accuracyFromError,
  validateForgeControls,
  initForgeSimState,
  applyForgeInput,
  stepForgeSimulation,
} from '../shared/forgeChallengeModel.js';
import { hasActivityModule } from '../src/activities/registry.js';
import '../src/activities/forgeChallenge.js';

test('forge-challenge: module registers as forge-challenge', () => {
  assert.equal(hasActivityModule('forge-challenge'), true);
});

test('forge-challenge: shared target is deterministic for a seed', () => {
  const a = targetProfile(FORGE_DEFAULT_SEED);
  const b = targetProfile(FORGE_DEFAULT_SEED);
  assert.equal(a.length, FORGE_BINS);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, targetProfile(2));
});

test('forge-challenge: identical strike inputs produce identical profiles and scores', () => {
  const strikes = [
    { position: 0.2, force: 0.8 },
    { position: 0.55, force: 0.6 },
    { position: 0.8, force: 0.4 },
  ];

  let a = initForgeSimState({ seed: 1 });
  let b = initForgeSimState({ seed: 1 });
  assert.deepEqual(a.target, b.target);
  assert.deepEqual(a.profile, initialProfile());

  for (let i = 0; i < strikes.length; i++) {
    a = applyForgeInput(a, 0, { kind: 'strike', commitId: i + 1, ...strikes[i] }).simState;
    b = applyForgeInput(b, 0, { kind: 'strike', commitId: i + 1, ...strikes[i] }).simState;
  }

  assert.deepEqual(a.profile, b.profile);
  assert.equal(a.error, b.error);
  assert.equal(a.score, b.score);
  assert.deepEqual(a.strikes.map((s) => s.score), b.strikes.map((s) => s.score));
});

test('forge-challenge: a centered hard strike lowers the middle more than the ends', () => {
  const before = initialProfile();
  const after = deformProfile(before, 0.5, 1);
  assert.ok(after[8] < after[0]);
  assert.ok(after[8] < after[15]);
  assert.ok(profileError(after, before) > 0);
});

test('forge-challenge: different sequences yield different profiles', () => {
  let left = initForgeSimState({ seed: 1 });
  let right = initForgeSimState({ seed: 1 });
  left = applyForgeInput(left, 0, { kind: 'strike', position: 0.15, force: 0.9, commitId: 1 }).simState;
  right = applyForgeInput(right, 0, { kind: 'strike', position: 0.85, force: 0.9, commitId: 1 }).simState;
  assert.notDeepEqual(left.profile, right.profile);
  assert.ok(left.profile[2] < right.profile[2]);
  assert.ok(right.profile[13] < left.profile[13]);
});

test('forge-challenge: error score is a pure function of the current profile', () => {
  const target = targetProfile(1);
  const stock = initialProfile();
  const e1 = profileError(stock, target);
  const e2 = profileError(stock, target);
  assert.equal(e1, e2);
  assert.equal(accuracyFromError(e1), accuracyFromError(e2));
  const closer = deformProfile(stock, 0.4, 0.5);
  assert.ok(profileError(closer, closer) === 0);
});

test('forge-challenge: validateForgeControls clamps and rejects junk', () => {
  assert.equal(validateForgeControls(null).valid, false);
  assert.equal(validateForgeControls({ kind: 'smelt' }).valid, false);
  const clamped = validateForgeControls({ kind: 'strike', position: 4, force: -1, commitId: 2 });
  assert.equal(clamped.valid, true);
  assert.equal(clamped.sanitized.position, 1);
  assert.equal(clamped.sanitized.force, 0);
});

test('forge-challenge: eight strikes complete and ignore a duplicate commit', () => {
  let state = initForgeSimState();
  for (let i = 0; i < FORGE_MAX_STRIKES; i++) {
    state = applyForgeInput(state, 0, {
      kind: 'strike',
      position: 0.1 + i * 0.1,
      force: 0.5,
      commitId: i + 1,
    }).simState;
  }
  assert.equal(state.status, 'complete');
  assert.equal(state.remaining, 0);
  assert.equal(state.winner, 0);

  const extra = applyForgeInput(state, 0, { kind: 'strike', position: 0.5, force: 1, commitId: 99 });
  assert.equal(extra.event, null);
  assert.deepEqual(extra.simState.profile, state.profile);
});

test('forge-challenge: step cools heat and consumes a pending strike once', () => {
  const started = initForgeSimState();
  const cooled = stepForgeSimulation(started, {}, 60);
  assert.ok(cooled.simState.heat.every((h, i) => h <= started.heat[i]));

  const players = { 0: { input_state: { kind: 'strike', position: 0.4, force: 0.7, commitId: 3 } } };
  const first = stepForgeSimulation(cooled.simState, players, 1);
  assert.equal(first.event?.type, 'forge_struck');
  assert.equal(first.simState.strikes.length, 1);

  const again = stepForgeSimulation(first.simState, players, 1);
  assert.notEqual(again.event?.type, 'forge_struck');
  assert.equal(again.simState.strikes.length, 1);
});

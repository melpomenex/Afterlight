import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HAMMER_MAX_STRIKES,
  HAMMER_TARGET_PHASE,
  HAMMER_WINDOW_PHASE,
  wrapPhase,
  scoreTimingSample,
  validateHammerControls,
  initHammerSimState,
  applyHammerInput,
  stepHammerSimulation,
} from '../shared/hammerStrikeModel.js';
import { hasActivityModule } from '../src/activities/registry.js';
import '../src/activities/hammerStrike.js';

test('hammer-strike: module registers as hammer-strike', () => {
  assert.equal(hasActivityModule('hammer-strike'), true);
});

test('hammer-strike: wrapPhase folds samples onto [0, 1)', () => {
  assert.equal(wrapPhase(0.25), 0.25);
  assert.equal(wrapPhase(1.25), 0.25);
  assert.equal(wrapPhase(-0.25), 0.75);
  assert.equal(wrapPhase('nope'), null);
});

test('hammer-strike: identical timing samples score identically including bell', () => {
  const a = scoreTimingSample({ phase: 0.5 });
  const b = scoreTimingSample({ phase: 0.5 });
  assert.equal(a.valid, true);
  assert.deepEqual(a, b);
  assert.equal(a.perfect, true);
  assert.ok(a.score > 0.9);
  assert.ok(a.bellHz > a.bellAmp);
});

test('hammer-strike: early and late samples are worse than the target window', () => {
  const perfect = scoreTimingSample({ phase: HAMMER_TARGET_PHASE });
  const early = scoreTimingSample({ phase: HAMMER_TARGET_PHASE - HAMMER_WINDOW_PHASE * 3 });
  const late = scoreTimingSample({ phase: HAMMER_TARGET_PHASE + 0.3 });
  assert.ok(perfect.score > early.score);
  assert.ok(perfect.score > late.score);
  assert.ok(perfect.bellHz > late.bellHz);
  assert.ok(perfect.bellAmp > late.bellAmp);
});

test('hammer-strike: millisecond error is accepted and deterministic', () => {
  const a = scoreTimingSample({ errorMs: 40 });
  const b = scoreTimingSample({ errorMs: 40 });
  assert.equal(a.valid, true);
  assert.deepEqual(a, b);
  const worse = scoreTimingSample({ errorMs: 400 });
  assert.ok(a.score > worse.score);
});

test('hammer-strike: phase wins when both phase and errorMs are sent', () => {
  const mixed = scoreTimingSample({ phase: 0.5, errorMs: 800 });
  const phaseOnly = scoreTimingSample({ phase: 0.5 });
  assert.deepEqual(mixed, phaseOnly);
});

test('hammer-strike: validateHammerControls rejects junk and unknown kinds', () => {
  assert.equal(validateHammerControls(null).valid, false);
  assert.equal(validateHammerControls({ kind: 'teleport' }).valid, false);
  const ready = validateHammerControls({ kind: 'ready' });
  assert.equal(ready.valid, true);
  assert.equal(ready.sanitized.kind, 'ready');
});

test('hammer-strike: applyHammerInput records a strike and ignores duplicate commitId', () => {
  let state = initHammerSimState();
  assert.equal(state.remaining, HAMMER_MAX_STRIKES);

  const first = applyHammerInput(state, 0, { kind: 'strike', phase: 0.5, commitId: 1 });
  state = first.simState;
  assert.equal(first.event.type, 'hammer_struck');
  assert.equal(state.strikes.length, 1);
  assert.equal(state.remaining, HAMMER_MAX_STRIKES - 1);

  const dup = applyHammerInput(state, 0, { kind: 'strike', phase: 0.1, commitId: 1 });
  assert.equal(dup.event, null);
  assert.equal(dup.simState.strikes.length, 1);
});

test('hammer-strike: five strikes complete with deterministic totals', () => {
  const sequence = [0.5, 0.48, 0.62, 0.2, 0.51];
  let a = initHammerSimState();
  let b = initHammerSimState();

  for (let i = 0; i < sequence.length; i++) {
    a = applyHammerInput(a, 0, { kind: 'strike', phase: sequence[i], commitId: i + 1 }).simState;
    b = applyHammerInput(b, 0, { kind: 'strike', phase: sequence[i], commitId: i + 1 }).simState;
  }

  assert.equal(a.status, 'complete');
  assert.equal(b.status, 'complete');
  assert.deepEqual(a.strikes.map((s) => s.score), b.strikes.map((s) => s.score));
  assert.equal(a.totalScore, b.totalScore);
  assert.equal(a.bestScore, b.bestScore);
  assert.equal(a.winner, 0);
});

test('hammer-strike: step advances phase and consumes a pending player strike once', () => {
  let { simState } = stepHammerSimulation(initHammerSimState(), {}, 30);
  assert.ok(simState.phase > 0);
  assert.equal(simState.strikes.length, 0);

  const players = { 0: { input_state: { kind: 'strike', phase: 0.5, commitId: 7 } } };
  const first = stepHammerSimulation(simState, players, 1);
  assert.equal(first.event?.type, 'hammer_struck');
  assert.equal(first.simState.strikes.length, 1);

  const again = stepHammerSimulation(first.simState, players, 1);
  assert.notEqual(again.event?.type, 'hammer_struck');
  assert.equal(again.simState.strikes.length, 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LIGHT_MUSIC_SEQUENCE_LENGTH,
  LIGHT_MUSIC_PAD_COUNT,
  generateLightMusicSequence,
  validateLightMusicInput,
  initLightMusicState,
  applyLightMusicInput,
  stepLightMusicSimulation,
} from '../shared/lightMusicModel.js';
import { LightMusicModule } from '../src/activities/lightMusic.js';
import { hasActivityModule, unregisterActivityModule } from '../src/activities/registry.js';

test('light music: inputs are bounded to four pads and reset', () => {
  assert.equal(validateLightMusicInput(null).valid, false);
  assert.equal(validateLightMusicInput({ kind: 'press', pad: 7 }).valid, false);
  assert.equal(validateLightMusicInput({ kind: 'press', pad: 1.5 }).valid, false);
  assert.equal(validateLightMusicInput({ kind: 'shout' }).valid, false);
  assert.deepEqual(validateLightMusicInput({ kind: 'press', pad: 2 }).sanitized, { kind: 'press', pad: 2 });
  assert.equal(validateLightMusicInput({ kind: 'reset' }).sanitized.kind, 'reset');
});

test('light music: identical seeds produce the same sequence', () => {
  assert.deepEqual(generateLightMusicSequence(42), generateLightMusicSequence(42));
  assert.equal(generateLightMusicSequence(42).length, LIGHT_MUSIC_SEQUENCE_LENGTH);
  assert.ok(generateLightMusicSequence(42).every((p) => p >= 0 && p < LIGHT_MUSIC_PAD_COUNT));
  assert.notDeepEqual(generateLightMusicSequence(42), generateLightMusicSequence(7));
});

test('light music: a miss resets progress; reset input also clears', () => {
  let { simState } = { simState: initLightMusicState({ activeSlots: [0, 1], seed: 42 }) };
  const first = simState.sequence[0];
  const wrong = (first + 1) % LIGHT_MUSIC_PAD_COUNT;

  ({ simState } = applyLightMusicInput(simState, 0, { kind: 'press', pad: first }));
  assert.equal(simState.progress, 1);

  let event;
  ({ simState, event } = applyLightMusicInput(simState, 1, { kind: 'press', pad: wrong }));
  assert.equal(simState.progress, 0);
  assert.equal(event.type, 'sequence_reset');
  assert.equal(event.payload.reason, 'miss');

  ({ simState } = applyLightMusicInput(simState, 0, { kind: 'press', pad: first }));
  ({ simState, event } = applyLightMusicInput(simState, 0, { kind: 'reset' }));
  assert.equal(simState.progress, 0);
  assert.equal(event.payload.reason, 'manual');
});

test('light music: finishing the sequence is a shared completion without ranking', () => {
  let { simState } = { simState: initLightMusicState({ activeSlots: [0, 1, 2], seed: 99 }) };
  let event = null;
  for (let i = 0; i < simState.sequence.length; i++) {
    const slot = i % 3;
    ({ simState, event } = applyLightMusicInput(simState, slot, { kind: 'press', pad: simState.sequence[i] }));
  }
  assert.equal(simState.status, 'complete');
  assert.equal(simState.completed, true);
  assert.equal(simState.winner, null);
  assert.deepEqual(simState.standings, []);
  assert.equal(event.type, 'puzzle_complete');
  assert.equal(event.payload.ranked, false);
  assert.deepEqual(event.payload.participants, [0, 1, 2]);

  const after = applyLightMusicInput(simState, 0, { kind: 'press', pad: 0 });
  assert.equal(after.event, null);
});

test('light music: unknown seats and complete matches ignore extra input', () => {
  const state = initLightMusicState({ activeSlots: [0] });
  const ghost = applyLightMusicInput(state, 3, { kind: 'press', pad: 0 });
  assert.equal(ghost.event, null);
  assert.equal(ghost.simState, state);
});

test('light music: step only advances the clock', () => {
  const state = initLightMusicState({ activeSlots: [0], seed: 1 });
  const { simState, event } = stepLightMusicSimulation(state, {}, 60);
  assert.equal(event, null);
  assert.equal(simState.progress, 0);
  assert.ok(simState.elapsedMs > 0);
});

test('light music: module registers light-music-puzzle', () => {
  assert.equal(typeof LightMusicModule.initialize, 'function');
  assert.equal(hasActivityModule('light-music-puzzle'), true);
  unregisterActivityModule('light-music-puzzle');
});

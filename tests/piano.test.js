import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PIANO_MAX_NOTES_PER_SEC,
  PIANO_MAX_POLYPHONY,
  PIANO_MAX_NOTE_MS,
  validatePianoInput,
  initPianoState,
  applyPianoInput,
  stepPianoSimulation,
} from '../shared/pianoModel.js';
import { PianoModule } from '../src/activities/piano.js';
import { hasActivityModule, unregisterActivityModule } from '../src/activities/registry.js';

test('piano: note events are bounded midi values', () => {
  assert.equal(validatePianoInput(null).valid, false);
  assert.equal(validatePianoInput({ kind: 'note_on', midi: 12 }).valid, false);
  assert.equal(validatePianoInput({ kind: 'note_on', midi: 60 }).valid, true);
  assert.equal(validatePianoInput({ kind: 'all_off' }).sanitized.kind, 'all_off');
  assert.equal(validatePianoInput({ kind: 'note-off-audio-buffer' }).valid, false);
});

test('piano: rate limit rejects more than 20 note-ons per second', () => {
  let state = initPianoState();
  let limited = 0;
  for (let i = 0; i < PIANO_MAX_NOTES_PER_SEC + 4; i++) {
    const midi = 48 + (i % 25);
    const { simState, event } = applyPianoInput(state, 0, { kind: 'note_on', midi });
    state = simState;
    if (event?.type === 'rate_limited') limited += 1;
  }
  assert.ok(limited >= 4);
  assert.ok(state.noteOnTimes.length <= PIANO_MAX_NOTES_PER_SEC);
});

test('piano: polyphony caps at eight notes', () => {
  let state = initPianoState();
  for (let i = 0; i < PIANO_MAX_POLYPHONY + 2; i++) {
    ({ simState: state } = applyPianoInput(state, 0, { kind: 'note_on', midi: 48 + i }));
  }
  assert.equal(state.activeNotes.length, PIANO_MAX_POLYPHONY);
  assert.ok(!state.activeNotes.some((n) => n.midi === 48), 'oldest note is stolen');
});

test('piano: held notes expire at 2s and sustain refreshes the window', () => {
  let state = initPianoState();
  ({ simState: state } = applyPianoInput(state, 0, { kind: 'note_on', midi: 60 }));
  assert.equal(state.activeNotes[0].expiresAt, PIANO_MAX_NOTE_MS);

  ({ simState: state } = stepPianoSimulation(state, {}, 60)); // +1000ms
  ({ simState: state } = applyPianoInput(state, 0, { kind: 'sustain', midi: 60 }));
  assert.equal(state.activeNotes[0].expiresAt, state.nowMs + PIANO_MAX_NOTE_MS);

  ({ simState: state } = stepPianoSimulation(state, {}, 130)); // > 2s
  assert.equal(state.activeNotes.length, 0);
});

test('piano: all-off and mute release every note (stuck-note impossible)', () => {
  let state = initPianoState();
  ({ simState: state } = applyPianoInput(state, 0, { kind: 'note_on', midi: 60 }));
  ({ simState: state } = applyPianoInput(state, 0, { kind: 'note_on', midi: 64 }));
  let event;
  ({ simState: state, event } = applyPianoInput(state, 0, { kind: 'all_off' }));
  assert.equal(event.type, 'all_off');
  assert.deepEqual(event.payload.midis, [60, 64]);
  assert.equal(state.activeNotes.length, 0);

  ({ simState: state } = applyPianoInput(state, 0, { kind: 'note_on', midi: 67 }));
  ({ simState: state, event } = applyPianoInput(state, 0, { kind: 'mute', muted: true }));
  assert.equal(state.muted, true);
  assert.equal(state.activeNotes.length, 0);
  assert.equal(event.payload.reason, 'mute');
});

test('piano: note-off of a held key is respected', () => {
  let state = initPianoState();
  ({ simState: state } = applyPianoInput(state, 0, { kind: 'note_on', midi: 62 }));
  ({ simState: state } = applyPianoInput(state, 0, { kind: 'note_off', midi: 62 }));
  assert.equal(state.activeNotes.length, 0);
});

test('piano: module registers piano and neutralizeInput sends all-off', () => {
  assert.equal(typeof PianoModule.initialize, 'function');
  assert.equal(hasActivityModule('piano'), true);

  const sent = [];
  const instance = PianoModule.initialize({
    activityDef: { id: 'orpheum-piano', type: 'piano', transform: { position: [-2.2, 0, 5.8], rotationY: 0 } },
    world: null,
    net: {
      sendActivityInput(payload) { sent.push(payload); },
      nextActivitySeq: () => 1,
    },
    getParticipation: () => ({ sessionId: 's', lease: 'lease-1' }),
    getMuted: () => false,
  });
  instance.onJoin({ slot: 0, role: 'player' });
  instance.neutralizeInput();
  assert.ok(sent.some((p) => p.controls?.kind === 'all_off'));
  instance.dispose();
  unregisterActivityModule('piano');
});

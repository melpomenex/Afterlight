/**
 * Pure floating-media presentation/audio policy tests
 * (add-floating-minigame-media, task 1.3; design D3-D4).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MEDIA_ACTION,
  PRESENTATION_MODE,
  createInitialMediaPresentationState,
  createMediaPresentation,
  effectiveMediaVolume,
  isEntrySilent,
  presentationMode,
  reduceMediaPresentation,
  unmutePlan,
} from '../src/ui/mediaPresentationState.js';

const reduce = (state, ...actions) => actions.reduce(reduceMediaPresentation, state);
const entry = (id, generation = 1, attempt = 1) => ({ type: MEDIA_ACTION.ENTRY, activity: { id, generation, attempt } });

test('initial state: primary presentation, silent under the master gate', () => {
  const state = createInitialMediaPresentationState();
  assert.equal(state.masterSound, false);
  assert.equal(effectiveMediaVolume(state), 0);
  assert.equal(presentationMode(state), PRESENTATION_MODE.PRIMARY);
  assert.deepEqual(unmutePlan(state), { needsMaster: true, targetVolume: null });
  assert.equal(isEntrySilent(state), true);
});

test('entry snapshots the baseline, forces the activity mute and floats a current item', () => {
  let state = createInitialMediaPresentationState({ volume: 0.7, masterSound: true });
  state = reduce(state, entry('pool'), { type: MEDIA_ACTION.SET_ITEM, hasItem: true });
  assert.equal(state.activityMuted, true);
  assert.equal(effectiveMediaVolume(state), 0, 'entry mute precedes any load/admission');
  assert.equal(presentationMode(state), PRESENTATION_MODE.FLOATING);
  assert.deepEqual(state.baseline, { userMuted: false, volume: 0.7, revisions: { userMuted: 0, volume: 0 } });
});

test('a duplicate lifecycle event for one attempt never re-mutes an explicit unmute', () => {
  let state = createInitialMediaPresentationState({ masterSound: true });
  state = reduce(state, entry('pool', 2, 1), { type: MEDIA_ACTION.SET_ITEM, hasItem: true });
  state = reduce(state, { type: MEDIA_ACTION.USER_UNMUTE });
  assert.equal(effectiveMediaVolume(state), 1);
  const after = reduce(state, entry('pool', 2, 1));
  assert.equal(after, state, 'no-op returns the same state object');
  assert.equal(after.activityMuted, false);
  assert.equal(effectiveMediaVolume(after), 1);
});

test('a new attempt (queue promotion) mutes again even after an explicit unmute', () => {
  let state = createInitialMediaPresentationState({ masterSound: true });
  state = reduce(state, entry('pool', 2, 1), { type: MEDIA_ACTION.USER_UNMUTE });
  assert.equal(effectiveMediaVolume(state), 1);
  state = reduce(state, entry('pool', 2, 2));
  assert.equal(state.activityMuted, true);
  assert.equal(effectiveMediaVolume(state), 0);
});

test('exit without audio edits restores the baseline under the current master and mix', () => {
  let state = createInitialMediaPresentationState({ volume: 0.7, masterSound: true });
  state = reduce(state, entry('kart'), { type: MEDIA_ACTION.SET_ITEM, hasItem: true });
  state = reduce(state, { type: MEDIA_ACTION.SET_MIX_GAIN, gain: 0.5 });
  state = reduce(state, { type: MEDIA_ACTION.EXIT });
  assert.equal(state.activity, null);
  assert.equal(state.userMuted, false);
  assert.equal(state.volume, 0.7);
  assert.equal(effectiveMediaVolume(state), 0.35, 'current mix gain applies to the restored volume');
  assert.equal(presentationMode(state), PRESENTATION_MODE.PRIMARY);
});

test('master and mix changes during an activity are never restored by exit', () => {
  let state = createInitialMediaPresentationState({ masterSound: true, mixGain: 0.5 });
  state = reduce(state, entry('pool'));
  state = reduce(state, { type: MEDIA_ACTION.SET_MASTER_SOUND, enabled: false });
  state = reduce(state, { type: MEDIA_ACTION.SET_MIX_GAIN, gain: 1 });
  state = reduce(state, { type: MEDIA_ACTION.EXIT });
  assert.equal(state.masterSound, false, 'master switch keeps its live value');
  assert.equal(state.mixGain, 1, 'duck/mix keeps its live value');
  assert.equal(effectiveMediaVolume(state), 0);
});

test('an explicit volume edit during play is retained on exit', () => {
  let state = createInitialMediaPresentationState({ volume: 0.7, masterSound: true });
  state = reduce(state, entry('foosball'));
  state = reduce(state, { type: MEDIA_ACTION.SET_VOLUME, value: 0.3 });
  state = reduce(state, { type: MEDIA_ACTION.EXIT });
  assert.equal(state.volume, 0.3, 'explicit edit wins over the baseline');
  assert.equal(state.userMuted, false);
});

test('explicit unmute overrides a previously muted media preference and survives exit', () => {
  let state = createInitialMediaPresentationState({ userMuted: true, masterSound: true, volume: 0.9 });
  state = reduce(state, entry('pool'), { type: MEDIA_ACTION.SET_ITEM, hasItem: true });
  assert.equal(effectiveMediaVolume(state), 0);
  state = reduce(state, { type: MEDIA_ACTION.USER_UNMUTE });
  assert.equal(effectiveMediaVolume(state), 0.9);
  state = reduce(state, { type: MEDIA_ACTION.EXIT });
  assert.equal(state.userMuted, false, 'explicit unmute is not reverted by exit');
  assert.equal(effectiveMediaVolume(state), 0.9);
});

test('explicit PiP mute survives exit; the next game still applies a fresh automatic mute', () => {
  let state = createInitialMediaPresentationState({ masterSound: true, volume: 0.8 });
  state = reduce(state, entry('pool', 1, 1), { type: MEDIA_ACTION.USER_MUTE });
  state = reduce(state, { type: MEDIA_ACTION.EXIT });
  assert.equal(state.userMuted, true, 'explicit mute stays after exit');
  assert.equal(effectiveMediaVolume(state), 0);
  state = reduce(state, entry('pool', 1, 2));
  assert.equal(state.activityMuted, true, 'new game forces silence regardless of the last choice');
  state = reduce(state, { type: MEDIA_ACTION.USER_UNMUTE });
  assert.equal(state.userMuted, false);
  assert.equal(effectiveMediaVolume(state), 0.8);
});

test('unmute plan turns on the master gate and restores a remembered nonzero volume', () => {
  let state = createInitialMediaPresentationState({ volume: 0, masterSound: false });
  assert.deepEqual(unmutePlan(state), { needsMaster: true, targetVolume: 1 });
  state = reduce(state, { type: MEDIA_ACTION.SET_VOLUME, value: 0.4 });
  state = reduce(state, { type: MEDIA_ACTION.SET_VOLUME, value: 0 });
  assert.deepEqual(unmutePlan(state), { needsMaster: true, targetVolume: 0.4 });
  state = reduce(state, { type: MEDIA_ACTION.SET_MASTER_SOUND, enabled: true });
  assert.deepEqual(unmutePlan(state), { needsMaster: false, targetVolume: 0.4 });
});

test('source changes keep the audio policy and drop only the empty frame', () => {
  let state = createInitialMediaPresentationState({ masterSound: true });
  state = reduce(state, entry('kart'), { type: MEDIA_ACTION.SET_ITEM, hasItem: true });
  state = reduce(state, { type: MEDIA_ACTION.USER_UNMUTE });
  state = reduce(state, { type: MEDIA_ACTION.SET_ITEM, hasItem: false });
  assert.equal(presentationMode(state), PRESENTATION_MODE.WAITING, 'no empty frame without a current item');
  assert.equal(effectiveMediaVolume(state), 1, 'audio policy is untouched by source removal');
  state = reduce(state, { type: MEDIA_ACTION.SET_ITEM, hasItem: true });
  assert.equal(presentationMode(state), PRESENTATION_MODE.FLOATING);
});

test('hide and restore preserve audio and keep the hidden mode until restored', () => {
  let state = createInitialMediaPresentationState({ masterSound: true, volume: 0.6 });
  state = reduce(state, entry('pool'), { type: MEDIA_ACTION.SET_ITEM, hasItem: true }, { type: MEDIA_ACTION.USER_UNMUTE });
  state = reduce(state, { type: MEDIA_ACTION.HIDE });
  assert.equal(presentationMode(state), PRESENTATION_MODE.HIDDEN);
  assert.equal(effectiveMediaVolume(state), 0.6);
  state = reduce(state, { type: MEDIA_ACTION.SET_ITEM, hasItem: false });
  assert.equal(presentationMode(state), PRESENTATION_MODE.WAITING, 'waiting outranks hidden');
  state = reduce(state, { type: MEDIA_ACTION.RESTORE }, { type: MEDIA_ACTION.SET_ITEM, hasItem: true });
  assert.equal(presentationMode(state), PRESENTATION_MODE.FLOATING);
  assert.equal(effectiveMediaVolume(state), 0.6);
});

test('same-room game replacement keeps the span baseline, resets hidden/expanded and re-mutes', () => {
  let state = createInitialMediaPresentationState({ masterSound: true, volume: 0.7 });
  state = reduce(state, entry('pool', 4, 1), { type: MEDIA_ACTION.SET_ITEM, hasItem: true });
  state = reduce(state, { type: MEDIA_ACTION.USER_UNMUTE }, { type: MEDIA_ACTION.HIDE }, { type: MEDIA_ACTION.SET_EXPANDED, expanded: true });
  assert.deepEqual(state.baseline, { userMuted: false, volume: 0.7, revisions: { userMuted: 0, volume: 0 } });
  state = reduce(state, { type: MEDIA_ACTION.REPLACE, activity: { id: 'kart', generation: 4, attempt: 7 } });
  assert.equal(state.activity.id, 'kart');
  assert.equal(state.activityMuted, true, 'the new game gets a fresh entry mute');
  assert.equal(state.hidden, false);
  assert.equal(state.expanded, false);
  assert.deepEqual(state.baseline, { userMuted: false, volume: 0.7, revisions: { userMuted: 0, volume: 0 } }, 'baseline belongs to the span');
  state = reduce(state, { type: MEDIA_ACTION.EXIT });
  assert.equal(state.volume, 0.7);
  assert.equal(state.userMuted, false);
});

test('explicit edits are tracked per field: muting does not block volume restoration', () => {
  let state = createInitialMediaPresentationState({ masterSound: true, volume: 0.7 });
  state = reduce(state, entry('pool'));
  state = reduce(state, { type: MEDIA_ACTION.USER_MUTE });
  state = reduce(state, { type: MEDIA_ACTION.EXIT });
  assert.equal(state.userMuted, true, 'explicit mute retained');
  assert.equal(state.volume, 0.7, 'volume had no explicit edit: baseline restored');
});

test('effective volume is silent for every gate and otherwise volume x mix', () => {
  const cases = [
    { state: { masterSound: false, userMuted: false, activityMuted: false, volume: 1, mixGain: 1 }, expect: 0, why: 'master off' },
    { state: { masterSound: true, userMuted: true, activityMuted: false, volume: 1, mixGain: 1 }, expect: 0, why: 'user mute' },
    { state: { masterSound: true, userMuted: false, activityMuted: true, volume: 1, mixGain: 1 }, expect: 0, why: 'activity entry mute' },
    { state: { masterSound: true, userMuted: false, activityMuted: false, volume: 0.5, mixGain: 0.5 }, expect: 0.25, why: 'volume x mix' },
    { state: { masterSound: true, userMuted: false, activityMuted: false, volume: 0, mixGain: 1 }, expect: 0, why: 'zero volume' },
  ];
  for (const c of cases) {
    assert.equal(effectiveMediaVolume(c.state), c.expect, c.why);
  }
});

test('presentation mode table: primary/waiting/floating/hidden', () => {
  const activity = { id: 'pool', generation: 1, attempt: 1 };
  const cases = [
    { state: { activity: null, hasItem: true, hidden: false }, expect: PRESENTATION_MODE.PRIMARY },
    { state: { activity, hasItem: false, hidden: false }, expect: PRESENTATION_MODE.WAITING },
    { state: { activity, hasItem: true, hidden: false }, expect: PRESENTATION_MODE.FLOATING },
    { state: { activity, hasItem: true, hidden: true }, expect: PRESENTATION_MODE.HIDDEN },
  ];
  for (const c of cases) {
    assert.equal(presentationMode(c.state), c.expect, JSON.stringify(c.state));
  }
});

test('no-op guards: entry without id and exit without a span leave state untouched', () => {
  const state = createInitialMediaPresentationState();
  assert.equal(reduceMediaPresentation(state, { type: MEDIA_ACTION.ENTRY }), state);
  assert.equal(reduceMediaPresentation(state, { type: MEDIA_ACTION.ENTRY, activity: { id: '' } }), state);
  assert.equal(reduceMediaPresentation(state, { type: MEDIA_ACTION.EXIT }), state);
  assert.equal(reduceMediaPresentation(state, { type: 'unknown' }), state);
});

test('createMediaPresentation wraps the reducer without copying it', () => {
  const media = createMediaPresentation({ masterSound: true });
  assert.equal(media.mode(), PRESENTATION_MODE.PRIMARY);
  assert.equal(media.effectiveVolume(), 1);
  media.dispatch(entry('pool'));
  media.dispatch({ type: MEDIA_ACTION.SET_ITEM, hasItem: true });
  assert.equal(media.mode(), PRESENTATION_MODE.FLOATING);
  assert.equal(media.effectiveVolume(), 0);
  assert.deepEqual(media.unmutePlan(), { needsMaster: false, targetVolume: null });
});

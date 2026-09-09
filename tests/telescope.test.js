import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TELESCOPE_RULES_VERSION,
  TELESCOPE_NAMED_OBJECTS,
  buildTelescopeSky,
  apparentTelescopePosition,
  findSkyObject,
  initTelescopeSimState,
  applyTelescopeInput,
  refreshTelescopeEnvironment,
  stepTelescopeSimulation,
} from '../shared/telescopeModel.js';

const LIVE_T0 = 1_700_000_000_000;

test('telescope: seeded sky is stable; live time moves apparent positions', () => {
  const skyA = buildTelescopeSky(99);
  const skyB = buildTelescopeSky(99);
  assert.equal(skyA.length, skyB.length);
  assert.deepEqual(skyA.map((o) => o.id), skyB.map((o) => o.id));
  assert.deepEqual(skyA.find((o) => o.id === 'seed-0'), skyB.find((o) => o.id === 'seed-0'));
  assert.ok(TELESCOPE_NAMED_OBJECTS.every((named) => skyA.some((o) => o.id === named.id)));

  const vega = findSkyObject(skyA, 'vega');
  const env = { timePhase: 0.25 };
  const atT0 = apparentTelescopePosition(vega, LIVE_T0, env);
  const again = apparentTelescopePosition(vega, LIVE_T0, env);
  const later = apparentTelescopePosition(vega, LIVE_T0 + 3_600_000, env);

  assert.deepEqual(atT0, again);
  assert.notDeepEqual(atT0, later);
  assert.equal(atT0.lst, again.lst);
});

test('telescope: init uses live environment timestamps, never frozen', () => {
  const state = initTelescopeSimState({
    seed: 7,
    now: LIVE_T0,
    matchId: 'camp-telescope-7',
    environment: {
      policy: 'frozen',
      frozenAt: 99,
      timePhase: 0.4,
      wind: [0.2, -0.1],
      windSpeed: 0.22,
      rain: 0,
      intensity: 0.1,
      wetness: 0,
      version: 1,
    },
  });

  assert.equal(state.rulesVersion, TELESCOPE_RULES_VERSION);
  assert.equal(state.status, 'observing');
  assert.equal(state.winner, null);
  assert.equal(state.environment.policy, 'live');
  assert.equal(state.environment.frozenAt, null);
  assert.equal(state.environment.now, LIVE_T0);
  assert.equal(state.environment.updatedAt, LIVE_T0);
  assert.equal(state.environment.timePhase, 0.4);
  assert.ok(findSkyObject(state.sky, 'vega'));
});

test('telescope: two observers mark and highlight the same object', () => {
  let state = initTelescopeSimState({ seed: 7, now: LIVE_T0, activeSlots: [0, 1] });

  const marked = applyTelescopeInput(state, 0, { kind: 'mark', objectId: 'vega' });
  state = marked.simState;
  assert.equal(marked.event.type, 'object_marked');
  assert.equal(state.marks.vega.objectId, 'vega');
  assert.equal(state.marks.vega.markedBy, 0);
  assert.deepEqual(state.marks.vega.highlightedBy, [0]);
  assert.equal(state.observers[0].located, 'vega');

  const seen = applyTelescopeInput(state, 1, { kind: 'highlight', objectId: 'vega' });
  state = seen.simState;
  assert.equal(seen.event.type, 'object_highlighted');
  assert.equal(state.marks.vega.markedBy, 0);
  assert.deepEqual(state.marks.vega.highlightedBy, [0, 1]);

  const pos0 = apparentTelescopePosition(findSkyObject(state.sky, 'vega'), state.environment.now, state.environment);
  const pos1 = apparentTelescopePosition(findSkyObject(state.sky, 'vega'), state.environment.now, state.environment);
  assert.deepEqual(pos0, pos1);
});

test('telescope: leave is noncompetitive and assigns no winner', () => {
  let state = initTelescopeSimState({ seed: 3, now: LIVE_T0, activeSlots: [0, 1] });
  state = applyTelescopeInput(state, 0, { kind: 'mark', objectId: 'altair' }).simState;
  const left = applyTelescopeInput(state, 0, { kind: 'leave' });
  state = left.simState;

  assert.equal(left.event.type, 'observer_left');
  assert.equal(left.event.winner, null);
  assert.equal(state.winner, null);
  assert.equal(state.observers[0].present, false);
  assert.equal(state.status, 'observing');

  const last = applyTelescopeInput(state, 1, { kind: 'leave' });
  assert.equal(last.simState.winner, null);
  assert.equal(last.simState.status, 'idle');
});

test('telescope: live sync_env moves the sky; unknown marks are ignored', () => {
  let state = initTelescopeSimState({ seed: 4, now: LIVE_T0, environment: { timePhase: 0.1 } });
  const before = apparentTelescopePosition(findSkyObject(state.sky, 'deneb'), state.environment.now, state.environment);

  state = refreshTelescopeEnvironment(state, { now: LIVE_T0 + 8_000_000, timePhase: 0.1 });
  assert.equal(state.environment.policy, 'live');
  assert.equal(state.environment.frozenAt, null);
  const after = apparentTelescopePosition(findSkyObject(state.sky, 'deneb'), state.environment.now, state.environment);
  assert.notDeepEqual(before, after);

  const ignored = applyTelescopeInput(state, 0, { kind: 'mark', objectId: 'not-a-star' });
  assert.equal(ignored.event, null);
  assert.deepEqual(ignored.simState.marks, state.marks);
});

test('telescope: step_simulation lets a second observer locate the marked object', () => {
  let state = initTelescopeSimState({ seed: 11, now: LIVE_T0, activeSlots: [0, 1] });
  const first = stepTelescopeSimulation(state, {
    0: { input_state: { kind: 'mark', objectId: 'polaris', now: LIVE_T0 } },
  }, 1);
  state = first.simState;

  const second = stepTelescopeSimulation(state, {
    1: { input_state: { kind: 'locate', objectId: 'polaris', now: LIVE_T0 + 500 } },
  }, 1);

  assert.equal(second.simState.environment.policy, 'live');
  assert.equal(second.simState.environment.frozenAt, null);
  assert.equal(second.simState.environment.now, LIVE_T0 + 500);
  assert.equal(second.simState.observers[0].located, 'polaris');
  assert.equal(second.simState.observers[1].located, 'polaris');
  assert.deepEqual(second.simState.marks.polaris.highlightedBy, [0, 1]);
  assert.equal(second.simState.winner, null);
});

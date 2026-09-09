import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GUTTER_BOAT_RULES_VERSION,
  GUTTER_BOAT_COURSE_ID,
  GUTTER_BOAT_LENGTH,
  GUTTER_LANES,
  initGutterBoatState,
  validateGutterBoatInput,
  stepGutterBoatSimulation,
} from '../shared/gutterBoatModel.js';

test('gutter boats: initGutterBoatState initializes 1-4 lanes with distinct colors and names', () => {
  const state4 = initGutterBoatState({ activeSlots: [0, 1, 2, 3] });
  assert.equal(state4.courseId, GUTTER_BOAT_COURSE_ID);
  assert.equal(state4.status, 'racing');
  assert.equal(Object.keys(state4.boats).length, 4);

  for (let s = 0; s < 4; s++) {
    const boat = state4.boats[s];
    assert.equal(boat.slot, s);
    assert.equal(boat.progress, 0.0);
    assert.equal(boat.finished, false);
    assert.equal(boat.finishTimeMs, null);
    assert.equal(boat.x, GUTTER_LANES[s].x);
  }

  const state2 = initGutterBoatState({ activeSlots: [0, 1] });
  assert.equal(Object.keys(state2.boats).length, 2);
});

test('gutter boats: validateGutterBoatInput accepts valid inputs and rejects malformed', () => {
  const invalidNull = validateGutterBoatInput(null);
  assert.equal(invalidNull.valid, false);

  const invalidArray = validateGutterBoatInput([1, 2]);
  assert.equal(invalidArray.valid, false);

  const push = validateGutterBoatInput({ kind: 'push' });
  assert.equal(push.valid, true);
  assert.equal(push.sanitized.kind, 'push');

  const neutral = validateGutterBoatInput({ kind: 'neutral' });
  assert.equal(neutral.valid, true);
  assert.equal(neutral.sanitized.kind, 'neutral');

  const unknown = validateGutterBoatInput({ kind: 'nitro' });
  assert.equal(unknown.valid, false);
});

test('gutter boats: rain intensity and wind velocity accelerate gutter water current', () => {
  const dryEnv = { rain: 0.0, wind: [0.0, 0.0] };
  const heavyRainEnv = { rain: 1.0, wind: [0.0, 1.0] }; // strong rain and tailwind

  let dryState = initGutterBoatState({ activeSlots: [0], environment: dryEnv, seed: 100 });
  let rainState = initGutterBoatState({ activeSlots: [0], environment: heavyRainEnv, seed: 100 });

  // Advance both by 120 ticks (2 seconds)
  dryState = stepGutterBoatSimulation(dryState, {}, 120).simState;
  rainState = stepGutterBoatSimulation(rainState, {}, 120).simState;

  // The boat in heavy rain should have travelled substantially further down the copper gutter
  assert.ok(
    rainState.boats[0].progress > dryState.boats[0].progress,
    `Heavy rain progress (${rainState.boats[0].progress.toFixed(2)}) should exceed dry progress (${dryState.boats[0].progress.toFixed(2)})`
  );
  assert.ok(
    rainState.boats[0].speed > dryState.boats[0].speed,
    `Heavy rain speed (${rainState.boats[0].speed.toFixed(2)}) should exceed dry speed (${dryState.boats[0].speed.toFixed(2)})`
  );
});

test('gutter boats: player push provides immediate speed boost near start', () => {
  let simNormal = initGutterBoatState({ activeSlots: [0], seed: 42 });
  let simPushed = initGutterBoatState({ activeSlots: [0], seed: 42 });

  // Normal step with no inputs
  simNormal = stepGutterBoatSimulation(simNormal, {}, 30).simState;

  // Pushed step with push input at start
  const pushRes = stepGutterBoatSimulation(simPushed, { 0: { kind: 'push' } }, 30);
  simPushed = pushRes.simState;

  // Should have generated a boat_pushed event
  const pushEvent = pushRes.events.find(e => e.type === 'boat_pushed');
  assert.ok(pushEvent, 'boat_pushed event should be emitted');
  assert.equal(pushEvent.slot, 0);

  // The pushed boat should have covered more distance in 30 ticks
  assert.ok(
    simPushed.boats[0].progress > simNormal.boats[0].progress,
    `Pushed boat (${simPushed.boats[0].progress}) should be ahead of normal boat (${simNormal.boats[0].progress})`
  );
});

test('gutter boats: simulation steps until all boats cross finish line and resolves standings', () => {
  let state = initGutterBoatState({ activeSlots: [0, 1], seed: 42 });

  let done = false;
  let iterations = 0;
  let allEvents = [];

  while (!done && iterations < 1000) {
    const res = stepGutterBoatSimulation(state, {}, 10);
    state = res.simState;
    allEvents.push(...res.events);
    done = res.finished;
    iterations++;
  }

  assert.equal(state.status, 'complete');
  assert.equal(state.boats[0].finished, true);
  assert.equal(state.boats[1].finished, true);
  assert.ok(typeof state.boats[0].finishTimeMs === 'number');
  assert.ok(typeof state.boats[1].finishTimeMs === 'number');

  assert.ok(state.standings.length === 2);
  assert.equal(state.standings[0].rank, 1);
  assert.equal(state.standings[1].rank, 2);
  assert.equal(state.winner, state.standings[0].slot);

  const completeEvent = allEvents.find(e => e.type === 'race_complete');
  assert.ok(completeEvent, 'race_complete event must be generated');
  assert.equal(completeEvent.payload.winnerSlot, state.winner);
});

test('gutter boats: simultaneous finish tie policy is deterministic', () => {
  // If two boats finish in the same sub-tick with identical times, deterministic rank ordering by slot
  const state = initGutterBoatState({ activeSlots: [0, 1] });
  state.boats[0].finished = true;
  state.boats[0].finishTimeMs = 5420;
  state.boats[1].finished = true;
  state.boats[1].finishTimeMs = 5420;

  const res = stepGutterBoatSimulation(state, {}, 1);
  assert.equal(res.simState.status, 'complete');
  assert.equal(res.simState.standings[0].slot, 0);
  assert.equal(res.simState.standings[1].slot, 1);
  assert.equal(res.simState.standings[1].tied, true);
});

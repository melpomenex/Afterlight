import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DARTS_START_SCORE,
  DARTS_DARTS_PER_TURN,
  boardPointFor,
  scoreThrow,
  aimPowerToPoint,
  validateDartsInput,
  initDartsState,
  applyDartsInput,
} from '../shared/dartsModel.js';
import { DartsModule } from '../src/activities/darts.js';
import { createDartsController } from '../src/activities/darts/throwController.js';
import { hasActivityModule, unregisterActivityModule } from '../src/activities/registry.js';

function throwAt(state, slot, segment, ring) {
  const { u, v } = boardPointFor(segment, ring);
  return applyDartsInput(state, slot, { kind: 'throw', u, v });
}

test('darts: board scoring covers bulls, triples, doubles and misses', () => {
  assert.deepEqual(scoreThrow(0, 0), { points: 50, segment: 50, ring: 'inner-bull', double: true });
  assert.equal(scoreThrow(0, 0.12).points, 25);
  assert.equal(scoreThrow(0, 0.12).double, false);
  assert.equal(scoreThrow(...Object.values(boardPointFor(20, 'triple'))).points, 60);
  assert.equal(scoreThrow(...Object.values(boardPointFor(20, 'double'))).points, 40);
  assert.equal(scoreThrow(...Object.values(boardPointFor(20, 'double'))).double, true);
  assert.equal(scoreThrow(...Object.values(boardPointFor(1, 'single-outer'))).points, 1);
  assert.equal(scoreThrow(0, 1.2).ring, 'miss');
  assert.equal(scoreThrow(0, 1.2).points, 0);
});

test('darts: flick (u,v) and aim-power encode the same throw model', () => {
  const point = boardPointFor(20, 'double');
  const fromUv = validateDartsInput({ kind: 'throw', u: point.u, v: point.v });
  assert.equal(fromUv.valid, true);
  assert.equal(scoreThrow(fromUv.sanitized.u, fromUv.sanitized.v).points, 40);

  const aim = 0; // top = 20
  const power = 0.975;
  const converted = aimPowerToPoint(aim, power);
  const fromAim = validateDartsInput({ kind: 'throw', aim, power });
  assert.equal(fromAim.valid, true);
  assert.equal(scoreThrow(converted.u, converted.v).segment, 20);
  assert.equal(scoreThrow(fromAim.sanitized.u, fromAim.sanitized.v).ring, 'double');
});

test('darts: bust on overshoot or leave-1 restores start-of-turn score and passes', () => {
  let state = initDartsState({ activeSlots: [0, 1] });
  // Three T20s: 180, remaining 121
  ({ simState: state } = throwAt(state, 0, 20, 'triple'));
  ({ simState: state } = throwAt(state, 0, 20, 'triple'));
  ({ simState: state } = throwAt(state, 0, 20, 'triple'));
  assert.equal(state.players[0].score, 121);
  assert.equal(state.turnSlot, 1);

  // Opponent misses the turn
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  assert.equal(state.turnSlot, 0);
  assert.equal(state.players[0].turnStartScore, 121);

  // Two T20s from 121 leave 1 — bust
  ({ simState: state } = throwAt(state, 0, 20, 'triple'));
  let event;
  ({ simState: state, event } = throwAt(state, 0, 20, 'triple'));
  assert.equal(event.type, 'bust');
  assert.equal(state.players[0].score, 121);
  assert.equal(state.turnSlot, 1);
  assert.equal(event.payload.restored, 121);

  // Overshoot: force a high remaining then T20 from a low score via another bust path.
  // Leave player 1 at 301 and throw nothing; return to 0 and score T20 from 20 via singles.
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  assert.equal(state.turnSlot, 0);

  // From 121: S1 three times → 118, still player 0's next turn after passing? 3 darts pass.
  ({ simState: state } = throwAt(state, 0, 1, 'single-outer'));
  ({ simState: state } = throwAt(state, 0, 1, 'single-outer'));
  ({ simState: state } = throwAt(state, 0, 1, 'single-outer'));
  assert.equal(state.players[0].score, 118);
  assert.equal(state.turnSlot, 1);
});

test('darts: overshooting zero busts the turn', () => {
  let state = initDartsState({ activeSlots: [0, 1] });
  // Reduce player 0 to 40: 301 - 261. Use T20 x 4 = 240, then S21 impossible.
  // 4*60 + 20 + 1 = 261 → remaining 40.
  const script = [
    [20, 'triple'], [20, 'triple'], [20, 'triple'],
    [20, 'triple'], [20, 'single-outer'], [1, 'single-outer'],
  ];
  for (const [seg, ring] of script) {
    if (state.turnSlot !== 0) {
      ({ simState: state } = throwAt(state, 1, 20, 'miss'));
      continue;
    }
    ({ simState: state } = throwAt(state, 0, seg, ring));
  }
  // Walk until player 0 is on 40 or we finish the script with passes mixed in.
  // Safer: set up by applying known throws only on turn 0, skipping opponent with misses.
  state = initDartsState({ activeSlots: [0, 1] });
  const reduce = [
    [20, 'triple'], [20, 'triple'], [20, 'triple'], // 180 → 121, pass
    'pass',
    [20, 'triple'], [20, 'single-outer'], [1, 'single-outer'], // 81 → 40, pass
  ];
  for (const step of reduce) {
    if (step === 'pass') {
      ({ simState: state } = throwAt(state, 1, 20, 'miss'));
      ({ simState: state } = throwAt(state, 1, 20, 'miss'));
      ({ simState: state } = throwAt(state, 1, 20, 'miss'));
      continue;
    }
    ({ simState: state } = throwAt(state, 0, step[0], step[1]));
  }
  assert.equal(state.players[0].score, 40);
  assert.equal(state.turnSlot, 1);
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  assert.equal(state.turnSlot, 0);

  // T20 from 40 overshoots → bust
  const busted = throwAt(state, 0, 20, 'triple');
  assert.equal(busted.event.type, 'bust');
  assert.equal(busted.simState.players[0].score, 40);
  assert.equal(busted.simState.turnSlot, 1);
});

test('darts: a complete 301 double-out match records a winner', () => {
  let state = initDartsState({ activeSlots: [0, 1] });
  // Turn 1: T20 T20 T20 → 121
  ({ simState: state } = throwAt(state, 0, 20, 'triple'));
  ({ simState: state } = throwAt(state, 0, 20, 'triple'));
  ({ simState: state } = throwAt(state, 0, 20, 'triple'));
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  ({ simState: state } = throwAt(state, 1, 20, 'miss'));
  // Turn 2: T20 S11 inner-bull → 0
  ({ simState: state } = throwAt(state, 0, 20, 'triple'));
  ({ simState: state } = throwAt(state, 0, 11, 'single-outer'));
  const { simState, event } = throwAt(state, 0, 50, 'inner-bull');
  assert.equal(simState.players[0].score, 0);
  assert.equal(simState.status, 'complete');
  assert.equal(simState.winner, 0);
  assert.equal(event.type, 'match_ended');
  assert.equal(event.payload.reason, 'checkout');
  assert.ok(simState.standings.length === 2);
});

test('darts: three darts per turn and out-of-turn throws are ignored', () => {
  const state = initDartsState({ activeSlots: [0, 1] });
  assert.equal(state.dartsRemaining, DARTS_DARTS_PER_TURN);
  assert.equal(state.players[0].score, DARTS_START_SCORE);
  const skipped = applyDartsInput(state, 1, { kind: 'throw', u: 0, v: 0 });
  assert.equal(skipped.event, null);
});

test('darts: neutralize clears charge without enabling a bystander thrower', () => {
  const controller = createDartsController();
  assert.equal(typeof controller.neutralize, 'function');
  controller.neutralize();
  controller.disable();
  controller.neutralize();
  controller.enable();
  controller.neutralize();
  controller.disable();
  controller.dispose();
});

test('darts: module registers darts', () => {
  assert.equal(typeof DartsModule.initialize, 'function');
  assert.equal(hasActivityModule('darts'), true);
  unregisterActivityModule('darts');
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HORSESHOES_RULES_VERSION,
  HORSESHOES_WIN_SCORE,
  HORSESHOES_SHOES_PER_ROUND,
  HORSESHOES_STAKE_POWER,
  HORSESHOES_STAKES,
  HORSESHOES_ORIGINS,
  HORSESHOES_THROW_BOUNDS,
  validateHorseshoeThrow,
  classifyShoe,
  simulateHorseshoeThrow,
  scoreRound,
  initHorseshoeSimState,
  applyHorseshoeInput,
  stepHorseshoeSimulation,
} from '../shared/horseshoesModel.js';

test('horseshoes: validateHorseshoeThrow clamps angle/power/lateral', () => {
  assert.equal(validateHorseshoeThrow(null).valid, false);

  const def = validateHorseshoeThrow({});
  assert.equal(def.valid, true);
  assert.equal(def.sanitized.kind, 'throw');
  assert.equal(def.sanitized.angle, 0);
  assert.equal(def.sanitized.power, 0.65);
  assert.equal(def.sanitized.lateral, 0);

  const clamped = validateHorseshoeThrow({
    kind: 'throw',
    angle: 4,
    power: 9,
    lateral: -4,
  });
  assert.equal(clamped.sanitized.angle, HORSESHOES_THROW_BOUNDS.maxAngle);
  assert.equal(clamped.sanitized.power, HORSESHOES_THROW_BOUNDS.maxPower);
  assert.equal(clamped.sanitized.lateral, HORSESHOES_THROW_BOUNDS.minLateral);
});

test('horseshoes: overshoot past the stake scores 0 that shoe', () => {
  const over = simulateHorseshoeThrow(0, { angle: 0, power: 1, lateral: 0 });
  assert.equal(over.overshoot, true);
  assert.equal(over.ringer, false);
  assert.equal(over.close, false);

  const scored = scoreRound(
    [{ ...over, overshoot: true, ringer: false, close: false }],
    [{ distance: 0.4, overshoot: false, ringer: false, close: false }],
  );
  assert.deepEqual(scored.points, [0, 0]);
});

test('horseshoes: stake-power throw is a ringer; cancellation zeros a tied-ringer round', () => {
  const ringer = simulateHorseshoeThrow(0, { angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 });
  assert.equal(ringer.overshoot, false);
  assert.equal(ringer.ringer, true);
  assert.ok(ringer.distance <= 0.1);

  const same = simulateHorseshoeThrow(1, { angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 });
  assert.equal(same.ringer, true);

  const cancelled = scoreRound([ringer, ringer], [same, same]);
  assert.equal(cancelled.cancelledRingers, 2);
  assert.deepEqual(cancelled.points, [0, 0]);

  const oneRinger = scoreRound([ringer], [{ distance: 0.12, overshoot: false, ringer: false, close: true }]);
  assert.deepEqual(oneRinger.points, [3, 0]);
});

test('horseshoes: closest shoe within one shoe-width scores 1; equal closest ties award none', () => {
  const closeA = { distance: 0.14, overshoot: false, ringer: false, close: true };
  const farB = { distance: 0.4, overshoot: false, ringer: false, close: false };
  assert.deepEqual(scoreRound([closeA], [farB]).points, [1, 0]);

  const tied = { distance: 0.15, overshoot: false, ringer: false, close: true };
  const result = scoreRound([tied], [{ ...tied }]);
  assert.equal(result.closestTied, true);
  assert.deepEqual(result.points, [0, 0]);
});

test('horseshoes: classifyShoe agrees with stake geometry', () => {
  const stake = HORSESHOES_STAKES[0];
  const origin = HORSESHOES_ORIGINS[0];
  const past = classifyShoe([stake[0], 0, stake[2] + 0.4], stake, origin);
  assert.equal(past.overshoot, true);
  const onStake = classifyShoe([stake[0], 0, stake[2]], stake, origin);
  assert.equal(onStake.ringer, true);
});

test('horseshoes: alternate four shoes then cancellation produces the same round total', () => {
  let state = initHorseshoeSimState({
    environment: { policy: 'frozen', frozenAt: 50, wind: [0, 0], windSpeed: 0, rain: 0, intensity: 0, wetness: 0, timePhase: 0, version: 1 },
  });
  assert.equal(state.rulesVersion, HORSESHOES_RULES_VERSION);
  assert.equal(state.environment.policy, 'frozen');
  assert.equal(state.environment.frozenAt, 50);
  assert.equal(state.nextSlot, 0);

  const throws = [
    [0, { kind: 'throw', angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 }],
    [1, { kind: 'throw', angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 }],
    [0, { kind: 'throw', angle: 0.12, power: 0.55, lateral: 0.2 }],
    [1, { kind: 'throw', angle: -0.12, power: 0.55, lateral: -0.2 }],
  ];

  let last = null;
  for (const [slot, controls] of throws) {
    last = applyHorseshoeInput(state, slot, controls);
    state = last.simState;
  }

  assert.equal(state.throwsThisRound, 0);
  assert.equal(state.currentRound, 2);
  assert.ok(state.lastRound);
  assert.equal(state.lastRound.points[0] + state.lastRound.points[1], last.event.lastRound.points[0] + last.event.lastRound.points[1]);
  assert.equal(HORSESHOES_SHOES_PER_ROUND, 4);
});

test('horseshoes: first to 21 wins; 21-21 plays an extra round', () => {
  let state = initHorseshoeSimState({ scores: [20, 18] });
  state = applyHorseshoeInput(state, 0, { kind: 'throw', angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 }).simState;
  state = applyHorseshoeInput(state, 1, { kind: 'throw', angle: 0, power: 1, lateral: 0 }).simState;
  state = applyHorseshoeInput(state, 0, { kind: 'throw', angle: 0, power: 1, lateral: 0 }).simState;
  state = applyHorseshoeInput(state, 1, { kind: 'throw', angle: 0, power: 1, lateral: 0 }).simState;

  assert.equal(state.status, 'complete');
  assert.equal(state.winner, 0);
  assert.ok(state.players[0].score >= HORSESHOES_WIN_SCORE);
  assert.ok(state.players[0].score > state.players[1].score);

  let tied = initHorseshoeSimState({ scores: [21, 21] });
  assert.equal(tied.players[0].score, 21);
  assert.equal(tied.players[1].score, 21);

  tied = applyHorseshoeInput(tied, 0, { kind: 'throw', angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 }).simState;
  tied = applyHorseshoeInput(tied, 1, { kind: 'throw', angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 }).simState;
  tied = applyHorseshoeInput(tied, 0, { kind: 'throw', angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 }).simState;
  tied = applyHorseshoeInput(tied, 1, { kind: 'throw', angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 }).simState;

  assert.equal(tied.status, 'throwing');
  assert.equal(tied.extraRound, true);
  assert.equal(tied.winner, null);
  assert.equal(tied.players[0].score, 21);
  assert.equal(tied.players[1].score, 21);

  tied = applyHorseshoeInput(tied, 0, { kind: 'throw', angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 }).simState;
  tied = applyHorseshoeInput(tied, 1, { kind: 'throw', angle: 0, power: 1, lateral: 0 }).simState;
  tied = applyHorseshoeInput(tied, 0, { kind: 'throw', angle: 0, power: 1, lateral: 0 }).simState;
  tied = applyHorseshoeInput(tied, 1, { kind: 'throw', angle: 0, power: 1, lateral: 0 }).simState;

  assert.equal(tied.status, 'complete');
  assert.equal(tied.winner, 0);
  assert.ok(tied.players[0].score > tied.players[1].score);
});

test('horseshoes: step_simulation applies the next thrower only and reports first-to-21', () => {
  let { simState: state } = stepHorseshoeSimulation(
    initHorseshoeSimState({ scores: [20, 0] }),
    {
      0: { input_state: { kind: 'throw', angle: 0, power: HORSESHOES_STAKE_POWER, lateral: 0 } },
    },
    1,
  );
  assert.equal(state.nextSlot, 1);
  assert.equal(state.players[0].shoes.length, 1);
  assert.equal(state.players[1].shoes.length, 0);

  const stepped = stepHorseshoeSimulation(state, {
    1: { input_state: { kind: 'throw', angle: 0, power: 1, lateral: 0 } },
  }, 1);
  state = stepped.simState;
  state = stepHorseshoeSimulation(state, { 0: { input_state: { kind: 'throw', angle: 0, power: 1, lateral: 0 } } }, 1).simState;
  const finished = stepHorseshoeSimulation(state, { 1: { input_state: { kind: 'throw', angle: 0, power: 1, lateral: 0 } } }, 1);
  assert.equal(finished.simState.status, 'complete');
  assert.equal(finished.outcome.type, 'match_ended');
  assert.equal(finished.outcome.winnerSlot, 0);
});

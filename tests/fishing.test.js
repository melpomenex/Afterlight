import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FISHING_RULES_VERSION,
  FISH_SPECIES,
  DEFAULT_FISHING_ENVIRONMENT,
  initFishingState,
  validateFishingInput,
  applyFishingInput,
  applyFishingEnvironment,
  clearAngler,
  stepFishingSimulation,
  visibleLines,
  biteChancePerTick,
  pickSpecies,
} from '../shared/fishingModel.js';

test('fishing: init has no economy fields and starts both anglers idle', () => {
  const state = initFishingState({ activeSlots: [0, 1], nowMs: 1_700_000_000_000 });
  assert.equal(state.rulesVersion, FISHING_RULES_VERSION);
  assert.equal(state.status, 'open');
  assert.equal(state.environment.policy, 'live');
  assert.equal(state.environmentAt, 1_700_000_000_000);
  assert.equal(state.anglers[0].phase, 'idle');
  assert.equal(state.anglers[1].phase, 'idle');
  const blob = JSON.stringify(state);
  assert.equal(blob.includes('"gold"'), false);
  assert.equal(blob.includes('"inventory"'), false);
  assert.equal(blob.includes('"xp"'), false);
  assert.equal(blob.includes('"crop"'), false);
});

test('fishing: validateFishingInput accepts cast/reel/release and rejects junk', () => {
  assert.equal(validateFishingInput(null).valid, false);
  assert.equal(validateFishingInput([]).valid, false);
  assert.equal(validateFishingInput({ kind: 'warp' }).valid, false);

  const cast = validateFishingInput({ kind: 'cast', power: 9 });
  assert.equal(cast.valid, true);
  assert.equal(cast.sanitized.power, 1);

  assert.equal(validateFishingInput({ kind: 'reel' }).valid, true);
  assert.equal(validateFishingInput({ kind: 'release' }).valid, true);
  assert.equal(validateFishingInput({ kind: 'leave' }).valid, true);
  assert.equal(validateFishingInput({ kind: 'neutral' }).valid, true);
});

test('fishing: two visitors each see both lines after independent casts', () => {
  let state = initFishingState({ activeSlots: [0, 1], seed: 7 });
  state = applyFishingInput(state, 0, { kind: 'cast', power: 0.7 }).simState;
  state = applyFishingInput(state, 1, { kind: 'cast', power: 0.55 }).simState;
  state = stepFishingSimulation(state, {}, FISHING_CAST_STEPS()).simState;

  const lines = visibleLines(state);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((row) => row.bobber && row.line?.length === 2));
  assert.equal(state.anglers[0].phase, 'waiting');
  assert.equal(state.anglers[1].phase, 'waiting');
});

function FISHING_CAST_STEPS() {
  return 24;
}

test('fishing: live rain raises bite chance vs the declared dry default', () => {
  const dry = biteChancePerTick({ ...DEFAULT_FISHING_ENVIRONMENT, rain: 0, timePhase: 0.5 });
  const wet = biteChancePerTick({ ...DEFAULT_FISHING_ENVIRONMENT, rain: 0.9, timePhase: 0.5 });
  assert.ok(wet > dry, `rain should raise bite chance: ${wet} vs ${dry}`);
});

test('fishing: identical live environment + seed + ticks reproduce the same bite', () => {
  const env = { ...DEFAULT_FISHING_ENVIRONMENT, rain: 0.8, timePhase: 0.15 };
  const run = () => {
    let state = initFishingState({ activeSlots: [0], environment: env, seed: 99, nowMs: 5000 });
    state = applyFishingInput(state, 0, { kind: 'cast', power: 0.6 }).simState;
    let biteTick = null;
    for (let i = 0; i < 4000; i++) {
      const res = stepFishingSimulation(state, {}, 1);
      state = res.simState;
      if (res.events.some((e) => e.type === 'bite')) {
        biteTick = state.tickCount;
        break;
      }
    }
    return { biteTick, phase: state.anglers[0].phase };
  };

  const a = run();
  const b = run();
  assert.ok(a.biteTick !== null, 'expected a bite under heavy rain/dawn');
  assert.equal(a.biteTick, b.biteTick);
  assert.equal(a.phase, b.phase);
});

test('fishing: reel/leave are independent and catch/release writes no inventory', () => {
  const env = { ...DEFAULT_FISHING_ENVIRONMENT, rain: 1, timePhase: 0.15 };
  let state = initFishingState({ activeSlots: [0, 1], environment: env, seed: 3 });
  state = applyFishingInput(state, 0, { kind: 'cast', power: 0.8 }).simState;
  state = applyFishingInput(state, 1, { kind: 'cast', power: 0.8 }).simState;

  let hooked = false;
  for (let i = 0; i < 5000 && !hooked; i++) {
    const res = stepFishingSimulation(state, {}, 1);
    state = res.simState;
    if (state.anglers[0].phase === 'bite') hooked = true;
  }
  assert.equal(state.anglers[0].phase, 'bite');
  assert.ok(state.anglers[1].phase === 'waiting' || state.anglers[1].phase === 'bite');

  const reel = applyFishingInput(state, 0, { kind: 'reel' });
  state = reel.simState;
  assert.equal(reel.event?.type, 'fish_hooked');
  assert.ok(FISH_SPECIES.includes(state.anglers[0].lastCatch.species));
  assert.equal(Object.hasOwn(state.anglers[0].lastCatch, 'gold'), false);
  assert.equal(Object.hasOwn(state.anglers[0].lastCatch, 'inventory'), false);

  const stillWaiting = state.anglers[1].phase;
  assert.ok(stillWaiting === 'waiting' || stillWaiting === 'bite');

  state = stepFishingSimulation(state, {}, 90).simState;
  assert.equal(state.anglers[0].phase, 'catch');

  const released = applyFishingInput(state, 0, { kind: 'release' });
  state = released.simState;
  assert.equal(released.event?.type, 'fish_released');
  assert.equal(state.anglers[0].phase, 'idle');
  assert.equal(state.recentReleases[0].species, released.event.payload.species);
  assert.equal(state.anglers[1].phase, stillWaiting);

  const afterLeave = clearAngler(state, 1);
  assert.equal(afterLeave.anglers[1].phase, 'idle');
  assert.equal(afterLeave.anglers[1].bobber, null);
  assert.equal(afterLeave.anglers[0].phase, 'idle');
});

test('fishing: timestamped live weather updates change later bite odds', () => {
  let state = initFishingState({
    activeSlots: [0],
    environment: { ...DEFAULT_FISHING_ENVIRONMENT, rain: 0 },
    seed: 11,
    nowMs: 1000,
  });
  const dryChance = biteChancePerTick(state.environment);
  state = applyFishingEnvironment(state, { ...DEFAULT_FISHING_ENVIRONMENT, rain: 1, timePhase: 0.15 }, 2500);
  assert.equal(state.environmentAt, 2500);
  assert.ok(biteChancePerTick(state.environment) > dryChance);
  assert.ok(pickSpecies(state.environment, 11, 0, 40));
});

test('fishing: missing environment falls back to the declared shared default', () => {
  const state = initFishingState({ activeSlots: [0], environment: null });
  assert.equal(state.environment.policy, 'live');
  assert.equal(state.environment.rain, DEFAULT_FISHING_ENVIRONMENT.rain);
  assert.deepEqual(state.environment.wind, [0, 0]);
});

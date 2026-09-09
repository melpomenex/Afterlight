import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CURLING_RULES_VERSION,
  CURLING_TOTAL_ENDS,
  CURLING_STONES_PER_SIDE,
  HOUSE_X,
  HOUSE_Z,
  HOUSE_RADIUS,
  HACK_Z,
  DEFAULT_CURLING_ENVIRONMENT,
  iceFrictionFromEnvironment,
  iceDeceleration,
  teamForSlot,
  slotsForTeam,
  throwerForStone,
  validateCurlingControls,
  initCurlingState,
  applyCurlingInput,
  applyCurlingDisconnect,
  stepCurlingSimulation,
  scoreEnd,
  scorePlacedEnd,
} from '../shared/curlingModel.js';

function launchAndRest(state, slot, shot, maxTicks = 900) {
  let current = applyCurlingInput(state, slot, { kind: 'launch', ...shot }).simState;
  let guard = 0;
  while (current.status === 'in_flight' && guard < maxTicks) {
    current = stepCurlingSimulation(current, {}, 4).simState;
    guard += 4;
  }
  return current;
}

function playBlankEnds(start, count) {
  let state = start;
  for (let e = 0; e < count; e += 1) {
    const beforeEnd = state.currentEnd;
    for (let i = 0; i < CURLING_STONES_PER_SIDE * 2; i += 1) {
      const slot = state.currentSlot;
      state = applyCurlingInput(state, slot, { kind: 'launch', aim: 0.22, power: 0.2, curl: 0 }).simState;
      let guard = 0;
      while (state.status === 'in_flight' && guard < 400) {
        state = stepCurlingSimulation(state, {}, 8).simState;
        guard += 8;
      }
    }
    assert.equal(state.score[0], 0, 'blank ends must not award points');
    assert.equal(state.score[1], 0, 'blank ends must not award points');
    if (e < count - 1) {
      assert.equal(state.currentEnd, beforeEnd + 1);
    }
  }
  return state;
}

test('curling: initializes 1v1 and 2v2 with four ends and four stones per side', () => {
  const singles = initCurlingState({ activeSlots: [0, 1] });
  assert.equal(singles.rulesVersion, CURLING_RULES_VERSION);
  assert.equal(singles.teamSize, 1);
  assert.equal(singles.totalEnds, CURLING_TOTAL_ENDS);
  assert.equal(singles.stonesPerSide, CURLING_STONES_PER_SIDE);
  assert.equal(singles.status, 'aiming');
  assert.equal(singles.hammerTeam, 1);
  assert.equal(singles.currentSlot, 0);
  assert.equal(singles.currentTeam, 0);
  assert.equal(singles.iceFriction, iceFrictionFromEnvironment(DEFAULT_CURLING_ENVIRONMENT));

  const doubles = initCurlingState({ activeSlots: [0, 1, 2, 3] });
  assert.equal(doubles.teamSize, 2);
  assert.deepEqual(slotsForTeam(0, 2), [0, 1]);
  assert.deepEqual(slotsForTeam(1, 2), [2, 3]);
  assert.equal(teamForSlot(3, 2), 1);
  assert.equal(throwerForStone(0, 2, 1), 0);
  assert.equal(throwerForStone(1, 2, 1), 2);
  assert.equal(throwerForStone(2, 2, 1), 1);
  assert.equal(throwerForStone(3, 2, 1), 3);
});

test('curling: validateCurlingControls clamps aim, power, curl and sweep', () => {
  assert.equal(validateCurlingControls(null).valid, false);

  const launch = validateCurlingControls({ kind: 'launch', aim: 4, power: 9, curl: -4 });
  assert.equal(launch.valid, true);
  assert.equal(launch.sanitized.aim, 0.28);
  assert.equal(launch.sanitized.power, 1);
  assert.equal(launch.sanitized.curl, -1);

  const sweep = validateCurlingControls({ kind: 'sweep', sweep: true });
  assert.equal(sweep.sanitized.sweep, 1);

  const unknown = validateCurlingControls({ kind: 'teleport' });
  assert.equal(unknown.valid, false);
});

test('curling: launch, curl and sweep change the in-play stone', () => {
  const straight = launchAndRest(
    initCurlingState({ activeSlots: [0, 1] }),
    0,
    { aim: 0, power: 0.7, curl: 0 },
  );
  const stone = straight.stones[0];
  assert.ok(stone.z > HACK_Z + 2, `stone should travel down the sheet (z=${stone.z})`);
  assert.ok(Math.abs(stone.x) < 0.35, `no-curl shot stays near center (x=${stone.x})`);

  const curled = launchAndRest(
    initCurlingState({ activeSlots: [0, 1] }),
    0,
    { aim: 0, power: 0.7, curl: 1 },
  );
  assert.ok(
    Math.abs(curled.stones[0].x - stone.x) > 0.08,
    `curl must move the stone laterally (${curled.stones[0].x} vs ${stone.x})`,
  );

  let swept = applyCurlingInput(
    initCurlingState({ activeSlots: [0, 1] }),
    0,
    { kind: 'launch', aim: 0, power: 0.58, curl: 0 },
  ).simState;
  swept = applyCurlingInput(swept, 0, { kind: 'sweep', sweep: 1 }).simState;
  let guard = 0;
  while (swept.status === 'in_flight' && guard < 900) {
    swept = stepCurlingSimulation(swept, { 0: { kind: 'sweep', sweep: 1 } }, 4).simState;
    guard += 4;
  }

  const dry = launchAndRest(
    initCurlingState({ activeSlots: [0, 1] }),
    0,
    { aim: 0, power: 0.58, curl: 0 },
  );
  assert.ok(
    swept.stones[0].z > dry.stones[0].z + 0.15,
    `sweep should carry farther (${swept.stones[0].z} vs ${dry.stones[0].z})`,
  );
});

test('curling: opposing sweepers cannot sweep the live stone', () => {
  let state = applyCurlingInput(
    initCurlingState({ activeSlots: [0, 1] }),
    0,
    { kind: 'launch', aim: 0, power: 0.6, curl: 0 },
  ).simState;
  state = applyCurlingInput(state, 1, { kind: 'sweep', sweep: 1 }).simState;
  assert.equal(state.sweepers[1] || 0, 0);
  assert.equal(state.currentTeam, 0);
});

test('curling: stone collisions transfer momentum', () => {
  let state = initCurlingState({ activeSlots: [0, 1] });
  state.status = 'in_flight';
  state.currentTeam = 0;
  state.stonesThrown = 2;
  state.stones = [
    { id: 'parked', team: 1, slot: 1, x: 0, z: 1.2, vx: 0, vz: 0, omega: 0, radius: 0.145, moving: false, out: false },
    { id: 'shot', team: 0, slot: 0, x: 0, z: 0.6, vx: 0, vz: 3.2, omega: 0, radius: 0.145, moving: true, out: false },
  ];
  const before = { x: state.stones[0].x, z: state.stones[0].z };
  for (let i = 0; i < 40; i += 1) {
    state = stepCurlingSimulation(state, {}, 1).simState;
  }
  const moved = Math.hypot(state.stones[0].x - before.x, state.stones[0].z - before.z);
  assert.ok(moved > 0.08, `hit stone should move (delta=${moved})`);
});

test('curling: closest-stone scoring counts only nearer stones of the closest side', () => {
  const scored = scorePlacedEnd([
    { team: 0, x: HOUSE_X, z: HOUSE_Z + 0.12 },
    { team: 0, x: HOUSE_X + 0.2, z: HOUSE_Z + 0.28 },
    { team: 1, x: HOUSE_X, z: HOUSE_Z + 0.55 },
    { team: 1, x: HOUSE_X - 0.4, z: HOUSE_Z + 0.8 },
  ]);
  assert.equal(scored.scoringTeam, 0);
  assert.equal(scored.points, 2);

  const single = scorePlacedEnd([
    { team: 1, x: HOUSE_X + 0.1, z: HOUSE_Z },
    { team: 0, x: HOUSE_X + 0.9, z: HOUSE_Z },
    { team: 1, x: HOUSE_X + 1.4, z: HOUSE_Z },
  ]);
  assert.equal(single.scoringTeam, 1);
  assert.equal(single.points, 1);
  assert.ok(single.distances[0].d < HOUSE_RADIUS);
});

test('curling: tied end awards no points and begins the next end', () => {
  const equal = scoreEnd([
    { team: 0, x: 0.2, z: HOUSE_Z, out: false },
    { team: 1, x: -0.2, z: HOUSE_Z, out: false },
  ]);
  assert.equal(equal.scoringTeam, null);
  assert.equal(equal.points, 0);

  let state = initCurlingState({ activeSlots: [0, 1] });
  for (let i = 0; i < 8; i += 1) {
    const slot = state.currentSlot;
    state = applyCurlingInput(state, slot, { kind: 'launch', aim: 0.24, power: 0.18, curl: 0 }).simState;
    while (state.status === 'in_flight') {
      state = stepCurlingSimulation(state, {}, 8).simState;
    }
  }

  assert.equal(state.score[0], 0);
  assert.equal(state.score[1], 0);
  assert.equal(state.currentEnd, 2);
  assert.equal(state.endHistory[0].points, 0);
  assert.equal(state.status, 'aiming');
  assert.equal(state.stones.length, 0);
});

test('curling: match tied after four ends starts an extra end', () => {
  let state = playBlankEnds(initCurlingState({ activeSlots: [0, 1] }), 4);
  assert.equal(state.currentEnd, 5);
  assert.equal(state.extraEnd, true);
  assert.equal(state.status, 'aiming');
  assert.equal(state.winner, null);
  assert.equal(state.score[0], 0);
  assert.equal(state.score[1], 0);
});

test('curling: extra end that scores ends the match', () => {
  let state = playBlankEnds(initCurlingState({ activeSlots: [0, 1] }), 4);
  assert.equal(state.extraEnd, true);

  state.stones = [
    { id: 'shot', team: 0, slot: 0, x: HOUSE_X, z: HOUSE_Z, vx: 0, vz: 0, omega: 0, radius: 0.145, moving: false, out: false },
  ];
  state.stonesThrown = 8;
  state.status = 'in_flight';
  state = stepCurlingSimulation(state, {}, 1).simState;

  assert.equal(state.status, 'complete');
  assert.equal(state.winner, 0);
  assert.equal(state.outcome, 'complete');
  assert.equal(state.score[0], 1);
});

test('curling: 2v2 rotates teammates and only the throwing side may sweep', () => {
  let state = initCurlingState({ activeSlots: [0, 1, 2, 3] });
  assert.equal(state.currentSlot, 0);

  state = applyCurlingInput(state, 0, { kind: 'launch', aim: 0.2, power: 0.2, curl: 0 }).simState;
  state = applyCurlingInput(state, 1, { kind: 'sweep', sweep: 1 }).simState;
  assert.equal(state.sweepers[1], 1);
  state = applyCurlingInput(state, 2, { kind: 'sweep', sweep: 1 }).simState;
  assert.equal(state.sweepers[2] || 0, 0);

  while (state.status === 'in_flight') {
    state = stepCurlingSimulation(state, {}, 8).simState;
  }
  assert.equal(state.currentSlot, 2);

  state = applyCurlingInput(state, 2, { kind: 'launch', aim: -0.2, power: 0.2, curl: 0 }).simState;
  while (state.status === 'in_flight') {
    state = stepCurlingSimulation(state, {}, 8).simState;
  }
  assert.equal(state.currentSlot, 1);
});

test('curling: ice friction comes from the frozen environment snapshot, not particles', () => {
  const dry = { ...DEFAULT_CURLING_ENVIRONMENT, wetness: 0, intensity: 0 };
  const wet = { ...DEFAULT_CURLING_ENVIRONMENT, wetness: 0.9, intensity: 0.8 };

  assert.ok(iceFrictionFromEnvironment(dry) > iceFrictionFromEnvironment(wet));
  assert.ok(iceDeceleration(wet, 0) > iceDeceleration(dry, 0));
  assert.equal(iceFrictionFromEnvironment(null), iceFrictionFromEnvironment(DEFAULT_CURLING_ENVIRONMENT));

  const dryShot = launchAndRest(initCurlingState({ activeSlots: [0, 1], environment: dry }), 0, {
    aim: 0,
    power: 0.6,
    curl: 0,
  });
  const wetShot = launchAndRest(initCurlingState({ activeSlots: [0, 1], environment: wet }), 0, {
    aim: 0,
    power: 0.6,
    curl: 0,
  });
  assert.ok(
    dryShot.stones[0].z > wetShot.stones[0].z + 0.2,
    `wet ice must drag more (${dryShot.stones[0].z} vs ${wetShot.stones[0].z})`,
  );
});

test('curling: D3 pause during grace, then forfeit incomplete side or abort both', () => {
  let singles = initCurlingState({ activeSlots: [0, 1] });
  singles = applyCurlingInput(singles, 0, { kind: 'pause' }).simState;
  assert.equal(singles.status, 'paused');
  assert.equal(singles.pauseReason, 'disconnect_grace');

  singles = applyCurlingInput(singles, 0, { kind: 'resume' }).simState;
  assert.equal(singles.status, 'aiming');

  const forfeit = applyCurlingDisconnect(initCurlingState({ activeSlots: [0, 1] }), [0]);
  assert.equal(forfeit.simState.status, 'complete');
  assert.equal(forfeit.simState.winner, 0);
  assert.equal(forfeit.simState.outcome, 'forfeit');
  assert.equal(forfeit.event.reason, 'forfeit');

  const abort = applyCurlingInput(
    initCurlingState({ activeSlots: [0, 1] }),
    0,
    { kind: 'disconnect', remainingSlots: [] },
  );
  assert.equal(abort.simState.status, 'aborted');
  assert.equal(abort.simState.outcome, 'aborted');
  assert.equal(abort.event.reason, 'both_sides_incomplete');

  const doublesKeep = applyCurlingDisconnect(
    initCurlingState({ activeSlots: [0, 1, 2, 3] }),
    [2, 3],
  );
  assert.equal(doublesKeep.simState.winner, 1);
  assert.equal(doublesKeep.simState.outcome, 'forfeit');

  const doublesAbort = applyCurlingDisconnect(
    initCurlingState({ activeSlots: [0, 1, 2, 3] }),
    [0, 2],
  );
  assert.equal(doublesAbort.simState.status, 'aborted');
  assert.equal(doublesAbort.simState.winner, null);
});

test('curling: wrong thrower cannot launch and out-of-turn inputs are ignored', () => {
  const state = initCurlingState({ activeSlots: [0, 1] });
  const denied = applyCurlingInput(state, 1, { kind: 'launch', aim: 0, power: 0.8, curl: 0 });
  assert.equal(denied.simState.stonesThrown, 0);
  assert.equal(denied.simState.status, 'aiming');
});

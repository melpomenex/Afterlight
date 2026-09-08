import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initGame,
  shoot,
  step,
  placeCueBall,
  callPocket,
  resign,
  RULES_VERSION,
} from '../shared/pool/rules.js';

test('pool rules: initial state adheres to house rules', () => {
  const game = initGame();
  assert.equal(game.rules_version, RULES_VERSION);
  assert.equal(game.status, 'aiming');
  assert.equal(game.turn, 0);
  assert.equal(game.table_open, true);
  assert.equal(game.groups['0'], null);
  assert.equal(game.groups['1'], null);
  assert.equal(game.ball_in_hand, false);
  assert.equal(game.winner, null);
  assert.equal(game.win_reason, null);
  assert.equal(game.shot_count, 0);
});

test('pool rules: scratch on break awards opponent ball-in-hand', () => {
  let game = initGame();
  // Aim directly towards corner_tl pocket (-1.12, -0.56) from cue ball at (-0.56, 0.0)
  const angle = Math.atan2(-0.56, -0.56);
  const res = shoot(game, 0, angle, 4.0);
  assert.equal(res.ok, true);
  game = res.state;

  for (let i = 0; i < 60; i++) {
    const s = step(game, 1 / 60);
    game = s.state;
    if (game.status !== 'shooting') break;
  }

  assert.equal(game.status, 'awaiting_ball_in_hand');
  assert.equal(game.turn, 1);
  assert.equal(game.ball_in_hand, true);
  assert.equal(game.foul, 'scratch');
  assert.equal(game.shot_count, 1);
  assert.equal(game.table_open, true);
});

test('pool rules: ball-in-hand placement validation', () => {
  let game = initGame();
  game = {
    ...game,
    status: 'awaiting_ball_in_hand',
    turn: 1,
    ball_in_hand: true,
  };

  // 1. Placement out of bounds
  const badBounds = placeCueBall(game, 1, 2.5, 0.0);
  assert.equal(badBounds.ok, false);
  assert.equal(badBounds.error, 'invalid_position');

  // 2. Placement overlapping ball 1 at apex (x = 0.56, z = 0.0)
  const overlap = placeCueBall(game, 1, 0.56, 0.0);
  assert.equal(overlap.ok, false);
  assert.equal(overlap.error, 'invalid_position');

  // 3. Valid placement in clear space
  const valid = placeCueBall(game, 1, -0.4, 0.2);
  assert.equal(valid.ok, true);
  const updated = valid.state;
  assert.equal(updated.ball_in_hand, false);
  assert.equal(updated.status, 'aiming');
  assert.equal(updated.physics.balls['0'].x, -0.4);
  assert.equal(updated.physics.balls['0'].z, 0.2);
  assert.equal(updated.physics.balls['0'].state, 'in_play');
});

test('pool rules: group assignment on first post-break pocket', () => {
  let game = initGame();
  // Simulate post-break state with ball 3 right near corner_br pocket
  game = {
    ...game,
    shot_count: 1,
    table_open: true,
    turn: 0,
    physics: {
      balls: {
        '0': { id: 0, x: 0.8, z: 0.4, vx: 0, vz: 0, wx: 0, wz: 0, wy: 0, state: 'in_play' },
        '3': { id: 3, x: 1.0, z: 0.5, vx: 0, vz: 0, wx: 0, wz: 0, wy: 0, state: 'in_play' }, // Solid
      },
      settled: true,
      events: [],
      tick: 1,
    },
  };

  const angle = Math.atan2(0.56 - 0.4, 1.12 - 0.8);
  const shotRes = shoot(game, 0, angle, 3.0);
  assert.equal(shotRes.ok, true);
  game = shotRes.state;

  for (let i = 0; i < 80; i++) {
    const s = step(game, 1 / 60);
    game = s.state;
    if (game.status !== 'shooting') break;
  }

  assert.equal(game.status, 'aiming');
  assert.equal(game.table_open, false);
  assert.equal(game.groups['0'], 'solids');
  assert.equal(game.groups['1'], 'stripes');
  assert.equal(game.turn, 0); // retained turn because shooter pocketed own ball
});

test('pool rules: early eight-ball causes immediate loss', () => {
  let game = initGame();
  game = {
    ...game,
    shot_count: 1,
    table_open: false,
    groups: { '0': 'solids', '1': 'stripes' },
    turn: 0,
    physics: {
      balls: {
        '0': { id: 0, x: 0.8, z: 0.4, vx: 0, vz: 0, wx: 0, wz: 0, wy: 0, state: 'in_play' },
        '1': { id: 1, x: -0.5, z: 0.0, vx: 0, vz: 0, wx: 0, wz: 0, wy: 0, state: 'in_play' }, // Solid still in play!
        '8': { id: 8, x: 1.0, z: 0.5, vx: 0, vz: 0, wx: 0, wz: 0, wy: 0, state: 'in_play' },
      },
      settled: true,
      events: [],
      tick: 1,
    },
  };

  const angle = Math.atan2(0.56 - 0.4, 1.12 - 0.8);
  const shotRes = shoot(game, 0, angle, 3.0);
  assert.equal(shotRes.ok, true);
  game = shotRes.state;

  for (let i = 0; i < 80; i++) {
    const s = step(game, 1 / 60);
    game = s.state;
    if (game.status !== 'shooting') break;
  }

  assert.equal(game.status, 'game_over');
  assert.equal(game.winner, 1);
  assert.equal(game.win_reason, 'early_eight');
});

test('pool rules: legal called eight-ball wins match', () => {
  let game = initGame();
  game = {
    ...game,
    shot_count: 5,
    table_open: false,
    groups: { '0': 'solids', '1': 'stripes' },
    turn: 0,
    physics: {
      balls: {
        '0': { id: 0, x: 0.8, z: 0.4, vx: 0, vz: 0, wx: 0, wz: 0, wy: 0, state: 'in_play' },
        // All solids pocketed!
        '8': { id: 8, x: 1.0, z: 0.5, vx: 0, vz: 0, wx: 0, wz: 0, wy: 0, state: 'in_play' },
      },
      settled: true,
      events: [],
      tick: 1,
    },
  };

  // Must call pocket before shooting at 8
  const callRes = callPocket(game, 0, 'corner_br');
  assert.equal(callRes.ok, true);
  game = callRes.state;

  const angle = Math.atan2(0.56 - 0.4, 1.12 - 0.8);
  const shotRes = shoot(game, 0, angle, 3.0);
  assert.equal(shotRes.ok, true);
  game = shotRes.state;

  for (let i = 0; i < 80; i++) {
    const s = step(game, 1 / 60);
    game = s.state;
    if (game.status !== 'shooting') break;
  }

  assert.equal(game.status, 'game_over');
  assert.equal(game.winner, 0);
  assert.equal(game.win_reason, 'eight_ball');
});

test('pool rules: wrong pocket on eight loses match', () => {
  let game = initGame();
  game = {
    ...game,
    shot_count: 5,
    table_open: false,
    groups: { '0': 'solids', '1': 'stripes' },
    turn: 0,
    physics: {
      balls: {
        '0': { id: 0, x: 0.8, z: 0.4, vx: 0, vz: 0, wx: 0, wz: 0, wy: 0, state: 'in_play' },
        '8': { id: 8, x: 1.0, z: 0.5, vx: 0, vz: 0, wx: 0, wz: 0, wy: 0, state: 'in_play' },
      },
      settled: true,
      events: [],
      tick: 1,
    },
  };

  // Called corner_tl but 8 drops into corner_br!
  const callRes = callPocket(game, 0, 'corner_tl');
  assert.equal(callRes.ok, true);
  game = callRes.state;

  const angle = Math.atan2(0.56 - 0.4, 1.12 - 0.8);
  const shotRes = shoot(game, 0, angle, 3.0);
  assert.equal(shotRes.ok, true);
  game = shotRes.state;

  for (let i = 0; i < 80; i++) {
    const s = step(game, 1 / 60);
    game = s.state;
    if (game.status !== 'shooting') break;
  }

  assert.equal(game.status, 'game_over');
  assert.equal(game.winner, 1);
  assert.equal(game.win_reason, 'wrong_pocket_eight');
});

test('pool rules: resignation immediately awards victory to opponent', () => {
  const game = initGame();
  const resigned = resign(game, 0);

  assert.equal(resigned.status, 'game_over');
  assert.equal(resigned.winner, 1);
  assert.equal(resigned.win_reason, 'resignation');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initAirHockeyState,
  clampMalletPosition,
  resolveMalletInput,
  stepAirHockey,
  TABLE_LENGTH,
  TABLE_WIDTH,
  CENTER_X,
  CENTER_Y,
  PUCK_RADIUS,
  MALLET_RADIUS,
  GOAL_TOP,
  GOAL_BOTTOM,
  MAX_MALLET_SPEED,
} from '../shared/airHockeyModel.js';

test('initAirHockeyState initializes default 200x100 table state and series configuration', () => {
  const state = initAirHockeyState();
  assert.equal(state.length, 200);
  assert.equal(state.width, 100);
  assert.equal(state.state, 'serving');
  assert.equal(state.targetScore, 7);
  assert.equal(state.seriesLength, 1);
  assert.equal(state.winsNeeded, 1);
  assert.deepEqual(state.score, { '0': 0, '1': 0 });
  assert.deepEqual(state.seriesScore, { '0': 0, '1': 0 });

  assert.equal(state.puck.x, 100);
  assert.equal(state.puck.y, 50);
  assert.equal(state.puck.radius, 4);

  assert.equal(state.mallets['0'].x, 30);
  assert.equal(state.mallets['0'].y, 50);
  assert.equal(state.mallets['1'].x, 170);
  assert.equal(state.mallets['1'].y, 50);

  for (const [len, needed] of [[1, 1], [3, 2], [5, 3], [7, 4]]) {
    const s = initAirHockeyState({ seriesLength: len });
    assert.equal(s.seriesLength, len);
    assert.equal(s.winsNeeded, needed);
  }
});

test('clampMalletPosition strictly constrains mallets to defensive halves and caps velocity', () => {
  // Slot 0 cannot cross center line (x=100) or table bounds
  const c1 = clampMalletPosition(0, { x: 50, y: 50 }, { x: 150, y: 50 });
  assert.ok(c1.x <= 93.0);
  assert.ok(c1.x >= 7.0);

  // Clamped to min rail x=7
  const c2 = clampMalletPosition(0, { x: 10, y: 50 }, { x: -50, y: 50 });
  assert.equal(c2.x, 7.0);

  // Clamped to top rail y=7
  const c3 = clampMalletPosition(0, { x: 50, y: 10 }, { x: 50, y: -20 });
  assert.equal(c3.y, 7.0);

  // Clamped to bottom rail y=93
  const c4 = clampMalletPosition(0, { x: 50, y: 90 }, { x: 50, y: 120 });
  assert.equal(c4.y, 93.0);

  // Slot 1 cannot cross center line into left half
  const c5 = clampMalletPosition(1, { x: 150, y: 50 }, { x: 50, y: 50 });
  assert.ok(c5.x >= 107.0);
  assert.ok(c5.x <= 193.0);

  // Teleport attempt: target far away is speed-capped to MAX_MALLET_SPEED
  const c6 = clampMalletPosition(0, { x: 30, y: 50 }, { x: 90, y: 50 });
  assert.ok(Math.abs(c6.x - (30 + MAX_MALLET_SPEED)) < 1e-4);
  assert.equal(c6.vx, MAX_MALLET_SPEED);
});

test('high-speed puck does not tunnel through rails or mallets', () => {
  // Moving at 20 units/tick towards top rail
  const state = {
    ...initAirHockeyState(),
    state: 'rally',
    serveDelay: 0,
    puck: { x: 100, y: 10, vx: 0, vy: -20, radius: 4 },
  };

  const [bounced] = stepAirHockey(state, {}, 1);
  assert.ok(bounced.puck.y >= 4.0, 'puck stayed inside table boundary');
  assert.ok(bounced.puck.vy > 0.0, 'puck bounced downward off rail');

  // Puck moving towards mallet
  const malletState = {
    ...initAirHockeyState(),
    state: 'rally',
    serveDelay: 0,
    mallets: {
      '0': { x: 30, y: 50, vx: 0, vy: 0, radius: 7 },
      '1': { x: 170, y: 50, vx: 0, vy: 0, radius: 7 },
    },
    puck: { x: 43, y: 50, vx: -15, vy: 0, radius: 4 },
  };

  const players = { 0: { input_state: { x: 38, y: 50 } } };
  const [malletBounced] = stepAirHockey(malletState, players, 1);
  assert.ok(malletBounced.puck.vx > 0.0, 'puck reversed direction off mallet');
  assert.ok(malletBounced.puck.x > 41.0, 'puck separated from mallet');
});

test('puck entering goal mouth awards point and transitions to goal state', () => {
  const state = {
    ...initAirHockeyState(),
    state: 'rally',
    serveDelay: 0,
    puck: { x: 6, y: 50, vx: -10, vy: 0, radius: 4 },
  };

  const [scored, outcome] = stepAirHockey(state, {}, 1);
  assert.equal(outcome, null);
  assert.equal(scored.score['1'], 1);
  assert.equal(scored.score['0'], 0);
  assert.equal(scored.state, 'goal');
  assert.equal(scored.puck.vx, 0);
  assert.equal(scored.puck.vy, 0);
});

test('double-goal fixture: stepping multiple ticks during goal delay does not double-score', () => {
  const state = {
    ...initAirHockeyState(),
    state: 'rally',
    serveDelay: 0,
    puck: { x: 5, y: 50, vx: -8, vy: 0, radius: 4 },
  };

  const [scored1] = stepAirHockey(state, {}, 1);
  assert.equal(scored1.score['1'], 1);
  assert.equal(scored1.state, 'goal');

  // 10 further ticks while in goal state
  const [scored10] = stepAirHockey(scored1, {}, 10);
  assert.equal(scored10.score['1'], 1, 'score does not increment again');
  assert.equal(scored10.score['0'], 0);
  assert.equal(scored10.state, 'goal');
});

test('first-to-seven completes game in best-of-3 series, second win ends series', () => {
  const state = {
    ...initAirHockeyState({ seriesLength: 3 }),
    state: 'rally',
    serveDelay: 0,
    score: { '0': 6, '1': 4 },
    puck: { x: 195, y: 50, vx: 8, vy: 0, radius: 4 },
  };

  const [game1Won, outcome1] = stepAirHockey(state, {}, 1);
  assert.equal(outcome1, null, 'best-of-3 needs 2 wins');
  assert.equal(game1Won.state, 'game_break');
  assert.equal(game1Won.seriesScore['0'], 1);
  assert.equal(game1Won.gamesHistory.length, 1);

  // Game 2 win
  const state2 = {
    ...initAirHockeyState({ seriesLength: 3 }),
    currentGame: 2,
    seriesScore: { '0': 1, '1': 0 },
    state: 'rally',
    serveDelay: 0,
    score: { '0': 6, '1': 2 },
    puck: { x: 195, y: 50, vx: 8, vy: 0, radius: 4 },
  };

  const [seriesWon, outcome2] = stepAirHockey(state2, {}, 1);
  assert.equal(seriesWon.state, 'ended');
  assert.equal(seriesWon.winner, 0);
  assert.equal(seriesWon.seriesScore['0'], 2);
  assert.ok(outcome2);
  assert.equal(outcome2.type, 'match_ended');
  assert.equal(outcome2.winner_slot, 0);
  assert.equal(outcome2.details.series_length, 3);
});

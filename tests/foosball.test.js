import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TABLE_LENGTH,
  TABLE_WIDTH,
  CENTER_X,
  CENTER_Y,
  BALL_RADIUS,
  GOAL_WIDTH,
  GOAL_TOP,
  GOAL_BOTTOM,
  ROD_CONFIGS,
  initFoosballState,
  winsNeededForSeries,
  getRecommendedRod,
  clampRodState,
  stepFoosball,
} from '../shared/foosballModel.js';

test('1. Foosball table dimensions, constants, and rod configurations', () => {
  assert.equal(TABLE_LENGTH, 120.0);
  assert.equal(TABLE_WIDTH, 70.0);
  assert.equal(CENTER_X, 60.0);
  assert.equal(CENTER_Y, 35.0);
  assert.equal(BALL_RADIUS, 2.0);
  assert.equal(GOAL_WIDTH, 20.0);
  assert.equal(GOAL_TOP, 25.0);
  assert.equal(GOAL_BOTTOM, 45.0);

  // Both slots have 4 rods
  assert.equal(ROD_CONFIGS['0'].length, 4);
  assert.equal(ROD_CONFIGS['1'].length, 4);

  // Total 8 rods across the table
  const allRods = [...ROD_CONFIGS['0'], ...ROD_CONFIGS['1']];
  assert.equal(allRods.length, 8);

  // Check rod figures count: 1 + 2 + 5 + 3 = 11 figures per team
  const p0TotalFigs = ROD_CONFIGS['0'].reduce((sum, r) => sum + r.playerCount, 0);
  const p1TotalFigs = ROD_CONFIGS['1'].reduce((sum, r) => sum + r.playerCount, 0);
  assert.equal(p0TotalFigs, 11);
  assert.equal(p1TotalFigs, 11);
});

test('2. Foosball state initialization and series selection', () => {
  assert.equal(winsNeededForSeries(1), 1);
  assert.equal(winsNeededForSeries(3), 2);
  assert.equal(winsNeededForSeries(5), 3);
  assert.equal(winsNeededForSeries(7), 1); // Not in [1, 3, 5], defaults to 1

  const sDefault = initFoosballState();
  assert.equal(sDefault.length, 120);
  assert.equal(sDefault.width, 70);
  assert.equal(sDefault.state, 'serving');
  assert.equal(sDefault.score['0'], 0);
  assert.equal(sDefault.score['1'], 0);
  assert.equal(sDefault.targetScore, 5);
  assert.equal(sDefault.seriesLength, 1);
  assert.equal(sDefault.winsNeeded, 1);

  const sBo3 = initFoosballState({ seriesLength: 3 });
  assert.equal(sBo3.seriesLength, 3);
  assert.equal(sBo3.winsNeeded, 2);
});

test('3. Rod translation clamping and angular velocity bounds (no unrestricted spinning)', () => {
  const currentRod = { y: 35.0, angle: 0.0, vy: 0.0, omega: 0.0 };

  // 1. Translation clamping: Goalie minY=25, maxY=45
  const clampedLow = clampRodState(0, 0, currentRod, { targetY: 5.0 });
  assert.ok(clampedLow.y >= 25.0);

  const clampedHigh = clampRodState(0, 0, currentRod, { targetY: 65.0 });
  assert.ok(clampedHigh.y <= 45.0);

  // 2. Angular speed limit (<= 15 rad/s -> ~0.25 rad/tick)
  const clampedAngle = clampRodState(0, 1, currentRod, { targetAngle: 3.0 });
  assert.ok(Math.abs(clampedAngle.omega) <= (15.0 / 60.0) + 1e-5);
  assert.ok(Math.abs(clampedAngle.angle) <= (15.0 / 60.0) + 1e-5);

  // 3. Prohibit 360-degree continuous spinning: angle clamped to [-0.48*PI, 0.48*PI]
  const extremeSpin = clampRodState(0, 2, { y: 35, angle: 1.5, vy: 0, omega: 0 }, { targetAngle: 100.0 });
  assert.ok(extremeSpin.angle <= Math.PI * 0.48);
  assert.ok(extremeSpin.angle >= -Math.PI * 0.48);
});

test('4. Casual active rod recommendation and advanced manual selection', () => {
  // Slot 0 (attacks right)
  assert.equal(getRecommendedRod(0, 15.0), 0); // Goalie
  assert.equal(getRecommendedRod(0, 35.0), 1); // Defense
  assert.equal(getRecommendedRod(0, 60.0), 2); // Midfield
  assert.equal(getRecommendedRod(0, 85.0), 3); // Attack

  // Slot 1 (attacks left)
  assert.equal(getRecommendedRod(1, 110.0), 0); // Goalie
  assert.equal(getRecommendedRod(1, 85.0), 1);  // Defense
  assert.equal(getRecommendedRod(1, 60.0), 2);  // Midfield
  assert.equal(getRecommendedRod(1, 35.0), 3);  // Attack

  // In stepFoosball with casual mode, active rod tracks ball automatically
  let state = initFoosballState();
  state.state = 'rally';
  state.ball.x = 85.0; // In slot 0's attack zone
  const res = stepFoosball(state, {});
  assert.equal(res.state.activeRod['0'], 3); // Automatically chose attack rod!

  // In advanced mode, explicit selection overrides
  const advRes = stepFoosball(state, {
    '0': { controlMode: 'advanced', selectRod: 1 },
  });
  assert.equal(advRes.state.controlMode['0'], 'advanced');
  assert.equal(advRes.state.activeRod['0'], 1);
});

test('5. Corner ramps, rails, and figure strikes', () => {
  let state = initFoosballState();
  state.state = 'rally';
  state.ball.x = 4.0;
  state.ball.y = 4.0;
  state.ball.vx = -4.0;
  state.ball.vy = -4.0;

  // Corner ramp deflection
  const { state: cornerBounced } = stepFoosball(state, {});
  assert.ok(cornerBounced.ball.vx > 0 || cornerBounced.ball.vy > 0, 'corner ramp deflected ball away from corner');

  // Side rail bounce
  let railState = initFoosballState();
  railState.state = 'rally';
  railState.ball.x = 60.0;
  railState.ball.y = 2.0;
  railState.ball.vx = 0.0;
  railState.ball.vy = -5.0;
  const { state: railBounced, events: railEvents } = stepFoosball(railState, {});
  assert.ok(railBounced.ball.vy > 0, 'bounced off top rail');
  assert.ok(railEvents.some(e => e.type === 'bounce_rail'));

  // Figure strike upon kicking
  let kickState = initFoosballState();
  kickState.state = 'rally';
  kickState.ball.x = 68.0;
  kickState.ball.y = 35.0;
  kickState.ball.vx = 0.0;
  kickState.ball.vy = 0.0;

  const { state: kickedState, events: kickEvents } = stepFoosball(kickState, {
    '0': { controlMode: 'advanced', selectRod: 2, kick: true },
  });
  assert.ok(kickedState.ball.vx > 0, 'figure strike propelled ball forward');
  assert.ok(kickEvents.some(e => e.type === 'strike'));
});

test('6. Goals, double-goal lock, and first-to-five match conclusion', () => {
  // 1. Goal scored for slot 1 (left goal)
  let sGoal1 = initFoosballState();
  sGoal1.state = 'rally';
  sGoal1.ball.x = 2.0;
  sGoal1.ball.y = 35.0;
  sGoal1.ball.vx = -10.0;
  sGoal1.ball.vy = 0.0;

  const { state: postGoal1, events: goal1Events } = stepFoosball(sGoal1, {});
  assert.equal(postGoal1.state, 'goal');
  assert.equal(postGoal1.score['1'], 1);
  assert.equal(postGoal1.score['0'], 0);
  assert.equal(postGoal1.goalDelay, 60);
  assert.ok(goal1Events.some(e => e.type === 'goal' && e.scorer === 1));

  // 2. Double-goal rejection during goal delay
  const { state: postLock } = stepFoosball(postGoal1, {});
  assert.equal(postLock.score['1'], 1, 'score does not increment again during lock');
  assert.equal(postLock.goalDelay, 59);

  // 3. Goal scored for slot 0 (right goal)
  let sGoal0 = initFoosballState();
  sGoal0.state = 'rally';
  sGoal0.ball.x = 118.0;
  sGoal0.ball.y = 35.0;
  sGoal0.ball.vx = 10.0;
  sGoal0.ball.vy = 0.0;

  const { state: postGoal0 } = stepFoosball(sGoal0, {});
  assert.equal(postGoal0.score['0'], 1);
  assert.equal(postGoal0.state, 'goal');

  // 4. First-to-five ends single game match
  let sEnd = initFoosballState({ seriesLength: 1 });
  sEnd.state = 'goal';
  sEnd.goalDelay = 1;
  sEnd.score = { '0': 5, '1': 3 };

  const { state: matchEnded, events: endEvents } = stepFoosball(sEnd, {});
  assert.equal(matchEnded.state, 'ended');
  assert.equal(matchEnded.winner, 0);
  assert.equal(matchEnded.seriesScore['0'], 1);
  assert.ok(endEvents.some(e => e.type === 'match_won' && e.winner === 0));
});

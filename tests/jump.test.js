import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createJumpState, resetJump, stepJump, moveSpeedFor,
  JUMP_TAKEOFF_SPEED, JUMP_GRAVITY, HOP_GAIN, HOP_CAP_RATIO,
} from '../src/jump.js';

const STEP = 1 / 120;
const WALK = 2.8;
const RUN = 5.0;

function drive(state, frames, opts = {}) {
  for (let i = 0; i < frames; i++) {
    stepJump(state, {
      jumpPressed: !!opts.press && i === 0,
      jumpHeld: !!opts.held,
      moving: opts.moving !== false,
      speed: opts.speed ?? RUN,
      cap: RUN * HOP_CAP_RATIO,
    }, STEP);
  }
  return state;
}

test('a pressed jump rises, stays under the analytic apex, and lands at y=0 in ~0.5 s', () => {
  const s = createJumpState();
  stepJump(s, { jumpPressed: true, jumpHeld: false, moving: false, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  assert.ok(s.airborne, 'takeoff leaves the ground');
  assert.equal(s.chain, 1);

  const apex = (JUMP_TAKEOFF_SPEED ** 2) / (2 * JUMP_GRAVITY);
  let airtime = 0;
  while (s.airborne && airtime < 2) {
    stepJump(s, { jumpPressed: false, jumpHeld: false, moving: false, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
    airtime += STEP;
    assert.ok(s.y <= apex + 1e-9, `y ${s.y} exceeded analytic apex ${apex}`);
  }
  assert.ok(!s.airborne, 'landed');
  assert.equal(s.y, 0);
  const expected = (2 * JUMP_TAKEOFF_SPEED) / JUMP_GRAVITY;
  assert.ok(Math.abs(airtime - expected) < 0.02, `airtime ${airtime}s vs expected ${expected}s`);
});

test('a mid-air press cannot trigger a second jump', () => {
  const s = createJumpState();
  stepJump(s, { jumpPressed: true, jumpHeld: false, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  stepJump(s, { jumpPressed: true, jumpHeld: false, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  assert.ok(s.airborne);
  assert.ok(s.vy < JUMP_TAKEOFF_SPEED, 'takeoff velocity was refreshed mid-air');
});

test('holding jump relaunches on the landing frame with no ground pause', () => {
  const s = createJumpState();
  stepJump(s, { jumpPressed: true, jumpHeld: true, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  let groundFrames = 0;
  for (let i = 0; i < 240; i++) { // 2 seconds of chained hopping
    stepJump(s, { jumpPressed: false, jumpHeld: true, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
    if (!s.airborne) groundFrames++;
  }
  assert.equal(groundFrames, 0, 'chain touched the ground between hops');
  assert.ok(s.chain >= 3 && s.chain <= 5, `expected ~4 hops in 2 s, chain was ${s.chain}`);
});

test('momentum is preserved through hops, grows by the gain, and never exceeds the cap', () => {
  const s = createJumpState();
  const cap = RUN * HOP_CAP_RATIO;
  stepJump(s, { jumpPressed: true, jumpHeld: true, moving: true, speed: RUN, cap }, STEP);
  assert.equal(s.hopSpeed, RUN, 'takeoff seeds momentum from the commanded speed');
  const seen = [s.hopSpeed];
  for (let i = 0; i < 600; i++) { // 5 seconds: enough to reach the cap
    stepJump(s, { jumpPressed: false, jumpHeld: true, moving: true, speed: RUN, cap }, STEP);
    seen.push(s.hopSpeed);
  }
  assert.ok(seen.every(v => v <= cap + 1e-9), 'cap was exceeded');
  assert.ok(seen.every((v, i) => i === 0 || v >= seen[i - 1] - 1e-9), 'momentum shrank mid-chain');
  assert.equal(seen[seen.length - 1], cap, 'cap reached and held');
});

test('steering (or stopping input) mid-air never bleeds hopSpeed', () => {
  const s = createJumpState();
  stepJump(s, { jumpPressed: true, jumpHeld: true, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  const before = s.hopSpeed;
  for (const moving of [true, false, true, false]) {
    stepJump(s, { jumpPressed: false, jumpHeld: true, moving, speed: WALK, cap: RUN * HOP_CAP_RATIO }, STEP);
  }
  assert.ok(s.airborne);
  assert.equal(s.hopSpeed, before);
});

test('landing without jump held breaks the chain and clears momentum', () => {
  const s = createJumpState();
  stepJump(s, { jumpPressed: true, jumpHeld: true, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  while (s.airborne) {
    stepJump(s, { jumpPressed: false, jumpHeld: false, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  }
  assert.equal(s.airborne, false);
  assert.equal(s.hopSpeed, 0);
  assert.equal(s.chain, 0);
  drive(s, 10, { moving: false }); // grounded idle keeps it cleared
  assert.equal(s.hopSpeed, 0);
  assert.equal(s.chain, 0);
});

test('grounded frames never carry momentum, pressed or not', () => {
  const s = createJumpState();
  drive(s, 30, { moving: true });
  assert.equal(s.hopSpeed, 0);
  assert.equal(s.airborne, false);
});

test('resetJump snaps a mid-air state back to grounded with no chain', () => {
  const s = createJumpState();
  stepJump(s, { jumpPressed: true, jumpHeld: false, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  stepJump(s, { jumpPressed: false, jumpHeld: false, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  assert.ok(s.airborne && s.y > 0);
  resetJump(s);
  assert.equal(s.airborne, false);
  assert.equal(s.y, 0);
  assert.equal(s.vy, 0);
  assert.equal(s.hopSpeed, 0);
  assert.equal(s.chain, 0);
});

test('moveSpeedFor: airborne momentum overrides the commanded speed; grounded and in-place jumps do not', () => {
  const grounded = createJumpState();
  assert.equal(moveSpeedFor(grounded, WALK), WALK);

  const runHop = createJumpState();
  stepJump(runHop, { jumpPressed: true, jumpHeld: false, moving: true, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  assert.equal(moveSpeedFor(runHop, WALK), RUN, 'run momentum survives even if shift is released mid-air');

  const idleHop = createJumpState();
  stepJump(idleHop, { jumpPressed: true, jumpHeld: false, moving: false, speed: RUN, cap: RUN * HOP_CAP_RATIO }, STEP);
  assert.ok(idleHop.airborne && idleHop.hopSpeed === 0);
  assert.equal(moveSpeedFor(idleHop, WALK), WALK, 'in-place jump steers at the commanded speed');
});

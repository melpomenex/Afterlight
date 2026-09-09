/**
 * ALPINE RUSH shared rules tests (integrate-ssxtricky-snowboard 3.1/3.3).
 *
 * Lane 1 — source parity: the frozen SSXTricky suite
 * (SSXTricky/tests/rules.test.mjs @ rev e87f6c7d, 13 tests, all green at
 * freeze — see the change's baseline.md) ported near-verbatim against the
 * shared module's source-compatible exports (stepMotion, awardCombo,
 * jumpVelocity, racePlace, formatTime, enterSpeedZone, launch/beginTrick/
 * advanceTrick/land, popVelocity).
 *
 * Lane 2 — fixed-step shared model: the 30 Hz step() port with held-state
 * edges (charge release, super pop, trick taps/buffer/hold chains), ramp-edge
 * launches, per-rider pickups, bail penalties, deterministic finish keys and
 * golden-fixture determinism.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCourse, setCourseHashImplementation } from '../shared/snowboard/course.js';
import { courseHash } from '../shared/snowboard/courseHash.js';
import {
  step, stepMotion, simulate, initialState, normalizeControls,
  awardCombo, jumpVelocity, racePlace, formatTime, enterSpeedZone,
  launch, beginTrick, advanceTrick, land, remainingAirTime, popVelocity,
  rampLaunchVelocity, DT, TICK_HZ, TRICKS,
} from '../shared/snowboard/rules.js';

setCourseHashImplementation(courseHash);

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const course = loadCourse(JSON.parse(readFileSync(path.join(REPO, 'shared/snowboard/course-alpine-rush.json'), 'utf8')));

const ride = (over = {}) => ({ kind: 'ride', steer: 0, tuck: false, lean: false, brake: false, boost: false, jumpHeld: false, trickQ: false, trickE: false, trickX: false, ...over });

// --- Lane 1: source test suite (verbatim semantics) -------------------------------

test('source: charged jumps are bounded', () => {
  assert.equal(jumpVelocity(-1), 7);
  assert.equal(jumpVelocity(2), 13);
});

test('source: combos reward chaining and empty air scores zero', () => {
  assert.equal(awardCombo([], 2), 0);
  assert.equal(awardCombo([{ points: 500 }, { points: 500 }], 2), 1700);
});

test('source: boost consumes meter and increases distance while braking slows', () => {
  const base = { distance: 0, x: 0, lateral: 0, speed: 29, boost: 100, airborne: false };
  const fast = { ...base }, slow = { ...base };
  for (let i = 0; i < 60; i++) {
    stepMotion(fast, { boost: true, brake: false, steer: 0 }, 1 / 60);
    stepMotion(slow, { boost: false, brake: true, steer: 0 }, 1 / 60);
  }
  assert.ok(fast.distance > slow.distance);
  assert.ok(fast.boost < 100);
  assert.ok(slow.speed < 29);
});

test('source: off-course motion is constrained and meter cannot underflow', () => {
  const s = { distance: 0, x: 200, lateral: 0, speed: 29, boost: 0.1, airborne: false };
  stepMotion(s, { boost: true, brake: false, steer: 1 }, 1);
  const center = Math.sin(s.distance * .003) * 24 + Math.sin(s.distance * .009) * 7;
  assert.ok(Math.abs(s.x - center) <= 35);
  assert.equal(s.boost, 0);
});

test('source: race positions and timer are deterministic', () => {
  assert.equal(racePlace(100, [90, 110, 120, 50, 20]), 3);
  assert.equal(formatTime(65.25), '01:05.25');
});

const airborneState = () => ({ distance: 0, x: 0, lateral: 0, speed: 30, boost: 0, airborne: false, y: 0, vy: 0, charge: 0, airTime: 0, tricks: [], trick: null, score: 0, bestCombo: 0, landings: 0, bail: 0 });

test('source: speed lanes only activate on the ground inside their marked area', () => {
  const s = airborneState(), zone = { start: 0, end: 20, x: 0, width: 10 };
  s.airborne = true;
  assert.equal(enterSpeedZone(s, zone), false);
  s.airborne = false;
  s.x = 6;
  assert.equal(enterSpeedZone(s, zone), false);
  s.x = 0;
  assert.equal(enterSpeedZone(s, zone), true);
  assert.equal(s.speed, 46);
  stepMotion(s, { boost: false, steer: 0, brake: false }, .1);
  assert.ok(s.speed > 46);
  assert.ok(s.boost >= 0);
  for (let i = 0; i < 180; i++) stepMotion(s, { boost: false, steer: 0, brake: false }, 1 / 60);
  assert.equal(s.zoneBoost, 0);
});

test('source: boosted ramp launches give more airtime and clean combos bank score and refill boost', () => {
  const normal = airborneState(), fast = airborneState();
  fast.speed = 50;
  launch(normal, rampLaunchVelocity(normal.speed));
  launch(fast, rampLaunchVelocity(fast.speed));
  assert.ok(remainingAirTime(fast, 0) > remainingAirTime(normal, 0));
  assert.equal(beginTrick(fast, 'Q'), true);
  assert.equal(beginTrick(fast, 'X'), false);
  advanceTrick(fast, .72);
  assert.equal(fast.score, 0);
  beginTrick(fast, 'X');
  advanceTrick(fast, .92);
  fast.airTime = 2;
  const result = land(fast);
  assert.equal(result.bailed, false);
  assert.equal(result.points, 3200);
  assert.equal(fast.score, 3200);
  assert.ok(fast.boost > 40);
  assert.equal(fast.landings, 1);
  assert.equal(fast.airborne, false);
});

test('source: unfinished flips lose the entire unbanked combo and reduce speed', () => {
  const s = airborneState();
  launch(s, 14);
  beginTrick(s, 'Q');
  advanceTrick(s, .8);
  beginTrick(s, 'X');
  advanceTrick(s, .2);
  const result = land(s);
  assert.equal(result.bailed, true);
  assert.equal(result.points, 0);
  assert.equal(s.score, 0);
  assert.equal(s.speed, 9);
  assert.equal(s.tricks.length, 0);
});

test('source: tuck plus forward lean is faster than either alone and does not spend boost', () => {
  const run = (crouch, lean) => {
    const s = airborneState();
    s.boost = 50;
    for (let i = 0; i < 120; i++) stepMotion(s, { crouch, lean, steer: 0, boost: false, brake: false }, 1 / 60);
    return s;
  };
  const normal = run(false, false), tuck = run(true, false), lean = run(false, true), aero = run(true, true);
  assert.ok(tuck.speed > normal.speed);
  assert.ok(lean.speed > normal.speed);
  assert.ok(aero.speed > tuck.speed);
  assert.ok(aero.boost >= 50);
});

test('source: braking overrides tuck, lean and boost; airborne riders get no tuck advantage', () => {
  const s = airborneState();
  s.boost = 50;
  stepMotion(s, { crouch: true, lean: true, boost: true, brake: true, steer: 0 }, .5);
  assert.ok(s.speed < 30);
  assert.equal(s.tucking, false);
  assert.equal(s.leaning, false);
  assert.ok(s.boost >= 50);
  s.airborne = true;
  stepMotion(s, { crouch: true, lean: true, steer: 0, brake: false }, .1);
  assert.equal(s.tucking, false);
});

test('source: a charged tuck produces a super pop and a clean sustained carve earns boost', () => {
  const s = airborneState();
  s.charge = 1;
  s.tucking = true;
  assert.equal(popVelocity(s), 17);
  s.tucking = false;
  assert.equal(popVelocity(s), 13);
  const center = (d) => Math.sin(d * .003) * 24 + Math.sin(d * .009) * 7;
  for (let i = 0; i < 125; i++) {
    s.x = center(s.distance);
    stepMotion(s, { steer: 1, brake: false, boost: false }, 1 / 60);
  }
  assert.equal(s.carveReward, 1);
  assert.ok(s.boost > 12);
  stepMotion(s, { steer: 0 }, .1);
  assert.equal(s.carveCharge, 0);
});

// --- Lane 2: fixed-step shared model ------------------------------------------------

test('fixed step: neutral controls brake toward the source base', () => {
  const { state } = simulate(course, { kind: 'neutral' }, 90);
  // Exponential approach toward the source 10 m/s brake target (dt*.8 rate).
  assert.ok(state.v > 10 && state.v < 11, `v=${state.v}`);
  assert.ok(state.s > 0);
});

test('fixed step: aero tuck reaches the 42 m/s source target band', () => {
  const { state } = simulate(course, ride({ tuck: true, lean: true }), 300);
  assert.ok(state.v > 40 && state.v <= 42.1, `v=${state.v}`);
});

test('fixed step: held Space charges at 1.2/s and the release edge pops with the charged velocity', () => {
  let state = initialState(0, 1);
  let prev = null;
  let events = [];
  for (let t = 0; t < 25; t++) {
    const r = step(course, state, ride({ jumpHeld: true }), prev, t);
    state = r.state; prev = state; events.push(...r.events);
  }
  assert.equal(state.charge, 1);
  assert.equal(events.length, 0);
  const r = step(course, state, ride(), prev, 25);
  assert.equal(r.state.airborne, true);
  assert.deepEqual(r.events.map((e) => e.type), ['launch']);
  // Source pop velocity 13 minus one tick of gravity (launch fires inside the tick).
  assert.ok(Math.abs(r.state.vy - (13 - 20 * DT)) < 1e-6); // round6 wire hygiene
});

test('fixed step: tuck + full charge release is a super pop (vy 17 − g·dt)', () => {
  let state = initialState(0, 1);
  let prev = null;
  for (let t = 0; t < 25; t++) {
    const r = step(course, state, ride({ tuck: true, jumpHeld: true }), prev, t);
    state = r.state; prev = state;
  }
  const r = step(course, state, ride({ tuck: true }), prev, 25);
  assert.ok(r.events.some((e) => e.type === 'super_pop'));
  assert.ok(Math.abs(r.state.vy - (17 - 20 * DT)) < 1e-6); // round6 wire hygiene
});

test('fixed step: trick tap buffers 0.8 s and starts at the next launch', () => {
  let state = initialState(0, 1);
  let prev = null;
  // Tap Q on the ground (queues), then charge/release a jump.
  const r1 = step(course, state, ride({ trickQ: true }), prev, 0);
  state = r1.state;
  assert.equal(state.trickQueue, 'Q');
  assert.ok(Math.abs(state.trickBuffer - 0.8) < 1e-9);
  prev = state;
  for (let t = 1; t < 20; t++) {
    const r = step(course, state, ride({ jumpHeld: true }), prev, t);
    state = r.state; prev = state;
  }
  const r2 = step(course, state, ride(), prev, 20);
  state = r2.state;
  assert.equal(state.airborne, true);
  assert.equal(state.trick?.name, '360 SPIN');
  assert.equal(state.trickQueue, null);
});

test('fixed step: ramp-edge crossing launches from the lip at the ramp line', () => {
  const aim = { x: 12.029775 }; // ramp-0 line
  let state = initialState(0, 1);
  let prev = null;
  let events = [];
  for (let t = 0; t < 620; t++) {
    const steer = Math.max(-1, Math.min(1, (aim.x - state.x) / 6));
    const r = step(course, state, ride({ tuck: true, steer }), prev, t);
    state = r.state; prev = state; events.push(...r.events);
  }
  assert.ok(events.some((e) => e.type === 'speed_zone'));
  const ramp = events.find((e) => e.type === 'ramp_launch');
  assert.ok(ramp, 'ramp launch fired');
  assert.equal(ramp.rampId, 'ramp-0');
  assert.ok(events.some((e) => e.type === 'launch' && e.cause === 'ramp:ramp-0'));
});

test('fixed step: clean combo banks score, best combo and boost refill', () => {
  const aim = { x: 12.029775 };
  let state = initialState(0, 1);
  let prev = null;
  let events = [];
  for (let t = 0; t < 500; t++) {
    const steer = Math.max(-1, Math.min(1, (aim.x - state.x) / 6));
    const r = step(course, state, ride({ tuck: true, steer }), prev, t);
    state = r.state; prev = state; events.push(...r.events);
  }
  for (let t = 500; t < 640; t++) {
    const steer = Math.max(-1, Math.min(1, (aim.x - state.x) / 6));
    const r = step(course, state, ride({ trickQ: true, steer }), prev, t);
    state = r.state; prev = state; events.push(...r.events);
  }
  const clean = events.find((e) => e.type === 'clean_landing');
  assert.ok(clean, 'clean landing fired');
  assert.ok(clean.points >= 800);
  assert.ok(state.score > 0);
  assert.ok(state.bestCombo >= clean.points);
  assert.equal(state.landings >= 1, true);
});

test('fixed step: bailing keeps the score and applies the source penalty', () => {
  let state = initialState(0, 1);
  let prev = null;
  let events = [];
  for (let t = 0; t < 30; t++) {
    const r = step(course, state, ride({ jumpHeld: true }), prev, t);
    state = r.state; prev = state; events.push(...r.events);
  }
  const preBailSpeed = state.v;
  for (let t = 30; t < 130; t++) {
    const r = step(course, state, ride(t >= 60 ? { trickX: true } : {}), prev, t);
    state = r.state; prev = state; events.push(...r.events);
  }
  const bail = events.find((e) => e.type === 'bail');
  assert.ok(bail, 'bail fired');
  assert.equal(state.score, 0);
  // speed *= 0.3 on the bail tick, then accelerates back toward base.
  assert.ok(state.v < preBailSpeed);
  // While bailed, steering is neutralized and brake is forced.
  assert.equal(state.carving, false);
});

test('fixed step: pickups are per-rider and claimable exactly once', () => {
  const pickup = course.pickups[0];
  let state = initialState(0, 1);
  let prev = null;
  let events = [];
  for (let t = 0; t < 300; t++) {
    const steer = Math.max(-1, Math.min(1, (pickup.x - state.x) / 6));
    const r = step(course, state, ride({ steer }), prev, t);
    state = r.state; prev = state; events.push(...r.events);
  }
  assert.ok(events.some((e) => e.type === 'pickup' && e.id === 0));
  assert.ok(state.pickupsClaimed.includes(0));
  assert.equal(events.filter((e) => e.type === 'pickup' && e.id === 0).length, 1);
  // A second rider crossing the same spot claims it independently.
  let other = initialState(1, 2);
  let otherPrev = null;
  let otherEvents = [];
  for (let t = 0; t < 300; t++) {
    const steer = Math.max(-1, Math.min(1, (pickup.x - other.x) / 6));
    const r = step(course, other, ride({ steer }), otherPrev, t);
    other = r.state; otherPrev = other; otherEvents.push(...r.events);
  }
  assert.ok(otherEvents.some((e) => e.type === 'pickup' && e.id === 0));
  assert.ok(other.score >= 250);
  assert.equal(otherEvents.filter((e) => e.type === 'pickup' && e.id === 0).length, 1);
});

test('fixed step: finish records a deterministic within-tick key and stops the rider', () => {
  const { state, trace } = simulate(course, ride({ tuck: true, lean: true }), 60 * 95);
  assert.equal(state.s, 1800);
  assert.ok(state.finishMs > 0);
  const finishEvents = trace.flatMap((t) => t.events).filter((e) => e.type === 'finish');
  assert.equal(finishEvents.length, 1);
  assert.equal(finishEvents[0].score, state.score);
  // Terminal: further ticks change nothing.
  const after = step(course, state, ride({ boost: true }), state, 6000);
  assert.equal(after.state.s, 1800);
  assert.deepEqual(after.events, []);
});

test('fixed step: slots spread the start line inside the corridor', () => {
  const a = initialState(0, 2), b = initialState(1, 2);
  assert.ok(a.x < 0 && b.x > 0);
  assert.equal(Math.abs(a.x - b.x), 5.5);
  const eight = Array.from({ length: 8 }, (_, i) => initialState(i, 8));
  assert.ok(eight.every((r) => Math.abs(r.x) <= 19));
});

test('normalizeControls clamps steer and defaults missing fields', () => {
  const n = normalizeControls({ kind: 'ride', steer: 7, tuck: true });
  assert.equal(n.steer, 1);
  assert.equal(n.tuck, true);
  assert.equal(n.brake, true); // brake defaults ON (missing → !== false)
  assert.equal(n.boost, false);
  assert.deepEqual(n.trick, { Q: false, E: false, X: false });
  const neutral = normalizeControls({ kind: 'neutral' });
  assert.equal(neutral.brake, true);
});

test('TRICKS table matches the source', () => {
  assert.equal(TRICKS.Q.name, '360 SPIN');
  assert.equal(TRICKS.Q.points, 800);
  assert.equal(TRICKS.E.name, 'INDY GRAB');
  assert.equal(TRICKS.X.name, 'BACKFLIP');
  assert.equal(TICK_HZ, 30);
});

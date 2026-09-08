/**
 * Summit Run rules tests (add-multiplayer-snowboard-arcade 3.2).
 *
 * The fixed-step kinematics must reproduce every D5 mechanic: grade
 * acceleration with tuck/brake, damped carve with shoulder penalty, boundary
 * clamp with a single cooldown-gated speed loss, charge/release jumps with
 * neutralization cancelling (never launching), ramp lip launches, normal-
 * speed landing with crash recovery, and the exact evaluation order. Golden
 * movement fixtures pin these outcomes for Elixir parity (4.1).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCourse } from '../shared/snowboard/course.js';
import {
  DT,
  RECOVERY_TICKS,
  TUNING,
  applyGates,
  findObstacleHit,
  initialState,
  normalizeControls,
  pickRecoveryPoint,
  step,
  simulate,
  worldPosition,
} from '../shared/snowboard/rules.js';
import { generateGoldenFixtures, checkGolden } from '../scripts/export-snowboard-golden.mjs';

const committedCourse = JSON.parse(
  readFileSync(new URL('../shared/snowboard/course-summit-night.json', import.meta.url), 'utf8'),
);
const course = loadCourse(committedCourse);
const golden = JSON.parse(
  readFileSync(new URL('../tests/fixtures/snowboard/golden-movement.json', import.meta.url).pathname, 'utf8'),
);

const RIDE = Object.freeze({ steer: 0, tuck: false, brake: false, jumpHeld: false });
const TUCK = Object.freeze({ steer: 0, tuck: true, brake: false, jumpHeld: false });
const NEUTRAL = Object.freeze({ kind: 'neutral' });

test('golden fixtures match regeneration and the committed course hash', async () => {
  const generated = generateGoldenFixtures();
  assert.equal(generated.courseHash, committedCourse.hash, 'goldens were generated from the current course');
  assert.equal(generated.scenarios.length, golden.scenarios.length);
  assert.deepEqual(generated.scenarios.map(s => s.final), golden.scenarios.map(s => s.final),
    'committed golden states match regeneration');
  await checkGolden();
});

test('initial state spreads slots laterally and starts at contract speed', () => {
  const solo = initialState(0, 1);
  assert.equal(solo.s, 0);
  assert.equal(solo.v, TUNING.startSpeed);
  assert.equal(solo.grounded, true);
  assert.equal(solo.nextCheckpoint, 1);

  const field = [0, 1, 2, 3, 4, 5, 6, 7].map((slot) => initialState(slot, 8));
  const positions = new Set(field.map((state) => state.u));
  assert.equal(positions.size, 8, 'eight riders get eight distinct start lanes');
  for (const state of field) {
    assert.ok(Math.abs(state.u) <= 12, 'start lanes stay inside the groomed bowl');
  }
});

test('normalizeControls: neutral brakes, steer clamps, unknown fields map safe', () => {
  assert.deepEqual(normalizeControls(NEUTRAL), { steer: 0, tuck: false, brake: true, jumpHeld: false });
  assert.deepEqual(normalizeControls(undefined), { steer: 0, tuck: false, brake: true, jumpHeld: false });
  const clamped = normalizeControls({ steer: 7, tuck: true, brake: false, jumpHeld: true });
  assert.equal(clamped.steer, 1);
  assert.equal(clamped.tuck, true);
  assert.equal(clamped.brake, false);
  assert.equal(clamped.jumpHeld, true);
});

test('movement: braking stops the rider; tuck beats cruise; v stays within [0, 45]', () => {
  const glided = simulate(course, NEUTRAL, 90).state;
  assert.equal(glided.v, 0, 'neutral brakes to a stop');

  const tuck = simulate(course, TUCK, 180).state;
  const cruise = simulate(course, RIDE, 180).state;
  assert.ok(tuck.s > cruise.s, 'tuck covers more ground than cruise');

  const wild = simulate(course, TUCK, 3600).state;
  assert.ok(wild.v <= TUNING.speedMax + 1e-9);
  assert.ok(wild.v >= TUNING.speedMin);
});

test('boundary: u clamps at ±24, speed loss applies once per cooldown window', () => {
  const { state, trace } = simulate(course, { steer: 1, tuck: false, brake: false, jumpHeld: false }, 200);
  assert.equal(state.u, TUNING.corridorHalfWidth, 'rider clamps to the legal corridor');
  const hits = trace.flatMap((t) => t.events).filter((e) => e.type === 'boundary_hit');
  assert.ok(hits.length >= 2, 'grinding the wall repeats hits');
  const hitTicks = trace.filter((t) => t.events.some((e) => e.type === 'boundary_hit')).map((t) => t.tick);
  for (let i = 1; i < hitTicks.length; i++) {
    assert.ok(hitTicks[i] - hitTicks[i - 1] >= Math.round(TUNING.boundaryCooldownSeconds / DT) - 1,
      'hits respect the 0.5s cooldown');
  }
});

test('jump: charging caps at 1, release launches with charge bonus, lands snapped', () => {
  let state = simulate(course, RIDE, 30).state;
  let sawCharge = 0;
  for (let tick = 0; tick < 15; tick++) {
    const result = step(course, state, { steer: 0, tuck: false, brake: false, jumpHeld: true });
    state = result.state;
    sawCharge = Math.max(sawCharge, state.jumpCharge);
    assert.equal(state.grounded, true, 'charging alone never leaves the ground');
  }
  assert.ok(sawCharge > 0.4 && sawCharge <= 1, `charge builds (${sawCharge})`);

  const released = step(course, state, RIDE);
  const launchEvent = released.events.find((e) => e.type === 'launch');
  assert.ok(launchEvent, 'release launches');
  assert.equal(released.state.grounded, false);
  assert.ok(released.state.vy > TUNING.jumpBase, 'launch carries the charge bonus');
  assert.equal(released.state.jumpCharge, 0);

  // Land: keep riding in the air until grounded again; y snaps to surface.
  let landed = released.state;
  for (let tick = 0; tick < 120 && !landed.grounded; tick++) {
    landed = step(course, landed, RIDE).state;
  }
  assert.equal(landed.grounded, true, 'rider lands');
  const groundY = course.heightAt(landed.s, landed.u) + TUNING.boardClearance;
  assert.ok(Math.abs(landed.y - groundY) < 1e-6, 'landing snaps to the sampled surface');
});

test('neutralization cancels the charge and never launches', () => {
  let state = simulate(course, RIDE, 30).state;
  for (let tick = 0; tick < 15; tick++) {
    state = step(course, state, { steer: 0, tuck: false, brake: false, jumpHeld: true }).state;
  }
  assert.ok(state.jumpCharge > 0);

  const result = step(course, state, NEUTRAL);
  assert.equal(result.state.jumpCharge, 0, 'charge cancelled');
  assert.equal(result.state.grounded, true, 'no launch happened');
  assert.ok(result.events.some((e) => e.type === 'charge_cancelled'));
});

test('ramp: lip crossing launches once with a speed boost and never repeats', () => {
  // Fast-forward to just before the pine-cut jump, then cross it.
  let state = simulate(course, TUCK, 830).state;
  assert.ok(state.s >= 780, `rider approaches the ramp (s=${state.s})`);
  const boosts = [];
  for (let tick = 0; tick < 120; tick++) {
    const result = step(course, state, TUCK);
    state = result.state;
    for (const event of result.events) {
      if (event.type === 'launch' && String(event.cause).startsWith('ramp:')) boosts.push(event.cause);
      if (event.type === 'landing') boosts.push('landing');
    }
  }
  assert.equal(boosts.filter((c) => c === 'ramp:pine-cut-jump').length, 1, 'lip boost fires exactly once');
  assert.ok(boosts.includes('landing'), 'rider lands after the jump');
  assert.ok(state.crossedRampIds.includes('pine-cut-jump'));
});

test('landing: flat hard landings crash into bounded recovery at a safe point', () => {
  // Drop the rider from a synthetic height far above the surface.
  let state = { ...initialState(0, 1), s: 300, u: 0, grounded: false, y: course.heightAt(300, 0) + 40, vy: -60 };
  let crashEvent = null;
  for (let tick = 0; tick < 120 && !crashEvent; tick++) {
    const result = step(course, state, RIDE);
    state = result.state;
    crashEvent = result.events.find((e) => e.type === 'crash') ?? crashEvent;
  }
  assert.ok(crashEvent, 'extreme impact crashes');
  assert.equal(state.recoveryTicks, RECOVERY_TICKS, 'recovery lasts the contract tick count');
  assert.equal(state.v, TUNING.crashResetSpeed);
  assert.equal(state.resetSeq, 1, 'resetSeq increments for interpolation resets');

  // Recovery freezes motion entirely.
  const frozen = step(course, state, TUCK);
  assert.equal(frozen.state.s, state.s, 'no motion during recovery');
  assert.equal(frozen.state.v, state.v, 'no acceleration during recovery');

  // After recovery the rider rides on, inside the corridor.
  let after = frozen.state;
  for (let tick = 0; tick < RECOVERY_TICKS; tick++) after = step(course, after, TUCK).state;
  assert.equal(after.recoveryTicks, 0);
  assert.ok(Math.abs(after.u) <= TUNING.corridorHalfWidth);
});

test('pickRecoveryPoint never places a rider beyond an unearned gate', () => {
  // Rider who earned only the first gate (nextCheckpoint=2) cannot be
  // dropped anywhere at or past gate 2 (400m).
  const state = { ...initialState(0, 1), s: 380, nextCheckpoint: 2 };
  const point = pickRecoveryPoint(course, state);
  assert.ok(point.s < 400, `recovery s=${point.s} stays before the unearned gate`);
  assert.ok(point.s <= state.s, 'recovery sits behind the crash site');

  // A rider mid-field with no gates earned resets near the start.
  const fresh = pickRecoveryPoint(course, { ...initialState(0, 1), s: 190 });
  assert.ok(fresh.s < 200);
});

test('shoulder: riding outside the groomed bowl bleeds extra speed', () => {
  // Two riders, same line: one drifts into the shoulder, one stays groomed.
  const groomed = simulate(course, TUCK, 120).state;
  const shoulder = simulate(course, { steer: 0.72, tuck: false, brake: false, jumpHeld: false }, 120).state;
  assert.ok(Math.abs(shoulder.u) > TUNING.groomedHalfWidth, 'drifter reaches the shoulder');
  assert.ok(shoulder.v < groomed.v * 0.9, `shoulder drag bites (shoulder ${shoulder.v} vs groomed ${groomed.v})`);
});

test('worldPosition: x follows centerline + u, z = -s, y rides the sampled surface', () => {
  const state = simulate(course, TUCK, 60).state;
  const pos = worldPosition(course, state);
  assert.ok(Math.abs(pos.x - (course.centerXAt(state.s) + state.u)) < 1e-9);
  assert.ok(Math.abs(pos.z + state.s) < 1e-9);
  assert.ok(Math.abs(pos.y - (course.heightAt(state.s, state.u) + TUNING.boardClearance)) < 1e-9);
});

test('determinism: identical runs agree bit-for-bit', () => {
  const a = simulate(course, TUCK, 300).state;
  const b = simulate(course, TUCK, 300).state;
  assert.deepEqual(a, b);
});

// --- 3.3: swept obstacles, ordered gates, finish keys ---------------------------

test('gates credit in order; several crossings may land in one tick', () => {
  const state = { ...initialState(0, 1), s: 0, u: 0, v: 30 };
  const next = { ...state, s: 610 };
  const events = [];
  applyGates(course, next, state, 610, 0, 100, events);
  assert.deepEqual(events.map((e) => `${e.type}#${e.index}`), ['checkpoint#1', 'checkpoint#2', 'checkpoint#3']);
  assert.equal(next.nextCheckpoint, 4);
  assert.equal(next.splitKeys.length, 3);
  // Split keys are exact monotonic tick-derived values, ordered in time.
  assert.ok(next.splitKeys[0] < next.splitKeys[1] && next.splitKeys[1] < next.splitKeys[2]);
});

test('the finish requires every checkpoint: a teleported rider cannot claim it', () => {
  const state = { ...initialState(0, 1), s: 1780, u: 0, nextCheckpoint: 1 };
  const next = { ...state, s: 1810 };
  const events = [];
  applyGates(course, next, state, 1810, 0, 5000, events);
  assert.equal(next.finishTick, null, 'no finish without the eight checkpoints');
  assert.ok(!events.some((e) => e.type === 'finish'));
  assert.equal(next.nextCheckpoint, 1, 'no gate credits either — planes were never swept');
});

test('finish keys sort by within-tick crossing fraction (same tick, different riders)', () => {
  const make = (prevS, s) => {
    const state = { ...initialState(0, 1), s: prevS, u: 0, nextCheckpoint: 9 };
    const next = { ...state, s };
    const events = [];
    applyGates(course, next, state, s, 0, 1800, events);
    return next;
  };
  const early = make(1799.5, 1801.5); // enters the tick closest: crosses at fraction 0.25
  const late = make(1798.5, 1801.0);  // crosses later in the tick (fraction 0.6)
  assert.ok(early.finishTick === 1800 && late.finishTick === 1800);
  assert.ok(early.finishKey < late.finishKey, 'fraction orders same-tick finishes');
  assert.ok(Math.abs(early.finishMs - Math.round(early.finishKey)) <= 1, 'display ms derives from the key');
});

test('swept obstacles: a max-speed rider cannot tunnel through a rock', () => {
  // Rock ob-16 sits at (480, 6). Sweep a 45 m/s rider straight through it.
  const state = { ...initialState(0, 1), s: 478, u: 6, v: TUNING.speedMax, grounded: true, y: course.heightAt(478, 6) + TUNING.boardClearance };
  const prev = { ...state, s: 476.5 };
  const result = step(course, state, RIDE, prev, 500);
  const crashEvent = result.events.find((e) => e.type === 'crash');
  assert.ok(crashEvent, 'one 1.5m tick cannot skip the expanded collider');
  assert.match(crashEvent.cause, /obstacle:ob-/);
  assert.equal(result.state.recoveryTicks, RECOVERY_TICKS);
});

test('crash recovery never re-credits or skips gates (golden scenario)', () => {
  const scenario = golden.scenarios.find((s) => s.id === 'crash-rock-recovery');
  assert.ok(scenario, 'crash-rock-recovery fixture exists');
  const checkpoints = scenario.events.filter((e) => e.type === 'checkpoint').map((e) => e.index);
  assert.deepEqual(checkpoints, [1, 2], 'gates 1–2 credited before the crash; the teleport earns nothing');
  assert.equal(scenario.final.resetSeq, 1);
  assert.equal(scenario.final.nextCheckpoint, 3, 'earned progress is kept, never duplicated');
  const crashEvent = scenario.events.find((e) => e.type === 'crash');
  const recovery = scenario.events.find((e) => e.type === 'recovery_complete');
  assert.ok(recovery && crashEvent && recovery.tick === crashEvent.tick + RECOVERY_TICKS,
    'recovery lasts exactly RECOVERY_TICKS');
});

test('terminal riders evaluate no further gates', () => {
  const finished = { ...initialState(0, 1), s: 100, nextCheckpoint: 9, finishTick: 100, finishKey: 3333 };
  const events = [];
  applyGates(course, finished, { ...finished, s: 98 }, 102, 0, 101, events);
  assert.deepEqual(events, [], 'a finished rider earns nothing more');

  const dnf = { ...initialState(0, 1), s: 100, dnfReason: 'disconnect' };
  const dnfEvents = [];
  applyGates(course, dnf, { ...dnf, s: 98 }, 102, 0, 101, dnfEvents);
  assert.deepEqual(dnfEvents, [], 'a DNF rider earns nothing more');
});

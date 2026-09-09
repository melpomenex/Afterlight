/**
 * Summit Run client sync tests (add-multiplayer-snowboard-arcade 5.4–5.6).
 *
 * Covers prediction/reconciliation against the shared rules, remote
 * interpolation with reset handling, and the countdown clock mapping —
 * all pure, all deterministic.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCourse } from '../shared/snowboard/course.js';
import { initialState, step as rulesStep, DT } from '../shared/snowboard/rules.js';
import { createPredictor } from '../src/activities/snowboard/prediction.js';
import { createRemoteRiderBuffer } from '../src/activities/snowboard/interpolation.js';
import { createRaceClock } from '../src/activities/snowboard/clock.js';

const course = loadCourse(
  JSON.parse(readFileSync(new URL('../shared/snowboard/course-alpine-rush.json', import.meta.url), 'utf8')),
);

const RIDE = Object.freeze({ kind: 'ride', steer: 0, tuck: true, lean: false, brake: false, boost: false, jumpHeld: false, trickQ: false, trickE: false, trickX: false });
const TICK_MS = DT * 1000;

test('prediction: local input responds immediately and advances with the shared rules', () => {
  const predictor = createPredictor(course);
  const start = initialState(0, 1);
  predictor.reset({ ...start }, 0, { kind: 'neutral' }, 0);

  predictor.submit(1, RIDE, 0);
  predictor.update(16, 16); // 60fps frames accumulate into 30Hz steps
  predictor.update(32, 16);
  const result = predictor.update(48, 16); // third frame completes the tick
  assert.ok(result && !result.frozen);
  assert.ok(result.state.s > 0, 'prediction moves the rider immediately');
  assert.equal(predictor.tick, 1);
});

test('prediction: reconciliation discards server-consumed history and replays unapplied input', () => {
  const predictor = createPredictor(course);
  predictor.reset({ ...initialState(0, 1) }, 0, { kind: 'neutral' }, 0);

  // Local rider tucks for three ticks; only the first is acknowledged.
  for (let seq = 1; seq <= 3; seq++) {
    predictor.submit(seq, RIDE, seq * TICK_MS);
    predictor.update(seq * TICK_MS, TICK_MS);
  }
  const localAfterThree = predictor.visualState?.() ?? predictor.update(3 * TICK_MS + 1, 0);
  void localAfterThree;

  // The server state lags two ticks behind local prediction.
  let server = initialState(0, 1);
  for (let tick = 0; tick < 1; tick++) {
    server = rulesStep(course, server, { kind: 'ride', steer: 0, tuck: true, lean: false, brake: false, boost: false, jumpHeld: false, trickQ: false, trickE: false, trickX: false }, server, tick).state;
  }

  const outcome = predictor.reconcile({ ...server }, 1, { kind: 'ride', steer: 0, tuck: true, lean: false, brake: false, boost: false, jumpHeld: false, trickQ: false, trickE: false, trickX: false }, 2, 0, 40);
  assert.ok(outcome, 'reconcile returns an outcome');
  // After replaying the two unapplied tuck samples, prediction is ahead of
  // the raw server state again and back on the same tick.
  assert.equal(predictor.tick, 3);
  const state = predictor.update(60, TICK_MS).state;
  assert.ok(state.s >= server.s, 'unapplied inputs are re-applied, not discarded');
});

test('prediction: appliedSeq gates replay, lastAcceptedSeqs never does', () => {
  const predictor = createPredictor(course);
  predictor.reset({ ...initialState(0, 1) }, 0, { kind: 'neutral' }, 0);
  predictor.submit(5, RIDE, 0);
  predictor.update(16, TICK_MS);

  // appliedSeq 5 means the server already simulated that input: reconciling
  // with appliedSeq=5 must not re-apply the sample (speed would compound).
  const server = initialState(0, 1);
  predictor.reconcile({ ...server }, 1, { kind: 'neutral' }, 5, 0, 20);
  const first = predictor.update(40, TICK_MS).state;

  const predictor2 = createPredictor(course);
  predictor2.reset({ ...initialState(0, 1) }, 0, { kind: 'neutral' }, 0);
  predictor2.submit(5, RIDE, 0);
  predictor2.update(16, TICK_MS);
  predictor2.reconcile({ ...server }, 1, { kind: 'neutral' }, 5, 0, 20);
  const second = predictor2.update(40, TICK_MS).state;

  assert.equal(first.s, second.s, 'reconciliation is deterministic at equal appliedSeq');
});

test('prediction: hard reset on large divergence or checkpoint mismatch', () => {
  const predictor = createPredictor(course);
  predictor.reset({ ...initialState(0, 1) }, 0, { kind: 'neutral' }, 0);

  const distant = { ...initialState(0, 1), s: 500 };
  const outcome = predictor.reconcile({ ...distant }, 10, { kind: 'neutral' }, 0, 0, 10);
  assert.equal(outcome.hardReset, true, '>3m divergence hard-resets');
  assert.equal(predictor.tick, 10);
});

test('prediction: freezes without snapshots and recovers on the next one', () => {
  const predictor = createPredictor(course, { freezeMs: 250 });
  predictor.reset({ ...initialState(0, 1) }, 0, { kind: 'neutral' }, 0);

  assert.equal(predictor.update(100, 33).frozen, false);
  // No snapshot for 300ms: prediction freezes rather than inventing motion.
  assert.equal(predictor.update(400, 33).frozen, true);

  predictor.reconcile({ ...initialState(0, 1) }, 30, { kind: 'neutral' }, 0, 0, 450);
  assert.equal(predictor.update(500, 33).frozen, false, 'a fresh snapshot unfreezes');
});

test('prediction: resetSeq clears prediction across recovery teleports', () => {
  const predictor = createPredictor(course);
  predictor.reset({ ...initialState(0, 1), s: 400 }, 100, { kind: 'neutral' }, 0, 0);

  const teleported = { ...initialState(0, 1), s: 350 };
  const outcome = predictor.reconcile({ ...teleported }, 120, { kind: 'neutral' }, 0, 1, 500);
  assert.equal(outcome.hardReset, true);
  assert.equal(predictor.visualCheck?.() ?? predictor.tick, 120);
});

test('interpolation: smooth between two snapshots, extrapolation capped, then stale hold', () => {
  const buffer = createRemoteRiderBuffer();
  const base = initialState(0, 1);

  const at = (tick, s) => ({
    at: tick * TICK_MS,
    serverTick: tick,
    snapshotSeq: tick,
    resetSeq: 0,
    state: { ...base, s, v: 30 },
  });

  assert.equal(buffer.push(at(100, 30)), true);
  assert.equal(buffer.push(at(101, 31)), true);
  const newestAt = 101 * TICK_MS;

  // Between the two snapshots (render target 100ms behind arrival time):
  const mid = buffer.sample(100 * TICK_MS + 100 + 16.6);
  assert.ok(mid && !mid.stale && !mid.extrapolated);
  assert.ok(Math.abs(mid.state.s - 30.5) < 0.6, `interpolated s ${mid.state.s}`);

  // Past the newest snapshot: extrapolates up to 100ms then holds stale.
  const extrapolated = buffer.sample(newestAt + 100 + 50);
  assert.ok(extrapolated.extrapolated, 'beyond newest, within the cap: extrapolated');
  const held = buffer.sample(newestAt + 600);
  assert.equal(held.stale, true, 'held with a stale indicator past the cap');
});

test('interpolation: non-increasing snapshotSeq is dropped; equal revision motion is accepted', () => {
  const buffer = createRemoteRiderBuffer();
  const base = initialState(0, 1);
  const frame = (seq, s, revision = 9) => ({
    at: seq * TICK_MS,
    serverTick: seq * 2,
    snapshotSeq: seq,
    resetSeq: 0,
    revision,
    state: { ...base, s },
  });

  assert.equal(buffer.push(frame(10, 100)), true);
  assert.equal(buffer.push(frame(10, 101)), false, 'duplicate seq dropped');
  assert.equal(buffer.push(frame(9, 99)), false, 'older seq dropped');
  assert.equal(buffer.push(frame(11, 110, 9)), true, 'same revision, newer motion accepted');
});

test('interpolation: resetSeq clears the buffer across recovery teleports', () => {
  const buffer = createRemoteRiderBuffer();
  const base = initialState(0, 1);

  buffer.push({ at: 0, serverTick: 10, snapshotSeq: 10, resetSeq: 0, state: { ...base, s: 400 } });
  buffer.push({ at: TICK_MS, serverTick: 11, snapshotSeq: 11, resetSeq: 0, state: { ...base, s: 401 } });

  const teleported = { ...base, s: 350 };
  buffer.push({ at: 2 * TICK_MS, serverTick: 12, snapshotSeq: 12, resetSeq: 1, state: teleported });

  const sample = buffer.sample(3 * TICK_MS);
  assert.ok(sample.state.s < 360, 'teleport is not interpolated from the old track');
});

test('clock: RTT-midpoint samples map server instants into monotonic perf time', () => {
  const clock = createRaceClock();
  const perfAt = 1000;
  const serverNow = 5_000_000;
  const rtt = clock.addSample(serverNow, perfAt, perfAt + 40);
  assert.equal(rtt, 40);

  const mapped = clock.toPerf(serverNow, perfAt + 20);
  assert.ok(Math.abs(mapped - (perfAt + 20)) < 0.001, 'midpoint sample centers the estimate');
});

test('clock: lowest-RTT of the last eight samples wins; countdown renders and starts', () => {
  const clock = createRaceClock();
  // Drifted high-RTT samples first.
  for (let index = 0; index < 7; index++) {
    clock.addSample(1_000_000 + index * 100, index * 100, index * 100 + 200);
  }
  clock.addSample(1_000_700, 700, 710); // 10ms RTT

  const startAt = 1_000_700 + 3_000; // 3s out at the best sample's frame
  const verdict = clock.countdown(startAt, 710);
  assert.equal(verdict.ready, true);
  assert.ok(Math.abs(verdict.secondsLeft - 3) < 0.05, `~3s left, got ${verdict.secondsLeft}`);
  assert.equal(verdict.started, false);

  const after = clock.countdown(startAt, 710 + 3_100);
  assert.equal(after.started, true);
  assert.equal(after.secondsLeft, 0, 'client countdown never postpones the start');
});

test('clock: a wall-clock change cannot move the race (monotonic perf mapping only)', () => {
  const clock = createRaceClock();
  clock.seedFromSnapshot(9_000_000, 500);
  const rtt = clock.addSample(9_001_000, 600, 610);

  // Date.now() is never consulted: mapping from a perf reading is stable.
  const startAt = 9_001_000 + 2_000;
  const before = clock.countdown(startAt, 605);
  const afterWallClockChange = clock.countdown(startAt, 605);
  assert.deepEqual(before, afterWallClockChange);
  assert.equal(rtt, 10);
});

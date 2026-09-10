import test from 'node:test';
import assert from 'node:assert/strict';

import { generateCourseDocument, loadCourse } from '../shared/downhill/course.js';
import { initialRiderState, stepRider, neutralControls, DT } from '../shared/downhill/rules.js';
import { createPredictor } from '../src/activities/downhill/prediction.js';
import { createRemoteInterpolator } from '../src/activities/downhill/interpolation.js';
import { createRaceClock } from '../src/activities/downhill/clock.js';

function freshRider() {
  const course = loadCourse(generateCourseDocument({ mountain: 'classic' }));
  course.colliderBuckets.clear();
  const r = initialRiderState(0, { difficulty: 'mayhem', isAI: false });
  r.y = course.heightAt(r.s, r.lat);
  return { course, r };
}

test('prediction replays the shared rules exactly', () => {
  const { course, r } = freshRider();
  const predictor = createPredictor(course);
  predictor.reset(r, 0, neutralControls(), 0, 0);

  const control = { steer: 0.2, pedal: true, brake: false, boost: false, hop: false, punch: false, kick: false, trick: null };
  predictor.submit(1, control);

  // Direct reference: the same rider stepped with the same controls.
  const ref = { ...r, def: { ...r.def }, pendingNames: [...r.pendingNames], inp: { ...r.inp } };
  const N = 90;
  for (let i = 0; i < N; i++) {
    ref.inp = { pedal: 1, brake: 0, steer: 0.2, hop: false, boost: false, punch: false, kick: false, trick: null };
    stepRider(course, ref, DT, { finishS: course.finishS, elapsed: i * DT }, []);
    predictor.update(i * DT * 1000, DT * 1000);
  }
  const p = predictor.state;
  assert.ok(Math.abs(p.s - ref.s) < 1e-9, `s ${p.s} vs ${ref.s}`);
  assert.ok(Math.abs(p.lat - ref.lat) < 1e-9);
  assert.ok(Math.abs(p.vs - ref.vs) < 1e-9);
  assert.equal(predictor.tick, N);
});

test('reconcile snaps large divergence and smooths small corrections', () => {
  const { course, r } = freshRider();
  const predictor = createPredictor(course);
  predictor.reset(r, 0, neutralControls(), 0, 0);
  predictor.submit(1, { steer: 0, pedal: true });
  for (let i = 0; i < 30; i++) predictor.update(i * DT * 1000, DT * 1000);

  const predicted = predictor.state;

  // Large divergence: hard reset.
  const far = { ...predicted, s: predicted.s + 5 };
  const big = predictor.reconcile(far, 30, neutralControls(), 1, 0);
  assert.equal(big.hardReset, true);
  assert.ok(Math.abs(predictor.state.s - far.s) < 1e-9);

  // Small divergence: corrected, not reset; the render pose decays to server.
  predictor.reset(predicted, 30, neutralControls(), 1, 0);
  for (let i = 0; i < 5; i++) predictor.update((30 + i) * DT * 1000, DT * 1000);
  const before = predictor.state;
  const near = { ...before, s: before.s + 0.1 };
  const small = predictor.reconcile(near, 35, neutralControls(), 1, 0);
  assert.equal(small.hardReset, false);
  const visual = predictor.visualState(0);
  assert.ok(Math.abs(visual.s - before.s) < 1e-9, 'render starts near the old prediction');
  predictor.visualState(200);
  assert.ok(Math.abs(predictor.visualState(0).s - near.s) < 1e-6, 'render converges to the server');
});

test('prediction freezes when no steps are needed', () => {
  const { course, r } = freshRider();
  const predictor = createPredictor(course);
  predictor.reset(r, 0, neutralControls(), 0, 0);
  predictor.submit(1, { steer: 0, pedal: true });
  predictor.update(0, 0);
  const later = predictor.update(300, 0);
  assert.equal(later.frozen, true);
});

test('remote interpolation blends between bracketing snapshots', () => {
  const interp = createRemoteInterpolator();
  assert.equal(interp.push({ serverTick: 10, riders: { '1': { s: 100, lat: 0, vs: 10, crashed: false, grounded: true } } }), true);
  assert.equal(interp.push({ serverTick: 12, riders: { '1': { s: 120, lat: 2, vs: 20, crashed: false, grounded: true } } }), true);
  // Out-of-order ticks are dropped.
  assert.equal(interp.push({ serverTick: 11, riders: { '1': { s: 110, lat: 1, vs: 15 } } }), false);

  const mid = interp.sample(11);
  assert.ok(Math.abs(mid.riders['1'].s - 110) < 1e-9);
  assert.ok(Math.abs(mid.riders['1'].vs - 15) < 1e-9);
  assert.equal(mid.riders['1'].crashed, false);
});

test('interpolation clears history on a reset sequence change', () => {
  const interp = createRemoteInterpolator();
  interp.push({ serverTick: 1, riders: { '1': { s: 10, lat: 0 } }, resetSeqs: { '1': 0 } });
  interp.push({ serverTick: 2, riders: { '1': { s: 20, lat: 0 } }, resetSeqs: { '1': 0 } });
  assert.equal(interp.bufferedCount, 2);
  interp.push({ serverTick: 3, riders: { '1': { s: 5, lat: 0 } }, resetSeqs: { '1': 1 } });
  assert.equal(interp.bufferedCount, 1, 'teleport clears the buffer');
});

test('race clock uses the lowest-RTT sample and maps countdowns', () => {
  const clock = createRaceClock();
  clock.addSample(1000, 0, 200);   // rtt 200
  clock.addSample(1000, 100, 120); // rtt 20 (best)
  assert.equal(clock.sampleCount, 2);
  const mapped = clock.toPerf(5000, 120);
  assert.ok(mapped && mapped.perfMs > 0);
  assert.equal(mapped.syncing, false);
  const cd = clock.countdown(5000, 0);
  assert.equal(cd.ready, false);
  assert.ok(cd.remainingMs > 0);
});

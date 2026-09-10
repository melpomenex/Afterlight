import test from 'node:test';
import assert from 'node:assert/strict';

import { generateCourseDocument, loadCourse, mulberry32 } from '../shared/downhill/course.js';
import { initialRiderState, stepField, neutralControls, DT } from '../shared/downhill/rules.js';
import { aiControl } from '../shared/downhill/ai.js';

// integrate-multiplayer-downhill-mayhem-arcade 3.2/3.4: a full six-rider field
// (one human + five server AI) must be deterministic, finite and make forward
// progress using only the injected rng.

function buildField(difficulty = 'mayhem', seed = 4242) {
  const course = loadCourse(generateCourseDocument({ mountain: 'classic' }));
  const riders = [];
  for (let slot = 0; slot < 6; slot++) {
    const r = initialRiderState(slot, { difficulty, isAI: slot > 0, seed });
    r.y = course.heightAt(r.s, r.lat);
    riders.push(r);
  }
  return { course, riders };
}

function runRace(ticks, { difficulty = 'mayhem', seed = 4242 } = {}) {
  const { course, riders } = buildField(difficulty, seed);
  const rng = mulberry32((seed ^ 0xabcd) >>> 0);
  const controlsBySlot = { 0: { ...neutralControls(), pedal: 1, steer: 0.1 } };
  const allEvents = [];
  for (let i = 0; i < ticks; i++) {
    const ctx = {
      riders, difficulty, elapsed: i * DT, dt: DT,
      reference: riders[0], rng, events: [],
      state: { lastPunchOnHumanAt: -99 }, stats: { aiKick: 0, aiPunch: 0 },
      aiControl,
    };
    const events = stepField(course, riders, controlsBySlot, ctx);
    allEvents.push(...events);
  }
  return { course, riders, allEvents };
}

test('six-rider field simulation is deterministic and finite', () => {
  const a = runRace(300);
  const b = runRace(300);
  assert.equal(
    JSON.stringify(a.riders.map((r) => ({ s: r.s, lat: r.lat, y: r.y, vs: r.vs, meter: r.meter }))),
    JSON.stringify(b.riders.map((r) => ({ s: r.s, lat: r.lat, y: r.y, vs: r.vs, meter: r.meter }))),
    'same seed and inputs produce the same race',
  );
  for (const r of a.riders) {
    assert.ok(Number.isFinite(r.s) && Number.isFinite(r.lat) && Number.isFinite(r.y) && Number.isFinite(r.vs));
  }
});

test('AI riders make forward progress and stay in corridor', () => {
  const { riders } = runRace(900);
  for (const r of riders) {
    assert.ok(r.s > 100, `rider ${r.slot} progressed (s=${r.s.toFixed(1)})`);
    assert.ok(Math.abs(r.lat) <= 27.5 + 1e-6, `rider ${r.slot} inside the valley wall`);
  }
  // The human with constant pedal also progresses.
  assert.ok(riders[0].s > 100);
});

test('aiControl returns a well-formed control object', () => {
  const { course, riders } = buildField('brutal');
  const ctx = {
    riders, difficulty: 'brutal', elapsed: 12, dt: DT, reference: riders[0],
    rng: mulberry32(7), events: [], state: { lastPunchOnHumanAt: -99 }, stats: {},
  };
  const c = aiControl(course, riders[1], ctx);
  assert.equal(typeof c.pedal, 'number');
  assert.equal(typeof c.brake, 'number');
  assert.ok(c.steer >= -1 && c.steer <= 1);
  assert.equal(typeof c.boost, 'boolean');
  assert.equal(c.punch, false);
  assert.equal(c.trick, null);
});

test('revenge hunting activates after a human decks an AI', () => {
  const { course, riders } = buildField('mayhem');
  const human = riders[0], ai = riders[1];
  // Put the AI just ahead and in reach, then strike.
  ai.s = human.s + 1.0; ai.lat = human.lat; ai.y = human.y;
  human.punchCd = 0;
  const events = [];
  human.inp = { ...neutralControls(), punch: true };
  // applyControl is exercised through stepField; drive a single tick.
  const rng = mulberry32(11);
  stepField(course, riders, { 0: { ...neutralControls(), punch: true } }, {
    riders, difficulty: 'mayhem', elapsed: 0, dt: DT, reference: human, rng, events,
    state: { lastPunchOnHumanAt: -99 }, stats: {}, aiControl,
  });
  assert.ok(ai.crashed || events.some((e) => e.type === 'crash' && e.slot === ai.slot), 'strike landed on the AI');
  assert.equal(ai.grudge, true, 'decked AI holds a grudge');
  assert.ok(ai.revengeT > 0, 'revenge timer armed');
});

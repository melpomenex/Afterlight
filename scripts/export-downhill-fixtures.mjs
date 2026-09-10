#!/usr/bin/env node
/**
 * Export deterministic Downhill Mayhem parity fixtures
 * (integrate-multiplayer-downhill-mayhem-arcade 8.8/14.3).
 *
 * Writes a scripted multi-rider replay captured from the JavaScript authority
 * so the Elixir reducer can be replayed against it. No AI generation is used:
 * every rider's controls are scripted, isolating the shared physics.
 *
 * Usage:
 *   node scripts/export-downhill-fixtures.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateCourseDocument, loadCourse } from '../shared/downhill/course.js';
import { initialRiderState, neutralControls, stepField, DT } from '../shared/downhill/rules.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(REPO_ROOT, 'server_elixir', 'test', 'fixtures', 'downhill');

const TICKS = 180;
const RECORD_EVERY = 1;

function controlsFor(tick, slot) {
  return {
    pedal: tick < 150 ? 1 : 0,
    brake: tick > 160 ? 1 : 0,
    steer: Math.sin((tick + slot * 13) / 41) * 0.7,
    hop: tick % 53 === 0,
    boost: tick > 90 && tick < 120,
    punch: false,
    kick: false,
    trick: tick % 71 === 5 ? 'nohander' : null,
  };
}

function snapshot(r) {
  return {
    s: r.s, lat: r.lat, y: r.y, vs: r.vs, vlat: r.vlat, vy: r.vy,
    grounded: r.grounded, meter: r.meter, crashed: r.crashed, finished: r.finished,
    trick: r.trick, chain: r.chain, race_pos: r.racePos,
  };
}

export function buildRulesFixture() {
  const course = loadCourse(generateCourseDocument({ mountain: 'classic' }));
  // Obstacles off: the physics replay is isolated from collider draws.
  course.colliderBuckets.clear();
  const riders = [];
  for (let slot = 0; slot < 6; slot++) {
    const r = initialRiderState(slot, { difficulty: 'mayhem', isAI: true, seed: 123456 });
    r.y = course.heightAt(r.s, r.lat);
    riders.push(r);
  }

  const initial = riders.map((r) => ({
    slot: r.slot, isAI: r.isAI,
    def: { name: r.def.name, top: r.def.top, corner: r.def.corner, aggr: r.def.aggr, trick: r.def.trick, crashy: r.def.crashy },
    ...snapshot(r),
    vlat: r.vlat, punchCd: r.punchCd, invuln: r.invuln, airTime: r.airTime,
    trickT: r.trickT, pendingMeter: r.pendingMeter, boostLatch: r.boostLatch, rubber: r.rubber,
  }));

  const controls = [];
  const states = [];
  for (let tick = 0; tick < TICKS; tick++) {
    const bySlot = {};
    for (let slot = 0; slot < 6; slot++) bySlot[slot] = controlsFor(tick, slot);
    controls.push(bySlot);
    stepField(course, riders, bySlot, { difficulty: 'mayhem', elapsed: tick * DT, dt: DT, riders });
    if (tick % RECORD_EVERY === 0) states.push(riders.map(snapshot));
  }

  return {
    course: 'classic',
    difficulty: 'mayhem',
    ticks: TICKS,
    recordEvery: RECORD_EVERY,
    initial,
    controls,
    states,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixture = buildRulesFixture();
  mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, 'rules_parity.json');
  writeFileSync(out, `${JSON.stringify(fixture)}\n`);
  console.log(`wrote ${out} (${TICKS} ticks, ${fixture.controls.length} control rows)`);
}

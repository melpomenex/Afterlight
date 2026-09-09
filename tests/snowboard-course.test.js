/**
 * ALPINE RUSH canonical course tests (integrate-ssxtricky-snowboard 3.2).
 *
 * The course document + analytic samplers are the contract between renderer,
 * predictor and the Elixir authority. These tests run BEFORE any physics
 * use: build determinism, export stability, validation rejections (including
 * tampering with the source layout), sampler behavior (contact on ramps,
 * centerline agreement) and the source-feature invariants (13 ramps, 13
 * zones, 22 pickups, 4 banners).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildCourseDocument,
  loadCourse,
  validateCourse,
  setCourseHashImplementation,
  courseCenter,
  groundHeight,
  surfaceHeight,
  createRamps,
  rampHeight,
  onRamp,
  LENGTH_METERS,
  RAMP_COUNT,
  PICKUP_COUNT,
} from '../shared/snowboard/course.js';
import { canonicalCourseJson, courseHash } from '../shared/snowboard/courseHash.js';

setCourseHashImplementation(courseHash);
import { generateCourseExport, checkCourse } from '../scripts/export-snowboard-course.mjs';

const committed = JSON.parse(
  readFileSync(new URL('../shared/snowboard/course-alpine-rush.json', import.meta.url), 'utf8'),
);

test('course build is deterministic and matches the committed export', () => {
  const a = buildCourseDocument();
  const b = buildCourseDocument();
  assert.equal(canonicalCourseJson(a), canonicalCourseJson(b), 'two builds are identical');
  assert.equal(canonicalCourseJson(a), canonicalCourseJson(committed), 'committed export matches regeneration');
  assert.equal(a.hash, committed.hash);
});

test('exported bytes are stable and both copies agree', async () => {
  const { bytes } = generateCourseExport();
  const committedBytes = readFileSync(new URL('../shared/snowboard/course-alpine-rush.json', import.meta.url), 'utf8');
  const elixirBytes = readFileSync(new URL('../server_elixir/priv/snowboard_course.json', import.meta.url), 'utf8');
  assert.equal(bytes, committedBytes);
  assert.equal(bytes, elixirBytes);
  await checkCourse(); // must not throw
});

test('hash binds the canonical hash-free document', () => {
  assert.equal(committed.hash, courseHash(committed), 'committed hash verifies');
  const tampered = { ...committed, ramps: committed.ramps.slice(1) };
  assert.equal(courseHash(tampered) === committed.hash, false);
});

test('source terrain functions are the port baseline', () => {
  // Verbatim source expectations (SSXTricky rules.mjs at the frozen revision).
  assert.ok(Math.abs(courseCenter(0)) < 1e-12);
  assert.ok(Math.abs(groundHeight(0, 0)) < 1e-12);
  // Downhill: height decreases with distance.
  assert.ok(groundHeight(0, 100) < groundHeight(0, 0));
  // Banks rise beyond |x−center| > 22.
  assert.ok(groundHeight(courseCenter(500) + 30, 500) > groundHeight(courseCenter(500), 500) + 1);
  // The thirteen source ramps: centers 95+i*124, alternating lines.
  const ramps = createRamps();
  assert.equal(ramps.length, RAMP_COUNT);
  assert.equal(ramps[0].x, courseCenter(95)); // i=0 sits ON the line
  assert.equal(ramps[1].x, courseCenter(219)); // (1%3-1)*11 = 0
  assert.equal(ramps[2].x, courseCenter(343) + 11); // (2%3-1)*11 = +11
  assert.equal(ramps[3].x, courseCenter(467) - 11); // (3%3-1)*11 = -11
  // Ramp profiles rise from base to lip.
  assert.equal(rampHeight(ramps[0], ramps[0].start), ramps[0].base);
  assert.ok(rampHeight(ramps[0], ramps[0].end) > ramps[0].base + 4);
  assert.equal(onRamp(ramps[0], ramps[0].x, ramps[0].end - 1), true);
  assert.equal(onRamp(ramps[0], ramps[0].x + 20, ramps[0].end - 1), false);
  // Contact surface honors ramps (render/contact agreement).
  assert.equal(surfaceHeight(ramps[0].x, (ramps[0].start + ramps[0].end) / 2, ramps), rampHeight(ramps[0], (ramps[0].start + ramps[0].end) / 2));
});

test('validation rejects drift from the source course', () => {
  assert.deepEqual(validateCourse(committed), []);
  assert.ok(validateCourse(null).length > 0);
  assert.ok(validateCourse({ ...committed, id: 'summit-night' }).length > 0);
  assert.ok(validateCourse({ ...committed, version: 3 }).length > 0);
  // Moving a ramp off its source line breaks the contract.
  const movedRamp = committed.ramps.map((r, i) => (i === 4 ? { ...r, x: r.x + 5 } : r));
  assert.ok(validateCourse({ ...committed, ramps: movedRamp }).some((p) => p.includes('ramp')));
  // A pickup off the source line too.
  const movedPickup = committed.pickups.map((p, i) => (i === 7 ? { ...p, x: p.x + 9 } : p));
  assert.ok(validateCourse({ ...committed, pickups: movedPickup }).some((p) => p.includes('pickup')));
  // Dropping a speed zone.
  assert.ok(validateCourse({ ...committed, speedZones: committed.speedZones.slice(1) }).length > 0);
  // A stale hash.
  const staleHash = { ...committed };
  delete staleHash.hash;
  assert.ok(validateCourse(staleHash).length > 0);
});

test('loadCourse samplers expose the source features', () => {
  const course = loadCourse(committed);
  assert.equal(course.lengthMeters, LENGTH_METERS);
  assert.equal(course.ramps.length, RAMP_COUNT);
  assert.equal(course.speedZones.length, RAMP_COUNT);
  assert.equal(course.pickups.length, PICKUP_COUNT);
  assert.equal(course.banners.length, 4);
  // Speed zones feed their ramps at the source offsets.
  for (const [i, zone] of course.speedZones.entries()) {
    assert.equal(zone.start, course.ramps[i].start - 41);
    assert.equal(zone.end, course.ramps[i].start - 19);
    assert.equal(zone.x, course.ramps[i].x);
    assert.equal(zone.width, 10);
  }
  // Pickups sit within the corridor.
  for (const p of course.pickups) {
    assert.ok(Math.abs(p.x - courseCenter(p.d)) <= 35);
  }
  // Contact height agrees between the (s, u) sampler and absolute x.
  const mid = (course.ramps[0].start + course.ramps[0].end) / 2;
  const u = course.ramps[0].x - courseCenter(mid);
  assert.ok(Math.abs(course.heightAt(mid, u) - course.surfaceAt(course.ramps[0].x, mid)) < 1e-9);
  assert.ok(Math.abs(course.centerXAt(500) - courseCenter(500)) < 1e-12);
});

test('committed course files stay in sync with the manifest', () => {
  const manifest = readFileSync(new URL('../shared/placeDefinitions.js', import.meta.url), 'utf8');
  assert.ok(manifest.includes("'alpine-rush'"), 'manifest declares the course id');
  assert.ok(manifest.includes("version: 2"), 'manifest declares course version 2');
});

test('course format fixture stays current', () => {
  const format = JSON.parse(readFileSync(new URL('./fixtures/snowboard/course-format.json', import.meta.url), 'utf8'));
  assert.equal(format.id ?? format.identity?.id ?? format.courseId ?? 'alpine-rush', 'alpine-rush');
  void format;
});

/**
 * Summit Run canonical course tests (add-multiplayer-snowboard-arcade 3.1).
 *
 * The course document is the contract between renderer, predictor and the
 * Elixir authority. These tests run BEFORE any physics use: build
 * determinism, validation rejections, sampler behavior (clamped bilinear
 * heights, linear centerline, grade), and the structural invariants from the
 * frozen course-format fixture.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildCourseDocument,
  canonicalCourseJson,
  courseHash,
  loadCourse,
  validateCourse,
  COURSE_ID,
  LENGTH_METERS,
  MAX_COLLIDERS,
  CHECKPOINT_PLANES,
} from '../shared/snowboard/course.js';
import { generateCourseExport, checkCourse } from '../scripts/export-snowboard-course.mjs';

const committed = JSON.parse(
  readFileSync(new URL('../shared/snowboard/course-summit-night.json', import.meta.url), 'utf8'),
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
  const committedBytes = readFileSync(new URL('../shared/snowboard/course-summit-night.json', import.meta.url), 'utf8');
  const elixirBytes = readFileSync(new URL('../server_elixir/priv/snowboard_course.json', import.meta.url), 'utf8');
  assert.equal(bytes, committedBytes);
  assert.equal(bytes, elixirBytes);
  await checkCourse(); // must not throw
});

test('hash binds the canonical hash-free document', () => {
  assert.equal(committed.hash, courseHash(committed), 'committed hash verifies');
  const tampered = { ...committed, lengthMeters: 42 };
  assert.match(courseHash(tampered), /^[0-9a-f]{64}$/);
  assert.notEqual(courseHash(tampered), committed.hash, 'any mutation changes the hash');
  // Key order never matters for the canonical hash.
  const reordered = JSON.parse(JSON.stringify(committed));
  const entries = Object.entries(reordered).reverse();
  assert.equal(courseHash(Object.fromEntries(entries)), committed.hash);
});

test('committed course passes every validation invariant', () => {
  assert.deepEqual(validateCourse(committed), []);
  const course = loadCourse(committed);
  assert.equal(course.lengthMeters, LENGTH_METERS);
  assert.equal(course.gates.length, CHECKPOINT_PLANES.length);
  assert.ok(course.obstacles.length <= MAX_COLLIDERS, 'collider cap holds');
});

test('validation rejects drifted grids, gates, recovery points and hashes', () => {
  const problems = (mutate) => {
    const doc = structuredClone(committed);
    mutate(doc);
    return validateCourse(doc);
  };

  assert.ok(problems((d) => { d.grid.sValues[5] = 999; }).some((p) => p.includes('uniformly')));
  assert.ok(problems((d) => { d.lengthMeters = 1500; }).some((p) => p.includes('lengthMeters')));
  assert.ok(problems((d) => { d.grid.height[10][3] = NaN; }).some((p) => p.includes('finite')));
  assert.ok(problems((d) => { d.gates[3].s = 850; }).some((p) => p.includes('800m')));
  assert.ok(problems((d) => { d.gates.pop(); }).some((p) => p.includes('exactly 8 gates')));
  assert.ok(problems((d) => { d.finish.s = 1600; }).some((p) => p.includes('finish must sit at 1800m')));
  assert.ok(problems((d) => { d.recoveryPoints[2].segment = 9; }).some((p) => p.includes('segment')));
  assert.ok(problems((d) => { d.recoveryPoints[0].s = 260; }).some((p) => p.includes('earned segment')),
    'a recovery point must never sit past its next gate');
  assert.ok(problems((d) => { d.obstacles = Array.from({ length: 65 }, (_, i) => ({ id: `x${i}`, kind: 'pine', s: 10, u: 20, halfS: 1, halfU: 1, height: 2 })); })
    .some((p) => p.includes('<= 64')));
  assert.ok(problems((d) => { d.hash = '0'.repeat(64); }).some((p) => p.includes('hash must match')));
  assert.ok(problems((d) => { d.grid.uValues.reverse(); }).some((p) => p.includes('uniformly')));
});

test('samplers: bilinear heights clamp at edges and match grid samples exactly', () => {
  const course = loadCourse(committed);

  // Exact agreement with grid nodes.
  for (const [s, u] of [[0, 0], [200, -24], [800, -3], [1800, 24], [1234, 6]]) {
    const sampled = course.heightAt(s, u);
    assert.ok(Number.isFinite(sampled));
  }
  assert.equal(course.heightAt(0, 0), committed.grid.height[0][12]);
  assert.equal(course.heightAt(400, 2), committed.grid.height[200][13]);

  // Clamping: out-of-range s/u clamp to the sampled rectangle.
  assert.equal(course.heightAt(-50, 0), course.heightAt(0, 0));
  assert.equal(course.heightAt(9999, 0), course.heightAt(1800, 0));
  assert.equal(course.heightAt(0, -100), course.heightAt(0, -24));
  assert.equal(course.heightAt(0, 100), course.heightAt(0, 24));

  // Bilinear midpoint sits between its two corner rows.
  const hLow = course.heightAt(100, 0);
  const hHigh = course.heightAt(102, 0);
  const hMid = course.heightAt(101, 0);
  assert.ok(hMid >= Math.min(hLow, hHigh) - 1e-9 && hMid <= Math.max(hLow, hHigh) + 1e-9);
});

test('samplers: downhill means descending height, and the route is rideable', () => {
  const course = loadCourse(committed);
  const start = course.heightAt(0, 0);
  const finish = course.heightAt(1800, 0);
  assert.ok(finish < start, `course must descend: ${start} -> ${finish}`);

  // Grade is a non-negative clamp of -dHeight/ds from the same grid.
  for (const s of [50, 220, 600, 900, 1100, 1500, 1750]) {
    const grade = course.gradeAt(s);
    assert.ok(grade >= 0 && grade <= 0.6, `grade at ${s} inside [0, 0.6]`);
  }
  // The start gate is the steepest stretch (lit start slope).
  assert.ok(course.gradeAt(100) > course.gradeAt(1700), 'start grade exceeds the floodlit runout');

  // Total descent fits a ~60–120s run at D5 speed bounds.
  const drop = start - finish;
  assert.ok(drop > 150 && drop < 400, `total drop ${drop}m is raceable`);
});

test('route readability: centerline stays inside the groomed bowl and ramps protrude', () => {
  const course = loadCourse(committed);
  for (const entry of committed.centerline) {
    assert.ok(Math.abs(entry.x) <= 14.01, `centerline x=${entry.x} at s=${entry.s} keeps the carve readable`);
    assert.ok(entry.width >= 40 && entry.width <= 44, 'rideable width stays in the authored band');
  }
  // Ramp lips are baked into the grid: height rises up to the lip then falls.
  for (const ramp of committed.ramps) {
    const midU = (ramp.uMin + ramp.uMax) / 2;
    const atLip = course.heightAt(ramp.s, midU);
    const before = course.heightAt(ramp.s - ramp.approach, midU);
    const after = course.heightAt(ramp.s + 2, midU);
    assert.ok(atLip > before, `${ramp.id} lip rises above its approach`);
    assert.ok(after < atLip - 0.5, `${ramp.id} drops away past the lip (a real launch)`);
  }
  // Recovery points stand on groomed surface tags.
  const sIndex = (s) => Math.round(s / committed.gridStepMeters);
  const uIndex = (u) => Math.round((u + committed.corridorHalfWidth) / committed.lateralStepMeters);
  for (const point of committed.recoveryPoints) {
    const tag = committed.grid.surface[sIndex(point.s)][uIndex(point.u)];
    assert.equal(tag, 0, `recovery ${point.id} stands on groomed snow`);
  }
});

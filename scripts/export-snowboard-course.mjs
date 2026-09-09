#!/usr/bin/env node
/**
 * Export the Summit Run canonical course — ALPINE RUSH
 * (integrate-ssxtricky-snowboard 3.2). Builds the deterministic analytic
 * course document with shared/snowboard/course.js (ported from the frozen
 * SSXTricky source rev e87f6c7d), validates it, and writes the SAME bytes to:
 *
 *   - shared/snowboard/course-alpine-rush.json    (browser + Node import)
 *   - server_elixir/priv/snowboard_course.json    (Elixir authority)
 *
 * Both copies must stay byte-identical to a regeneration; `--check` fails on
 * drift the same way export-place-definitions.mjs does. The document carries
 * its own sha256 over the canonical hash-free form, which the Elixir loader
 * recomputes before first physics use.
 *
 * Usage:
 *   node scripts/export-snowboard-course.mjs           # (re)write both files
 *   node scripts/export-snowboard-course.mjs --check   # verify committed bytes
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCourseDocument, validateCourse, loadCourse, setCourseHashImplementation } from '../shared/snowboard/course.js';
import { canonicalCourseJson, courseHash as _ch } from '../shared/snowboard/courseHash.js';

setCourseHashImplementation(_ch);

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHARED_PATH = path.join(REPO_ROOT, 'shared', 'snowboard', 'course-alpine-rush.json');
const ELIXIR_PATH = path.join(REPO_ROOT, 'server_elixir', 'priv', 'snowboard_course.json');
const PARITY_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'snowboard', 'course-parity.json');

/**
 * Deterministic JS-sampler parity points for the ANALYTIC course: ground
 * heights (absolute x), contact heights on ramps, centerline samples, ramp
 * bases and clamp extremes. The Elixir loader must reproduce every value
 * within 1e-9 (same IEEE arithmetic order), which is the admission gate for
 * reducer parity (3.4).
 */
export function buildParityPoints(doc) {
  const course = loadCourse(doc);
  const points = [];
  const push = (kind, s, u, value) => points.push({ kind, s, u, expected: value });

  for (const [s, u] of [[0, 0], [200, -24], [600, 12], [800, -3], [1200, 6], [1799, 24], [555, -17], [1234, 3]]) {
    push('height', s, u, course.heightAt(s, u));
  }
  for (const s of [0, 100, 400, 800, 1234, 1700, 1800]) {
    push('center_x', s, 0, course.centerXAt(s));
  }
  // Contact on each ramp: mid-ramp surface above the lip line.
  doc.ramps.forEach((ramp, i) => {
    const mid = (ramp.start + ramp.end) / 2;
    push('ramp_contact', mid, ramp.x - course.centerXAt(mid), course.surfaceAt(ramp.x, mid));
    void i;
  });
  push('ground_off_center', 500, 30, course.surfaceAt(course.centerXAt(500) + 30, 500));
  push('far_bank', 900, 34, course.surfaceAt(course.centerXAt(900) + 34, 900));

  return { courseId: doc.id, courseVersion: doc.version, courseHash: doc.hash, points };
}

/**
 * Pure entry point (importable by tests): generates the canonical document
 * and returns { doc, bytes } without touching the filesystem.
 */
export function generateCourseExport() {
  const doc = buildCourseDocument();
  const problems = validateCourse(doc);
  if (problems.length > 0) {
    throw new Error(`generated course fails validation: ${problems.join('; ')}`);
  }
  const bytes = `${JSON.stringify(doc, null, 0)}\n`;
  // Canonical invariants hold for the serialized bytes too.
  if (canonicalCourseJson(doc).length === 0) throw new Error('canonical form vanished');
  return { doc, bytes };
}

export async function exportCourse({ sharedPath = SHARED_PATH, elixirPath = ELIXIR_PATH, parityPath = PARITY_PATH } = {}) {
  const { doc, bytes } = generateCourseExport();
  await mkdir(path.dirname(elixirPath), { recursive: true });
  await mkdir(path.dirname(parityPath), { recursive: true });
  await writeFile(sharedPath, bytes);
  await writeFile(elixirPath, bytes);
  await writeFile(parityPath, `${JSON.stringify(buildParityPoints(doc), null, 1)}\n`);
  return bytes;
}

export async function checkCourse({ sharedPath = SHARED_PATH, elixirPath = ELIXIR_PATH } = {}) {
  const { bytes } = generateCourseExport();
  const [shared, elixir] = await Promise.all([
    readFile(sharedPath, 'utf8').catch(() => null),
    readFile(elixirPath, 'utf8').catch(() => null),
  ]);
  if (shared !== bytes) throw new Error(`drift: ${path.relative(REPO_ROOT, sharedPath)} — rerun node scripts/export-snowboard-course.mjs`);
  if (elixir !== bytes) throw new Error(`drift: ${path.relative(REPO_ROOT, elixirPath)} — rerun node scripts/export-snowboard-course.mjs`);
  return true;
}

function parseArgs(argv) {
  return { check: argv.includes('--check') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { check } = parseArgs(process.argv.slice(2));
  try {
    if (check) {
      await checkCourse();
      console.log('snowboard course export is up to date (shared + elixir copies)');
    } else {
      const { doc } = generateCourseExport();
      await exportCourse();
      console.log(`exported course ${doc.id} v${doc.version} hash ${doc.hash.slice(0, 12)}… (${doc.ramps.length} ramps, ${doc.speedZones.length} speed zones, ${doc.pickups.length} pickups)`);
    }
  } catch (error) {
    console.error(`snowboard course export error: ${error.message}`);
    process.exitCode = 1;
  }
}

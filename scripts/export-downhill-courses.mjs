#!/usr/bin/env node
/**
 * Export the baked canonical Downhill Mayhem course documents
 * (integrate-multiplayer-downhill-mayhem-arcade 4.2).
 *
 * The single editable generator lives in shared/downhill/course.js. Its output
 * is committed twice, byte-identical: the browser copy in
 * shared/downhill/courses/ and the Elixir copy in
 * server_elixir/priv/downhill_courses/. `--check` regenerates and fails when
 * either committed file drifts, so the two runtimes can never race a different
 * mountain.
 *
 * Usage:
 *   node scripts/export-downhill-courses.mjs           # (re)write both copies
 *   node scripts/export-downhill-courses.mjs --check   # verify committed bytes
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateCourseDocument, MOUNTAINS } from '../shared/downhill/course.js';
import { courseHash } from '../shared/downhill/courseHash.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_DIR = path.join(REPO_ROOT, 'shared', 'downhill', 'courses');
const SERVER_DIR = path.join(REPO_ROOT, 'server_elixir', 'priv', 'downhill_courses');

const MOUNTAIN_IDS = Object.keys(MOUNTAINS);

/** Deterministic single-line serialization with a trailing newline. */
export function serializeCourse(doc) {
  return `${JSON.stringify(doc)}\n`;
}

export function buildCourseBytes(mountainId) {
  const doc = generateCourseDocument({ mountain: mountainId });
  doc.hash = courseHash(doc);
  return serializeCourse(doc);
}

async function writeBytes(file, bytes) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

export async function exportCourses() {
  for (const id of MOUNTAIN_IDS) {
    const bytes = buildCourseBytes(id);
    await writeBytes(path.join(WEB_DIR, `${id}.json`), bytes);
    await writeBytes(path.join(SERVER_DIR, `${id}.json`), bytes);
    console.log(`exported downhill course ${id} (${bytes.length} bytes)`);
  }
}

export async function checkCourses() {
  const problems = [];
  for (const id of MOUNTAIN_IDS) {
    const expected = buildCourseBytes(id);
    for (const [label, file] of [
      ['web', path.join(WEB_DIR, `${id}.json`)],
      ['server', path.join(SERVER_DIR, `${id}.json`)],
    ]) {
      let committed;
      try {
        committed = await readFile(file, 'utf8');
      } catch {
        problems.push(`${label} course ${id} is missing — run: node scripts/export-downhill-courses.mjs`);
        continue;
      }
      if (committed !== expected) problems.push(`${label} course ${id} drifted from shared/downhill/course.js`);
    }
  }
  if (problems.length > 0) throw new Error(problems.join('\n'));
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  try {
    if (check) {
      await checkCourses();
      console.log('downhill course documents are up to date');
    } else {
      await exportCourses();
    }
  } catch (error) {
    console.error(`downhill course export error: ${error.message}`);
    process.exitCode = 1;
  }
}

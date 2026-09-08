#!/usr/bin/env node
/**
 * Export golden movement fixtures (add-multiplayer-snowboard-arcade 3.2/3.3).
 *
 * Deterministic fixed-step runs of shared/snowboard/rules.js over the
 * canonical course are serialized to tests/fixtures/snowboard/golden-
 * movement.json. The Elixir authority (4.1) must reproduce every recorded
 * state within the D10 tolerances (≤1cm position, 0.01 m/s velocity, exact
 * gate/finish outcomes) — these vectors are the parity admission gate.
 * `--check` fails when the committed file drifts.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCourse } from '../shared/snowboard/course.js';
import { initialState, step, DT } from '../shared/snowboard/rules.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'snowboard', 'golden-movement.json');
const COURSE_PATH = path.join(REPO_ROOT, 'shared', 'snowboard', 'course-summit-night.json');

const NEUTRAL = Object.freeze({ kind: 'neutral' });
const TUCK = Object.freeze({ steer: 0, tuck: true, brake: false, jumpHeld: false });
const CARVE = Object.freeze({ steer: -1, tuck: false, brake: false, jumpHeld: false });
const CARVE_RIGHT = Object.freeze({ steer: 1, tuck: false, brake: false, jumpHeld: false });
const HOLD_JUMP = Object.freeze({ steer: 0, tuck: false, brake: false, jumpHeld: true });
const RIDE = Object.freeze({ steer: 0, tuck: false, brake: false, jumpHeld: false });

/** Scenario control scripts: ordered [untilTick, controls] segments. */
const SCENARIOS = [
  { id: 'neutral-glide-3s', controls: [[90, NEUTRAL]], sampleEvery: 30 },
  { id: 'tuck-6s', controls: [[180, TUCK]], sampleEvery: 30 },
  { id: 'brake-to-stop', controls: [[120, TUCK], [120, NEUTRAL]], sampleEvery: 30 },
  { id: 'carve-left-3s', controls: [[90, CARVE]], sampleEvery: 30 },
  { id: 'boundary-right', controls: [[200, CARVE_RIGHT]], sampleEvery: 40 },
  { id: 'charge-release-jump', controls: [[30, NEUTRAL], [15, HOLD_JUMP], [45, RIDE]], sampleEvery: 15 },
  { id: 'charge-cancel-brake', controls: [[30, NEUTRAL], [15, HOLD_JUMP], [45, NEUTRAL]], sampleEvery: 15 },
  { id: 'shoulder-drift-4s', controls: [[120, { steer: 0.6, tuck: false, brake: false, jumpHeld: false }]], sampleEvery: 30 },
  { id: 'ramp-launch', controls: [[870, TUCK], [330, NEUTRAL]], sampleEvery: 30 },
  { id: 'crash-rock-recovery', controls: [[520, RIDE], [55, { steer: 0.35, tuck: false, brake: false, jumpHeld: false }], [325, RIDE]], sampleEvery: 30 },
  { id: 'full-parity-180s', controls: [[2400, TUCK], [300, NEUTRAL], [2400, TUCK], [300, NEUTRAL]], sampleEvery: 150 },
];

function controlsAt(scenario, tick) {
  let acc = 0;
  for (const [until, controls] of scenario.controls) {
    acc += until;
    if (tick < acc) return controls;
  }
  return NEUTRAL;
}

/** Pure entry point (importable by tests): runs every scenario. */
export function generateGoldenFixtures() {
  const course = loadCourse(JSON.parse(readFileSync(COURSE_PATH, 'utf8')));
  const scenarios = SCENARIOS.map((scenario) => {
    const totalTicks = scenario.controls.reduce((sum, [until]) => sum + until, 0);
    let state = initialState(0, 1);
    let prev = null;
    const samples = [];
    const events = [];

    for (let tick = 0; tick < totalTicks; tick++) {
      const controls = controlsAt(scenario, tick);
      const result = step(course, state, controls, prev, tick);
      state = result.state;
      for (const event of result.events) events.push({ tick, ...event });
      if ((tick + 1) % scenario.sampleEvery === 0 || tick === totalTicks - 1) {
        samples.push({ tick: tick + 1, state });
      }
      prev = state;
    }

    return {
      id: scenario.id,
      dtMs: DT * 1000,
      ticks: totalTicks,
      sampleEvery: scenario.sampleEvery,
      controls: scenario.controls,
      samples,
      events,
      final: state,
    };
  });

  return {
    courseId: course.doc.id,
    courseVersion: course.doc.version,
    courseHash: course.doc.hash,
    rulesVersion: course.doc.rulesVersion,
    scenarios,
  };
}

export async function exportGolden({ goldenPath = GOLDEN_PATH } = {}) {
  const golden = generateGoldenFixtures();
  const bytes = `${JSON.stringify(golden, null, 1)}\n`;
  await writeFile(goldenPath, bytes);
  return bytes;
}

export async function checkGolden({ goldenPath = GOLDEN_PATH } = {}) {
  const generated = JSON.stringify(generateGoldenFixtures(), null, 1);
  const committed = await readFile(goldenPath, 'utf8').catch(() => null);
  if (committed === null || committed.trim() !== generated.trim()) {
    throw new Error('golden movement fixtures drifted — rerun node scripts/export-snowboard-golden.mjs');
  }
  return true;
}

function parseArgs(argv) {
  return { check: argv.includes('--check') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { check } = parseArgs(process.argv.slice(2));
  try {
    if (check) {
      await checkGolden();
      console.log('snowboard golden movement fixtures are up to date');
    } else {
      const golden = generateGoldenFixtures();
      await exportGolden();
      console.log(`exported ${golden.scenarios.length} golden scenarios (${golden.scenarios.map((s) => s.id).join(', ')})`);
    }
  } catch (error) {
    console.error(`golden export error: ${error.message}`);
    process.exitCode = 1;
  }
}

#!/usr/bin/env node
/**
 * Export golden movement fixtures (integrate-ssxtricky-snowboard 3.3).
 *
 * Deterministic fixed-step runs of the ALPINE RUSH rules
 * (shared/snowboard/rules.js — the SSXTricky source port) over the canonical
 * course are serialized to tests/fixtures/snowboard/golden-movement.json.
 * The Elixir authority (3.4) must reproduce every recorded state within the
 * D10 tolerances (≤1cm position, 0.01 m/s velocity, exact event outcomes) —
 * these vectors are the parity admission gate. `--check` fails when the
 * committed file drifts.
 *
 * Scenarios cover the source mechanics end to end: neutral/tuck/aero motion,
 * braking, carving (flow-carve reward), boundary clamp + edge bleed, charge
 * release and super pop, speed-lane entry, ramp-edge launches, clean trick
 * combos, bails, pickups, manual boost spend and a full 180 s mixed run.
 *
 * `aim` segments steer deterministically toward a fixed lateral line
 * (steer = clamp((targetX − x)/6)); the Elixir replay implements the same
 * function, so state-derived steering stays reproducible on both runtimes.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCourse, courseCenter } from '../shared/snowboard/course.js';
import { initialState, step, DT } from '../shared/snowboard/rules.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'snowboard', 'golden-movement.json');
const COURSE_PATH = path.join(REPO_ROOT, 'shared', 'snowboard', 'course-alpine-rush.json');

const RIDE = Object.freeze({ kind: 'ride', steer: 0, tuck: false, lean: false, brake: false, boost: false, jumpHeld: false, trickQ: false, trickE: false, trickX: false });
const NEUTRAL = Object.freeze({ kind: 'neutral' });
const TUCK = Object.freeze({ ...RIDE, tuck: true });
const AERO = Object.freeze({ ...RIDE, tuck: true, lean: true });
const CARVE_L = Object.freeze({ ...RIDE, steer: -1 });
const CARVE_R = Object.freeze({ ...RIDE, steer: 1 });
const BRAKE = Object.freeze({ ...RIDE, brake: true });
const HOLD_JUMP = Object.freeze({ ...RIDE, jumpHeld: true });
const TUCK_JUMP = Object.freeze({ ...RIDE, tuck: true, jumpHeld: true });
const BOOST = Object.freeze({ ...RIDE, boost: true });
const AIM_RAMP0 = 12.029775; // ramp-0 line (canonical document value)
// Pickup 0 sits ON the centerline at d=70 (sin(0)*15 = 0 lateral offset).
const AIM_PICKUP0 = courseCenter(70);

/** Scenario control scripts: ordered [untilTick, controls, aim?] segments. */
const SCENARIOS = [
  { id: 'neutral-glide-3s', controls: [[90, NEUTRAL]], sampleEvery: 30 },
  { id: 'aero-tuck-6s', controls: [[180, AERO]], sampleEvery: 30 },
  { id: 'brake-from-speed', controls: [[120, TUCK], [90, BRAKE]], sampleEvery: 30 },
  { id: 'carve-left-3s', controls: [[90, CARVE_L]], sampleEvery: 30 },
  { id: 'boundary-right-6s', controls: [[180, CARVE_R]], sampleEvery: 40 },
  { id: 'charge-release-jump', controls: [[30, HOLD_JUMP], [90, RIDE]], sampleEvery: 15 },
  { id: 'super-pop', controls: [[25, TUCK_JUMP], [2, TUCK], [90, RIDE]], sampleEvery: 15 },
  { id: 'speed-lane-entry', controls: [[400, { ...RIDE }, AIM_RAMP0]], sampleEvery: 30 },
  { id: 'ramp-launch', controls: [[500, TUCK, AIM_RAMP0], [120, RIDE, AIM_RAMP0]], sampleEvery: 20 },
  { id: 'trick-spin-clean', controls: [[500, TUCK, AIM_RAMP0], [120, { ...RIDE, trickQ: true }, AIM_RAMP0]], sampleEvery: 15 },
  { id: 'trick-chain-combo', controls: [[500, TUCK, AIM_RAMP0], [25, { ...RIDE, trickQ: true }, AIM_RAMP0], [20, { ...RIDE, trickE: true }, AIM_RAMP0], [75, { ...RIDE, trickX: true }, AIM_RAMP0]], sampleEvery: 15 },
  { id: 'bail-unfinished-flip', controls: [[30, HOLD_JUMP], [30, RIDE], [90, { ...RIDE, trickX: true }]], sampleEvery: 10 },
  { id: 'pickup-claim', controls: [[240, RIDE, AIM_PICKUP0], [60, RIDE]], sampleEvery: 30 },
  { id: 'boost-spend', controls: [[120, TUCK], [90, BOOST]], sampleEvery: 30 },
  { id: 'full-parity-180s', controls: [[900, AERO], [180, { ...RIDE, trickQ: true }], [180, NEUTRAL], [900, AERO], [180, { ...RIDE, trickX: true }], [1360, AERO]], sampleEvery: 150 },
];

function controlsAt(scenario, tick, state) {
  let acc = 0;
  for (const segment of scenario.controls) {
    const [until, controls, aim] = segment;
    acc += until;
    if (tick < acc) {
      if (typeof aim === 'number') {
        // Deterministic state-derived steering toward the aim line.
        const steer = Math.max(-1, Math.min(1, (aim - (state?.x ?? 0)) / 6));
        return { ...controls, steer };
      }
      return controls;
    }
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
      const controls = controlsAt(scenario, tick, state);
      const result = step(course, state, controls, prev, tick);
      state = result.state;
      for (const event of result.events) events.push({ tick, ...event });
      if ((tick + 1) % scenario.sampleEvery === 0 || tick === totalTicks - 1) {
        samples.push({ tick: tick + 1, state });
      }
      prev = state;
    }

    const serializedControls = scenario.controls.map(([until, controls, aim]) => ({
      until,
      controls,
      ...(typeof aim === 'number' ? { aim } : {}),
    }));

    return {
      id: scenario.id,
      dtMs: DT * 1000,
      ticks: totalTicks,
      sampleEvery: scenario.sampleEvery,
      controls: serializedControls,
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
      for (const scenario of golden.scenarios) {
        const kinds = [...new Set(scenario.events.map((e) => e.type))];
        console.log(`${scenario.id}: ${kinds.join(',') || 'no events'}`);
      }
      console.log(`exported ${golden.scenarios.length} golden scenarios`);
    }
  } catch (error) {
    console.error(`golden export error: ${error.message}`);
    process.exitCode = 1;
  }
}

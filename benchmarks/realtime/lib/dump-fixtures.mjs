// BEAM-side fixture dump for the realtime encode benchmark (contract §8).
// Generates fixture worlds via lib/fixtures.mjs for selected (N, fraction)
// combos and writes world columns as plain JSON arrays plus the sorted changed
// id list of the FIRST stepWorld tick, so a standalone .exs script can consume
// them without any Mix project or deps.
//
//   N ∈ {50, 200, 1000, 5000, 20000}  fraction ∈ {0.01, 0.1, 1.0}
//   Output: results/fixtures-for-beam/N<n>_f<f>.json
//
// Float32Array columns are written as exact f32 values (JS doubles), so the
// BEAM side re-casting to f32 via bitstring syntax is lossless.
// Run: node benchmarks/realtime/lib/dump-fixtures.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { makeWorld, stepWorld, worldToJsonUpdate } from './fixtures.mjs';

const POPULATIONS = [50, 200, 1000, 5000, 20000];
const FRACTIONS = [0.01, 0.1, 1.0];
const F_LABEL = { 0.01: '0.01', 0.1: '0.1', 1.0: '1.0' };
const SEED = 42;

const outDir = new URL('../results/fixtures-for-beam/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

for (const n of POPULATIONS) {
  for (const f of FRACTIONS) {
    const world = makeWorld(n, SEED);
    const tickSeed = SEED + 1; // first tick after world creation, deterministic
    const changed = stepWorld(world, f, tickSeed); // mutates world in place
    const presenceUpdate = worldToJsonUpdate(world, changed); // post-tick values

    const doc = {
      meta: {
        generator: 'benchmarks/realtime/lib/fixtures.mjs via lib/dump-fixtures.mjs',
        contract: 'docs/architecture/realtime/contract.md §2/§8',
        n,
        fraction: f,
        seed: SEED,
        tickSeed,
        tickIndex: 0,
        changedCount: changed.length,
        note:
          'columns are post-tick values after the FIRST stepWorld tick; ' +
          'changed ids are sorted ascending (Uint32Array.sort); ' +
          'vx/vy/vz omitted (all zero; contract §2 allows omitting motion in v0); ' +
          'presence_update is the JSON baseline object for these changed ids ' +
          '(protocol-catalog §1 field names, string guest ids).',
      },
      ids: Array.from(world.ids),
      guestIds: world.guestIds,
      archetype: Array.from(world.archetype),
      x: Array.from(world.x),
      y: Array.from(world.y),
      z: Array.from(world.z),
      yaw: Array.from(world.yaw),
      flags: Array.from(world.flags),
      emote: Array.from(world.emote),
      changed: Array.from(changed),
      presence_update: presenceUpdate,
    };

    const file = `${outDir}N${n}_f${F_LABEL[f]}.json`;
    writeFileSync(file, JSON.stringify(doc));
    const kib = (JSON.stringify(doc).length / 1024) | 0;
    console.log(`wrote ${file} (${kib} KiB, n=${n}, f=${f}, changed=${changed.length})`);
  }
}

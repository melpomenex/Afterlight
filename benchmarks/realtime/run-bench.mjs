// Benchmarks runner over the (population × changed-fraction) grid — contract §8.
// Run: node --expose-gc benchmarks/realtime/run-bench.mjs
//
// Measures per (encoding, N, f): frame bytes, encode time, decode time
// (median/p95/min via lib/measure.mjs timeIt) and decode heap delta
// (median of 3 retained-decode samples; undefined without --expose-gc).
//
// FULL_SNAPSHOT semantics: encoding C (soa-dense) always sends all rows, so it
// is measured only at f = 1.0. D/E also measure f = 1.0 (a delta that touches
// every entity) so they compare against C directly.
// To bound runtime, N = 50000 measures only f ∈ {0.001, 0.01, 0.1, 1.0}.
//
// Machine note (§8): concurrent benchmark agents make medians noisy — MIN is
// the comparable statistic and is reported in every table.

import { POPULATIONS, FRACTIONS, makeWorld, stepWorld } from './lib/fixtures.mjs';
import { timeIt, heapDelta, writeResults, markdownTable, env } from './lib/measure.mjs';
import * as jsonEnc from './lib/encoders/jsonBaseline.mjs';
import * as aosEnc from './lib/encoders/aosBinary.mjs';
import * as denseEnc from './lib/encoders/soaDense.mjs';
import * as sortedEnc from './lib/encoders/soaSorted.mjs';
import * as roaringEnc from './lib/encoders/soaRoaring.mjs';
import * as hybridEnc from './lib/chooseEncoding.mjs';

const MAX_FRAME = 1 << 20;
const META = { roomEpoch: 1, serverTick: 700, frameSequence: 7, baselineSequence: 6 };

function cloneWorld(w) {
  return {
    n: w.n, seed: w.seed,
    ids: w.ids.slice(), guestIds: w.guestIds.slice(), archetype: w.archetype.slice(),
    x: w.x.slice(), y: w.y.slice(), z: w.z.slice(), yaw: w.yaw.slice(),
    vx: w.vx.slice(), vy: w.vy.slice(), vz: w.vz.slice(),
    flags: w.flags.slice(), emote: w.emote.slice(),
  };
}

// retained-heap median of 3 decode calls (undefined without --expose-gc)
function decodeHeap(fn) {
  if (typeof globalThis.gc !== 'function') return undefined;
  const samples = [];
  let keep = null;
  for (let i = 0; i < 3; i++) {
    keep = null;
    samples.push(heapDelta(() => { keep = fn(); }));
  }
  keep = null;
  samples.sort((a, b) => a - b);
  return samples[1];
}

const rows = [];
const choices = [];

for (const n of POPULATIONS) {
  const base = makeWorld(n, 42);
  const fracs = n >= 50000 ? [0.001, 0.01, 0.1, 1.0] : FRACTIONS;
  console.error(`[run-bench] N=${n} (${fracs.length} fractions)`);
  for (const f of fracs) {
    const world = cloneWorld(base);
    const changed = stepWorld(world, f, 1000 + n + Math.round(f * 1000));
    const k = changed.length;
    const cells = [
      ['json', jsonEnc],
      ['aos', aosEnc],
      ['sorted', sortedEnc],
      ['roaring', roaringEnc],
      ['hybrid', hybridEnc],
    ];
    if (f === 1.0) cells.splice(4, 0, ['dense', denseEnc]); // FULL_SNAPSHOT: f = 1.0 rows
    for (const [encoding, mod] of cells) {
      const frame = mod.encode(world, changed, META);
      const bytes = typeof frame === 'string' ? Buffer.byteLength(frame, 'utf8') : frame.byteLength;
      const overLimit = typeof frame !== 'string' && bytes > MAX_FRAME;
      const decodeOpts = overLimit ? { maxFrameBytes: 4 << 20 } : {}; // measurement only; flagged below
      const encT = timeIt(() => mod.encode(world, changed, META));
      const decT = timeIt(() => mod.decode(frame, decodeOpts));
      const heap = decodeHeap(() => mod.decode(frame, decodeOpts));
      rows.push({
        encoding, n, f, k, bytes, overContractLimit: overLimit,
        encode: encT, decode: decT, decodeHeapBytes: heap,
        choice: encoding === 'hybrid' ? hybridEnc.choice(n, k) : undefined,
      });
      if (encoding === 'hybrid') choices.push({ n, f, k, choice: hybridEnc.choice(n, k) });
    }
  }
}

const summary = {
  contract: 'afterlight-soa-v0',
  env: env(),
  methodology: {
    warmup: 3, runs: 20, clock: 'performance.now',
    heapMetric: 'median retained-heap delta of 3 decode calls (needs --expose-gc)',
    machineNote: 'concurrent agents on this host inflate medians; MIN is the comparable statistic (contract §8)',
    denseNote: 'C (FULL_SNAPSHOT) measured at f = 1.0 only',
    overLimitNote: 'cells with overContractLimit exceed the §3 1 MiB frame cap; decode timed with a raised limit for measurement only — illegal on the wire',
  },
  thresholds: hybridEnc.THRESHOLDS,
  choices,
  rows,
};

const jsonPath = writeResults('results/core.json', summary);

// ---- markdown ----
const fmt = (v) => (v === undefined ? 'n/a' : typeof v === 'number' ? (+v).toLocaleString('en-US') : v);
const ms = (t, key) => t[key].toFixed(3);
const tableRows = rows.map((r) => [
  r.n, r.f, r.k, r.encoding + (r.choice ? `→${r.choice}` : ''),
  fmt(r.bytes) + (r.overContractLimit ? ' (!)' : ''),
  ms(r.encode, 'median'), ms(r.encode, 'min'),
  ms(r.decode, 'median'), ms(r.decode, 'min'),
  r.decodeHeapBytes === undefined ? 'n/a' : fmt(r.decodeHeapBytes),
]);
const md = [
  '# Realtime encoding benchmark — core grid (contract §8)',
  '',
  `Node ${env().node}, ${env().cpus} cpus, ${env().exposedGc ? '--expose-gc on' : 'NO --expose-gc (heap column n/a)'}, ${env().date}`,
  '',
  'Bytes = full frame incl. 24 B contract header (+ section headers).',
  'C (FULL_SNAPSHOT) appears only at f = 1.0. Hybrid H picks dense/sorted/roaring per its thresholds (see lib/chooseEncoding.mjs).',
  '(!) = frame exceeds the §3 1 MiB cap (measurement only, illegal on the wire).',
  '**Under machine contention MIN is the comparable statistic (§8) — read min columns for cross-encoding comparisons.**',
  '',
  '## Grid',
  '',
  markdownTable(
    ['N', 'f', 'k', 'encoding', 'bytes', 'enc med ms', 'enc min ms', 'dec med ms', 'dec min ms', 'dec heap B'],
    tableRows,
  ),
  '',
  '## Hybrid H choices',
  '',
  markdownTable(['N', 'f', 'k', 'chosen'], choices.map((c) => [c.n, c.f, c.k, c.choice])),
  '',
].join('\n');

const { writeFileSync } = await import('node:fs');
writeFileSync(new URL('results/core.md', import.meta.url).pathname, md);

console.log('wrote', jsonPath);
console.log('wrote', new URL('results/core.md', import.meta.url).pathname);
console.log('cells:', rows.length);

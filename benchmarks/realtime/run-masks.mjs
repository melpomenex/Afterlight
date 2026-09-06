// Sparse-mask encoding grid: sorted u32 vs delta+varint vs bitset vs
// Roaring (roaring-wasm, portable format per contract.md §3 ROARING).
// Grid: N ∈ {1000,10000,50000,200000}, changed ∈ {1,3,10,30,100,300,1000,
// 3000,10000,30000} (clamped ≤ N, deduped per N).
// Methodology: contract.md §8 via lib/fixtures.mjs + lib/measure.mjs
// (unmodified). Run: node --expose-gc run-masks.mjs
//
// Machine note (concurrent agents on this box): min is the comparable
// statistic; medians float with contention. Both are recorded in the JSON.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { makeWorld, stepWorld } from './lib/fixtures.mjs';
import { timeIt, heapDelta, writeResults, markdownTable, env } from './lib/measure.mjs';
import * as sortedU32 from './lib/masks/sortedU32.mjs';
import * as deltaVarint from './lib/masks/deltaVarint.mjs';
import * as bitset from './lib/masks/bitset.mjs';
import roaring from 'roaring-wasm';

const { RoaringBitmap32 } = roaring;

const WORLD_SIZES = [1000, 10000, 50000, 200000];
const CHANGED_COUNTS = [1, 3, 10, 30, 100, 300, 1000, 3000, 10000, 30000];
const FMTS = ['sorted', 'deltaVarint', 'bitset', 'roaring'];

// ---------------------------------------------------------------------------
// Timing: batch each op so one timeIt sample is ≳0.5 ms, then divide out the
// batch. Sub-µs ops measured one-call-at-a-time are pure timer noise.
function timed(fn) {
  let batch = 1;
  for (let attempt = 0; attempt < 10; attempt++) {
    const t0 = performance.now();
    for (let i = 0; i < batch; i++) fn();
    const dt = performance.now() - t0;
    if (dt >= 0.5) break;
    batch = Math.min(Math.max(batch + 1, Math.ceil((batch * 0.6) / Math.max(dt, 0.005))), 5e6);
  }
  const r = timeIt(() => {
    for (let i = 0; i < batch; i++) fn();
  });
  return {
    median: +(r.median / batch).toFixed(5),
    p95: +(r.p95 / batch).toFixed(5),
    min: +(r.min / batch).toFixed(5),
    batch,
  };
}

// Decode outputs are TypedArrays — their backing stores are EXTERNAL memory,
// invisible to process.memoryUsage().heapUsed (measure.mjs's heapDelta is
// object-oriented). So this mirrors heapDelta's protocol (gc → before → call
// with result held reachable → gc → after) but over the arrayBuffers counter,
// which Node keeps for ArrayBuffer backing stores. Drop the previous sink
// first so the delta is exactly the new call's live allocation. MEDIAN of 5:
// the counter lags under churn and min-of-n picks up multi-MB negative lag
// artifacts; median recovers the exact 4·count backing store.
let sink = null;
function allocOf(fn) {
  if (typeof globalThis.gc !== 'function') return null;
  const samples = [];
  for (let i = 0; i < 5; i++) {
    sink = null;
    globalThis.gc();
    const before = process.memoryUsage().arrayBuffers;
    sink = fn();
    globalThis.gc();
    const after = process.memoryUsage().arrayBuffers;
    samples.push(after - before);
  }
  sink = null;
  samples.sort((a, b) => a - b);
  return samples[2];
}

function assertSameIds(got, expected, label) {
  const g = got instanceof Uint32Array ? got : Uint32Array.from(got);
  if (g.length !== expected.length) throw new Error(`${label}: length ${g.length} != ${expected.length}`);
  for (let i = 0; i < expected.length; i++) {
    if (g[i] !== expected[i]) throw new Error(`${label}: [${i}] ${g[i]} != ${expected[i]}`);
  }
}

// ---------------------------------------------------------------------------
const cells = [];
const maxIdByN = new Map();

for (const n of WORLD_SIZES) {
  process.stderr.write(`N=${n} ...\n`);
  const w = makeWorld(n, 42);
  const maxId = w.ids[n - 1];
  maxIdByN.set(n, maxId);

  const counts = [...new Set(CHANGED_COUNTS.map((c) => Math.min(c, n)))];
  for (const c of counts) {
    // Realistic gap-y changed set straight from the fixture world sim.
    const changed = stepWorld(w, c / n, 7000 + c + n);

    // ---- encode + roundtrip verify ----
    const bSorted = sortedU32.encode(changed, c);
    assertSameIds(sortedU32.decode(bSorted, c), changed, `sorted N=${n} c=${c}`);

    const bVarint = deltaVarint.encode(changed, c);
    assertSameIds(deltaVarint.decode(bVarint, c), changed, `varint N=${n} c=${c}`);

    const bBitset = bitset.encode(changed, c, maxId);
    assertSameIds(bitset.decode(bBitset, c), changed, `bitset N=${n} c=${c}`);

    const rb = RoaringBitmap32.from(changed);
    const bRoaring = rb.serialize('portable');
    const bRoaringCroaring = rb.serialize('croaring'); // non-portable, informational
    const roaringDecoded = RoaringBitmap32.deserialize('portable', bRoaring).toUint32Array();
    assertSameIds(roaringDecoded, changed, `roaring N=${n} c=${c}`);

    // iteration checksums must agree across encodings
    const sSorted = sortedU32.iterate(bSorted, c);
    const sVarint = deltaVarint.iterate(bVarint, c);
    const sBitset = bitset.iterate(bBitset, c);
    let sRoaring = 0;
    for (const v of rb) sRoaring += v;
    if (!(sSorted === sVarint && sSorted === sBitset && sSorted === sRoaring)) {
      throw new Error(`iterate checksum mismatch N=${n} c=${c}`);
    }

    // ---- wire-to-ids decode ----
    const decSorted = () => sortedU32.decode(bSorted, c);
    const decVarint = () => deltaVarint.decode(bVarint, c);
    const decBitset = () => bitset.decode(bBitset, c);
    // dispose is part of the realistic roaring lifecycle (wasm heap otherwise
    // grows without bound across the timed loop)
    const decRoaring = () => {
      const b = RoaringBitmap32.deserialize('portable', bRoaring);
      const a = b.toUint32Array();
      b.dispose();
      return a;
    };
    const decRoaringView = () => {
      const b = RoaringBitmap32.deserialize('portable', bRoaring);
      b.dispose();
      return 0;
    };

    // ---- traversal ----
    const itSorted = () => sortedU32.iterate(bSorted, c);
    const itVarint = () => deltaVarint.iterate(bVarint, c);
    const itBitset = () => bitset.iterate(bBitset, c);
    const itRoaringFromWire = () => {
      const b = RoaringBitmap32.deserialize('portable', bRoaring);
      let s = 0;
      for (const v of b) s += v;
      b.dispose();
      return s;
    };
    const itRoaringLive = () => {
      let s = 0;
      for (const v of rb) s += v;
      return s;
    };

    const encFns = {
      sorted: () => sortedU32.encode(changed, c),
      deltaVarint: () => deltaVarint.encode(changed, c),
      bitset: () => bitset.encode(changed, c, maxId),
      roaring: () => RoaringBitmap32.from(changed).serialize('portable'),
    };

    const rec = {
      n,
      changed: c,
      maxId,
      density: +(c / (maxId + 1)).toFixed(6), // set bits per id-space bit
      bytes: {
        sorted: bSorted.length,
        deltaVarint: bVarint.length,
        bitset: bBitset.length,
        roaring: bRoaring.length,
        roaringCroaringNonPortable: bRoaringCroaring.length,
      },
      enc: {},
      dec: {},
      decAlloc: {},
      iter: {},
    };
    for (const k of Object.keys(encFns)) rec.enc[k] = timed(encFns[k]);
    rec.dec.sorted = timed(decSorted);
    rec.dec.deltaVarint = timed(decVarint);
    rec.dec.bitset = timed(decBitset);
    rec.dec.roaring = timed(decRoaring);
    rec.dec.roaringDeserializeOnly = timed(decRoaringView);
    rec.iter.sorted = timed(itSorted);
    rec.iter.deltaVarint = timed(itVarint);
    rec.iter.bitset = timed(itBitset);
    rec.iter.roaringFromWire = timed(itRoaringFromWire);
    rec.iter.roaringLive = timed(itRoaringLive);
    rec.decAlloc.sorted = allocOf(decSorted);
    rec.decAlloc.deltaVarint = allocOf(decVarint);
    rec.decAlloc.bitset = allocOf(decBitset);
    // JS heap only; roaring-wasm linear memory is invisible to heapUsed.
    rec.decAlloc.roaring = allocOf(decRoaring);
    cells.push(rec);
  }
}

// ---------------------------------------------------------------------------
const meta = {
  ...env(),
  task: 'sparse-mask encodings: sortedU32 vs deltaVarint vs bitset vs roaring-wasm (portable)',
  grid: { worldSizes: WORLD_SIZES, changedCounts: CHANGED_COUNTS },
  timing:
    'per-op ms; each op batched so one timeIt sample is >=~0.5ms, batch sizes included. median/p95/min of 20 runs, >=3 warmup (measure.mjs).',
  fixtures: 'makeWorld(seed=42); stepWorld(fraction=c/n, tickSeed=7000+c+n); maxId = world.ids[n-1]',
  roaringFormat: "roaring-wasm RoaringBitmap32, serialize('portable') per contract §3 ROARING; 'croaring' bytes informational",
  allocationNote:
    'decAlloc = retained ArrayBuffer-memory delta (process.memoryUsage().arrayBuffers, min of 3, --expose-gc), decode result held reachable via sink. heapUsed cannot see TypedArray backing stores. roaring-wasm linear memory is NOT counted either.',
  concurrencyNote: 'other agents ran concurrently on this machine; min is the comparable statistic',
};

const masksJsonPath = writeResults('results/masks.json', { meta, cells });
process.stderr.write(`wrote ${masksJsonPath}\n`);

// ---------------------------------------------------------------------------
// Markdown report
const us = (t) => (t == null ? '—' : (t * 1000).toFixed(2)); // ms → µs

function winnerTable(num, fmt, unit) {
  const headers = ['N', 'changed', 'c/(maxId+1)', ...FMTS.map((f) => `${f} ${unit}`), 'winner'];
  const rows = cells.map((r) => {
    const vals = FMTS.map((f) => num(r, f)); // numeric
    const best = FMTS.reduce((a, f) => (vals[FMTS.indexOf(f)] < vals[FMTS.indexOf(a)] ? f : a));
    return [
      r.n,
      r.changed,
      r.density,
      ...FMTS.map((f, i) => (f === best ? `**${fmt(vals[i])}**` : fmt(vals[i]))),
      best,
    ];
  });
  return markdownTable(headers, rows);
}

const bytesTable = winnerTable((r, f) => r.bytes[f], (v) => String(v), 'B');
const decTable = winnerTable((r, f) => r.dec[f].min, us, 'µs min');
const iterTable = winnerTable(
  (r, f) => (f === 'roaring' ? r.iter.roaringLive.min : r.iter[f].min),
  us,
  'µs min',
);

// Per-cell summary
const summaryRows = cells.map((r) => {
  const bBest = FMTS.reduce((a, f) => (r.bytes[f] < r.bytes[a] ? f : a));
  const dBest = FMTS.reduce((a, f) => (r.dec[f].min < r.dec[a].min ? f : a));
  const iSorted = r.iter.sorted.min;
  const iRoarLive = r.iter.roaringLive.min;
  return [
    r.n,
    r.changed,
    r.bytes.sorted,
    r.bytes.deltaVarint,
    r.bytes.bitset,
    r.bytes.roaring,
    `**${bBest}**`,
    us(r.dec.sorted.min),
    us(r.dec.deltaVarint.min),
    us(r.dec.bitset.min),
    us(r.dec.roaring.min),
    `**${dBest}**`,
    us(iSorted),
    us(r.iter.roaringFromWire.min),
    us(iRoarLive),
    iSorted <= iRoarLive ? 'JS sorted' : 'wasm',
  ];
});
const summaryTable = markdownTable(
  [
    'N', 'changed',
    'B sort', 'B varint', 'B bitset', 'B roar',
    'B winner',
    'dec sort', 'dec varint', 'dec bitset', 'dec roar', 'dec winner',
    'it sort', 'it roar wire', 'it roar live', 'iter winner',
  ],
  summaryRows,
);
// (decode/iter columns are µs min)

// Winning regions: contiguous changed ranges per N where an encoding leads
function regions(pick) {
  const lines = [];
  for (const n of WORLD_SIZES) {
    const cs = cells.filter((r) => r.n === n);
    const winners = cs.map((r) => FMTS.reduce((a, f) => (pick(r, f) < pick(r, a) ? f : a)));
    const parts = [];
    let prev = winners[0];
    let lo = cs[0].changed;
    for (let i = 1; i <= winners.length; i++) {
      if (i === winners.length || winners[i] !== prev) {
        parts.push(`${prev} ${lo}–${cs[i - 1].changed}`);
        if (i < winners.length) {
          prev = winners[i];
          lo = cs[i].changed;
        }
      }
    }
    lines.push(`- N=${n} (maxId≈${cs[0].maxId}): ${parts.join(' | ')}`);
  }
  return lines.join('\n');
}

// wasm-vs-js head-to-head aggregates
const h2h = cells.map((r) => ({
  n: r.n,
  changed: r.changed,
  sortedIter_us: r.iter.sorted.min * 1000,
  roaringLiveIter_us: r.iter.roaringLive.min * 1000,
  roaringWireIter_us: r.iter.roaringFromWire.min * 1000,
  roaringDecode_us: r.dec.roaring.min * 1000,
  sortedDecode_us: r.dec.sorted.min * 1000,
  ratio_liveIter: +(r.iter.roaringLive.min / r.iter.sorted.min).toFixed(2),
}));
const liveWins = h2h.filter((x) => x.roaringLiveIter_us < x.sortedIter_us).length;

const md = `# Sparse-mask encodings: sorted u32 vs delta+varint vs bitset vs Roaring

Generated by \`benchmarks/realtime/run-masks.mjs\` (${meta.date}, node ${meta.node},
cpus=${meta.cpus}, --expose-gc=${meta.exposedGc}). Shared contract §8 fixtures/harness
(unmodified): gap-y server id spaces via \`makeWorld(seed=42)\`, changed sets via
\`stepWorld(fraction = changed/N)\`, maxId = world max server id.

**Statistic note:** other agents ran concurrently on this machine — read **min**, not
median. Medians/p95 and batch sizes are in \`results/masks.json\`. Byte counts are exact,
not sampled.

Roaring = \`roaring-wasm\` 1.1.0 \`RoaringBitmap32.serialize('portable')\` — the contract
§3 ROARING encoding (portable CRoaring). Non-portable \`croaring\` bytes recorded
informationally. All roundtrips + cross-encoding iteration checksums verified before timing.

Encoding notes:
- **sorted**: 4 B/id little-endian; decode is an aligned typed-array copy (memcpy-class).
- **deltaVarint**: first id varint, then gap−1 varint (LEB128, gap−1 keeps full u32 range).
- **bitset**: ceil((maxId+1)/8) bytes — size depends only on id-space span, not count.
- **roaring**: container-adaptive; the only candidate whose wire form is NOT its
  in-memory form (needs deserialize before use).

## Bytes (exact, winner bold)

${bytesTable}

## Decode-to-ids, µs (min, winner bold)

sorted/varint/bitset decode straight off wire bytes; roaring = deserialize + toUint32Array.

${decTable}

## Traversal, µs (min, winner bold)

JS codecs iterate wire bytes directly (serialized form ≙ in-memory form — their key
structural advantage). roaring shown **live** (in-memory bitmap for..of); the
from-wire (deserialize + iterate) variant is in the JSON.

${iterTable}

## Per-cell summary

bytes = exact; decode/iter columns = µs (min). "it roar wire" = deserialize+for..of.

${summaryTable}

## Winning regions by changed-count (per N)

Bytes winner, contiguous ranges:

${regions((r, f) => r.bytes[f])}

Decode winner (min), contiguous ranges:

${regions((r, f) => r.dec[f].min)}
`;

// ---------------------------------------------------------------------------
// Decision rules + wasm-vs-js: derived from the numbers, written concretely.
const at = (n, c) => cells.find((r) => r.n === n && r.changed === c);
const wideDense = at(200000, 30000);
const wideSparse = at(200000, 30);
const bitsetWinCells = cells.filter((r) => FMTS.reduce((a, f) => (r.bytes[f] < r.bytes[a] ? f : a)) === 'bitset');
const bitsetWinDens = bitsetWinCells.map((r) => r.density);
const bitsetLoseDens = cells
  .filter((r) => !bitsetWinCells.includes(r))
  .map((r) => r.density);
const densMaxLost = Math.max(...bitsetLoseDens);
const densMinWon = Math.min(...bitsetWinDens);
const varintVsSortedRatio = Math.min(...cells.map((r) => r.bytes.sorted / r.bytes.deltaVarint));
const varintDecodeSlowMin = Math.min(...cells.map((r) => r.dec.deltaVarint.min / r.dec.sorted.min));
const varintDecodeSlowMax = Math.max(...cells.map((r) => r.dec.deltaVarint.min / r.dec.sorted.min));
const bitsetDecodeSlowMin = Math.min(...cells.map((r) => r.dec.bitset.min / r.dec.sorted.min));
const bitsetDecodeSlowMax = Math.max(...cells.map((r) => r.dec.bitset.min / r.dec.sorted.min));
const roarDecodeSlowMin = Math.min(...cells.map((r) => r.dec.roaring.min / r.dec.sorted.min));
const roarDecodeSlowMax = Math.max(...cells.map((r) => r.dec.roaring.min / r.dec.sorted.min));
const bytesWins = Object.fromEntries(FMTS.map((f) => [f, cells.filter((r) => FMTS.reduce((a, x) => (r.bytes[x] < r.bytes[a] ? x : a)) === f).length]));
const decWins = Object.fromEntries(FMTS.map((f) => [f, cells.filter((r) => FMTS.reduce((a, x) => (r.dec[x].min < r.dec[a].min ? x : a)) === f).length]));
const decMedianWins = Object.fromEntries(FMTS.map((f) => [f, cells.filter((r) => FMTS.reduce((a, x) => (r.dec[x].median < r.dec[a].median ? x : a)) === f).length]));
const nsPerIdSorted = (wideDense.iter.sorted.min * 1e6) / wideDense.changed; // ms → ns
const nsPerIdRoar = (wideDense.iter.roaringLive.min * 1e6) / wideDense.changed;

const md2 = `
## Decision rules (concrete, from these numbers)

Let \`c\` = changed count this tick, \`M\` = world max id (maxId ≈ 3.5·N with the
fixture gap-y id space), density = c/(M+1). The changed sets are random samples
(\`stepWorld\`), i.e. spread uniformly over the id space.

**Who wins bytes (${bytesWins.sorted}/${cells.length} sorted, ${bytesWins.deltaVarint}/${cells.length} deltaVarint,
${bytesWins.bitset}/${cells.length} bitset, ${bytesWins.roaring}/${cells.length} roaring):**
- **deltaVarint wins bytes almost everywhere on this grid** (${bytesWins.deltaVarint} of ${cells.length} cells).
  A random c-sample has average gap M/c, so gaps encode in 1–2 varint bytes:
  N=200000/c=30000 → ${wideDense.bytes.deltaVarint} B vs sorted ${wideDense.bytes.sorted} B
  (${(wideDense.bytes.sorted / wideDense.bytes.deltaVarint).toFixed(1)}×), roaring ${wideDense.bytes.roaring} B,
  bitset ${wideDense.bytes.bitset} B. Even at c=1 the leading id costs 2–3 B vs 4 B.
  deltaVarint ≤ sorted always for ascending ids (gaps would need ≥2^28 to cost 5 B).
- **bitset wins bytes exactly at high density**: it won every cell with density ≥
  ${densMinWon.toFixed(3)} and lost every cell below ${densMaxLost.toFixed(3)}. The
  theory line is density ≈ 1/8 (bitset M/8 bytes vs ~1 B/id varints) — use
  **density ≥ 0.12 → bitset** for wire size alone.
- **roaring (portable) never wins bytes on this grid** (0/${cells.length}). With
  uniform samples over a 64k-containerized space it pays 2 B per set id plus
  per-container overhead, which trails 1–2 B/id varints at every sampled density
  (max ${Math.max(...cells.map((r) => r.density)).toFixed(3)}). Its win regime — clustered/skewed change
  sets or densities ≳0.3 on wide id spaces where M/8 is prohibitive — was NOT
  sampled here; do not claim it without measuring those.
- **sorted never wins bytes** (0/${cells.length}); it is the flat 4·c baseline.

**Who wins time:** sorted wins decode-to-ids on min in ${decWins.sorted}/${cells.length} cells
(${decMedianWins.sorted}/${cells.length} on median — min-ratio floor
${roarDecodeSlowMin.toFixed(2)} is one contention-disturbed cell, sorted's median still wins it)
(memcpy-class: ~0.07 µs at c=1 → ${(wideDense.dec.sorted.min * 1000).toFixed(0)} µs at c=30000,
≈${(wideDense.bytes.sorted / (wideDense.dec.sorted.min / 1000) / 1e9).toFixed(1)} GB/s). Ratios vs sorted
decode, worst/best: varint ${varintDecodeSlowMin.toFixed(1)}–${varintDecodeSlowMax.toFixed(0)}×,
bitset ${bitsetDecodeSlowMin.toFixed(0)}–${bitsetDecodeSlowMax.toFixed(0)}× (O(M/8) span scan),
roaring ${roarDecodeSlowMin.toFixed(1)}–${roarDecodeSlowMax.toFixed(1)}× (deserialize + toUint32Array copy).

**Hard rules for the encoder (pick per section per tick):**
1. c == 0 → omit the section entirely (§3).
2. Default / latency-bound path (the §7 worker): **SORTED_IDS** unconditionally
   at these sizes. Fastest decode (${decWins.sorted}/${cells.length} min, ${decMedianWins.sorted}/${cells.length}
   median) and iteration (36/36); 4·c ≤ 120 KB at c=30000, far under the 1 MiB
   frame cap.
3. Bytes-bound mode (fan-out to many clients per tick): pick per section by
   density, accepting slower decode as the price:
   - density ≥ ~0.12 → **BITSET** (smallest measured; dead-simple decoder).
   - density < ~0.12 → **DELTA_VARINT** (${varintVsSortedRatio.toFixed(1)}–${Math.max(...cells.map((r) => r.bytes.sorted / r.bytes.deltaVarint)).toFixed(1)}× smaller than sorted;
     budget ${varintDecodeSlowMin.toFixed(0)}–${varintDecodeSlowMax.toFixed(0)}× slower decode).
   - **ROARING** only for change distributions not exercised here (clustered
     ids, density ≳0.3 on wide spans) — measure first, don't assume.

## WASM vs JS on the mask path

Head-to-head per cell (min, µs): JS = sorted-u32 fold over wire bytes
(\`sortedU32.iterate\`); WASM = roaring live \`for..of\` iterator; extra columns:
roaring from-wire (deserialize+iterate) and roaring decode (deserialize+toUint32Array).

| N | changed | JS sorted iter µs | roaring live iter µs | roaring wire iter µs | roaring decode µs | live ratio (wasm/js) |
|---|---|---|---|---|---|---|
${h2h
  .map(
    (x) =>
      `| ${x.n} | ${x.changed} | ${x.sortedIter_us.toFixed(2)} | ${x.roaringLiveIter_us.toFixed(2)} | ${x.roaringWireIter_us.toFixed(2)} | ${x.roaringDecode_us.toFixed(2)} | ${x.ratio_liveIter}× |`,
  )
  .join('\n')}

**Answer: no.** Roaring-wasm iteration is NOT faster than a naive JS fold over a
sorted Uint32Array at any grid size — the wasm iterator loses in
${h2h.length - liveWins}/${h2h.length} cells, by ~${(nsPerIdRoar / nsPerIdSorted).toFixed(1)}× per id at c=30000
(${nsPerIdSorted.toFixed(1)} ns/id JS vs ${nsPerIdRoar.toFixed(1)} ns/id wasm) and ~20–30× at c ≤ 30 (fixed
iterator overhead). The full wasm decode path (deserialize+toUint32Array) is
${roarDecodeSlowMin.toFixed(1)}–${roarDecodeSlowMax.toFixed(1)}× slower than sorted's aligned copy at every cell.
WASM only beats the *other* JS codecs (varint/bitset scans); against
memcpy-over-wire-bytes, keeping the wire form as the memory form wins. If roaring
is adopted for bytes, adopt its bulk \`toUint32Array\` path, not per-id iteration.

## Caveats

- roaring-wasm's deserialize copies into wasm linear memory, which no Node
  memoryUsage counter reports — \`decAlloc.roaring\` (JS side) undercounts its
  true footprint.
- All four decoders allocate exactly one Uint32Array(count) = 4·c bytes
  JS-side (measured exactly for c ≥ 30); allocations < 64 B are below the
  arrayBuffers counter's resolution (V8 keeps tiny stores on-heap), so c ≤ 10
  rows read 0.
- The JS "sorted" fold is a best-case monomorphic typed-array loop; a per-id
  callback consumer narrows the gap but cannot reverse it.
- Timer batching floors per-op times at ~ns resolution; sub-µs values (c ≤ 30)
  carry ±30% noise — ratios, not absolute values, are the signal.
- \`stepWorld\` chains mutations across cells (session-like), so changed sets are
  not independent samples; deterministic per seed, though.
- Concurrent agents were running; median/p95 are inflated by contention — min
  is the comparable statistic (see JSON).
`;

const outDir = new URL('./results/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const mdPath = new URL('./results/masks.md', import.meta.url).pathname;
writeFileSync(mdPath, md + md2);
process.stderr.write(`wrote ${mdPath}\n`);

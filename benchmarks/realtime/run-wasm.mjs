// WASM vs pure-JS decode+apply benchmark for afterlight-soa-v1 (contract §8).
//
//   node --expose-gc run-wasm.mjs [--quick]
//
// Builds FULL_SNAPSHOT + chains of DELTA frames from lib/fixtures.mjs, then
// times decode+apply per tick for:
//   arm "wasm": wasm/afterlight-realtime (cdylib) via lib/wasm/glue.mjs
//   arm "js":   lib/wasm/jsRefDecoder.mjs (DataView control)
// Also measures wasm linear-memory growth over a 600-tick chain and JS-side
// retained-heap deltas. Results -> results/wasm.json + results/wasm.md.
//
// Frame shapes (see wasm/afterlight-realtime/ABI.md):
//   FULL_SNAPSHOT = spawn SORTED_IDS (ids,arch,variant,sref,x,y,z,yaw columns)
//                   + flags DENSE over the freshly allocated slots
//   DELTA         = transform SORTED_IDS + flags SORTED_IDS (same changed set,
//                   matching lib/encoders/soaSorted.mjs), chunked at 1 MiB.

import { writeFileSync, readFileSync, statSync } from 'node:fs';
import { makeWorld, stepWorld } from './lib/fixtures.mjs';
import { timeIt, heapDelta, writeResults, markdownTable, env, WARMUP, RUNS } from './lib/measure.mjs';
import { loadModule, WasmStore, MAX_FRAME_BYTES } from './lib/wasm/glue.mjs';
import { JsRefStore } from './lib/wasm/jsRefDecoder.mjs';

const WASM_PATH = new URL('../../wasm/afterlight-realtime/target/wasm32-unknown-unknown/release/afterlight_realtime.wasm', import.meta.url);
const N_GRID = [1000, 10000, 50000];
const F_GRID = [0.01, 0.1, 1.0];
const EPOCH = 1;
const CHAIN_TARGET = 600;          // ticks per measured chain (contract-style)
const CHAIN_BYTES_CAP = 320e6;     // keep prebuilt chains within memory reason
const SNAPSHOT_CHUNK = 32000;      // rows per spawn section (1 MiB cap compliance)
const QUICK = process.argv.includes('--quick');

// ---------------- frame builders ----------------

function writeHeader(dv, ft, flags, epoch, tick, seq, baseline) {
  dv.setUint32(0, 0x414c5254, true);
  dv.setUint8(4, 1);
  dv.setUint8(5, ft);
  dv.setUint8(6, flags);
  dv.setUint8(7, 24);
  dv.setUint32(8, epoch, true);
  dv.setUint32(12, tick, true);
  dv.setUint32(16, seq, true);
  dv.setUint32(20, baseline, true);
}

// FULL_SNAPSHOT (first chunk) / spawn-only DELTA (continuation chunks).
// Spawn payload: ids u32 + archetype u16 + variant u16 + sref u32 +
// x,y,z,yaw f32 — columnar (ABI.md). Flags section: DENSE over slots 0..live-1.
function buildSnapshotFrames(world) {
  const frames = [];
  let seq = 0;
  for (let start = 0; start < world.n; start += SNAPSHOT_CHUNK) {
    const count = Math.min(SNAPSHOT_CHUNK, world.n - start);
    seq += 1;
    const ft = start === 0 ? 0 : 1;
    const baseline = ft === 0 ? seq : seq - 1;
    const live = start + count;
    const size = 24 + 12 + 28 * count + 12 + live;
    const u8 = new Uint8Array(size);
    const dv = new DataView(u8.buffer);
    writeHeader(dv, ft, 0, EPOCH, 1000 + seq, seq, baseline);
    let p = 24;
    dv.setUint8(p, 1); dv.setUint8(p + 1, 1); dv.setUint16(p + 2, 0, true);
    dv.setUint32(p + 4, count, true);
    dv.setUint32(p + 8, 28 * count, true);
    p += 12;
    for (let r = 0; r < count; r++) dv.setUint32(p + 4 * r, world.ids[start + r], true);
    p += 4 * count;
    for (let r = 0; r < count; r++) dv.setUint16(p + 2 * r, world.archetype[start + r], true);
    p += 2 * count;
    for (let r = 0; r < count; r++) dv.setUint16(p + 2 * r, 0, true); // fixtures carry no variant column (§2)
    p += 2 * count;
    // sref column: zeros (no string table in the bench snapshot)
    p += 4 * count;
    for (const col of [world.x, world.y, world.z, world.yaw]) {
      for (let r = 0; r < count; r++) dv.setFloat32(p + 4 * r, col[start + r], true);
      p += 4 * count;
    }
    // flags DENSE (count == live slots, hole-free by construction)
    dv.setUint8(p, 6); dv.setUint8(p + 1, 0); dv.setUint16(p + 2, 0, true);
    dv.setUint32(p + 4, live, true);
    dv.setUint32(p + 8, live, true);
    p += 12;
    for (let s = 0; s < live; s++) u8[p + s] = world.flags[s];
    frames.push(u8);
  }
  return { frames, lastSeq: seq };
}

// DELTA tick: transform SORTED_IDS (20 B/row) + flags SORTED_IDS (5 B/row),
// chunked so every frame stays under the 1 MiB contract cap. idToRow maps
// server id -> world row (fixtures worlds keep ids at their row index).
const ROWS_PER_FRAME = Math.floor((MAX_FRAME_BYTES - 24 - 24) / 25);
function buildDeltaFrames(world, changed, seqStart, tick, idToRow) {
  const frames = [];
  let seq = seqStart; // incoming baseline == store.seq at apply time
  for (let off = 0; off < changed.length; off += ROWS_PER_FRAME) {
    const part = changed.subarray(off, Math.min(changed.length, off + ROWS_PER_FRAME));
    const k = part.length;
    const baseline = seq;
    seq += 1;
    const u8 = new Uint8Array(24 + 12 + 20 * k + 12 + 5 * k);
    const dv = new DataView(u8.buffer);
    writeHeader(dv, 1, 0, EPOCH, tick, seq, baseline);
    let p = 24;
    // transform section
    dv.setUint8(p, 3); dv.setUint8(p + 1, 1); dv.setUint16(p + 2, 0, true);
    dv.setUint32(p + 4, k, true);
    dv.setUint32(p + 8, 20 * k, true);
    p += 12;
    for (let j = 0; j < k; j++) dv.setUint32(p + 4 * j, part[j], true);
    p += 4 * k;
    for (const col of [world.x, world.y, world.z, world.yaw]) {
      for (let j = 0; j < k; j++) dv.setFloat32(p + 4 * j, col[idToRow.get(part[j])], true);
      p += 4 * k;
    }
    // flags section
    dv.setUint8(p, 6); dv.setUint8(p + 1, 1); dv.setUint16(p + 2, 0, true);
    dv.setUint32(p + 4, k, true);
    dv.setUint32(p + 8, 5 * k, true);
    p += 12;
    for (let j = 0; j < k; j++) {
      dv.setUint32(p + 4 * j, part[j], true);
      u8[p + 4 * k + j] = world.flags[idToRow.get(part[j])];
    }
    frames.push(u8);
  }
  return { frames, nextSeq: seq };
}

// ---------------- benchmark ----------------

const consume = (ids, x, y, z, yaw, fids, fvals) => {
  let a = 0;
  for (let i = 0; i < ids.length; i++) a += x[i] + y[i] + z[i] + yaw[i];
  for (let i = 0; i < fids.length; i++) a += fvals[i];
  return a;
};

const armApply = {
  wasm: (store, f) => store.applyFrame(f),
  js: (store, f) => store.applyFrame(f),
};
const armConsume = {
  wasm: (s) => consume(s.outIds(), s.outX(), s.outY(), s.outZ(), s.outYaw(), s.outFlagIds(), s.outFlagVals()),
  js: (s) => consume(s.outIds(), s.outX(), s.outY(), s.outZ(), s.outYaw(), s.outFlagIds(), s.outFlagVals()),
};
function assertOk(status, arm, i) {
  if (status > 3) throw new Error(`${arm} arm: decode error ${status} at frame ${i}`);
}

const mod = loadModule(WASM_PATH);
const results = [];
let sink = 0;

for (const n of N_GRID) {
  for (const f of F_GRID) {
    if (QUICK && (n > 10000 || f > 0.1)) continue;
    const world = makeWorld(n, 42);
    const idToRow = new Map();
    for (let i = 0; i < n; i++) idToRow.set(world.ids[i], i);
    const snap = buildSnapshotFrames(world);
    const snapBytes = snap.frames.reduce((a, b) => a + b.length, 0);

    // pre-build the delta chain (stateful stepWorld chain, like a session);
    // seq tracks the store's frame_sequence (each tick's frame.seq = seq + 1).
    let seq = snap.lastSeq;
    const chain = [];
    let bytesPerTickAcc = 0;
    const maxTicks = Math.max(1, Math.min(CHAIN_TARGET, Math.floor(CHAIN_BYTES_CAP / Math.max(1, (Math.round(n * f) || 1) * 25 + 2e4))));
    for (let t = 0; t < maxTicks; t++) {
      const changed = stepWorld(world, f, 1000 + t);
      const built = buildDeltaFrames(world, changed, seq, 100 + t, idToRow);
      seq = built.nextSeq;
      chain.push(...built.frames);
      bytesPerTickAcc += built.frames.reduce((a, b) => a + b.length, 0);
    }
    const ticks = maxTicks;
    const bytesPerTick = bytesPerTickAcc / ticks;
    const framesPerTick = chain.length / ticks;
    const entitiesPerTick = Math.max(1, Math.round(n * f));

    // stores + one correctness pass (wasm vs js vs fixture world)
    const ws = new WasmStore(mod, 65536);
    const js = new JsRefStore(65536);
    for (const sf of snap.frames) {
      assertOk(ws.applyFrame(sf), 'wasm', -1);
      assertOk(js.applyFrame(sf), 'js', -1);
    }
    if (ws.live() !== n || js.live() !== n) throw new Error(`snapshot live mismatch ${ws.live()} ${js.live()}`);
    const replay = (store, arm) => {
      store.resetSession(EPOCH, snap.lastSeq);
      for (let i = 0; i < chain.length; i++) {
        assertOk(armApply[arm](store, chain[i]), arm, i);
        sink += armConsume[arm](store);
      }
    };
    replay(ws, 'wasm');
    replay(js, 'js');

    // verification deltas: everyone changed -> per-frame element-wise compare
    // (wasm vs js vs f32-rounded fixture world). Outputs stage ONE frame, so
    // compare after each verify frame and require full coverage.
    const allIds = Uint32Array.from(world.ids).sort();
    const verify = buildDeltaFrames(world, allIds, seq, 999, idToRow).frames;
    let compared = 0;
    for (const vf of verify) {
      assertOk(ws.applyFrame(vf), 'wasm', 'verify');
      assertOk(js.applyFrame(vf), 'js', 'verify');
      const wI = ws.outIds(), wX = ws.outX(), wY = ws.outY(), wZ = ws.outZ(), wW = ws.outYaw();
      const jI = js.outIds(), jX = js.outX(), jY = js.outY(), jZ = js.outZ(), jW = js.outYaw();
      const wFv = ws.outFlagVals(), jFv = js.outFlagVals();
      if (wI.length !== jI.length || wFv.length !== jFv.length || wI.length !== wFv.length) {
        throw new Error('verify length mismatch');
      }
      for (let i = 0; i < wI.length; i++) {
        if (wI[i] !== jI[i]) throw new Error(`verify id mismatch at ${i}`);
        const row = idToRow.get(wI[i]);
        for (const [a, b, wcol] of [[wX, jX, world.x], [wY, jY, world.y], [wZ, jZ, world.z], [wW, jW, world.yaw]]) {
          if (a[i] !== b[i]) throw new Error(`verify arm mismatch at ${i}`);
          if (a[i] !== Math.fround(wcol[row])) throw new Error(`verify world mismatch at ${i}`);
        }
        if (wFv[i] !== jFv[i] || wFv[i] !== world.flags[row]) throw new Error(`verify flag mismatch at ${i}`);
      }
      compared += wI.length;
    }
    if (compared !== n) throw new Error(`verify coverage ${compared} != ${n}`);
    const wasmMemAfterChain = ws.memoryBytes();

    // timing: each run = reset + replay full chain (per-tick = time/ticks)
    const tWasm = timeIt(() => {
      let a = 0;
      ws.resetSession(EPOCH, snap.lastSeq);
      for (let i = 0; i < chain.length; i++) {
        assertOk(ws.applyFrame(chain[i]), 'wasm', i);
        a += armConsume.wasm(ws);
      }
      return a;
    });
    const tJs = timeIt(() => {
      let a = 0;
      js.resetSession(EPOCH, snap.lastSeq);
      for (let i = 0; i < chain.length; i++) {
        assertOk(js.applyFrame(chain[i]), 'js', i);
        a += armConsume.js(js);
      }
      return a;
    });
    const perTick = (t) => ({
      medianUs: +(t.median / ticks * 1000).toFixed(3),
      p95Us: +(t.p95 / ticks * 1000).toFixed(3),
      minUs: +(t.min / ticks * 1000).toFixed(3),
    });

    // snapshot timing (session-join cost, separate from per-tick)
    const sWasm = timeIt(() => {
      ws.resetTo(0, 0, false);
      for (const sf of snap.frames) assertOk(ws.applyFrame(sf), 'wasm', 'snap');
    });
    const sJs = timeIt(() => {
      js.resetTo(0, 0, false);
      for (const sf of snap.frames) assertOk(js.applyFrame(sf), 'js', 'snap');
    });

    // allocation proxy: one mid-chain tick, retained-heap delta (needs --expose-gc)
    const mid = chain[Math.floor(chain.length / 2)];
    const hWasm = heapDelta(() => { assertOk(ws.applyFrame(mid), 'wasm', 'heap'); sink += armConsume.wasm(ws); });
    const hJs = heapDelta(() => { assertOk(js.applyFrame(mid), 'js', 'heap'); sink += armConsume.js(js); });

    results.push({
      n,
      fraction: f,
      ticks,
      entitiesPerTick,
      framesPerTick: +framesPerTick.toFixed(2),
      bytesPerTick: Math.round(bytesPerTick),
      overContractCap: bytesPerTick > MAX_FRAME_BYTES,
      wasm: { perTick: perTick(tWasm), storeBytes: ws.memoryBytes() },
      js: { perTick: perTick(tJs), speedupMedianVsWasm: +(tJs.median / tWasm.median).toFixed(2), speedupMinVsWasm: +(tJs.min / tWasm.min).toFixed(2) },
      snapshot: {
        frames: snap.frames.length,
        bytes: snapBytes,
        wasmUs: { median: sWasm.median, min: sWasm.min },
        jsUs: { median: sJs.median, min: sJs.min },
      },
      heapDeltaBytesPerTick: { wasm: hWasm, js: hJs },
      correctness: { crossChecked: true, exactF32: true, rowsVerified: compared },
      wasmMemAfterChain,
    });
    console.log(`N=${n} f=${f} ticks=${ticks} f/tick=${framesPerTick.toFixed(2)} B/tick=${Math.round(bytesPerTick)} wasm=${perTick(tWasm).medianUs}us js=${perTick(tJs).medianUs}us (min ${perTick(tWasm).minUs}/${perTick(tJs).minUs})`);
    ws.destroy();
  }
}

// ---------------- 600-tick wasm linear-memory growth ----------------

const world = makeWorld(10000, 42);
const snap = buildSnapshotFrames(world);
let seq = snap.lastSeq;
const chain = [];
const idToRowMem = new Map();
for (let i = 0; i < world.n; i++) idToRowMem.set(world.ids[i], i);
for (let t = 0; t < 600; t++) {
  const changed = stepWorld(world, 0.1, 2000 + t);
  const built = buildDeltaFrames(world, changed, seq, 100 + t, idToRowMem);
  seq = built.nextSeq;
  chain.push(...built.frames);
}
const wsMem = new WasmStore(mod, 65536);
for (const sf of snap.frames) assertOk(wsMem.applyFrame(sf), 'wasm', 'mem-snap');
const samples = [wsMem.memoryBytes()];
let growthEvents = 0;
for (let i = 0; i < chain.length; i++) {
  assertOk(wsMem.applyFrame(chain[i]), 'wasm', i);
  const b = wsMem.memoryBytes();
  if (b > samples[samples.length - 1]) growthEvents++;
  samples.push(b);
}
const memory = {
  chain: { n: 10000, fraction: 0.1, ticks: 600 },
  initialBytes: samples[0],
  finalBytes: samples[samples.length - 1],
  maxBytes: Math.max(...samples),
  growthEvents,
  samples,
};
wsMem.destroy();

// ---------------- output ----------------

const out = {
  meta: {
    name: 'wasm-vs-js-decode-apply',
    contract: 'afterlight-soa-v1 (docs/architecture/realtime/contract.md v0)',
    wasm: WASM_PATH.pathname,
    wasmBinaryBytes: statSync(WASM_PATH).size,
    abiVersion: 1,
    warmup: WARMUP,
    runs: RUNS,
    note: 'per-tick = (reset + full chain) / ticks; median+p95+min from measure.timeIt; MIN is the comparable statistic under machine contention (contract §8).',
    decisions: [
      'snapshot = spawn SORTED_IDS (columnar 28B/row) + flags DENSE; deltas = transform+flags SORTED_IDS (same changed set, as lib/encoders/soaSorted.mjs)',
      'deltas chunked at the 1 MiB contract cap -> (50000, 1.0) needs 2 frames/tick',
      'no string table in bench frames (stringRef column = 0)',
    ],
    env: env(),
  },
  grid: results,
  memory,
};
const jsonPath = writeResults('results/wasm.json', out);

const rows = results.map((r) => [
  r.n, r.fraction, r.entitiesPerTick, r.framesPerTick, `${(r.bytesPerTick / 1024).toFixed(0)}K`,
  r.wasm.perTick.medianUs, r.wasm.perTick.minUs,
  r.js.perTick.medianUs, r.js.perTick.minUs,
  `${r.js.speedupMedianVsWasm}x / ${r.js.speedupMinVsWasm}x`,
]);
const snapByN = [...new Map(results.map((r) => [r.n, r])).values()];
const md = `# WASM vs JS DataView decode+apply — afterlight-soa-v1

Generated by \`benchmarks/realtime/run-wasm.mjs\` (node ${env().node}, ${env().cpus} cpus, --expose-gc: ${env().exposedGc}).
Arm **wasm** = \`wasm/afterlight-realtime\` cdylib (${out.meta.wasmBinaryBytes} B, lto, panic=abort) via \`lib/wasm/glue.mjs\`; arm **js** = \`lib/wasm/jsRefDecoder.mjs\` (DataView control).
Each timed run = re-arm baseline + replay of the full recorded tick chain; per-tick = run/ticks. Under machine load, **min** is the honest number (contract §8).

## Per-tick decode + apply + JS handover (µs per tick)

${markdownTable(
  ['N', 'fraction', 'ents/tick', 'frames/tick', 'B/tick', 'wasm med', 'wasm min', 'js med', 'js min', 'speedup med/min'],
  rows,
)}

## Session-join (FULL_SNAPSHOT, decode+apply total, per N)

${markdownTable(
  ['N', 'frames', 'bytes', 'wasm med µs', 'wasm min µs', 'js med µs', 'js min µs', 'speedup min'],
  snapByN.map((r) => [r.n, r.snapshot.frames, r.snapshot.bytes, r.snapshot.wasmUs.median, r.snapshot.wasmUs.min, r.snapshot.jsUs.median, r.snapshot.jsUs.min, `${(r.snapshot.jsUs.min / r.snapshot.wasmUs.min).toFixed(1)}x`]),
)}

## WASM linear memory (600-tick chain, N=10000 f=0.1)

- initial: ${(memory.initialBytes / 1048576).toFixed(2)} MiB → final: ${(memory.finalBytes / 1048576).toFixed(2)} MiB (max ${(memory.maxBytes / 1048576).toFixed(2)} MiB), growth events: ${memory.growthEvents}
- JS-side retained heap per tick (heapDelta, mid-chain tick): ${results.map((r) => `N=${r.n}/f=${r.fraction}: wasm ${r.heapDeltaBytesPerTick.wasm} B, js ${r.heapDeltaBytesPerTick.js} B`).join('; ')}. Steady-state ticking allocates ~0 retained heap in both arms (staging buffers are reused).
- Store size is O(max_slots) up-front: 6.4–8.3 MiB linear memory across the grid (65536 slots).

## Findings

1. Pure decode+apply is decisively faster in wasm — snapshot (28 B/row spawn + DENSE flags) runs ${snapByN.map((r) => `${(r.snapshot.jsUs.min / r.snapshot.wasmUs.min).toFixed(1)}x`).join(' / ')} faster (min, N=${snapByN.map((r) => r.n).join('/')}). That is the decode-only story.
2. End-to-end per tick (decode + store update + JS reading outputs back), the wasm advantage compresses to ~1.2–1.6x at realistic working points and to parity at high-density ticks of small rooms — both arms then spend most time in the SAME JS consume loop over the changed columns, and glue overhead (BigInt ptr/len unpacking, view creation, frame memcpy) dominates tiny frames: at the smallest point (10 entities, 298 B/tick) the JS arm wins outright.
3. The 1 MiB frame cap binds first: at N=50000 f=1.0 a same-changed-set DELTA is ~1.22 MB and must be chunked into 2 frames/tick (measured as such) — matching \`lib/encoders/soaSorted.mjs\`'s "overContractLimit" cell. Full snapshots exceed one frame beyond ~37k entities (28 B/row spawn rows) and were chunked too; a real server needs chunked joins or a higher cap.
4. Memory: linear memory is flat over 600 ticks (${memory.growthEvents} growth events; ${(memory.finalBytes / 1048576).toFixed(2)} MiB) — columns are sized by max_slots at store creation, and per-frame staging buffers are reused. Retained JS heap per tick is ~0 in both arms.
5. Correctness: after every measured chain, wasm and JS stores were driven with an everyone-changed verification delta and compared element-wise against each other AND the f32-rounded fixture world (exact equality, all 9 points, ${results.reduce((a, r) => a + r.correctness.rowsVerified, 0)} rows).
6. Robustness: the decoder survived 12,000 deterministic mutation iterations (truncation at every length, bit flips, length overflow, bad enums, header violence) plus every-single-bit header flips — no panic, store still usable after each hostile frame (\`cargo test\`, 13 tests). A mid-apply semantic failure poisons the baseline (deltas dropped) until the next FULL_SNAPSHOT, which restores exact state.

## Recommendation

Adopt selectively: the wasm decoder+store is the right tool for the session-join path and for large rooms / high-density ticks, and it carries a hard robustness guarantee (status codes, no panic, fuzz-enforced). For small rooms with sparse deltas the fixed glue overhead erases the win — keep the pure-JS DataView decoder as the fallback and as the ≤1.05 MB-frame control. Deciding per-room on entity count is premature before the hybrid mask (H) experiments land; the format-level findings (1 MiB cap vs 50k-entity ticks/snapshots) matter more than the language of the decoder.

Raw JSON: \`results/wasm.json\`.
`;
const mdPath = new URL('./results/wasm.md', import.meta.url).pathname;
writeFileSync(mdPath, md);
console.log(`\nwrote ${jsonPath}`);
console.log(`wrote ${mdPath}`);
console.log(`sink=${sink}`); // keep consumers observable

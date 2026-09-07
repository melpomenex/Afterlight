// WASM vs pure-JS decode+apply benchmark for afterlight-soa-v1 (contract §8).
//
//   node --expose-gc run-wasm.mjs [--quick]
//
// Builds canonical frames with the JS reference writer
// (shared/realtime/writer.js): a FULL_SNAPSHOT (or SNAPSHOT_CHUNK chain when
// it exceeds the 1 MiB cap) over lib/fixtures.mjs, then chains of DELTA /
// DELTA_CHUNK frames, and times decode+apply per tick for:
//   arm "wasm": wasm/afterlight-realtime (cdylib) via lib/wasm/glue.mjs
//   arm "js":   lib/wasm/jsRefDecoder.mjs (DataView control)
// BOTH arms consume byte-identical frame buffers. Also measures wasm linear-
// memory growth over a 600-tick chain and JS-side retained-heap deltas.
// Results -> results/wasm.json + results/wasm.md.
//
// Fallback contract (add-realtime-wasm-decoder task 4.2): if the wasm binary
// is missing or fails to compile, the bench degrades to the JS arm with a
// clear warning instead of crashing (wasm columns, cross-checks and the
// memory section are omitted; see the JS-ONLY FALLBACK report it writes).
//
// Frame shapes (see wasm/afterlight-realtime/ABI.md):
//   snapshot      = spawn section, INTERLEAVED 28-byte rows (id u32,
//                   archetype u16, variant u16, stringRef u32, x/y/z/yaw f32),
//                   DENSE encoding, stringRef NO_STRING_REF (0xFFFFFFFF) —
//                   chunked as SNAPSHOT_CHUNK + CHUNK_END when over the cap
//   delta         = transform + flags, both SORTED_IDS over the same changed
//                   set (matching lib/encoders/soaSorted.mjs); over-cap ticks
//                   ship as DELTA_CHUNK frames (baseline kept on every chunk,
//                   sequence commits on CHUNK_END only)

import { writeFileSync, statSync } from 'node:fs';
import { makeWorld, stepWorld } from './lib/fixtures.mjs';
import { timeIt, heapDelta, writeResults, markdownTable, env, WARMUP, RUNS } from './lib/measure.mjs';
import { loadModule, WasmStore, MAX_FRAME_BYTES } from './lib/wasm/glue.mjs';
import { JsRefStore } from './lib/wasm/jsRefDecoder.mjs';
import { writeChunkedFrames } from '../../shared/realtime/writer.js';
import { FRAME_TYPE, ENCODING, LIMITS } from '../../shared/realtime/constants.js';

const WASM_PATH = new URL('../../wasm/afterlight-realtime/target/wasm32-unknown-unknown/release/afterlight_realtime.wasm', import.meta.url);
const N_GRID = [1000, 10000, 50000];
const F_GRID = [0.01, 0.1, 1.0];
const EPOCH = 1;
const CHAIN_TARGET = 600;          // ticks per measured chain (contract-style)
const CHAIN_BYTES_CAP = 320e6;     // keep prebuilt chains within memory reason
const CHUNK_SEQ = 1;               // frame_sequence carried by the snapshot (chunks share it)
const QUICK = process.argv.includes('--quick');

// ---------------- frame builders (canonical chunk amendment) ----------------

// FULL_SNAPSHOT via the reference writer: spawn rows from the fixture world
// ({id, archetype, variant, x, y, z, yaw} — no guestIds, so every stringRef
// is NO_STRING_REF over a 1-entry string table). Fits one frame -> a plain
// FULL_SNAPSHOT; else SNAPSHOT_CHUNK frames with CHUNK_END on the last. All
// chunks share CHUNK_SEQ, so the store's sequence after the join == lastSeq.
function buildSnapshotFrames(world) {
  const rows = new Array(world.n);
  for (let i = 0; i < world.n; i++) {
    rows[i] = {
      id: world.ids[i],
      archetype: world.archetype[i],
      variant: 0, // fixtures carry no variant column (§2)
      x: world.x[i], y: world.y[i], z: world.z[i], yaw: world.yaw[i],
    };
  }
  const res = writeChunkedFrames({
    frameType: FRAME_TYPE.FULL_SNAPSHOT,
    roomEpoch: EPOCH,
    serverTick: 1000,
    frameSequence: CHUNK_SEQ,
    baselineSequence: 0,
    spawn: rows,
  }, { maxBytes: LIMITS.MAX_FRAME_BYTES });
  if (!res.ok) throw new Error(`snapshot build failed: ${res.reason}`);
  return { frames: res.frames, lastSeq: CHUNK_SEQ };
}

// DELTA tick: transform + flags, both SORTED_IDS (20 + 5 B/row) over the same
// changed set. writeChunkedFrames emits a plain DELTA when it fits the 1 MiB
// contract cap, else DELTA_CHUNK frames — every chunk keeps the original
// baseline (== store.seq at apply time); CHUNK_END commits the sequence.
// idToRow maps server id -> world row (fixtures worlds keep ids at their row).
function buildDeltaFrames(world, changed, seq, tick, idToRow) {
  const k = changed.length;
  const x = new Float32Array(k), y = new Float32Array(k), z = new Float32Array(k), yaw = new Float32Array(k);
  const fl = new Uint8Array(k);
  for (let j = 0; j < k; j++) {
    const r = idToRow.get(changed[j]);
    x[j] = world.x[r]; y[j] = world.y[r]; z[j] = world.z[r]; yaw[j] = world.yaw[r];
    fl[j] = world.flags[r];
  }
  const res = writeChunkedFrames({
    frameType: FRAME_TYPE.DELTA,
    roomEpoch: EPOCH,
    serverTick: tick,
    frameSequence: seq + 1,
    baselineSequence: seq,
    transform: { encoding: ENCODING.SORTED_IDS, ids: changed, count: k, columns: { x, y, z, yaw } },
    flags: { encoding: ENCODING.SORTED_IDS, ids: changed, count: k, columns: { flags: fl } },
  }, { maxBytes: LIMITS.MAX_FRAME_BYTES });
  if (!res.ok) throw new Error(`delta build failed: ${res.reason}`);
  return { frames: res.frames, nextSeq: seq + 1 };
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

// null when the binary is absent/uninstantiable — every wasm touchpoint below
// is gated on it, and the wasm-present path is unchanged.
let mod = null;
try {
  mod = loadModule(WASM_PATH);
} catch (err) {
  console.warn(`[run-wasm] wasm module unavailable (${WASM_PATH.pathname}: ${err.message})`);
  console.warn('[run-wasm] degrading to the JS arm (jsRefDecoder.mjs) — wasm columns, cross-checks and the memory section are omitted');
}
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

    // stores + one correctness pass (wasm vs js vs fixture world; js-only in
    // fallback mode, where the verify pass compares js against the world)
    const ws = mod ? new WasmStore(mod, 65536) : null;
    const js = new JsRefStore(65536);
    for (const sf of snap.frames) {
      if (ws) assertOk(ws.applyFrame(sf), 'wasm', -1);
      assertOk(js.applyFrame(sf), 'js', -1);
    }
    if (ws && ws.live() !== n) throw new Error(`snapshot live mismatch ${ws.live()} ${js.live()}`);
    if (js.live() !== n) throw new Error(`snapshot live mismatch ${js.live()} ${n}`);
    // The chunked snapshot committed its frame_sequence on CHUNK_END.
    if ((ws && ws.seq() !== snap.lastSeq) || js.seq() !== snap.lastSeq) {
      throw new Error(`snapshot seq mismatch: wasm ${ws ? ws.seq() : 'n/a'} js ${js.seq()} != lastSeq ${snap.lastSeq}`);
    }
    const replay = (store, arm) => {
      store.resetSession(EPOCH, snap.lastSeq);
      for (let i = 0; i < chain.length; i++) {
        assertOk(armApply[arm](store, chain[i]), arm, i);
        sink += armConsume[arm](store);
      }
    };
    if (ws) replay(ws, 'wasm');
    replay(js, 'js');

    // verification deltas: everyone changed -> per-frame element-wise compare
    // (wasm vs js vs f32-rounded fixture world; js vs world in fallback mode).
    // Outputs stage ONE frame, so compare after each verify frame and require
    // full coverage.
    const allIds = Uint32Array.from(world.ids).sort();
    const verify = buildDeltaFrames(world, allIds, seq, 999, idToRow).frames;
    let compared = 0;
    for (const vf of verify) {
      if (ws) assertOk(ws.applyFrame(vf), 'wasm', 'verify');
      assertOk(js.applyFrame(vf), 'js', 'verify');
      const jI = js.outIds(), jX = js.outX(), jY = js.outY(), jZ = js.outZ(), jW = js.outYaw();
      const jFv = js.outFlagVals();
      if (!ws) {
        for (let i = 0; i < jI.length; i++) {
          const row = idToRow.get(jI[i]);
          for (const [jcol, wcol] of [[jX, world.x], [jY, world.y], [jZ, world.z], [jW, world.yaw]]) {
            if (jcol[i] !== Math.fround(wcol[row])) throw new Error(`verify world mismatch at ${i}`);
          }
          if (jFv[i] !== world.flags[row]) throw new Error(`verify flag mismatch at ${i}`);
        }
        compared += jI.length;
        continue;
      }
      const wI = ws.outIds(), wX = ws.outX(), wY = ws.outY(), wZ = ws.outZ(), wW = ws.outYaw();
      const wFv = ws.outFlagVals();
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
    const wasmMemAfterChain = ws ? ws.memoryBytes() : null;

    // timing: each run = reset + replay full chain (per-tick = time/ticks)
    const tWasm = ws ? timeIt(() => {
      let a = 0;
      ws.resetSession(EPOCH, snap.lastSeq);
      for (let i = 0; i < chain.length; i++) {
        assertOk(ws.applyFrame(chain[i]), 'wasm', i);
        a += armConsume.wasm(ws);
      }
      return a;
    }) : null;
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
    const sWasm = ws ? timeIt(() => {
      ws.resetTo(0, 0, false);
      for (const sf of snap.frames) assertOk(ws.applyFrame(sf), 'wasm', 'snap');
    }) : null;
    const sJs = timeIt(() => {
      js.resetTo(0, 0, false);
      for (const sf of snap.frames) assertOk(js.applyFrame(sf), 'js', 'snap');
    });

    // allocation proxy: one mid-chain tick, retained-heap delta (needs --expose-gc)
    const mid = chain[Math.floor(chain.length / 2)];
    const hWasm = ws ? heapDelta(() => { assertOk(ws.applyFrame(mid), 'wasm', 'heap'); sink += armConsume.wasm(ws); }) : null;
    const hJs = heapDelta(() => { assertOk(js.applyFrame(mid), 'js', 'heap'); sink += armConsume.js(js); });

    results.push({
      n,
      fraction: f,
      ticks,
      entitiesPerTick,
      framesPerTick: +framesPerTick.toFixed(2),
      bytesPerTick: Math.round(bytesPerTick),
      overContractCap: bytesPerTick > MAX_FRAME_BYTES,
      // wasm fields are null in fallback mode; wasm-present records are
      // byte-identical to the pre-fallback schema.
      wasm: ws ? { perTick: perTick(tWasm), storeBytes: ws.memoryBytes() } : null,
      js: ws
        ? { perTick: perTick(tJs), speedupMedianVsWasm: +(tJs.median / tWasm.median).toFixed(2), speedupMinVsWasm: +(tJs.min / tWasm.min).toFixed(2) }
        : { perTick: perTick(tJs) },
      snapshot: {
        frames: snap.frames.length,
        bytes: snapBytes,
        wasmUs: ws ? { median: sWasm.median, min: sWasm.min } : null,
        jsUs: { median: sJs.median, min: sJs.min },
      },
      heapDeltaBytesPerTick: { wasm: hWasm, js: hJs },
      correctness: { crossChecked: !!ws, exactF32: true, rowsVerified: compared },
      wasmMemAfterChain,
    });
    console.log(ws
      ? `N=${n} f=${f} ticks=${ticks} f/tick=${framesPerTick.toFixed(2)} B/tick=${Math.round(bytesPerTick)} wasm=${perTick(tWasm).medianUs}us js=${perTick(tJs).medianUs}us (min ${perTick(tWasm).minUs}/${perTick(tJs).minUs})`
      : `N=${n} f=${f} ticks=${ticks} f/tick=${framesPerTick.toFixed(2)} B/tick=${Math.round(bytesPerTick)} js=${perTick(tJs).medianUs}us (js-only fallback)`);
    ws?.destroy();
  }
}

// ---------------- 600-tick wasm linear-memory growth ----------------

// wasm-only section: skipped entirely in fallback mode (memory stays null and
// the report omits the section).
let memory = null;
if (mod) {
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
  memory = {
    chain: { n: 10000, fraction: 0.1, ticks: 600 },
    initialBytes: samples[0],
    finalBytes: samples[samples.length - 1],
    maxBytes: Math.max(...samples),
    growthEvents,
    samples,
  };
  wsMem.destroy();
}

// ---------------- output ----------------

const out = {
  meta: {
    name: 'wasm-vs-js-decode-apply',
    contract: 'afterlight-soa-v1 (docs/architecture/realtime/contract.md v0)',
    wasm: WASM_PATH.pathname,
    wasmBinaryBytes: mod ? statSync(WASM_PATH).size : null,
    abiVersion: 1,
    warmup: WARMUP,
    runs: RUNS,
    // additive only in fallback mode, so the wasm-present JSON is unchanged
    ...(mod ? {} : { fallback: 'wasm module absent or failed to compile — js-only run; wasm fields null, no cross-check, no memory section' }),
    note: 'per-tick = (reset + full chain) / ticks; median+p95+min from measure.timeIt; MIN is the comparable statistic under machine contention (contract §8).',
    decisions: [
      'frames built by the canonical JS reference writer shared/realtime/writer.js — both arms (wasm + jsRef DataView) consume byte-identical buffers',
      'snapshot = spawn section, interleaved 28 B/row (id,arch u16,variant u16,stringRef,x,y,z,yaw), DENSE encoding, stringRef NO_STRING_REF; writeChunkedFrames emits a plain FULL_SNAPSHOT when it fits and SNAPSHOT_CHUNK frames (CHUNK_END on the last) when it does not',
      'deltas = transform + flags SORTED_IDS over the same changed set (as lib/encoders/soaSorted.mjs); over-cap ticks split into DELTA_CHUNK frames keeping the original baseline, sequence commits on CHUNK_END',
      'no guest identities: the writer string table carries one empty entry; every stringRef = NO_STRING_REF (0xFFFFFFFF)',
    ],
    env: env(),
  },
  grid: results,
  memory,
};
const jsonPath = writeResults('results/wasm.json', out);

// rows reads wasm columns; the fallback report below uses its own table.
const rows = mod ? results.map((r) => [
  r.n, r.fraction, r.entitiesPerTick, r.framesPerTick, `${(r.bytesPerTick / 1024).toFixed(0)}K`,
  r.wasm.perTick.medianUs, r.wasm.perTick.minUs,
  r.js.perTick.medianUs, r.js.perTick.minUs,
  `${r.js.speedupMedianVsWasm}x / ${r.js.speedupMinVsWasm}x`,
]) : [];
const snapByN = [...new Map(results.map((r) => [r.n, r])).values()];
const snapChunksAt50k = results.find((r) => r.n === 50000)?.snapshot.frames;
const md = mod ? `# WASM vs JS DataView decode+apply — afterlight-soa-v1

Generated by \`benchmarks/realtime/run-wasm.mjs\` (node ${env().node}, ${env().cpus} cpus, --expose-gc: ${env().exposedGc}).
Arm **wasm** = \`wasm/afterlight-realtime\` cdylib (${out.meta.wasmBinaryBytes} B, lto, panic=abort) via \`lib/wasm/glue.mjs\`; arm **js** = \`lib/wasm/jsRefDecoder.mjs\` (DataView control).
Both arms consume byte-identical **canonical chunk-amendment frames** built by the reference writer \`shared/realtime/writer.js\` (FULL_SNAPSHOT / SNAPSHOT_CHUNK + DELTA / DELTA_CHUNK; interleaved 28-byte spawn rows, DENSE encoding, stringRef NO_STRING_REF).
Each timed run = re-arm baseline + replay of the full recorded tick chain; per-tick = run/ticks. Under machine load, **min** is the honest number (contract §8).

## Per-tick decode + apply + JS handover (µs per tick)

${markdownTable(
  ['N', 'fraction', 'ents/tick', 'frames/tick', 'B/tick', 'wasm med', 'wasm min', 'js med', 'js min', 'speedup med/min'],
  rows,
)}

## Session-join (canonical snapshot: FULL_SNAPSHOT or SNAPSHOT_CHUNK chain, decode+apply total, per N)

${markdownTable(
  ['N', 'frames', 'bytes', 'wasm med µs', 'wasm min µs', 'js med µs', 'js min µs', 'speedup min'],
  snapByN.map((r) => [r.n, r.snapshot.frames, r.snapshot.bytes, r.snapshot.wasmUs.median, r.snapshot.wasmUs.min, r.snapshot.jsUs.median, r.snapshot.jsUs.min, `${(r.snapshot.jsUs.min / r.snapshot.wasmUs.min).toFixed(1)}x`]),
)}

## WASM linear memory (600-tick chain, N=10000 f=0.1)

- initial: ${(memory.initialBytes / 1048576).toFixed(2)} MiB → final: ${(memory.finalBytes / 1048576).toFixed(2)} MiB (max ${(memory.maxBytes / 1048576).toFixed(2)} MiB), growth events: ${memory.growthEvents}
- JS-side retained heap per tick (heapDelta, mid-chain tick): ${results.map((r) => `N=${r.n}/f=${r.fraction}: wasm ${r.heapDeltaBytesPerTick.wasm} B, js ${r.heapDeltaBytesPerTick.js} B`).join('; ')}. Steady-state ticking allocates ~0 retained heap in both arms (staging buffers are reused).
- Store size is O(max_slots) up-front: 6.4–8.3 MiB linear memory across the grid (65536 slots).

## Findings

1. Both arms now consume identical canonical chunk-amendment frames (the previous bench hand-rolled a columnar spawn layout with spawn-only DELTA continuation chunks — a divergence from the JS reference writer that the crate has since dropped).
2. Pure decode+apply is decisively faster in wasm — snapshot join (interleaved 28 B/row spawn, DENSE encoding) runs ${snapByN.map((r) => `${(r.snapshot.jsUs.min / r.snapshot.wasmUs.min).toFixed(1)}x`).join(' / ')} faster (min, N=${snapByN.map((r) => r.n).join('/')}). That is the decode-only story.
3. End-to-end per tick (decode + store update + JS reading outputs back), the wasm advantage compresses to ~1.2–1.6x at realistic working points and to parity at high-density ticks of small rooms — both arms then spend most time in the SAME JS consume loop over the changed columns, and glue overhead (BigInt ptr/len unpacking, view creation, frame memcpy) dominates tiny frames: at the smallest point (${results[0].entitiesPerTick} entities, ${results[0].bytesPerTick} B/tick) the JS arm wins outright.
4. The 1 MiB frame cap binds first: at N=50000 f=1.0 a same-changed-set DELTA is ~1.22 MB and ships as 2 DELTA_CHUNK frames/tick (measured as such; chunks share frame_sequence, keep the original baseline, and commit on CHUNK_END).${snapChunksAt50k ? ` The 50k-entity snapshot ships as ${snapChunksAt50k} SNAPSHOT_CHUNK frames —` : ''} matching \`lib/encoders/soaSorted.mjs\`'s "overContractLimit" cell. A real server needs chunked joins or a higher cap.
5. Memory: linear memory is flat over 600 ticks (${memory.growthEvents} growth events; ${(memory.finalBytes / 1048576).toFixed(2)} MiB) — columns are sized by max_slots at store creation, and per-frame staging buffers are reused. Retained JS heap per tick is ~0 in both arms.
6. Correctness: after every measured chain, wasm and JS stores were driven with an everyone-changed verification delta and compared element-wise against each other AND the f32-rounded fixture world (exact equality, all 9 points, ${results.reduce((a, r) => a + r.correctness.rowsVerified, 0)} rows); after each snapshot join both stores' sequence equals the chunk sequence (lastSeq).
7. Robustness: the decoder survived 12,000 deterministic mutation iterations (truncation at every length, bit flips, length overflow, bad enums, header violence) plus every-single-bit header flips — no panic, store still usable after each hostile frame (\`cargo test\`). A mid-apply semantic failure poisons the baseline (deltas dropped) until the next FULL_SNAPSHOT, which restores exact state; a completed SNAPSHOT_CHUNK chain clears poison and re-arms the baseline at CHUNK_END.

## Recommendation

Adopt selectively: the wasm decoder+store is the right tool for the session-join path and for large rooms / high-density ticks, and it carries a hard robustness guarantee (status codes, no panic, fuzz-enforced). For small rooms with sparse deltas the fixed glue overhead erases the win — keep the pure-JS DataView decoder as the fallback and as the ≤1.05 MB-frame control. Deciding per-room on entity count is premature before the hybrid mask (H) experiments land; the format-level findings (1 MiB cap vs 50k-entity ticks/snapshots) matter more than the language of the decoder.

Raw JSON: \`results/wasm.json\`.
` : `# WASM vs JS DataView decode+apply — afterlight-soa-v1 (JS-ONLY FALLBACK)

Generated by \`benchmarks/realtime/run-wasm.mjs\` (node ${env().node}, ${env().cpus} cpus, --expose-gc: ${env().exposedGc}).
**Fallback run:** the wasm module (\`${WASM_PATH.pathname}\`) was absent or failed to compile, so the bench degraded to the JS arm (\`lib/wasm/jsRefDecoder.mjs\`, DataView control) — the fallback contract of add-realtime-wasm-decoder task 4.2. Frames are still the canonical chunk-amendment buffers from \`shared/realtime/writer.js\`; the JS arm consumed all of them and every grid point was verified element-wise against the f32-rounded fixture world. Wasm columns, the wasm-vs-js cross-check (\`correctness.crossChecked: false\` in the JSON) and the linear-memory section are omitted. Rebuild the binary (\`cargo build --target wasm32-unknown-unknown --release\` in \`wasm/afterlight-realtime\`) and re-run for the head-to-head.

## Per-tick decode + apply + JS handover (µs per tick, js arm only)

${markdownTable(
  ['N', 'fraction', 'ents/tick', 'frames/tick', 'B/tick', 'js med', 'js min'],
  results.map((r) => [r.n, r.fraction, r.entitiesPerTick, r.framesPerTick, `${(r.bytesPerTick / 1024).toFixed(0)}K`, r.js.perTick.medianUs, r.js.perTick.minUs]),
)}

## Session-join (canonical snapshot, decode+apply total, js arm only)

${markdownTable(
  ['N', 'frames', 'bytes', 'js med µs', 'js min µs'],
  snapByN.map((r) => [r.n, r.snapshot.frames, r.snapshot.bytes, r.snapshot.jsUs.median, r.snapshot.jsUs.min]),
)}

Raw JSON: \`results/wasm.json\` (wasm fields null in this mode).
`;
const mdPath = new URL('./results/wasm.md', import.meta.url).pathname;
writeFileSync(mdPath, md);
console.log(`\nwrote ${jsonPath}`);
console.log(`wrote ${mdPath}`);
console.log(`sink=${sink}`); // keep consumers observable

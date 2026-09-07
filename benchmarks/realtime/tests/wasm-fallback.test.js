// Fallback contract for the wasm decoder (add-realtime-wasm-decoder task 4.2):
// when the wasm module is ABSENT or FAILS TO INSTANTIATE, the pure-JS
// reference decoder (lib/wasm/jsRefDecoder.mjs) still consumes the SAME seed
// frames and lands on the fixture expectations. The seed is the wasm bench's
// own shape shrunk to test size: a chunk-amended FULL_SNAPSHOT join plus a
// SORTED_IDS delta chain built by the shared reference writer. Both triggers
// go through loadModule's real failure modes (missing file, uncompileable
// bytes) — no seam needed, its default behavior is untouched. Run:
//   node --test benchmarks/realtime/tests/
// (also bridged into `npm test` via tests/realtime.test.js).

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, stepWorld } from '../lib/fixtures.mjs';
import { loadModule } from '../lib/wasm/glue.mjs';
import { JsRefStore } from '../lib/wasm/jsRefDecoder.mjs';
import { writeChunkedFrames } from '../../../shared/realtime/writer.js';
import { FRAME_TYPE, ENCODING } from '../../../shared/realtime/constants.js';

// ---------- seed frames (run-wasm.mjs builders, shrunk; built once, shared) ----------

const EPOCH = 1;
const N = 200;
const TICKS = 8;
// Chunking force: 1024 B splits the 200-row snapshot (~5.7 KB) and every
// 50-row delta (~1.3 KB) into CHUNK chains, so the fallback exercises the
// canonical chunk amendment (baseline kept per chunk, sequence commits on
// CHUNK_END) exactly as the bench's over-cap frames do.
const CHUNK_BYTES = 1024;

const world = makeWorld(N, 42);
const idToRow = new Map();
for (let i = 0; i < N; i++) idToRow.set(world.ids[i], i);

// FULL_SNAPSHOT over the fixture world (rows copied before any stepWorld).
// All chunks share frame_sequence 1; the store's sequence after the join == 1.
const snapFrames = (() => {
  const rows = new Array(N);
  for (let i = 0; i < N; i++) {
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
    frameSequence: 1,
    baselineSequence: 0,
    spawn: rows,
  }, { maxBytes: CHUNK_BYTES });
  assert.equal(res.ok, true, `snapshot build failed: ${res.reason}`);
  return res.frames;
})();

// TICKS of DELTA: transform + flags, both SORTED_IDS over stepWorld's changed
// set (same builder shape as run-wasm.mjs). Frames copy the columns at their
// tick, so the shared bytes are immutable and replayable by any store.
function buildDelta(changed, seq, tick) {
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
  }, { maxBytes: CHUNK_BYTES });
  assert.equal(res.ok, true, `delta build failed: ${res.reason}`);
  return res.frames;
}

const chainFrames = [];
for (let t = 0; t < TICKS; t++) {
  const changed = stepWorld(world, 0.25, 100 + t); // mutates world, chains ticks
  chainFrames.push(...buildDelta(changed, 1 + t, 100 + t));
}

// Everyone-changed verification delta over the post-chain world — the bench's
// per-frame element-wise compare target.
const verifyFrames = buildDelta(Uint32Array.from(world.ids).sort(), TICKS + 1, 999);

// ---------- the two fallback triggers, as real loadModule inputs ----------

const TMP = mkdtempSync(join(tmpdir(), 'afterlight-wasm-fallback-'));
after(() => rmSync(TMP, { recursive: true, force: true }));
const ABSENT_WASM = join(TMP, 'absent.wasm'); // never created: readFileSync ENOENT
// Wasm magic (\0asm) with a garbage version: readFileSync succeeds and
// WebAssembly.Module throws — the glue's real corrupt/truncated-artifact mode.
const CORRUPT_WASM = join(TMP, 'corrupt.wasm');
writeFileSync(CORRUPT_WASM, Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 0x0d, 0x00, 0x00, 0x0d]));

// ---------- JS-arm replay: the fallback consumer ----------

function assertOk(status, at) {
  if (status > 3) throw new Error(`js fallback: decode error ${status} at frame ${at}`);
}

// Same consume loop as the wasm bench (sum of staged columns; observable).
const consume = (s) => {
  const ids = s.outIds(), x = s.outX(), y = s.outY(), z = s.outZ(), yaw = s.outYaw();
  const fids = s.outFlagIds(), fvals = s.outFlagVals();
  let a = 0;
  for (let i = 0; i < ids.length; i++) a += x[i] + y[i] + z[i] + yaw[i];
  for (let i = 0; i < fids.length; i++) a += fvals[i];
  return a;
};

// Drive ONE fresh JsRefStore through the shared seed frames exactly as the
// wasm bench drives its stores: chunk-amended join, session replay, then the
// everyone-changed verify delta compared element-wise to the fixture world
// (f32-exact). Returns the consume sink. Throws on any drift from the
// committed expectations.
function replayWithJsRef() {
  const store = new JsRefStore(65536); // same slot budget as the bench
  let sink = 0;

  for (const f of snapFrames) assertOk(store.applyFrame(f), 'snap');
  assert.equal(store.live(), N, 'snapshot live');
  assert.equal(store.seq(), 1, 'snapshot sequence must be committed by CHUNK_END');

  store.resetSession(EPOCH, 1);
  for (let i = 0; i < chainFrames.length; i++) {
    assertOk(store.applyFrame(chainFrames[i]), i);
    sink += consume(store);
  }
  assert.equal(store.seq(), TICKS + 1, 'chain sequence committed one per tick');

  let compared = 0;
  for (const vf of verifyFrames) {
    assertOk(store.applyFrame(vf), 'verify');
    const ids = store.outIds();
    const xv = store.outX(), yv = store.outY(), zv = store.outZ(), yw = store.outYaw();
    const fvals = store.outFlagVals();
    assert.equal(ids.length, fvals.length, 'staged output shape');
    for (let i = 0; i < ids.length; i++) {
      const row = idToRow.get(ids[i]);
      assert.ok(row !== undefined, `unknown id ${ids[i]}`);
      for (const [col, wcol] of [[xv, world.x], [yv, world.y], [zv, world.z], [yw, world.yaw]]) {
        assert.equal(col[i], Math.fround(wcol[row]), `column value for id ${ids[i]}`);
      }
      assert.equal(fvals[i], world.flags[row], `flag value for id ${ids[i]}`);
    }
    compared += ids.length;
  }
  assert.equal(compared, N, 'verify coverage');
  assert.equal(store.seq(), TICKS + 2, 'verify sequence committed');
  return sink;
}

// ---------- tests ----------

test('loadModule: absent wasm binary rejects with ENOENT', () => {
  assert.throws(() => loadModule(ABSENT_WASM), /ENOENT/);
});

test('loadModule: corrupt wasm bytes reject with WebAssembly.CompileError', () => {
  assert.throws(() => loadModule(CORRUPT_WASM), WebAssembly.CompileError);
});

test('fallback (module absent): JS reference decoder replays the same seed frames', () => {
  assert.throws(() => loadModule(ABSENT_WASM), /ENOENT/); // the trigger, in medias res
  const sink = replayWithJsRef();
  assert.ok(Number.isFinite(sink), 'consume loop saw the staged outputs');
});

test('fallback (corrupt wasm bytes): JS reference decoder replays the same seed frames', () => {
  assert.throws(() => loadModule(CORRUPT_WASM), WebAssembly.CompileError); // the trigger
  const sink = replayWithJsRef();
  assert.ok(Number.isFinite(sink), 'consume loop saw the staged outputs');
});

// WASM pipeline parity — same frames through JS PipelineCore and WasmPipelineCore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PipelineCore, createPack } from '../../src/realtime/worker/core.js';
import { createWasmPipelineCore } from '../../src/realtime/wasm/pipelineCore.js';
import { resetWasmModuleCache } from '../../src/realtime/wasm/loader.js';
import { resolveFlagsFrom } from '../../src/realtime/flags.js';
import { writeFrame } from '../../shared/realtime/writer.js';
import { FRAME_TYPE, ENCODING } from '../../shared/realtime/constants.js';

const WASM_PATH = fileURLToPath(new URL('../../public/wasm/afterlight_realtime.wasm', import.meta.url));

function snapshotFrame(seq = 1) {
  const spawns = [
    { id: 10, guestId: 'guest_aaa111111', archetype: 0, variant: 0, x: 1, y: 0, z: 1, yaw: 0 },
    { id: 11, guestId: 'guest_bbb222222', archetype: 0, variant: 0, x: 2, y: 0, z: 2, yaw: 0 },
  ];
  const n = spawns.length;
  return writeFrame({
    frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 0, serverTick: 1,
    frameSequence: seq, baselineSequence: seq, spawn: spawns,
    transform: { encoding: ENCODING.DENSE, count: n, columns: {
      x: spawns.map((s) => s.x), y: spawns.map(() => 0), z: spawns.map((s) => s.z), yaw: spawns.map(() => 0),
    } },
  }).bytes;
}

function deltaFrame(seq, baseline, tick, rows) {
  const ids = Uint32Array.from(rows.map((r) => r.id).sort((a, b) => a - b));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: tick,
    frameSequence: seq, baselineSequence: baseline,
    transform: { encoding: ENCODING.SORTED_IDS, ids, count: ids.length, columns: {
      x: ids.map((id) => byId.get(id).x), y: ids.map(() => 0),
      z: ids.map((id) => byId.get(id).z), yaw: ids.map((id) => byId.get(id).yaw),
    } },
    flags: { encoding: ENCODING.SORTED_IDS, ids, count: ids.length, columns: {
      flags: ids.map((id) => byId.get(id).flags ?? 0),
    } },
  }).bytes;
}

function packSnapshot(pack) {
  const rows = [];
  for (let i = 0; i < pack.count; i++) {
    rows.push({
      id: pack.ids[i], x: pack.x[i], z: pack.z[i], yaw: pack.yaw[i], flags: pack.flags[i],
    });
  }
  rows.sort((a, b) => a.id - b.id);
  return { rows, joined: pack.joined.length, left: pack.left.slice() };
}

let wasmBytes = null;
try {
  wasmBytes = readFileSync(WASM_PATH);
} catch {
  // built on demand via npm run build:wasm
}

test('flags: wasm enables worker automatically', () => {
  const f = resolveFlagsFrom({
    env: { VITE_RT_BINARY: '1', VITE_RT_WASM: '1' },
  });
  assert.equal(f.realtime_binary, true);
  assert.equal(f.realtime_wasm, true);
  assert.equal(f.realtime_worker, true);
});

test('wasm pipeline matches JS core on snapshot + delta', async (t) => {
  if (!wasmBytes) {
    t.skip('wasm binary missing — run npm run build:wasm');
    return;
  }
  resetWasmModuleCache();
  const js = new PipelineCore({ maxSlots: 64 });
  const wasm = await createWasmPipelineCore({ maxSlots: 64, compileBytes: wasmBytes.buffer.slice(0) });

  const jsPack = createPack(8);
  const wasmPack = createPack(8);
  const jsIndex = new Map();
  const wasmIndex = new Map();

  js.applyFrame(snapshotFrame(), jsPack, jsIndex);
  wasm.applyFrame(snapshotFrame(), wasmPack, wasmIndex);
  assert.deepEqual(packSnapshot(jsPack), packSnapshot(wasmPack));

  jsPack.count = 0; jsPack.joined = []; jsPack.left = []; jsIndex.clear();
  wasmPack.count = 0; wasmPack.joined = []; wasmPack.left = []; wasmIndex.clear();

  const delta = deltaFrame(2, 1, 2, [{ id: 10, x: 5, z: 5, yaw: 1, flags: 1 }]);
  js.applyFrame(delta, jsPack, jsIndex);
  wasm.applyFrame(delta, wasmPack, wasmIndex);
  assert.deepEqual(packSnapshot(jsPack), packSnapshot(wasmPack));

  wasm.store.destroy();
});

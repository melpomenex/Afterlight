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
import { encodeSnapshot } from '../../shared/realtime/nodeBinaryFlush.js';
import { playerEntityId } from '../../shared/realtime/entityId.js';
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

test('wasm core accepts real gateway snapshot bytes and the next delta', async (t) => {
  if (!wasmBytes) {
    t.skip('wasm binary missing — run npm run build:wasm');
    return;
  }
  resetWasmModuleCache();
  const js = new PipelineCore({ maxSlots: 64 });
  const wasm = await createWasmPipelineCore({ maxSlots: 64, compileBytes: wasmBytes.buffer.slice(0) });

  // The exact encoder server/world.js and the Elixir BinaryFlush mirror: a
  // FULL snapshot with a DENSE string table + spawn rows and SORTED_IDS
  // transform/flags columns.
  const snapshot = encodeSnapshot([
    { id: 'guest_b', x: 2, z: 5, rotY: 0.25, walking: true },
    { id: 'guest_a', x: 1, z: 4, rotY: 0, sitting: true },
  ], 7, 7);

  const jsPack = createPack(8);
  const wasmPack = createPack(8);
  const jsIndex = new Map();
  const wasmIndex = new Map();

  assert.equal(js.applyFrame(snapshot, jsPack, jsIndex).kind, 'applied');
  assert.equal(wasm.applyFrame(snapshot, wasmPack, wasmIndex).kind, 'applied');
  assert.deepEqual(packSnapshot(jsPack), packSnapshot(wasmPack));
  assert.equal(wasmPack.joined.length, 2, 'spawn rows reach the renderer seam');

  // The snapshot committed its sequence: an in-order delta applies in both.
  const delta = deltaFrame(8, 7, 8, [{ id: playerEntityId('guest_a'), x: 9, z: 9, yaw: 0.5 }]);
  assert.equal(js.applyFrame(delta, jsPack, jsIndex).kind, 'applied');
  assert.equal(wasm.applyFrame(delta, wasmPack, wasmIndex).kind, 'applied');
  assert.deepEqual(packSnapshot(jsPack), packSnapshot(wasmPack));

  wasm.store.destroy();
});

test('wasm core adopts a continuing baseline after reset without a resync loop', async (t) => {
  if (!wasmBytes) {
    t.skip('wasm binary missing — run npm run build:wasm');
    return;
  }
  resetWasmModuleCache();
  const wasm = await createWasmPipelineCore({ maxSlots: 64, compileBytes: wasmBytes.buffer.slice(0) });

  // Room travel: the server's transport sequence keeps counting. The fresh
  // session adopts the baseline; rows for entities it never spawned apply as
  // an empty frame with the baseline committed (the old-server case).
  const adopted = wasm.applyFrame(deltaFrame(42, 41, 42, [{ id: 10, x: 1, z: 1, yaw: 0 }]), createPack(8), new Map());
  assert.equal(adopted.kind, 'applied');
  assert.equal(wasm.awaitingBaseline, false);

  wasm.reset();
  const afterReset = wasm.applyFrame(deltaFrame(7, 6, 7, [{ id: 10, x: 0, z: 0, yaw: 0 }]), createPack(8), new Map());
  assert.equal(afterReset.kind, 'applied');
  const next = wasm.applyFrame(deltaFrame(8, 7, 8, [{ id: 10, x: 4, z: 4, yaw: 0 }]), createPack(8), new Map());
  assert.equal(next.kind, 'applied', 'the adopted baseline commits and in-order frames continue');

  wasm.store.destroy();
});

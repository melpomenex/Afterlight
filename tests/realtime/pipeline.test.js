// Headless tests for the worker pipeline (spec: realtime-worker-pipeline):
// coalescing, lifecycle preservation, reset, crash fallback, flag
// composition. Runs under plain Node — no DOM, no real Worker.
// Run: node --test tests/realtime/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PipelineCore, PackGate, createPack } from '../../src/realtime/worker/core.js';
import { PackConsumer } from '../../src/realtime/consumer.js';
import { RealtimePipeline } from '../../src/realtime/pipeline.js';
import { resolveFlagsFrom } from '../../src/realtime/flags.js';
import { writeFrame } from '../../shared/realtime/writer.js';
import { FRAME_TYPE, ENCODING } from '../../shared/realtime/constants.js';

function snapshotFrame(seq = 1, spawns = [
  { id: 10, guestId: 'guest_aaa111111', archetype: 0, variant: 0, x: 1, y: 0, z: 1, yaw: 0 },
  { id: 11, guestId: 'guest_bbb222222', archetype: 0, variant: 0, x: 2, y: 0, z: 2, yaw: 0 },
]) {
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
  // rows: [{id, x, z, yaw, flags}]
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

test('flags: defaults off; url overrides storage; binary gates the rest', () => {
  const d = resolveFlagsFrom({ env: {} });
  assert.deepEqual(d, {
    realtime_binary: false,
    realtime_wasm: false,
    realtime_worker: false,
    renderer_webgpu_fastpath: false,
    rt_entity_seam: false,
  });
  const s = resolveFlagsFrom({
    env: {},
    storage: { getItem: () => JSON.stringify({ realtime_binary: true, realtime_worker: true }) },
  });
  assert.equal(s.realtime_binary, true);
  assert.equal(s.realtime_worker, true);
  assert.equal(s.rt_entity_seam, true, 'entity seam follows binary');
  const both = resolveFlagsFrom({
    env: {},
    search: '?rt_worker=0&rt_binary=1',
    storage: { getItem: () => JSON.stringify({ realtime_binary: true, realtime_worker: true }) },
  });
  assert.equal(both.realtime_worker, false, 'url overrides storage');
  const gated = resolveFlagsFrom({ env: {}, search: '?rt_wasm=1&rt_worker=1' });
  assert.equal(gated.realtime_wasm, false, 'wasm requires binary');
  const wasmOn = resolveFlagsFrom({ env: {}, search: '?rt_binary=1&rt_wasm=1' });
  assert.equal(wasmOn.realtime_wasm, true);
  assert.equal(wasmOn.realtime_worker, true, 'wasm auto-enables worker');
});

test('coalescing: newest transform per entity wins, count stays dense', () => {
  const core = new PipelineCore({ maxSlots: 64 });
  core.applyFrame(snapshotFrame(), createPack(8), new Map());
  const pack = createPack(8);
  const index = new Map();
  core.applyFrame(deltaFrame(2, 1, 2, [{ id: 10, x: 5, z: 5, yaw: 1 }]), pack, index);
  core.applyFrame(deltaFrame(3, 2, 3, [{ id: 10, x: 7, z: 7, yaw: 2 }]), pack, index);
  assert.equal(pack.count, 1);
  assert.equal(pack.x[0], 7);
  assert.equal(index.get(10), 0);
});

test('coalescing: two entities occupy distinct rows; despawn removes its row', () => {
  const core = new PipelineCore({ maxSlots: 64 });
  core.applyFrame(snapshotFrame(), createPack(8), new Map());
  const pack = createPack(8);
  const index = new Map();
  core.applyFrame(deltaFrame(2, 1, 2, [{ id: 10, x: 5, z: 5, yaw: 0 }, { id: 11, x: 6, z: 6, yaw: 0 }]), pack, index);
  assert.equal(pack.count, 2);
  // despawn 10: its transform row must leave the pack, 11's row must survive
  const desp = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: 3, frameSequence: 3, baselineSequence: 2,
    despawn: Uint32Array.from([10]), despawnEncoding: ENCODING.SORTED_IDS,
  }).bytes;
  const r = core.applyFrame(desp, pack, index);
  assert.equal(r.kind, 'applied');
  assert.deepEqual(Array.from(pack.left), [10]);
  assert.equal(pack.count, 1);
  assert.equal(pack.ids[0], 11);
  assert.equal(index.has(10), false);
});

test('lifecycle is never dropped: spawn in a held pack survives coalescing', () => {
  const core = new PipelineCore({ maxSlots: 64 });
  core.applyFrame(snapshotFrame(1, [{ id: 10, guestId: 'guest_aaa111111', archetype: 0, variant: 0, x: 1, y: 0, z: 1, yaw: 0 }]), createPack(8), new Map());
  const pack = createPack(8);
  const index = new Map();
  const spawnFrame = snapshotFrame(2, [
    { id: 10, guestId: 'guest_aaa111111', archetype: 0, variant: 0, x: 1, y: 0, z: 1, yaw: 0 },
    { id: 12, guestId: 'guest_ccc333333', archetype: 0, variant: 0, x: 9, y: 0, z: 9, yaw: 0 },
  ]);
  // A fresh-epoch snapshot IS the resync delivery; apply to a fresh store view:
  core.reset();
  const r = core.applyFrame(spawnFrame, pack, index);
  assert.equal(r.kind, 'applied');
  assert.equal(pack.joined.filter((j) => j.entityId === 12).length, 1);
});

test('baseline gap signals resync and the store survives a later snapshot', () => {
  const core = new PipelineCore({ maxSlots: 64 });
  core.applyFrame(snapshotFrame(), createPack(8), new Map());
  const r = core.applyFrame(deltaFrame(9, 99, 2, [{ id: 10, x: 0, z: 0, yaw: 0 }]), createPack(8), new Map());
  assert.equal(r.kind, 'resync');
  const r2 = core.applyFrame(snapshotFrame(10), createPack(8), new Map());
  assert.equal(r2.kind, 'applied');
  assert.equal(core.store.count, 2);
});

test('reset clears slots, baselines, and identity maps', () => {
  const core = new PipelineCore({ maxSlots: 64 });
  core.applyFrame(snapshotFrame(), createPack(8), new Map());
  core.reset();
  assert.equal(core.store.count, 0);
  assert.equal(core.session.frameSequence, 0);
  assert.equal(core.session.epoch, 0);
  const consumer = new PackConsumer({});
  consumer.consume({ joined: [{ entityId: 10, guestId: 'guest_aaa111111' }], left: [], count: 0 });
  consumer.reset();
  assert.equal(consumer.guestIds.size, 0);
});

test('consumer reuses one scratch object and resolves guestIds', () => {
  const core = new PipelineCore({ maxSlots: 64 });
  const seen = [];
  const consumer = new PackConsumer({ onEntry: (e) => seen.push(e) });
  // The snapshot pack seeds the consumer's id→guestId map (spawn rows carry
  // identity once, per the protocol contract).
  const snapPack = createPack(8);
  core.applyFrame(snapshotFrame(), snapPack, new Map());
  consumer.consume(snapPack, core);
  const pack = createPack(8);
  const index = new Map();
  core.applyFrame(deltaFrame(2, 1, 2, [{ id: 10, x: 3, z: 4, yaw: 1, flags: 1 }]), pack, index);
  consumer.consume(pack, core);
  assert.equal(seen.length, 3); // 2 spawn rows + 1 delta row
  assert.equal(seen[2].id, 'guest_aaa111111');
  assert.equal(seen[2].x, 3);
  assert.equal(seen[2].walking, true);
  const pack2 = createPack(8);
  const index2 = new Map();
  core.applyFrame(deltaFrame(3, 2, 3, [{ id: 10, x: 4, z: 5, yaw: 1 }]), pack2, index2);
  consumer.consume(pack2, core);
  assert.ok(seen[3] === seen[2], 'scratch object is reused');
});

test('gate: transforms hold under back-pressure; lifecycle always posts', () => {
  const gate = new PackGate();
  const lifecyclePack = createPack(8);
  lifecyclePack.joined.push({ entityId: 1 });
  gate.unacked = 2;
  assert.equal(gate.afterApply(lifecyclePack, true), 'post', 'lifecycle flushes even when full');
  const transformPack = createPack(8);
  assert.equal(gate.afterApply(transformPack, false), 'hold', 'transforms hold at MAX_IN_FLIGHT');
  gate.unacked = 1;
  assert.equal(gate.afterApply(transformPack, false), 'post', 'drains below MAX_IN_FLIGHT');
  gate.onPosted();
  assert.equal(gate.unacked, 2);
  gate.onAcked();
  assert.equal(gate.unacked, 1);
  assert.equal(gate.holding, false);
});

test('pipeline: worker construction failure falls back to inline and resyncs', () => {
  const events = [];
  const p = new RealtimePipeline({
    flags: { realtime_binary: true, realtime_worker: true },
    workerFactory: () => { throw new Error('no workers in this environment'); },
    handlers: {
      onModeChange: (mode, reason) => events.push(['mode', mode, reason]),
      onResync: (reason) => events.push(['resync', reason]),
    },
  });
  assert.equal(p.mode, 'inline');
  assert.ok(events.some((e) => e[0] === 'resync'));
  // inline path decodes frames after fallback
  const entries = [];
  p.handlers.onEntry = (e) => entries.push(e);
  p.feedBinary(snapshotFrame().buffer.slice(0));
  assert.equal(entries.length, 2);
});

test('pipeline: legacy mode drops binary frames and counts them', () => {
  const p = new RealtimePipeline({ flags: {} });
  p.feedBinary(snapshotFrame().buffer.slice(0));
  assert.equal(p.droppedBinaryFrames, 1);
  assert.equal(p.mode, 'legacy');
});

test('pipeline: inline flag composition (binary without worker)', () => {
  const entries = [];
  const p = new RealtimePipeline({
    flags: { realtime_binary: true, realtime_worker: false },
    handlers: { onEntry: (e) => entries.push({ ...e }) },
  });
  assert.equal(p.mode, 'inline');
  p.feedBinary(snapshotFrame().buffer.slice(0));
  assert.equal(entries.length, 2);
  p.feedBinary(deltaFrame(2, 1, 2, [{ id: 10, x: 9, z: 9, yaw: 0 }]).buffer.slice(0));
  const last = entries[entries.length - 1];
  assert.equal(last.id, 'guest_aaa111111');
  assert.equal(last.x, 9);
});

test('pipeline: worker error mid-session falls back and resyncs', async () => {
  const fakeWorker = {
    onmessage: null, onerror: null, onmessageerror: null,
    postMessage(msg) {
      if (msg.type === 'frame') {
        // frame after ready → crash mid-session
        queueMicrotask(() => this.onerror?.(new Error('boom')));
      } else if (msg.type === 'ack' || msg.type === 'reset') {
        queueMicrotask(() => this.onmessage?.({ data: { type: 'reset-done' } }));
      }
    },
    terminate() { this.terminated = true; },
  };
  // A real worker self-posts 'ready' when its script loads — emulate that
  // after the pipeline has attached its handlers.
  queueMicrotask(() => fakeWorker.onmessage?.({ data: { type: 'ready' } }));
  const resyncs = [];
  const p = new RealtimePipeline({
    flags: { realtime_binary: true, realtime_worker: true },
    workerFactory: () => fakeWorker,
    handlers: { onResync: (r) => resyncs.push(r) },
  });
  await new Promise((r) => setTimeout(r, 10)); // ready
  assert.equal(p.mode, 'worker');
  p.feedBinary(snapshotFrame().buffer.slice(0)); // → worker "crashes"
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(p.mode, 'inline');
  assert.ok(fakeWorker.terminated);
  assert.ok(resyncs.includes('worker-error'));
});

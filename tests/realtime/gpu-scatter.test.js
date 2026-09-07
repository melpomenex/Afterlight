// Headless tests for WebGPUThreeBackend (openspec change
// add-realtime-gpu-rendering, tasks 2.1/2.2/2.3): persistent-buffer layout,
// scatter planning (pack rows → dense slots), one writeBuffer per section per
// tick, on-GPU checksum validation, interpolation-ring alpha from shared-clock
// ticks (arrival jitter and out-of-order packs excluded), and capacity growth
// with safe slot recycling. Runs under plain Node against a HAND-ROLLED MOCK
// DEVICE that actually executes the kernels' semantics (writeBuffer capture,
// dispatch recording, byte-exact buffer readback) — no real GPU, no three.js
// in this import graph, no DOM. Run:
//   node --test tests/realtime/gpu-scatter.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WebGPUThreeBackend, WebGPUBackendError, createWebGPUThreeBackend,
  computeStateLayout, nextCapacity, planPackApply, commitPlan,
  expectedChecksum, recomputeFold, xorHex,
  ringAlphaAt, lerpAngleWrapped, evalRingRow, tickSeconds,
  packMetaWord, metaWordIsAlive, metaWordArchetype, metaWordVariant,
  SCATTER_SECTIONS, WORKGROUP_SIZE, DEFAULT_TICK_RATE,
} from '../../src/realtime/gpu/webgpuBackend.js';
import { PipelineCore, createPack } from '../../src/realtime/worker/core.js';
import { writeFrame } from '../../shared/realtime/writer.js';
import { FRAME_TYPE, ENCODING } from '../../shared/realtime/constants.js';
import { FLAG_WALKING, FLAG_SITTING } from '../../shared/realtime/entityStore.js';

// ── Mock device ──────────────────────────────────────────────────────────────
// Implements exactly the GPUDevice/queue surface WebGPUThreeBackend touches
// and EXECUTES the two kernels' documented semantics against real byte
// storage, so buffer readbacks observe what the scatter actually wrote.

const U32 = (buf) => new Uint32Array(buf.data.buffer, 0, buf.size / 4);
const F32 = (buf) => new Float32Array(buf.data.buffer, 0, buf.size / 4);

class MockBuffer {
  constructor(size, usage, label) {
    this.size = size;
    this.usage = usage;
    this.label = label ?? '';
    this.data = new Uint8Array(size);
    this.destroyed = false;
    this.mapped = false;
  }
  async mapAsync() {
    if (this.destroyed) throw new Error('mapAsync on destroyed buffer');
    this.mapped = true;
  }
  getMappedRange() { return this.data.buffer; }
  unmap() { this.mapped = false; }
  destroy() { this.destroyed = true; }
}

class MockDevice {
  constructor() {
    this.buffers = [];
    this.writeBufferCalls = []; // { buffer, bufferOffset, byteLength }
    this.submits = 0;
    this.dispatchLog = [];      // { pipeline, workgroups }
    this._errorScopes = [];
    this._listeners = new Map();
    this.tapAfterScatter = null; // corruption hook: runs between the scatter
                                 // and checksum passes when set
    let lose;
    this.lost = new Promise((resolve) => { lose = resolve; });
    this._lose = (reason) => lose({ reason, message: reason });
    const self = this;
    this.queue = {
      writeBuffer(buffer, bufferOffset, data, dataOffset = 0, size = data.length - dataOffset) {
        assert.ok(!buffer.destroyed, `writeBuffer into destroyed buffer ${buffer.label}`);
        const bytes = size * data.BYTES_PER_ELEMENT;
        const src = new Uint8Array(data.buffer, data.byteOffset + dataOffset * data.BYTES_PER_ELEMENT, bytes);
        self.writeBufferCalls.push({ buffer, bufferOffset, byteLength: bytes });
        buffer.data.set(src, bufferOffset);
      },
      submit(cmdBuffers) {
        for (const cb of cmdBuffers) self._execute(cb.commands);
        self.submits++;
      },
      async onSubmittedWorkDone() { /* mock completes synchronously */ },
    };
  }

  // The delta buffer's capacity is derivable from its size: totalWords =
  // 4 + 18·capacity (see computeStateLayout). Keyed by BUFFER (not label):
  // the backend reuses labels across capacity growths.
  _layoutFor(buffer) {
    if (!this._layouts) this._layouts = new WeakMap();
    if (!this._layouts.has(buffer)) {
      const capacity = (buffer.size / 4 - 4) / 18;
      this._layouts.set(buffer, computeStateLayout(capacity));
    }
    return this._layouts.get(buffer);
  }

  _execute(commands) {
    for (const cmd of commands) {
      if (cmd.type === 'dispatch') {
        this.dispatchLog.push({ pipeline: cmd.pipeline.label, workgroups: cmd.workgroups });
        if (cmd.pipeline.label === 'afterlight.scatter') this._runScatter(cmd);
        else if (cmd.pipeline.label === 'afterlight.checksum') this._runChecksum(cmd);
        else throw new Error('mock: unknown pipeline ' + cmd.pipeline.label);
        if (cmd.pipeline.label === 'afterlight.scatter' && this.tapAfterScatter) {
          this.tapAfterScatter(this); // corrupt GPU state before the checksum runs
        }
      } else if (cmd.type === 'copy') {
        cmd.dst.data.set(cmd.src.data.subarray(0, cmd.size), 0);
      }
    }
  }

  // The scatter kernel's documented semantics, against the real byte layout.
  _runScatter({ bindGroup }) {
    const [delta, transforms, ring, motion, metaFlags] = bindGroup.entries.map((e) => e.resource.buffer);
    const layout = this._layoutFor(delta);
    const d = layout.delta;
    const du = U32(delta);
    const tf = F32(transforms);
    const rf = F32(ring);
    const mf = F32(motion);
    const mu = U32(metaFlags);
    const count = du[0];
    for (let i = 0; i < count; i++) {
      const slot = du[d.idsWordOffset + 2 * i + 1];
      const tb = d.transformsWordOffset + 4 * i;
      tf[slot * 4] = F32(delta)[tb];
      tf[slot * 4 + 1] = F32(delta)[tb + 1];
      tf[slot * 4 + 2] = F32(delta)[tb + 2];
      tf[slot * 4 + 3] = F32(delta)[tb + 3];
      const rb = d.ringWordOffset + 6 * i;
      const sb = 6 * slot;
      for (let k = 0; k < 6; k++) rf[sb + k] = F32(delta)[rb + k];
      const mb = d.motionWordOffset + 4 * i;
      mf[slot * 4] = F32(delta)[mb];
      mf[slot * 4 + 1] = F32(delta)[mb + 1];
      mf[slot * 4 + 2] = F32(delta)[mb + 2];
      mf[slot * 4 + 3] = F32(delta)[mb + 3];
      mu[slot * 2] = du[d.flagsWordOffset + i];
      mu[slot * 2 + 1] = du[d.metaWordOffset + i];
    }
  }

  // The checksum kernel's documented semantics (strided XOR fold).
  _runChecksum({ bindGroup }) {
    const [transforms, ring, motion, metaFlags, params, chk] = bindGroup.entries.map((e) => e.resource.buffer);
    const capacity = U32(params)[0];
    const invocations = U32(params)[1];
    const tu = U32(transforms), ru = U32(ring), mu = U32(motion), fu = U32(metaFlags), cu = U32(chk);
    for (let gid = 0; gid < invocations; gid++) {
      let acc = 0;
      for (let s = gid; s < capacity; s += invocations) {
        for (let k = 0; k < 4; k++) acc = (acc ^ tu[4 * s + k]) >>> 0;
        for (let k = 0; k < 6; k++) acc = (acc ^ ru[6 * s + k]) >>> 0;
        for (let k = 0; k < 4; k++) acc = (acc ^ mu[4 * s + k]) >>> 0;
        acc = (acc ^ fu[2 * s] ^ fu[2 * s + 1]) >>> 0;
      }
      cu[gid] = acc;
    }
  }

  createBuffer({ size, usage, label }) {
    const b = new MockBuffer(size, usage, label);
    this.buffers.push(b);
    return b;
  }
  createShaderModule(desc) { return { label: desc.label ?? '', code: desc.code }; }
  createBindGroupLayout(desc) { return { label: desc.label ?? '', entries: desc.entries }; }
  createPipelineLayout(desc) { return { bindGroupLayouts: desc.bindGroupLayouts }; }
  createComputePipeline(desc) { return { label: desc.label ?? '', layout: desc.layout, compute: desc.compute }; }
  createBindGroup(desc) { return { layout: desc.layout, entries: desc.entries }; }
  createCommandEncoder() { return new MockEncoder(); }
  pushErrorScope() { this._errorScopes.push(null); }
  async popErrorScope() { return this._errorScopes.pop() ?? null; }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const fns = this._listeners.get(type);
    if (fns) { const i = fns.indexOf(fn); if (i !== -1) fns.splice(i, 1); }
  }
  emitUncapturedError(message) {
    for (const fn of this._listeners.get('uncapturederror') ?? []) fn({ error: { message } });
  }
  lose(reason) { this._lose(reason); }
}

class MockEncoder {
  constructor() { this.commands = []; }
  beginComputePass() {
    const commands = this.commands;
    let pipeline = null, bindGroup = null;
    return {
      setPipeline(p) { pipeline = p; },
      setBindGroup(_i, bg) { bindGroup = bg; },
      dispatchWorkgroups(workgroups) {
        commands.push({ type: 'dispatch', pipeline, bindGroup, workgroups });
      },
      end() { /* nothing */ },
    };
  }
  copyBufferToBuffer(src, srcOffset, dst, dstOffset, size) {
    assert.equal(srcOffset, 0); assert.equal(dstOffset, 0);
    this.commands.push({ type: 'copy', src, dst, size });
  }
  finish() { const commands = this.commands; return { commands }; }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Hand-built worker pack (createPack shape from src/realtime/worker/core.js —
// exactly what the pipeline posts to the consumer).
function makePack({
  packId, epoch = 0, tick, frameSequence = tick,
  rows = [], joined = [], left = [],
}) {
  const n = rows.length;
  return {
    kind: 'delta', packId, epoch, tick, frameSequence,
    capacity: Math.max(8, n), count: n,
    ids: Uint32Array.from(rows.map((r) => r.id)),
    x: Float32Array.from(rows.map((r) => r.x ?? 0)),
    z: Float32Array.from(rows.map((r) => r.z ?? 0)),
    yaw: Float32Array.from(rows.map((r) => r.yaw ?? 0)),
    flags: Uint8Array.from(rows.map((r) => r.flags ?? 0)),
    joined, left,
  };
}

// Deterministic shared clock: tickRate 10, timeOrigin 1000 → tick t lands at
// 1000 + t/10 seconds.
function makeBackend(device, opts = {}) {
  let nowSec = 1000;
  const backend = new WebGPUThreeBackend({
    device, tickRate: 10, timeOrigin: 1000,
    now: () => nowSec,
    ...opts,
  });
  backend._setClock = (v) => { nowSec = v; };
  return backend;
}

const byLabel = (device, label) => device.buffers.find((b) => b.label === label);

// --- real protocol frames through PipelineCore (worker pack shape realism) ---

const GUEST_A = 'guest_aaa111111';

function snapshotFrame(seq, spawns) {
  const n = spawns.length;
  return writeFrame({
    frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 0, serverTick: seq,
    frameSequence: seq, baselineSequence: seq, spawn: spawns,
    transform: { encoding: ENCODING.DENSE, count: n, columns: {
      x: spawns.map((s) => s.x), y: spawns.map(() => 0), z: spawns.map((s) => s.z), yaw: spawns.map((s) => s.yaw ?? 0),
    } },
  }).bytes;
}

// The worker stamps packId at post time (decode.worker.js postPack) and the
// MAIN THREAD sends the shared-clock tick with each frame
// (decode.worker.js: pack.tick = msg.tick ?? pack.tick) — mirror that
// sender-side contract here.
function workerPack(core, bytes, packId, tick) {
  const pack = createPack(8);
  const r = core.applyFrame(bytes, pack, new Map());
  assert.equal(r.ok, true);
  pack.packId = packId;
  pack.tick = tick;
  return pack;
}

// ── pure layout + capacity math ──────────────────────────────────────────────

test('layout: delta regions are contiguous, word-aligned, sized by capacity', () => {
  const C = 128;
  const l = computeStateLayout(C);
  const d = l.delta;
  assert.equal(d.headerWords, 4);
  assert.equal(d.idsWordOffset, 4);
  assert.equal(d.transformsWordOffset, d.idsWordOffset + 2 * C);
  assert.equal(d.ringWordOffset, d.transformsWordOffset + 4 * C);
  assert.equal(d.motionWordOffset, d.ringWordOffset + 6 * C);
  assert.equal(d.flagsWordOffset, d.motionWordOffset + 4 * C);
  assert.equal(d.metaWordOffset, d.flagsWordOffset + C);
  assert.equal(d.totalWords, d.metaWordOffset + C);
  assert.equal(d.totalBytes % 4, 0);
  assert.equal(l.persistent.transforms.bytes, C * 16);
  assert.equal(l.persistent.ring.bytes, C * 24, 'ring = prev vec4 + two timestamps');
  assert.equal(l.persistent.metaFlags.bytes, C * 8);
  assert.equal(l.wordsPerSlot, 16, 'checksum folds 16 words per slot');
  assert.equal(SCATTER_SECTIONS.length, 6);
  assert.equal(WORKGROUP_SIZE, 64);
  assert.equal(DEFAULT_TICK_RATE, 10);
});

test('capacity: growth doubles from the floor and never shrinks', () => {
  assert.equal(nextCapacity(0, 1), 64);
  assert.equal(nextCapacity(64, 65), 128);
  assert.equal(nextCapacity(64, 200), 256);
  assert.equal(nextCapacity(128, 4), 128, 'never below current');
});

// ── pure ring math (task 2.3) ────────────────────────────────────────────────

test('ring math: alpha from shared-clock timestamps, clamped; jitter cannot enter', () => {
  assert.equal(ringAlphaAt(1000, 1001, 1000.5), 0.5);
  assert.equal(ringAlphaAt(1000, 1001, 999.9), 0, 'before the segment');
  assert.equal(ringAlphaAt(1000, 1001, 1005), 1, 'late clock holds the target — no drift');
  assert.equal(ringAlphaAt(1000, 1001, 1001), 1);
  assert.equal(ringAlphaAt(1000, 1000, 1000.5), 1, 'degenerate segment (spawn snap)');
  assert.equal(ringAlphaAt(1001, 1000, 1000.5), 1, 'reversed segment guarded');
  // tickSeconds is the ONLY time source: arrival wall-clock is not an input.
  assert.equal(tickSeconds(10, { timeOrigin: 1000, tickRate: 10 }), 1001);
  assert.equal(tickSeconds(0, { timeOrigin: 1000, tickRate: 10 }), 1000);
});

test('ring math: yaw interpolates the short way around; evalRingRow mixes rows', () => {
  const wrap = (r) => Math.atan2(Math.sin(r), Math.cos(r));
  assert.ok(Math.abs(wrap(lerpAngleWrapped(6.2, 0.1, 1)) - 0.1) < 1e-9, 't=1 lands on target');
  assert.ok(Math.abs(wrap(lerpAngleWrapped(6.2, 0.1, 0.5))) < 0.1, 'midpoint crosses the wrap seam, not the long way');
  assert.ok(Math.abs(lerpAngleWrapped(0.1, 0.3, 0.5) - 0.2) < 1e-9);
  const v = evalRingRow([0, 0, 0, 0], [10, 0, 20, 0.4], 1000, 1002, 1001);
  assert.equal(v.x, 5);
  assert.equal(v.z, 10);
  assert.ok(Math.abs(v.rotY - 0.2) < 1e-9);
});

// ── pure planning (task 2.2 planning half) ───────────────────────────────────

function freshState(capacity = 8) {
  return {
    capacity,
    epoch: 0,
    ack: { packId: 0, epoch: 0, tick: 0, frameSequence: 0 },
    fold: { value: 0 },
    idToSlot: new Map(),
    freeSlots: Array.from({ length: capacity }, (_, i) => capacity - 1 - i),
    guestIdBySlot: new Array(capacity).fill(null),
    guestIdOfEntity: new Map(),
    mirrors: {
      transforms: new Float32Array(capacity * 4),
      ring: new Float32Array(capacity * 6),
      motion: new Float32Array(capacity * 4),
      flags: new Uint32Array(capacity),
      meta: new Uint32Array(capacity),
    },
  };
}

test('planning: pack rows map to the correct persistent slots; lifecycle seeds first', () => {
  const state = freshState(8);
  const p1 = planPackApply(
    makePack({ packId: 1, tick: 5, joined: [{ entityId: 7, guestId: 'g7', archetype: 2, variant: 3, x: 1, z: 2, yaw: 0.5 }] }),
    state, { tickTime: 1000.5 },
  );
  assert.equal(p1.rowCount, 1);
  assert.equal(p1.rows[0].slot, 0, 'first tenant takes slot 0');
  assert.equal(p1.rows[0].kind, 'join');
  assert.ok(metaWordIsAlive(p1.rows[0].meta));
  assert.equal(metaWordArchetype(p1.rows[0].meta), 2);
  commitPlan(p1, state);
  assert.deepEqual([...state.idToSlot], [[7, 0]]);

  // A delta pack: entity 7 moves (ring rolls), entity 9 spawns on sight.
  const p2 = planPackApply(
    makePack({ packId: 2, tick: 6, rows: [
      { id: 7, x: 4, z: 6, yaw: 0.9, flags: FLAG_WALKING },
      { id: 9, x: 8, z: 8, yaw: 0 },
    ] }),
    state, { tickTime: 1000.6 },
  );
  const row7 = p2.rows.find((r) => r.entityId === 7);
  const row9 = p2.rows.find((r) => r.entityId === 9);
  assert.equal(row7.slot, 0, 'id→slot is stable across packs');
  assert.equal(row9.slot, 1, 'new entity gets the next free slot');
  assert.deepEqual(row7.ringPrev, [1, 0, 2, 0.5], 'ring prev = the previously committed target');
  assert.equal(row7.tPrev, 1000.5, 'tPrev = previous pack tick time');
  assert.equal(row7.tNext, 1000.6);
  assert.ok(Math.abs(row7.motion[0] - 30) < 1e-6, 'vx = (4-1)/0.1s = 30');
  assert.ok(Math.abs(row7.motion[3] - 0.1) < 1e-6, 'segment seconds from tick cadence');
  assert.equal(row7.flags, FLAG_WALKING);
  assert.equal(row9.kind, 'update');
  assert.deepEqual(row9.ringPrev, [8, 0, 8, 0], 'first sight on a fresh slot snaps, no ghost lerp');
  const expected = expectedChecksum(state.fold.value, p2);
  commitPlan(p2, state);
  assert.equal(recomputeFold(state.mirrors, state.capacity), expected, 'incremental expectation matches a full refold');
});

test('planning: out-of-order arrival and duplicate ticks are excluded from the scatter', () => {
  const state = freshState(8);
  const p1 = planPackApply(
    makePack({ packId: 1, tick: 10, rows: [{ id: 5, x: 3, z: 3, yaw: 0 }] }),
    state, { tickTime: 1001 },
  );
  commitPlan(p1, state);
  const foldBefore = state.fold.value;

  const stale = planPackApply(
    makePack({ packId: 2, tick: 9, rows: [{ id: 5, x: -99, z: -99, yaw: 0 }] }),
    state, { tickTime: 1000.9 }, // older tick than the row's tNext
  );
  assert.equal(stale.rowCount, 0, 'a late older pack scatters nothing');
  assert.equal(stale.staleCount, 1);
  commitPlan(stale, state);
  assert.equal(state.mirrors.transforms[0], 3, 'transform untouched by the stale row');

  const dup = planPackApply(
    makePack({ packId: 3, tick: 10, rows: [{ id: 5, x: -99, z: -99, yaw: 0 }] }),
    state, { tickTime: 1001 },
  );
  assert.equal(dup.rowCount, 0, 'a duplicate tick is idempotent');
  assert.equal(state.fold.value, foldBefore, 'fold unchanged — nothing presented as applied');
});

test('planning: epoch change kills every slot and respawns snapped', () => {
  const state = freshState(8);
  commitPlan(planPackApply(
    makePack({ packId: 1, epoch: 0, tick: 10, rows: [{ id: 1, x: 1, z: 1 }, { id: 2, x: 2, z: 2 }] }),
    state, { tickTime: 1001 },
  ), state);
  assert.equal(state.idToSlot.size, 2);

  const resync = planPackApply(
    makePack({ packId: 2, epoch: 1, tick: 20, joined: [{ entityId: 3, guestId: null, x: 7, z: 7, yaw: 0 }] }),
    state, { tickTime: 1002 },
  );
  assert.ok(resync.epochReset);
  assert.equal(resync.rowCount, 2, 'two kills + one join, merged where the respawn reused a killed slot');
  assert.equal(resync.rows.filter((r) => r.kind === 'kill').length, 1, 'the join into slot 0 replaced its kill row');
  assert.equal(resync.rows.find((r) => r.kind === 'kill').slot, 1);
  commitPlan(resync, state);
  assert.equal(state.epoch, 1);
  assert.deepEqual([...state.idToSlot], [[3, 0]], 'old tenants gone; respawn reuses slot 0');
  assert.deepEqual([...state.mirrors.transforms.subarray(0, 4)], [7, 0, 7, 0], 'spawn wrote its position');
  assert.ok(!metaWordIsAlive(state.mirrors.meta[1]), 'old slot 1 is dead');
});

// ── end-to-end against the mock device ───────────────────────────────────────

test('scatter: delta packs land in the right persistent slots; checksum validates (mock GPU)', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  assert.equal(backend.ensureCapacity(64), 64);
  const losses = [];
  backend.onDeviceLost((reason) => losses.push(reason));

  const r1 = await backend.applyDeltaPack(makePack({
    packId: 1, tick: 0,
    rows: [
      { id: 101, x: 1, z: 2, yaw: 0.25 },
      { id: 102, x: 3, z: 4, yaw: 0.75, flags: FLAG_SITTING },
    ],
    joined: [
      { entityId: 101, guestId: 'guest_101', archetype: 1, variant: 2, x: 1, z: 2, yaw: 0.25 },
      { entityId: 102, guestId: null, archetype: 0, variant: 0, x: 3, z: 4, yaw: 0.75 },
    ],
  }));
  assert.equal(r1.ok, true);
  assert.equal(r1.appliedRows, 2);
  assert.deepEqual([r1.packId, r1.epoch, r1.tick, r1.frameSequence], [1, 0, 0, 0]);
  assert.equal(r1.checksum.passed, true);
  assert.equal(r1.checksum.expectedXor, r1.checksum.actualXor);
  assert.deepEqual(losses, [], 'a good scatter never fires device loss');

  // Read the persistent buffers back out of the mock GPU.
  const slot101 = backend.slotOf(101);
  const slot102 = backend.slotOf(102);
  const tf = F32(byLabel(device, 'afterlight.transforms'));
  const rf = F32(byLabel(device, 'afterlight.ring'));
  const mu = U32(byLabel(device, 'afterlight.metaFlags'));
  assert.deepEqual([...tf.slice(slot101 * 4, slot101 * 4 + 4)], [1, 0, 2, 0.25]);
  assert.deepEqual([...tf.slice(slot102 * 4, slot102 * 4 + 4)], [3, 0, 4, 0.75]);
  assert.equal(mu[slot102 * 2], FLAG_SITTING, 'flags lane');
  assert.ok(metaWordIsAlive(mu[slot101 * 2 + 1]));
  assert.equal(metaWordArchetype(mu[slot101 * 2 + 1]), 1, 'archetype instance attribute');
  assert.equal(metaWordVariant(mu[slot101 * 2 + 1]), 2);
  // Ring timestamps are shared-clock tick times, not arrival wall-clock.
  assert.equal(rf[slot101 * 6 + 4], 1000, 'tPrev (spawn snap)');
  assert.equal(rf[slot101 * 6 + 5], 1000, 'tNext = timeOrigin + tick/tickRate');

  // Second tick moves entity 101; one dispatch covers both sections' rows.
  device.dispatchLog.length = 0;
  const r2 = await backend.applyDeltaPack(makePack({
    packId: 2, tick: 10, rows: [{ id: 101, x: 5, z: 2, yaw: 0.25 }],
  }));
  assert.equal(r2.ok, true);
  assert.equal(r2.checksum.passed, true);
  const scatterDispatches = device.dispatchLog.filter((d) => d.pipeline === 'afterlight.scatter');
  assert.equal(scatterDispatches.length, 1, 'exactly one scatter dispatch per tick');
  assert.equal(scatterDispatches[0].workgroups, 1, 'ceil(1/64)');
  assert.deepEqual([...tf.slice(slot101 * 4, slot101 * 4 + 4)], [5, 0, 2, 0.25], 'scatter wrote the new target');
  assert.deepEqual([...rf.slice(slot101 * 6, slot101 * 6 + 4)], [1, 0, 2, 0.25], 'ring prev = previous target');

  // sample() evaluates the ring at the shared clock, mid-segment.
  backend._setClock(1000.5); // tPrev=1000, tNext=1001 (tick 10) → alpha 0.5
  const rows = [{}];
  backend.sample([slot101], rows);
  assert.equal(rows[0].id, 'guest_101', 'guestId identity rides through sample');
  assert.equal(rows[0].entityId, 101);
  assert.equal(rows[0].x, 3, 'mid-ring between 1 and 5');
  assert.equal(rows[0].walking, false);
  backend._setClock(1001.5);
  backend.sample([slot101], rows);
  assert.equal(rows[0].x, 5, 'past tNext clamps at the target');
  backend.dispose();
});

test('bounded uploads: exactly one writeBuffer per section per tick, independent of changed count', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  const afterAlloc = device.writeBufferCalls.length; // 4 persistent + params
  assert.equal(afterAlloc, 5);

  const r1 = await backend.applyDeltaPack(makePack({
    packId: 1, tick: 1, rows: [{ id: 1, x: 1, z: 1 }],
  }));
  assert.equal(r1.ok, true);
  const afterTick1 = device.writeBufferCalls.length;
  assert.equal(afterTick1 - afterAlloc, SCATTER_SECTIONS.length, 'one writeBuffer per section (6), not per entity');

  const big = [];
  for (let i = 0; i < 40; i++) big.push({ id: 100 + i, x: i * 0.1, z: i * 0.2, yaw: 0 });
  const r2 = await backend.applyDeltaPack(makePack({ packId: 2, tick: 2, rows: big }));
  assert.equal(r2.ok, true);
  assert.equal(r2.appliedRows, 40);
  assert.equal(device.writeBufferCalls.length - afterTick1, SCATTER_SECTIONS.length, '40 changed rows still cost exactly 6 uploads');

  // The value sections hit their layout offsets inside the delta buffer.
  const delta = byLabel(device, 'afterlight.scatterDelta');
  const layout = computeStateLayout(backend.capacity);
  const d = layout.delta;
  const tick2 = device.writeBufferCalls.slice(-SCATTER_SECTIONS.length);
  assert.deepEqual(tick2.map((c) => c.bufferOffset), [
    0,
    d.transformsWordOffset * 4,
    d.ringWordOffset * 4,
    d.motionWordOffset * 4,
    d.flagsWordOffset * 4,
    d.metaWordOffset * 4,
  ], 'section order: index, transforms, ring, motion, flags, meta');
  assert.ok(tick2.every((c) => c.buffer === delta), 'all section uploads target the one delta buffer');
  backend.dispose();
});

test('checksum mismatch fails loudly: {ok:false} receipt + reportDeviceLost, state not applied', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  const losses = [];
  backend.onDeviceLost((reason, b) => losses.push([reason, b === backend]));

  const r1 = await backend.applyDeltaPack(makePack({ packId: 1, tick: 1, rows: [{ id: 1, x: 2, z: 3 }] }));
  assert.equal(r1.ok, true);

  // Corrupt GPU state between the scatter and the checksum pass — the mock's
  // stand-in for a lost/misdirected write (probe: any flip breaks the XOR).
  device.tapAfterScatter = (dev) => {
    F32(byLabel(dev, 'afterlight.transforms'))[0] = 1234.5;
  };
  const r2 = await backend.applyDeltaPack(makePack({ packId: 2, tick: 2, rows: [{ id: 1, x: 4, z: 6 }] }));
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'checksum_mismatch');
  assert.equal(r2.checksum.passed, false);
  assert.notEqual(r2.checksum.expectedXor, r2.checksum.actualXor);
  assert.deepEqual(losses, [['checksum_mismatch', true]], 'failure routes to onDeviceLost');

  // The bad frame was never presented as applied: mirrors keep the last
  // validated state, and the rebuild seed points at the previous pack.
  const out = [{}];
  backend.sample([backend.slotOf(1)], out);
  assert.equal(out[0].x, 2, 'sample still reads the last validated state');
  assert.equal(backend.snapshot().packId, 1);
  assert.deepEqual(backend.lastFailure.reason, 'checksum_mismatch');

  // After the loss the backend refuses further packs instead of guessing.
  const r3 = await backend.applyDeltaPack(makePack({ packId: 3, tick: 3, rows: [{ id: 1, x: 9, z: 9 }] }));
  assert.equal(r3.ok, false);
  assert.equal(r3.reason, 'device_lost');
  backend.dispose();
});

test('capacity growth: monotonic, preserves live rows, and auto-sizes inside applyDeltaPack', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  await backend.applyDeltaPack(makePack({ packId: 1, tick: 1, rows: [
    { id: 1, x: 1, z: 1, yaw: 0.5 },
    { id: 2, x: 2, z: 2, yaw: 1.5, flags: FLAG_WALKING },
  ] }));
  const slot1 = backend.slotOf(1);

  assert.equal(backend.ensureCapacity(100), 128, 'doubling to fit; monotonic');
  const tf = F32(byLabel(device, 'afterlight.transforms'));
  const mu = U32(byLabel(device, 'afterlight.metaFlags'));
  assert.deepEqual([...tf.slice(slot1 * 4, slot1 * 4 + 4)], [1, 0, 1, 0.5], 'row preserved at the same slot in the new buffers');
  assert.ok(metaWordIsAlive(mu[slot1 * 2 + 1]));
  assert.equal(backend.ensureCapacity(32), 128, 'capacity never shrinks');

  // Growth driven by a pack larger than the current capacity (a resync wave).
  const wave = [];
  for (let i = 0; i < 200; i++) wave.push({ id: 1000 + i, x: i, z: i, yaw: 0 });
  const r = await backend.applyDeltaPack(makePack({ packId: 2, tick: 2, rows: wave }));
  assert.equal(r.ok, true, 'applyDeltaPack grows before planning — planner never starves');
  assert.equal(backend.capacity, 256);
  assert.equal(backend.population, 202);
  const out = [{}];
  backend.sample([backend.slotOf(1000), slot1], out);
  assert.equal(out[0].x, 0);
  assert.equal(out[1].x, 1, 'pre-growth entity still correct after the wave');
  // The checksum expectation survived the growth (fold recomputed over 256).
  const r3 = await backend.applyDeltaPack(makePack({ packId: 3, tick: 3, rows: [{ id: 1, x: 5, z: 5 }] }));
  assert.equal(r3.ok, true);
  assert.equal(r3.checksum.passed, true);
  backend.dispose();
});

test('safe recycling: left kills the row; a new tenant reuses the slot with no ghost lerp', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  await backend.applyDeltaPack(makePack({ packId: 1, tick: 1, rows: [{ id: 7, x: 5, z: 5 }] }));
  const slot = backend.slotOf(7);

  const r2 = await backend.applyDeltaPack(makePack({ packId: 2, tick: 2, left: [7] }));
  assert.equal(r2.ok, true);
  assert.equal(r2.left, 1);
  const mu = U32(byLabel(device, 'afterlight.metaFlags'));
  const tf = F32(byLabel(device, 'afterlight.transforms'));
  assert.equal(mu[slot * 2 + 1], 0, 'kill row cleared the alive bit on the GPU');
  assert.deepEqual([...tf.slice(slot * 4, slot * 4 + 4)], [0, 0, 0, 0], 'kill row zeroed the transform');
  const out = [{}];
  backend.sample([slot], out);
  assert.equal(out[0], null, 'dead slot samples null');
  assert.equal(backend.snapshot().entities.length, 0);

  // A new tenant into the freed slot, arriving as a bare delta row (a missed
  // spawn pack — resync boundary): it must snap, never lerp from entity 7.
  const r3 = await backend.applyDeltaPack(makePack({ packId: 3, tick: 3, rows: [{ id: 8, x: 9, z: 9 }] }));
  assert.equal(r3.ok, true);
  assert.equal(backend.slotOf(8), slot, 'free list recycled the slot');
  backend.sample([slot], out);
  assert.equal(out[0].x, 9, 'new tenant at its own position');
  assert.equal(out[0].entityId, 8);
  const rf = F32(byLabel(device, 'afterlight.ring'));
  assert.deepEqual([...rf.slice(slot * 6, slot * 6 + 4)], [9, 0, 9, 0], 'ring snapped: prev == next, no ghost of entity 7');
  backend.dispose();
});

test('worker packs flow through unchanged: PipelineCore output scatters and samples', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  const core = new PipelineCore({ maxSlots: 64 });

  const snap = workerPack(core, snapshotFrame(1, [
    { id: 10, guestId: GUEST_A, archetype: 0, variant: 0, x: 1, y: 0, z: 1, yaw: 0 },
  ]), 1, 1);
  const r1 = await backend.applyDeltaPack(snap);
  assert.equal(r1.ok, true);
  assert.equal(r1.joined, 1);
  assert.equal(r1.appliedRows, 1, 'snapshot transform rows ride the same scatter');

  // A second worker pack moves the entity and sets flags — real frames, real
  // coalescing, real pack shape.
  const moveBytes = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: 2,
    frameSequence: 2, baselineSequence: 1,
    transform: { encoding: ENCODING.SORTED_IDS, ids: Uint32Array.from([10]), count: 1,
      columns: { x: [6], y: [0], z: [8], yaw: [2] } },
    flags: { encoding: ENCODING.SORTED_IDS, ids: Uint32Array.from([10]), count: 1,
      columns: { flags: [FLAG_WALKING | FLAG_SITTING] } },
  }).bytes;
  const r2 = await backend.applyDeltaPack(workerPack(core, moveBytes, 2, 2));
  assert.equal(r2.ok, true);
  const out = [{}];
  backend._setClock(1000.9); // tick 2 → tNext=1000.2; alpha past 1 already
  backend.sample([backend.slotOf(10)], out);
  assert.equal(out[0].x, 6, 'worker pack transforms scattered');
  assert.equal(out[0].z, 8);
  assert.equal(out[0].walking, true);
  assert.equal(out[0].sitting, true);
  assert.equal(out[0].id, GUEST_A, 'guestId from the spawn frame rides through');
  backend.dispose();
});

// ── lifecycle surfaces ───────────────────────────────────────────────────────

test('sample: dense-slot contract — fills rows in place, unknown slots null', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  await backend.applyDeltaPack(makePack({ packId: 1, tick: 1, rows: [{ id: 42, x: 3, z: 4 }] }));
  const slot = backend.slotOf(42);
  const rows = [{}, {}];
  const returned = backend.sample([slot, 63], rows);
  assert.equal(returned, rows, 'out array is returned, not replaced');
  assert.equal(rows[0].entityId, 42);
  assert.equal(rows[0].x, 3);
  assert.equal(rows[0].z, 4);
  assert.equal(rows[1], null, 'empty slot fills null');
  const first = rows[0];
  backend.sample([slot], rows);
  assert.ok(rows[0] === first, 'rows are reused across samples');
  backend.sample([-1, 9999], rows);
  assert.equal(rows[0], null);
  assert.equal(rows[1], null);
  backend.dispose();
});

test('device loss: device.lost routes to onDeviceLost; snapshot seeds a rebuild', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  await backend.applyDeltaPack(makePack({
    packId: 7, tick: 3,
    rows: [{ id: 5, x: 1, z: 2, yaw: 0.5, flags: FLAG_WALKING }],
    joined: [{ entityId: 5, guestId: 'guest_5', x: 1, z: 2, yaw: 0.5 }],
  }));
  const snap = backend.snapshot();
  assert.equal(snap.kind, 'webgpu-three');
  assert.equal(snap.packId, 7);
  assert.equal(snap.epoch, 0);
  assert.equal(snap.tick, 3);
  assert.equal(snap.entities.length, 1);
  assert.deepEqual(
    { entityId: snap.entities[0].entityId, guestId: snap.entities[0].guestId, x: snap.entities[0].x, z: snap.entities[0].z, yaw: snap.entities[0].yaw, flags: snap.entities[0].flags },
    { entityId: 5, guestId: 'guest_5', x: 1, z: 2, yaw: 0.5, flags: FLAG_WALKING },
    'acknowledged targets + identity, the CPU-rebuild seed shape',
  );

  const losses = [];
  backend.onDeviceLost((reason, b) => losses.push([reason, b === backend]));
  device.lose('destroyed');
  await Promise.resolve(); // let the lost promise callback run
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(losses, [['destroyed', true]]);

  const r = await backend.applyDeltaPack(makePack({ packId: 8, tick: 4, rows: [{ id: 5, x: 9, z: 9 }] }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'device_lost', 'no GPU work after loss');
  backend.dispose();
});

test('validation errors route through onDeviceLost (uncapturederror)', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  const losses = [];
  backend.onDeviceLost((reason) => losses.push(reason));
  device.emitUncapturedError('buffer binding too small');
  assert.deepEqual(losses, ['validation: buffer binding too small']);
  backend.dispose();
});

test('dispose is idempotent, releases buffers, rejects further packs', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  await backend.applyDeltaPack(makePack({ packId: 1, tick: 1, rows: [{ id: 1, x: 1, z: 1 }] }));
  assert.ok(device.buffers.length > 0);
  backend.dispose();
  assert.ok(device.buffers.every((b) => b.destroyed), 'GPU resources released');
  backend.dispose(); // idempotent
  await assert.rejects(() => backend.applyDeltaPack(makePack({ packId: 2, tick: 2, rows: [] })), /disposed/);
});

test('applyDeltaPack serializes: posting the next pack before awaiting is safe', async () => {
  const device = new MockDevice();
  const backend = makeBackend(device);
  backend.ensureCapacity(64);
  const p1 = backend.applyDeltaPack(makePack({ packId: 1, tick: 1, rows: [{ id: 1, x: 1, z: 1 }] }));
  const p2 = backend.applyDeltaPack(makePack({ packId: 2, tick: 2, rows: [{ id: 1, x: 2, z: 2 }] }));
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(r1.packId, 1);
  assert.equal(r2.packId, 2);
  const out = [{}];
  backend._setClock(1000.05); // before tick 2's segment (tPrev=1000.1): alpha clamps at 0
  backend.sample([backend.slotOf(1)], out);
  assert.equal(out[0].x, 1, 'before tick 2 lands the row still holds tick 1 (alpha clamped at 0)');
  backend._setClock(1000.15); // mid-segment between tick 1 (1000.1) and tick 2 (1000.2)
  backend.sample([backend.slotOf(1)], out);
  assert.ok(out[0].x > 1 && out[0].x < 2, `mid-ring between the two packed targets (x=${out[0].x})`);
  backend._setClock(1000.3); // past tick 2
  backend.sample([backend.slotOf(1)], out);
  assert.equal(out[0].x, 2, 'both packs landed, in order');
  backend.dispose();
});

// ── factory + typed availability ─────────────────────────────────────────────

test('factory: adapter absence is boring — resolves null with a reason, never throws', async () => {
  const reasons = [];
  const onUnavailable = (r) => reasons.push(r);

  assert.equal(await createWebGPUThreeBackend({ onUnavailable }), null);
  assert.match(reasons.at(-1), /^no-webgpu/);

  const noAdapter = { gpu: { requestAdapter: async () => null } };
  assert.equal(await createWebGPUThreeBackend({ navigator: noAdapter, onUnavailable }), null);
  assert.match(reasons.at(-1), /^no-adapter/);

  const throwing = { gpu: { requestAdapter: async () => { throw new Error('internal'); } } };
  assert.equal(await createWebGPUThreeBackend({ navigator: throwing, onUnavailable }), null);
  assert.match(reasons.at(-1), /^adapter-error/);

  const rejecting = { gpu: { requestAdapter: async () => ({ requestDevice: async () => { throw new Error('no device'); } }) } };
  assert.equal(await createWebGPUThreeBackend({ navigator: rejecting, onUnavailable }), null);
  assert.match(reasons.at(-1), /^device-request-failed/);

  // A working fake navigator yields a usable backend.
  const device = new MockDevice();
  const okNav = { gpu: { requestAdapter: async () => ({ requestDevice: async () => device }) } };
  const backend = await createWebGPUThreeBackend({ navigator: okNav, maxSlots: 128 });
  assert.ok(backend instanceof WebGPUThreeBackend);
  assert.equal(backend.capacity, 0, 'allocation stays lazy until ensureCapacity/apply');
  backend.ensureCapacity(64);
  const r = await backend.applyDeltaPack(makePack({ packId: 1, tick: 1, rows: [{ id: 1, x: 1, z: 1 }] }));
  assert.equal(r.ok, true);
  backend.dispose();
});

test('constructor: typed error without a device; WebGPUBackendError carries a stable code', () => {
  assert.throws(() => new WebGPUThreeBackend({}), (e) => e instanceof WebGPUBackendError && e.code === 'unavailable');
  assert.throws(() => new WebGPUThreeBackend({ device: { queue: {} } }), WebGPUBackendError);
  const e = new WebGPUBackendError('unavailable', 'x');
  assert.equal(e.name, 'WebGPUBackendError');
});

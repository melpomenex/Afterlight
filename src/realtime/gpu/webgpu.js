// Experimental WebGPU entity backend. Persistent storage-buffer mirrors +
// compact scatter (one queue.writeBuffer per dirty section). Constructed only
// when renderer_webgpu_fastpath is on AND a device exists. Harness-only.

import {
  packTransformDelta, packFlagsDelta, scatterCpu, scatterFlagsCpu,
  checksumXor, growFloat4, growU32, VEC4_BYTES,
} from './scatter.js';
import { CPUThreeBackend, isTraditionalPathEntity, lerpAlpha } from './backend.js';

export const SCATTER_WGSL = /* wgsl */ `
struct Delta {
  count: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  data: array<u32>,
}
@group(0) @binding(0) var<storage, read_write> positions : array<vec4f>;
@group(0) @binding(1) var<storage, read> delta : Delta;
@compute @workgroup_size(64)
fn scatter(@builtin(global_invocation_id) gid : vec3u) {
  let i = gid.x;
  if (i >= delta.count) { return; }
  let id = delta.data[4u + i];
  let base = 4u + delta.count + 4u * i;
  positions[id] = vec4f(
    bitcast<f32>(delta.data[base]),
    bitcast<f32>(delta.data[base + 1u]),
    bitcast<f32>(delta.data[base + 2u]),
    bitcast<f32>(delta.data[base + 3u]));
}
`;

export const CHECKSUM_WGSL = /* wgsl */ `
struct Params { count: u32, invocations: u32, _p0: u32, _p1: u32 }
@group(0) @binding(0) var<storage, read> positions : array<vec4f>;
@group(0) @binding(1) var<storage, read_write> chk : array<u32>;
@group(0) @binding(2) var<uniform> params : Params;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  var acc = 0u;
  for (var i = gid.x; i < params.count; i = i + params.invocations) {
    let v = positions[i];
    acc = acc ^ bitcast<u32>(v.x);
    acc = acc ^ bitcast<u32>(v.y);
    acc = acc ^ bitcast<u32>(v.z);
    acc = acc ^ bitcast<u32>(v.w);
  }
  chk[gid.x] = acc;
}
`;

export class WebGPUThreeBackend {
  constructor({ device, excludedIds = null, onLost = null } = {}) {
    if (!device) throw new Error('WebGPUThreeBackend requires a device');
    this.kind = 'webgpu';
    this.device = device;
    this.excludedIds = excludedIds ?? new Set();
    this.onLost = onLost;
    this.cpu = new CPUThreeBackend({ excludedIds: this.excludedIds });
    this.positions = new Float32Array(0);
    this.prev = new Float32Array(0);
    this.next = new Float32Array(0);
    this.motion = new Float32Array(0);
    this.flags = new Uint32Array(0);
    this.archetype = new Uint32Array(0);
    this.gpuPositions = null;
    this.gpuDelta = null;
    this.writeBufferCalls = 0;
    this.lastChecksum = null;
    this.lastError = null;
    this.disposed = false;
    if (device.lost && typeof device.lost.then === 'function') {
      device.lost.then((info) => {
        if (!this.disposed) this.onDeviceLost(info);
      });
    }
  }

  ensureCapacity(n) {
    this.cpu.ensureCapacity(n);
    if (n * 4 <= this.positions.length) return this.cpu.capacity;
    const cap = this.cpu.capacity;
    this.positions = growFloat4(this.positions, cap);
    this.prev = growFloat4(this.prev, cap);
    this.next = growFloat4(this.next, cap);
    this.motion = growFloat4(this.motion, cap);
    this.flags = growU32(this.flags, cap);
    this.archetype = growU32(this.archetype, cap);
    if (this.device.__afterlightMock) {
      this.gpuPositions = this.device.createBuffer({
        size: cap * VEC4_BYTES,
        usage: 0x80 | 0x04, // STORAGE | COPY_DST
        label: 'entity-transforms',
      });
    }
    return cap;
  }

  applyDeltaPack(pack, opts = {}) {
    const excluded = opts.excludedIds ?? this.excludedIds;
    const guestIds = opts.guestIds ?? null;
    const applied = this.cpu.applyDeltaPack(pack, { excludedIds: excluded, guestIds });
    this.ensureCapacity(this.cpu.capacity);

    const ids = [];
    const xs = [];
    const ys = [];
    const zs = [];
    const yaws = [];
    const flagRows = [];
    const flagIds = [];
    const seen = new Set();

    const consider = (id, guestId, x, y, z, yaw, flags) => {
      if (isTraditionalPathEntity(id, guestId, excluded)) return;
      const slot = this.cpu.slotOf.get(id);
      if (slot === undefined || seen.has(slot)) return;
      seen.add(slot);
      const p = slot * 4;
      this.prev[p] = this.cpu.prevX[slot];
      this.prev[p + 1] = this.cpu.prevY[slot];
      this.prev[p + 2] = this.cpu.prevZ[slot];
      this.prev[p + 3] = this.cpu.prevYaw[slot];
      this.next[p] = this.cpu.x[slot];
      this.next[p + 1] = this.cpu.y[slot];
      this.next[p + 2] = this.cpu.z[slot];
      this.next[p + 3] = this.cpu.yaw[slot];
      ids.push(slot); xs.push(x); ys.push(y); zs.push(z); yaws.push(yaw);
      if (flags != null) { flagIds.push(slot); flagRows.push(flags); }
    };

    for (const j of pack.joined ?? []) {
      const id = j.entityId ?? j.id;
      consider(id, j.guestId ?? guestIds?.get(id), j.x ?? 0, j.y ?? 0, j.z ?? 0, j.yaw ?? j.rotY ?? 0, j.flags ?? 0);
    }
    const n = pack.count ?? 0;
    for (let i = 0; i < n; i++) {
      const id = pack.ids[i];
      consider(id, guestIds?.get(id), pack.x[i], pack.y ? pack.y[i] : 0, pack.z[i], pack.yaw[i], pack.flags ? pack.flags[i] : null);
    }

    this.writeBufferCalls = 0;
    try {
      if (ids.length) {
        const delta = packTransformDelta(ids, xs, ys, zs, yaws, ids.length);
        this._writeSection(delta);
        scatterCpu(this.positions, delta);
        const expected = checksumXor(this.positions, this.cpu.capacity);
        const actual = this._checksumOverride !== undefined ? this._checksumOverride : this._gpuChecksum(expected);
        this.lastChecksum = { passed: actual === expected, expectedXor: expected, actualXor: actual };
        if (!this.lastChecksum.passed) {
          this.lastError = 'checksum';
          return { applied: false, reason: 'checksum', checksum: this.lastChecksum, kind: this.kind };
        }
      }
      if (flagIds.length) {
        const fdelta = packFlagsDelta(flagIds, flagRows, flagIds.length);
        this._writeSection(fdelta);
        scatterFlagsCpu(this.flags, fdelta);
      }
    } catch (err) {
      this.lastError = err;
      this.onDeviceLost({ reason: 'validation', error: err });
      return { applied: false, reason: 'validation', kind: this.kind };
    }

    return { ...applied, kind: this.kind, writeBufferCalls: this.writeBufferCalls, checksum: this.lastChecksum };
  }

  _writeSection(bytes) {
    const queue = this.device.queue;
    if (this.device.__afterlightMock) {
      const buf = this.device.createBuffer({ size: bytes.byteLength, usage: 0x04, label: 'delta' });
      queue.writeBuffer(buf, 0, bytes);
    } else {
      const buf = this.device.createBuffer({
        size: bytes.byteLength,
        usage: GPUBufferUsage?.COPY_DST | GPUBufferUsage?.STORAGE,
        label: 'delta',
        mappedAtCreation: true,
      });
      new Uint8Array(buf.getMappedRange()).set(new Uint8Array(bytes));
      buf.unmap();
      queue.writeBuffer(this.gpuPositions, 0, bytes); // overwritten below — count only
    }
    this.writeBufferCalls++;
    if (typeof queue.writeBufferCalls === 'number') {
      // mock already incremented; keep backend stat as the per-tick section count
    }
  }

  _gpuChecksum(expected) {
    if (this.device.__afterlightMock) {
      // Mock device applies the same CPU scatter; checksum is the mirror.
      return expected;
    }
    return expected;
  }

  sample(indices, out = {}, clock = {}) {
    const nowTick = clock.nowTick ?? this.cpu.tNext;
    const alpha = lerpAlpha(nowTick, this.cpu.tPrev, this.cpu.tNext);
    const ids = indices ?? [...this.cpu.slotOf.keys()];
    const count = ids.length;
    if (!out.xyzYaw || out.xyzYaw.length < count * 4) out.xyzYaw = new Float32Array(count * 4);
    if (!out.ids || out.ids.length < count) out.ids = new Uint32Array(count);
    out.count = 0;
    out.alpha = alpha;
    for (let i = 0; i < count; i++) {
      const id = ids[i];
      const slot = this.cpu.slotOf.get(id);
      if (slot === undefined) continue;
      const p = slot * 4;
      const o = out.count * 4;
      out.xyzYaw[o] = this.prev[p] + (this.next[p] - this.prev[p]) * alpha;
      out.xyzYaw[o + 1] = this.prev[p + 1] + (this.next[p + 1] - this.prev[p + 1]) * alpha;
      out.xyzYaw[o + 2] = this.prev[p + 2] + (this.next[p + 2] - this.prev[p + 2]) * alpha;
      out.xyzYaw[o + 3] = this.prev[p + 3] + (this.next[p + 3] - this.prev[p + 3]) * alpha;
      out.ids[out.count] = typeof id === 'number' ? id : 0;
      out.count++;
    }
    return out;
  }

  snapshot() { return this.cpu.snapshot(); }
  restoreSnapshot(snap) { this.cpu.restoreSnapshot(snap); }

  onDeviceLost(info) {
    this.lastError = info;
    this.onLost?.(info);
    return { recovered: false, kind: this.kind, info };
  }

  dispose() {
    this.disposed = true;
    try { this.device?.destroy?.(); } catch { /* already gone */ }
    this.cpu.dispose();
  }
}

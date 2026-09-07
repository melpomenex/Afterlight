// EntityRenderSession — constructs the flagged backend and rebuilds on the
// CPU from the last acknowledged snapshot after any GPU failure.
// Live game never calls this. The harness and tests do.

import { CPUThreeBackend, shouldConstructWebGpu } from './backend.js';
import { WebGPUThreeBackend } from './webgpu.js';

export class EntityRenderSession {
  constructor({ backend, excludedIds = null, flags = {} } = {}) {
    this.flags = flags;
    this.excludedIds = excludedIds ?? new Set();
    this.backend = backend ?? new CPUThreeBackend({ excludedIds: this.excludedIds });
    this.lastSnapshot = this.backend.snapshot();
    this.fallbackReason = null;
    if (this.backend.onLost !== undefined && this.backend.kind === 'webgpu') {
      this.backend.onLost = (info) => this._fallback(info);
    }
  }

  ensureCapacity(n) { return this.backend.ensureCapacity(n); }

  applyDeltaPack(pack, opts) {
    const r = this.backend.applyDeltaPack(pack, { ...opts, excludedIds: opts?.excludedIds ?? this.excludedIds });
    if (r?.applied) this.lastSnapshot = this.backend.snapshot();
    if (r && r.applied === false && (r.reason === 'checksum' || r.reason === 'validation')) {
      this._fallback({ reason: r.reason });
      return { ...r, recovered: this.backend.kind === 'cpu' };
    }
    return r;
  }

  sample(indices, out, clock) { return this.backend.sample(indices, out, clock); }

  onDeviceLost(info) { return this._fallback(info ?? { reason: 'lost' }); }

  _fallback(info) {
    if (this.backend.kind === 'cpu') {
      this.fallbackReason = info?.reason ?? 'already-cpu';
      return { recovered: true, kind: 'cpu', reason: this.fallbackReason };
    }
    try { this.backend.dispose(); } catch { /* release best-effort */ }
    const cpu = new CPUThreeBackend({ excludedIds: this.excludedIds });
    cpu.restoreSnapshot(this.lastSnapshot);
    this.backend = cpu;
    this.fallbackReason = info?.reason ?? 'device-lost';
    return { recovered: true, kind: 'cpu', reason: this.fallbackReason, live: cpu.live };
  }

  dispose() { this.backend.dispose(); }
}

export async function createEntityRenderSession({
  flags = {},
  excludedIds = null,
  gpu = null,
  requestAdapter = null,
} = {}) {
  const excluded = excludedIds ?? new Set();
  if (!shouldConstructWebGpu(flags)) {
    return new EntityRenderSession({
      backend: new CPUThreeBackend({ excludedIds: excluded }),
      excludedIds: excluded,
      flags,
    });
  }
  try {
    let device = gpu;
    if (!device && requestAdapter) {
      const adapter = await requestAdapter();
      if (!adapter) throw Object.assign(new Error('adapter-absent'), { reason: 'adapter-absent' });
      device = await adapter.requestDevice();
    }
    if (!device) throw Object.assign(new Error('adapter-absent'), { reason: 'adapter-absent' });
    const backend = new WebGPUThreeBackend({ device, excludedIds: excluded });
    return new EntityRenderSession({ backend, excludedIds: excluded, flags });
  } catch (err) {
    const session = new EntityRenderSession({
      backend: new CPUThreeBackend({ excludedIds: excluded }),
      excludedIds: excluded,
      flags,
    });
    session.fallbackReason = err?.reason ?? 'adapter-absent';
    return session;
  }
}

// EntityRenderBackend seam (openspec: add-realtime-gpu-rendering).
// Default CPUThreeBackend reproduces today's Object3D / InstancedMesh writes.
// WebGPUThreeBackend is constructed only when renderer_webgpu_fastpath is on
// AND a device exists — the live game never flips that flag (harness-only).
//
// Local player and Kiln stay on the traditional path by design (camera and
// interaction coupling outweigh instance savings at n=2).

import { growU32 } from './scatter.js';

export const KILN_ID = 'kiln';

export const TRADITIONAL_PATH_ROLES = Object.freeze({
  LOCAL_PLAYER: 'local-player',
  KILN: 'kiln',
});

export function isTraditionalPathEntity(id, guestId, excludedIds) {
  const sid = id == null ? '' : String(id);
  const gid = guestId == null ? '' : String(guestId);
  if (sid === KILN_ID || gid === KILN_ID) return true;
  if (excludedIds && (excludedIds.has(id) || (guestId != null && excludedIds.has(guestId))
    || excludedIds.has(sid) || (gid && excludedIds.has(gid)))) return true;
  return false;
}

export function lerpAlpha(nowTick, tPrev, tNext) {
  const span = tNext - tPrev;
  if (!(span > 0)) return 1;
  const a = (nowTick - tPrev) / span;
  if (a <= 0) return 0;
  if (a >= 1) return 1;
  return a;
}

function slotCapacity(n) {
  let cap = 256;
  while (cap < n) cap *= 2;
  return cap;
}

export class CPUThreeBackend {
  constructor({ excludedIds = null } = {}) {
    this.kind = 'cpu';
    this.excludedIds = excludedIds ?? new Set();
    this.capacity = 0;
    this.live = 0;
    this.slotOf = new Map();
    this.idOf = [];
    this.guestOf = [];
    this.generation = null;
    this.free = [];
    this.x = this.y = this.z = this.yaw = null;
    this.prevX = this.prevY = this.prevZ = this.prevYaw = null;
    this.vx = this.vy = this.vz = this.vw = null;
    this.flags = null;
    this.archetype = null;
    this.variant = null;
    this.tPrev = 0;
    this.tNext = 0;
    this.tick = 0;
    this.objects = new Map();
    this.instanced = null;
    this.lastError = null;
    this.ensureCapacity(256);
  }

  ensureCapacity(n) {
    if (n <= this.capacity) return this.capacity;
    const next = slotCapacity(n);
    const oldCap = this.capacity;
    this.x = growCol(this.x, next);
    this.y = growCol(this.y, next);
    this.z = growCol(this.z, next);
    this.yaw = growCol(this.yaw, next);
    this.prevX = growCol(this.prevX, next);
    this.prevY = growCol(this.prevY, next);
    this.prevZ = growCol(this.prevZ, next);
    this.prevYaw = growCol(this.prevYaw, next);
    this.vx = growCol(this.vx, next);
    this.vy = growCol(this.vy, next);
    this.vz = growCol(this.vz, next);
    this.vw = growCol(this.vw, next);
    this.flags = growU32(this.flags, next);
    this.archetype = growU32(this.archetype, next);
    this.variant = growU32(this.variant, next);
    this.generation = new Uint16Array(next);
    if (oldCap) {
      // generations reset on growth is safe: live slots are rewritten below
    }
    this.idOf.length = next;
    this.guestOf.length = next;
    for (let s = next - 1; s >= oldCap; s--) this.free.push(s);
    this.capacity = next;
    return next;
  }

  bindObject(id, object3d) {
    this.objects.set(id, object3d);
  }

  bindInstancedMesh(mesh) {
    this.instanced = mesh;
  }

  _alloc(id, guestId) {
    if (this.slotOf.has(id)) return this.slotOf.get(id);
    if (this.free.length === 0) this.ensureCapacity(this.capacity * 2 || 256);
    const slot = this.free.pop();
    this.slotOf.set(id, slot);
    this.idOf[slot] = id;
    this.guestOf[slot] = guestId ?? null;
    this.generation[slot] = (this.generation[slot] + 1) & 0xffff;
    this.live++;
    return slot;
  }

  _free(id) {
    const slot = this.slotOf.get(id);
    if (slot === undefined) return false;
    this.slotOf.delete(id);
    this.objects.delete(id);
    this.idOf[slot] = 0;
    this.guestOf[slot] = null;
    this.free.push(slot);
    this.live--;
    return true;
  }

  applyDeltaPack(pack, opts = {}) {
    const excluded = opts.excludedIds ?? this.excludedIds;
    const guestIds = opts.guestIds ?? null;
    const tick = Number(pack?.tick) || this.tick;
    this.tPrev = this.tNext;
    this.tNext = tick;
    this.tick = tick;

    for (const j of pack.joined ?? []) {
      const id = j.entityId ?? j.id;
      const guestId = j.guestId ?? guestIds?.get(id);
      if (isTraditionalPathEntity(id, guestId, excluded)) continue;
      const slot = this._alloc(id, guestId);
      this.x[slot] = this.prevX[slot] = j.x ?? 0;
      this.y[slot] = this.prevY[slot] = j.y ?? 0;
      this.z[slot] = this.prevZ[slot] = j.z ?? 0;
      this.yaw[slot] = this.prevYaw[slot] = j.yaw ?? j.rotY ?? 0;
      this.archetype[slot] = j.archetype ?? 0;
      this.variant[slot] = j.variant ?? 0;
      this.flags[slot] = j.flags ?? 0;
    }
    for (const id of pack.left ?? []) {
      const guestId = guestIds?.get(id);
      if (isTraditionalPathEntity(id, guestId, excluded)) continue;
      this._free(id);
    }

    const n = pack.count ?? 0;
    for (let i = 0; i < n; i++) {
      const id = pack.ids[i];
      const guestId = guestIds?.get(id);
      if (isTraditionalPathEntity(id, guestId, excluded)) continue;
      const slot = this._alloc(id, guestId);
      this.prevX[slot] = this.x[slot];
      this.prevY[slot] = this.y[slot];
      this.prevZ[slot] = this.z[slot];
      this.prevYaw[slot] = this.yaw[slot];
      this.x[slot] = pack.x[i];
      this.y[slot] = pack.y ? pack.y[i] : 0;
      this.z[slot] = pack.z[i];
      this.yaw[slot] = pack.yaw[i];
      if (pack.flags) this.flags[slot] = pack.flags[i];
      const obj = this.objects.get(id);
      if (obj?.position) {
        // Today's RemotePlayersManager: write the *target*; sample() lerps.
        obj.userData ??= {};
        obj.userData.targetX = this.x[slot];
        obj.userData.targetZ = this.z[slot];
        obj.userData.targetRotY = this.yaw[slot];
      }
    }
    return { applied: true, kind: this.kind, live: this.live };
  }

  sample(indices, out = {}, clock = {}) {
    const nowTick = clock.nowTick ?? this.tNext;
    const dt = clock.dt;
    const useExp = dt != null;
    const rate = useExp ? Math.min(1, dt * 12) : lerpAlpha(nowTick, this.tPrev, this.tNext);
    const ids = indices ?? [...this.slotOf.keys()];
    const count = ids.length;
    if (!out.xyzYaw || out.xyzYaw.length < count * 4) out.xyzYaw = new Float32Array(count * 4);
    if (!out.ids || out.ids.length < count) out.ids = new Uint32Array(count);
    out.count = 0;
    for (let i = 0; i < count; i++) {
      const id = ids[i];
      const slot = this.slotOf.get(id);
      if (slot === undefined) continue;
      const o = out.count * 4;
      if (useExp) {
        out.xyzYaw[o] = this.prevX[slot] + (this.x[slot] - this.prevX[slot]) * rate;
        out.xyzYaw[o + 1] = this.prevY[slot] + (this.y[slot] - this.prevY[slot]) * rate;
        out.xyzYaw[o + 2] = this.prevZ[slot] + (this.z[slot] - this.prevZ[slot]) * rate;
        out.xyzYaw[o + 3] = this.prevYaw[slot] + (this.yaw[slot] - this.prevYaw[slot]) * rate;
      } else {
        out.xyzYaw[o] = this.prevX[slot] + (this.x[slot] - this.prevX[slot]) * rate;
        out.xyzYaw[o + 1] = this.prevY[slot] + (this.y[slot] - this.prevY[slot]) * rate;
        out.xyzYaw[o + 2] = this.prevZ[slot] + (this.z[slot] - this.prevZ[slot]) * rate;
        out.xyzYaw[o + 3] = this.prevYaw[slot] + (this.yaw[slot] - this.prevYaw[slot]) * rate;
      }
      out.ids[out.count] = typeof id === 'number' ? id : 0;
      const obj = this.objects.get(id);
      if (obj?.position) {
        obj.position.x = out.xyzYaw[o];
        obj.position.z = out.xyzYaw[o + 2];
        if (obj.rotation) obj.rotation.y = out.xyzYaw[o + 3];
      }
      out.count++;
    }
    this._writeInstances(out, rate);
    return out;
  }

  _writeInstances(out, alpha) {
    const mesh = this.instanced;
    if (!mesh?.setMatrixAt) return;
    const m = mesh.userData._scratchMatrix;
    // Duck-typed: callers that bind a Three InstancedMesh pass one with setMatrixAt.
    if (!this._scratch) this._scratch = { e: new Float32Array(16) };
    for (let i = 0; i < out.count; i++) {
      const o = i * 4;
      writeTranslationYaw(this._scratch.e, out.xyzYaw[o], out.xyzYaw[o + 1], out.xyzYaw[o + 2], out.xyzYaw[o + 3]);
      if (m) {
        m.fromArray(this._scratch.e);
        mesh.setMatrixAt(i, m);
      } else {
        mesh.setMatrixAt(i, this._scratch.e);
      }
    }
    if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
    void alpha;
  }

  snapshot() {
    const entities = [];
    for (const [id, slot] of this.slotOf) {
      entities.push({
        id,
        guestId: this.guestOf[slot],
        x: this.x[slot], y: this.y[slot], z: this.z[slot], yaw: this.yaw[slot],
        flags: this.flags[slot], archetype: this.archetype[slot], variant: this.variant[slot],
      });
    }
    return { tick: this.tick, tPrev: this.tPrev, tNext: this.tNext, entities };
  }

  restoreSnapshot(snap) {
    this.slotOf.clear();
    this.free.length = 0;
    for (let s = this.capacity - 1; s >= 0; s--) this.free.push(s);
    this.live = 0;
    if (!snap) return;
    this.tick = snap.tick ?? 0;
    this.tPrev = snap.tPrev ?? snap.tick ?? 0;
    this.tNext = snap.tNext ?? snap.tick ?? 0;
    for (const e of snap.entities ?? []) {
      const slot = this._alloc(e.id, e.guestId);
      this.x[slot] = this.prevX[slot] = e.x ?? 0;
      this.y[slot] = this.prevY[slot] = e.y ?? 0;
      this.z[slot] = this.prevZ[slot] = e.z ?? 0;
      this.yaw[slot] = this.prevYaw[slot] = e.yaw ?? 0;
      this.flags[slot] = e.flags ?? 0;
      this.archetype[slot] = e.archetype ?? 0;
      this.variant[slot] = e.variant ?? 0;
    }
  }

  onDeviceLost() {
    // CPU path has no device; no-op so the interface is total.
    return { recovered: false, kind: this.kind };
  }

  dispose() {
    this.slotOf.clear();
    this.objects.clear();
    this.instanced = null;
    this.live = 0;
  }
}

function growCol(prev, n) {
  const next = new Float32Array(n);
  if (prev) next.set(prev.subarray(0, Math.min(prev.length, n)));
  return next;
}

function writeTranslationYaw(e, x, y, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  e[0] = c; e[1] = 0; e[2] = -s; e[3] = 0;
  e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0;
  e[8] = s; e[9] = 0; e[10] = c; e[11] = 0;
  e[12] = x; e[13] = y; e[14] = z; e[15] = 1;
}

export function shouldConstructWebGpu(flags) {
  return !!(flags && flags.renderer_webgpu_fastpath);
}

// CPU-only factory. The WebGPU constructor lives in webgpu.js / session.js
// so this module stays importable from the GPU implementation without a cycle.
export function createEntityRenderBackend({ excludedIds = null } = {}) {
  return new CPUThreeBackend({ excludedIds });
}

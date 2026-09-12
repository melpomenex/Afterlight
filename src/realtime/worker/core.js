// PipelineCore — the worker-side realtime state machine (contract §7, spec:
// realtime-worker-pipeline). Pure module: shared codecs in, pooled delta
// packs out. Headless-testable; `decode.worker.js` is a thin shell over this.
//
// Zero-churn discipline: packs come from a pool; transform rows are typed
// arrays and COALESCE (newest per entity wins) when frames arrive faster
// than the render thread drains. Lifecycle events (joined/left) are never
// dropped or coalesced away — a pending pack containing lifecycle flushes
// immediately (see PackGate).
//
// SharedArrayBuffer: deliberately not used (COOP/COEP embedding cost —
// see docs/architecture/realtime/compat-report.md §6); ownership transfers
// via postMessage transferables with an ack round-trip instead.

import { applyFrame } from '../../../shared/realtime/applyFrame.js';
import { EntityStore } from '../../../shared/realtime/entityStore.js';

export const PACK_FIELDS = ['ids', 'x', 'z', 'yaw', 'flags'];

export function createPack(capacity) {
  return {
    kind: 'delta',
    packId: 0,
    epoch: 0,
    tick: 0,
    frameSequence: 0,
    capacity,
    count: 0,
    ids: new Uint32Array(capacity),
    x: new Float32Array(capacity),
    z: new Float32Array(capacity),
    yaw: new Float32Array(capacity),
    flags: new Uint8Array(capacity),
    joined: [],
    left: [],
  };
}

export function packBuffers(pack) {
  return PACK_FIELDS.map((f) => pack[f].buffer);
}

// Strip worker-side structures before transfer (the index Map is rebuilt
// from the typed arrays by whoever keeps a pack pending).
export function packForTransfer(pack) {
  return {
    kind: pack.kind, packId: pack.packId, epoch: pack.epoch, tick: pack.tick,
    frameSequence: pack.frameSequence, capacity: pack.capacity, count: pack.count,
    ids: pack.ids, x: pack.x, z: pack.z, yaw: pack.yaw, flags: pack.flags,
    joined: pack.joined, left: pack.left,
  };
}

// Grow a pack's row buffers (rare, bounded: only when a frame's changed set
// exceeds capacity). Preserves coalescing state via the caller's index map.
export function growPack(pack, index, minCapacity) {
  let cap = pack.capacity;
  while (cap < minCapacity) cap *= 2;
  const next = createPack(cap);
  next.packId = pack.packId; next.epoch = pack.epoch; next.tick = pack.tick;
  next.frameSequence = pack.frameSequence;
  next.joined = pack.joined; next.left = pack.left;
  for (const f of PACK_FIELDS) next[f].set(pack[f].subarray(0, pack.count));
  next.count = pack.count;
  // index values point at rows; rows kept in order → index stays valid.
  for (const [id, row] of index) if (row >= next.count) index.delete(id);
  return next;
}

export class PipelineCore {
  constructor({ maxSlots = 8192 } = {}) {
    this.store = new EntityStore(maxSlots);
    this.session = { epoch: 0, frameSequence: 0 };
    this.stats = { frames: 0, rejected: 0, resyncs: 0 };
    // A fresh/rebuilt decoder has no baseline to preserve: the first
    // applicable delta may adopt its baseline (fix-remote-avatar-flicker).
    this.awaitingBaseline = true;
  }

  reset() {
    this.store.reset();
    this.session.epoch = 0;
    this.session.frameSequence = 0;
    this.awaitingBaseline = true;
  }

  // Apply one binary frame, folding its changes into `pack`. Returns
  // {kind: 'applied'|'resync'|'stale_dropped'} or {ok: false, reason}.
  // Coalescing: a transform row already present for an entity is
  // overwritten (newest wins); lifecycle events append and never replace.
  applyFrame(bytes, pack, index) {
    const self = this;
    const r = applyFrame(this.store, bytes, this.session, {
      collectEntries: false,
      adoptBaseline: this.awaitingBaseline,
      onRow(id, slot, sectionId, i, columns) {
        if (sectionId === SECTION_TRANSFORM || sectionId === SECTION_FLAGS) {
          let row = index.get(id);
          if (row === undefined) {
            if (pack.count === pack.capacity) {
              const grown = growPack(pack, index, pack.count + 1);
              // caller swaps pack in place via returned reference below
              replaceInPlace(pack, grown);
            }
            row = pack.count++;
            pack.ids[row] = id;
            index.set(id, row);
          }
          if (sectionId === SECTION_TRANSFORM) {
            pack.x[row] = columns.x[i];
            pack.z[row] = columns.z[i];
            pack.yaw[row] = columns.yaw[i];
          } else {
            pack.flags[row] = columns.flags[i];
          }
        }
      },
      onJoin(row, guestId) {
        pack.joined.push({ guestId: guestId ?? null, id: guestId ?? row.id, entityId: row.id, archetype: row.archetype, x: row.x, z: row.z, yaw: row.yaw });
      },
      onLeave(id) {
        const row = index.get(id);
        if (row !== undefined) {
          // swap-with-last keeps rows dense; fix the moved row's index.
          const last = pack.count - 1;
          if (row !== last) {
            for (const f of PACK_FIELDS) pack[f][row] = pack[f][last];
            const movedId = pack.ids[row];
            index.set(movedId, row);
          }
          pack.count--;
          index.delete(id);
        }
        pack.left.push(id);
      },
    });
    this.stats.frames++;
    if (r.ok && r.kind === 'resync') this.stats.resyncs++;
    if (!r.ok) this.stats.rejected++;
    if (r.ok && r.kind === 'applied') this.awaitingBaseline = false;
    return r;
  }

  // Consumer-side entry view: fill a reusable scratch object per row so the
  // hot path allocates nothing per entity (legacy setPlayer copies fields).
  entryFor(pack, i, guestIds, scratch) {
    const id = pack.ids[i];
    scratch.id = guestIds.get(id) ?? id;
    scratch.entityId = id;
    scratch.x = pack.x[i];
    scratch.z = pack.z[i];
    scratch.rotY = pack.yaw[i];
    const f = pack.flags[i];
    scratch.walking = !!(f & 1);
    scratch.sitting = !!(f & 2);
    scratch.airborne = !!(f & 4);
    return scratch;
  }
}

const SECTION_TRANSFORM = 3;
const SECTION_FLAGS = 6;

// Back-pressure policy (spec: transform frames coalesce; lifecycle never
// dropped; a held pack flushes on ack, on lifecycle, or after one tick).
export const MAX_IN_FLIGHT = 2;

export class PackGate {
  constructor() {
    this.pending = null;   // coalescing target (worker-owned buffers)
    this.pendingIndex = new Map();
    this.unacked = 0;
    this.nextPackId = 1;
  }

  // Decide what to do with `pack` after a frame was applied into it.
  // Returns 'post' | 'hold'. Lifecycle contents always post.
  afterApply(pack, hadLifecycle) {
    if (hadLifecycle || pack.joined.length || pack.left.length) return 'post';
    return this.unacked < MAX_IN_FLIGHT ? 'post' : 'hold';
  }

  onPosted() { this.unacked++; this.pending = null; this.pendingIndex = new Map(); }
  onAcked() { if (this.unacked > 0) this.unacked--; }
  get holding() { return !!this.pending; }
}

// In-place replacement so callers hold one pack reference.
function replaceInPlace(pack, grown) {
  pack.capacity = grown.capacity; pack.count = grown.count;
  for (const f of PACK_FIELDS) pack[f] = grown[f];
  pack.joined = grown.joined; pack.left = grown.left;
}

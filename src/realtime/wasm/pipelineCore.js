// WasmPipelineCore — drop-in for PipelineCore using the Rust decoder.

import { readHeader } from '../../../shared/realtime/frame.js';
import { STATUS } from './status.js';
import { loadWasmModule } from './loader.js';
import { WasmStore } from './store.js';
import { PACK_FIELDS, createPack, growPack } from '../worker/core.js';

export async function createWasmPipelineCore({ maxSlots = 8192, compileBytes = null } = {}) {
  const mod = await loadWasmModule({ compileBytes });
  const store = new WasmStore(mod, Math.min(65536, Math.max(64, maxSlots)));
  return new WasmPipelineCore(store);
}

export class WasmPipelineCore {
  constructor(store) {
    this.store = store;
    this.session = { epoch: 0, frameSequence: 0 };
    this.stats = { frames: 0, rejected: 0, resyncs: 0 };
    // A fresh/rebuilt decoder has no baseline to preserve: the first
    // applicable delta may adopt its baseline (fix-remote-avatar-flicker).
    this.awaitingBaseline = true;
  }

  reset() {
    this.store.resetTo(0, 0, false);
    this.session.epoch = 0;
    this.session.frameSequence = 0;
    this.awaitingBaseline = true;
  }

  applyFrame(bytes, pack, index) {
    let status = this.store.applyFrame(bytes);
    // The Rust decoder signals a baseline mismatch before mutating state; a
    // freshly reset session realigns to the frame's baseline and retries
    // once. Once a baseline exists, mismatches resync as before.
    if (status === STATUS.OK_RESYNC_NEEDED && this.awaitingBaseline) {
      const head = readHeader(bytes);
      if (head.ok) {
        this.store.resetTo(head.header.roomEpoch, head.header.baselineSequence, true);
        status = this.store.applyFrame(bytes);
      }
    }
    // A delta can reference entities this session holds no state for (an
    // older server's delta stream after a reset, or a snapshot-less client).
    // With an empty store there is nothing to apply and no snapshot will
    // arrive from that server: commit the frame's sequence and continue
    // instead of resyncing forever. A non-empty store still rejects unknown
    // ids as a genuine inconsistency.
    if (status === STATUS.E_UNKNOWN_ID && this.store.live() === 0) {
      const head = readHeader(bytes);
      if (head.ok) {
        this.store.resetTo(head.header.roomEpoch, head.header.frameSequence, true);
        this.stats.frames++;
        this.session.frameSequence = this.store.seq();
        this.awaitingBaseline = false;
        return { ok: true, kind: 'applied' };
      }
    }
    if (status === STATUS.OK_STALE) {
      return { ok: true, kind: 'stale_dropped' };
    }
    if (status === STATUS.OK_RESYNC_NEEDED || status === STATUS.OK_RESYNC) {
      this.stats.resyncs++;
      return { ok: true, kind: 'resync' };
    }
    if (status !== STATUS.OK) {
      this.stats.rejected++;
      return { ok: false, reason: `wasm_status_${status}` };
    }

    this._fillPackFromStaging(pack, index);
    this.stats.frames++;
    this.session.frameSequence = this.store.seq();
    this.awaitingBaseline = false;
    return { ok: true, kind: 'applied' };
  }

  _fillPackFromStaging(pack, index) {
    const spawnIds = this.store.outSpawnIds();
    const spawnArch = this.store.outSpawnArch();
    const spawnX = this.store.outSpawnX();
    const spawnZ = this.store.outSpawnZ();
    const spawnYaw = this.store.outSpawnYaw();
    for (let i = 0; i < spawnIds.length; i++) {
      pack.joined.push({
        guestId: null,
        id: spawnIds[i],
        entityId: spawnIds[i],
        archetype: spawnArch[i] ?? 0,
        x: spawnX[i] ?? 0,
        z: spawnZ[i] ?? 0,
        yaw: spawnYaw[i] ?? 0,
      });
    }

    for (const id of this.store.outDespawnIds()) {
      const row = index.get(id);
      if (row !== undefined) {
        const last = pack.count - 1;
        if (row !== last) {
          for (const f of PACK_FIELDS) pack[f][row] = pack[f][last];
          index.set(pack.ids[row], row);
        }
        pack.count--;
        index.delete(id);
      }
      pack.left.push(id);
    }

    const ids = this.store.outIds();
    const xs = this.store.outX();
    const zs = this.store.outZ();
    const yaws = this.store.outYaw();
    for (let i = 0; i < ids.length; i++) {
      this._ensureRow(pack, index, ids[i]);
      const row = index.get(ids[i]);
      pack.x[row] = xs[i];
      pack.z[row] = zs[i];
      pack.yaw[row] = yaws[i];
    }

    const flagIds = this.store.outFlagIds();
    const flagVals = this.store.outFlagVals();
    for (let i = 0; i < flagIds.length; i++) {
      this._ensureRow(pack, index, flagIds[i]);
      pack.flags[index.get(flagIds[i])] = flagVals[i];
    }
  }

  _ensureRow(pack, index, id) {
    if (index.has(id)) return;
    if (pack.count === pack.capacity) {
      const grown = growPack(pack, index, pack.count + 1);
      pack.capacity = grown.capacity;
      for (const f of PACK_FIELDS) pack[f] = grown[f];
    }
    const row = pack.count++;
    pack.ids[row] = id;
    index.set(id, row);
  }

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

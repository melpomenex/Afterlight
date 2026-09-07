// PackConsumer — main-thread consumer of worker delta packs (spec: the
// legacy renderer contract is preserved: entries are setPlayer()-shaped and
// a single scratch object is reused across rows, so the hot path allocates
// nothing per entity). The guestIds map is seeded by `joined` rows (spawn
// frames carry the string identity once, per the protocol contract).

export class PackConsumer {
  constructor(handlers = {}) {
    this.handlers = handlers; // read lazily so late-bound handlers work
    this.guestIds = new Map(); // entityId -> guestId string
    this._scratch = { id: 0, entityId: 0, x: 0, z: 0, rotY: 0, walking: false, sitting: false, airborne: false };
    this.lastPack = null;
    // Optional EntityRenderBackend (see src/realtime/gpu/README.md). The live
    // wireRealtime path does not attach one. Local player and Kiln stay on
    // onEntry even when a backend is present.
    this.entityBackend = handlers.entityBackend ?? null;
    this.excludedIds = handlers.excludedIds ?? null;
  }

  consume(pack, core = null) {
    for (const j of pack.joined) {
      if (j.guestId) this.guestIds.set(j.entityId, j.guestId);
      this.handlers.onJoin?.(j);
    }
    for (const id of pack.left) {
      this.guestIds.delete(id);
      this.handlers.onLeave?.(id);
    }
    for (let i = 0; i < pack.count; i++) {
      let entry;
      if (core) {
        entry = core.entryFor(pack, i, this.guestIds, this._scratch);
      } else {
        const s = this._scratch;
        const f = pack.flags[i];
        s.id = this.guestIds.get(pack.ids[i]) ?? pack.ids[i];
        s.entityId = pack.ids[i];
        s.x = pack.x[i]; s.z = pack.z[i]; s.rotY = pack.yaw[i];
        s.walking = !!(f & 1); s.sitting = !!(f & 2); s.airborne = !!(f & 4);
        entry = s;
      }
      this.handlers.onEntry?.(entry);
    }
    // Seam: compact pack → backend (GPU or CPU). Exclusions are applied
    // inside the backend so Kiln / local player never enter GPU buffers.
    this.entityBackend?.applyDeltaPack?.(pack, {
      guestIds: this.guestIds,
      excludedIds: this.excludedIds,
    });
  }

  reset() {
    this.guestIds.clear();
  }
}

// Pure-JS control arm: DataView/TypedArray decoder + slot-based entity store
// for afterlight-soa-v1 (contract §2–§4). Implements EXACTLY the same
// semantics and status codes as the wasm decoder
// (wasm/afterlight-realtime/src/{protocol,entity_store,status}.rs) — this is
// the "as a careful JS dev would write it" baseline the wasm arm is measured
// against. Steady state is allocation-free (growable buffers are reused).

export const STATUS = {
  OK: 0,
  OK_STALE: 1,
  OK_RESYNC_NEEDED: 2,
  OK_RESYNC: 3,
  E_TOO_LARGE: 16,
  E_BAD_MAGIC: 17,
  E_BAD_VERSION: 18,
  E_BAD_HEADER: 19,
  E_BAD_FRAME_TYPE: 20,
  E_TRUNCATED: 21,
  E_TOO_MANY_SECTIONS: 22,
  E_ENTITY_COUNT: 23,
  E_BAD_SECTION: 24,
  E_BAD_ENCODING: 25,
  E_ENC_UNSUPPORTED: 26,
  E_PAYLOAD_LEN: 27,
  E_TRAILING: 28,
  E_UNSORTED: 29,
  E_UNKNOWN_ID: 30,
  E_ID_EXISTS: 31,
  E_SLOT_EXHAUSTED: 32,
  E_BAD_ENUM: 33,
  E_BAD_STRING_TABLE: 34,
  E_BAD_DENSE: 35,
  E_POISONED: 36,
  E_NO_MEMORY: 37,
  E_BAD_HANDLE: 38,
  E_TRAP: 63,
};

export const MAGIC = 0x414c5254;
export const MAX_FRAME_BYTES = 1 << 20;
const MAX_SECTIONS = 16;
const MAX_ENTITIES = 100_000;

const SEC_SPAWN = 1, SEC_DESPAWN = 2, SEC_TRANSFORM = 3, SEC_MOTION = 4,
  SEC_ANIM = 5, SEC_FLAGS = 6, SEC_VISUAL = 7, SEC_STRING_TABLE = 8;
const ENC_DENSE = 0, ENC_SORTED = 1, ENC_ROARING = 2, ENC_BITSET = 3, ENC_ARROW = 4;
const FT_SNAPSHOT = 0, FT_DELTA = 1, FT_RESYNC = 2;

// value-column bytes per row (§2 field order); spawn = 2+2+4+16
function colsPerRow(sid) {
  switch (sid) {
    case SEC_SPAWN: return 24;
    case SEC_DESPAWN: return 0; // mask only
    case SEC_TRANSFORM: return 16;
    case SEC_MOTION: return 12;
    case SEC_ANIM: return 2;
    case SEC_FLAGS: return 1;
    case SEC_VISUAL: return 4;
    default: return 0;
  }
}

class Growable {
  constructor(Ctor, cap = 1024) {
    this.Ctor = Ctor;
    this.buf = new Ctor(cap);
    this.n = 0;
  }
  reset() {
    this.n = 0;
  }
  ensure(extra) {
    if (this.n + extra <= this.buf.length) return;
    let cap = this.buf.length * 2;
    while (cap < this.n + extra) cap *= 2;
    const next = new this.Ctor(cap);
    next.set(this.buf);
    this.buf = next;
  }
  pushU32(v) {
    this.buf[this.n++] = v;
  }
  pushF32(v) {
    this.buf[this.n++] = v;
  }
  pushU8(v) {
    this.buf[this.n++] = v;
  }
  view() {
    return this.buf.subarray(0, this.n);
  }
}

export class JsRefStore {
  constructor(maxSlots = 65536) {
    if (maxSlots === 0 || maxSlots > 65536) throw new Error('maxSlots');
    this.maxSlots = maxSlots;
    this.slotId = new Uint32Array(maxSlots);
    this.alive = new Uint8Array(maxSlots);
    this.x = new Float32Array(maxSlots);
    this.y = new Float32Array(maxSlots);
    this.z = new Float32Array(maxSlots);
    this.yaw = new Float32Array(maxSlots);
    this.vx = new Float32Array(maxSlots);
    this.vy = new Float32Array(maxSlots);
    this.vz = new Float32Array(maxSlots);
    this.animState = new Uint8Array(maxSlots);
    this.emote = new Uint8Array(maxSlots);
    this.flags = new Uint8Array(maxSlots);
    this.archetype = new Uint16Array(maxSlots);
    this.variant = new Uint16Array(maxSlots);
    this.stringRef = new Uint32Array(maxSlots);
    this.free = [];
    for (let i = maxSlots - 1; i >= 0; i--) this.free.push(i); // pop() = 0,1,2...
    this.idToSlot = new Map();
    this.liveCount = 0;
    this.epochN = 0;
    this.seqN = 0;
    this.tickN = 0;
    this.baselineOk = false;
    this.poisoned = false;

    this.stIds = new Growable(Uint32Array);
    this.stX = new Growable(Float32Array);
    this.stY = new Growable(Float32Array);
    this.stZ = new Growable(Float32Array);
    this.stYaw = new Growable(Float32Array);
    this.stFlagIds = new Growable(Uint32Array);
    this.stFlagVals = new Growable(Uint8Array);
    this.stSpawnIds = new Growable(Uint32Array);
    this.stSpawnArch = new Growable(Uint32Array);
    this.stSpawnVariant = new Growable(Uint32Array);
    this.stSpawnSref = new Growable(Uint32Array);
    this.stSpawnX = new Growable(Float32Array);
    this.stSpawnY = new Growable(Float32Array);
    this.stSpawnZ = new Growable(Float32Array);
    this.stSpawnYaw = new Growable(Float32Array);
    this.stDespawnIds = new Growable(Uint32Array);
  }

  // ---- session state / staging API (mirrors glue.WasmStore) ----
  memoryBytes() {
    return 0; // no linear memory in the JS arm
  }
  resetTo(epoch, seq, hasBaseline = true) {
    this.alive.fill(0);
    this.free.length = 0;
    for (let i = this.maxSlots - 1; i >= 0; i--) this.free.push(i);
    this.idToSlot.clear();
    this.liveCount = 0;
    this.epochN = epoch;
    this.seqN = seq;
    this.baselineOk = hasBaseline;
    this.poisoned = false;
    return STATUS.OK;
  }
  // Re-arm baseline/epoch without touching entities (chain replay support).
  resetSession(epoch, seq) {
    this.epochN = epoch;
    this.seqN = seq;
    this.baselineOk = true;
    this.poisoned = false;
    return STATUS.OK;
  }
  seq() {
    return this.seqN;
  }
  epoch() {
    return this.epochN;
  }
  tick() {
    return this.tickN;
  }
  live() {
    return this.liveCount;
  }
  hasBaseline() {
    return this.baselineOk;
  }

  applyFrame(bytes) {
    try {
      return this.#apply(bytes);
    } catch {
      return STATUS.E_TRAP; // never leak an exception into game code
    }
  }

  #apply(b) {
    const len = b.length;
    if (len > MAX_FRAME_BYTES) return STATUS.E_TOO_LARGE;
    if (len < 24) return STATUS.E_BAD_HEADER;
    const dv = new DataView(b.buffer, b.byteOffset, len);
    if (dv.getUint32(0, true) !== MAGIC) return STATUS.E_BAD_MAGIC;
    if (dv.getUint8(4) !== 1) return STATUS.E_BAD_VERSION;
    const ft = dv.getUint8(5);
    if (ft > FT_RESYNC) return STATUS.E_BAD_FRAME_TYPE;
    const hflags = dv.getUint8(6);
    if (hflags & 0xfe) return STATUS.E_BAD_HEADER;
    const hasStrings = (hflags & 1) !== 0;
    if (dv.getUint8(7) !== 24) return STATUS.E_BAD_HEADER;
    const epoch = dv.getUint32(8, true);
    const tick = dv.getUint32(12, true);
    const seq = dv.getUint32(16, true);
    const baseline = dv.getUint32(20, true);

    if (ft === FT_RESYNC) {
      if (len !== 24) return STATUS.E_TRAILING;
      this.baselineOk = false;
      this.poisoned = false;
      return STATUS.OK_RESYNC;
    }

    // ---------- pass 1: structural validation ----------
    const sections = [];
    const seen = new Set();
    let stringCount = 0;
    let p = 24;
    while (p < len) {
      if (sections.length === MAX_SECTIONS) return STATUS.E_TOO_MANY_SECTIONS;
      if (p + 12 > len) return STATUS.E_TRUNCATED;
      const sid = dv.getUint8(p);
      const enc = dv.getUint8(p + 1);
      const reserved = dv.getUint16(p + 2, true);
      const count = dv.getUint32(p + 4, true);
      const plen = dv.getUint32(p + 8, true);
      if (reserved !== 0) return STATUS.E_BAD_SECTION;
      if (sid < SEC_SPAWN || sid > SEC_STRING_TABLE) return STATUS.E_BAD_SECTION;
      if (seen.has(sid)) return STATUS.E_BAD_SECTION;
      if (enc === ENC_ROARING || enc === ENC_BITSET || enc === ENC_ARROW) return STATUS.E_ENC_UNSUPPORTED;
      if (enc !== ENC_DENSE && enc !== ENC_SORTED) return STATUS.E_BAD_ENCODING;
      if (sid === SEC_SPAWN || sid === SEC_DESPAWN) {
        if (enc !== ENC_SORTED) return STATUS.E_BAD_ENCODING;
      } else if (sid === SEC_STRING_TABLE) {
        if (!hasStrings) return STATUS.E_BAD_SECTION;
        if (enc !== ENC_DENSE) return STATUS.E_BAD_ENCODING;
      }
      if (count > MAX_ENTITIES) return STATUS.E_ENTITY_COUNT;

      const start = p + 12;
      const end = start + plen;
      if (end > len) return STATUS.E_TRUNCATED;

      if (sid === SEC_STRING_TABLE) {
        if (plen < 4) return STATUS.E_BAD_STRING_TABLE;
        if (count !== dv.getUint32(start, true)) return STATUS.E_BAD_SECTION;
        let q = start + 4;
        let entries = 0;
        while (entries < count) {
          if (q + 2 > end) return STATUS.E_BAD_STRING_TABLE;
          const blen = dv.getUint16(q, true);
          q += 2;
          if (q + blen > end) return STATUS.E_BAD_STRING_TABLE;
          q += blen;
          entries++;
        }
        if (q !== end) return STATUS.E_BAD_STRING_TABLE;
        stringCount = count;
      } else {
        const mask = enc === ENC_SORTED ? 4 * count : 0;
        const expected = mask + colsPerRow(sid) * count;
        if (plen !== expected) return STATUS.E_PAYLOAD_LEN;
        const cols = start + mask;
        if (sid === SEC_FLAGS) {
          for (let i = 0; i < count; i++) {
            if (b[cols + i] & 0xf8) return STATUS.E_BAD_ENUM;
          }
        } else if (sid === SEC_ANIM) {
          for (let i = 0; i < count; i++) {
            if (b[cols + i] > 3 || b[cols + count + i] > 6) return STATUS.E_BAD_ENUM;
          }
        }
        if (enc === ENC_SORTED) {
          let prev = -1;
          for (let i = 0; i < count; i++) {
            const id = dv.getUint32(start + i * 4, true);
            if (i > 0 && id <= prev) return STATUS.E_UNSORTED;
            prev = id;
          }
        }
      }
      sections.push({ sid, enc, count, start, end });
      seen.add(sid);
      p = end;
    }
    if (hasStrings && !seen.has(SEC_STRING_TABLE)) return STATUS.E_BAD_SECTION;

    // ---------- pass 2a: semantics ----------
    if (ft === FT_SNAPSHOT) {
      this.resetTo(epoch, seq, true);
      this.tickN = tick;
    } else if (ft === FT_DELTA) {
      if (this.poisoned) return STATUS.E_POISONED;
      if (epoch < this.epochN) return STATUS.OK_STALE;
      if (epoch > this.epochN) {
        this.epochN = epoch;
        this.baselineOk = false;
        return STATUS.OK_RESYNC_NEEDED;
      }
      if (!this.baselineOk || baseline !== this.seqN) return STATUS.OK_RESYNC_NEEDED;
      let spawnRows = 0;
      for (const s of sections) if (s.sid === SEC_SPAWN) spawnRows += s.count;
      if (spawnRows > this.free.length) return STATUS.E_SLOT_EXHAUSTED;
    } else {
      return STATUS.E_BAD_FRAME_TYPE;
    }

    // ---------- pass 2b: staging reset + capacity ----------
    this.stIds.reset();
    this.stX.reset();
    this.stY.reset();
    this.stZ.reset();
    this.stYaw.reset();
    this.stFlagIds.reset();
    this.stFlagVals.reset();
    this.stSpawnIds.reset();
    this.stSpawnArch.reset();
    this.stSpawnVariant.reset();
    this.stSpawnSref.reset();
    this.stSpawnX.reset();
    this.stSpawnY.reset();
    this.stSpawnZ.reset();
    this.stSpawnYaw.reset();
    this.stDespawnIds.reset();
    for (const s of sections) {
      const c = s.count;
      if (s.sid === SEC_TRANSFORM) {
        this.stIds.ensure(c);
        this.stX.ensure(c);
        this.stY.ensure(c);
        this.stZ.ensure(c);
        this.stYaw.ensure(c);
      } else if (s.sid === SEC_FLAGS) {
        this.stFlagIds.ensure(c);
        this.stFlagVals.ensure(c);
      } else if (s.sid === SEC_SPAWN) {
        this.stSpawnIds.ensure(c);
        this.stSpawnArch.ensure(c);
        this.stSpawnVariant.ensure(c);
        this.stSpawnSref.ensure(c);
        this.stSpawnX.ensure(c);
        this.stSpawnY.ensure(c);
        this.stSpawnZ.ensure(c);
        this.stSpawnYaw.ensure(c);
      } else if (s.sid === SEC_DESPAWN) {
        this.stDespawnIds.ensure(c);
      }
    }

    // ---------- pass 2c: apply ----------
    for (const s of sections) {
      const r = this.#applySection(b, dv, s, stringCount);
      if (r !== STATUS.OK) {
        this.poisoned = true;
        return r;
      }
    }

    if (ft === FT_DELTA) {
      this.seqN = seq;
      this.tickN = tick;
      this.epochN = epoch;
      this.baselineOk = true;
    }
    return STATUS.OK;
  }

  #slotFor(s, b, dv, i) {
    if (s.enc === ENC_DENSE) {
      return i < this.maxSlots && this.alive[i] ? i : -1;
    }
    const id = dv.getUint32(s.start + i * 4, true);
    const slot = this.idToSlot.get(id);
    return slot !== undefined && this.alive[slot] ? slot : -1;
  }

  #idFor(s, b, dv, i) {
    return s.enc === ENC_DENSE ? this.slotId[i] : dv.getUint32(s.start + i * 4, true);
  }

  #applySection(b, dv, s, stringCount) {
    const c = s.count;
    const mask = s.enc === ENC_SORTED ? 4 * c : 0;
    const base = s.start + mask;
    switch (s.sid) {
      case SEC_SPAWN: {
        const arch = s.start + 4 * c;
        const variant = arch + 2 * c;
        const sref = variant + 2 * c;
        const xc = sref + 4 * c;
        for (let i = 0; i < c; i++) {
          const id = dv.getUint32(s.start + i * 4, true);
          if (this.idToSlot.has(id)) return STATUS.E_ID_EXISTS;
          const sr = dv.getUint32(sref + i * 4, true);
          if (stringCount > 0 ? sr >= stringCount : sr !== 0) return STATUS.E_BAD_STRING_TABLE;
          if (this.free.length === 0) return STATUS.E_SLOT_EXHAUSTED;
          const slot = this.free.pop();
          this.slotId[slot] = id;
          this.alive[slot] = 1;
          this.vx[slot] = 0;
          this.vy[slot] = 0;
          this.vz[slot] = 0;
          this.animState[slot] = 0;
          this.emote[slot] = 0;
          this.flags[slot] = 0;
          this.idToSlot.set(id, slot);
          this.liveCount++;
          this.archetype[slot] = dv.getUint16(arch + i * 2, true);
          this.variant[slot] = dv.getUint16(variant + i * 2, true);
          this.stringRef[slot] = sr;
          this.x[slot] = dv.getFloat32(xc + i * 4, true);
          this.y[slot] = dv.getFloat32(xc + 4 * c + i * 4, true);
          this.z[slot] = dv.getFloat32(xc + 8 * c + i * 4, true);
          this.yaw[slot] = dv.getFloat32(xc + 12 * c + i * 4, true);
          this.stSpawnIds.pushU32(id);
          this.stSpawnArch.pushU32(this.archetype[slot]);
          this.stSpawnVariant.pushU32(this.variant[slot]);
          this.stSpawnSref.pushU32(sr);
          this.stSpawnX.pushF32(this.x[slot]);
          this.stSpawnY.pushF32(this.y[slot]);
          this.stSpawnZ.pushF32(this.z[slot]);
          this.stSpawnYaw.pushF32(this.yaw[slot]);
        }
        return STATUS.OK;
      }
      case SEC_DESPAWN: {
        for (let i = 0; i < c; i++) {
          const id = dv.getUint32(s.start + i * 4, true);
          const slot = this.idToSlot.get(id);
          if (slot !== undefined && this.alive[slot]) {
            this.alive[slot] = 0;
            this.slotId[slot] = 0;
            this.idToSlot.delete(id);
            this.free.push(slot);
            this.liveCount--;
          }
          this.stDespawnIds.pushU32(id);
        }
        return STATUS.OK;
      }
      case SEC_TRANSFORM: {
        for (let i = 0; i < c; i++) {
          const slot = this.#slotFor(s, b, dv, i);
          if (slot < 0) return s.enc === ENC_DENSE ? STATUS.E_BAD_DENSE : STATUS.E_UNKNOWN_ID;
          this.x[slot] = dv.getFloat32(base + i * 4, true);
          this.y[slot] = dv.getFloat32(base + 4 * c + i * 4, true);
          this.z[slot] = dv.getFloat32(base + 8 * c + i * 4, true);
          this.yaw[slot] = dv.getFloat32(base + 12 * c + i * 4, true);
          this.stIds.pushU32(this.#idFor(s, b, dv, i));
          this.stX.pushF32(this.x[slot]);
          this.stY.pushF32(this.y[slot]);
          this.stZ.pushF32(this.z[slot]);
          this.stYaw.pushF32(this.yaw[slot]);
        }
        return STATUS.OK;
      }
      case SEC_MOTION: {
        for (let i = 0; i < c; i++) {
          const slot = this.#slotFor(s, b, dv, i);
          if (slot < 0) return s.enc === ENC_DENSE ? STATUS.E_BAD_DENSE : STATUS.E_UNKNOWN_ID;
          this.vx[slot] = dv.getFloat32(base + i * 4, true);
          this.vy[slot] = dv.getFloat32(base + 4 * c + i * 4, true);
          this.vz[slot] = dv.getFloat32(base + 8 * c + i * 4, true);
        }
        return STATUS.OK;
      }
      case SEC_ANIM: {
        for (let i = 0; i < c; i++) {
          const slot = this.#slotFor(s, b, dv, i);
          if (slot < 0) return s.enc === ENC_DENSE ? STATUS.E_BAD_DENSE : STATUS.E_UNKNOWN_ID;
          this.animState[slot] = b[base + i];
          this.emote[slot] = b[base + c + i];
        }
        return STATUS.OK;
      }
      case SEC_FLAGS: {
        for (let i = 0; i < c; i++) {
          const slot = this.#slotFor(s, b, dv, i);
          if (slot < 0) return s.enc === ENC_DENSE ? STATUS.E_BAD_DENSE : STATUS.E_UNKNOWN_ID;
          this.flags[slot] = b[base + i];
          this.stFlagIds.pushU32(this.#idFor(s, b, dv, i));
          this.stFlagVals.pushU8(this.flags[slot]);
        }
        return STATUS.OK;
      }
      case SEC_VISUAL: {
        for (let i = 0; i < c; i++) {
          const slot = this.#slotFor(s, b, dv, i);
          if (slot < 0) return s.enc === ENC_DENSE ? STATUS.E_BAD_DENSE : STATUS.E_UNKNOWN_ID;
          this.archetype[slot] = dv.getUint16(base + i * 2, true);
          this.variant[slot] = dv.getUint16(base + 2 * c + i * 2, true);
        }
        return STATUS.OK;
      }
      default:
        return STATUS.OK; // string table: validated in pass 1
    }
  }

  // ---- staged output accessors (views; mirror glue.WasmStore) ----
  outIds() { return this.stIds.view(); }
  outX() { return this.stX.view(); }
  outY() { return this.stY.view(); }
  outZ() { return this.stZ.view(); }
  outYaw() { return this.stYaw.view(); }
  outFlagIds() { return this.stFlagIds.view(); }
  outFlagVals() { return this.stFlagVals.view(); }
  outSpawnIds() { return this.stSpawnIds.view(); }
  outSpawnArch() { return this.stSpawnArch.view(); }
  outSpawnVariant() { return this.stSpawnVariant.view(); }
  outSpawnSref() { return this.stSpawnSref.view(); }
  outSpawnX() { return this.stSpawnX.view(); }
  outSpawnY() { return this.stSpawnY.view(); }
  outSpawnZ() { return this.stSpawnZ.view(); }
  outSpawnYaw() { return this.stSpawnYaw.view(); }
  outDespawnIds() { return this.stDespawnIds.view(); }
}

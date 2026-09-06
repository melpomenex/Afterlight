// Node WebAssembly loader + glue for wasm/afterlight-realtime
// (see wasm/afterlight-realtime/ABI.md). Hand-written extern "C" bridge —
// no wasm-bindgen. Status codes mirror src/status.rs; keep in sync.

import { readFileSync } from 'node:fs';

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

export const MAX_FRAME_BYTES = 1 << 20;

export function loadModule(wasmPath) {
  return new WebAssembly.Module(readFileSync(wasmPath));
}

const EMPTY_U32 = new Uint32Array(0);
const EMPTY_F32 = new Float32Array(0);
const EMPTY_U8 = new Uint8Array(0);

// WasmStore implements the same surface as jsRefDecoder.JsRefStore so the
// benchmark can drive both arms identically.
export class WasmStore {
  constructor(mod, maxSlots = 65536) {
    this.instance = new WebAssembly.Instance(mod, {});
    this.ex = this.instance.exports;
    this.memory = this.ex.memory;
    this.abiVersion = this.ex.abi_version();
    this.maxSlots = maxSlots;
    this.h = this.ex.store_new(maxSlots);
    if (!this.h) throw new Error('store_new failed');
  }

  destroy() {
    if (this.h) {
      this.ex.store_destroy(this.h);
      this.h = 0;
    }
  }

  memoryBytes() {
    return this.memory.buffer.byteLength;
  }

  resetTo(epoch, seq, hasBaseline = true) {
    return this.ex.reset_to(this.h, epoch, seq, hasBaseline ? 1 : 0);
  }

  // Re-arm baseline/epoch without touching entities (chain replay support).
  resetSession(epoch, seq) {
    return this.ex.reset_session(this.h, epoch, seq);
  }

  // Copy `u8` into the module scratch buffer and decode+apply it.
  // Returns a STATUS code; never throws on hostile frames (a trap, which the
  // fuzzer makes unreachable, is reported as E_TRAP).
  applyFrame(u8) {
    if (u8.length > MAX_FRAME_BYTES) return STATUS.E_TOO_LARGE;
    const ptr = this.ex.scratch_ptr(this.h, u8.length);
    if (!ptr) return STATUS.E_BAD_HANDLE;
    new Uint8Array(this.memory.buffer, ptr, u8.length).set(u8);
    try {
      return this.ex.apply_frame(this.h, ptr, u8.length);
    } catch {
      return STATUS.E_TRAP;
    }
  }

  // ---- staged outputs (views into wasm memory; valid until next apply) ----
  _pair(v, empty, Ctor) {
    if (v === 0n) return empty;
    const len = Number(v >> 32n);
    if (len === 0) return empty;
    const ptr = Number(v & 0xffffffffn);
    return new Ctor(this.memory.buffer, ptr, len);
  }
  outIds() {
    return this._pair(this.ex.out_ids(this.h), EMPTY_U32, Uint32Array);
  }
  outX() {
    return this._pair(this.ex.out_x(this.h), EMPTY_F32, Float32Array);
  }
  outY() {
    return this._pair(this.ex.out_y(this.h), EMPTY_F32, Float32Array);
  }
  outZ() {
    return this._pair(this.ex.out_z(this.h), EMPTY_F32, Float32Array);
  }
  outYaw() {
    return this._pair(this.ex.out_yaw(this.h), EMPTY_F32, Float32Array);
  }
  outFlagIds() {
    return this._pair(this.ex.out_flag_ids(this.h), EMPTY_U32, Uint32Array);
  }
  outFlagVals() {
    return this._pair(this.ex.out_flag_vals(this.h), EMPTY_U8, Uint8Array);
  }
  outSpawnIds() {
    return this._pair(this.ex.out_spawn_ids(this.h), EMPTY_U32, Uint32Array);
  }
  outSpawnArch() {
    return this._pair(this.ex.out_spawn_arch(this.h), EMPTY_U32, Uint32Array);
  }
  outSpawnVariant() {
    return this._pair(this.ex.out_spawn_variant(this.h), EMPTY_U32, Uint32Array);
  }
  outSpawnSref() {
    return this._pair(this.ex.out_spawn_sref(this.h), EMPTY_U32, Uint32Array);
  }
  outSpawnX() {
    return this._pair(this.ex.out_spawn_x(this.h), EMPTY_F32, Float32Array);
  }
  outSpawnY() {
    return this._pair(this.ex.out_spawn_y(this.h), EMPTY_F32, Float32Array);
  }
  outSpawnZ() {
    return this._pair(this.ex.out_spawn_z(this.h), EMPTY_F32, Float32Array);
  }
  outSpawnYaw() {
    return this._pair(this.ex.out_spawn_yaw(this.h), EMPTY_F32, Float32Array);
  }
  outDespawnIds() {
    return this._pair(this.ex.out_despawn_ids(this.h), EMPTY_U32, Uint32Array);
  }

  // ---- session state ----
  seq() {
    return this.ex.seq(this.h);
  }
  epoch() {
    return this.ex.epoch(this.h);
  }
  tick() {
    return this.ex.tick(this.h);
  }
  live() {
    return this.ex.live(this.h);
  }
  hasBaseline() {
    return this.ex.has_baseline(this.h) === 1;
  }
}

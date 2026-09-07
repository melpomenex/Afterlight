// Browser WasmStore — same surface as benchmarks/realtime/lib/wasm/glue.mjs.

import { STATUS, MAX_FRAME_BYTES } from './status.js';

const EMPTY_U32 = new Uint32Array(0);
const EMPTY_F32 = new Float32Array(0);
const EMPTY_U8 = new Uint8Array(0);

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

  resetTo(epoch = 0, seq = 0, hasBaseline = false) {
    return this.ex.reset_to(this.h, epoch, seq, hasBaseline ? 1 : 0);
  }

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

  _pair(v, empty, Ctor) {
    if (v === 0n) return empty;
    const len = Number(v >> 32n);
    if (len === 0) return empty;
    const ptr = Number(v & 0xffffffffn);
    return new Ctor(this.memory.buffer, ptr, len);
  }

  outIds() { return this._pair(this.ex.out_ids(this.h), EMPTY_U32, Uint32Array); }
  outX() { return this._pair(this.ex.out_x(this.h), EMPTY_F32, Float32Array); }
  outZ() { return this._pair(this.ex.out_z(this.h), EMPTY_F32, Float32Array); }
  outYaw() { return this._pair(this.ex.out_yaw(this.h), EMPTY_F32, Float32Array); }
  outFlagIds() { return this._pair(this.ex.out_flag_ids(this.h), EMPTY_U32, Uint32Array); }
  outFlagVals() { return this._pair(this.ex.out_flag_vals(this.h), EMPTY_U8, Uint8Array); }
  outSpawnIds() { return this._pair(this.ex.out_spawn_ids(this.h), EMPTY_U32, Uint32Array); }
  outSpawnArch() { return this._pair(this.ex.out_spawn_arch(this.h), EMPTY_U32, Uint32Array); }
  outSpawnX() { return this._pair(this.ex.out_spawn_x(this.h), EMPTY_F32, Float32Array); }
  outSpawnZ() { return this._pair(this.ex.out_spawn_z(this.h), EMPTY_F32, Float32Array); }
  outSpawnYaw() { return this._pair(this.ex.out_spawn_yaw(this.h), EMPTY_F32, Float32Array); }
  outDespawnIds() { return this._pair(this.ex.out_despawn_ids(this.h), EMPTY_U32, Uint32Array); }

  seq() { return this.ex.seq(this.h); }
  epoch() { return this.ex.epoch(this.h); }
  live() { return this.ex.live(this.h); }
}

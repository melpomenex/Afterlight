//! afterlight-realtime: slot-based entity store + afterlight-soa-v1 frame
//! decoder for the realtime data-plane workstream.
//!
//! Contract: docs/architecture/realtime/contract.md (v0). std-only by design
//! (tiny, auditable, no network). The wasm build exposes a plain `extern "C"`
//! ABI (see ABI.md); JS glue lives in benchmarks/realtime/lib/wasm/glue.mjs.
//!
//! Threat model: frames are hostile. Every entry point returns a status code
//! (src/status.rs); no input can panic or trap (fuzz-enforced in
//! tests/fuzz.rs). Stores are single-threaded (contract §7).

pub mod entity_store;
pub mod protocol;
pub mod status;

pub use entity_store::Store;
pub use protocol::apply_to_store;

use status::*;

// Single-threaded wasm: one static handle table plus one shared inbound-frame
// scratch buffer. Keeping the buffer OUT of Store means apply_frame can hold
// an immutable slice of it alongside &mut Store with zero aliasing.
// Handles are (index + 1); 0 is the null handle.
static mut STORES: Vec<Option<Store>> = Vec::new();
static mut FREE_HANDLES: Vec<u32> = Vec::new();
static mut INPUT: Vec<u8> = Vec::new();

const INPUT_SIZE: usize = protocol::MAX_FRAME_BYTES;

/// # Safety
/// Single-threaded by contract (§7); no reference into these statics escapes.
#[inline]
fn table() -> &'static mut Vec<Option<Store>> {
    // SAFETY: see fn doc.
    unsafe { &mut *core::ptr::addr_of_mut!(STORES) }
}

#[inline]
fn free_handles() -> &'static mut Vec<u32> {
    // SAFETY: see `table` doc.
    unsafe { &mut *core::ptr::addr_of_mut!(FREE_HANDLES) }
}

#[inline]
fn with_store<R>(h: u32, f: impl FnOnce(&mut Store) -> R) -> Option<R> {
    let idx = (h.checked_sub(1)?) as usize;
    let slot = table().get_mut(idx)?;
    slot.as_mut().map(f)
}

/// Initialize (once) and return the address of the shared scratch buffer.
fn input_base(len: u32) -> u32 {
    if (len as usize) > INPUT_SIZE {
        return 0;
    }
    // SAFETY: single-threaded access.
    let inp = unsafe { &mut *core::ptr::addr_of_mut!(INPUT) };
    if inp.len() != INPUT_SIZE {
        if inp.try_reserve(INPUT_SIZE).is_err() {
            return 0;
        }
        inp.resize(INPUT_SIZE, 0);
    }
    inp.as_ptr() as u32
}

#[inline]
fn input_slice(len: u32) -> Option<&'static [u8]> {
    if (len as usize) > INPUT_SIZE {
        return None;
    }
    // SAFETY: single-threaded access; buffer is INPUT_SIZE initialized bytes.
    let inp = unsafe { &*core::ptr::addr_of_mut!(INPUT) };
    if inp.len() != INPUT_SIZE {
        return None;
    }
    Some(&inp[..len as usize])
}

// ---------------- ABI (documented in ABI.md) ----------------

#[no_mangle]
pub extern "C" fn abi_version() -> u32 {
    1
}

/// Create a store. Returns a handle (> 0) or 0 on failure
/// (max_slots 0 or > 65536, or allocation failure).
#[no_mangle]
pub extern "C" fn store_new(max_slots: u32) -> u32 {
    let s = match Store::new(max_slots) {
        Some(s) => s,
        None => return 0,
    };
    let tbl = table();
    let free = free_handles();
    match free.pop() {
        Some(h) => {
            let idx = ((h - 1) as usize).min(tbl.len());
            if idx >= tbl.len() {
                free.push(h);
                return 0;
            }
            tbl[idx] = Some(s);
            h
        }
        None => {
            if tbl.try_reserve(1).is_err() {
                return 0; // allocation failed; store dropped
            }
            tbl.push(Some(s));
            tbl.len() as u32
        }
    }
}

/// Destroy a store. Safe to call twice; handle 0 is a no-op.
#[no_mangle]
pub extern "C" fn store_destroy(h: u32) {
    if h == 0 {
        return;
    }
    let tbl = table();
    let idx = match usize::try_from(h - 1) {
        Ok(i) if i < tbl.len() => i,
        _ => return,
    };
    tbl[idx] = None;
    free_handles().push(h);
}

/// Address of the inbound-frame scratch buffer (always 1 MiB, zeroed).
/// Write `len` bytes at the returned address, then call apply_frame with the
/// same ptr/len. Returns 0 if len > 1 MiB or on allocation failure.
#[no_mangle]
pub extern "C" fn scratch_ptr(h: u32, len: u32) -> u32 {
    if with_store(h, |_| ()).is_none() {
        return 0;
    }
    input_base(len)
}

/// Decode + apply one frame. Returns a status code (src/status.rs, ABI.md).
#[no_mangle]
pub extern "C" fn apply_frame(h: u32, ptr: u32, len: u32) -> u32 {
    if len > protocol::MAX_FRAME_BYTES as u32 {
        return E_TOO_LARGE;
    }
    let bytes = match input_slice(len) {
        Some(b) => b,
        None => return E_BAD_HANDLE,
    };
    // The host must pass the pointer scratch_ptr returned (start of buffer).
    let base = input_base(len);
    if ptr != base {
        return E_BAD_HANDLE;
    }
    with_store(h, |st| protocol::apply_to_store(st, bytes)).unwrap_or(E_BAD_HANDLE)
}

/// Reset a store to (epoch, seq, has_baseline) with an empty population.
/// Benchmark/repair support for replaying a recorded frame chain.
#[no_mangle]
pub extern "C" fn reset_to(h: u32, epoch: u32, seq: u32, has_baseline: u32) -> u32 {
    with_store(h, |st| {
        st.reset_to(epoch, seq, st.server_tick, has_baseline != 0);
        OK
    })
    .unwrap_or(E_BAD_HANDLE)
}

/// Re-arm session state WITHOUT touching entities: epoch/seq/has_baseline are
/// set, poison cleared. Lets a recorded delta chain be replayed against the
/// population it was recorded on. Benchmark/repair support.
#[no_mangle]
pub extern "C" fn reset_session(h: u32, epoch: u32, seq: u32) -> u32 {
    with_store(h, |st| {
        st.epoch = epoch;
        st.seq = seq;
        st.has_baseline = true;
        st.poisoned = false;
        OK
    })
    .unwrap_or(E_BAD_HANDLE)
}

// ---- session state getters ----

#[no_mangle]
pub extern "C" fn seq(h: u32) -> u32 {
    with_store(h, |st| st.seq).unwrap_or(0)
}
#[no_mangle]
pub extern "C" fn epoch(h: u32) -> u32 {
    with_store(h, |st| st.epoch).unwrap_or(0)
}
#[no_mangle]
pub extern "C" fn tick(h: u32) -> u32 {
    with_store(h, |st| st.server_tick).unwrap_or(0)
}
#[no_mangle]
pub extern "C" fn live(h: u32) -> u32 {
    with_store(h, |st| st.live_count() as u32).unwrap_or(0)
}
#[no_mangle]
pub extern "C" fn has_baseline(h: u32) -> u32 {
    with_store(h, |st| st.has_baseline as u32).unwrap_or(0)
}

// ---- per-frame output staging: each accessor returns (ptr << 32) | len in
// elements; 0 means empty. ----

#[inline]
fn pack(ptr: usize, len: usize) -> i64 {
    (((len as u64) << 32) | ptr as u64) as i64
}

macro_rules! staged {
    ($name:ident, $field:ident, $ty:ty) => {
        #[no_mangle]
        pub extern "C" fn $name(h: u32) -> i64 {
            with_store(h, |st| {
                let v: &Vec<$ty> = &st.$field;
                if v.is_empty() {
                    0
                } else {
                    pack(v.as_ptr() as usize, v.len())
                }
            })
            .unwrap_or(0)
        }
    };
}

staged!(out_ids, out_ids, u32);
staged!(out_x, out_x, f32);
staged!(out_y, out_y, f32);
staged!(out_z, out_z, f32);
staged!(out_yaw, out_yaw, f32);
staged!(out_flag_ids, out_flag_ids, u32);
staged!(out_flag_vals, out_flag_vals, u8);
staged!(out_spawn_ids, out_spawn_ids, u32);
staged!(out_spawn_arch, out_spawn_arch, u16);
staged!(out_spawn_variant, out_spawn_variant, u16);
staged!(out_spawn_sref, out_spawn_sref, u32);
staged!(out_spawn_x, out_spawn_x, f32);
staged!(out_spawn_y, out_spawn_y, f32);
staged!(out_spawn_z, out_spawn_z, f32);
staged!(out_spawn_yaw, out_spawn_yaw, f32);
staged!(out_despawn_ids, out_despawn_ids, u32);

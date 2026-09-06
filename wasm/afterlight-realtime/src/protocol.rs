//! afterlight-soa-v1 frame decoder + applier (contract §3/§4).
//!
//! Two passes, so a hostile frame is fully validated BEFORE any store
//! mutation:
//!   pass 1 — header, section walk, bounds, enums, id ordering, string table;
//!   pass 2 — semantics (epoch/baseline gating) then apply sections in order.
//! A failure in pass 2 (id not in store, etc.) marks the store `poisoned`:
//! further DELTAs are dropped until the next FULL_SNAPSHOT, which restores a
//! known-good state. Every failure is a status code — never a panic.

use crate::entity_store::Store;
use crate::status::*;

pub const MAGIC: u32 = 0x414C_5254; // "ALRT"
pub const PROTOCOL_VERSION: u8 = 1;
pub const HEADER_SIZE: usize = 24;
pub const MAX_FRAME_BYTES: usize = 1 << 20; // 1 MiB
pub const MAX_SECTIONS: usize = 16;
pub const MAX_ENTITIES: u32 = 100_000;

pub const SEC_SPAWN: u8 = 1;
pub const SEC_DESPAWN: u8 = 2;
pub const SEC_TRANSFORM: u8 = 3;
pub const SEC_MOTION: u8 = 4;
pub const SEC_ANIM: u8 = 5;
pub const SEC_FLAGS: u8 = 6;
pub const SEC_VISUAL: u8 = 7;
pub const SEC_STRING_TABLE: u8 = 8;

pub const ENC_DENSE: u8 = 0;
pub const ENC_SORTED: u8 = 1;
pub const ENC_ROARING: u8 = 2;
pub const ENC_BITSET: u8 = 3;
pub const ENC_ARROW: u8 = 4;

pub const FT_SNAPSHOT: u8 = 0;
pub const FT_DELTA: u8 = 1;
pub const FT_RESYNC: u8 = 2;
/// Chunked frames (contract §4a): oversized snapshots/deltas split under the
/// 1 MiB cap; CHUNK_END (header flag bit1) on the final chunk commits.
pub const FT_SNAPSHOT_CHUNK: u8 = 3;
pub const FT_DELTA_CHUNK: u8 = 4;

/// Value columns per section, bytes per row (contract §2 field order).
/// Spawn rows: id mask (SORTED_IDS) + 24 value bytes; rows themselves are
/// INTERLEAVED 28-byte records matching the JS reference (see apply_spawn)
/// — payload length math is identical for both layouts.
const fn cols_per_row(sid: u8) -> u64 {
    match sid {
        SEC_SPAWN => 2 + 2 + 4 + 16,
        SEC_DESPAWN => 0, // mask only
        SEC_TRANSFORM => 16,
        SEC_MOTION => 12,
        SEC_ANIM => 2,
        SEC_FLAGS => 1,
        SEC_VISUAL => 4,
        _ => 0,
    }
}

struct Section {
    sid: u8,
    enc: u8,
    count: u32,
    start: usize, // payload start in frame
    #[allow(dead_code)] // kept for clarity; column bases derive from start+count
    end: usize,   // payload end (exclusive)
}

#[inline]
fn ru16(b: &[u8], o: usize) -> u32 {
    u16::from_le_bytes([b[o], b[o + 1]]) as u32
}
#[inline]
fn ru32(b: &[u8], o: usize) -> u32 {
    u32::from_le_bytes([b[o], b[o + 1], b[o + 2], b[o + 3]])
}
#[inline]
fn rf32(b: &[u8], o: usize) -> f32 {
    f32::from_bits(ru32(b, o))
}

/// Decode + apply `frame` to `store`. Total function: returns a status code
/// for every input; never panics (fuzz-enforced in tests/fuzz.rs).
pub fn apply_to_store(st: &mut Store, frame: &[u8]) -> u32 {
    if frame.len() > MAX_FRAME_BYTES {
        return E_TOO_LARGE;
    }
    if frame.len() < HEADER_SIZE {
        return E_BAD_HEADER;
    }
    if ru32(frame, 0) != MAGIC {
        return E_BAD_MAGIC;
    }
    if frame[4] != PROTOCOL_VERSION {
        return E_BAD_VERSION;
    }
    let ft = frame[5];
    if ft > FT_DELTA_CHUNK {
        return E_BAD_FRAME_TYPE;
    }
    let hflags = frame[6];
    if hflags & 0xFC != 0 {
        return E_BAD_HEADER; // bits 2.. reserved (bit1 = CHUNK_END, §4a)
    }
    let chunk_end = hflags & 0x02 != 0;
    let has_string_table = hflags & 1 != 0;
    if frame[7] as usize != HEADER_SIZE {
        return E_BAD_HEADER; // v0 understands exactly this header
    }
    let epoch = ru32(frame, 8);
    let tick = ru32(frame, 12);
    let seq = ru32(frame, 16);
    let baseline = ru32(frame, 20);

    if ft == FT_RESYNC {
        // §4: client invalidates its baseline; v0 carries no sections.
        if frame.len() != HEADER_SIZE {
            return E_TRAILING;
        }
        st.has_baseline = false;
        st.poisoned = false;
        return OK_RESYNC;
    }

    // ---------- pass 1: structural validation ----------
    let mut sections: [Option<Section>; MAX_SECTIONS] = [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None];
    let mut nsec = 0usize;
    let mut seen = 0u16; // bitmask over section ids 1..=8
    let mut string_count: u32 = 0;
    let mut p = HEADER_SIZE;
    let len = frame.len();

    while p < len {
        if nsec == MAX_SECTIONS {
            return E_TOO_MANY_SECTIONS;
        }
        if p + 12 > len {
            return E_TRUNCATED;
        }
        let sid = frame[p];
        let enc = frame[p + 1];
        let reserved = u16::from_le_bytes([frame[p + 2], frame[p + 3]]);
        let count = ru32(frame, p + 4);
        let plen = ru32(frame, p + 8) as u64;

        if reserved != 0 {
            return E_BAD_SECTION;
        }
        if !(SEC_SPAWN..=SEC_STRING_TABLE).contains(&sid) {
            return E_BAD_SECTION;
        }
        if seen & (1u16 << (sid - 1)) != 0 {
            return E_BAD_SECTION; // duplicate section
        }
        match enc {
            ENC_DENSE | ENC_SORTED => {}
            ENC_ROARING | ENC_BITSET | ENC_ARROW => return E_ENC_UNSUPPORTED,
            _ => return E_BAD_ENCODING,
        }
        // encoding applicability per section
        match sid {
            SEC_DESPAWN => {
                if enc != ENC_SORTED {
                    return E_BAD_ENCODING; // mask-only section needs an id list
                }
            }
            SEC_SPAWN => {
                // JS reference emits spawn rows DENSE-encoded (rows carry
                // their ids); SORTED accepted for the Rust builder. Both are
                // interleaved 28-byte rows, so the length math is identical.
                if enc != ENC_SORTED && enc != ENC_DENSE {
                    return E_BAD_ENCODING;
                }
            }
            SEC_STRING_TABLE => {
                if !has_string_table {
                    return E_BAD_SECTION; // only valid with header flag bit0
                }
                if enc != ENC_DENSE {
                    return E_BAD_ENCODING;
                }
            }
            _ => {}
        }
        if count > MAX_ENTITIES {
            return E_ENTITY_COUNT;
        }

        let start = p + 12;
        let end64 = start as u64 + plen;
        if end64 > len as u64 {
            return E_TRUNCATED;
        }
        let end = end64 as usize;

        if sid == SEC_STRING_TABLE {
            // count u32, then per entry: u16 byte-length + UTF-8 bytes
            if plen < 4 {
                return E_BAD_STRING_TABLE;
            }
            if count != ru32(frame, start) {
                return E_BAD_SECTION; // entity_count must equal the parsed entry count
            }
            let mut q = start + 4;
            let mut entries = 0u32;
            while entries < count {
                if q + 2 > end {
                    return E_BAD_STRING_TABLE;
                }
                let blen = u16::from_le_bytes([frame[q], frame[q + 1]]) as usize;
                q += 2;
                if q + blen > end {
                    return E_BAD_STRING_TABLE;
                }
                q += blen;
                entries += 1;
            }
            if q != end {
                return E_BAD_STRING_TABLE;
            }
            string_count = count;
        } else {
            // payload_len must equal exactly mask + columns (no slack, no junk)
            let expected: u64 = if sid == SEC_SPAWN {
                28 * count as u64 // interleaved rows carry their id: 28 B either way
            } else {
                let mask: u64 = if enc == ENC_SORTED { 4 } else { 0 } * count as u64;
                mask + cols_per_row(sid) * count as u64
            };
            if plen != expected {
                return E_PAYLOAD_LEN;
            }
            // enums + id ordering are checked before any mutation
            let mask_bytes: u64 = if sid == SEC_SPAWN {
                0 // ids are embedded in the interleaved rows
            } else if enc == ENC_SORTED {
                4 * count as u64
            } else {
                0
            };
            let cols = start + (mask_bytes as usize);
            match (sid, enc) {
                (SEC_FLAGS, _) => {
                    for i in 0..count as usize {
                        if frame[cols + i] & 0xF8 != 0 {
                            return E_BAD_ENUM; // bits 3+ reserved 0 (§2)
                        }
                    }
                }
                (SEC_ANIM, _) => {
                    for i in 0..count as usize {
                        // columnar: state column then emote column
                        if frame[cols + i] > 3 || frame[cols + count as usize + i] > 6 {
                            return E_BAD_ENUM; // state 0..3, emote 0..6 (§2)
                        }
                    }
                }
                _ => {}
            }
            if enc == ENC_SORTED {
                let mut prev: u32 = 0;
                for i in 0..count as usize {
                    let id = ru32(frame, start + i * 4);
                    if i > 0 && id <= prev {
                        return E_UNSORTED; // strictly ascending
                    }
                    prev = id;
                }
            }
        }

        sections[nsec] = Some(Section { sid, enc, count, start, end });
        nsec += 1;
        seen |= 1u16 << (sid - 1);
        p = end;
    }

    if has_string_table && seen & (1u16 << (SEC_STRING_TABLE - 1)) == 0 {
        return E_BAD_SECTION; // flag promised a string table, none present
    }
    if p != len {
        return E_TRAILING; // unreachable (loop ends at p >= len) — kept for clarity
    }

    // ---------- pass 2a: semantics ----------
    match ft {
        FT_SNAPSHOT => {
            st.reset_to(epoch, seq, tick, true);
            st.chunk_seq = 0; // a full snapshot aborts any chunk accumulation (§4a)
        }
        FT_SNAPSHOT_CHUNK => {
            // §4a: snapshots are self-validating; stale owners dropped.
            if epoch < st.epoch {
                return OK_STALE;
            }
            // A sequence the store is not accumulating starts a fresh snapshot.
            if st.chunk_seq != seq {
                st.reset_to(epoch, seq, tick, false);
                st.chunk_seq = seq;
            }
            // Slot headroom for this chunk's spawns (no-abort guarantee).
            let spawn_rows: u64 = sections[..nsec]
                .iter()
                .filter_map(|s| s.as_ref())
                .filter(|s| s.sid == SEC_SPAWN)
                .map(|s| s.count as u64)
                .sum();
            if spawn_rows > st.free_len() as u64 {
                return E_SLOT_EXHAUSTED;
            }
        }
        FT_DELTA_CHUNK => {
            // Baseline-checked like DELTA; every chunk keeps the original
            // baseline (sequence commits only on CHUNK_END).
            if st.poisoned {
                return E_POISONED;
            }
            if epoch < st.epoch {
                return OK_STALE;
            }
            if epoch > st.epoch {
                st.epoch = epoch;
                st.has_baseline = false;
                return OK_RESYNC_NEEDED;
            }
            if !st.has_baseline || baseline != st.seq {
                return OK_RESYNC_NEEDED;
            }
            let spawn_rows: u64 = sections[..nsec]
                .iter()
                .filter_map(|s| s.as_ref())
                .filter(|s| s.sid == SEC_SPAWN)
                .map(|s| s.count as u64)
                .sum();
            if spawn_rows > st.free_len() as u64 {
                return E_SLOT_EXHAUSTED;
            }
        }
        FT_DELTA => {
            if st.poisoned {
                return E_POISONED;
            }
            if epoch < st.epoch {
                return OK_STALE; // stale-owner fencing, dropped unconditionally (§4)
            }
            if epoch > st.epoch {
                st.epoch = epoch; // higher epoch invalidates the baseline (§4)
                st.has_baseline = false;
                return OK_RESYNC_NEEDED;
            }
            if !st.has_baseline || baseline != st.seq {
                return OK_RESYNC_NEEDED;
            }
            let spawn_rows: u64 = sections[..nsec]
                .iter()
                .filter_map(|s| s.as_ref())
                .filter(|s| s.sid == SEC_SPAWN)
                .map(|s| s.count as u64)
                .sum();
            if spawn_rows > st.free_len() as u64 {
                return E_SLOT_EXHAUSTED;
            }
        }
        _ => return E_BAD_FRAME_TYPE, // RESYNC handled above
    }

    // ---------- pass 2b: staging reservations (no-abort guarantee) ----------
    st.clear_outputs();
    for s in sections[..nsec].iter().filter_map(|s| s.as_ref()) {
        if st.reserve_outputs(s.sid, s.count).is_err() {
            return E_NO_MEMORY;
        }
    }

    // ---------- pass 2c: apply ----------
    for s in sections[..nsec].iter().filter_map(|s| s.as_ref()) {
        let r = match s.sid {
            SEC_SPAWN => apply_spawn(st, frame, s, string_count),
            SEC_DESPAWN => apply_despawn(st, frame, s),
            SEC_TRANSFORM => apply_columns(st, frame, s, true),
            SEC_MOTION => apply_columns(st, frame, s, false),
            SEC_ANIM => apply_anim(st, frame, s),
            SEC_FLAGS => apply_flags(st, frame, s),
            SEC_VISUAL => apply_visual(st, frame, s),
            SEC_STRING_TABLE => OK, // fully validated in pass 1; count consumed via string_count
            _ => OK,
        };
        if r != OK {
            st.poisoned = true; // baseline no longer trustworthy; snapshot recovers
            return r;
        }
        st.maybe_rehash();
    }

    match ft {
        FT_DELTA => {
            st.seq = seq;
            st.server_tick = tick;
            st.epoch = epoch;
            st.has_baseline = true;
        }
        FT_DELTA_CHUNK => {
            st.server_tick = tick;
            if chunk_end {
                st.seq = seq;
                st.has_baseline = true;
            }
        }
        FT_SNAPSHOT_CHUNK => {
            st.server_tick = tick;
            if chunk_end {
                // The chunk chain rebuilt the store from scratch: any poison
                // from a failed earlier chain is gone, and the delta baseline
                // commits here.
                st.poisoned = false;
                st.seq = seq;
                st.has_baseline = true;
                st.chunk_seq = 0;
            }
        }
        _ => {}
    }
    OK
}

/// Resolve row `i`'s slot for a component section. SORTED_IDS -> map lookup;
/// DENSE -> slot == row, requiring count == live and a hole-free range.
#[inline]
fn resolve_slot(st: &Store, s: &Section, b: &[u8], i: usize) -> Option<u32> {
    if s.enc == ENC_DENSE {
        // DENSE addresses slots 0..count-1: every one must be live.
        if i >= st.max_slots as usize {
            return None;
        }
        if st.alive(i as u32) {
            Some(i as u32)
        } else {
            None
        }
    } else {
        let id = ru32(b, s.start + i * 4);
        st.get_slot(id)
    }
}

#[inline]
fn row_id(st: &Store, s: &Section, b: &[u8], i: usize) -> u32 {
    if s.enc == ENC_DENSE {
        st.id_at(i as u32)
    } else {
        ru32(b, s.start + i * 4)
    }
}

fn apply_spawn(st: &mut Store, b: &[u8], s: &Section, string_count: u32) -> u32 {
    // Interleaved 28-byte rows — the JS reference layout
    // (shared/realtime/encoders.js readSpawnSection): per row
    // id u32, archetype u16, variant u16, stringRef u32, x/y/z/yaw f32.
    let c = s.count as usize;
    for i in 0..c {
        let o = s.start + i * 28;
        let id = ru32(b, o);
        if st.contains_id(id) {
            return E_ID_EXISTS;
        }
        let sr = ru32(b, o + 8);
        // 0xFFFFFFFF = NO_STRING_REF (JS writer's sentinel for non-players)
        if string_count > 0 {
            if sr != 0xFFFF_FFFF && sr >= string_count {
                return E_BAD_STRING_TABLE;
            }
        } else if sr != 0xFFFF_FFFF {
            return E_BAD_STRING_TABLE; // stringRef without a table is meaningless
        }
        let slot = match st.alloc_slot(id) {
            Some(sl) => sl,
            None => return E_SLOT_EXHAUSTED,
        };
        let u = slot as usize;
        st.archetype[u] = ru16(b, o + 4) as u16;
        st.variant[u] = ru16(b, o + 6) as u16;
        st.string_ref[u] = sr;
        st.x[u] = rf32(b, o + 12);
        st.y[u] = rf32(b, o + 16);
        st.z[u] = rf32(b, o + 20);
        st.yaw[u] = rf32(b, o + 24);
        // staging for JS (aligned with out_spawn_*)
        st.out_spawn_ids.push(id);
        st.out_spawn_arch.push(st.archetype[u]);
        st.out_spawn_variant.push(st.variant[u]);
        st.out_spawn_sref.push(sr);
        st.out_spawn_x.push(st.x[u]);
        st.out_spawn_y.push(st.y[u]);
        st.out_spawn_z.push(st.z[u]);
        st.out_spawn_yaw.push(st.yaw[u]);
    }
    OK
}

fn apply_despawn(st: &mut Store, b: &[u8], s: &Section) -> u32 {
    for i in 0..s.count as usize {
        let id = ru32(b, s.start + i * 4);
        // Unknown ids are tolerated silently (lifecycle race tolerance, §4):
        // generation-checked store state cannot resurrect them.
        if let Some(slot) = st.get_slot(id) {
            st.free_slot(slot);
        }
        st.out_despawn_ids.push(id);
    }
    OK
}

fn apply_columns(st: &mut Store, b: &[u8], s: &Section, transform: bool) -> u32 {
    let c = s.count as usize;
    let base = s.start + if s.enc == ENC_SORTED { 4 * c } else { 0 };
    for i in 0..c {
        let slot = match resolve_slot(st, s, b, i) {
            Some(sl) => sl,
            None => return if s.enc == ENC_DENSE { E_BAD_DENSE } else { E_UNKNOWN_ID },
        };
        let o = base + i * 4;
        if transform {
            // columnar: x[0..c], y[c..2c], z[2c..3c], yaw[3c..4c]
            let (x, y, z, yaw) =
                (rf32(b, o), rf32(b, o + 4 * c), rf32(b, o + 8 * c), rf32(b, o + 12 * c));
            let u = slot as usize;
            st.x[u] = x;
            st.y[u] = y;
            st.z[u] = z;
            st.yaw[u] = yaw;
            st.out_ids.push(row_id(st, s, b, i));
            st.out_x.push(x);
            st.out_y.push(y);
            st.out_z.push(z);
            st.out_yaw.push(yaw);
        } else {
            let (vx, vy, vz) = (rf32(b, o), rf32(b, o + 4 * c), rf32(b, o + 8 * c));
            let u = slot as usize;
            st.vx[u] = vx;
            st.vy[u] = vy;
            st.vz[u] = vz;
        }
    }
    OK
}

fn apply_anim(st: &mut Store, b: &[u8], s: &Section) -> u32 {
    let c = s.count as usize;
    let base = s.start + if s.enc == ENC_SORTED { 4 * c } else { 0 };
    for i in 0..c {
        let slot = match resolve_slot(st, s, b, i) {
            Some(sl) => sl,
            None => return if s.enc == ENC_DENSE { E_BAD_DENSE } else { E_UNKNOWN_ID },
        };
        let u = slot as usize;
        st.anim_state[u] = b[base + i]; // state column
        st.emote[u] = b[base + c + i]; // emote column
    }
    OK
}

fn apply_flags(st: &mut Store, b: &[u8], s: &Section) -> u32 {
    let c = s.count as usize;
    let base = s.start + if s.enc == ENC_SORTED { 4 * c } else { 0 };
    for i in 0..c {
        let slot = match resolve_slot(st, s, b, i) {
            Some(sl) => sl,
            None => return if s.enc == ENC_DENSE { E_BAD_DENSE } else { E_UNKNOWN_ID },
        };
        let v = b[base + i];
        st.flags[slot as usize] = v;
        st.out_flag_ids.push(row_id(st, s, b, i));
        st.out_flag_vals.push(v);
    }
    OK
}

fn apply_visual(st: &mut Store, b: &[u8], s: &Section) -> u32 {
    let c = s.count as usize;
    let base = s.start + if s.enc == ENC_SORTED { 4 * c } else { 0 };
    for i in 0..c {
        let slot = match resolve_slot(st, s, b, i) {
            Some(sl) => sl,
            None => return if s.enc == ENC_DENSE { E_BAD_DENSE } else { E_UNKNOWN_ID },
        };
        let u = slot as usize;
        st.archetype[u] = ru16(b, base + i * 2) as u16; // archetype column
        st.variant[u] = ru16(b, base + 2 * c + i * 2) as u16; // variant column
    }
    OK
}

//! Status codes returned by every entry point. Mirrored verbatim in
//! benchmarks/realtime/lib/wasm/glue.mjs, jsRefDecoder.mjs and ABI.md —
//! keep the four tables in sync.

pub const OK: u32 = 0;
/// Dropped unconditionally: frame.room_epoch < store.epoch (stale-owner fencing, contract §4).
pub const OK_STALE: u32 = 1;
/// Dropped: epoch moved forward or baseline_sequence mismatch — client must resync (§4).
pub const OK_RESYNC_NEEDED: u32 = 2;
/// RESYNC_REQUIRED frame processed: baseline invalidated.
pub const OK_RESYNC: u32 = 3;

// Errors (10+). A hostile frame must produce one of these, never a panic.
pub const E_TOO_LARGE: u32 = 16; // frame > 1 MiB
pub const E_BAD_MAGIC: u32 = 17;
pub const E_BAD_VERSION: u32 = 18;
pub const E_BAD_HEADER: u32 = 19; // len < 24, header_size != 24, reserved header flags
pub const E_BAD_FRAME_TYPE: u32 = 20;
pub const E_TRUNCATED: u32 = 21; // section header/payload exceeds remaining bytes
pub const E_TOO_MANY_SECTIONS: u32 = 22; // > 16
pub const E_ENTITY_COUNT: u32 = 23; // > 100_000 rows in a section
pub const E_BAD_SECTION: u32 = 24; // unknown/duplicate section_id, reserved != 0, string-table rules
pub const E_BAD_ENCODING: u32 = 25; // encoding not applicable to this section
pub const E_ENC_UNSUPPORTED: u32 = 26; // ROARING / BITSET / ARROW not implemented in this decoder
pub const E_PAYLOAD_LEN: u32 = 27; // payload_len != exact size implied by (section, encoding, count)
pub const E_TRAILING: u32 = 28; // bytes after the last section
pub const E_UNSORTED: u32 = 29; // SORTED_IDS not strictly ascending
pub const E_UNKNOWN_ID: u32 = 30; // component-section id not in store (baseline gap)
pub const E_ID_EXISTS: u32 = 31; // spawn id already live
pub const E_SLOT_EXHAUSTED: u32 = 32;
pub const E_BAD_ENUM: u32 = 33; // anim state/emote or flags reserved bits out of range
pub const E_BAD_STRING_TABLE: u32 = 34;
pub const E_BAD_DENSE: u32 = 35; // DENSE count != live_count or hole in slot range
/// Sticky: an earlier frame failed mid-apply, so the baseline is untrusted.
/// Cleared by FULL_SNAPSHOT (or RESYNC_REQUIRED).
pub const E_POISONED: u32 = 36;
pub const E_NO_MEMORY: u32 = 37; // allocation reservation failed
pub const E_BAD_HANDLE: u32 = 38; // ABI handle does not name a live store
/// JS-glue only: the wasm instance trapped (should be impossible; fuzz-proven).
pub const E_TRAP: u32 = 63;

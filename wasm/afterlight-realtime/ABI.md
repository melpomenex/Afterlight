# afterlight-realtime wasm ABI (v1)

Artifact: `wasm/afterlight-realtime/target/wasm32-unknown-unknown/release/afterlight_realtime.wasm`
Build: `cd wasm/afterlight-realtime && cargo build --target wasm32-unknown-unknown --release`
(no wasm-bindgen, no imports, no exports other than those below + `memory`).

Implements `docs/architecture/realtime/contract.md` v0 (`afterlight-soa-v1`):
24-byte header, ≤16 sections of 12-byte headers, columnar payloads, slot-based
entity store with id→slot map + free list. All decoder constraints enforced:
frame ≤ 1 MiB, ≤ 16 sections, entity_count ≤ 100 000 per section, every length
bounds-checked before use, exact `payload_len` equality, unknown
section_id/encoding/frame_type rejected, trailing bytes rejected, strict
ascending SORTED_IDS, anim state 0..3 / emote 0..6, flags bits 3+ zero.
Every failure is a status code — the decoder never panics on hostile input
(proven by `tests/fuzz.rs`, 12 000 deterministic mutation iterations).

## Frame-format decisions locked by this decoder (v0 reconciliation points)

- **Spawn section (section_id 1) is INTERLEAVED 28-byte rows**, matching the
  JS reference writer (`shared/realtime/encoders.js writeSpawnSection`): per
  row `id u32, archetype u16, variant u16, stringRef u32, x/y/z/yaw f32`.
  Rows carry their own id, so the encoding byte is **DENSE (0)** from the JS
  writer (SORTED (1) accepted for Rust builders — payload math is identical);
  no separate id mask. `stringRef = 0xFFFFFFFF` (**NO_STRING_REF**, the
  writer's sentinel for non-players) is valid with or without a string table;
  any other ref must index the table.
- **Chunked frames (contract §4a amendment)**: frame_type 3 =
  `SNAPSHOT_CHUNK`, 4 = `DELTA_CHUNK`; header flag bit1 = `CHUNK_END`
  (bit0 remains HAS_STRING_TABLE, bits 2+ reserved). A SNAPSHOT_CHUNK whose
  frame_sequence differs from the accumulating one resets the store and
  starts a fresh snapshot (epoch-fenced: `epoch < store.epoch` → OK_STALE);
  CHUNK_END commits `st.seq`, clears poison and re-arms the delta baseline.
  DELTA_CHUNK is baseline-checked exactly like DELTA (`baseline ==
  st.seq` on every chunk); `st.seq` commits only on CHUNK_END. Chunks of one
  logical frame share frame_sequence — the JS reference emits them via
  `shared/realtime/writer.js writeChunkedFrames`.
- **Snapshot (frame_type 0)** = spawn section over the fresh store
  (self-validating, no baseline needed); DELTAs (frame_type 1) = `transform`
  + `flags`, both SORTED_IDS (matching `lib/encoders/soaSorted.mjs`).
- **DENSE** (encoding 0) on component sections = values for slots
  0..entity_count-1, no id list; the decoder requires every addressed slot to
  be live (no holes).
- **ROARING (2) / BITSET (3) / ARROW (4)** are recognized but return
  `E_ENC_UNSUPPORTED` (26) — rejection without guessing is contract-legal;
  portable Roaring is future work for whichever encoding wins.
- A frame that fails mid-apply (id unknown to the store, duplicate spawn id)
  marks the store **poisoned**: further DELTA/DELTA_CHUNKs get `E_POISONED`
  until the next FULL_SNAPSHOT or a completed SNAPSHOT_CHUNK chain, which
  restore a known-good state (contract §4/§4a).

## Status codes (`src/status.rs`, mirrored in glue.mjs / jsRefDecoder.mjs)

| code | name | meaning |
|---|---|---|
| 0 | OK | frame applied |
| 1 | OK_STALE | dropped: room_epoch < store epoch (§4 fencing) |
| 2 | OK_RESYNC_NEEDED | dropped: epoch advanced or baseline mismatch |
| 3 | OK_RESYNC | RESYNC_REQUIRED processed, baseline invalidated |
| 16 | E_TOO_LARGE | frame > 1 MiB |
| 17 | E_BAD_MAGIC | magic != "ALRT" |
| 18 | E_BAD_VERSION | protocol_version != 1 |
| 19 | E_BAD_HEADER | len < 24, header_size != 24, or reserved header flag bits 2+ (bit0 HAS_STRING_TABLE, bit1 CHUNK_END) |
| 20 | E_BAD_FRAME_TYPE | frame_type > 4 |
| 21 | E_TRUNCATED | section header/payload exceeds remaining bytes |
| 22 | E_TOO_MANY_SECTIONS | > 16 sections |
| 23 | E_ENTITY_COUNT | section rows > 100 000 |
| 24 | E_BAD_SECTION | unknown/duplicate section_id, reserved != 0, string-table rules |
| 25 | E_BAD_ENCODING | encoding not applicable to this section |
| 26 | E_ENC_UNSUPPORTED | ROARING/BITSET/ARROW not implemented in v0 |
| 27 | E_PAYLOAD_LEN | payload_len != exact mask+columns size |
| 28 | E_TRAILING | RESYNC frame carries extra bytes |
| 29 | E_UNSORTED | SORTED_IDS not strictly ascending |
| 30 | E_UNKNOWN_ID | component-section id not in store (poisons) |
| 31 | E_ID_EXISTS | spawn id already live (poisons) |
| 32 | E_SLOT_EXHAUSTED | spawn exceeds free slots (pre-checked, no partial apply) |
| 33 | E_BAD_ENUM | anim state/emote or flags reserved bits |
| 34 | E_BAD_STRING_TABLE | malformed table or bad stringRef (poisons) |
| 35 | E_BAD_DENSE | DENSE addresses a non-live slot (poisons) |
| 36 | E_POISONED | sticky, until next FULL_SNAPSHOT / completed SNAPSHOT_CHUNK chain |
| 37 | E_NO_MEMORY | reservation failed |
| 38 | E_BAD_HANDLE | unknown handle or ptr not from scratch_ptr |
| 63 | E_TRAP | glue-side only: instance trapped (should be impossible) |

## Exports

All functions are `extern "C"`. `handle` is an opaque u32 from `store_new`
(0 = null). Memory: `exports.memory`, single-threaded (contract §7 worker).

```text
abi_version() -> u32                          // 1

store_new(max_slots: u32) -> handle           // 0 on failure; max_slots <= 65536
store_destroy(handle)                         // idempotent; handle 0 = no-op

scratch_ptr(handle, len: u32) -> ptr          // addr of the shared 1 MiB inbound
                                              // buffer; write len bytes there, then
                                              // apply_frame(handle, ptr, len)
apply_frame(handle, ptr, len) -> status       // decode + apply; see status table

reset_to(handle, epoch, seq, has_baseline) -> status   // empty the store and set
                                              // session state (chain-replay support)
reset_session(handle, epoch, seq) -> status   // re-arm epoch/seq/has_baseline and
                                              // clear poison WITHOUT touching entities
                                              // (replay a recorded delta chain)

seq(handle) -> u32                            // last committed frame_sequence
epoch(handle) -> u32  tick(handle) -> u32     // session state
live(handle) -> u32   has_baseline(handle) -> u32

out_ids(handle) -> i64                        // staged outputs of the LAST applied
out_x(handle) -> i64                          // frame; i64 packs (ptr << 32) | len
out_y(handle) -> i64                          // in ELEMENTS; 0 = empty. Alignment:
out_z(handle) -> i64                          //   out_ids[i] <-> out_x[i..] (transform
out_yaw(handle) -> i64                        //   section rows, in frame order)
out_flag_ids(handle) -> i64                   // flags section ids + u8 values
out_flag_vals(handle) -> i64
out_spawn_ids(handle) -> i64                  // spawn rows: ids, arch, variant,
out_spawn_arch(handle) -> i64                 // stringRef, transform columns
out_spawn_variant(handle) -> i64
out_spawn_sref(handle) -> i64
out_spawn_x(handle) -> i64  (+ _y, _z, _yaw)
out_despawn_ids(handle) -> i64
```

JS side reads outputs as typed-array views over `memory.buffer`
(`new Float32Array(memory.buffer, ptr, len)`), recreating the view after any
call that may have grown memory (`scratch_ptr`, `apply_frame`). `glue.mjs`
wraps all of this; `memory.buffer.byteLength` tracks linear-memory growth.

## Ownership & safety notes

- The inbound scratch buffer is owned by the module (1 MiB, zero-initialized
  once). Hosts must write `len` bytes at `scratch_ptr`'s address before
  `apply_frame`; `apply_frame` only accepts `ptr == scratch_ptr(len)`.
- Output staging is owned by the module and valid until the next
  `apply_frame`/`reset_to` on the same store.
- No host imports; nothing re-enters JS; `panic = "abort"` in release, so a
  bug would trap (caught by glue as `E_TRAP`) — the fuzz suite exists to make
  that unreachable.
- Allocation: all store growth uses `try_reserve`; failure -> `E_NO_MEMORY`,
  never an abort. Steady-state ticking performs zero allocations.

## Not included in v0 (deliberate)

- Roaring/Bitset/Arrow payload decoding (rejected with status, see above).
- Motion/anim/visual staging outputs (sections are decoded into the store;
  JS-facing staging covers ids/transform/flags/spawn/despawn only).
- String bytes are validated but not retained (identity strings are a
  main-thread concern; the store keeps numeric stringRefs).

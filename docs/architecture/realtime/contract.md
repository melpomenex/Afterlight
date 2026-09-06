# Realtime data-plane contract v0 — `afterlight-soa-v1`

Status: workstream-internal contract, 2026-09-06. Every encoder, decoder,
benchmark, and spec in this workstream implements exactly this. Changes to this
file are breaking changes and require bumping `PROTOCOL_VERSION` and updating
all experiments together.

This v0 exists to make experiments comparable. It is not yet a shipped wire
format; the OpenSpec change `realtime-binary-gpu-acceleration` promotes (or
rejects) it based on `benchmarks/realtime` evidence.

## 1. Scope and non-goals

- Data plane only: transform/motion/animation/visual/lifecycle of realtime
  entities. Control plane (auth, joins, durable commands, chat, theater) stays
  JSON over the existing messages.
- One socket, two frame kinds: JSON text frames (unchanged catalog) and binary
  frames (this contract). WS frames self-describe: text vs binary, and binary
  frames start with the magic u32 `0x414C5254` ("ALRT") little-endian — never a
  valid JSON prefix byte (`{` = 0x7B).
- No server-private state crosses this plane merely because the format could
  carry it.

## 2. Entity model

Entities have a stable **u32 server entity id** and a dense **u16 client slot**
(0..`MAX_SLOTS`). Slot allocation is client-owned (free-list); frames always
carry server ids; the client store maps id→slot. Player entities additionally
carry their guestId string **once, in the spawn section**, so identity
continuity (self-echo, `garden:<id>`) survives.

Components (all little-endian):

| Component | Fields | Layout |
|---|---|---|
| transform | x, y, z, yaw | 4 × f32 |
| motion | vx, vy, vz | 3 × f32 (v0 frames may omit section entirely when the game has no velocities) |
| anim | state, emote | u8 state (0 idle, 1 walk, 2 air, 3 sit), u8 emote (0 none, 1–6) |
| flags | bitfield | u8: bit0 walking, bit1 sitting, bit2 airborne, bits3+ reserved 0 |
| visual | archetype, variant | u16 archetype (0 player, 1 kiln, 2.. props/vegetation), u16 variant |

`anim.state` and `flags` overlap by design (flags are the compat projection of
today's `presence_update`; anim is the future-facing normalized form). Encoders
MUST emit `flags`; `anim`/`motion`/`visual` are optional sections.

World bounds for fixture realism: x ∈ [-11.3, 11.3], z ∈ [-9.5, 10.3],
y ∈ [0, 0.72] (jump apex), yaw ∈ [0, 2π).

## 3. Frame layout

Header, 24 bytes, little-endian:

```text
offset size field
0      4    magic = 0x414C5254 ("ALRT")
4      1    protocol_version (v0 = 1)
5      1    frame_type (0 FULL_SNAPSHOT, 1 DELTA, 2 RESYNC_REQUIRED,
                  3 SNAPSHOT_CHUNK, 4 DELTA_CHUNK — see §4a)
6      1    flags (bit0: contains string table, bit1: CHUNK_END)
7      1    header_size (24, forward-extensible)
8      4    room_epoch (u32; 0 = single-owner era; later = room_leases.epoch)
12     4    server_tick (u32; 100 ms grid counter)
16     4    frame_sequence (u32; monotonic per room owner)
20     4    baseline_sequence (u32; snapshot: own sequence; delta: seq it applies to)
```

Sections follow, each:

```text
offset size field
0      1    section_id (1 lifecycle-spawn, 2 lifecycle-despawn, 3 transform,
                  4 motion, 5 anim, 6 flags, 7 visual, 8 string-table)
1      1    encoding (0 DENSE, 1 SORTED_IDS, 2 ROARING, 3 BITSET,
                  4 ARROW_RECORD_BATCH)
2      2    reserved 0
4      4    entity_count (u32; rows in this section)
8      4    payload_len (u32; bytes of payload including any embedded mask)
12     ...  payload
```

Payloads are columnar within a section: mask/ids first (per encoding), then one
value column per field in the order of §2, each column `entity_count` values
contiguous. DENSE = values for slots 0..entity_count-1 in slot order (no id
list). SORTED_IDS = `entity_count` ascending u32 ids then columns. ROARING =
portable Roaring serialization (CRoaring `roaring_uint32_serialize`) of the
changed ids then columns. BITSET = ceil(world_max_id/8) bytes, bit i = id i,
then columns. A section with `entity_count = 0` is omitted entirely.

String table section (only with header flag bit0): count u32, then per entry
u16 byte-length + UTF-8 bytes, referenced by spawn rows in table order
(spawn rows carry u32 id, u16 archetype, u16 variant, u32 stringRef, then
transform fields).

Despawn: mask only (ids), no columns.

Constraints (both ends MUST enforce): max frame 1 MiB, max sections 16,
max entity_count per section 100_000, all lengths bounds-checked against
remaining frame bytes before allocation, unknown section_id/encoding/frame_type
→ reject frame (never guess). Trailing bytes after the last section are
rejected. All rejection paths are silent-per-frame plus a counter — a bad frame
never throws into game code.

## 4. Snapshot/delta/epoch semantics

- A client tracks, per room: `epoch`, `frame_sequence`, and whether it holds a
  valid baseline. `FULL_SNAPSHOT` resets all state to its contents.
- `DELTA` applies only if `frame.baseline_sequence === client.frame_sequence`
  and `frame.room_epoch === client.epoch`; else the frame is dropped and the
  client requests resync (re-join semantics: fresh `FULL_SNAPSHOT`).
- Frames with `room_epoch < client.epoch` are discarded unconditionally
  (stale-owner fencing). A higher epoch invalidates the baseline.
- Late transform deltas for the same entity supersede earlier ones naturally
  (last write wins); lifecycle events are never reordered past an epoch change.
- A FULL_SNAPSHOT at a higher epoch IS the resync delivery: it applies without
  a baseline (it is self-validating) and updates the client's epoch. A DELTA at
  a mismatched epoch or baseline never applies; it triggers resync.
- A frame consisting of exactly the 24-byte header is a legal empty DELTA
  (nothing changed); truncated frames longer than the header are rejected by
  the section table. Senders SHOULD avoid empty deltas; receivers accept them.

## 4a. Chunked frames (v0 amendment: SNAPSHOT_CHUNK / DELTA_CHUNK)

The 1 MiB frame cap binds before the largest populations (a 50k-entity
snapshot is ~1.4 MB; measured in `benchmarks/realtime/results/wasm.md` #4).
Chunked frame types split them. Rules:

- SNAPSHOT_CHUNK (3): a snapshot split into N frames sharing one
  `frame_sequence`. The first chunk with a sequence the client is not
  accumulating (tracked as `chunk_seq`) resets the store; subsequent chunks
  with the same sequence append. `CHUNK_END` (flags bit1) on the final chunk
  commits `frame_sequence` as the new delta baseline. Snapshots are
  self-validating: no baseline check, stale epochs dropped as §4.
- DELTA_CHUNK (4): baseline-checked like DELTA; all chunks share the
  original `baseline_sequence`; `frame_sequence` commits only on `CHUNK_END`
  so every chunk matches. Chunks are not individually acknowledged — on loss
  the sender restarts the whole frame (re-join semantics for snapshots).
- Spawn-row transforms ride spawn rows; each chunk's string table carries
  only its own identities (per-chunk stringRefs).
- Old readers reject the unknown frame types cleanly (enum validation) —
  they never misapply a partial snapshot. This is why chunking is two new
  frame types, not a header flag.
- Reference implementation: `shared/realtime/writer.js` `writeChunkedFrames`
  (caller-selectable budget, e.g. 900 KiB per chunk); verified live at
  50,002 entities through the worker path.
- Spawn = allocate slot, fill all components from the spawn row (+ defaults),
  render only after initialization; Despawn = free slot, clear GPU state,
  generation-checked so a delayed stale frame cannot resurrect an id
  (id+epoch+sequence guarded).

## 5. Capability negotiation (additive, JSON)

Client `hello` MAY include: `"rt": {"protocols": ["afterlight-soa-v1"],
"webgpu": bool, "wasm": bool}`. Server `welcome` MAY include: `"rt":
{"protocol": "afterlight-soa-v1", "snapshot_hz": 10}`. Absence on either side
= legacy mode. Servers MUST NOT send binary frames to clients that did not
advertise; clients that fail to decode (3 consecutive bad frames) locally
disable the fast path and keep playing in legacy mode (server keeps sending;
legacy handlers ignore binary frames they don't read — they already ignore
non-JSON text). No new JSON message types are introduced by v0; future
`rt_error`/`rt_resync` messages belong to a later, explicitly scoped change.

## 6. Server layering (design target for the Elixir side)

```text
RoomServer (authoritative state)
  → WorldDelta extractor (diff vs last acknowledged frame)
  → RealtimeFrame struct (sections + masks + columns)
  → Afterlight.Realtime.FrameEncoder behaviour
      ├── Encoders.JSON       (debug: same shape as presence_update)
      ├── Encoders.BinarySoA  (this contract)
      └── Encoders.Arrow      (Arrow IPC record batches, if it wins)
  → Phoenix socket serializer / WS binary frame
```

Channel handlers never touch byte offsets. Encode once per capability class
per tick; fan out the same iodata. Interest management (per-client filtering)
may later split rooms into frame classes; correctness precedes reuse.

## 7. Client layering (design target)

```text
WS binary frame → Web Worker → (optional) WASM decoder/entity store
  → changed-id + changed-column arrays (typed arrays, zero per-entity objects)
  → main thread: EntityRenderBackend
      ├── CPUThreeBackend   (writes into setPlayer()-compatible entries /
      │                      InstancedMesh matrices) — default
      └── WebGPUThreeBackend (compact upload + compute scatter into
                              persistent storage buffers; experimental)
  → interpolation (prev/next transform + timestamps) before render sampling
```

The worker transfers ArrayBuffers (structured clone transfer, no
SharedArrayBuffer in v0). The CPU backend's public output is the
`setPlayer({id, x, z, rotY, walking, sitting, airborne})` entry shape — the
legacy avatar code is untouched.

## 8. Benchmark methodology (binding for all experiments)

- Fixtures: `benchmarks/realtime/lib/fixtures.mjs` (seeded, deterministic).
  Populations N ∈ {50, 100, 200, 500, 1000, 5000, 10000, 50000}; changed
  fraction f ∈ {0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0}; component mix mirrors
  §2 with the flag distribution of a busy room (≈60% idle, 25% walking, 10%
  sitting, 5% airborne).
- Baseline JSON (encoding A) is the **current wire shape**: a
  `presence_update`-shaped object with string ids — measured through
  `JSON.stringify`/`JSON.parse`, the real code path.
- Every encoder measures: frame bytes, encode time, decode time, decode
  allocations (heap delta across runs with `--expose-gc`), and end-to-end
  apply (decode → entity-store update) where a store exists.
- Timing: warmup ≥ 3, measured ≥ 20 runs, report median + p95. Node ≥ 22,
  fixed clock (`performance.now`), no concurrent load, results committed as
  JSON + a generated markdown table.
- Server-side (BEAM) measurements are standalone `.exs` scripts until P1
  provides a Mix app; they measure iodata construction + `:erlang.term_to_*`
  where relevant, same fixtures imported from JSON.
- Density thresholds (sorted ids vs bitset vs Roaring; hybrid H) are chosen
  from these results, never hardcoded up front.
- Fuzzing: decoders must survive truncation, length overflow, bad enums, and
  random byte mutation without throwing out of the decode entry point.

## 9. Workstream file map (also in compat-report.md §4)

`docs/architecture/realtime/**`, `benchmarks/realtime/**`,
`shared/realtime/**`, `tests/realtime/**`, `wasm/**`, `tools/realtime/**`,
`src/realtime/**`, `openspec/changes/{realtime-*,add-realtime-*}`.
Nothing outside this map is edited without updating both docs.

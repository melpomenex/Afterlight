# realtime-binary-protocol

## Purpose

An additive binary data plane for realtime entity state: the `afterlight-soa-v1`
frame format (byte-exact contract in `docs/architecture/realtime/contract.md`),
capability negotiation on existing JSON messages, explicit snapshot/delta/
baseline/epoch semantics so no client ever applies a delta against an unknown
baseline, pure and hostile-input-hardened codecs, debug tooling, and the
server-side `FrameEncoder` behaviour contract for the Phoenix/OTP migration to
implement. The frozen JSON message catalog is untouched; nothing is wired into
the live game by this capability alone.

## ADDED Requirements

### Requirement: Frame format and codec fidelity

The codec SHALL read and write `afterlight-soa-v1` frames exactly as specified in `docs/architecture/realtime/contract.md`: the 24-byte little-endian header (magic `0x414C5254`, protocol version, frame type FULL_SNAPSHOT/DELTA/RESYNC_REQUIRED, flags, `room_epoch`, `server_tick`, `frame_sequence`, `baseline_sequence`, `header_size`) followed by self-describing sections (lifecycle spawn/despawn, transform, motion, anim, flags, visual, string table) whose payloads are columnar in entity order. Spawn rows SHALL carry the player's guestId string once via the string table so identity continuity (self-echo filtering, `garden:<guestId>`) is preserved. Binary frames SHALL be distinguishable from JSON text frames without parsing (leading magic; JSON always begins `{`).

#### Scenario: Frame sniffing is unambiguous

- **WHEN** a socket message arrives, whether text or binary
- **THEN** the receiver can classify it by frame kind alone, and a JSON parser never sees binary bytes

#### Scenario: Spawn carries identity

- **WHEN** a player entity spawns in a snapshot
- **THEN** the frame's string table contains their guestId exactly once and the spawn row references it, and the client's store resolves the u32 entity id to that guestId

### Requirement: Strict decoder limits and bounded rejection

Every decoder SHALL enforce, before any allocation: maximum frame size 1 MiB, maximum 16 sections, maximum 100,000 rows per section, every length field validated against remaining bytes, only known enum values accepted, and trailing bytes after the last section rejected. Malformed input SHALL produce a bounded rejection result (status/error object), SHALL NOT throw into game code, panic, hang, or allocate proportional to attacker-controlled lengths, and SHALL leave the entity store usable for the next valid frame. Fuzz-style tests SHALL cover truncation, byte flips, length overflow, bad enums, and trailing garbage for every decoder.

#### Scenario: Absurd length claims allocate nothing

- **WHEN** a frame declares a 4 GB payload length
- **THEN** the decoder rejects it at validation without allocating

#### Scenario: Store survives hostile frames

- **WHEN** a corrupted frame is rejected mid-session
- **THEN** a subsequent valid snapshot applies correctly to the same store

### Requirement: Snapshot, delta, and baseline semantics

The client SHALL track, per room, the accepted `room_epoch` and `frame_sequence`. A FULL_SNAPSHOT SHALL replace client entity state wholesale. A DELTA SHALL apply only when its `baseline_sequence` equals the client's held sequence and its epoch matches; otherwise the frame SHALL be dropped and the client SHALL resync (request a fresh snapshot) rather than apply it. Frames with `room_epoch` lower than the client's held epoch SHALL be discarded unconditionally. Transform deltas for the same entity SHALL supersede in arrival order; lifecycle events SHALL be generation-guarded so a delayed stale frame cannot resurrect a despawned id.

#### Scenario: Delta against unknown baseline is never applied

- **WHEN** a client that missed frame N receives delta N+1
- **THEN** the delta is dropped, state remains at baseline N, and a resync snapshot is requested

#### Scenario: Stale owner cannot corrupt state

- **WHEN** frames from a superseded room owner (lower epoch) arrive after a newer-epoch snapshot
- **THEN** every stale frame is discarded and state reflects only the newer epoch

### Requirement: Density-selected section encodings

Section encodings (DENSE, SORTED_IDS, ROARING, BITSET, ARROW_RECORD_BATCH) SHALL be selectable per section per frame, and the reference writer SHALL select between compact sorted ids, Roaring masks, and dense/omitted masks using thresholds measured by the benchmark harness, recorded with their justifying numbers in the selector source. Readers SHALL accept any valid encoding per section independent of the writer's policy, so selection policy can evolve without a protocol version bump.

#### Scenario: Policy changes without breakage

- **WHEN** the writer's threshold table changes after new measurements
- **THEN** existing readers decode the new frames unchanged

#### Scenario: Thresholds cite measurements

- **WHEN** the density selector is read
- **THEN** each threshold documents the benchmark numbers that chose it

### Requirement: Additive capability negotiation

Negotiation SHALL use additive JSON fields only: client `hello` MAY carry `"rt": {"protocols": [...], "webgpu": bool, "wasm": bool}` and server `welcome` MAY carry `"rt": {"protocol": "...", "snapshot_hz": N}`. Absence of the fields on either side SHALL mean legacy mode. A server SHALL NOT send binary frames to a client that did not advertise, and a client SHALL self-disable the fast path after repeated consecutive decode failures and continue on the legacy path. No new JSON message types SHALL be introduced by this capability; resync requests in v0 reuse the existing re-join flow.

#### Scenario: Legacy server ignores capabilities

- **WHEN** a client sends `hello` with an `rt` object to a server without binary support
- **THEN** the server ignores the field and the session proceeds entirely in legacy mode

#### Scenario: Client self-disables on repeated failure

- **WHEN** the client fails to decode three consecutive binary frames
- **THEN** it stops feeding the fast path, keeps playing via the legacy handlers, and the game state remains correct

### Requirement: Pure codecs, clean boundaries

The codecs SHALL live under `shared/realtime/` as pure modules import-safe under Node and the browser (like existing `shared/` modules), SHALL NOT import game code, network code, or renderer code, and SHALL be consumed by tests under `tests/realtime/` via `node --test tests/realtime/` without modifying the root test script. The decoded output format SHALL be compatible with `RemotePlayersManager.setPlayer()` entry shapes so the legacy avatar path consumes fast-path state unmodified.

#### Scenario: Codecs run headless

- **WHEN** the realtime test suite runs under plain Node
- **THEN** no DOM, WebSocket, or renderer dependency is required

#### Scenario: Fast path feeds the legacy renderer

- **WHEN** a decoded frame updates the entity store
- **THEN** the produced per-entity entries can be applied by the existing avatar update code without adaptation

### Requirement: Chunked snapshots and deltas beyond the frame cap

Oversized state SHALL be split into SNAPSHOT_CHUNK / DELTA_CHUNK frames sharing one `frame_sequence`, each within the frame-size cap, with `CHUNK_END` on the final chunk committing the sequence. A SNAPSHOT_CHUNK sequence accumulating on a client SHALL reset the store only at its first chunk and append thereafter; DELTA_CHUNK frames SHALL retain their original `baseline_sequence` on every chunk so each applies. Because old readers reject unknown frame types by enum validation, a legacy client SHALL never misapply a partial snapshot — it rejects and resyncs instead. Chunked joins SHALL be verified against populations no single frame can carry (≥ 50,000 entities).

#### Scenario: 50k-entity join through a capped wire

- **WHEN** a 50,000-entity snapshot is written with the reference chunking writer and applied to a fresh store
- **THEN** every chunk fits the frame cap, the entity count matches exactly, and the committed sequence equals the final chunk's

#### Scenario: Legacy reader refuses a partial snapshot safely

- **WHEN** a chunk frame reaches a reader that predates the chunk types
- **THEN** the frame is rejected on frame-type validation and the client resyncs rather than applying a partial world

### Requirement: Debuggability and server encoder contract

The capability SHALL include a JSON debug encoding reproducing the legacy message shapes, a frame-dump tool that prints tick, epoch, sequence, frame type, per-section encodings and counts, and a readable entity table from captured bytes, and a documented encoding-selection switch (`AFTERLIGHT_REALTIME_ENCODING=json`) for development. The server side SHALL be specified as an `Afterlight.Realtime.FrameEncoder` behaviour over a `RealtimeFrame` struct produced by delta extraction, with channel handlers free of byte-offset arithmetic and with encode-once-per-capability-class fanout; reference BEAM measurements live in the benchmark harness until the Mix app exists.

#### Scenario: Captured frame is readable

- **WHEN** a developer runs the frame-dump tool on a captured binary frame
- **THEN** the output includes metadata and per-entity rows matching the frame contents

#### Scenario: Handlers stay byte-free

- **WHEN** the server encoder contract is implemented by a Phoenix room process
- **THEN** channel handlers pass `RealtimeFrame` structs to an encoder module and contain no section/offset logic

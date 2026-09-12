## MODIFIED Requirements

### Requirement: Snapshot, delta, and baseline semantics
The client SHALL track, per room, the accepted `room_epoch` and `frame_sequence`. A FULL_SNAPSHOT SHALL replace client entity state wholesale. A DELTA SHALL apply only when its `baseline_sequence` equals the client's held sequence and its epoch matches; otherwise the frame SHALL be dropped and the client SHALL resync (request a fresh snapshot) rather than apply it. Frames with `room_epoch` lower than the client's held epoch SHALL be discarded unconditionally. Transform deltas for the same entity SHALL supersede in arrival order; lifecycle events SHALL be generation-guarded so a delayed stale frame cannot resurrect a despawned id. The live full-roster presence flush SHALL be encoded as a FULL_SNAPSHOT carrying SPAWN + STRING_TABLE + TRANSFORM + FLAGS, so entity state and guest identity are re-established from one self-validating frame. A decoder session that has not applied a frame since its last reset (new connection, room rejoin, or worker/renderer restart) SHALL adopt the baseline of its first applicable frame and apply it instead of resyncing; once a baseline is established, the strict delta-gap rule above applies unchanged.

#### Scenario: Delta against unknown baseline is never applied

- **WHEN** a client that missed frame N receives delta N+1
- **THEN** the delta is dropped, state remains at baseline N, and a resync snapshot is requested

#### Scenario: Stale owner cannot corrupt state

- **WHEN** frames from a superseded room owner (lower epoch) arrive after a newer-epoch snapshot
- **THEN** every stale frame is discarded and state reflects only the newer epoch

#### Scenario: Fresh decoder session adopts its first baseline

- **WHEN** a decoder session with no established baseline (after a room rejoin or worker restart) receives a delta whose `baseline_sequence` differs from the reset sequence
- **THEN** the session aligns to that frame's baseline and applies it, and subsequent in-order frames apply without a resync loop

#### Scenario: Live flush re-baselines a rejoining client with identity

- **WHEN** a client rejoins a place while the server's frame sequence continues from an earlier room
- **THEN** the next flush is a full snapshot whose string table carries each member's guest id and whose spawn rows apply wholesale, and no repeated resync/clear cycle occurs

### Requirement: Additive capability negotiation
Negotiation SHALL use additive JSON fields only: client `hello` MAY carry `"rt": {"protocols": [...], "webgpu": bool, "wasm": bool, "spawn": bool}` and server `welcome` MAY carry `"rt": {"protocol": "...", "snapshot_hz": N}`. Absence of the fields on either side SHALL mean legacy mode. A server SHALL NOT send binary frames to a client that did not advertise, and a client SHALL self-disable the fast path after repeated consecutive decode failures and continue on the legacy path. No new JSON message types SHALL be introduced by this capability; resync requests in v0 reuse the existing re-join flow. The `spawn` flag advertises that the client applies lifecycle-carrying full snapshots on the live path; a server SHALL emit that frame shape only to clients that set it, and SHALL keep the previous baseline-compatible delta flush shape for every other negotiating client so an un-upgraded client's decoding behavior is unchanged.

#### Scenario: Legacy server ignores capabilities

- **WHEN** a client sends `hello` with an `rt` object to a server without binary support
- **THEN** the server ignores the field and the session proceeds entirely in legacy mode

#### Scenario: Client self-disables on repeated failure

- **WHEN** the client fails to decode three consecutive binary frames
- **THEN** it stops feeding the fast path, keeps playing via the legacy handlers, and the game state remains correct

#### Scenario: Un-upgraded client keeps the delta shape

- **WHEN** a negotiating client connects without advertising `spawn`
- **THEN** the server keeps emitting the previous delta flush frame type and layout, and that client's decoding behavior is unchanged

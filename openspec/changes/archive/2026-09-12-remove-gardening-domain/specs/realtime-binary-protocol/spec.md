# realtime-binary-protocol

## MODIFIED Requirements

### Requirement: Frame format and codec fidelity

The codec SHALL read and write `afterlight-soa-v1` frames exactly as specified in `docs/architecture/realtime/contract.md`: the 24-byte little-endian header (magic `0x414C5254`, protocol version, frame type FULL_SNAPSHOT/DELTA/RESYNC_REQUIRED, flags, `room_epoch`, `server_tick`, `frame_sequence`, `baseline_sequence`, `header_size`) followed by self-describing sections (lifecycle spawn/despawn, transform, motion, anim, flags, visual, string table) whose payloads are columnar in entity order. Spawn rows SHALL carry the player's guestId string once via the string table so identity continuity (self-echo filtering and entity-id continuity across room re-joins) is preserved. Binary frames SHALL be distinguishable from JSON text frames without parsing (leading magic; JSON always begins `{`).

#### Scenario: Frame sniffing is unambiguous

- **WHEN** a socket message arrives, whether text or binary
- **THEN** the receiver can classify it by frame kind alone, and a JSON parser never sees binary bytes

#### Scenario: Spawn carries identity

- **WHEN** a player entity spawns in a snapshot
- **THEN** the frame's string table contains their guestId exactly once and the spawn row references it, and the client's store resolves the u32 entity id to that guestId

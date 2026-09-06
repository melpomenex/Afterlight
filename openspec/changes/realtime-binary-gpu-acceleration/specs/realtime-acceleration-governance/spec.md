# realtime-acceleration-governance

## Purpose

The rules the realtime acceleration program operates under: how a technology
earns adoption, how failure falls back, how accelerated state is proven
equivalent to legacy state, and where the boundaries with the Elixir/Phoenix/Ash
migration lie. These requirements bind every child change
(`add-realtime-*`) and any future change that flips a default.

## ADDED Requirements

### Requirement: Benchmark-gated adoption

No technology (binary encoding, Roaring, Arrow, WASM, Workers, WebGPU, WebTransport) SHALL be enabled by default, or promoted from prototype to wired feature, without a committed benchmark on Afterlight-realistic fixtures (`benchmarks/realtime`) and a written decision record (`docs/architecture/realtime/decisions.md`) stating benefit, cost, measurement, and the verdict adopt / adopt-selectively / reject. A reject verdict SHALL be treated as a completed research outcome, not a failure, and SHALL leave the harness and records in the repository.

#### Scenario: Unbenchmarked proposal is refused

- **WHEN** a change proposes enabling a data-plane technology by default and cites no committed measurement
- **THEN** the change is invalid against this capability regardless of prototype correctness

#### Scenario: Reject verdict closes cleanly

- **WHEN** a study concludes a technology does not pay for itself at Afterlight populations
- **THEN** the decision record records the numbers and the verdict
- **AND** no live code path depends on the rejected technology

### Requirement: Fallback ladder

The client SHALL always retain the legacy path (JSON wire + current Three.js renderer) as a fully functional mode. The accelerated ladder SHALL be WebGPU → binary CPU (worker/WASM) → legacy, and any failure in a higher rung — WASM compile or instantiation failure, WebGPU unavailability, device loss, worker crash, malformed frame, unsupported protocol version, stale baseline or epoch — SHALL degrade to the next rung without user-visible breakage and without corrupting game state. A player whose hardware supports nothing new SHALL play the unmodified legacy game.

#### Scenario: WASM fails at boot

- **WHEN** the WASM module fails to compile or instantiate while the binary protocol negotiated successfully
- **THEN** decoding falls back to the pure-JS decoder on the same binary frames, or to the legacy JSON path, and the game continues with correct state

#### Scenario: GPU device is lost mid-session

- **WHEN** a WebGPU device is lost while the accelerated renderer is active
- **THEN** the client rebuilds on the binary CPU path from the last acknowledged snapshot without duplicating or dropping entities

#### Scenario: Unsupported hardware

- **WHEN** a browser exposes neither the negotiated binary protocol support nor WebGPU
- **THEN** the client plays the legacy path exactly as before this program existed

### Requirement: Dual-path parity

For any accelerated path, it SHALL be possible to run the same server state through both the legacy path and the accelerated path and compare semantic results. The accelerated path SHALL produce the same entity identity, position, rotation, animation/flag state, spawn/despawn sets, tick, and epoch as the legacy path on deterministic fixtures, with floating-point tolerance only where documented. Visual parity SHALL be verified by screenshot comparison on representative scenes (empty room, 2 players, 50 players, garden, theater) before any rendering-path default changes.

#### Scenario: Semantic parity on fixtures

- **WHEN** a recorded frame sequence is applied through the legacy decoder and the accelerated decoder from the same baseline
- **THEN** both produce identical entity sets and component values within documented tolerance

#### Scenario: Visual parity before flip

- **WHEN** the GPU rendering backend is proposed as a default
- **THEN** screenshot comparisons of the representative scenes show avatar placement, shadows, transparency, theater overlays, HUD, and camera behavior unchanged within agreed tolerance

### Requirement: Ownership boundaries with the migration

The program SHALL NOT edit migration-owned files: `docs/architecture/elixir/**`, the migration's OpenSpec changes, `shared/protocol.js` (message catalog), `src/net/client.js` facade behavior, `server/index.js`, `server/world.js`, or `data/**`. The data plane SHALL be additive: new files under `shared/realtime/`, `src/realtime/`, `benchmarks/realtime/`, `wasm/`, `tools/realtime/`, `docs/architecture/realtime/`, and openspec changes namespaced `realtime-*`/`add-realtime-*`. Wire integration SHALL use additive JSON fields on existing messages (`hello`/`welcome` capability objects), never new JSON message types, and SHALL preserve the `NetworkClient` facade contract pinned by existing tests.

#### Scenario: Fast path cannot break legacy peers

- **WHEN** a legacy server receives `hello` carrying the additive `rt` capability object
- **THEN** it ignores the unknown field and the session proceeds entirely on the legacy path

#### Scenario: Migration files remain untouched

- **WHEN** the program's changes are diffed against the repository
- **THEN** no migration-owned file listed above is modified

### Requirement: Durable state stays out of the frame path

The binary data plane SHALL carry only realtime entity state (transforms, motion, animation/flags, visual archetype, lifecycle). Authentication, joins, room travel, durable commands, economy, inventory, gardens, restoration, theater control, chat, errors, and reconnect coordination SHALL remain on the JSON control plane; none of them SHALL be moved into binary frames merely because the format could carry them. No frame-path component SHALL write PostgreSQL, Ash resources, or `data/game-state.json`.

#### Scenario: Economy message stays JSON

- **WHEN** a player buys seeds while connected with the binary fast path enabled
- **THEN** the `market_buy` exchange is byte-identical to the legacy path and no binary frame carries it

#### Scenario: No durable writes from the frame path

- **WHEN** binary frames are applied at 10 Hz in a long session
- **THEN** no durable store gains writes attributable to the frame path

### Requirement: Debuggability of the binary path

The binary protocol SHALL keep a human-debuggable mode: the JSON debug encoder producing the legacy `presence_update` shape, tooling to decode a captured binary frame to readable output (frame metadata, section table, entity counts, changed masks), and a documented env switch (e.g. `AFTERLIGHT_REALTIME_ENCODING=json`) selectable without code changes. The protocol SHALL NOT be opaque: every frame field is specified in `docs/architecture/realtime/contract.md`.

#### Scenario: Captured frame is decodable

- **WHEN** a developer dumps a captured binary frame through the decode tooling
- **THEN** the tool prints tick, epoch, sequence, frame type, per-section encodings, and a readable entity table

#### Scenario: JSON debug mode

- **WHEN** the server runs with the JSON encoding switch
- **THEN** clients without binary negotiation receive the legacy shapes and the game is playable

### Requirement: Hostile-input safety for wire parsers

Every parser that consumes wire bytes (binary frame decoder, mask decoder, Arrow payload consumer, WASM decoder) SHALL enforce documented limits (maximum frame size, section count, entity count; validated lengths against remaining bytes; valid enum values) before allocating, SHALL reject malformed input with a bounded error rather than throwing into game code, panicking, hanging, or allocating proportionally to attacker-controlled lengths, and SHALL be covered by fuzz-style tests (truncation, byte flips, length overflow, bad enums, trailing bytes) in the repository's test suites.

#### Scenario: Truncated frame is rejected

- **WHEN** a frame cut short mid-section is fed to the decoder
- **THEN** the decoder returns a rejection, allocates no buffer proportional to the truncated length field, and the session continues

#### Scenario: Fuzz corpus never panics

- **WHEN** the fuzz corpus (valid frames × mutation operators) runs against any wire parser
- **THEN** no input escapes the rejection path or leaves the entity store unusable

### Requirement: Granular feature flags

Each acceleration technology SHALL be independently switchable via documented dev switches (`realtime_binary`, `realtime_wasm`, `realtime_worker`, `renderer_webgpu_fastpath`), defaulting to off, following the repository's build-time env precedent (`VITE_TRANSPORT`). There SHALL be no single master "experimental mode" switch: any combination of enabled flags SHALL either work or fall back per the ladder, never silently disable another flag's path.

#### Scenario: Flags combine independently

- **WHEN** `realtime_binary` is on and `realtime_wasm` is off
- **THEN** binary frames decode through the pure-JS decoder path

#### Scenario: Defaults unchanged

- **WHEN** a player starts the game with no flags set
- **THEN** behavior, wire traffic, and rendering are identical to the pre-program game

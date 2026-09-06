# realtime-worker-pipeline

## Purpose

Off-thread decoding for the binary data plane with bounded memory and zero
per-entity allocation on the hot path, a main-thread consumer that feeds the
existing avatar/instancing contracts unmodified, and graceful degradation to
the legacy JSON path on any failure. The pipeline is flag-gated and never
changes default behavior by itself.

## ADDED Requirements

### Requirement: Off-thread decode with bounded handoff

Binary frame decoding SHALL run in a dedicated Web Worker communicating via transferable ArrayBuffers (SharedArrayBuffer SHALL NOT be used in this capability; the COOP/COEP cost SHALL be documented as deferred). The worker SHALL keep authoritative decoded state (its entity store), SHALL collapse a backlog of transform-only frames to the newest per entity rather than queueing unboundedly, SHALL NOT drop lifecycle (spawn/despawn) frames, and SHALL signal a resync when a baseline gap makes application unsafe.

#### Scenario: Burst does not grow memory

- **WHEN** 120 transform-only frames arrive while the main thread is busy
- **THEN** the worker coalesces them and memory stays bounded, with the newest pose per surviving entity applied

#### Scenario: Lifecycle is never lost

- **WHEN** spawn and despawn sections are present in any queued frame
- **THEN** those sections are applied in order regardless of back-pressure

### Requirement: Zero-churn hot path

Steady-state decode ticks SHALL NOT allocate per-entity objects: the store SHALL reuse typed arrays and free-list slots, and the main-thread handoff SHALL be pooled, fixed-shape delta packs. A 600-tick soak bench SHALL show flat allocations-per-tick and stable memory, and the results SHALL be committed under `benchmarks/realtime/results/`.

#### Scenario: Soak shows no allocation growth

- **WHEN** the 600-tick soak runs at a 10k-entity population
- **THEN** allocations per tick are flat and heap does not trend upward

### Requirement: Legacy contract consumption

The main-thread consumer SHALL produce state in the existing renderer's contracts — `RemotePlayersManager.setPlayer()` entry shapes for avatars — so the rendered game is unchanged whether frames arrive via legacy JSON or the pipeline. Room travel SHALL reset worker state deterministically (slots freed, baselines cleared, id maps dropped), matching the current `remotePlayers.clear()` semantics.

#### Scenario: Renderer cannot tell the difference

- **WHEN** the same fixture session is delivered via legacy JSON and via the pipeline
- **THEN** the avatar-visible state sequence is identical at each tick

#### Scenario: Travel resets cleanly

- **WHEN** the player travels between rooms with the pipeline active
- **THEN** no entity from the previous room survives and new-room snapshots apply from a clean baseline

### Requirement: Graceful degradation and flag composition

Worker construction failure, worker crash, or a stalled handshake SHALL fall back to main-thread legacy decoding without session loss. The `realtime_binary` and `realtime_worker` flags SHALL compose: binary-without-worker decodes on the main thread, worker-without-binary is a passthrough no-op, both off is exactly the legacy path, and no flag combination SHALL degrade another path.

#### Scenario: Worker dies mid-session

- **WHEN** the worker errors while frames are flowing
- **THEN** the client continues on main-thread decoding with correct state and no user-visible breakage beyond the fallback

#### Scenario: Flags are independent

- **WHEN** any combination of `realtime_binary` and `realtime_worker` is set
- **THEN** each enabled capability's path works and disabled ones leave legacy behavior untouched

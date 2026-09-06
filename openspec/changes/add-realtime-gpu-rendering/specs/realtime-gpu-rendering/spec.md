# realtime-gpu-rendering

## Purpose

An experimental, flag-gated rendering fast path for dynamic entity
populations: an `EntityRenderBackend` seam whose default implementation is
today's behavior, and whose WebGPU implementation keeps entity transforms in
persistent storage buffers updated by compact scatter (never per-entity
writes), preserves client-side interpolation, and falls back safely on any
GPU failure. Three.js remains the renderer; the existing game is never
degraded; visual parity is proven before any default changes.

## ADDED Requirements

### Requirement: Backend seam with a faithful default

The client SHALL route dynamic entity state through an `EntityRenderBackend` seam whose default `CPUThreeBackend` SHALL reproduce current behavior — Object3D transform updates and existing InstancedMesh statics discipline — so that enabling none of the GPU code leaves the game byte-identical. The local player and Kiln SHALL remain on the traditional path. The WebGPU implementation SHALL be constructed only when the device supports it AND `renderer_webgpu_fastpath` is enabled.

#### Scenario: Seam off is invisible

- **WHEN** the game runs with all acceleration flags off
- **THEN** rendering, input, and behavior match the pre-change game exactly

#### Scenario: Local player stays traditional

- **WHEN** the WebGPU backend renders remote entities
- **THEN** the local player and Kiln continue through their existing update path with unchanged camera and interaction coupling

### Requirement: Batched GPU state propagation

The WebGPU backend SHALL keep entity component state in persistent storage buffers and SHALL update them per tick with a bounded number of contiguous uploads (one per section) followed by a compute scatter of the compact changed set — one dispatch, indexed writes into persistent buffers. Per-entity `queue.writeBuffer` calls SHALL NOT exist in the fast path (they are benchmarked only as the contrast arm). Scatter correctness SHALL be validated by GPU-computed checksums read back and compared against CPU expectations before results are trusted.

#### Scenario: Tick updates are bounded

- **WHEN** a delta pack with 3,000 changed entities is applied
- **THEN** the upload count is a small constant (per section) regardless of changed count, and the scatter dispatch covers exactly the changed set

#### Scenario: Wrong scatter fails loudly

- **WHEN** a checksum comparison mismatches after a scatter pass
- **THEN** the backend reports the failure and does not present the frame as applied

### Requirement: Interpolation is preserved

GPU-resident state SHALL NOT remove client-side interpolation: the backend SHALL maintain per-instance previous/next transforms with timestamps and SHALL evaluate positions per rendered frame between server updates, so visual motion at 10 Hz server cadence remains smooth and is not coupled to arrival jitter. The CPU arm SHALL keep its existing interpolation so visual comparisons compare both arms at their best.

#### Scenario: Smooth motion at low update rate

- **WHEN** transforms update at 10 Hz while rendering runs at display rate
- **THEN** rendered positions vary continuously between server ticks in both arms

### Requirement: Fallback on any GPU failure

Adapter or device creation failure, asynchronous device loss, validation errors, and probe checksum failures SHALL release GPU resources and rebuild on the CPU backend from the last acknowledged snapshot without duplicate or missing entities. The fallback SHALL be covered by tests using a mock device, and SHALL be reachable at runtime without developer intervention.

#### Scenario: Device lost mid-session

- **WHEN** the WebGPU device is lost while entities are rendered
- **THEN** the CPU backend rebuilds from the last acknowledged snapshot and the session continues

### Requirement: Visual parity gates any default change

Before any scene class enables the fast path by default, screenshot comparisons on representative scenes (empty room, 2 players, 50 players, garden, theater) SHALL show avatar placement, animation, shadows, transparency, sorting, theater overlays, HUD, and camera behavior preserved within documented tolerance — with the post-chain visual delta of the harness (no WebGL bloom composer under WebGPU) documented explicitly rather than hidden. Software-adapter measurements SHALL be labeled as relative-only evidence.

#### Scenario: Parity set reviewed before flip

- **WHEN** a change proposes defaulting `renderer_webgpu_fastpath` for a scene class
- **THEN** it cites the committed screenshot set and documents the post-chain delta and software-adapter caveats

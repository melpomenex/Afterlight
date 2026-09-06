# Add WebGPU Accelerated Entity Rendering (experimental)

## Why

The renderer audit found the acceleration-relevant facts: remote avatars are ~24 individually mutated meshes per player with per-frame JS transform writes; districts batch statics into a single InstancedMesh each, but dynamic populations (avatars, vegetation state, projectiles-if-any) scale linearly in draw calls and JS mutation cost; three 0.180.0 ships `./webgpu`/`./tsl` entry points, but the game's post chain (EffectComposer + UnrealBloomPass) is WebGL-only, and PCFSoft shadows, ACES tone mapping, and the theater's DOM homography define the look. Flipping the renderer wholesale is exactly what the program charter forbids. What is missing is a narrow, experimental seam: keep Three.js and the existing renderer as the default, and prove (or refute) that persistent GPU storage buffers + compact upload + compute scatter can carry *dynamic entity transforms* into instanced draws with visual parity — behind a flag, with a fallback ladder that always lands on the working game.

## What Changes

- **`EntityRenderBackend` seam** (`src/realtime/gpu/backend.js`): two implementations behind one interface — `CPUThreeBackend` (today's behavior: Object3D transforms + existing instancing) and `WebGPUThreeBackend` (experimental). The seam is defined by what the renderer audit measured, not by a rewrite: avatars first, then homogeneous populations (vegetation, props); the local player stays on the traditional path (camera/interaction coupling).
- **Persistent GPU state + scatter**: entity transforms live in a storage buffer; per tick, the pipeline's compact delta packs upload once and a compute pass scatters rows (`positions[ids[i]] = values[i]`); instanced draws read the persistent buffer. One `queue.writeBuffer` per section per tick — never per entity (the anti-pattern is benchmarked for contrast in `benchmarks/realtime/webgpu/probe.html`).
- **Interpolation preserved**: GPU-resident state does not eliminate client interpolation — prev/next transforms with timestamps are evaluated per instance in the vertex stage (or a compute pass, whichever measures better); server cadence (10 Hz) never ties to arrival jitter.
- **WebGPU renderer coexistence**: the experimental backend runs under three's `WebGPURenderer` in a *prototype harness page* first (`tools/realtime/gpu-harness.html`), comparing against the WebGL path; the bloom/TSL post question is explicitly out of scope here — the harness renders without the WebGL composer and documents the visual delta honestly.
- **Fallback ladder exercised**: device loss, context creation failure, adapter absence, and validation errors all recover to the CPU backend from the last acknowledged snapshot; `renderer_webgpu_fastpath` gates everything and defaults off.
- **Decision record**: adopt / adopt-selectively / reject from the probe + harness numbers (GPU time per strategy, frame-time impact, visual parity screenshots) — with explicit attention to the audit's compatibility risks (post chain, shadow parity, sprites/points behavior).

## Capabilities

### New Capabilities

- `realtime-gpu-rendering`: the entity-render backend seam, persistent GPU entity state with scatter updates, interpolation preservation, and the flag-gated experimental status with mandatory visual parity before any default changes.

### Modified Capabilities

- (none)

## Impact

- **New**: `src/realtime/gpu/**` (backend seam, WebGPU implementation, scatter shaders), `tools/realtime/gpu-harness.html`, extended `benchmarks/realtime/webgpu/` results, parity screenshots, decision record.
- **Existing**: nothing modified — `src/main.js`, composer, materials, and the theater homography are untouched; the harness page is standalone. The audit's must-preserve list (ACES grade, bloom, PCFSoft look, `activeCamera` consumers, deterministic placement) bounds any future integration change.
- **Tests**: scatter correctness validated on-GPU via checksum readback in the probe; backend seam unit tests with a mock device; visual parity via browser tooling screenshots.
- **Honest limits**: software adapters (swiftshader) measure relative strategy costs, not production GPU performance; WebGPU browser availability itself may yield an early `reject` or `park` — that is a valid outcome.

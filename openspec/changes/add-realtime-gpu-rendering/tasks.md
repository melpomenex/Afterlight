# Tasks: add-realtime-gpu-rendering

## 1. Seam

- [ ] 1.1 `src/realtime/gpu/backend.js` — `EntityRenderBackend` interface (ensureCapacity, applyDeltaPack, sample, dispose, onDeviceLost) + `CPUThreeBackend` preserving today's transform/instancing behavior.
- [ ] 1.2 Consumer integration point documented (worker-pipeline's consumer calls the seam; local player and Kiln excluded by design).

## 2. WebGPU implementation (experimental)

- [ ] 2.1 Persistent storage buffers (transforms/motion/flags) + archetype instance attributes; capacity growth strategy with safe recycling.
- [ ] 2.2 Scatter compute pass fed by pipeline delta packs; one `queue.writeBuffer` per section per tick; on-GPU checksum validation of scatter correctness.
- [ ] 2.3 Interpolation ring (prev/next + timestamps) evaluated per instance; alpha computed from shared-clock ticks, arrival jitter excluded.
- [ ] 2.4 Instanced draws reading persistent state under three r0.180 `WebGPURenderer` in the harness page.

## 3. Probe + harness + parity

- [ ] 3.1 `benchmarks/realtime/webgpu/probe.html` results recorded: full vs partial vs scatter at N ∈ {1k, 10k, 50k} × changed ∈ {1..10k} (swiftshader caveats documented).
- [ ] 3.2 `tools/realtime/gpu-harness.html`: accelerated vs control arm, same populations, frame-time capture; post-chain visual delta documented honestly.
- [ ] 3.3 Screenshot parity set: empty room, 2 players, 50 players, garden, theater — placement/shadows/overlay/HUD compared on the CPU arm vs live game.

## 4. Failure model + verdict

- [ ] 4.1 Device loss / adapter absence / validation errors → CPU backend rebuild from last acknowledged snapshot; exercised by tests with a mock device.
- [ ] 4.2 `renderer_webgpu_fastpath` flag wired in harness only; default off everywhere.
- [ ] 4.3 Decision record: adopt / adopt-selectively / park-or-reject with probe + harness numbers and the audit risk checklist disposition.

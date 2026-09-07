# Decision: realtime GPU entity rendering

Status: **ADOPT SELECTIVELY** — 2026-09-07. Change:
`openspec/changes/add-realtime-gpu-rendering`.

## Verdict

| piece | disposition |
|---|---|
| `EntityRenderBackend` seam + `CPUThreeBackend` | **ADOPT** (default; invisible when flags are off) |
| Consumer hook (`PackConsumer` → `applyDeltaPack`) | **ADOPT** (optional; live `wireRealtime` does not attach a backend) |
| `WebGPUThreeBackend` (persistent buffers + scatter) | **PARK** |
| Defaulting `renderer_webgpu_fastpath` for any live scene | **REJECT** (flag stays harness-only, default OFF) |

At Afterlight's current populations (dozens of avatars) the instance-count
win is small; the milestone exists for the 50k-entity fixtures. Shipping a
default flip would manufacture a justification the numbers do not support.

## Probe numbers (cited, not re-quoted as timing)

See `benchmarks/realtime/results/webgpu.md` and
`openspec/changes/add-realtime-gpu-rendering/evidence/probe.md`.

- Full and partial uploads: 30/30 XOR cells bit-exact on SwiftShader.
- Scatter: 0/15 checksum **FAILED**, non-deterministic on identical inputs.
- Render-read of the persistent buffer: passed.
- **No µs numbers are claimed.** SwiftShader is software; the scatter
  failure invalidates the timed matrix.

## Harness

`tools/realtime/gpu-harness.html` draws the same instanced population on a
WebGL control arm (`CPUThreeBackend`) and, only when
`?rt_webgpu_fastpath=1`, attempts a `three/webgpu` `WebGPURenderer` arm.
Frame-time capture writes `window.__gpuHarness`. Default page load does
**not** construct the GPU backend.

Post-chain visual delta (honest): the harness has no EffectComposer /
UnrealBloomPass, no theater DOM homography, and no live HUD. ACES +
PCFSoft are on the control arm only. That delta is documented rather than
hidden. Any future live integration must solve the TSL post chain as its
own gated change.

## Audit risk checklist

| risk (compat-report §1 / renderer audit) | disposition |
|---|---|
| ACES + bloom look | bloom **not** reproduced under WebGPU; blocks any default flip |
| PCFSoft shadow character | control arm only; WebGPU arm does not claim shadow parity |
| `activeCamera` as single authority | untouched — live game not wired |
| Theater DOM homography | untouched; theater district not edited |
| Deterministic procedural placement | live builders untouched |
| Statics InstancedMesh discipline | CPU backend writes instance matrices the same way; GPU path unused in-game |
| Local player / Kiln camera coupling | excluded from the GPU path by design |

## Fallback

Adapter absence, `requestDevice` rejection, validation errors, checksum
mismatch, and `device.lost` rebuild `CPUThreeBackend` from the last
acknowledged snapshot. Covered by `tests/realtime/gpu-backend.test.js`
with `createMockGpuDevice`.

## What would un-park the GPU path

1. A headed real-GPU probe run with scatter checksum **passed** on the
   full N × changed matrix, with quoted GPU timestamps.
2. Harness frame-time numbers on that GPU showing a win at fixture scale
   (not SwiftShader).
3. Screenshot parity review of the five scenes **including** bloom /
   theater overlay / HUD — which requires a TSL post-chain change, not
   this one.

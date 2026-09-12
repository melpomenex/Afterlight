# Decision: realtime GPU entity rendering

Status: **ADOPT SELECTIVELY** — updated 2026-09-07 (headed harness). Change:
`openspec/changes/add-realtime-gpu-rendering`.

## Verdict

| piece | disposition |
|---|---|
| `EntityRenderBackend` seam + `CPUThreeBackend` | **ADOPT** (default; invisible when flags are off) |
| Consumer hook (`PackConsumer` → `applyDeltaPack`) | **ADOPT** (optional; live `wireRealtime` does not attach a backend) |
| `WebGPUThreeBackend` (persistent buffers + scatter) | **UNPARK (harness only)** — headed Brave/Chromium run built both arms at n=50 |
| Defaulting `renderer_webgpu_fastpath` for any live scene | **REJECT** (flag stays opt-in, default OFF) |
| Live instanced proxy layer (`?rt_webgpu_fastpath=1` + entity seam) | **ADOPT SELECTIVELY** — InstancedMesh on WebGL scene; bloom/HUD coexist; not full per-avatar meshes |

At Afterlight's current populations (dozens of avatars) the instance-count
win is small; the milestone exists for the 50k-entity fixtures. Shipping a
default flip would manufacture a justification the numbers do not support.

## Headed harness evidence (2026-09-07)

See `openspec/changes/add-realtime-gpu-rendering/evidence/harness-headed.json`
and `harness-headed-fifty.png`.

- URL: `tools/realtime/gpu-harness.html?rt_webgpu_fastpath=1`
- Scene: fifty (50 remotes; local player + Kiln excluded)
- Control: `CPUThreeBackend` + `WebGLRenderer`
- Accelerated: `WebGPUThreeBackend` + `WebGPURenderer`
- Frame sample: 126 frames, median **0.200 ms**, p95 **0.300 ms**
- Both viewports drew the same instanced ring on a real GPU

This satisfies the harness-build gate. It does **not** satisfy live-game
visual parity (bloom / HUD / theater overlay) or a headed scatter-probe
checksum matrix.

## Probe numbers (cited, not re-quoted as timing)

See `benchmarks/realtime/results/webgpu.md` and
`openspec/changes/add-realtime-gpu-rendering/evidence/probe.md`.

- Full and partial uploads: 30/30 XOR cells bit-exact on SwiftShader.
- Scatter: 0/15 checksum **FAILED**, non-deterministic on identical inputs
  (SwiftShader only — headed scatter probe still outstanding).
- Render-read of the persistent buffer: passed.
- **No µs numbers are claimed** for SwiftShader runs.

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

## What would allow a live-scene flip (still out of scope here)

1. Headed scatter-probe checksum **passed** on the full N × changed matrix.
2. Screenshot parity review of the five scenes **including** bloom /
   theater overlay / HUD — requires a TSL post-chain change, not this one.
3. A separate gated change wiring `PackConsumer` → the seam in the live
   renderer with the fallback ladder exercised under real room load.

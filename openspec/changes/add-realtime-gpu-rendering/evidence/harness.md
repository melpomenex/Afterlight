# Harness results — task 3.2

## Headed real-GPU capture (2026-09-07)

Page: `tools/realtime/gpu-harness.html?rt_webgpu_fastpath=1` (Vite, headed
Brave/Chromium, user machine `:5100`). Screenshot:
`harness-headed-fifty.png`. JSON: `harness-headed.json`.

| field | value |
|---|---|
| flagOn | true |
| scene | fifty (n=50 remotes; local player + Kiln excluded) |
| control arm | `CPUThreeBackend` + `WebGLRenderer` |
| accelerated arm | `WebGPUThreeBackend` + `WebGPURenderer` |
| frames | 126 |
| median ms | 0.200 |
| p95 ms | 0.300 |
| gpu backend | webgpu |
| gpu renderer | WebGPURenderer |

Both arms rendered the same instanced population side-by-side. This is the
headed receipt that un-parks the WebGPU harness arm. It is **not** a claim
of live-game parity (no bloom, HUD, or theater overlay) and **not**
permission to default `renderer_webgpu_fastpath` on in the client.

## Headless fallback (SwiftShader / no WebGL)

Page: `tools/realtime/gpu-harness.html` (Vite, this worktree, :5180).
Capture: `tools/realtime/capture-gpu-harness.mjs` → `harness.json`,
`harness-fifty.png`. Chromium 152, `--headless=new --enable-unsafe-webgpu
--use-angle=swiftshader`.

## Default load (`renderer_webgpu_fastpath` off)

| field | value |
|---|---|
| flagOn | false |
| gpu backend | not-constructed |
| gpu renderer | none |
| scene | fifty (n=50 remotes; local player + Kiln excluded) |
| frames | 120 |
| median ms | 0.000 |
| p95 ms | 0.100 |

The GPU arm is **not constructed** on the default URL. That is the required
harness-only wiring: add `?rt_webgpu_fastpath=1` to attempt it.

## What the numbers are (and are not)

Headless SwiftShader could not create a WebGL context
(`Error creating WebGL context`). The 120-frame loop still ran: it sampled
the CPU backend (interpolation + exclusion) and skipped `renderer.render`.
Median 0.000 / p95 0.100 ms is **CPU sample cost + timer quantization**,
not GPU time, and not a production-GPU claim. Software adapters stay
relative-only per the probe contract.

A headed real-GPU run of the same page is required before anyone quotes
accelerated-vs-control frame times.

## Post-chain visual delta (not hidden)

Neither arm uses EffectComposer / UnrealBloomPass. ACES is requested on the
control arm when WebGL exists. Bloom, theater DOM homography, and the live
HUD are absent. The screenshot (`harness-fifty.png`) shows the two empty
viewports plus the capture table and the exclusion / SwiftShader notes —
that is the honest picture of this environment, not a stand-in for live
Afterlight.

# WebGPU persistent-transform-buffer probe — executed under browser tooling

Ran `benchmarks/realtime/webgpu/probe.html` (afterlight-webgpu-transform-upload-v0) in headless
Chromium 152.0.7977.64 (ubuntu snap, `--headless=new --no-sandbox`) on linux 7.0.0-30-generic x64 / 24 cpus,
2026-09-07, via the README flag ladder, page served from the `webgpu/` directory on
`http://127.0.0.1:8899`. Captured `window.__probeResults` over CDP with no
`--virtual-time-budget`, so wall-clock values are real — but none are quoted (see verdict).

## Ladder (first rung to yield an adapter wins; all rungs recorded)

| rung | flags | adapter | result |
|---|---|---|---|
| 1 | (none, plain headless) | none — `requestAdapter() → null` | clean `{supported:false}` path (`webgpu-probe-plain.png`) |
| 2 | `--enable-unsafe-webgpu` | **google/swiftshader** (software) | full matrix ran; correctness **FAILED** (scatter) |
| 3 | `+ --use-angle=swiftshader` | google/swiftshader | identical verdict to rung 2 |
| 4 | `+ --use-gl=angle --use-webgpu-adapter=swiftshader` | google/swiftshader | identical verdict to rung 2 |

The rung-2 result updates the PARK premise ("no adapter was obtainable"): on Chromium 152 the
`--enable-unsafe-webgpu` rung does yield an adapter here — SwiftShader, software rendering.

## Checksum validation (XOR over all N vec4s vs CPU mirror; 15 cells per mode)

| mode | ok / 15 | reading |
|---|---|---|
| full (one whole-buffer write) | **15 / 15** | bit-exact on SwiftShader |
| partial (per-entity 16 B writes) | **15 / 15** | bit-exact on SwiftShader |
| scatter (compact delta + compute dispatch) | **0 / 15** | **FAILED on every cell, every rung** |

Scatter non-determinism proof: the N=1000 `changed=1000` cell and the clamped
`changed=10000→1000` cell use the same seed/ids/values (same `expectedXor 0x045e4c2a`) yet the
primary run produced **different** `actualXor` (0x7db5926d vs 0x801f402e) within one run — the
kernel's GPU state is not reproducible on this adapter, so this is a SwiftShader compute defect
(or incompatibility), not a fixed addressing bug in the probe (whose CPU packing/mirror logic is
shared with the passing full/partial paths).

Render-read check (instanced draw of 50000 quads whose vertex stage reads
`positions[instance_index]` from the persistent buffer): **passed** on all adapter-bearing rungs,
zero device/validation errors. timestamp-query was exposed (and `encoder.writeTimestamp`
accepted), but its numbers are meaningless here per the scatter invalidation + software rendering.

## Probe bug the browser run exposed (fixed in `webgpu/probe.html`, 2026-09-07)

The tsCopyRun staging buffer was created with `MAP_WRITE|COPY_SRC|COPY_DST` — spec-invalid
(MAP_WRITE only combines with COPY_SRC). Real Dawn rejected creation and every later staging
op cascaded `[Invalid Buffer]` errors, failing the render check on the pre-fix run. Reduced to
`COPY_SRC|COPY_DST`; post-fix runs show 0 device errors. The Node mock-device check (45/45
bit-exact, cited in the PARK) could not catch a usage-flag violation — only browser tooling did.

## Verdict

**PARK stands — now stronger.** Software rendering validates the direct-write paths (full/partial
30/30 bit-exact) and the persistent-buffer→render path, but cannot validate or time the scatter
kernel (0/15, non-deterministic). No performance numbers are claimed from these runs. A real-GPU
headed run per the README ladder remains the first task of any future GPU milestone.
Raw JSON: `results/webgpu.json` (per-rung outcomes + full primary-run matrix).

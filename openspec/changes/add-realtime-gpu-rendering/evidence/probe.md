# Probe results — task 3.1

Source of truth: `benchmarks/realtime/results/webgpu.md` + `webgpu.json`
(afterlight-webgpu-transform-upload-v0). Matrix: N ∈ {1k, 10k, 50k} ×
changed ∈ {1, 10, 100, 1k, 10k} (clamped ≤ N) × {full, partial, scatter}.

## What ran (2026-09-07, Chromium 152 headless)

| rung | flags | adapter | correctness |
|---|---|---|---|
| 1 | none | none (`requestAdapter() → null`) | not-run |
| 2 | `--enable-unsafe-webgpu` | google/swiftshader | full 15/15, partial 15/15, **scatter 0/15 FAILED** |
| 3–4 | + angle/swiftshader pins | google/swiftshader | identical to rung 2 |

Render-read check (50k instanced quads reading the persistent buffer): passed
on adapter-bearing rungs. timestamp-query was exposed; numbers are **not
quoted** — the scatter checksum failure invalidates the run per the probe
contract, and SwiftShader is software rendering.

## SwiftShader caveats (binding)

- Software adapters measure **relative strategy cost only**, never production
  GPU time. This change quotes **no µs figures**.
- Scatter was non-deterministic on this adapter: identical seed/ids/values
  produced different `actualXor` within one run. That is treated as an
  adapter/compute defect, not as a pass.
- A real-GPU headed run remains the first task of any future default-flip.

## Node mock (this change)

`tests/realtime/gpu-backend.test.js` re-validates the packed delta layout
(scatterCpu + checksumXor) and the "one writeBuffer per section" contract
on a mock device, including a 3,000-row pack. That is CPU-mirror evidence,
not a GPU timing claim.

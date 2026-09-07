# Evidence — task 3.1: probe results recorded (`benchmarks/realtime/webgpu/probe.html`)

Status: **grid fully covered** (15/15 cells × 3 strategies, checksum on every mode-result),
with a **validity caveat that voids performance claims** (scatter checksum FAILED on the
software adapter — see [Caveats](#caveats-swiftshader-software-adapter) and [Gaps](#gaps)).

The probe itself was executed under browser tooling by the sibling change
`add-realtime-benchmark-harness` (its task 3.4); this note only records and interprets those
results for this change. No probe was re-run here.

## Sources

- Raw results: `benchmarks/realtime/results/webgpu.json` (ladder outcomes, full primary-run
  matrix, per-mode checksums, probe-bug record, verdict)
- Human summary: `benchmarks/realtime/results/webgpu.md`
- Probe page + method: `benchmarks/realtime/webgpu/probe.html`, `benchmarks/realtime/webgpu/README.md`
- Screenshots (one per ladder rung, in `benchmarks/realtime/results/`):
  - `webgpu-probe-plain.png` — rung 1, plain headless: no adapter, clean `{supported:false}` path
  - `webgpu-probe-swiftshader.png` — rung 2, `--enable-unsafe-webgpu`: google/swiftshader, full matrix (primary run)
  - `webgpu-probe-swiftshader-angle.png` — rung 3, `+ --use-angle=swiftshader`: same verdict
  - `webgpu-probe-swiftshader-pinned.png` — rung 4, `+ --use-gl=angle --use-webgpu-adapter=swiftshader`: same verdict

Environment of the primary run: 2026-09-07, Chromium 152.0.7977.64 (ubuntu snap),
`--headless=new --no-sandbox`, linux 7.0.0-30-generic x64 / 24 cpus, page served on
`http://127.0.0.1:8899`, results captured over CDP without `--virtual-time-budget`
(wall clock is real). Adapter: **google/swiftshader (software rendering)** — which itself
updates the PARK premise "no adapter was obtainable": the plain rung still yields none, but
the `--enable-unsafe-webgpu` rung does.

## Grid coverage verdict

**Full coverage.** All 15 cells of the task's grid are present in
`webgpu.json` → `primaryRun.matrix`, and all three strategies produced results with checksum
validation in every cell (45/45 mode-results; none missing):

- `N ∈ {1000, 10000, 50000}` × changed at the probe's five log-spaced points spanning
  `{1 .. 10000}` (i.e. `{1, 10, 100, 1000, 10000}`), per the probe README's matrix definition.
- One documented clamp, exactly as the probe design intends: `N=1000, requested changed=10000`
  ran at `changed=1000` and is recorded with `clamped: true` (the `*` cell below).
- 150 measured iterations per cell (60 for the heavy N=50000 full-upload rows), exceeding
  contract §8's ≥ 20 measured runs.

## What each strategy does (per-frame GPU work)

| strategy | per frame |
|---|---|
| full | one `queue.writeBuffer` of the entire `N·16` B buffer |
| partial | one `queue.writeBuffer` per changed entity (16 B each) — the benchmarked anti-pattern |
| scatter | one `queue.writeBuffer` of a compact delta (u32 count + ids + packed f32x4, ~20 B/entity) + one compute dispatch, `positions[ids[i]] = delta[i]`, ceil(changed/64) workgroups |

## Correctness first (this is what gates everything else)

XOR checksum over all N vec4s vs a CPU mirror, per mode per cell (15 cells each):

| strategy | checksum | reading |
|---|---|---|
| full | **15/15 passed** | bit-exact on SwiftShader |
| partial | **15/15 passed** | bit-exact on SwiftShader |
| scatter | **0/15 — FAILED on every cell** | actualXor ≠ expectedXor everywhere |

Scatter failure is non-deterministic, not a fixed addressing bug: the `N=1000, changed=1000`
cell and the clamped `changed=10000→1000` cell use identical seed/ids/values (same
`expectedXor 0x045e4c2a`) yet produced different `actualXor` within one run
(`0x7db5926d` vs `0x801f402e`). The probe's CPU packing/mirror logic is shared with the
passing full/partial paths, so the defect is in SwiftShader's compute execution
(a defect or incompatibility), not in the probe's addressing.

Per the probe contract ("a failed checksum invalidates the run") and the recorded
`citationPolicy`, **no µs number from this run may be quoted as performance data.** The
render-read check (one instanced draw of 50000 quads whose vertex stage reads
`positions[instance_index]` from the persistent buffer) **passed with zero device/validation
errors on all adapter-bearing rungs** — so the persistent-buffer→draw shape itself is
validated even though scatter's compute path is not.

## Numbers (min-of-runs) — SwiftShader relative magnitudes only

Per repo convention, min-of-runs is the comparable statistic (machine contention inflates
medians; see `add-realtime-benchmark-harness/design.md`), and the probe records
`wallMinUs` / `gpuMinUs` directly. Two independent timers per cell:

- **wall** = `performance.now()` around `writeBuffer(s) (+ encode/submit) → submit → onSubmittedWorkDone`; includes a completion-signal latency floor shared by all modes, so compare modes within a row.
- **gpu** = timestamp-query: for scatter, the compute pass only (the delta `writeBuffer` is not encoder-visible); for full/partial, an encoder-visible staging `copyBufferToBuffer` analogue of the upload — not the `writeBuffer` itself.

All values µs, min of 150 runs (60 for N=50k full rows). `*` = clamped cell.
**† = invalidated**: scatter checksum FAILED on that cell; its timing is shown only to keep
the matrix complete and must not be compared as a cost.

Wall-clock min (`wallMinUs`):

| N \ changed | 1 | 10 | 100 | 1000 | 10000 |
|---|---|---|---|---|---|
| full 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 * |
| full 10000 | 0.10 | 0.10 | 0.10 | 0.10 | 0.10 |
| full 50000 | 0.40 | 2.6 | 2.6 | 2.7 | 2.6 |
| partial 1000 | 0.0 | 0.0 | 0.10 | 2.7 | 2.8 * |
| partial 10000 | 0.0 | 0.0 | 0.10 | 2.7 | 8.5 |
| partial 50000 | 0.0 | 0.0 | 0.10 | 2.8 | 8.9 |
| scatter 1000 † | 0.10 | 0.10 | 0.10 | 0.30 | 0.30 * |
| scatter 10000 † | 0.10 | 0.0 | 0.20 | 2.1 | 2.3 |
| scatter 50000 † | 0.0 | 0.10 | 0.10 | 0.20 | 0.80 |

GPU-timestamp min (`gpuMinUs`, scope differs per mode — see above):

| N \ changed | 1 | 10 | 100 | 1000 | 10000 |
|---|---|---|---|---|---|
| full 1000 | 1.66 | 1.32 | 1.06 | 1.04 | 0.67 * |
| full 10000 | 4.14 | 4.19 | 3.63 | 4.85 | 4.42 |
| full 50000 | 30.83 | 29.51 | 58.96 | 19.66 | 42.84 |
| partial 1000 | 0.84 | 2.02 | 12.91 | 111.85 | 112.64 * |
| partial 10000 | 0.52 | 1.81 | 13.33 | 125.30 | 1151.12 |
| partial 50000 | 0.63 | 1.98 | 13.63 | 121.76 | 1305.64 |
| scatter 1000 † | 7.99 | 11.89 | 10.99 | 31.32 | 31.70 * |
| scatter 10000 † | 7.27 | 10.70 | 12.33 | 34.39 | 127.91 |
| scatter 50000 † | 6.90 | 9.59 | 9.21 | 27.70 | 114.05 |

Relative shape (cost ordering, not absolute claims):

- **full** is flat in `changed` by construction (one whole-buffer write) and grows with N — visible in both timers (wall 0.0→2.6 µs, gpu 1→~30–60 µs at N=50k).
- **partial** scales with `changed` in both timers — the anti-pattern is visible exactly where predicted: at `changed=10000` it is the worst strategy by an order of magnitude (wall min ~8.5–8.9 µs; gpu-timestamp analogue ~1.15–1.31 ms).
- **scatter** has the lowest wall-clock at high `changed` (one compact upload + one dispatch), with its compute-pass time growing roughly linearly in `changed` (gpu ~7→128/114 µs from changed=1→10000) — but every scatter number is † invalidated on this adapter.

## Caveats (SwiftShader / software adapter)

These runs are **google/swiftshader — software rendering**. Everything above describes
**relative strategy costs on a software adapter only**, not production GPU performance
(matching proposal.md's honest-limits line). Specifically:

1. **Scatter is unverifiable here.** 0/15 checksums, non-deterministic. Until it passes on a
   real GPU (or a fixed/compatible software path), scatter has no valid cost or correctness
   data at any cell. This is the single most important caveat for the task-4.3 decision record.
2. **Timestamps are technically present but not meaningful.** `timestamp-query` and
   `encoder.writeTimestamp` were both accepted, but per the scatter invalidation and the
   software adapter, no absolute GPU time is claimed from any mode.
3. **Wall-clock quirks.** Values show ~0.1 µs quantization (timer granularity; sub-0.1 µs
   reads as 0.0), and per the README every wall number includes a completion-signal latency
   floor shared by all modes — hence only within-a-row comparisons and min-of-runs are used.
4. **Headless capture, real clock.** CDP capture without `--virtual-time-budget`, so
   wall-clock values are real — but they are still SwiftShader numbers and are not quoted as
   performance anywhere.
5. **Adapter availability nuance.** Plain headless still yields no adapter; only the
   `--enable-unsafe-webgpu` ladder rungs do. Availability on end-user hardware remains a
   genuine park/reject risk, to be weighed in task 4.3.
6. **Probe bug found and fixed by this run** (recorded in `webgpu.json`
   → `probeBugFoundAndFixed`): the `tsCopyRun` staging buffer was created with the
   spec-invalid usage `MAP_WRITE|COPY_SRC|COPY_DST`; Dawn rejected creation and cascaded
   `[Invalid Buffer]` errors. Reduced to `COPY_SRC|COPY_DST`; post-fix runs show zero device
   errors. The Node mock-device check could not catch a usage-flag violation — only the real
   browser stack did.

## Gaps

**No grid cells are missing** — task 3.1's N × changed × strategy matrix is fully recorded
(see verdict above). The gap is one of **validity, not coverage**. Before any µs number from
this probe may be cited (e.g. in the task-4.3 decision record), a re-run must cover:

1. A **real-GPU, headed** run per the README ladder (rung 1/2), over **the same full grid**
   — `N ∈ {1000, 10000, 50000} × changed ∈ {1, 10, 100, 1000, 10000}`, all three strategies,
   150/60-iteration policy unchanged.
2. **Scatter checksums passing on all 15 cells** (currently 0/15, non-deterministic on
   SwiftShader). If scatter still fails on real hardware, the failure itself becomes the
   finding and the strategy is not adoptable.
3. A **timestamp sanity check** (non-zero, plausible scaling) before quoting any
   `gpuMinUs`/`gpuMedianUs` column.
4. Re-verification that `changed=10000` at `N=1000` still clamps (or that a larger N covers
   it) so no cell silently changes semantics between runs.

Until then, the citable deliverables of the recorded run are exactly the ones the JSON's
`citationPolicy` names: adapter identity, checksum pass/fail per mode, the ladder outcomes,
the render-read check, and the probe-bug fix — not timings.

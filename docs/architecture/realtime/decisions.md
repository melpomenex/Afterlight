# Realtime data-plane technology decisions

Status: evidence from `benchmarks/realtime` (results committed alongside),
2026-09-06. Machine: 24-core Linux, Node 22.22, Elixir 1.18.3/OTP 27,
rustc 1.93.1 (wasm32-unknown-unknown). Other benchmark agents ran concurrently
on the host, so **min-of-runs is the comparable statistic** (contract §8);
medians are also recorded in the JSON results.

Fixtures model the actual Afterlight wire (`presence_update` shape, world
bounds, jump apex, busy-room flag mix 60/25/10/5), populations 50–50,000,
churn 0.1%–100% (contract §8). "k" = changed entities, "n" = live entities.

## 1. Wire representation (primary question)

**Decision: ADOPT custom binary SoA (contract `afterlight-soa-v1`) with a
measured hybrid policy; REJECT Arrow for deltas; ADOPT Arrow selectively for
snapshots only (as a future envelope, not v0); REJECT legacy-JSON-as-usual at
scale.**

Byte models fit exactly from the grid (`results/core.json`, 273 cells):

| encoding | bytes | fit |
|---|---|---|
| A legacy JSON (presence_update shape) | ≈ 48 + 108·k | baseline |
| B binary AoS | — | loses to SoA on snapshots + decode (transpose cost); smallest single-record deltas but worst end-to-end |
| C SoA DENSE snapshot | ≈ 48 + 17·n | memcpy-cheap |
| D SoA SORTED_IDS delta | ≈ 48 + 25·k | fastest decode everywhere |
| E SoA ROARING delta | ≈ 80 + 21·k | CRoaring-portable bytes |
| F Arrow IPC full table | 3.0–5.1× smaller than JSON | 656 B fixed metadata/frame |
| G Arrow IPC + Roaring mask | ≈ 876 B @ k=10; ≈ 95.7 KB @ k=5000 | wins 40/53 grid points vs JSON, loses to SoA sections |

Representative points (bytes; encode/decode ms, min; heap delta on decode):

| point | JSON A | best binary | delta |
|---|---|---|---|
| N=200, f=5% (k=10) | 1,110 B · 0.008/0.009 · 1,784 B heap | E: 290 B · 0.003 decode | **3.8× bytes, 3× decode** |
| N=5,000, f=1% (k=50) | 5,419 B · 0.024 enc/0.042 dec · 8,536 B heap | E: 1,130 B · 0.002/0.003 · 1,984 B | **4.8× bytes, 11× decode, 4× heap** |
| N=50,000, f=10% (k=5,000) | 536,918 B · 2.0 enc/2.1 dec · 840 KB heap | E: 105,112 B · 0.044/0.046 · 1.9 KB | **5.1× bytes, 44× decode, 447× heap** |
| N=50,000, f=100% | 5.37 MB · 20.6/21.3 · ~8.4 MB retained | C dense: 850 KB · 0.17/0.48 dec | **6.3× bytes, 120× decode** |

Surprises recorded honestly: JSON wins raw encode CPU at N ≤ 200
(`JSON.stringify` on a handful of objects is genuinely fast) — bytes and
GC, not encode CPU, are why it loses. BEAM-side: SoA binary is 4.3× smaller
and 4.7–14× faster to encode than JSON maps (reductions 24× lower at
N=20,000); encode-once fanout to 200 clients is ~1 µs vs 911 µs–112 ms for
per-client re-encode (**encode once per capability class per tick is
decisively right**, contract §6).

### Measured hybrid policy (shipped in `shared/realtime/chooseEncoding.js`)

- fullness ≥ 0.85 → FULL_SNAPSHOT with DENSE sections (byte break-even ≈ 0.81; grid brackets it)
- k < 8 → SORTED_IDS (cross-over to roaring measured at exactly k = 8)
- else → DELTA_VARINT (v1 promotion, §2 below: ~24% smaller than sorted frames, ~10% smaller than roaring frames, decode parity)

### Mask encoding history

The k ≥ 8 slot originally shipped with ROARING (frame model 80+21k vs
sorted 48+25k). The v1 varint study superseded it: DELTA_VARINT frames
measured smaller than roaring frames at every fixture point (roaring/varint
= 1.10–1.16) with decode parity, so the writer's mid tier moved to varint.
Roaring remains reader-supported for interop and unsampled clustered id
distributions.

### Arrow (F/G) — ADOPT SELECTIVELY (snapshots only)

`tableFromIPC` is verified zero-copy in the installed lib (views into the
input buffer); value bytes ≈ 17/row. But every IPC stream pays 656 B
(5-col) fixed FlatBuffers+batch metadata: a k=1 delta is 722 B vs 144 B JSON
(5× larger); parity only at k ≥ 10, and it loses to contract SoA sections
everywhere (no per-frame schema). Verdict: not on the 10 Hz delta path;
candidate for a distinct `afterlight-arrow-v1` snapshot envelope (interop +
debuggability + zero-copy columns for the GPU path) in a later change.
Truncated IPC throws out of `tableFromIPC` — any adoption needs the
try/catch rejection wrapper per governance.

## 2. Sparse masks (Roaring vs simpler)

**Decision: REJECT Roaring for the writer's default policy; ADOPT
DELTA_VARINT (v1) as the bytes-optimal delta mask; KEEP the CRoaring-compatible
reader + the encoding enum.**
(`results/masks.*` standalone masks; `results/varint.*` frame-level, v1 study)

- Frame-level (v1 study, contract fixtures): DELTA_VARINT frames are
  **0.762× sorted's bytes at every measured scale** (k = 20..5,000) and
  ~10% smaller than Roaring frames (roaring/varint = 1.10–1.16), with
  decode-time parity (ratio 0.89–1.13, microseconds absolute).
- Standalone-mask study (pre-varint): delta-varint wins bytes sparse/mid
  (density < ~0.12); bitset wins bytes at density ≥ ~0.12; sorted u32 wins
  DECODE in 36/36 cells; roaring won bytes in **0/36** cells and decode in
  **0/36**; roaring-wasm's iterator is slower than naive JS over a sorted
  Uint32Array in 36/36 cells.
- Sorted u32 keeps the tiny-k slot (k < 8): a straight aligned u32 walk is
  the fastest decode and the byte penalty is ~20 B total.
- Roaring's claimed win regime (clustered/skewed ids) is unsampled by
  uniform fixtures — reader + enum retained; the writer no longer selects it.
- BITSET stays reader-supported; at frame level varint's simplicity won the
  policy slot.

## 3. Rust/WASM decode

**Decision: ADOPT SELECTIVELY.** (`results/wasm.*`; crate
`wasm/afterlight-realtime`, std-only cdylib, deterministic fuzz suite; arm
vs a real JS DataView decoder of the same frames, same fixture chains)

- Per-tick decode+apply: WASM wins **every** grid point, speedup grows with
  frame size — 1.03× (N=50k, f=1.0) to 1.56× (N=50k, f=0.01); ~1.2× in the
  common mid regime (min-based, the comparable statistic).
- Session join (FULL_SNAPSHOT apply): WASM ~10–30× faster than the JS arm
  (e.g. N=10k: 0.55 vs 3.14–3.47; N=50k: 3.04 vs 9.1–11.1).
- Memory: 600-tick chain shows zero linear-memory growth events (6.44 MiB
  flat) and ~0 retained JS heap per tick in both arms — the no-churn
  discipline holds in both.
- Fuzz: deterministic mutation corpus (truncation/flip/overflow/bad-enum)
  returns bounded rejections and leaves the store usable.

Honest read: a 1.2–1.5× per-tick win does not justify WASM for small rooms
where the whole pipeline is optional anyway — JS stays the default and the
fallback. WASM earns its place at scale (50k-entity joins) and as the
fuzz-hardened reference decoder; adoption rides behind `realtime_wasm`
per the decoder change, never a default.

Discovery that outlives the verdict: **the 1 MiB frame cap binds before the
largest populations** — a 50k-entity full-changed delta is ~1.25 MB and a
full snapshot with spawn rows exceeds 1 MiB past ~37k entities. ADDRESSED by
the chunked-frames amendment (contract §4a, `writeChunkedFrames` in
`shared/realtime`): 50k joins now split into cap-respecting SNAPSHOT_CHUNKs
and were verified live at 50,002 entities through the worker path
(dual-path parity PASS, zero resyncs).

## 4. WebGPU scatter

**Decision: PARK — probe infrastructure complete and validated; measurement
requires WebGPU-capable browser flags/hardware unavailable in this
environment.** The probe (`benchmarks/realtime/webgpu/probe.html`, no build
step) implements the full matrix — full-buffer write vs per-entity partial
writes (the anti-pattern, for contrast) vs compact delta upload + compute
scatter into persistent storage buffers — with bit-exact XOR-checksum
validation of scatter correctness read back from GPU, an instanced
render-read check, timestamp-query timing with wall-clock fallback, and a
graceful `{supported: false}` path. It was validated three ways: mock-device
semantics check in Node (45/45 cells bit-exact), the unsupported path in the
embedded browser (`navigator.gpu` present, `requestAdapter() → null` —
reported cleanly), and headless attempts with the documented swiftshader flag
ladder. No adapter was obtainable in either testable browser here, so **no
performance numbers are claimed**. The README documents the exact flag ladder
for a WebGPU-capable run; running it is the first task of any future GPU
milestone. Per governance, a park verdict closes this evaluation honestly
rather than manufacturing justification.

2026-09-07 amendment (executed under browser tooling, `results/webgpu.*`):
Chromium 152 headless `--enable-unsafe-webgpu` now yields an adapter here
(google/swiftshader, software) — full/partial uploads validate bit-exact
(30/30 XOR cells) and the render-read check passes, but scatter fails the
checksum 0/15 with non-deterministic GPU state for identical inputs, so the
PARK stands for scatter and no performance numbers are claimed; the run also
exposed a spec-invalid staging-buffer usage in the probe, fixed same-day.

## 5. Web Workers

**Decision: ADOPT for large per-tick row counts (≥ ~10k–50k changed rows) and
for off-threading at scale; tie below.** (`results/pipeline.*`: main-thread
crossover + 600-tick allocation soak, fraction 0.1. CORRECTED run: an earlier
crossover claim was inflated by a boot/id-space mismatch that let the pipeline
skip most rows as unknown; the committed numbers boot from the fixture
world's real ids so every row applies.)

- Legacy JSON vs binary pipeline, main-thread µs/tick (min): 50 → 0.31×,
  1,000 → 0.58×, 10,000 → 0.99× (tie), 50,000 → **1.53×**.
- Soak (N=10,000 × 600 ticks): allocations/tick flat — trend 621 B/tick
  (< 1 KB threshold).
- The decisive large-room benefit is off-threading, not the ratio: in worker
  mode the main-thread cost falls to pack consumption alone regardless of
  decode size; verified live (harness, worker mode, dual-path parity PASS:
  201 entities, max error 0.020 u, zero resyncs).
- `realtime_worker` stays opt-in per room scale; small rooms keep the
  simpler inline/legacy paths.

## 6. WebTransport

**Decision: NOT STARTED (deliberately).** Binary architecture must function
over the established Phoenix/WS transport first, per program charter.

## 7. Entity render backend (WebGPU fast path)

**Decision: ADOPT SELECTIVELY — CPU seam ships; WebGPU backend PARK; live
default REJECT.** Full record: `docs/architecture/realtime/gpu-rendering.md`
(change `add-realtime-gpu-rendering`). Probe scatter remains FAILED on
SwiftShader (0/15); no µs numbers; `renderer_webgpu_fastpath` stays
harness-only and default OFF. Local player and Kiln stay on the traditional
path.

## Interop verification

`shared/realtime/roaring.js` (dependency-free) was cross-validated against
CRoaring (roaring-wasm 1.1.0) in 4 directions × 8 id-set regimes (including
run-optimized containers and 50k-id spreads): my bytes → CRoaring reader,
CRoaring bytes → my reader, run-flag variant → my reader, self round-trip.
Portable layout documented byte-level in the module header (cookie 12346/12347
variants, offsets table, array/bitmap/run containers).

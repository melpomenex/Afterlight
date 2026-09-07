# Tasks: add-realtime-benchmark-harness

## 1. Harness core

- [x] 1.1 `benchmarks/realtime/lib/fixtures.mjs` — deterministic worlds (populations 50–50k), gap-y u32 ids, string guestIds, busy-room flag mix, `stepWorld` churn, `worldToJsonUpdate` legacy-shape baseline.
- [x] 1.2 `benchmarks/realtime/lib/measure.mjs` — timeIt (median/p95/min, warmup 3 + 20 runs), heapDelta (honest `undefined` without `--expose-gc`), result writer with env metadata.
- [x] 1.3 Nested `benchmarks/realtime/package.json` (apache-arrow, roaring-wasm); root manifest untouched.

## 2. Encodings A–H

- [x] 2.1 Encoding A: JSON baseline through the real stringify/parse path.
- [x] 2.2 Encoding B: binary AoS with the shared 24-byte header; layout documented in-file.
- [x] 2.3 Encoding C: SoA FULL_SNAPSHOT, DENSE sections per contract §3.
- [x] 2.4 Encoding D: SoA DELTA, SORTED_IDS sections.
- [x] 2.5 Encoding E: SoA DELTA, ROARING sections (roaring-wasm serialization).
- [x] 2.6 Encoding F/G: Arrow IPC record batches (± Roaring masks) with metadata-vs-value byte accounting.
- [x] 2.7 Encoding H: `chooseEncoding.mjs` hybrid with measured thresholds.

## 3. Studies and arms

- [x] 3.1 Mask study: sorted vs varint vs bitset vs roaring across N up to 200k; threshold table + decision rules (`results/masks.*`).
- [x] 3.2 WASM arm: `wasm/afterlight-realtime` crate (decoder + slot store + status-code errors), ABI.md, fuzz tests, wasm-vs-JS bench (`results/wasm.*`).
- [x] 3.3 BEAM arm: `beam/bench_encode.exs` binary-vs-JSON encode, iodata build/flatten, encode-once fanout K ∈ {1,10,100,200} (`results/beam.*`).
- [x] 3.4 WebGPU probe: full vs partial vs scatter with checksum validation + README run flags (`webgpu/`), executed under browser tooling with results recorded.

## 4. Correctness and results

- [x] 4.1 Round-trip semantic tests for every encoder on sample fixtures.
- [x] 4.2 Hostile-input tests: truncation, bad magic, absurd lengths, bad enums, trailing bytes — bounded rejection, no escaped throws.
- [x] 4.3 Runners produce `results/core.json|md`, committed with environment metadata; representative table in the run output.
- [x] 4.4 Root `npm test` remains green; harness tests run via `node --test benchmarks/realtime/tests/` without changing the root test script.

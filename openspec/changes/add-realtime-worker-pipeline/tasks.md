# Tasks: add-realtime-worker-pipeline

## 1. Worker core

- [x] 1.1 `src/realtime/worker/decode.worker.js` — receives transferred frame buffers, applies via shared codecs (optionally WASM behind `realtime_wasm`), maintains the entity store, emits delta packs.
- [x] 1.2 Buffer pool + transfer discipline; no SharedArrayBuffer; documented COOP/COEP deferral.
- [x] 1.3 Back-pressure policy: transform frames coalesce to newest-per-entity; lifecycle frames never dropped; baseline gap → resync signal.

## 2. Main-thread seam

- [x] 2.1 `src/realtime/consumer.js` — delta pack → `setPlayer()`-shaped entries; pooled pack buffers; tick/epoch bookkeeping mirroring the protocol capability.
- [x] 2.2 Room travel/reset: slots freed, baselines cleared, id maps dropped (mirrors `remotePlayers.clear()`).
- [x] 2.3 Flag composition: binary-without-worker (on-thread decode), worker-without-binary (JSON passthrough no-op), both off (exact legacy behavior).

## 3. Failure model

- [x] 3.1 Worker construct/error/crash → main-thread legacy decoding fallback, session continues.
- [x] 3.2 Stalled-handshake watchdog with bounded window; recovery path tested.

## 4. Verification

- [x] 4.1 Headless worker tests (port mocks): coalescing, lifecycle preservation, reset, crash fallback.
- [x] 4.2 Allocation bench: allocations/tick flat over 600 ticks; crossover analysis JSON-vs-pipeline by population (`results/pipeline.*`).
- [x] 4.3 `tools/realtime/harness.html`: side-by-side legacy vs accelerated against the echo server; store-level parity assertion; screenshots for visual sanity.
- [x] 4.4 If required, minimal `vite.config.js` for worker bundling only, documented as a scoped exception.

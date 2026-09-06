# Tasks: add-realtime-worker-pipeline

## 1. Worker core

- [ ] 1.1 `src/realtime/worker/decode.worker.js` — receives transferred frame buffers, applies via shared codecs (optionally WASM behind `realtime_wasm`), maintains the entity store, emits delta packs.
- [ ] 1.2 Buffer pool + transfer discipline; no SharedArrayBuffer; documented COOP/COEP deferral.
- [ ] 1.3 Back-pressure policy: transform frames coalesce to newest-per-entity; lifecycle frames never dropped; baseline gap → resync signal.

## 2. Main-thread seam

- [ ] 2.1 `src/realtime/consumer.js` — delta pack → `setPlayer()`-shaped entries; pooled pack buffers; tick/epoch bookkeeping mirroring the protocol capability.
- [ ] 2.2 Room travel/reset: slots freed, baselines cleared, id maps dropped (mirrors `remotePlayers.clear()`).
- [ ] 2.3 Flag composition: binary-without-worker (on-thread decode), worker-without-binary (JSON passthrough no-op), both off (exact legacy behavior).

## 3. Failure model

- [ ] 3.1 Worker construct/error/crash → main-thread legacy decoding fallback, session continues.
- [ ] 3.2 Stalled-handshake watchdog with bounded window; recovery path tested.

## 4. Verification

- [ ] 4.1 Headless worker tests (port mocks): coalescing, lifecycle preservation, reset, crash fallback.
- [ ] 4.2 Allocation bench: allocations/tick flat over 600 ticks; crossover analysis JSON-vs-pipeline by population (`results/pipeline.*`).
- [ ] 4.3 `tools/realtime/harness.html`: side-by-side legacy vs accelerated against the echo server; store-level parity assertion; screenshots for visual sanity.
- [ ] 4.4 If required, minimal `vite.config.js` for worker bundling only, documented as a scoped exception.

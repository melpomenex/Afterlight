# Add Realtime Worker Decode Pipeline

## Why

Binary frames only pay off if decoding does not fight the render loop. Today every socket message is JSON-parsed on the browser main thread (`src/net/client.js:97-105`), and the renderer audit found the frame loop already mutates dozens of object transforms per frame, allocates per-frame temporaries, and runs an 8×8 homography solve in theater rooms. Decoding a 50-entity roster in JSON is cheap today; decoding 5,000–50,000 columnar entities on the main thread would not be. The pipeline that decodes off-thread, maintains state without per-entity object churn, and hands the renderer compact changed-arrays is therefore its own milestone — and the seam where the WASM decoder (if adopted) plugs in.

## What Changes

- **Decode worker** (`src/realtime/worker/`): owns the socket-adjacent decode step — binary frames in, entity-store updates out — using transferable ArrayBuffers (no SharedArrayBuffer in v0; its COOP/COEP cost is documented and deferred), double-buffered handoff, and a monotonic frame queue that drops superseded transform frames under back-pressure rather than queueing unboundedly.
- **Zero-churn state discipline**: the worker's entity store reuses typed arrays and free-list slots; a tick produces (changedIds, changedColumns) views — never one object per entity. Measured, not assumed: the harness reports allocations/tick for the pipeline.
- **Main-thread consumer seam** (`src/realtime/consumer.js`): converts worker output into `RemotePlayersManager.setPlayer()`-compatible entries and `THREE` transform writes — the legacy avatar path is consumed unmodified, so the game renders identically whether frames arrive as legacy JSON or via the pipeline.
- **Lifecycle and reconnection**: worker crash or stalled handshake falls back to main-thread legacy decoding; room travel resets the store (slots, baselines) deterministically; the `rt` capability stays per-connection.
- **Flag-gated, unwired by default**: `realtime_worker` + `realtime_binary` enable the path in the prototype harness page (`tools/realtime/`); wiring into the live game remains a future gated change with parity evidence.

## Capabilities

### New Capabilities

- `realtime-worker-pipeline`: off-thread binary decode with bounded memory, zero per-entity allocation on the hot path, graceful degradation to legacy decoding, and main-thread consumption that preserves the existing renderer contract.

### Modified Capabilities

- (none)

## Impact

- **New**: `src/realtime/worker/**`, `src/realtime/consumer.js`, `tools/realtime/harness.html` (two-browser-style prototype page), pipeline allocation/latency benches in `benchmarks/realtime/results/pipeline.*`.
- **Existing**: none modified — `src/net/client.js`, `src/main.js`, and avatars are untouched; the pipeline consumes their documented contracts (setPlayer entry shape, 10 Hz cadence).
- **Tests**: `tests/realtime/` worker semantics (queue drop policy, room-reset, crash fallback) runnable headlessly via worker_message port mocks; root suites untouched.
- **Vite note**: the repo has no `vite.config` (defaults only); if worker bundling needs config, the change adds a minimal `vite.config.js` touching only worker output — documented as a deliberate, scoped exception.

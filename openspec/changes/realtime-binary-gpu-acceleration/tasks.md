# Tasks: realtime-binary-gpu-acceleration (umbrella)

## 1. Program coordination

- [x] 1.1 Compat report + protocol contract committed (`docs/architecture/realtime/compat-report.md`, `contract.md`) — discovery of the migration's interfaces, ownership matrix, conflict resolutions.
- [x] 1.2 Benchmark harness lands (`add-realtime-benchmark-harness`) with first committed results.
- [x] 1.3 Technology decision records opened in `docs/architecture/realtime/decisions.md` — one section per technology, adopt/selectively/reject with numbers.
- [x] 1.4 Protocol change lands (`add-realtime-binary-protocol`) with codecs + tests, no live wiring.
- [x] 1.5 Decode change lands (`add-realtime-wasm-decoder`) with crate, fuzz, and wasm-vs-JS verdict.
- [ ] 1.6 Pipeline change lands (`add-realtime-worker-pipeline`) behind `realtime_worker`.
- [ ] 1.7 Rendering change lands (`add-realtime-gpu-rendering`) behind `renderer_webgpu_fastpath` with visual-parity evidence.

## 2. Gates before any default flips (future change, out of scope here)

- [ ] 2.1 Dual-path parity suite green on shared fixtures (semantic + visual).
- [ ] 2.2 Fallback ladder exercised: forced WASM failure, device loss, worker crash, malformed/stale frames → legacy path continues.
- [ ] 2.3 Decision records complete for all six technologies; each adopted technology has a measured win at an Afterlight-realistic population.
- [ ] 2.4 Migration coordination reviewed: P2/P3/P9 field convergence (epoch/tick/sequence) re-checked against the landed gateway.

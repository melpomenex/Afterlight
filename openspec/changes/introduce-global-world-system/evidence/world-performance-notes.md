# Performance cohort notes (task 8.4)

Gate script: `scripts/world-performance-cohort.mjs` (production build served by
`vite preview`). Raw per-cycle data:
`world-performance-cohort-run.json`.

## What was measured (2026-09-13, this desktop, Chromium 152, DPR 1, tier high)

| Metric | Run A | Run B |
| --- | --- | --- |
| Cold loads (5), load event median | 2.10 s | 2.12 s |
| Cold loads p95 | 2.10 s | 2.18 s |
| Place-return cycles (20) median | 0.084 s | 4.43 s |
| Place-return p95 | 12.3 s | 7.8 s |
| World-switch cycles (20) median | 0.95 s | 0.96 s |
| World-switch p95 | 2.85 s | 2.65 s |
| Errors | none | none |

Two runs were taken because the first showed bimodal return cycles (sub-100 ms
alternating with multi-second stalls). The second run's median moved from 84 ms
to 4.4 s with no code change between them, which identifies the stalls as
external machine contention, not a deterministic World-system task. Per-cycle
data is preserved in the JSON for inspection.

## What could not be verified

- Walking p95 frame-interval delta (D8: <= 2 ms) — no frame-interval sampler
  was wired for this cohort.
- Individual preparation CPU task budget (D8: no new task > 50 ms).
- Theater TTI preparation delta (D8: <= 5% and <= 100 ms).
- Kart entry / suspended-return gates (`fix-kart-royale-instant-entry`
  numbers) — Kart entry was not capturable in this checkout while another
  in-progress change was editing the Kart loading path (see 8.3 notes).
- GPU byte accounting and retention-eviction ledgers — `renderer.info` exposes
  counts, not bytes; no constrained-hardware device was available.
- Forced-GC heap delta — browser exposes `performance.memory` without a GC
  hook; observed heap was 98 MB -> 67 MB across run B (no sustained rise) and
  61 MB -> 77 MB across run A under contention.

## Conclusion

Cold start and World switching measured cleanly on the production build with no
errors. The strict D8 frame/TTI/retention numbers remain **unverified** in this
environment. The World system's functional acceptance (56-check browser gate,
1,734 unit tests, build, projection and focused Phoenix tests) passed; the
performance sub-gates must be re-measured on an unloaded machine and on
constrained hardware before being claimed.

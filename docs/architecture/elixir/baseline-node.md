# Node baseline measurements (P0)

Method and environment for every number. **No capacity targets here** — these are single-run observations of the legacy Node server on one development machine, recorded as the pre-migration baseline (migration.md §0). Re-run with `node scripts/measure-node-baseline.mjs [--seconds N]`.

- Date: 2026-09-06
- Repository revision: working tree at `main` after `f42176d` (uncommitted migration tooling present; `git rev-parse HEAD` = f42176d2c8f0e78d471e5b60fa1fcb03ba2f4a28 at run time — verify against the committed snapshot for exactness)
- Environment: Linux 7.0.0-30-generic x64, Node v22.22.1, localhost loopback, throwaway data dir (cwd-isolated), IRC disabled
- Workload: 2 scripted WebSocket clients, `hello` → `join_room market` → movement at ~10 Hz, 12 s measurement window
- Metric: every received `presence_update` frame (the 100 ms dirty-room full-roster flush) — byte size per frame and per-second aggregates per client

## Results (12 s window)

| Metric | With probe | No-probe control |
|---|---|---|
| presence_update frames received | 242 | 240 |
| frame bytes p50 / p95 / max | 291 / 296 / 298 | 291 / 295 / 298 |
| bytes per second p50 / max | 5 816 / 5 874 | 5 820 / 5 886 |

Probe diagnostics (with-probe run): 3 storage saves, save latency p50 0.18 ms / p95 0.32 ms / max 0.32 ms; event-loop delay p95 10.5 ms / max 11.1 ms (2 s histogram windows, 10 ms resolution — the p95 sits at the flush cadence, i.e. the histogram barely resolves sub-flush lag; treat the loop numbers as coarse).

Control-run delta: frame sizes identical (±1 byte p95), frame count within 1% — the probe does not distort traffic numbers.

## Honest reading

- 291 B per full-roster flush for TWO players is consistent with the capacity model's `~100 B per avatar per snapshot` assumption plus framing; the quadratic within-room fanout risk is about per-receiver copies (each of N receivers gets the full N-avatar roster 10×/s), not per-frame size.
- Save latency is sub-millisecond **at the current 17 KB whole-file state**; the hazard is the rewrite-on-every-mutation model, not today's constant. Do not extrapolate this number to production-scale state.
- Not measured (and why): memory footprint under load (not instrumented in this run), event-loop lag under >2-player contention (workload scope), broadcast behavior in the theater room (room-specific payloads differ), slow-receiver buffering behavior (no artificial backpressure applied). Mark as open work for P10's load suite.

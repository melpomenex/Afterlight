# Market Contention Benchmark Evidence (Task 7.5)

Recorded: 2026-09-08T06:29:56.397853Z
Samples per scenario: 200
Status: PASS

## Performance Summary vs Target

- **Target**: Same-region fill ack latency **p95 < 250 ms**
- **Deadlocks**: **0 deadlocks** under advisory lock ladder (`MarketFill.advisory_lock!(crop_id)`)

| Scenario | Operations | Deadlocks | p50 (ms) | p90 (ms) | p95 (ms) | p99 (ms) | Max (ms) | Target (< 250ms) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Two Buyers Racing One Resting Order** | 200 | 0 | 18.92 | 27.03 | 29.43 | 33.64 | 44.2 | MET |
| **2. Mixed 8-Crop Hot-Market Load** | 200 | 0 | 16.84 | 40.37 | 45.77 | 66.85 | 72.51 | MET |

## Invariants Verified During Load

1. **Advisory Lock Ladder Safety**: Each market operation acquires a per-crop advisory transaction lock (`hashtextextended('market:' <> crop_id, 0)`). Fills across independent crops execute with full concurrency, while order matching within a crop serializes cleanly without deadlock.
2. **Conservation Invariant**: Δ(coins) + Δ(reserved) = -fee across all matched trades.
3. **Zero Deadlocks**: 0 deadlock exceptions across 400 contention operations.

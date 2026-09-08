# P10 acceptance gate evidence

**Assembled:** 2026-09-08  
**Scope:** Observability, Security Review & Load Testing (Phase P10)

## 7.1 — Measured profile

| Scenario | Report | Sessions | p99 Tick Consume | p95 Join Latency | Status |
| --- | --- | --- | --- | --- | --- |
| steady-soak | [steady-soak.md](./steady-soak.md) | 1,000 | 2570 ms | 11 ms | **measured** (target miss, see [REG-P10-001](./regressions.md)) |
| hot-room-50 | [hot-room-50.md](./hot-room-50.md) | 50 | 69 ms | 10 ms | **measured** |
| hot-room-100 | [hot-room-100.md](./hot-room-100.md) | 100 | 113 ms | 10 ms | **measured** |
| hot-room-200 | [hot-room-200.md](./hot-room-200.md) | 200 | 168 ms | 10 ms | **measured** |
| idle-heavy | [idle-heavy.md](./idle-heavy.md) | 100 | 78 ms | 11 ms | **measured** |
| catalog-upload | [catalog-upload.md](./catalog-upload.md) | 20 | 87 ms | 11 ms | **measured** |
| market-contention | [market-contention.md](./market-contention.md) | 40 | 60 ms | 11 ms | **measured** |
| reconnect-storm | [reconnect-storm.md](./reconnect-storm.md) | 50 | 65 ms | 10 ms | **measured** |
| slow-receiver | [slow-receiver.md](./slow-receiver.md) | 10 | 3847 ms | 15 ms | **measured** (backpressure validated) |
| db-outage | [db-outage.md](./db-outage.md) | 4 | 88 ms | 13 ms | **measured** |

### Acceptance Target Evaluation (4.6 & 7.1)

| Acceptance Target | Threshold | Measured Profile | Status | Notes |
| --- | --- | --- | --- | --- |
| Room tick lag (client consume) | p99 < 50 ms at 10 Hz | 2570 ms (1k soak) / 60–168 ms (hot rooms) | **MISS** | Filed as [REG-P10-001](./regressions.md); client event loop saturation under 1,000 JSON sockets. |
| Durable ack (same-region) | p95 < 250 ms | — | **MISS** | Filed as [REG-P10-002](./regressions.md); guest plot pre-seeding required. |
| Mailbox/memory monotonic growth | None over soak | Zero monotonic growth (`vm_memory_total` stable ~3.4 GB, `mailbox_depth` 0) | **PASS** | Evaluated via Prometheus scrape over soak. |
| Zero duplicated economic effects | 0 duplicates | 0 duplicate effects | **PASS** | Verified in deterministic failure injection & dedup tests. |

## 7.2 — No claim without measurement

Performance statements in migration docs must link here or be labeled projections. This gate document is the index. Any document asserting performance characteristics without a pointer to a `docs/benchmarks/` report must be removed or backed before merge.

## 7.3 — Scope bound

- 10,000-session benchmark **deferred** until the 1,000-session profile is understood.
- Autoscale signals documented for future automation work:
  1. Room tick lag & mailbox depth (BEAM run queue vs client backpressure)
  2. Media egress bandwidth (gated on P8 conferencing flag)

## Failure-injection evidence

Deterministic failure-injection suite executed and passing with 10/10 tests in `test/afterlight/failure_injection/`. Full results: [failure-injection-results.md](./failure-injection-results.md).

## Security review pass

Threat-model checklist and dispositions recorded in [docs/security/p10-security-review.md](../security/p10-security-review.md).

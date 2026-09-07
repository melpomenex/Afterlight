# P10 acceptance gate evidence

**Assembled:** 2026-09-07

## 7.1 — Measured profile

| Scenario | Report | p99 tick | p95 durable ack | Status |
| --- | --- | --- | --- | --- |
| smoke-mini | [smoke-mini-smoke.md](./smoke-mini-smoke.md) | — | — | **not yet run** |
| idle-heavy | [idle-heavy-smoke.md](./idle-heavy-smoke.md) | — | — | **not yet run** |

### 1,000-session / 20-room steady soak

_Not yet run in this environment._ Full parameters and stop conditions: [runbook](./runbook.md#steady-soak-1000-sessions--20-rooms).

## 7.2 — No claim without measurement

Performance statements in migration docs must link here or be labeled projections. This gate document is the index.

## 7.3 — Scope bound

- 10,000-session benchmark **deferred** until the 1,000-session profile is understood.
- Autoscale signals documented for future work: room tick lag, mailbox depth, media egress (when P8 flag on).

## Failure injection

See [failure-injection-results.md](./failure-injection-results.md).

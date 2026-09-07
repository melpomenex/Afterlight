# P10 multi-node room ownership gate (2026-09-07)

## Decision: **defer** second room node

Multi-node room operation is **not enabled**. Single-node remains the supported topology.

## Evidence summary

| Signal | Observed (pre-P10 baseline) | Target / ceiling | Headroom |
| --- | --- | --- | --- |
| Concurrent sessions exercised | 2-client parity fixtures only | 1,000-session soak (P10) | Not yet measured |
| Room fanout (theoretical) | ~400 Mbit/s at 1k sessions / 50 per room | Calibrate in P10 | Unknown |
| Node resource ceilings | Not instrumented (`baseline-node.md`) | p99 tick < 50 ms @ 10 Hz | Not measured |
| Availability requirement | Single dev gateway | Multi-node HA | Not demonstrated |

`docs/architecture/elixir/baseline-node.md` records an honest two-client baseline only — no load suite, no mailbox/memory ceilings under contention. The P10 change (`add-observability-security-loadtesting`) has not yet produced the 1,000-session profile or failure-injection suite.

## Rationale

Per `add-distributed-room-ownership` design D8 and spec "Measured precondition": without recorded P10 evidence that single-node operation is insufficient, a second room node is a deployment error. The lease/epoch/drain **substrate** lands on the existing single node so P10 can exercise partition, stale-epoch, and drain scenarios before enablement.

## Substrate status (P9)

- `room_leases` table and `Afterlight.World.Lease` acquire/renew/fence
- In-transaction lease checks on durable room mutations (gateway path)
- `Afterlight.World.Directory` short-TTL gateway view
- Client epoch discard rule
- Bounded drain hooks and libcluster config (disabled until gate passes)

## Revisit criteria

Enable `AFTERLIGHT_MULTI_NODE_ROOMS=1` only after P10 records:

1. 1,000-session soak with p99 room tick < 50 ms **or** documented ceiling breach
2. Partition / kill / stale-epoch / reconnect-storm failure injection green
3. This artifact updated with justify decision and link to soak report

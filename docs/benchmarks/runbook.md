# Load testing runbook (P10)

Protocol-aware load scenarios for Afterlight's Phoenix gateway and room runtime. The headless client lives in `tools/load_client/` and reuses `shared/protocol.js` semantics.

## Prerequisites

1. **Stack running:** `npm run dev:stack` (Node game server + Elixir gateway on port 4000) or equivalent.
2. **World routing flipped:** Elixir `dev.exs` world rows must route `join_room` / `movement` / `emote` to `:phoenix` for meaningful tick measurements (see `scripts/verify-world-runtime.mjs --flip-wait`).
3. **Node:** 20+ (matches repo `package.json`).
4. **Hardware:** Record CPU model, core count, RAM, and disk type in every report.

## Commands

```sh
# List scenario configs
node tools/load_client/cli.js list

# Run one scenario (stdout JSON)
node tools/load_client/cli.js run smoke-mini --ws ws://127.0.0.1:4000/socket/websocket

# Dev smoke + write docs/benchmarks/*.md
npm run load:smoke
```

Environment overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOAD_WS_URL` | `ws://127.0.0.1:4000/socket/websocket` | Gateway WebSocket URL |

## Error definitions

| Term | Meaning |
| --- | --- |
| **rejection** | Server `error` frame (`room_unavailable`, `superseded`, `relay_down`, …) |
| **drop** | Client exceeded `maxUnread` and discarded a `presence_update` (backpressure) |
| **timeout** | Scenario waiter exceeded deadline |
| **stale_revision** | Durable envelope `expected_revision` behind authority |
| **stale_epoch** | Realtime binary frame behind room epoch |
| **overload** | Server rejected before executing (pool/mailbox bound) |

## Scenario matrix

### Gradual ramp

Config: `gradual-ramp.json`

- **Parameters:** 1,000 sessions, 20 effective rooms (round-robin across `market`, `theater`, `kiln-terrace`), 10-minute ramp.
- **Stop:** Ramp complete; hand off to steady soak.

### Steady soak (1,000 sessions / 20 rooms)

Config: `steady-soak.json`

- **Parameters:** 1,000 sessions, 1-hour soak, 25% movers at 10 Hz consume rate, 1 durable command per client per soak window.
- **Stop:** 3600 s elapsed; capture p99 tick, p95 durable ack, mailbox/memory gauges from Prometheus.
- **Targets:** p99 room tick < 50 ms; p95 durable ack < 250 ms; no monotonic mailbox/memory growth.

### Hot rooms (50 / 100 / 200)

Configs: `hot-room-50.json`, `hot-room-100.json`, `hot-room-200.json`

- **Parameters:** All sessions in `market`; ramp 30 s / 60 s / 120 s respectively.
- **Capture:** Fanout payload sizes, per-room roster gauges, frame interval p99.

### Idle-heavy mix

Config: `idle-heavy.json`

- **Parameters:** 100 sessions, 5% movers, 60 s soak.
- **Capture:** Connected socket count vs movement coalesce rate.

### Catalog uploads during gameplay

Config: `catalog-upload.json`

- **Parameters:** 20 theater sessions + periodic `POST /api/theater/playlists` (run upload sidecar separately).
- **Capture:** Import queue depth, upload latency, gameplay tick lag during uploads.

### Market contention

Config: `market-contention.json`

- **Parameters:** 40 market sessions, 5 durable commands each.
- **Capture:** Contention events, durable ack p95, dedup hits.

### Reconnect storm

Config: `reconnect-storm.json`

- **Parameters:** 50 sessions, simultaneous reconnect with 150 ms jitter.
- **Capture:** Join latency p95, reconnect count, exactly one logical session per identity.

### DB outage fail-closed

Config: `db-outage.json`

- **Procedure:** Stop PostgreSQL or block repo pool; movement continues while room membership valid; durable commands must fail closed with retryable errors.
- **Capture:** `room_unavailable` / overload rejection counts; no silent economic drops.

### Slow receiver

Config: `slow-receiver.json`

- **Parameters:** `slowReceiver: true`, consume at 2 Hz, `maxUnread: 8`.
- **Capture:** Server memory stability, `frames_dropped_backpressure` counter, stall disconnects if any.

## Failure-injection suite (Elixir)

Run separately from default CI:

```sh
cd server_elixir && mix test --include failure_injection test/afterlight/failure_injection/
```

## Report protocol

Every run committed under `docs/benchmarks/` must include:

- Scenario name and full config JSON
- p50 / p95 / p99 for named latencies
- Hardware and software versions
- Measured JSON frame payload sizes
- Error definitions (table above)
- Pass/fail against migration targets with honest "not yet run" when deferred

Index: [p10-acceptance-gate.md](./p10-acceptance-gate.md)

## Telemetry overhead

When section 1 telemetry lands, re-run `smoke-mini` with telemetry enabled and disabled; record delta in the smoke report.

## LiveView counts

LiveView is not mounted yet. Scenario reports record `liveview.connected: 0` until a LiveView endpoint ships (ADR-001).

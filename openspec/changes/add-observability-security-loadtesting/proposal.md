# Add Observability, Security Review & Load Testing (Phase P10)

## Why

The migration carries explicit measurement obligations it cannot currently see: `migration.md`'s acceptance targets (p99 room tick < 50 ms at 10 Hz, p95 same-region durable-command ack < 250 ms, no monotonic queue/memory growth, zero duplicated economic effects under retry/disconnect/failover) are stated as targets to measure, and its capacity math is labeled "assumptions, not benchmarks" — yet P0–P9 land capabilities with only local and integration tests. Nothing exports a metric, no soak has run against the real room runtime, no failure-injection suite exercises DB outages, duplicate delivery or partitions, and no security review has systematically checked the new auth surface (signed identity, channel join authorization, import fetch guards, torrent grant scope, TURN credentials) that P2–P8 introduced.

Current: `runtime.md` §Operations and security already names the measurements required — connection counts, room sizes, process memory, mailbox depth, scheduler utilization, tick lag, dropped/coalesced movement, join latency, DB pool waits, transaction retries, outbox age, import queue depth — plus the log rule: correlate request/room IDs without logging tokens or private messages. None of it is implemented.

Desired: a measurement and hardening layer — Prometheus-style telemetry built on `:telemetry`/`Telemetry.Metrics` (following the serviceradar web-ng `telemetry.ex` pattern, including `ash.*` metrics), secret-free log correlation via request_id + room key + revision + epoch, a protocol-aware load client that truly joins rooms and applies backpressure, the 1,000-session scenario matrix, a failure-injection suite, a threat-model-driven security review pass with recorded dispositions, and a measured benchmark report committed under `docs/benchmarks/` in which no target is claimed without a measurement.

## What Changes

- **Observability instrumentation** across the runtime: connected sockets, room sizes, per-room mailbox depth, room tick duration, scheduler utilization, process memory, dropped/coalesced movement, join latency, reconnect counts, DB pool wait, transaction duration/retries/deadlocks, market contention, outbox age, import queue depth, command rejections, and dedup hits.
- **Media metrics group** (added when P8 lands and its flag is on): per-call/per-track bitrate, packet loss, RTT, jitter, retransmissions, and media worker memory — absent from the exporter without breaking it when conferencing is disabled.
- **Prometheus-style exporter**: an `Afterlight.Telemetry` supervisor registering `Telemetry.Metrics` definitions (VM, Phoenix, Ecto repo, `ash.*` action/query metrics) with a Prometheus reporter and `telemetry_poller` periodic gauges, mirroring the serviceradar web-ng `telemetry.ex` pattern.
- **Log correlation without secrets**: request_id, room key, revision and epoch ride Logger metadata on correlated events; a scrubber deny-list guarantees session tokens, guest credentials, TURN secrets and private message contents are never logged, with tests enforcing it.
- **Protocol-aware load client**: a headless client that joins rooms over the real transports, consumes frames, applies backpressure, and sends durable commands with real `{request_id, expected_revision}` envelopes — covering both LiveView and Channels connections.
- **Load scenario matrix**: 1,000 sessions / 20 rooms steady soak after a gradual ramp; hot rooms at 50/100/200 occupants; an idle-heavy mix; catalog uploads during gameplay; concurrent market contention; a reconnect storm; a DB outage fail-closed check; and a slow receiver.
- **Failure-injection suite**: room-owner and gateway process crashes, DB unavailable and DB slow, duplicate command delivery, stale revision/epoch commands, network partition, outbox worker crash after commit, and deploy drain.
- **Security review pass**: a threat-model checklist covering impersonation, forged IDs, channel join authorization, SSRF on imports, torrent grant scope, replay, rate limiting, moderation basics, and TURN credential theft — each finding either fixed in this change or filed as a follow-up with a recorded disposition.
- **Honest reporting protocol**: every benchmark report in `docs/benchmarks/` records p50/p95/p99, hardware, software versions, payload sizes, and error definitions; targets are evaluated against measurements; missed targets produce filed regressions. The 10,000-session benchmark is explicitly out of scope until the 1,000-session profile is understood.
- **No durable state**: observability and testing add no new tables, resources, or protocol messages; all instrumentation is additive and removable.

Depends on: `add-ash-gardens-economy-restoration` (P6) — the transactional authority group (wallets, inventory, market, orders, contracts, nodes, machines) must exist so market contention, dedup hits and zero-duplicated-effects can be measured against real durable mutations; the intervening phases (P2 transport, P3 rooms, P5 theater/catalog, P7 sidecars, P8 media, P9 distributed ownership) are its practical predecessors for the remaining surface.

## Capabilities

### New Capabilities

- `observability-loadtesting`: the measurement and hardening layer — runtime and durable-path metrics with a Prometheus exporter, media metrics conditional on the conferencing flag, secret-free log correlation, the protocol-aware load client and its scenario matrix, the failure-injection suite, honestly reported benchmarks under `docs/benchmarks/`, and the threat-model security review pass.

### Modified Capabilities

- (none — instrumentation is additive telemetry emitted by existing code paths; the load client and failure-injection harness are external tooling. No room, economy, theater, catalog, identity or conferencing requirement's observable behavior changes, and no new protocol messages are introduced.)

## Impact

- **New files (server_elixir)**: `lib/afterlight/telemetry.ex` (supervisor: Prometheus reporter + pollers, serviceradar web-ng pattern), `lib/afterlight/telemetry/room_gauges.ex`, `lib/afterlight/telemetry/durable_gauges.ex`, `lib/afterlight/telemetry/media_metrics.ex`; `lib/afterlight/log_correlation.ex` (logger metadata plumbing) and a scrubber module; a `/metrics` endpoint (or plug) on the web endpoint, scrapeable on the private network.
- **New files (tooling/docs)**: `tools/load_client/` (protocol-aware load client: scenario configs, ramp/soak runner, report generator), `docs/benchmarks/` (committed measurement reports), `docs/security/p10-security-review.md` (threat-model checklist + dispositions), failure-injection test modules under `server_elixir/test/`.
- **Affected files**: `lib/afterlight/application.ex` (telemetry supervisor), room owner processes (emit tick duration, mailbox depth, movement drop/coalesce, join latency, reconnect events), gateway/channel code (connected sockets, command rejections), Repo/Ecto telemetry config (pool wait, query durations, retries/deadlocks), outbox and import workers (age/depth gauges), economy domain (contention events), logger/endpoint configuration. All emission points are `:telemetry.execute` calls or poller measurements — no behavior branches on metrics.
- **Client**: none required. The load client is a separate headless tool; the served Three.js client and `NetworkClient` contract are untouched.
- **Data model**: none — no new tables, columns or resources; metrics are in-memory/pull-based and reports are documentation.
- **Protocol changes**: none — the load client consumes the existing protocol (Channels framing and LiveView connections); no new message types, topics or envelope changes.
- **Security**: the review pass may produce small in-change fixes (e.g. a missing join authorization check, a rate-limit cap, a scrubber rule); anything larger is a filed follow-up with the disposition recorded. No new credentials or secrets are introduced by telemetry (the metrics endpoint binds to the private network).
- **Tests**: metric-presence tests (gauge/distribution appears and moves under load), scrubber deny-list tests, load scenario runs producing committed reports, failure-injection assertions (fail-closed durability, exactly-once economic effects, epoch fencing, drain bounds).
- **Docs**: `docs/benchmarks/` reports carry p50/p95/p99 + hardware + versions + payload sizes + error definitions; `runtime.md`'s measurement list becomes the traced checklist.
- **Rollback**: remove the telemetry supervisor, metrics endpoint and load tooling; there is no durable state, no protocol change and no client change to revert. Instrumentation is designed to be deletable without behavioral impact.

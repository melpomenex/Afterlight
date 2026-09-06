## 1. Telemetry foundation

- [ ] 1.1 Create `server_elixir/lib/afterlight/telemetry.ex` following the serviceradar web-ng pattern: supervisor with `TelemetryMetricsPrometheus.Core` reporter, fixed duration buckets (1–10,000 ms), and `telemetry_poller` periodic measurements; wire into `application.ex`; add the private-network `/metrics` endpoint (plug) and confirm it is unreachable from the public web path.
- [ ] 1.2 Register baseline metric sets: VM (memory, run queue lengths), Phoenix (endpoint, channel join/handle_in durations, socket drain), Ecto repo query durations including `queue_time` (pool wait), and `ash.action.stop.*` / `ash.query.stop.*` with domain/resource/action tags.
- [ ] 1.3 Create `telemetry/room_gauges.ex`: connected sockets, room sizes, per-room mailbox depth, room tick duration, dropped and coalesced movement, join latency, reconnect counts — emitted from room owners and the gateway via `:telemetry.execute`/pollers, with the bounded-cardinality aggregation rule for per-room tags.
- [ ] 1.4 Create `telemetry/durable_gauges.ex`: transaction duration, retries, deadlocks, market contention events, outbox age, import queue depth, durable command rejections by reason (overload, stale revision, stale epoch, validation), and dedup hits — emitted from the envelope handler, market path, outbox worker and import pool.
- [ ] 1.5 Create `telemetry/media_metrics.ex` gated on the P8 conferencing flag: per-call/per-track bitrate, loss, RTT, jitter, retransmissions, worker memory — absent without breaking the exporter when the flag is off.
- [ ] 1.6 Add a telemetry disable switch and measure instrumentation overhead once; record the number in the benchmark runbook.
- [ ] 1.7 Metric-presence tests: gauges/distributions appear and move under a scripted mini-load; the disabled state hides only its own group.

## 2. Log correlation and scrubbing

- [ ] 2.1 Add `log_correlation.ex`: attach request_id, room key, revision and epoch as Logger metadata at the channel/envelope boundary; ensure correlated lines render the fields in every environment's formatter.
- [ ] 2.2 Implement the formatter-level scrubber with a deny-list (session tokens, signed guest credentials, TURN secrets, private message bodies); adversarial fixture tests assert none of them appear at any log level; document that room keys and revisions are the correlation surface, never payloads.

## 3. Protocol-aware load client

- [ ] 3.1 Build `tools/load_client/`: headless Node client speaking Phoenix Channels (join rooms, consume 10 Hz frames, apply real backpressure, send durable commands with unique request_ids and tracked expected_revisions, handle retry/reject responses) and LiveView connections; reuse `shared/protocol.js` message semantics so the tool cannot drift from the real protocol.
- [ ] 3.2 Implement the scenario runner and configs: gradual ramp, steady soak, hot rooms (50/100/200), idle-heavy mix, catalog uploads during gameplay, concurrent market contention, coordinated reconnect storm with jitter, DB outage check, and slow receiver; each with recorded parameters and stop conditions in a runbook.
- [ ] 3.3 Implement the report generator: per-scenario p50/p95/p99 for named latencies, hardware, software versions, measured frame/snapshot payload sizes, and error definitions (rejection, drop, timeout) emitted as a `docs/benchmarks/` document.

## 4. Measurement runs and benchmark reports

- [ ] 4.1 Run the 1,000 sessions / 20 rooms scenario: gradual ramp into a one-hour steady soak with representative durable commands; capture tick durations, durable ack latencies, mailbox depths, memory, and error counts; commit the report to `docs/benchmarks/`.
- [ ] 4.2 Run the hot-room scenarios (50/100/200 occupants) and the idle-heavy mix; capture fanout payload sizes and per-room gauges; commit reports.
- [ ] 4.3 Run catalog uploads during gameplay and concurrent market contention; capture import queue depth, contention events, and fill latencies; commit reports.
- [ ] 4.4 Run the reconnect storm; capture join latencies, reconnect counts, and session-count stability (no second logical sessions); commit the report.
- [ ] 4.5 Run the DB outage fail-closed check and the slow-receiver scenario; capture fail-closed rejection counts and server memory behavior under backpressure; commit reports.
- [ ] 4.6 Evaluate the acceptance targets in the reports with measured numbers: p99 room tick < 50 ms at 10 Hz; p95 same-region durable ack < 250 ms; no monotonic mailbox/memory growth over the soak; zero duplicated economic effects — file a regression issue for every miss and reference it from the report.

## 5. Failure-injection suite

- [ ] 5.1 Implement deterministic injection scripts with pre/post invariant assertions: room-owner crash (rebuild from durable state, no ghost membership) and gateway crash (reconnect without a second logical session).
- [ ] 5.2 Implement DB unavailable (durable actions fail closed with retryable responses; movement continues only while room ownership is valid) and DB slow (pool wait climbs; overload rejections precede execution; no silent economic drops).
- [ ] 5.3 Implement duplicate command delivery (exactly one effect via dedup receipts) and stale revision/epoch delivery (rejected, fresh snapshot offered, older-epoch messages discarded).
- [ ] 5.4 Implement network partition of a room owner from the database (partitioned owner stops accepting durable mutations per lease/epoch fencing) and outbox worker crash after commit (at-least-once delivery resumes; outbox age gauge exposes the backlog).
- [ ] 5.5 Implement deploy drain injection (bounded drain time, new allocations rejected, clients rejoin with jitter) and assert zero duplicated economic effects across every injection run; keep the suite runnable separately from the default test path.

## 6. Security review pass

- [ ] 6.1 Write `docs/security/p10-security-review.md` with the fixed threat-model checklist: impersonation, forged client-supplied IDs, channel join authorization on every topic, SSRF on playlist/EPG URL imports, torrent grant scope, replay handling, rate limiting, moderation basics, TURN credential theft, and metrics-endpoint exposure.
- [ ] 6.2 Execute the review: for each item record what was checked, evidence (test or inspection), and a disposition — fixed in this change or filed follow-up with severity.
- [ ] 6.3 Land small in-change fixes with accompanying regression tests (e.g., a missing join authorization check, a rate-limit cap, a scrubber rule); file structural findings as referenced follow-ups without silent partial fixes.

## 7. Acceptance and honesty gate

- [ ] 7.1 Assemble the P10 gate evidence: the 1,000-session profile measured with the p99 tick < 50 ms target evaluated honestly, all scenario reports committed under `docs/benchmarks/`, failure-injection results recorded, and regressions filed for every missed target.
- [ ] 7.2 Enforce the no-claim-without-measurement rule across docs: any performance statement without a `docs/benchmarks/` pointer is removed or backed before merge; projections beyond the measured profile are labeled as projections.
- [ ] 7.3 Record the scope bound: 10,000-session benchmark deferred until the 1,000-session profile is understood; note the autoscale signals found (room lag/mailboxes, media bandwidth) as findings for future automation work.

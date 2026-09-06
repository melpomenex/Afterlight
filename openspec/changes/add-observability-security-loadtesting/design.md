# Design — Observability, Security Review & Load Testing (P10)

## Context

`runtime.md` §Operations and security fixes the obligation list and the log rule: measure connection counts, room sizes, process memory, mailbox depth, scheduler utilization, tick lag, dropped/coalesced movement, join latency, DB pool waits, transaction retries, outbox age and import queue depth — correlating request/room IDs without logging tokens or private messages. `migration.md` turns these into acceptance targets: 1,000 sessions / 20 rooms, one-hour steady soak after a gradual ramp; 50/100/200 hot rooms; idle-heavy mix; p99 room tick < 50 ms at 10 Hz; p95 same-region durable-command ack < 250 ms; no monotonic queue/memory growth; zero duplicated economic effects across retry/disconnect/failover; and "use protocol-aware load clients that actually join rooms, receive frames and apply backpressure", capturing p50/p95/p99, hardware, versions, payload sizes and error definitions with every report. The ownership phase map (P10) states the gate plainly: "1k-session profile measured; p99 tick < 50 ms target evaluated honestly".

The repo already contains the exporter pattern to follow: `serviceradar/elixir/web-ng/lib/serviceradar_web_ng_web/telemetry.ex` supervises a `TelemetryMetricsPrometheus.Core` reporter plus `telemetry_poller` periodic measurements, uses fixed duration buckets (1 ms → 10 s), and registers Phoenix, Ecto repo (`queue_time` = pool wait), `ash.action.*`/`ash.query.*` and VM metrics. That is compatibility evidence for the shape, not a copy-paste mandate.

By P10 the substrate exists: room owners with bounded mailboxes and monotonic revisions (P3), lease/epoch fencing (P9), the durable command envelope with dedup receipts and an outbox (P4 infrastructure, exercised from P5/P6), the import worker pool (P5), authenticated sidecars with scoped grants (P7), and optional conferencing with its own worker metrics (P8). The capacity model in `migration.md` is explicitly assumptions-not-benchmarks; this change is where it gets calibrated with numbers.

## Goals / Non-Goals

**Goals**

- Export every measurement on the runtime.md obligation list (plus reconnect counts, deadlocks, market contention, command rejections, dedup hits) through a Prometheus endpoint.
- Keep logs correlatable and secret-free: request_id + room key + revision + epoch in metadata, tokens and private message contents never logged.
- Build a load client that exercises the real protocol — joins, frames, backpressure, durable commands — on both LiveView and Channels connections.
- Run the fixed scenario matrix and failure-injection suite; commit measured reports to `docs/benchmarks/`.
- Evaluate the stated targets honestly: unmet targets produce filed regressions, not softened definitions.
- Complete a threat-model-driven security review pass with a recorded disposition (fixed here or follow-up) for every finding.

**Non-Goals**

- No 10,000-session benchmark: expand to 10k synthetic sessions only after the 1,000-session baseline is understood (`migration.md` P4 gate); the brag benchmark is explicitly deferred.
- No new durable schema, tables, or resources; no protocol changes; no client changes.
- No Grafana dashboards-as-code or alert-routing deliverable: the Prometheus endpoint plus committed reports are the deliverable; dashboards are consumer-side.
- No autoscaler implementation: autoscale signals (room lag/mailboxes, media bandwidth — not CPU alone) are documented as findings; automation is future work.
- No APM/SaaS tracing vendor integration; correlation is Logger metadata, not a tracing platform.
- No client-GPU certification: the playable-frame-rate-at-50-avatars target is verified in browser integration runs, not synthesized by the load client (backend throughput cannot fix a saturated client GPU).
- No new conferencing behavior: media metrics only re-export what P8's worker already emits.

## Decisions

### D1 — `:telemetry` + Telemetry.Metrics + Prometheus reporter, serviceradar web-ng pattern
*Decision:* An `Afterlight.Telemetry` supervisor registers metric definitions (VM, Phoenix endpoint/channel, Ecto repo query durations including `queue_time`, `ash.action.stop.*`/`ash.query.stop.*` with domain/resource/action tags, and Afterlight-specific events) against a `TelemetryMetricsPrometheus.Core` reporter, with `telemetry_poller` processes for periodic gauges and fixed duration buckets matching the reference (1/5/10/25/50/100/250/500/1000/2500/5000/10000 ms). The `/metrics` endpoint binds to the private network alongside the app.
*Alternative Considered:* a vendor APM agent or hand-rolled statsd. Rejected: the serviceradar pattern is in-repo compatibility evidence, dependency-light, and the deployment already assumes a Prometheus-style scraper; `runtime.md` asks for measurement, not a tracing platform.

### D2 — Bounded-cardinality gauges via pollers, not per-event storms
*Decision:* Per-room gauges (mailbox depth, tick duration, room size) are emitted as dedicated telemetry events with a room-key tag, collected by a poller from the room registry with the room count bounded; beyond a configured room-count threshold the exporter aggregates (sum/max + top-K) rather than growing tag cardinality unboundedly. Heavy histograms come from telemetry events already flowing (tick stop, command ack); gauges are polled, never pushed per frame.
*Alternative Considered:* a tag per room with unbounded Prometheus series. Rejected: cardinality explosion on a long-running server is the classic self-inflicted outage; the aggregation rule keeps the endpoint safe at any room count.

### D3 — Log correlation via Logger metadata with a deny-scrubber
*Decision:* Request ID, room key, revision and epoch are attached as Logger metadata at the channel/envelope boundary and rendered in every correlated log line. A formatter-level scrubber enforces a deny-list — session tokens, signed credentials, TURN secrets, private/DM message bodies — and its rules are unit-tested with adversarial fixtures (a token-shaped string, a chat payload) asserted absent from output. Room events log keys and revisions, never payloads of private messages.
*Alternative Considered:* relying on developer discipline ("don't log that"). Rejected: the rule in runtime.md is absolute; only a tested scrubber makes it hold under deadline pressure.

### D4 — Protocol-aware load client as a separate Node tool
*Decision:* `tools/load_client/` is a headless Node tool speaking the real wire: Phoenix Channels connections (join room topics, receive 10 Hz frames, apply backpressure by acknowledging/consuming at bounded rate, send durable commands with unique request_ids and tracked expected_revisions) and LiveView connections for the LiveView-inclusive counts that migration.md requires. Message semantics are reused from the `shared/protocol.js` definitions so the client cannot drift into testing a fantasy protocol. It applies backpressure honestly — a slow scenario genuinely stops reading rather than pretending.
*Alternative Considered:* HTTP-level load tools (wrk/vegeta) or an Elixir load app. Rejected: HTTP benching never touches room fanout, the command envelope, or reconnect semantics; the Node choice keeps protocol definitions single-sourced from `shared/` where the client's own tests live.

### D5 — Fixed scenario matrix with a written runbook
*Decision:* The matrix is fixed and scripted: (1) 1,000 sessions / 20 rooms, gradual ramp into a one-hour steady soak with representative commands; (2) hot rooms at 50/100/200 occupants; (3) idle-heavy mix (mostly idle connections, sparse movers); (4) catalog uploads during gameplay; (5) concurrent market contention (many actors bidding on the same items); (6) reconnect storm (coordinated mass reconnect with jitter); (7) DB outage fail-closed check; (8) slow receiver. Each scenario's parameters, environment, and stop conditions live in a runbook so reruns are comparable.
*Alternative Considered:* ad-hoc benchmarking per curiosity. Rejected: unrepeatable runs produce untrustworthy trends; the migration targets name these exact scenarios.

### D6 — Failure injection as a deterministic suite
*Decision:* Scripted injections, each with pre-stated invariants: kill a room owner (room rebuilds from durable state, no ghost membership); kill a gateway node (sessions reconnect, no second logical session); make the DB unavailable (durable actions fail closed with retryable responses, ephemeral movement continues only while valid room ownership is retained) and slow it (pool wait climbs, overload rejections precede execution, no silent drops of economic commands); deliver duplicate commands (dedup receipts make effects exactly-once); send stale revision/epoch commands (rejected, fresh snapshot offered); partition the room owner from the DB (partitioned owner stops accepting durable commands per P9 fencing); crash the outbox worker after commit (delivery still at-least-once, age gauge exposes the backlog); and run a deploy drain (bounded drain time, no new allocations, clients rejoin with jitter). Every run asserts zero duplicated economic effects.
*Alternative Considered:* chaos-style random fault injection. Rejected: the acceptance targets demand specific, reproducible invariants; randomized chaos is a later luxury.

### D7 — Honesty protocol for reports
*Decision:* Every report committed to `docs/benchmarks/` records: scenario and parameters; p50/p95/p99 for each named latency; hardware (CPU/RAM/network); software versions (OTP, Elixir, Phoenix, Ash, PostgreSQL, Node, browser where relevant); measured payload sizes (frame bytes, snapshot bytes); and error definitions (what counts as a rejection, a drop, a timeout). Targets are restated in the report as evaluated pass/fail with the measured numbers beside them. A missed target files a regression issue referenced from the report; no target may be claimed in any doc without a pointer to a measurement.
*Alternative Considered:* reporting only favorable summaries in prose. Rejected: the phase gate is "evaluated honestly"; the protocol exists so numbers can't be negotiated after the fact.

### D8 — Media metrics group gated on the conferencing flag
*Decision:* Media metrics (per-call/per-track bitrate, loss, RTT, jitter, retransmissions, worker memory) are registered as a metric group included when the P8 flag is enabled, sourced from the worker metrics P8 already emits; with conferencing off the group is simply absent and the rest of the exporter is unaffected. Media egress saturation joins the load matrix only when the group exists.
*Alternative Considered:* unconditional registration with zero-value media series. Rejected: zero-filled conference metrics read as "no calls, all healthy" and mask scrape breakage; absence is the honest signal.

### D9 — Security review as a bounded checklist with dispositions
*Decision:* `docs/security/p10-security-review.md` walks the fixed threat list — impersonation (session/credential theft, guest token forgery), forged IDs (client-supplied player/room/order IDs used as authorization), channel join authorization on every topic, SSRF on playlist/EPG URL imports (private-address/redirect/size policy), torrent grant scope (sidecar grant bypass), replay (request_id/revision/epoch handling), rate limiting (command floods, upload floods), moderation basics (removal actually removes), TURN credential theft — with, per item: what was checked, evidence (test or inspection), and a disposition: fixed in this change or filed follow-up. Fixes in-change are limited to small, behavior-preserving hardening; structural findings become follow-ups.
*Alternative Considered:* an open-ended penetration-testing phase. Rejected: P10 is a hardening pass inside a migration phase; a bounded checklist with recorded dispositions is auditable and completable.

## Risks / Trade-offs

- *[Load client diverges from the real client's behavior]* → protocol definitions reused from `shared/protocol.js`, both transports included, backpressure implemented for real; scenario reports compare captured frame sizes against live traffic captures to catch drift.
- *[Metrics overhead distorts the thing being measured]* → gauges polled on poller cadence rather than per event; bounded tags (D2); a config switch disables telemetry entirely to measure its cost; the report discloses whether instrumentation was active.
- *[Soak environment differs from production hardware]* → the honesty protocol (D7) forces hardware/versions into every report; targets are explicitly calibration targets per migration.md, and unmet targets are filed, not explained away.
- *[Failure injection is flaky or ordering-sensitive]* → deterministic scripts with pre/post invariant assertions, kept separate from the default test path so CI stays green without the harness.
- *[Security review finds structural problems late]* → bounded dispositions keep P10 shippable: small fixes land, structural findings are filed with severity and referenced by the report rather than half-fixed silently.
- *[Metrics endpoint exposure]* → private-network bind and no auth-on-public-path by construction; the security checklist includes the endpoint itself.
- *[Benchmark reports rot]* → reports are dated artifacts with environment recorded; re-running is a runbook task, not archaeology.

## Migration Plan

Land the telemetry supervisor and exporter first (useful even while later phases bed in), then log correlation and the scrubber. Build the load client and validate it against a single room before scaling the scenario matrix. Execute scenarios in order — steady soak first, then hot rooms, idle mix, uploads, market contention, reconnect storm, DB outage, slow receiver — committing a report per scenario to `docs/benchmarks/`. Run the failure-injection suite against the P9-enabled topology. Complete the security review checklist with dispositions. The phase gate is met when the 1,000-session profile is measured and the p99 tick target is evaluated honestly with regressions filed for misses. Rollback is trivial by construction: remove the supervisor, endpoint and tooling — there is no durable state, protocol surface, or client behavior to revert, and P11's authority retirement does not depend on any of this code remaining.

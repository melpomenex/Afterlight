# observability-loadtesting

## Purpose

Define the measurement and hardening layer for the migrated backend: Prometheus-style metrics over the room runtime, durable path and (when enabled) conferencing media; secret-free log correlation; a protocol-aware load client and its fixed scenario matrix; a failure-injection suite proving durability and fencing invariants; honestly reported benchmarks committed under `docs/benchmarks/`; and a threat-model-driven security review pass with recorded dispositions.

## ADDED Requirements

### Requirement: Room runtime metrics

The system SHALL export metrics for connected socket counts, room sizes, per-room mailbox depth, room tick duration, dropped and coalesced movement counts, room join latency, and reconnect counts. Per-room gauges SHALL use bounded tag cardinality, aggregating beyond a configured room threshold rather than growing unbounded series.

#### Scenario: Gauges move under load

- **WHEN** the load client fills twenty rooms with sessions and movement traffic
- **THEN** the connected-sockets, room-size, mailbox-depth and tick-duration metrics reflect the traffic and are scrapeable from the metrics endpoint

#### Scenario: Cardinality stays bounded

- **WHEN** the number of active rooms exceeds the configured per-room gauge threshold
- **THEN** per-room series are aggregated (sum/max/top-K) and the exporter's series count does not grow without bound

### Requirement: VM and process metrics

The system SHALL export scheduler utilization (run queue lengths) and process memory metrics for the BEAM, plus process-level memory for the room runtime, so saturation is distinguishable from leakage.

#### Scenario: Scheduler saturation is visible

- **WHEN** a hot-room scenario saturates the schedulers
- **THEN** scheduler utilization and memory gauges show the saturation alongside room tick durations

### Requirement: Durable-path metrics

The system SHALL export database pool wait time, transaction duration, transaction retries and deadlocks, market contention events, outbox age, import queue depth, durable command rejections, and dedup hits. Command rejections SHALL be distinguishable by reason (overload, stale revision, stale epoch, validation).

#### Scenario: Pool pressure is observable

- **WHEN** the DB-slow scenario inflates pool waits
- **THEN** the pool wait and transaction duration distributions show the inflation and retry/deadlock counters move

#### Scenario: Outbox backlog is observable

- **WHEN** the outbox worker is crashed after a commit
- **THEN** the outbox age gauge exposes the growing backlog until delivery resumes

### Requirement: Media metrics when conferencing is enabled

When the conferencing feature (P8) is enabled, the exporter SHALL include media metrics — per-call and per-track bitrate, packet loss, RTT, jitter, retransmissions, and media worker memory — sourced from the media worker's own emission. When conferencing is disabled, the media metric group SHALL be absent without breaking the rest of the exporter.

#### Scenario: Media group appears with the flag

- **WHEN** a conferencing-enabled deployment carries active call traffic
- **THEN** bitrate, loss, RTT, jitter, retransmission and worker memory series are present and move with the traffic

#### Scenario: Disabled conferencing does not break the exporter

- **WHEN** the conferencing flag is off
- **THEN** the metrics endpoint serves all non-media metrics normally and contains no zero-filled fake media series

### Requirement: Prometheus-style exporter

Telemetry SHALL be exported in Prometheus exposition format via an `Afterlight.Telemetry` supervisor registering `Telemetry.Metrics` definitions (VM, Phoenix, Ecto repo query durations including pool wait, and `ash.*` action/query metrics with domain/resource/action tags) with a Prometheus reporter and `telemetry_poller` periodic gauges, following the serviceradar web-ng `telemetry.ex` pattern. The endpoint SHALL bind to the private network and SHALL NOT be exposed on the public web path.

#### Scenario: Ash actions are counted

- **WHEN** durable domain actions execute during any scenario
- **THEN** `ash.*` action duration distributions and counts appear tagged by domain, resource and action

#### Scenario: Endpoint is private

- **WHEN** the metrics endpoint is probed from the public web path
- **THEN** it is unreachable, while the private-network scrape succeeds

### Requirement: Log correlation without secrets

Correlated log lines SHALL carry request ID, room key, revision and epoch as structured metadata. A scrubber SHALL prevent session tokens, signed credentials, TURN secrets, and private message contents from appearing in logs at any level, and the scrubber rules SHALL be enforced by tests. Correlation SHALL rely on keys, revisions and epochs — never on message payloads of private communications.

#### Scenario: Correlated failure trail

- **WHEN** a durable command fails during a load scenario
- **THEN** the log lines for that command share the same request ID, room key, revision and epoch values, forming a traceable trail without any token in the output

#### Scenario: Scrubber holds under adversarial fixtures

- **WHEN** log events containing a session token, a TURN credential, or a private message body are emitted at any level
- **THEN** the rendered log output contains none of them, per the tested deny-list

### Requirement: Protocol-aware load client

A headless load client SHALL exercise the real protocol: it SHALL join rooms over Phoenix Channels and connect over LiveView, consume room frames, apply backpressure as a slow consumer genuinely would, and send durable commands carrying real `{request_id, expected_revision}` envelopes with retry tracking. Message semantics SHALL be reused from the shared protocol definitions so the client cannot test a divergent fantasy protocol. The served game client SHALL NOT be modified for load testing.

#### Scenario: Client exercises the real path

- **WHEN** the load client runs its baseline scenario against the deployment
- **THEN** rooms report real joined members, frames are delivered and consumed, durable commands receive acknowledged responses with revisions, and the server cannot distinguish the tool by any protocol shortcut

#### Scenario: Backpressure is real

- **WHEN** the slow-receiver scenario runs
- **THEN** the client stops consuming at its configured rate and the server responds per the documented overload rules (disconnect/resnapshot or bounded buffers), never growing memory without bound

### Requirement: Fixed load scenario matrix

The system SHALL provide scripted, repeatable scenarios for: 1,000 sessions across 20 rooms with representative commands in a one-hour steady soak after a gradual ramp; single hot rooms at 50, 100 and 200 occupants; an idle-heavy mix; catalog uploads during gameplay; concurrent market contention on shared items; a coordinated reconnect storm; a database outage fail-closed check; and a slow receiver. Scenario parameters and stop conditions SHALL be recorded in a runbook so reruns are comparable.

#### Scenario: Steady soak completes

- **WHEN** the 1,000-session / 20-room scenario runs with its ramp and one-hour soak
- **THEN** latency distributions, error counts and resource gauges are captured for the steady period and written to a benchmark report

#### Scenario: Hot room scales to the cap

- **WHEN** the 200-occupant hot-room scenario runs
- **THEN** tick durations, fanout payload sizes and per-room gauges are captured, including whether the room stays within its bounded mailbox budget

### Requirement: Failure-injection suite

A scripted failure-injection suite SHALL cover: room-owner process crash, gateway process crash, database unavailable, database slow, duplicate command delivery, stale revision and stale epoch commands, network partition isolating a room owner from the database, outbox worker crash after commit, and deploy drain. Each injection SHALL assert pre-stated invariants: durable actions fail closed under DB outage; duplicate commands produce exactly one effect; stale revision/epoch commands are rejected with a fresh snapshot offered; a partitioned owner stops accepting durable mutations; post-commit outbox crash still delivers at-least-once; drain is bounded and rejects new allocations. Every run SHALL assert zero duplicated economic effects.

#### Scenario: Database outage fails closed

- **WHEN** the database becomes unavailable during the soak
- **THEN** durable commands receive retryable failure responses before execution, no economic mutation is lost or half-applied, and ephemeral movement continues only while valid room ownership is retained

#### Scenario: Duplicate delivery has one effect

- **WHEN** the same durable command (actor, request_id, payload) is delivered twice by injection
- **THEN** its economic effect is applied exactly once and the duplicate returns the original outcome

#### Scenario: Stale epoch is fenced

- **WHEN** a command or message carrying a stale epoch arrives after ownership moved
- **THEN** it is rejected or discarded and the client is resnapshotted from the current owner

### Requirement: Honest benchmark reporting

Every benchmark report SHALL be committed under `docs/benchmarks/` and SHALL record p50/p95/p99 for named latencies, hardware (CPU/RAM/network), software versions, measured payload sizes, error definitions, and scenario parameters. Stated targets — p99 room tick < 50 ms at 10 Hz, p95 same-region durable-command acknowledgement < 250 ms, no monotonic mailbox/memory growth, zero duplicated economic effects — SHALL be evaluated against measurements in the report; a missed target SHALL produce a filed regression referenced from the report. No performance target SHALL be claimed in documentation without a pointer to a measurement.

#### Scenario: Targets evaluated with numbers

- **WHEN** the steady-soak report is written
- **THEN** each acceptance target is listed with its measured value and an explicit pass/fail, and any fail links to a filed regression

#### Scenario: Unmeasured claims rejected

- **WHEN** a documentation change asserts a performance characteristic without a committed measurement
- **THEN** the claim is removed or backed by a `docs/benchmarks/` report before merge

### Requirement: Security review pass with dispositions

A security review pass SHALL walk a fixed threat-model checklist covering impersonation, forged client-supplied IDs, channel join authorization on every topic, SSRF on playlist/EPG URL imports, torrent grant scope, replay handling, rate limiting, moderation basics, and TURN credential theft. Each checklist item SHALL record what was checked, the evidence, and a disposition: fixed in this change (small, behavior-preserving hardening) or filed as a referenced follow-up. The review SHALL include the metrics endpoint's exposure.

#### Scenario: Checklist completed with dispositions

- **WHEN** the security review pass concludes
- **THEN** every threat-model item has a recorded disposition and any in-change fix has an accompanying test or referenced follow-up

#### Scenario: Found authorization gap is dispositioned

- **WHEN** the review finds a topic join missing an authorization check
- **THEN** the gap is either fixed with a regression test in this change or filed as a follow-up with severity, and the disposition appears in the review document

### Requirement: Scope bound at one thousand sessions

The load program SHALL expand to 10,000 synthetic sessions only after the 1,000-session profile is measured and understood. The 10,000-session benchmark SHALL remain out of scope for this change, and any scaling claims beyond the measured 1,000-session profile SHALL be labeled as projections, not measurements.

#### Scenario: Ten-thousand session run deferred

- **WHEN** the 1,000-session reports are incomplete or show unfiled regressions
- **THEN** no 10,000-session benchmark is executed as part of this change and no scaling claim beyond the measured profile is presented as measured

# Migration and capacity gates

## Incremental rollout

### 0. Baseline and parity fixtures

Record a pinned repository revision and representative clean save fixtures, never production credentials. Exercise two-client travel/reconnect, gardens, market fills, restoration, chat/IRC, theater transport, playlist import, IPTV/EPG and torrent selection. Measure current room broadcast bytes, memory, event-loop lag and save latency. Export pure-JS reducer examples to language-neutral JSON with explicit clocks, random seeds, rounding and error outcomes. Elixir must reproduce these before taking ownership.

Exit: inventory of protocol messages and persistence fields, repeatable fixture runner and baseline measurements. No performance claims before this gate.

### 1. Phoenix shell and transport

Host the existing client with a LiveView hook; introduce signed guest identity and a Channels adapter. Route commands for unmigrated domains to Node over a private authenticated boundary. The gateway must not accidentally create a second world session during reconnect. First move transient room presence/movement, then chat, retaining desiredRoom semantics and theater spawn.

Exit: real browser checks for travel, seated/airborne/emote states, focus clearing, camera, overlay, reconnect and teardown. Two clients see equivalent state; load test bounded rooms and slow receivers. Keep old client/server release selectable for pre-cutover cohorts.

### 2. Durable domains

Port theater control first, then catalog imports, then the garden/economy/restoration transaction group. Inventory is shared across harvesting, crafting, contributions and market fills: those mutations must share one authority. A staged UI rollout does not permit split ownership of the same balance.

For each domain: disable writes briefly; snapshot JSON/catalog files with hashes; import idempotently into a staging schema; validate row counts, totals, reservations, queue picks, IDs and timestamps; switch routing; enable the new writer. Preserve originals as read-only backups. Port offline growth only after fixture parity across weather and restart boundaries. Browser exploration imports preserve existing progress, filter unknown IDs and cannot grant communal rewards.

Exit: no duplicate rewards under retry, conservation of balances/inventory plus explicit fees, restart recovery, and successful restore rehearsal. Node and Phoenix never dual-write one domain. After new PostgreSQL writes, flipping traffic back to old JSON loses progress; rollback requires a verified reverse export under a write freeze or restore plus replay of acknowledged mutations. Prefer forward fixes after cutover.

### 3. Conferencing experiment

Run the bounded Membrane spike independently. Release voice to a small opt-in cohort before cameras, screen sharing or recording. Test TURN-only and mobile/network transitions, permissions denied, muted joins, revoked grants and worker loss.

Exit: chosen maintained/owned SFU implementation, pinned compatibility matrix, measured per-call CPU/memory/egress and recovery behavior. If the gate fails, continue the game migration with conferencing disabled.

### 4. Distributed operation

Add room lease/epoch fencing, two or more gateway instances and separately scalable room workers when single-node evidence calls for it. Prove node kill, network partition, DB outage, reconnect storms and rolling drain. Expand to 10,000 synthetic sessions only after a 1,000-session baseline. Add multiple regions later with room home-region affinity; a globally consistent market remains a single-region authority until a distinct economic partition model is designed.

## Capacity model: assumptions, not benchmarks

Game scenario: 1,000 sessions / 50 players per room = 20 rooms. At 10 snapshots/second and an assumed 100 bytes per avatar, whole-room fanout is approximately `20 × 50 × 50 × 10 × 100 = 50,000,000 bytes/second`, about 400 Mbit/s server egress before protocol/TLS overhead. At 10,000 sessions with the same room cap, that becomes about 4 Gbit/s. Actual JSON sizes and active-room fractions must be measured. Deltas and interest management reduce work; room-level isolation alone does not eliminate quadratic within-room fanout.

Conference scenario: eight camera publishers at assumed 1.2 Mbit/s each imply roughly 9.6 Mbit/s SFU ingress and `8 × 7 × 1.2 = 67.2 Mbit/s` egress for all-to-all forwarding, excluding audio, overhead and retransmissions. Each receiver downloads about 8.4 Mbit/s. Limiting each receiver to four camera subscriptions reduces SFU egress to about 38.4 Mbit/s. TURN adds relay traffic/cost on a separate hop. Simulcast adds publisher ingress even when it lowers selected subscriber quality. These examples explain why call capacity and game socket capacity need separate budgets.

## Proposed acceptance targets

Treat these as initial engineering targets to calibrate with deployment RTT and hardware:

- 1,000 game sessions, 20 rooms, representative commands, one-hour steady soak after a gradual ramp. Also test 50/100/200 occupants in one hot room and an idle-heavy workload.
- At 10 Hz, p99 room tick processing below 50 ms; p95 same-region durable-command acknowledgement below 250 ms under the chosen network profile; no monotonic queue/memory growth.
- Zero duplicated economic effects across retry/disconnect/failover scenarios. Every acknowledged durable command recoverable under the tested database failure model. Database disaster RPO/RTO depend on the chosen replication/backup policy and must be measured separately.
- Eight-person camera plus screen share, 30-minute soak, TURN-only variant, 100 ms RTT and 2% packet-loss variant. Initial join target p95 under 5 s and interruption recovery target under 10 s; measure rather than claim attainment.
- Preserve playable browser frame rate at 50 visible avatars on declared reference hardware. Count rendering and decoding together; backend throughput cannot fix a saturated client GPU.

Use protocol-aware load clients that actually join rooms, receive frames and apply backpressure. Include both LiveView and Channels connections, catalog uploads during gameplay, concurrent market contention and media egress saturation. Capture p50/p95/p99, hardware, versions, payload sizes and error definitions with every report. Autoscale on room lag/mailboxes and media bandwidth, not CPU alone.

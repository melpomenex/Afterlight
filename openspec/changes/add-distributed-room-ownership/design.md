# Design — Distributed room ownership (leases, epochs, fencing)

## Context

`runtime.md` §Room authority and partitioning already specifies the target mechanics: identify a room by `{region, district_id, instance_id}`; initially one node owns every room; for multi-node operation introduce a PostgreSQL-lease directory — room key, owner node, epoch, expiry — with atomic epoch-incrementing acquisition, database-time renewal, in-transaction epoch checks for durable mutations, fail-closed partitioned owners, gateways that stop routing to expired owners, successor snapshots carrying a new epoch that clients enforce by discarding older-epoch messages, and recovery that rebuilds from durable state with entrances rather than promising seamless migration. `migration.md` §4 gates the whole step on single-node evidence: leases and multi-node operation land "when single-node evidence calls for it", and P10 produces that evidence plus the load/soak/failure suites used to prove the fencing.

The primitives that will NOT help are named in the same section: Presence, PubSub, and a local Registry provide transient delivery and per-node process lookup — none of them constitutes distributed single-writer consensus. Also fixed by prior phases: durable commands already carry `{protocol_version, request_id, expected_revision, payload}` and responses already include `epoch` in the envelope, so fencing extends an existing contract rather than inventing a new wire concept. The serviceradar Elixir reference clusters with libcluster (~> 3.4) plus Horde; it is evidence that the library family works, and its operations (and any manual `Node.start`/docker-DNS shortcuts) are explicitly not a template.

## Goals / Non-Goals

**Goals**

- One owner per room key at every instant, enforced by PostgreSQL leases with epochs — verifiable in the database, not by node opinion.
- Durable room mutations are safe under partition: no mutation commits without the current epoch and an unexpired lease checked inside its transaction.
- Partition behavior is fail-closed for durability and precisely scoped for transience: movement continues only while valid ownership is retained.
- Failover is honest: rebuild from durable state + entrances, new epoch on successor snapshots, clients discard stale-epoch messages, no seamless-migration promise.
- Deploys and failovers are bounded: drain with a deadline, new allocations rejected on draining nodes, jittered client rejoin.
- The measured gate is enforced in-process: no second node runs room owners until P10 evidence justifies it.

**Non-Goals**

- No global GenServer owning all rooms; no cross-node room process migration; rooms stay per-instance GenServers under DynamicSupervisor.
- No cross-region market or globally consistent economy — single-region economic authority until a distinct economic partition model is designed.
- No new consensus middleware (no Raft/etd external coordinators); PostgreSQL is the fence.
- No movement/position rows in PostgreSQL; Presence keeps carrying coarse membership only.
- No change to player-visible gameplay semantics beyond epoch-driven discard and the visible effects of instance switching during failover.
- No implementation at all until the measured precondition passes (the gate may legitimately park this change).

## Decisions

### D1 — PostgreSQL `room_leases` is the single-writer fence; database time, node clocks never
*Decision:* One row per room key: `room_key` (unique, `{region, district_id, instance_id}`), `owner_node`, `epoch` (bigint, monotonic per room), `expires_at`/`renewed_at` (set with database time). Acquisition is one atomic statement — insert, or on expired/conflicting lease take over with `epoch = leases.epoch + 1` — so concurrent claimants yield exactly one winner and every takeover is observable as an epoch bump. Renewal compares owner AND epoch and uses `now()` from the database; a node's wall clock never decides ownership. Successors acquire with jittered backoff to avoid a thundering herd on expiry. The cadence is numerically bounded, not vibes: maximum lease TTL 15 seconds, maximum renewal interval 5 seconds (well under the TTL, jittered), and maximum failure-detection latency 10 seconds. The window in which two nodes can each believe they own the same room is therefore bounded by (renewal interval + failure-detection timeout) — at most 15 seconds at these maxima — and the failover-soak tests assert that bound.
*Alternative Considered:* distributed lock service (Redis/Horde/consensus toy). Rejected: a second coordination system to operate and trust; PostgreSQL is already the durability authority, is already a fail-closed dependency for durable commands, and its transactions give exactly the check-and-commit atomicity fencing needs.

### D2 — Every durable room mutation checks the lease inside its own transaction
*Decision:* The transaction that commits a durable room mutation also reads `room_leases` for the room key and requires `owner_node = self`, `epoch = my_epoch`, and `expires_at > now()` — aborting the mutation otherwise. Lease renewal is likewise a guarded conditional update; a failed renewal (or a DB outage making renewal impossible) transitions the owner to a fenced state.
*Alternative Considered:* checking the lease in the owner process before starting the transaction (cheaper, one fewer read). Rejected: it leaves a TOCTOU window in which ownership is lost between the check and the commit; the runtime contract requires the check in the transaction.

### D3 — Fail closed on durability; movement only while ownership is valid
*Decision:* A fenced owner stops accepting durable mutations immediately — commands get a retryable rejection pointing clients at resnapshot — and its transient movement relay may continue only per lease rules: while the lease is still valid (e.g., brief DB flaps), movement flows; the moment the lease is expired or unrenewable, the owner stops even movement and directs clients to reconnect to a routable owner. Gateways consult a short-TTL directory (backed by `room_leases`, directory TTL 5 seconds so gateway detection of an expired owner stays inside the failure-detection bound of D1) and stop routing room messages to expired owners; they route to the lease holder or trigger successor acquisition.
*Alternative Considered:* letting a partitioned owner keep serving reads/movement "best effort" after expiry. Rejected: a zombie owner's answers would be plausible-looking lies; the entire value of the epoch fence is that losing it is unmistakable and immediate.

### D4 — Epochs reach clients; clients discard older-epoch messages
*Decision:* Snapshots and command responses carry the room's current epoch (the envelope already has the field). A client tracks the highest epoch it has seen per room and discards any message bearing a lower epoch, so in-flight output from a deposed owner (positions, theater states, receipts' echoes) cannot overwrite the successor's state. Reconnection after ownership change always lands on a fresh snapshot carrying the new epoch.
*Alternative Considered:* server-side only suppression (gateways dropping old-owner output). Rejected: it cannot cover messages already in flight to the client; the client-side discard rule closes that gap with one integer comparison.

### D5 — Recovery rebuilds from durable state and entrances; no seamless migration
*Decision:* On ownership loss the affected room is paused and rebuilt by a successor from durable state (Ash domains, theater bill/revision) plus safe entrance placement for transient positions. Anything process-local and unreplicated (exact positions, emote cooldowns) may reset; the instance switch is visible to users rather than disguised. No GenServer-state handoff exists between old and new owners.
*Alternative Considered:* process-state migration / hot handoff (e.g., serializing owner state to the successor). Rejected: `runtime.md` forbids promising seamless migration, and handoff of unreplicated state across a partition is precisely the untrustworthy path fencing exists to close.

### D6 — Cluster formation via libcluster/DNSCluster per environment
*Decision:* Node membership uses `libcluster` strategies chosen per environment — gossip/multicast for dev and VM deploys, DNS-based (DNSCluster/DNS-poll) for container deploys — with the Erlang cookie provisioned by secret management. Manual `Node.start` calls, cookies hardcoded in entrypoint scripts, and docker-DNS shell-script discovery are rejected patterns; the serviceradar reference (libcluster ~> 3.4) shows the library family in production but is not an operational template.
*Alternative Considered:* static `--name`/`--cookie` hand-configuration per host. Rejected: it is the manual hack this decision exists to prevent, and it breaks the moment topology changes.

### D7 — Bounded drain; parties pinned; jittered rejoin
*Decision:* Drain is explicit and deadline-bounded: a draining node takes no new room allocations, existing rooms get a bounded grace (lease-expiry-bounded) to finish, then leases lapse and successors take over with new epochs. Parties are pinned together (same room instance/node) so a failover moves a party as a unit, and any instance switch is visible to users. Clients rejoin after failover/drain with jitter to spread the reconnect load.
*Alternative Considered:* unbounded "finish current rooms" drain (correct-looking, but a stuck room blocks a deploy forever) and instant hard-cutover (synchronized reconnect storm). Rejected by the bounded-drain requirement in `runtime.md`.

### D8 — Presence/PubSub/Registry have no consensus role; market stays single-region
*Decision:* Stated as contract: Presence, PubSub, and a local Registry remain transient delivery and per-node lookup with no authority over ownership; the fence is exclusively `room_leases`. The market and all cross-room economic authority remain single-region; multi-region economics requires a separately designed partition model and is out of scope here.
*Alternative Considered:* deriving ownership hints from Presence (it already tracks membership). Rejected: Presence is per-node, lossy by design, and precisely the kind of signal that produces split brain.

## Risks / Trade-offs

- *[Lease table becomes a hot row per busy room]* → renewal cadence is a fraction of the TTL (jittered), renewal is one conditional UPDATE, and per-room rows do not contend with each other; measured under the failover soak before trusting at scale.
- *[Database outage now gates movement, not just durability]* → accepted and honest: durable actions already fail closed without the DB; the lease makes "no DB ⇒ no ownership" explicit instead of silently splitting. Transience without a DB degrades to disconnect-and-resnapshot, which reconnect already handles.
- *[Reconnect storm at failover]* → jittered client rejoin, bounded admission, and the P10 reconnect-storm suite; the soak task is the acceptance evidence, not an aspiration.
- *[Epoch tracking bugs on clients]* → the rule is one comparison (discard lower than newest seen); covered by the stale-epoch snapshot test; a missed epoch only risks a cosmetic stale frame, never a durable write (server fence is independent).
- *[Complexity bought before it is needed]* → that is the measured gate: until P10 evidence justifies multi-node, this change stays unimplemented and single-node remains the supported topology; the gate may park the change indefinitely.
- *[Clock skew between nodes]* → irrelevant to correctness because all expiry/renewal comparisons use database time (D1); node clocks affect only log ordering.

## Migration Plan

The gate first: record the P10 evidence artifact that justifies (or defers) multi-node operation; this change is implemented only if it passes. Then: add `room_leases` + `Afterlight.World.Lease` while still single-node (owner acquires/renews its leases; behavior is invisible), wire in-transaction lease checks into durable mutations and epoch into snapshots/responses, then add the second node behind the directory + libcluster, then prove partition injection, kill/takeover, stale-epoch discard, reconnect storm, and run the failover soak. Deploy drain ships with the second node. Rollback at any step: return to a single room node — leases with one owner are inert overhead, epochs remain valid (monotonic, single writer), no durable state changes shape, and client epoch-discard is harmless.

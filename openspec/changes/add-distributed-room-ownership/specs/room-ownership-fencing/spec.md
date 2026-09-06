# room-ownership-fencing

## Purpose

Define the distributed single-writer contract for room instances when Afterlight operates more than one node: room ownership is an explicit PostgreSQL-leased fact with monotonic epochs, every durable room mutation is fenced in-transaction, partitioned owners fail closed, clients discard stale-epoch messages, and recovery rebuilds from durable state rather than promising seamless migration. The capability also fixes what does NOT provide consensus (Presence/PubSub/Registry) and the measured precondition that must justify multi-node operation at all.

## ADDED Requirements

### Requirement: Measured precondition for multi-node operation

Multi-node room operation SHALL be implemented and enabled only after recorded load/observability evidence (P10) demonstrates that single-node operation is insufficient — for capacity, fanout, or availability reasons — and the evidence artifact SHALL be referenced by the implementing change. Absent that evidence, the system SHALL remain single-node with this capability's fencing unimplemented, and this gate SHALL NOT be waived.

#### Scenario: Evidence defers the change

- **WHEN** the P10 profile shows single-node operation meeting the accepted targets with headroom
- **THEN** multi-node room ownership is not enabled and single-node remains the supported topology
- **AND** the deferral decision is recorded against the evidence artifact

#### Scenario: Evidence justifies enablement

- **WHEN** the recorded evidence shows a ceiling or availability need a single node cannot meet
- **THEN** the fencing requirements below are implemented and proven under partition before a second node serves rooms

### Requirement: Lease acquisition with epoch fencing

Each room instance key (`{region, district_id, instance_id}`) SHALL have at most one owner at any instant, recorded in a `room_leases` table (room key, owner node, epoch, expiry). Acquisition SHALL be atomic and SHALL increment the epoch on takeover, so concurrent claimants for an expired or absent lease produce exactly one winner and every ownership change is observable as an epoch bump.

#### Scenario: Concurrent claimants yield one owner

- **WHEN** two nodes simultaneously attempt to acquire the lease of an expired room
- **THEN** exactly one acquisition succeeds with epoch = previous epoch + 1
- **AND** the loser observes the new lease and does not act as owner

### Requirement: Database-time renewal

Lease renewal SHALL compare owner node and epoch and SHALL use database time for all expiry decisions; node wall clocks SHALL never determine ownership. A renewal that fails — because the lease was taken over, the epoch differs, or the database is unreachable — SHALL fence the renewing owner.

#### Scenario: Renewal race loses cleanly

- **WHEN** a former owner's renewal arrives after a successor took the lease with a higher epoch
- **THEN** the renewal is rejected (owner/epoch mismatch)
- **AND** the former owner transitions to fenced and stops acting as owner

### Requirement: In-transaction lease checks on durable mutations

Every durable room mutation SHALL verify inside its own transaction that the current lease matches the writer's owner node and epoch and is unexpired; the mutation SHALL abort otherwise. Process-local checks made before the transaction SHALL NOT be treated as sufficient fencing.

#### Scenario: Stale owner cannot commit

- **WHEN** an owner whose lease has been taken over attempts to commit a durable room mutation
- **THEN** the in-transaction lease check fails and the mutation is aborted with no partial effects

#### Scenario: Valid owner commits normally

- **WHEN** the rightful, unexpired owner commits a durable room mutation
- **THEN** the lease check passes in the same transaction and the mutation commits

### Requirement: Fail-closed behavior on ownership loss

An owner that cannot renew its lease SHALL stop accepting durable mutations immediately (retryable rejection, fail closed). Transient movement MAY continue only while valid room ownership is retained; once the lease is expired or unrenewable, the owner SHALL stop relaying movement and direct clients to reconnect to a routable owner. Gateways SHALL stop routing room messages to owners with expired leases.

#### Scenario: Partitioned owner fails closed

- **WHEN** a network partition prevents the owner from renewing its leases
- **THEN** its durable mutations are rejected and, once the lease expires, movement stops
- **AND** no writes or movement from the partitioned owner reach clients after expiry

#### Scenario: Gateways reroute away from expired owners

- **WHEN** a gateway consults the directory for a room whose lease has expired
- **THEN** the expired owner is not routed to
- **AND** room messages go to the current lease holder or trigger successor acquisition

### Requirement: Epoch-enforced client discard

Room snapshots and command responses SHALL carry the room's current epoch. Clients SHALL track the newest epoch seen per room and SHALL discard messages bearing an older epoch, so output in flight from a deposed owner cannot overwrite successor state.

#### Scenario: Stale-epoch snapshot discarded

- **WHEN** a client receives a snapshot with an epoch lower than the newest it has seen for that room
- **THEN** the snapshot is discarded and the client's room state is unchanged
- **AND** the next new-epoch snapshot is applied normally

### Requirement: Recovery rebuilds from durable state

On ownership loss, the affected room SHALL be rebuilt by its successor from durable state plus safe entrance placement for transient positions; process-local state (exact positions, unreplicated cooldowns) MAY reset. The system SHALL NOT promise or implement seamless process migration, and any instance switching SHALL be visible to affected users rather than disguised.

#### Scenario: Owner kill and successor takeover

- **WHEN** the owner node of an active room is killed
- **THEN** a successor acquires the lease with a bumped epoch and rebuilds the room from durable state with occupants at entrances
- **AND** clients reconnect into the new-epoch room without duplicated or lost durable effects

### Requirement: Bounded deploy drain

Deploys SHALL use bounded drain: a draining node SHALL reject new room allocations and SHALL have a bounded time to finish existing rooms, after which leases lapse and successors take over with new epochs. Clients rejoining after failover or drain SHALL apply jitter so reconnects do not arrive as a synchronized storm.

#### Scenario: Drain completes within bounds

- **WHEN** a node is marked draining for a deploy
- **THEN** no new rooms are allocated to it and its rooms are gone within the bounded drain time
- **AND** rejoined clients land on new-epoch owners without a synchronized reconnect spike

### Requirement: Parties pinned together

Members of a party SHALL be routed to the same room instance and node so that failover or drain moves the party as a unit, and instance switching caused by failover SHALL be visible to users.

#### Scenario: Party fails over as a unit

- **WHEN** the node hosting a party's room loses ownership
- **THEN** the party's members are re-routed together to the same successor instance
- **AND** no member is left on the deposed owner

### Requirement: Cluster formation discipline

Multi-node membership SHALL be formed with `libcluster`-family strategies configured per environment (gossip for dev/VM, DNS-based strategy for container deploys), with the distribution cookie provisioned through secret management. Manual `Node.start` invocations, cookies hardcoded in entrypoint scripts, and ad-hoc docker-DNS discovery scripts SHALL NOT be used.

#### Scenario: Second node joins without manual hacks

- **WHEN** a second node starts in an enabled environment
- **THEN** it joins the cluster via the configured libcluster strategy without hand-run discovery commands
- **AND** no startup script contains a hardcoded cookie or manual node-alive workaround

### Requirement: Transient primitives are not consensus

Presence, PubSub, and the local Registry SHALL be treated as transient delivery and per-node lookup only; they SHALL NOT be used to decide or infer room ownership, and no global GenServer SHALL own all rooms. The market and all cross-room economic authority SHALL remain single-region until a distinct economic partition model is designed.

#### Scenario: Ownership never derived from Presence

- **WHEN** Presence membership and the lease table disagree about a room
- **THEN** the lease table governs ownership decisions
- **AND** no code path grants write authority from Presence or Registry data

### Requirement: Failover verification and soak

Before multi-node operation is trusted, the following SHALL be demonstrated with recorded evidence: partition injection (owner cannot renew ⇒ durable mutations rejected), owner kill with successor takeover and epoch bump, client discard of a stale-epoch snapshot, and a bounded reconnect storm during failover. A failover soak task SHALL be added to the load/soak/failure suite and SHALL run as part of acceptance.

#### Scenario: Failover soak passes

- **WHEN** the failover soak runs repeated kill/partition/drain cycles under representative load
- **THEN** no durable effect is duplicated or lost across failovers and reconnect storms stay bounded
- **AND** the soak report (p50/p95/p99, hardware, versions, error definitions) is recorded as P9 acceptance evidence

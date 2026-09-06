# Add Distributed Room Ownership (Leases, Epochs, Fencing)

## Why

Phase P9 (`docs/architecture/elixir/ownership.md` phase map; `docs/architecture/elixir/runtime.md` §Room authority and partitioning; `docs/architecture/elixir/migration.md` §4). Until now every room instance has had exactly one owner because there has been exactly one node. The moment a second gateway/room node exists, process supervision alone stops being a correctness mechanism: Presence, PubSub, and a local Registry give **no distributed consensus**, so a network partition or a slow/greedy failover can leave two nodes each believing they own the same room — and with it, the authority to commit durable room mutations. The failure modes this change exists to prevent (split-brain writes, a zombie owner resurrecting stale state, clients accepting an evicted owner's messages) are exactly the ones a later `remove-node-server-authority` world cannot tolerate.

This change is **measured-gated**: multi-node operation happens only when P10 evidence justifies it (connection counts, room fanout, node resource ceilings, or availability requirements that a single node demonstrably cannot meet). Until that evidence exists, single-node operation remains correct and this change is not implemented — the gate is part of the contract, not a footnote. **Current** state: one node owns every room via Registry + DynamicSupervisor; ownership is implicit in process placement; a node crash loses rooms outright. **Desired** state: room ownership is an explicit, fenced, PostgreSQL-leased fact — one owner per room key, epochs that make stale owners and stale messages detectable, fail-closed behavior under partition, bounded drain for deploys — with room loss recovered by rebuilding from durable state and entrances, never by promising seamless migration.

## What Changes

- **Measured precondition**: implementation is gated on recorded P10 evidence that multi-node operation is justified; the gate and the evidence artifact are first-class deliverables.
- **`room_leases` table**: room key, owner node, epoch, expiry — renewed using database time, never node clocks. Acquisition is atomic with epoch increment, so concurrent claimants produce exactly one winner.
- **In-transaction fencing**: every durable room mutation checks the current epoch and an unexpired lease inside its own transaction; a mutation whose owner/epoch no longer matches the lease is aborted.
- **Fail-closed partition behavior**: an owner that cannot renew stops accepting durable mutations; transient movement may continue only while valid room ownership is retained, and stops when the lease is lost. Gateways stop routing to expired owners.
- **Epoch-visible recovery**: successor snapshots carry the new epoch; clients discard messages bearing an older epoch than the newest they have seen. Room loss rebuilds from durable state plus safe entrances — no seamless process migration is promised, and instance switching is visible to users.
- **Bounded deploy drain**: draining nodes reject new room allocations and get a bounded time to finish; clients rejoin with jitter so failover does not produce a synchronized reconnect storm.
- **Cluster formation discipline**: membership via `libcluster`/`DNSCluster` strategies per environment; manual `Node.start` calls, entrypoint cookie hacks, and docker-DNS shell scripts are rejected (serviceradar's clustering is the library-family reference, not a mandate to copy its operations).
- **Parties pinned together**: party members are routed to the same room instance/node so a failover moves them as a unit.
- **Scope fences**: Presence/PubSub/Registry remain transient delivery with no consensus role; no global GenServer for all rooms; the market remains a single-region economic authority.

Exit gate (P9, only after the measured gate passes): under an injected partition the owner cannot renew and its durable mutations are rejected; killing the owner produces a successor takeover with a bumped epoch; clients discard stale-epoch snapshots; a reconnect storm during failover stays bounded in a failover soak.

Depends on: `add-observability-security-loadtesting` (P10 — produces the measured evidence this change is gated on and the load/soak/failure suites used to prove it; without that evidence this change stays unimplemented). Presupposes the P3 room runtime and the P5/P6 durable domains whose transactions the fence protects; the umbrella `port-backend-to-elixir` orders it as phase P9, ahead of `remove-node-server-authority` (P11).

## Capabilities

### New Capabilities

- `room-ownership-fencing`: the distributed single-writer contract for room instances — measured precondition for multi-node operation, PostgreSQL room leases with database-time renewal and epoch fencing, in-transaction lease checks on durable mutations, fail-closed partition behavior, gateway routing away from expired owners, epoch-enforced client discard, rebuild-from-durable-state recovery, bounded deploy drain, and the explicit non-consensus status of Presence/PubSub/Registry.

### Modified Capabilities

- (none — no capability has been archived yet; single-node room ownership lives in the `add-world-room-runtime` pending change and `runtime.md` §Room authority and partitioning, which this change extends to multi-node rather than altering player-visible behavior.)

## Impact

- **New files (Elixir)**: `server_elixir/lib/afterlight/world/lease/` — `Afterlight.World.Lease` (acquire/renew/verify against `room_leases`), `Afterlight.World.Lease.Renewer` (per-owner renewal loop), `Afterlight.World.Directory` (gateway-facing lease cache), drain controller; partition/kill test helpers and the failover soak script under `server_elixir/` load tooling.
- **Modified (Elixir)**: room owner processes (hold lease handle; fail closed on renewal loss), durable domain commands (in-transaction lease check), gateway router (consult directory before routing room messages), session/channel code (attach epoch to snapshots and responses, client-discard rule support), deploy/drain wiring.
- **Client**: `src/net/client.js`/adapter — track the newest epoch seen per room and discard older-epoch messages; jittered rejoin on directed reconnection. No other client behavior change.
- **Data model**: new `room_leases` table — `room_key` (unique; `{region, district_id, instance_id}`), `owner_node`, `epoch` (monotonic per room), `expires_at` and `renewed_at` set from database time. No other tables change; no movement/position rows are introduced.
- **Protocol changes**: snapshots and durable command responses carry `epoch` (per the runtime envelope `{request_id, result, revision, epoch}`); clients use it for stale-message discard. No message type changes.
- **Security**: fail-closed posture on lost ownership prevents a partitioned node from committing mutations; cluster cookie handled by libcluster provisioning, never hardcoded in entrypoint scripts.
- **Tests**: partition injection (renewal failure ⇒ mutations rejected), owner kill + successor takeover with epoch bump, stale-epoch snapshot discard, reconnect storm during failover; load: failover soak task added to the P10 suite.
- **Docs**: `runtime.md` §Room authority and partitioning linked as the design source; `migration.md` §4 gate recorded; new topology documented when the second node actually lands.

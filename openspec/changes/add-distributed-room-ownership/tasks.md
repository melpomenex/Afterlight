## 1. Measured gate

- [x] 1.1 Collect and record the P10 evidence artifact (connection counts, room fanout, node resource ceilings, availability needs) with an explicit justify/defer decision for multi-node room operation; if deferred, stop here and record the deferral in `docs/architecture/elixir/migration.md` §4 terms.
- [x] 1.2 Encode the gate in configuration/docs: a second node running room owners without a recorded justifying artifact is a deployment error, not a supported posture.

## 2. Room leases data model and lease operations

- [x] 2.1 Add the `room_leases` table: `room_key` (unique; `{region, district_id, instance_id}`), `owner_node`, `epoch` (bigint, monotonic per room), `expires_at`/`renewed_at` set from database time; migration with constraints and index.
- [x] 2.2 Implement `Afterlight.World.Lease`: atomic acquisition (insert or conditional takeover with `epoch = leases.epoch + 1`), guarded renewal (owner + epoch match, `expires_at > now()` using DB time), and fenced-state transition on failed renewal; jittered successor backoff on expiry.
- [x] 2.3 Unit/concurrency tests: concurrent claimants produce exactly one winner with a bumped epoch; renewal with mismatched owner or epoch is rejected; all time comparisons use database time (clock-skew test where node clocks are skewed deliberately).

## 3. In-transaction fencing of durable room mutations

- [x] 3.1 Add the in-transaction lease check to every durable room mutation path: read `room_leases` in the mutation's transaction and require matching owner + epoch + unexpired lease; abort with a retryable rejection otherwise.
- [x] 3.2 Wire room owner processes to hold their lease handle, renew on cadence (a fraction of the TTL, jittered), and enter the fenced state on renewal failure (durable mutations rejected immediately; movement stopped once the lease is expired/unrenewable, clients directed to reconnect).
- [x] 3.3 Tests: partition injection — block renewal traffic, assert the owner cannot renew and its durable mutations are rejected with no partial effects; valid owner commits with the check passing in-transaction.

## 4. Gateway routing, epochs, and client discard

- [x] 4.1 Implement `Afterlight.World.Directory`: a short-TTL gateway-facing view of `room_leases`; gateways stop routing room messages to expired owners and route to the holder or trigger successor acquisition.
- [x] 4.2 Carry `epoch` in room snapshots and durable command responses (envelope `{request_id, result, revision, epoch}`); successor snapshots always carry the new epoch.
- [x] 4.3 Client: track the newest epoch seen per room and discard older-epoch messages; jittered rejoin after directed reconnect. Test: a stale-epoch snapshot injected after a new-epoch one is discarded and the next new-epoch snapshot applies normally.

## 5. Recovery, drain, parties, cluster formation

- [x] 5.1 Implement successor rebuild: pause on ownership loss, rebuild from durable state (Ash domains, theater bill/revision) with occupants at safe entrances; make instance switching visible to affected users; no process-state handoff.
- [x] 5.2 Implement bounded drain: draining nodes reject new room allocations, existing rooms finish within the bounded drain time (lease-expiry-bounded), then leases lapse; clients rejoin with jitter.
- [x] 5.3 Pin party members to the same room instance/node so failover moves the party as a unit; verify with a two-party test across a drain.
- [x] 5.4 Configure libcluster strategies per environment (gossip dev/VM, DNS-based for containers), cookie via secret management; assert no manual `Node.start`/hardcoded-cookie/docker-DNS scripts exist in the deploy path.

## 6. Verification, soak, and docs

- [x] 6.1 Failure tests: owner kill → successor takeover with epoch bump and rebuild from durable state + entrances, with zero duplicated or lost durable effects; reconnect storm during failover stays bounded under the P10 admission rules.
- [x] 6.2 Add the failover soak task to the load/soak/failure suite (repeated kill/partition/drain cycles under representative load); run it and record the report (p50/p95/p99, hardware, versions, error definitions) as P9 acceptance evidence.
- [x] 6.3 Confirm the scope fences in code review + tests: no ownership decision reads Presence/Registry; no global room GenServer exists; market remains single-region (no cross-region routing of economic commands).
- [x] 6.4 Run `mix test` and the JS `npm test` suite (client epoch-discard changes stay green); resolve real failures.
- [x] 6.5 Update `docs/architecture/elixir/runtime.md` §Room authority and partitioning status and `migration.md` §4 with the recorded gate decision and evidence link; document the room_leases schema in the PostgreSQL model list.

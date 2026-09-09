> **PARTIAL SUPERSESSION by `integrate-ssxtricky-snowboard` (2026-09-09).**
> Also superseded by explicit user decision (2026-09-09): the minimum field
> is ONE rider, not two — "Hostless explicit readiness" now reads "minimum
> one and maximum eight riders"; a lone loaded+ready rider locks the roster
> and starts a solo run on the same shared authority (no AI substitution,
> manifest `minPlayers: 1`). Every other readiness/lifecycle guarantee is
> retained.
> "One valid downhill course" is superseded in its specifics: the course is
> the versioned Alpine Rush document (source terrain, 13 ramps, speed zones,
> pickups) and the phrase "without requiring trick scoring" no longer applies
> — server-authoritative trick/boost/pickup scoring IS required, per-rider
> per-race. Peer collisions remain disabled. Every other requirement —
> session scoping, hostless readiness, server-owned simulation, deterministic
> results, protocol fencing, prediction/interpolation, disconnect recovery,
> late join/rematch, bounded lifetime, scoped delivery — is retained
> unchanged and remains a dependency.

## Purpose

Define authoritative, bounded multiplayer snowboard races with responsive prediction, validated course progression and dependable rematch and recovery behavior.

## ADDED Requirements

### Requirement: Cabinet-scoped authenticated session
Users at the same physical cabinet in the same authoritative world instance SHALL join the same active session. Different instances, cabinets or ownership epochs SHALL not share races accidentally. Identity, socket and accepted world membership SHALL come from existing Afterlight authentication and admission. Initial admission and queue promotion SHALL validate proximity and fail closed on unavailable ownership checks. Duplicate connections SHALL occupy at most one slot under the supported single-owner-node deployment.

#### Scenario: Shared cabinet
- **WHEN** two authenticated users at the same cabinet request play
- **THEN** both receive the same session identity and distinct participant slots.

#### Scenario: Instance isolation
- **WHEN** equal cabinet IDs exist under two distinct authoritative instance keys
- **THEN** each receives an independent session and neither receives the other's race state.

#### Scenario: Forged admission
- **WHEN** an outside-room or out-of-range client requests play
- **THEN** admission fails without creating a rider.

### Requirement: Hostless explicit readiness
A race SHALL support minimum two and maximum eight riders without a browser host. One rider SHALL wait without AI or forced solo play. Every seated connected rider SHALL explicitly ready after loading the correct course. All ready with at least two riders SHALL lock the roster and schedule one three-second countdown. Readiness SHALL expire after 60 seconds and the countdown SHALL cancel if a locked rider leaves, disconnects or unreadies.

#### Scenario: Two of eight capacity
- **WHEN** two loaded riders are the only seated users and both ready
- **THEN** the race begins a countdown without waiting for all eight slots to fill.

#### Scenario: No host dependency
- **WHEN** the first participant leaves during racing
- **THEN** the server session continues for remaining riders under the normal DNF rules.

### Requirement: One valid downhill course
The release SHALL provide one original route with a starting gate, eight ordered checkpoints, turns, terrain variation, jumps, recoverable hazards and a finish gate. Contact terrain and visible rideable terrain SHALL agree. Controls SHALL provide slope-aware acceleration, carving, braking, charged jumps, airborne control and landing recovery without requiring trick scoring or peer collisions.

#### Scenario: Jump and landing
- **WHEN** a rider charges/releases a jump or crosses a ramp
- **THEN** the rider follows bounded airborne motion and lands or recovers on the same course surface visible to the user.

### Requirement: Server-owned simulation and progression
The server SHALL simulate bounded course motion from strictly validated controls, own checkpoint progression and reject client positions, speeds, scores, finish claims and arbitrary control fields. Gates SHALL require forward swept crossings in order within the legal corridor/altitude. Recovery teleports SHALL not earn gates. The server SHALL enforce the 180-second race deadline and a 30-second finishing window after first finish, capped by the overall deadline.

#### Scenario: Forged finish
- **WHEN** a client submits a winner, finish or transform claim without legitimate progression
- **THEN** the server rejects the command and produces no finish or ranking change.

#### Scenario: Missed checkpoint
- **WHEN** a state has not crossed all required checkpoints in order
- **THEN** it cannot finish, including after a recovery relocation.

### Requirement: Deterministic authoritative results
Finish order and elapsed time SHALL derive from authoritative simulation ticks and within-tick crossing fractions, not client clocks or message arrival. Finishes under one millisecond apart SHALL share displayed place; stable display ordering SHALL not invent a sole winner. DNF SHALL have an explicit reason and no fabricated finish time. Repeated terminal events SHALL not duplicate results.

#### Scenario: Same tick finish
- **WHEN** two riders cross finish during one simulation tick at different fractions
- **THEN** order follows the computed crossing times, with the stated tie rule.

### Requirement: Generation-fenced bounded protocol
Snowboard SHALL use the existing authenticated activity transport with session, room epoch, match and participant lease fencing. Inputs SHALL have monotonic lease-scoped sequence, strict finite control fields and bounded size/rates. Stale ready/leave/rematch/input actions SHALL not mutate a new race. Motion snapshots SHALL have independent ordering from lifecycle revision. Tokens and leases SHALL never be published to other users.

#### Scenario: Old match packet
- **WHEN** an old match's delayed ready, leave or input arrives during a rematch
- **THEN** it is rejected without altering the new match.

#### Scenario: Equal revision motion
- **WHEN** a newer ordered motion snapshot has the same lifecycle revision
- **THEN** clients accept its motion while still rejecting obsolete snapshot order.

### Requirement: Responsive synchronization
Clients SHALL predict local movement from the same versioned rules and reconcile to authority. Remote riders SHALL interpolate normally, extrapolate for no more than 100 milliseconds, then hold stale motion. Race countdown SHALL use one scheduled server start time; client wall-clock changes SHALL not change the race. Reset/respawn/session changes SHALL clear obsolete interpolation and prediction.

#### Scenario: Normal multiplayer movement
- **WHEN** riders race under 100ms RTT and 20ms jitter
- **THEN** remote riders move smoothly, local input responds immediately and displayed GO differs by no more than 100ms across clients.

### Requirement: Independent disconnect recovery
An absent active racer SHALL have a 30-second identity-bound reconnect grace while other racers continue. The absent rider SHALL freeze and the race timer SHALL continue. Reconnect after accepted room membership SHALL rotate lease and restore the same rider if still eligible. Grace expiry or explicit racing leave SHALL mark DNF once. With one rider left, that rider SHALL still cross valid finish to obtain a finish; with nobody remaining the race SHALL abort.

#### Scenario: Temporary drop
- **WHEN** one rider reconnects within grace while the race is still active
- **THEN** that rider resumes from its frozen authoritative state with elapsed race time preserved and old inputs rejected.

#### Scenario: Reload after deadline
- **WHEN** a player reloads after its grace or race deadline
- **THEN** it cannot resume the completed race but can return to the next lobby/queue.

### Requirement: Late join and rematch
New users during countdown/racing SHALL receive watch/queue options, not a racing slot. Queue promotion SHALL be FIFO with a 30-second acceptance window and renewed eligibility checks. Results readiness SHALL represent Rematch; all remaining loaded seated riders ready with minimum two SHALL start a new match identity without reconnecting or rebuilding the course. New promoted riders SHALL begin unready.

#### Scenario: Back-to-back races
- **WHEN** remaining racers choose Rematch
- **THEN** a fresh countdown resets riders/checkpoints/results for the new match without a page reload or new socket.

### Requirement: Bounded lifetime and honest failure
Owner loss/session crash SHALL abort transient races without inventing a winner and release local activity views. A successor SHALL use a fresh session identity. Empty sessions SHALL terminate within 60 seconds after outstanding reconnect grace; spectators alone SHALL not keep them alive. Nonready inactivity and results retention SHALL be bounded to 120 seconds. Unsupported transports SHALL show unavailable while preserving world play.

#### Scenario: Process failure
- **WHEN** the race process or room owner dies
- **THEN** participants see interruption, recover world controls and can request a fresh lobby after membership recovery; other rooms remain functional.

### Requirement: Scoped delivery and overload containment
High-rate rider state SHALL be delivered only to a bounded accepted audience with bounded outbound work; bystanders SHALL receive low-rate summaries. Snapshot payloads SHALL remain below 32KiB and 20Hz, inputs below 2KiB and existing rate ceilings. Excessive simulation debt SHALL abort the affected match honestly rather than silently corrupt race timing.

#### Scenario: Slow receiver
- **WHEN** one participant stops reading
- **THEN** its obsolete state is coalesced or it is disconnected retryably, without unbounded queues or blocking other racers/chat.

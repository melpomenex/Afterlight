## Purpose

Provide bounded authoritative multiplayer activity state, participation and recovery across room ownership changes and unreliable clients.

## ADDED Requirements

### Requirement: Canonical session protocol
The server SHALL authorize activity_join, activity_leave, activity_ready, activity_input and resnapshot requests against accepted room membership, activity definition and role. State, event and result envelopes SHALL include schema version, room ID, room ownership epoch, activity ID, session ID, revision and server time. Inputs SHALL carry a monotonic sequence scoped to the current session and participant lease. Clients SHALL NOT submit canonical scores, transforms or winners.

#### Scenario: Forged action
- **WHEN** a spectator or another-room client submits a scoring input
- **THEN** the server rejects it without changing state.

#### Scenario: Stale traffic
- **WHEN** a former session sends an input or delayed snapshot after rejoin
- **THEN** the server/client rejects the stale identity, epoch or sequence.

#### Scenario: Retry
- **WHEN** a client repeats an accepted ready or leave request
- **THEN** the request has no duplicate effect.

### Requirement: Seats queue and readiness
An identity SHALL occupy at most one active playing slot across activities. Slot claims SHALL be atomic; duplicate tabs SHALL not create extra slots or queue entries. Two ready players SHALL start a two-player match. Queues SHALL be FIFO with a 30-second acceptance window; membership and physical proximity SHALL be rechecked before seating. Defaults SHALL cap each activity at 32 focused spectators and 16 queued players, with explicit full responses.

#### Scenario: Last slot race
- **WHEN** two users claim the last slot concurrently
- **THEN** exactly one succeeds; the other gets current availability.

#### Scenario: Queue promotion
- **WHEN** a slot opens and the first eligible queued visitor does not accept within 30 seconds
- **THEN** the offer expires and advances without teleporting anybody.

### Requirement: Disconnect and ownership recovery
A disconnected participant SHALL have a 30-second identity-bound reconnect grace. Two-player competitive play SHALL pause during grace, then forfeit if only one player remains; with nobody remaining it SHALL abort. Explicit leave/travel SHALL release immediately. Session crash or room-owner loss SHALL abort the transient match without inventing a winner and invalidate old inputs. A successor SHALL start a new session identity. Races SHALL continue for remaining racers and mark an absent racer DNF after grace; cooperative sessions SHALL release absent slots without declaring a competitive winner. For 2v2 curling a disconnected side SHALL pause during grace, then forfeit if a teammate remains absent and the opposing side is complete; if neither side is complete the match SHALL abort.

#### Scenario: Reconnect
- **WHEN** the same authenticated identity reconnects within grace
- **THEN** it receives a full current snapshot and resumes only after membership acceptance.

#### Scenario: Owner failure
- **WHEN** a room lease is lost mid-shot
- **THEN** old publication/input stops, clients show interruption, and no uncompleted match produces a win.

### Requirement: Bounded simulation and transport
Activity inputs SHALL be bounded to 2 KiB and 60 messages/second per participant with a burst of 10; full snapshots SHALL be at most 32 KiB and 20/second per active activity. Control actions SHALL be limited to 5/second; resnapshot to one per five seconds. Simulations SHALL use bounded catch-up and drop obsolete inputs under overload. Empty sessions SHALL terminate within 60 seconds after reconnect grace, and losing room ownership SHALL stop their work.

#### Scenario: Abuse
- **WHEN** a client floods oversized or nonfinite input
- **THEN** it is rejected/rate-limited without unbounded mailbox growth or room-wide failure.

#### Scenario: Late join
- **WHEN** a spectator enters halfway through a rally
- **THEN** a full snapshot renders the current rally without replaying earlier sounds.

### Requirement: Durable completion boundary
Only server-validated completed matches/runs SHALL create durable results. Result writes SHALL be idempotent by match ID, rules version and ownership identity. Database failure SHALL not block live simulation; results SHALL show pending/unrecorded honestly and bounded retries SHALL never create duplicate wins. Ball, paddle and frame coordinates SHALL NOT be persisted as database rows.

#### Scenario: Repeated completion
- **WHEN** the same terminal match result is delivered twice
- **THEN** statistics and leaderboard credit it once.

#### Scenario: Database outage
- **WHEN** a game ends while durable storage is unavailable
- **THEN** players see the outcome and recording status; no false saved claim is made.

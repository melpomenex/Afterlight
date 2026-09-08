## Purpose

Defines room-authoritative high-level environmental state, event timing and late-join synchronization without transmitting particle simulation or changing agriculture.

## ADDED Requirements

### Requirement: Semantic atmosphere authority

A supported room SHALL have exactly one authoritative semantic atmosphere owned by its existing room authority. Only preset, mode, seed, bounded intensity/wind, timing, transition and significant event metadata SHALL be synchronized. Individual particle transforms SHALL NEVER be transmitted.

#### Scenario: Two occupants

- **WHEN** two clients join court during heavy rain
- **THEN** both receive the same semantic snapshot while generating their own rain locally.

#### Scenario: Agricultural rain

- **WHEN** court changes its atmospheric preset
- **THEN** crop moisture input and the agricultural weather contract remain unchanged.

### Requirement: Full snapshots and ordering

Every atmospheric snapshot SHALL include explicit room identity, schema version, existing room ownership epoch, atmosphere revision and server time. Late join/reconnect SHALL receive current full state after the roster. Wrong-room, stale epoch/revision and malformed frames SHALL NOT replace accepted state.

#### Scenario: Late join mid-transition

- **WHEN** a client joins halfway through a transition
- **THEN** its snapshot includes source/target/start/duration and it renders the current phase rather than restarting the transition.

#### Scenario: New owner

- **WHEN** the room owner is replaced
- **THEN** successor state carries a strictly newer ownership epoch and delayed old-owner output is rejected.

#### Scenario: Revision gap

- **WHEN** a later full snapshot skips revisions
- **THEN** it replaces state completely without requiring missing deltas or replaying skipped events.

#### Scenario: Malformed snapshot

- **WHEN** unknown schema, nonfinite values or more than four events arrive
- **THEN** last valid state or deterministic default remains and synchronized status is unavailable.

### Requirement: Bounded scheduling and modes

Fixed and scheduled weather and fixed/accelerated time SHALL be supported. Unsupported modes SHALL fail validation. Transitions SHALL be continuous for light, fog, wind, cloud, rain and audio; schedule wrap and restart SHALL produce the same semantic phase.

#### Scenario: Cycle boundary

- **WHEN** server time crosses a scheduled cycle boundary
- **THEN** the phase remains finite and transitions from the previous cycle’s last state without an unintended snap.

#### Scenario: Unsupported dynamic policy

- **WHEN** a definition selects an unimplemented mode
- **THEN** validation reports it rather than silently using fixed weather.

### Requirement: Events are bounded and not replayed

Shared events SHALL have stable IDs, ownership epoch context, start time and bounded duration/intensity. Snapshots SHALL carry at most four scheduled events. Lightning spacing SHALL be at least 45 seconds and meteors at least 35 seconds. Duplicate snapshots SHALL NOT duplicate event effects.

#### Scenario: Join after lightning

- **WHEN** a new visitor receives a snapshot after a lightning event started
- **THEN** neither that flash nor its delayed thunder replays.

#### Scenario: Duplicate event

- **WHEN** the same event ID is received twice
- **THEN** the client emits at most one local event effect.

#### Scenario: Pause or travel

- **WHEN** an event expires while settings are open or the visitor leaves
- **THEN** resuming or entering another place does not replay it and old scheduled audio is canceled.

### Requirement: Failure and bounded control traffic

Atmosphere state SHALL be transient and fail closed on lost ownership. Disconnection SHALL NOT freeze local rendering. Resnapshot requests SHALL be room-membership-gated, one per five seconds, and snapshots SHALL be at most 8KiB. Idle rooms SHALL NOT retain independent atmosphere schedulers.

#### Scenario: Disconnect

- **WHEN** network is lost in rain
- **THEN** local rain continues with unavailable synchronization, shared one-shots stop and reconnect obtains a fresh snapshot.

#### Scenario: Owner loses lease

- **WHEN** lease renewal fails and ownership becomes invalid
- **THEN** the old owner stops publishing atmosphere/events and directs recovery through existing room failover.

#### Scenario: Empty room

- **WHEN** the last occupant leaves and room grace expires
- **THEN** room atmosphere work stops with the room and no global per-place timer remains.

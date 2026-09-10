## Purpose

Make release readiness measurable through authoritative simulation tests, real
multiplayer browser evidence, resource-leak budgets, load characterization and
operational visibility.

## ADDED Requirements

### Requirement: Manifest, cabinet and projection evidence

Release SHALL include tests proving the `downhill-mayhem` activity type is
accepted, the cabinet reuses the canonical geometry at the exact Signal Lost
transform, a distinct `downhill` motif and LED are applied, six anchors and
dismounts are clearance-valid and reachable, the placed cabinet count remains
five, no activity ids collide, capacities are correct, Signal Lost remains
dormant-but-present, and the committed server projection matches the manifest
(`node scripts/export-place-definitions.mjs --check`).

#### Scenario: Projection drift

- **WHEN** the manifest and `server_elixir/priv/place_definitions.json` differ
- **THEN** the projection check fails with a named error.

### Requirement: Pure simulation parity fixtures

Release SHALL include deterministic golden fixtures covering course sampling,
acceleration, braking, steering, slopes, jumps, landing, crashes, boost, trick
success/failure, collision-relevant terrain and obstacles, finish crossing,
punch and kick range, hit/miss, invulnerability, knockdown, AI decisions and
race placement/ties. The JavaScript and Elixir rules SHALL agree within an
explicit tolerance (target: 1 cm position and 0.01 m/s velocity after a 180 s
replay fixture) with identical structural event outcomes, and divergence SHALL
fail the suite.

#### Scenario: Cross-runtime replay

- **WHEN** the parity fixture is replayed on both runtimes
- **THEN** positions/velocities are within tolerance and finishes/checkpoints/
  combat outcomes match exactly.

### Requirement: Networking and lifecycle tests

Release SHALL include tests for one human plus five AI, two humans plus four AI
and six humans; lobby, captain and settings, readiness, countdown and roster
lock; late join and queue with promotion; rematch; disconnect/reconnect/grace
expiry/DNF; stale and malicious input; wrong match/session/course hash;
duplicate connections; and owner failure/fencing. These SHALL exercise the real
session policy and the protocol validation, not mocks alone.

#### Scenario: Roster locked

- **WHEN** a race is locked and a new play request arrives
- **THEN** the server offers watch/queue and never inserts a rider.

#### Scenario: Malicious input

- **WHEN** a client sends impossible controls, stale sequences or a forged
  finish/transform
- **THEN** the server rejects it with a typed error and race state is unchanged.

### Requirement: Prediction and interpolation tests

Release SHALL cover input-sequence replay, reconciliation (small drift
correction and large hard reset), crash/reset teleport handling, remote
interpolation, missing snapshots, and stale/out-of-order snapshots.

#### Scenario: Stale snapshot

- **WHEN** a non-increasing snapshot sequence or wrong match/session arrives
- **THEN** the client drops it without corrupting rendered state.

### Requirement: Lifecycle and resource budgets

Automated soak tests SHALL repeatedly enter, race or partially race, and exit
Downhill Mayhem, asserting no growth in listeners, canvases, WebGL contexts,
animation loops, timers, intervals, DOM elements, audio nodes, scene resources,
subscriptions or prediction buffers, and that renderer state returns to the
pre-entry policy. Measurable gates (to be recorded on reference hardware):
one host renderer/context/RAF/socket after repeated cycles; p95 frame budget
within the documented activity threshold while racing; post-eviction owned
memory returning to baseline within the documented tolerance.

#### Scenario: Repeated entry and exit

- **WHEN** the activity is entered and exited many times
- **THEN** resource counts return toward baseline and Theater controls still work.

### Requirement: Real browser end-to-end gate

Release SHALL include an automated browser gate using real browser clients and
real controls (never injected winner snapshots) modeled on the existing Summit
Run/Kart Royale gates. The minimum two-browser happy path SHALL: enter the
Theater, walk to the Downhill Mayhem cabinet, press E, enter the same lobby with
identical humans/AI/mountain/difficulty, ready, receive synchronized countdown,
race, perform a strike and observe the same authoritative outcome on both
clients, perform jump/trick/boost, finish, observe identical standings, rematch
without reload or world rebuild, exit and restore Theater controls with the
other client healthy. Additional cases SHALL include one-human race, third-user
mid-race queue, disconnect/reconnect, disconnect expiry, captain departure,
failed course load and a repeated enter/exit soak. The gate SHALL assert no
second permanent canvas, renderer, RAF, page navigation or new application
socket.

#### Scenario: Two-browser release gate

- **WHEN** two isolated authenticated browser sessions complete a race
- **THEN** they agree on session, match, field, combat outcome and results, and
  return to usable Afterlight without a page reload.

#### Scenario: No second host primitive

- **WHEN** the gate inspects the page during play
- **THEN** exactly one renderer, primary loop and transport connection exist.

### Requirement: Measured load capacity

Before broad rollout the team SHALL characterize concurrent Downhill Mayhem
sessions with six simulated riders each through the real transport, measuring
session tick cost, snapshot serialization, message rate, BEAM scheduler impact,
memory per session, garbage collection behavior and effect on normal social
rooms. Reported capacity SHALL be measured, not asserted from BEAM process
counts, and deployment limits SHALL be set from that evidence.

#### Scenario: Capacity report

- **WHEN** the load characterization runs
- **THEN** the report states hardware/build/configuration, measured session
  capacity, tick/queue/memory results and the resulting initial rollout limit.

### Requirement: Operational visibility and rollout safety

The feature SHALL expose bounded low-cardinality diagnostics for active
sessions, phase, rider/human/AI/queued counts, tick duration, snapshot rate,
dropped/late inputs, aborts, reconnects, DNF counts and cleanup through existing
operational facilities, without logging player/session ids or secrets as metric
labels. Feature disable SHALL prevent new admissions, cleanly finish or abort
active races, release views and leave retained world snapshots and other
activities untouched.

#### Scenario: Disabled feature

- **WHEN** operators disable Downhill Mayhem admission
- **THEN** the cabinet reports unavailable, active races drain or abort cleanly,
  and the rest of Afterlight remains functional.

## Purpose

Define authoritative, bounded, six-rider Downhill Mayhem races with responsive
prediction, deterministic course and physics, server-owned AI and combat,
synchronized lobby/countdown/results, and dependable queue, reconnect and
rematch behavior.

## ADDED Requirements

### Requirement: Cabinet-scoped authenticated session

Users at the same physical cabinet in the same authoritative world instance
SHALL join the same active session. Different instances, cabinets or ownership
epochs SHALL NOT share races accidentally. Identity, socket and accepted world
membership SHALL come from existing Afterlight authentication and admission;
initial admission and queue-promotion acceptance SHALL validate proximity and
fail closed when ownership/membership/proximity checks are unavailable.
Duplicate connections SHALL occupy at most one session slot under the supported
single-owner-node deployment.

#### Scenario: Shared cabinet

- **WHEN** two authenticated users at the same cabinet request play
- **THEN** both receive the same session identity and distinct participant slots.

#### Scenario: Instance isolation

- **WHEN** equal cabinet ids exist under two distinct authoritative instance keys
- **THEN** each receives an independent session and neither receives the other's state.

#### Scenario: Forged admission

- **WHEN** an outside-room or out-of-range client requests play
- **THEN** admission fails without creating a rider.

### Requirement: Six-rider human and AI population

A race field SHALL always contain exactly six riders. Human riders SHALL fill
slots by deterministic join order up to six; the server SHALL fill all
remaining slots with AI at roster lock, recomputed on every lobby change. One
human SHALL be sufficient to lock and start (`minPlayers: 1`); the game SHALL
NOT require a second human. AI identities (name, jersey color) SHALL be chosen
deterministically server-side from the source roster and SHALL be identical on
every client; a client SHALL NOT choose its own AI roster. The `isAI` marker
SHALL be published for presentation.

#### Scenario: Lone human fills the field

- **WHEN** one human readies with no other humans seated
- **THEN** the server locks a six-rider field of that human plus five AI
- **AND** every client sees the same five AI names and colors.

#### Scenario: Humans displace AI

- **WHEN** additional humans ready before lock
- **THEN** each human takes a slot and the AI population is recomputed so the
  field remains exactly six
- **AND** after lock no arriving human replaces an AI mid-race.

### Requirement: Deterministic course identity

Every match SHALL carry an authoritative `{courseId, courseVersion, courseHash}`
selecting one of the source mountains (Classic, Timberline, Rockgarden, Daily)
and one of the source difficulties (Chill, Mayhem, Brutal). The course contact
surface and obstacle set SHALL be the same bytes on the server and every
client; for the date-seeded Daily the server SHALL be the sole runtime
generator and SHALL deliver the document (or its hash) to clients, and all
clients SHALL race exactly that document. A client whose loaded course hash does
not match the server SHALL fail readiness with `course_mismatch` and SHALL NOT
join a different mountain.

#### Scenario: Same Daily for everyone

- **WHEN** players race the Daily on the same UTC date
- **THEN** all of them race the same server-authored course document and hash.

#### Scenario: Stale client fails closed

- **WHEN** a client reports a course hash that does not match the session
- **THEN** it is refused readiness and cannot enter the race.

### Requirement: Server-owned fixed-step simulation

The server SHALL simulate all six riders from bounded input intentions using a
deterministic fixed 30 Hz tick and the shared rules, owning positions, movement,
jumps, crashes, boost, trick outcomes that affect mechanics, AI, combat,
finishes and results. Clients SHALL NOT submit positions, speeds, scores, finish
claims or hit claims, and the server SHALL reject such fields. Cosmetic-only
effects may remain client-local. The simulation SHALL be deterministic given the
same course, match seed and inputs.

#### Scenario: Forged transform or result

- **WHEN** a client submits a position, speed, score, finish or winner claim
- **THEN** the server rejects the command and changes no race state.

#### Scenario: Deterministic replay

- **WHEN** the same course, match seed and input sequence are replayed
- **THEN** the authoritative result is identical across runs and runtimes
  within the documented tolerance.

### Requirement: Input protocol and validation

Downhill Mayhem SHALL use the existing authenticated activity transport with
session, room epoch, match and participant lease fencing. Inputs SHALL be
strict, finite, bounded control-intention messages carrying a monotonic
lease-scoped sequence; the server SHALL reject oversized, non-finite,
out-of-range, unknown-field, wrong-session/epoch/match, wrong-lease, unseated,
stale-sequence and impossible-phase traffic. Held control states SHALL be
tracked so a dropped packet neutralizes rather than latches an action. Rate
limits (input ceiling, control ceiling, resnapshot interval, payload caps) SHALL
apply. Tokens and leases SHALL never be published to other users.

#### Scenario: Malformed or spam input

- **WHEN** a client sends non-finite controls, unknown fields, or floods commands
- **THEN** the server rejects and rate-limits without unbounded mailbox growth
  or affecting other matches.

#### Scenario: Old match packet

- **WHEN** an old match's delayed input, ready or leave arrives after a rematch
- **THEN** it is rejected with a stale-match error and the new match is untouched.

### Requirement: Client prediction and reconciliation

The local human rider SHALL be predicted from the same shared rules at a fixed
step accumulator so that accepted local steering and other controls affect the
rendered rider on the next client simulation step without waiting for a server
snapshot. The client SHALL reconcile to authoritative state by resetting to the
authoritative tick/state, discarding steps already represented by the applied
sequence, replaying remaining unapplied controls, smoothing small corrections,
and hard-resetting on large divergence or on mismatched crash/grounded/trick/
finish/reset state. Snapshots SHALL NOT be trusted for local position directly.

#### Scenario: Responsive local input

- **WHEN** the local player steers while the network is slow
- **THEN** the local rider responds immediately and later converges to the
  authoritative position.

#### Scenario: Crash correction

- **WHEN** the predicted and authoritative crash states differ
- **THEN** the client hard-resets the local rider to the authoritative state.

### Requirement: Remote interpolation and shared clock

Remote humans and server AI SHALL be rendered from authoritative snapshot
history, never from transforms supplied by the remote browser. The client SHALL
buffer snapshots with an interpolation delay, interpolate by authoritative tick,
extrapolate for a bounded time then hold stale motion, drop stale/out-of-order
or wrong-identity snapshots, and clear buffers on reset/crash/recovery/finish/
session change so a recovery teleport is never animated. The countdown SHALL
use one server-authored start time; client wall-clock changes SHALL NOT move the
race.

#### Scenario: Temporary packet loss

- **WHEN** snapshots are delayed briefly
- **THEN** remote riders continue smoothly within the interpolation window and
  then hold with a connection indicator rather than teleporting.

### Requirement: Server-owned AI authority

All AI riders SHALL be simulated by the authority through the same simulation
used for humans, driven by AI control generation ported from the source
(racing-line, corner planning, ramps, tricks, boost spending, punching/kicking,
difficulty scaling, rubber-banding, comeback-company and revenge/grudge
including the BRUTAL hunt-and-race behavior). AI decisions SHALL use a
deterministic per-match seed and SHALL NOT depend on uncontrolled randomness.
Clients SHALL only interpolate server AI.

#### Scenario: Only the server decides AI

- **WHEN** two clients render the same AI rider
- **THEN** they see the same authoritative state from server snapshots
- **AND** no client independently simulates that AI.

### Requirement: Server-owned human combat

The source punch/kick mechanic SHALL be retained with server-resolved
outcomes. Clients SHALL send only a pressed action; the server SHALL validate
longitudinal/lateral/vertical range, attacker cooldown and state, victim
invulnerability and state, and strike timing/legality from authoritative state,
then apply knockdown, meter payout and grudge/revenge effects and broadcast a
strike event. A client SHALL NOT be able to assert a hit.

#### Scenario: Client claims a hit

- **WHEN** a client sends only "punch" while no target is in authoritative range
- **THEN** the server registers a whiff and no knockdown.

#### Scenario: Air strike

- **WHEN** an airborne attacker strikes an in-range rider
- **THEN** the server applies the air-strike outcome and both clients observe it.

### Requirement: Lobby, captain, settings and readiness

The session SHALL have a lobby phase before countdown with a server-authored
snapshot showing human roster and slots, AI filler slots, current mountain,
difficulty, captain, ready count, queue/spectator counts and an explicit exit.
The first seated connected human SHALL be captain; the captain alone SHALL
change mountain/difficulty while the lobby is unlocked, and leadership SHALL
transfer deterministically to the longest-seated remaining connected human if
the captain leaves before lock. Readiness SHALL be explicit per rider (no
auto-ready) and SHALL require a matching course load; readiness SHALL expire
after 60 seconds. All connected seated humans ready with at least one human
SHALL lock the roster.

#### Scenario: Captain sets the course

- **WHEN** the captain selects a mountain and difficulty in the lobby
- **THEN** every client sees the same authoritative selection.

#### Scenario: Non-captain cannot change settings

- **WHEN** a non-captain submits a settings change
- **THEN** the server rejects it and settings are unchanged.

### Requirement: Countdown lock

All ready riders with at least one human SHALL schedule one synchronized
three-second server-authored countdown. Lock SHALL freeze roster, humans/AI
slots, AI identities, course/seed/hash, difficulty and match identity; settings
and roster SHALL be immutable until results. A new participant during countdown
SHALL NOT be inserted as a rider, and pre-start inputs SHALL NOT grant
acceleration, boost or hop advantage. An unready/leave/disconnect of a locked
rider SHALL cancel the countdown and return to lobby with readiness cleared,
unless the race has already started.

#### Scenario: Synchronized start

- **WHEN** the locked countdown elapses
- **THEN** all six riders start the same race at the same authoritative time.

### Requirement: Queue and late join

New participants during countdown or racing SHALL receive watch/queue options
rather than a racing slot. Queue SHALL be FIFO with a bounded capacity and a
30-second acceptance window; membership and proximity SHALL be re-checked
before promotion. Promotion SHALL occur between races, replace an AI slot for
the next match, begin unready, and SHALL NOT teleport a user or replace a human
mid-race. Watching SHALL NOT capture gameplay input.

#### Scenario: Third user queues

- **WHEN** a third user arrives mid-race
- **THEN** they may watch public progress and accept a queue offer for the next
  race without disturbing the current field.

#### Scenario: Offer expires

- **WHEN** a queued user does not accept within the window
- **THEN** the offer expires and advances in FIFO order.

### Requirement: Disconnect and reconnect

One player's interruption SHALL NOT pause the race for others. An absent active
rider SHALL have a bounded 30-second identity-bound reconnect grace during which
their slot is reserved and their authoritative state is frozen (or safely
resumed if airborne) while the race clock continues. Reconnect after accepted
room membership SHALL rotate the participant lease and restore the same rider
from authoritative state with elapsed time preserved, rejecting pre-disconnect
sequences. Grace expiry or explicit leave SHALL mark DNF once with an explicit
reason; the rider may queue for a later race. Input focus loss SHALL neutralize
that client's controls without pausing the session.

#### Scenario: Temporary drop

- **WHEN** a rider reconnects within grace while the race is active
- **THEN** the rider resumes the same authoritative state with elapsed time preserved.

#### Scenario: Grace expiry

- **WHEN** the rider does not return within grace
- **THEN** the server marks exactly one DNF with reason `disconnect` and others continue.

### Requirement: Results and rematch

The server SHALL determine finish crossing, finish tick/time, placement and DNF
ordering from authoritative ticks; ties within one millisecond SHALL share
place, and DNF SHALL have an explicit reason and no fabricated time. A first
finisher SHALL NOT immediately end the race for everyone; an overall deadline
applies. Results SHALL list all six riders with place, name, time or DNF and an
AI marker, session-local only. Rematch SHALL create a fresh match identity,
reset all rider transient state, refill AI from currently seated humans,
preserve the selected course/difficulty unless changed in an unlocked lobby,
clear prior results and start a new synchronized countdown without a page
reload, reconnection or world rebuild; promoted queued humans SHALL be eligible
for the next match.

#### Scenario: Back-to-back races

- **WHEN** remaining riders choose rematch
- **THEN** a fresh countdown resets riders, results and transient state with the
  same loaded scene and connection.

#### Scenario: Results are complete and honest

- **WHEN** the race reaches its terminal condition
- **THEN** every client sees the same six-rider standings and DNF reasons.

### Requirement: Bounded delivery and overload containment

High-rate rider state SHALL be delivered only to a bounded accepted audience
(seated riders and watchers) and bystanders SHALL receive low-rate summaries.
Snapshot payloads SHALL remain within the existing size and rate ceilings,
inputs within the input ceilings, and excessive simulation debt SHALL abort the
affected match honestly rather than silently corrupt race timing. Slow
consumers SHALL be coalesced or disconnected retryably without unbounded queues
or blocking other riders or chat.

#### Scenario: Slow receiver

- **WHEN** one participant stops reading
- **THEN** obsolete state is coalesced or the participant is disconnected
  retryably without blocking others.

### Requirement: Bounded lifetime, owner failure and rollout

Owner loss, session crash or a fence change SHALL abort transient races without
inventing a winner and SHALL release local activity views; a successor SHALL use
a fresh session identity. Empty sessions SHALL terminate within 60 seconds after
outstanding reconnect grace; spectators alone SHALL NOT keep a session alive
indefinitely. A disabled feature flag SHALL fail admission closed with
`race_unavailable`, allow active races to finish or abort cleanly, and leave
other activities and retained world data untouched.

#### Scenario: Process failure

- **WHEN** the race process or room owner dies
- **THEN** participants see an interruption, recover world controls, and can
  request a fresh lobby after membership recovery, with no fabricated winner.

#### Scenario: Feature disabled

- **WHEN** the feature flag is off or the backend lacks support
- **THEN** the cabinet reports unavailable and no new session is created.

## Context

The Theater's east wall currently presents five upright cabinets — Pong, Rain
Runner, Signal Lost, Kart Royale, Summit Run — built by one canonical GLB +
data-skin system (`src/arcade/`) and driven by one canonical activity stack
(registry → runtime → participation → view lease). The repository now also
contains `games/downhill-mayhem`, a complete standalone downhill mountain-bike
racer (six-rider field, seeded procedural mountains, tricks/boost, punches and
kicks, AI, difficulty and results) whose simulation is already in compact
track-space state. Two prior changes supply the architecture this change needs:
Kart Royale hosts a separately developed Three.js game through the shared
renderer, view lease, staged preparation and resource ownership; Summit Run adds
authoritative race sessions, a deterministic fixed-step reducer, prediction,
interpolation, readiness, queues, reconnect/DNF and session-local results to the
existing Phoenix `SessionServer`.

This change repurposes the Signal Lost cabinet into the Downhill Mayhem cabinet
and makes the game a first-class, server-authoritative multiplayer activity. The
full repository archaeology — exact symbols, line numbers and risks — is in
`investigation.md`; this document resolves every architectural choice.

## Goals / Non-Goals

**Goals**

- Repurpose one existing cabinet without adding a machine or changing Theater
  geometry; leave Signal Lost dormant but intact.
- One game implementation with two hosts (standalone and Afterlight); no fork.
- Host Downhill Mayhem inside Afterlight with exactly one renderer, one primary
  RAF, one canvas/context and one application socket.
- A real authoritative multiplayer race: one to six humans, always six riders,
  shared deterministic course, server-owned physics, AI and combat, client
  prediction, remote interpolation, synchronized lobby/countdown/results,
  rematch without a page reload.
- Preserve Downhill Mayhem's distinguishing mechanics (tricks, boost, physical
  chaos, punches/kicks, multiple mountains, difficulty) and its standalone
  operation.
- Deterministic, leak-free lifecycle: enter → race → exit → re-enter, repeatedly.

**Non-Goals**

- No iframe/second app/second renderer/second RAF/second canvas/second socket,
  no peer-to-peer or browser-host authority, no WebRTC gameplay networking, no
  new matchmaking service or Phoenix app.
- No durable global leaderboard, esports ladder or cross-Theater matchmaking;
  session-local results only. Standalone PB/ghost/challenge links never become
  authoritative.
- No deletion of Signal Lost or any other activity.
- No full 3D live spectator camera as a release requirement.
- No general rigid-body engine; no trusted client transforms/scores/finishes/
  hits.
- No forced WebGPU migration; WebGL is the supported baseline.

## Reconciliation with unarchived changes

- `add-place-activities-program` / `orpheum-arcade`: its requirement that the
  Theater presents three original games including Signal Lost becomes two
  (Rain Runner, Signal Lost dormant) plus Pong, Downhill Mayhem, Kart Royale and
  Summit Run. Because the requirement exists only in an unarchived delta, it
  cannot receive a `MODIFIED` here; the supersession is recorded in the
  proposal banner and `design.md` and must be reconciled at archive time (the
  procedure `integrate-kart-royale-arcade` and `integrate-ssxtricky-snowboard`
  documented for their parents).
- `integrate-kart-royale-arcade`: its banner names Signal Lost in the active
  row; that placement is superseded here in the same partial way. Its runtime
  architectural requirements (one renderer, view lease, no iframe/second
  runtime, admission, deterministic exit) are **preserved and reused**.
- `add-multiplayer-snowboard-arcade` / `integrate-ssxtricky-snowboard`: this
  change **extends** the canonical activity/session/protocol/view-lease/audio
  infrastructure additively and does not supersede their requirements. Summit
  Run behavior is unchanged. The snowboard protocol validators are generalized
  rather than forked (D7).
- `fix-kart-royale-instant-entry`: its staged preparation, readiness barrier,
  graphics-job transaction, retention/eviction and allocation-ledger decisions
  are the loading model this change adopts (D17/D18). Kart's behavior is
  unchanged.

## Decisions

### D1 — Repurpose the Signal Lost cabinet, keep it dormant

The `orpheum-signal-lost` slot is the repurposed machine. Its exact transform is
reused: `position [10.42, 0, -3.85]`, `rotationY -Math.PI/2`; the east-wall bay
stud already exists, so `src/world/theaterWorld.js` is unchanged and the cabinet
count stays five.

Add `'downhill-mayhem'` to `ACTIVITY_TYPES`. Add `DOWNHILL_MAYHEM_CABINET` and
`DOWNHILL_MAYHEM_ACTIVITY_DEFINITION`, and replace `SIGNAL_LOST_ACTIVITY_DEFINITION`
in `ORPHEUM_ACTIVITIES` with the new definition. Keep
`SIGNAL_LOST_ACTIVITY_DEFINITION`, `SIGNAL_LOST_CABINET`,
`src/activities/signalLost.js`, `Afterlight.Activities.SignalLost` and their
tests exported/registered/dormant (exactly the Sporefall precedent).

```js
const DOWNHILL_MAYHEM_CABINET = Object.freeze({
  model: 'upright',
  skin: Object.freeze({
    title: 'DOWNHILL MAYHEM',
    tagline: 'RIDE • TRICK • FIGHT',
    motif: 'downhill',
    palette: Object.freeze({ base: '#10241d', ink: '#f2ecd9', accent: '#ff7a3c', glow: '#ffd166' }),
  }),
  led: Object.freeze({ color: '#ff7a3c', intensity: 1.6 }),
  controls: Object.freeze({ player1: '#ff7a3c', player2: '#ffd166' }),
  screen: Object.freeze({ type: 'canvas' }),
});

export const DOWNHILL_MAYHEM_ACTIVITY_DEFINITION = Object.freeze({
  id: 'orpheum-downhill-mayhem',
  type: 'downhill-mayhem',
  title: 'Downhill Mayhem',
  sub: 'Press E to ride · Ride · Trick · Fight',
  rulesVersion: 1,
  minPlayers: 1,
  readyPolicy: 'explicit',
  course: Object.freeze({ id: 'classic', version: 1 }),
  cabinet: DOWNHILL_MAYHEM_CABINET,
  transform: Object.freeze({ position: Object.freeze([10.42, 0, -3.85]), rotationY: -Math.PI / 2 }),
  footprint: Object.freeze({ width: 0.85, depth: 0.9 }),
  // 3.0 covers the farthest queue anchor (~2.48 from the machine) so the
  // server's seated proximity re-check can never eject an anchored rider.
  interactionRadius: 3.0,
  participantAnchors: Object.freeze([
    downhillAnchor(0, 9.30, -5.20),  // wall column
    downhillAnchor(1, 8.45, -4.80),  // aisle column
    downhillAnchor(2, 9.30, -4.30),
    downhillAnchor(3, 8.45, -3.80),
    downhillAnchor(4, 9.30, -3.30),
    downhillAnchor(5, 8.45, -2.80),
  ]),
  capacities: Object.freeze({ players: 6, spectators: 32, queue: 16 }),
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'downhillMayhemCabinet',
  controllerKey: 'downhill-mayhem',
});
```

`downhillAnchor(slot, x, z)` returns
`{slot, position:[x,0,z], facing:Math.PI/2, dismount:[{x: x < 9 ? 7.95 : 8.55, z}]}`.
Six anchors occupy the ~3 m of east-wall promenade between Rain Runner (z −5.9)
and the travel gate (z −1.2..1.2), staggered in two columns (x 9.30 wall side,
x 8.45 aisle side) so six riders queue without blocking the aisle. These
coordinates are a starting layout: `tests/arcade-cabinet.test.js`,
`tests/districts.test.js`-style reachability and the Orpheum clearance checks
must prove player/companion spawn clearance, every dismount walkable, and no
overlap with neighboring cabinet collision bands; the implementer may adjust
within those constraints. The cabinet's collision geometry, GLB and footprint
are unchanged.

`'downhill-mayhem'` is added to the race-type lists in
`scripts/export-place-definitions.mjs` (`RACE_TYPES`) and
`server_elixir/lib/afterlight/world/place_definitions.ex`
(`activity_race_problems/2`) so `minPlayers`/`readyPolicy`/`course` are
required and projected. Regenerate
`server_elixir/priv/place_definitions.json`; `--check` must be clean.

Artwork: add a `downhill` painter to `src/arcade/artwork.js` `MOTIFS` —
alpine ridgeline, a rider silhouette, dust/impact sparks and a warm-amber on
deep-green palette — with no new GLB and no external files. Add
`downhill-mayhem` to `src/ui/activityDiscovery.js` `labelForType`
(`"Downhill Mayhem"`).

Rejected: putting Downhill on a new cabinet (violates the fixed count and
layout), and deleting Signal Lost (destroys a complete game and its evidence).

### D2 — Host through the canonical activity stack; never an iframe

Structure: a tiny statically imported bystander module owns the cabinet and its
attract/occupied canvas and lazy-loads the controller; the lazy controller owns
participation, the view lease, prediction/interpolation/clock and networking;
the game runtime lives with the game and is imported only on entry.

```
src/activities/
  downhill-mayhem.js          static bystander: cabinet, display states, beginParticipation
  downhill/
    controller.js             lazy: participation, view lease, net, prediction/interpolation/clock,
                              capture-phase input, HUD mount, exit funnel
    scene.js                  lazy: render/contact terrain, riders, gates, effects, chase camera
    prediction.js             shared-rules local prediction + reconciliation
    interpolation.js          remote rider buffers
    clock.js                  RTT-midpoint shared-clock mapping
    hud.js / hud.css          scoped lobby/racing/results HUD
    audio.js                  host-mixer-aware synth voices
  downhillMayhemPreparation.js   prefetch/prepare/readiness/retain/evict (Kart pattern)

games/downhill-mayhem/
  index.html                  thin standalone shell (ES modules, shared three)
  standalone.html             BYTE-IDENTICAL preservation of the original offline single file
  package.json / vite.config.js
  src/
    standalone.js             standalone host: own renderer + RAF + local authority + PB/ghost/challenge
    game/
      course.js               loads a canonical document; sampler wrapper (shared/downhill)
      world.js                terrain/scenery/gates build (ported builders)
      riders.js               rider rigs + animation (ported riderVisual)
      rendering.js            scene/camera/lights/sky/fog/CRT/effects
      hud.js                  DOM HUD builders
      audio.js                AudioSys (external-context aware)
      effects.js              speed streaks, popups, hit flash
      input-adapter.js        key/touch/gamepad → control intents
    host/
      runtime.js              createDownhillMayhemRuntime (systems, update/present/resize, dispose)
      index.js                createDownhillMayhemHost (renderer/viewport/hud/audio/input/session)
      types.js                the host interface contract

shared/downhill/
  course.js                   canonical document load + sampler (browser-safe)
  courses/*.json              committed documents (classic/timberline/rockgarden)
  courseDocument.js           lazy JSON re-export (Summit Run pattern)
  courseHash.js               Node-only sha256 of canonical form
  rules.js                    deterministic fixed-step simulation (shared with Elixir)
  ai.js                       deterministic AI control generation (authority + fixtures)

server_elixir/lib/afterlight/activities/
  downhill_mayhem.ex                  pure rules/reducer
  downhill_mayhem/course.ex           document load + sampler
  downhill_mayhem/ai.ex               deterministic AI
  downhill_mayhem/session_policy.ex   lifecycle
  downhill_mayhem/presentation.ex     snapshot/summary builders
```

The runtime never owns the host renderer, canvas, RAF, socket, activity
registry, or global keyboard ownership. It may own a `Scene`, a
`PerspectiveCamera`, game objects, a HUD subtree, session audio voices and
game-specific input interpretation. Rejected: iframe (loses authority,
lifecycle, shared presence), a second `WebGLRenderer` (doubles context/memory),
and a `setRoom` destination (breaks social presence, chat and theater state).

### D3 — One shared Three.js instance; port off r128

Root already declares `three@^0.185.1` (installed 0.185.1) and the root↔
`games/kart-royale` version-sync test pins agreement. `games/downhill-mayhem`
gains a `package.json` declaring the **same** `three ^0.185.1` (plus its own dev
vite), so the root build resolves the single root `three` for hosted code and
the standalone dev server resolves its own copy. A root test
(`tests/downhill-mayhem-deps.test.js`) asserts version-range agreement with
`games/downhill-mayhem/package.json`.

The hosted modules import `three` as a bare specifier; the inlined r128 build is
**never** in the hosted path. The standalone entry becomes the ES-module shell
(`index.html` + `src/standalone.js`); the original self-contained file is
preserved byte-for-byte as `standalone.html` so the offline/itch artifact and
attribution survive. Porting r128→r185 requires: `BufferGeometry`/`InstancedMesh`
(already used), `outputColorSpace`/`SRGBColorSpace` (replace `outputEncoding`/
`sRGBEncoding`), light-intensity semantics (r155+ physical units: re-tune
`HemisphereLight`/`DirectionalLight` intensities against source screenshots),
`WebGLRenderer` property renames, and `Fog`/`MeshLambertMaterial` behavior
checks. The standalone rendering must be visually checked against the original
`standalone.html`; hosted must match the standalone.

### D4 — Six-rider human/AI population and rider identity

The race field is always six riders. Humans occupy the lowest free slots by
deterministic join order; AI fill the remainder at roster lock:

```
humans 0 -> 6 AI     humans 1 -> 5 AI     humans 2 -> 4 AI
humans 3 -> 3 AI     humans 4 -> 2 AI     humans 5 -> 1 AI
humans 6 -> 0 AI
```

Slots map to the source `START_LATS` (index = slot). A lone human starts and
plays immediately (`minPlayers: 1`); no second human is required.

Rider identity:
- Humans display their server-sanitized Afterlight nickname and profile accent.
- AI identities are chosen **server-side, deterministically**, from the source
  twenty-name `RIVAL_NAMES` roster and jersey palette, seeded from the match
  seed and slot, and published in every snapshot. Every client sees the same AI
  names/colors. A client never picks the AI roster locally.
- The `isAI` flag distinguishes AI from humans for presentation (label, accent
  fallback) but AI and humans share one simulation path (D6/D10).

AI population is recomputed on every lobby change (join/leave/queue promotion)
and frozen at countdown lock (D12). Mid-race a disconnected human is frozen
then DNF (D14); it is **not** converted into an AI mid-race.

### D5 — Deterministic canonical course representation

Downhill Mayhem's course is a pure function of a seed and mountain knobs
(`buildTrack`/`groundHeight`/`buildScenery`). To make it authoritative without a
nightly-diverging double implementation:

- **Canonical course document.** A versioned, hash-pinned numeric document
  contains: `id`, `version`, `rulesVersion`, `mountain`, `seed`, the terrain
  knobs, the **baked centerline/curvature/grade sample arrays** produced by the
  single JS generator, the drop and ramp lists, the finalized slalom-tree and
  rock-garden positions, `finishS`, and `startLats`. `shared/downhill/course.js`
  exposes `loadCourse(doc)` → a sampler (`centerAt`, `sampleTrack`,
  `heightAt(s,lat)`, `rampHeightAt`, `obstacleAt`) whose only shared math is
  linear/bilinear interpolation plus the small deterministic `hash2`/`vnoise2`
  relief function. Both runtimes evaluate the **same document with the same
  small sampler**; they never independently regenerate terrain for a live match.
- **Authored mountains** (Classic `classic`, Timberline `timber`, Rockgarden
  `rock`): documents are
  generated once by `scripts/export-downhill-courses.mjs` from
  `shared/downhill/course.js` and committed at
  `shared/downhill/courses/<id>.json` with byte-identical copies at
  `server_elixir/priv/downhill_courses/<id>.json`; a `--check` mode fails on
  drift (Summit Run's `snowboard_course.json` precedent).
- **Daily**: the seed is `utc_year*10000 + (month+1)*100 + day`, read
  authoritatively on the server. A day's document cannot be precommitted, so the
  **server generates it** with `Afterlight.Activities.DownhillMayhem.Course`
  (an Elixir port of the bounded generator) and publishes its `courseHash`. The
  client obtains the day's document from the server (a bounded
  `GET /api/downhill/course/daily?date=YYYYMMDD` cached until UTC midnight, or
  the join baseline) and **never generates the Daily itself**. This makes
  client/server drift impossible for a live Daily because both sides use the
  exact server bytes; the only remaining cross-language surface is the small
  sampler, pinned by golden fixtures. If a client's cached Daily document hash
  does not match the server's, the `loaded` handshake fails closed with
  `course_mismatch` (D7).
- **Identity and gating**: every match carries
  `{courseId, courseVersion, courseHash}`. The client reports its hash after
  load; the server rejects mismatches before readiness. A stale client therefore
  fails closed rather than racing a different mountain.
- **Provenance**: the JS generator remains the authoring tool and fixture
  oracle; the Elixir generator is pinned by golden fixtures for representative
  seeds (structural lists exactly equal; sampled heights within tolerance). The
  port is bounded to the integration loop + sampler; the elaborate segment
  generation for authored mountains is baked once.

Rejected: two independent runtime generators for every mode (unbounded nightly
drift); dropping the Daily (strips a distinctive mode); a full baked ground grid
(unbounded payload).

### D6 — Fixed-step authoritative simulation, shared rules

`shared/downhill/rules.js` is the single simulation core, extracted from
`riderStep`/`handleLanding`/`tryStrike`/trick logic with no Three.js, DOM, Web
Audio, `requestAnimationFrame`, `Date.now`, `performance.now` or `Math.random`.
It exposes:

```js
export const DT = 1 / 30;            // network tick
export const TICK_HZ = 30;
export const RULES_VERSION = 1;
export function initialRiderState(slot, { course, difficulty, isAI, seed }) {}
export function neutralControls() {}
export function normalizeControls(raw) {}
export function stepRider(course, rider, control, ctx) {}   // one rider, one fixed step
export function step(course, sim, controlsBySlot, ctx) {}   // whole field + AI + combat
export function worldPosition(course, rider, out) {}
```

The authority runs a fixed 30 Hz tick. To preserve the source's feel (the source
substeps when `dt > 0.022`), each 30 Hz tick internally evaluates the ported
physics at the source's two 1/60 substeps where the source would; the network
tick and snapshot cadence stay 30 Hz / 20 Hz. All gameplay randomness
(AI choices, crash spin only if it affects state — it does not, but AI does)
comes from a deterministic per-match RNG stream seeded by `(matchSeed, slot,
tick)`; the seven gameplay-affecting `Math.random()` sites in `aiThink`/
`makeRider`/`resetRiders` are replaced by that stream. Cosmetic-only randomness
(camera shake, speed streaks, audio noise buffer) stays client-local.

`step` order is the source order: timers → zone → grounded longitudinal/
lateral → hop → airborne → trick update → integrate/clamp/wall → detach →
landing → tree/rock collision → combat → finish/positions. The server owns
final state; clients never send positions.

### D7 — Input protocol and validation

Extend the existing activity protocol additively (Summit Run pattern). New
shared constants in `shared/activityProtocol.js`:

```js
DOWNHILL_MAYHEM_ACTIVITY_TYPE = 'downhill-mayhem'
DOWNHILL_COURSE_IDS = ['classic','timber','rock','daily']
DOWNHILL_MOUNTAINS = DOWNHILL_COURSE_IDS
DOWNHILL_DIFFICULTIES = ['chill','mayhem','brutal']
DOWNHILL_TRICKS = [null,'nohander','superman','heel','backflip']
```

Add `activity_config` to `ACTIVITY_COMMANDS`/the router/channel allow-lists and
`validateDownhillControls`/`validateDownhillFence` (strict allowlists mirroring
`validateSnowboardControls`). Motion controls:

```js
{ kind:'ride', steer:number[-1,1], pedal:bool, brake:bool, boost:bool,
  hopPressed:bool, punchPressed:bool, kickPressed:bool,
  trick:null|'nohander'|'superman'|'heel'|'backflip' }
{ kind:'neutral' }
{ kind:'loaded', courseId, courseVersion, courseHash }
{ kind:'lobby', mountain, difficulty }   // activity_config only
```

The client sends **intentions** only. It never sends positions, speeds, scores,
finish claims, hit claims or result fields (the existing `valid_controls?`
guard already forbids those). The envelope carries `sessionId`, `lease`,
`matchId`, monotonic lease-scoped `seq`, `roomEpoch`; wrong session/epoch/match/
lease/sequence and non-finite or out-of-range controls are rejected with the
existing typed errors plus new type-scoped codes (D12/D14). Inputs are bounded
to the existing 2 KiB/60 Hz ceilings (channel outer 70/s), controls actions to
5/s, resnapshot to one per 5 s. The server detects held-state edges (hop/punch/
kick/trick) from accepted controls and a `prevInputs` record, so a dropped
packet neutralizes rather than latches an action.

Protocol surface added:
- Client→server: `activity_join` (role play/watch/queue), `activity_leave`,
  `activity_ready`, `activity_config` (captain), `activity_input`
  (neutral/ride/loaded), `activity_resnapshot`.
- Server→client: `activity_state` (participant and `audience:'summary'`),
  `activity_event` (`countdown`, `match_started`, `rider_finished`,
  `rider_dnf`, `strike`, `match_ended`, `race_aborted`, `result_recorded`,
  `slot_offered`, `offer_expired`, `lobby_config`), `activity_result`
  (`seated`/`queued`/`watching`/`ready`/`input_accepted`/`loaded`/…), and the
  existing `activity_error` (`race_unavailable`, `not_loaded`,
  `course_mismatch`, `stale_match`, `stale_epoch`, `stale_sequence`,
  `invalid_request`, `not_captain`, `invalid_setting`, `slot_full`,
  `queue_full`, `rate_limited`, `payload_too_large`, `not_seated`,
  `server_busy`).

### D8 — Client prediction and reconciliation

The local human rider is predicted with the same `shared/downhill/rules.js`
`stepRider` at a fixed 1/30 accumulator (any FPS, ≤4 catch-up steps), keeping a
60-step history. The controller submits `(seq, controls)` to the predictor and
the network, renders the predicted rider immediately (no waiting for a
snapshot), and reconciles against the authoritative snapshot:
- reset to the authoritative state/tick and canonical held controls;
- discard prediction steps already represented by `appliedSeq` (never
  `lastAcceptedSeqs`, which is diagnostic only);
- replay remaining buffered samples with controls newer than `appliedSeq`;
- smooth small corrections (≤0.5 m over 100 ms); hard-reset on >3 m divergence or
  any mismatch in `crash`/`grounded`/`trick`/`finish`/`resetSeq`;
- freeze prediction after 250 ms without snapshots and show reconnecting after
  1 s; never invent offline distance.

Client-predicted combat/trick outcomes are cosmetic until the authoritative
`strike`/trick event confirms them; a mismatch corrects the rider on the next
snapshot. The predictor is deliberately the same code as the authority within
tolerances (D21).

### D9 — Remote interpolation and shared clock

Remote humans and server AI render from a snapshot/interpolation buffer:
100 ms delay (two 20 Hz snapshots), interpolation by authoritative `serverTick`
over position/velocity and derived orientation; extrapolate ≤100 ms then hold
stale with a connection indicator; drop wrong epoch/session/match and
non-increasing `snapshotSeq`; clear buffers on `resetSeq`, crash/recovery
teleports, DNF/finish and session change. The interpolation buffer is shared
logic (generalized from `src/activities/snowboard/interpolation.js`) and must
never animate across a recovery teleport. Discrete events (strike, crash,
trick) are applied from events and deduped by `eventId`; late snapshots do not
replay sounds.

Countdown uses a server monotonic target, published as epoch-ms `startAt` plus
`serverNow` for display only; the client converts to a `performance.now()`
deadline via the RTT-midpoint clock (generalized from
`src/activities/snowboard/clock.js`), and a large uncertainty shows "syncing"
without postponing the authoritative start. Wall-clock changes never move the
race.

### D10 — Server-owned AI through the same simulation

All fill AI is simulated by the authority using `Afterlight.Activities.
DownhillMayhem.AI` (a port of `aiThink`/`aiBoostWant`/`predictAirRemaining`/
`rampAheadFor`), producing the **same input shape** a human produces, which is
then fed through the same `stepRider` physics. There is no separate AI physics.
AI behavior preserves the source character: racing-line selection, corner speed
planning, braking/steering, ramp decisions, tricks, boost spending, punch/kick
windups, difficulty scaling (`pace/aggr/leash/corner/cd/rev`), rubber-banding and
comeback-company, and the revenge/grudge/hunter machine including BRUTAL
`huntRace`. All AI decisions use the deterministic per-match RNG stream, never
`Math.random`. The client only interpolates server AI; it never runs
authoritative AI.

### D11 — Server-owned human combat

The source punch/kick mechanic is retained in multiplayer. The client sends
`punchPressed`/`kickPressed` edges only; the server resolves the hit from
authoritative rider state in `step`: longitudinal distance `< PUNCH_S`,
lateral `< PUNCH_LAT`, vertical difference `< PUNCH_DY`, attacker cooldown,
victim invulnerability/finished/crashed state, strike legality for the current
(grounded/airborne) state, and windup timing. On a hit the server applies
knockdown, speed/vertical effects, meter payout (`HIT_METER`,
`AIR_STRIKE_METER`, `BOOST_STRIKE_METER`), grudge/revenge seeding, and emits a
`strike` event with attacker/victim/kind. The client may play the local punch
animation immediately and a provisional visual, but only the server decides
whether the strike lands. A message like "I hit player B" is never trusted.

### D12 — Lobby, captain, readiness and countdown

Server phases: `lobby → countdown → racing → results → lobby` plus `aborted`.
Client-only phases: `preparing/loading/joining/recovering/exiting`.

- **Lobby snapshot** shows: human roster with slots, AI filler slots
  (`DIESEL [AI]` style), current mountain, difficulty, ready count, queue/
  spectator counts, captain marker and an explicit exit. UI follows existing
  Afterlight panel conventions, not the source title screen.
- **Captain**: the first seated connected human is captain; the captain may
  change `mountain` and `difficulty` via `activity_config` while `lobby`. On
  captain exit before lock, leadership transfers to the longest-seated
  remaining connected human. Non-captain config attempts return `not_captain`.
- **Readiness**: explicit per rider (no auto-ready for `downhill-mayhem`); ready
  requires a matching `courseHash` load (`not_loaded`/`course_mismatch`
  otherwise); readiness expires after 60 s. All connected seated humans ready
  and count ≥1 locks the roster.
- **Countdown**: 3 s, synchronized `startAt`. Lock freezes roster, AI
  population, humans/AI slots, `courseId/seed/hash`, `difficulty`, `matchId` and
  the AI roster. Roster/settings are immutable after lock. Joining during
  countdown does not insert a rider. Pre-start inputs may update held state but
  produce no acceleration/boost/hop advantage.
- Downhill supports one to six humans (no "wait for two"), unlike Summit Run.

### D13 — Queue and late join

New participants after lock may watch public race progress (`role:'watch'`) and
queue for the next race (`role:'queue'`, FIFO cap 16). Queue promotion offers an
open human slot during `lobby`/`results` with a 30 s acceptance window and
re-checked room membership and proximity; a promoted rider replaces an AI slot
for the next match and begins unready. No promotion teleports a user or hijacks
a human slot; no AI is replaced mid-race. Watching does not capture input.

### D14 — Disconnect, reconnect and owner failure

- A disconnected active rider is frozen at its last valid authoritative state
  (or, if airborne, its state is resumed without an elapsed-time ballistic
  jump); the race clock continues for everyone. The slot is reserved for a
  30 s identity-bound reconnect grace.
- Reconnect revalidates identity and room membership, rotates the participant
  lease, restores the authoritative frozen state and elapsed time, and rejects
  pre-disconnect sequences. Grace expiry marks DNF once with reason
  `disconnect`; the rider may queue for a later race.
- Explicit leave/travel marks DNF `leave` immediately and releases the seat.
- A client that loses input focus neutralizes controls but does not pause the
  session or the shared clock.
- Owner loss/session crash/fence change aborts the transient race with no
  fabricated winner, releases local view/input, and lets users request a fresh
  lobby; a successor session has a fresh identity. Application reload starts in
  the social world; any resume hint contains only an activity id (never
  credentials/lease).

### D15 — Results and rematch

The server determines finish crossing, finish tick/time, place and DNF ordering
from authoritative ticks; ties within 1 ms share place; DNF sorts after finishes
by last checkpoint then progress and has no fabricated time. A first finisher
does not end the race: an overall 180 s deadline applies, and (source behavior)
a finishing rider locks its own result while others continue. Results list all
six riders (`place, name, time/DNF, AI marker`), with the source rank stamp
derived server-side. A rematch creates a **fresh match identity**, resets all
rider transient state (position, speed, tricks, boost, crash, combat, finish),
refills AI per currently seated humans, preserves the selected mountain/
difficulty unless changed in an unlocked lobby, clears prior results and starts
a new synchronized countdown without rebuilding the scene, reconnecting or
reloading. Queued humans are eligible to replace AI for the next match.

### D16 — Cabinet bystander display

The cabinet screen uses the existing lightweight `createScreenPipeline`/
`createArcadeCabinet` canvas composite, driven by `audience:'summary'` frames
only — never a second mountain render. States: **idle** (title, attract
animation, `PRESS E TO RIDE`), **lobby** (humans/seated count, ready count,
mountain, difficulty), **countdown** (status/number), **racing** (race time,
ranked progress bars/dots, human/AI distinction, checkpoint or distance),
**results** (winner, time, compact standings, rematch availability). Updates at
≤2 Hz plus immediate phase changes (existing throttling: attract ≤10 Hz,
hidden/distant zero). Bystanders get low-rate summaries; seated riders and
watchers get addressed full snapshots.

### D17 — Staged loading, preparation and prewarm

Reuse the landed Kart entry-readiness model (`kartRoyalePreparation.js`,
`kartRoyalePrepareScheduler.js`, `graphicsJobs.js`, `rendererPolicy.js`,
`kartRoyaleProximity.js`):

```
Theater entered
  → idle prefetch of the bystander controller module (visibility/save-data aware)
  → incremental hidden prepare of the game runtime within 2 ms idle / 4 ms near-cabinet
    frame budgets, yielding to input and pausing under another activity's lease
    or frame pressure, using graphics-job renderer transactions
  → proximity (ENTER 8 / EXIT 10 from the cabinet anchor) raises priority
  → readiness barrier: valid terrain/spawn data, posed selection/lobby camera,
    required materials/programs prepared, and one successful hidden full-frame render
  → E → parallel admission + (reuse or finish) preparation
  → atomic activation under the view lease → first visible frame
```

The runtime exposes `preload()`, `prepare({signal})`, `ready`,
`enter(sessionContext)`, `update(dt)`, `present()`, `resize(w,h)`, `dispose()`.
Preparation must never present an unposed camera or an under-map view, must be
cancellable and generation/attempt safe (late async results attach to nothing),
and must retain at most one prepared runtime in a bounded cache (60 s idle
eviction; travel/context-loss/quality-change invalidate). Downhill's world build
is smaller than Kart's, so the initial implementation may complete preparation
synchronously at E with the Theater visible and a cancellable status; the
staged path is still required so repeat entry is fast and E does not cold-build.

### D18 — Resource ownership and disposal

| Resource | Owner when hosted |
| --- | --- |
| Renderer, canvas, RAF, resize events, host composer, socket | Afterlight `main.js` |
| Scene, PerspectiveCamera, lights, terrain/scenery/riders, HUD DOM, game audio voices, input interpretation | Downhill Mayhem host runtime |
| Participation, anchors, dismounts, lease, snapshots, queue | `src/activities/participation.js` + Phoenix session |
| View lease, renderer-policy snapshot/restore, input suspension, `body` presentation | Afterlight (existing seams) |

On exit/release: release the lease (idempotent), stop music and transient
voices, detach capture-phase listeners and touch/gamepad listeners, hide/remove
the HUD root and body class, release the resource cache handle, and restore the
renderer policy (pixel ratio, size, tone mapping, exposure, color space, shadow
config, clear state) to the pre-entry Theater policy; retain the prepared
runtime only within the bounded cache. `dispose` is idempotent and walks every
system's teardown. Repeated enter/exit must not accumulate canvases, WebGL
contexts, handlers, resize observers, timers, intervals, animation loops, audio
nodes, HUD nodes, scene children, textures, render targets, subscriptions or
prediction buffers.

### D19 — Standalone preservation and provenance

`games/downhill-mayhem` remains one game with two hosts:
`src/standalone.js` creates its own renderer, RAF, local authoritative
simulation, local AI, `localStorage` PB/ghost and challenge links, and the
standalone GoatCounter analytics; the hosted path reuses `shared/downhill` rules,
`ai` and `course` plus `src/host`. Standalone-only features (title/select,
PB/ghost, challenge links, result-card sharing, analytics) stay standalone-only;
hosted mode disables GoatCounter and never reads `localStorage` for
authoritative state. Attribution/licensing are preserved: Apache-2.0 `LICENSE`,
`THREE.LICENSE`, and the original single file as `standalone.html`; the
downhill-mayhem README credits the original author (`pranshuparmar`) and the
fan-tribute/no-original-assets provenance. The hosted port keeps that notice.

### D20 — Feature flag, rollout and observability

Add `AFTERLIGHT_DOWNHILL_MAYHEM_ENABLED` (default false in prod, true in dev,
mirroring `AFTERLIGHT_SNOWBOARD_ENABLED`) and
`Afterlight.Activities.DownhillMayhem.enabled?/0`. Admission fails closed with
`race_unavailable` and starts no session when disabled; the cabinet shows a
rollout-safe unavailable/idle presentation and other activities are unaffected.
No database migration is required (session-local results). Races already in
progress finish within the 180 s deadline or are explicitly aborted on
emergency disable. The current single-owner-node admission constraint
(`Afterlight.Activities.Admission`) remains in force and is documented.

Telemetry `[:afterlight, :activity, :downhill_mayhem, join|start|leave|finish|
abort|overload|strike]` with low-cardinality measurements (humans, ai, seated,
queue, spectators, finished, tick debt, snapshot bytes) and metadata (phase,
reason, difficulty, mountain) — never player/session ids or secrets. Client
readiness/prep metrics reuse the Kart readiness pattern.

### D21 — Verification and performance gates

Full detail is in `specs/downhill-mayhem-verification/spec.md` and `tasks.md`.
Summary:
- Pure golden fixtures for course sampler, motion (accel/brake/steer/slope/
  jump/land/crash/boost/trick), combat (range/hit/miss/invuln/knockdown),
  AI decisions, finish/placement/ties; JS↔Elixir parity within 1 cm position /
  0.01 m/s velocity after a 180 s replay fixture, with identical structural
  event outcomes.
- Manifest/cabinet tests: type accepted, exact transform, one shared geometry,
  `downhill` motif uniqueness, Signal Lost dormant, active cabinet count five,
  no id collisions, capacities correct, projection parity.
- Networking tests: 1+5, 2+4, 6 humans; lobby/captain/settings/readiness/lock;
  late join/queue/promotion; rematch; disconnect/reconnect/grace/DNF; stale and
  malicious input; wrong match/session/course hash; duplicate connections;
  owner failure/fencing.
- Prediction/interpolation tests: replay, small/large correction, crash reset,
  missing/stale/out-of-order snapshots.
- Lifecycle soak: many enter/exit cycles with no growth in listeners, canvases,
  contexts, RAFs, timers, DOM, audio nodes, scene resources, subscriptions.
- Real two-browser gate (chromedriver, modeled on
  `scripts/snowboard-gate-browser.mjs`/`kart-royale-gate-browser.mjs`) exercising
  the acceptance path plus one-human, third-user queue, disconnect/reconnect,
  captain departure, failed course load and soak.
- Load characterization and resource budgets, measured not claimed.

## Risks / Trade-offs

- **[Large simulation extraction]** → slice `riderStep`/`aiThink`/`tryStrike`/
  course into runnable pieces with replay fixtures; port behavior, don't
  reinvent; keep standalone green at every step.
- **[JS↔Elixir numerical drift]** → one shared rules module, golden fixtures,
  hash-gated course identity, fail-closed readiness.
- **[Daily double generator]** → server is the only runtime Daily generator; the
  client uses the server's bytes; the JS generator is authoring/oracle only.
- **[AI randomness]** → one deterministic per-match RNG stream; remove
  gameplay `Math.random`.
- **[E conflict]** → capture-phase input ownership consumes E as punch; explicit
  Escape/Backspace/Exit-button exit; document in README.
- **[Shared renderer mutation]** → renderer-policy snapshot/restore plus
  graphics-job transactions for background work; no `await` while globally
  mutated.
- **[Loading]** → staged prefetch/prepare, readiness barrier, bounded retention;
  honest cold fallback with cancel.
- **[Combat/score trust]** → inputs only; server resolves hits, tricks,
  finishes and results.
- **[Concurrent unarchived changes]** → supersession recorded; preserve kart/
  snowboard code and re-read shared files during apply.
- **[Legacy r128 semantics]** → visual parity checks against
  `standalone.html`; re-tune lighting for r185.

## Migration Plan

1. **Contracts and manifest first** (no visible behavior change): add
   `'downhill-mayhem'` to the type lists, the definition and race fields,
   regenerate the projection, add the `downhill` motif, and land deps/version
   sync. Existing suites must stay green.
2. **Extract and verify the simulation core** (`shared/downhill`) and the
   standalone shell; standalone harness/visual parity must pass before hosting.
3. **Server authority** (`DownhillMayhem.*`, dispatch, feature flag) lands
   disabled; Elixir tests and JS↔Elixir parity must pass.
4. **Client integration** (`src/activities/downhill-mayhem.js` + controller/
   scene/prediction/interpolation/HUD/audio, view lease, input ownership,
   loading/prepare) behind the flag.
5. **Verification**: Node suite, Elixir suite, production build, real
   two-browser gate, lifecycle soak, load characterization, docs. Enable the
   flag only after the gates pass.
6. **Rollback**: disable new admissions; active races drain or abort cleanly;
   release views; revert the `ORPHEUM_ACTIVITIES` entry to Signal Lost (a
   two-line manifest revert, since Signal Lost stays dormant). Never delete
   `data/game-state.json`, IPTV/EPG snapshots or garden writers.

## Open Questions

None blocking; all architecture above is decided from repository evidence.
Deferred and explicitly out of scope for the initial release (candidates for
later changes): full 3D live spectator camera, durable/global leaderboards,
cross-Theater matchmaking, mobile touch parity beyond the existing adapter,
additional mountains beyond the source four, and a WebGPU render path.

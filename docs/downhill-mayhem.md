# Downhill Mayhem — multiplayer mountain-bike arcade

Downhill Mayhem is a six-rider, server-authoritative downhill mountain-bike race
in the Orpheum arcade, entered and exited inside the same Afterlight application.
It is the hosted form of `games/downhill-mayhem` — the standalone fan tribute to
*Downhill Domination* (PS2, 2003) — reusing the game's real mechanics
(tricks that charge boost, physical chaos, punches and kicks) behind one cabinet.

No iframe, second renderer, second canvas, second animation loop, second socket
or page reload: the mountain renders through Afterlight's existing renderer while
your social avatar waits at the cabinet and chat keeps flowing. Architecture and
decisions: `openspec/changes/integrate-multiplayer-downhill-mayhem-arcade/design.md`.
Cabinet authoring reference: `docs/arcade.md`.

> **Implementation status.** The cabinet manifest, shared simulation core,
> protocol validators, authoritative Elixir session, hosted client runtime,
> lobby/captain/queue UX, staged preparation, Daily delivery, telemetry and the
> browser gate all exist. `npm test`, `mix test` and `npm run build` are green.
> The two-browser gate phases that were run against the local stack pass
> (`doctor`, `entry`, `solo`, `captain`, `exit`, `soak`); see
> `openspec/changes/integrate-multiplayer-downhill-mayhem-arcade/evidence/`.
> The long two-browser `race`/`rematch` phases and the server load
> characterization remain open under `tasks.md` §15–16 because headless
> Chromium sessions on this machine kept crashing/timing out during
> multi-minute races; their status is reported honestly rather than claimed.

## The cabinet

Downhill Mayhem occupies the Orpheum's east-wall slot that previously held Signal
Lost (`transform.position [10.42, 0, -3.85]`, `rotationY -Math.PI/2`). The row
stays five machines — **Pong, Rain Runner, Downhill Mayhem, Kart Royale, Summit
Run** — and the Theater geometry is unchanged. Signal Lost remains in the
repository, registered and tested, but **dormant** (no Theater placement); it can
be re-placed by a future manifest edit.

The marquee reads **DOWNHILL MAYHEM**, tagline **RIDE • TRICK • FIGHT**, with a
distinct `downhill` artwork motif and warm-amber LED trim. The cabinet screen is
a low-rate canvas composite that shows the public race state to bystanders:
idle attract (`PRESS E TO RIDE`), lobby counts/ready/mountain/difficulty,
countdown, live ranked progress, and final standings. It is never a second
mountain renderer.

Walk up, press <kbd>E</kbd> (or the on-screen interact button): the game loads
with a cancellable loading state, you take a seat, and the lobby appears.

## Controls

Downhill Mayhem follows the standalone game's controls, remapped so the host's
<kbd>E</kbd> interaction is the punch during a race:

| Input | Action |
| --- | --- |
| <kbd>W</kbd> / <kbd>↑</kbd> | Pedal |
| <kbd>S</kbd> / <kbd>↓</kbd> | Brake — or backflip while airborne |
| <kbd>A</kbd> <kbd>D</kbd> / <kbd>←</kbd> <kbd>→</kbd> | Steer (hold a hard turn at speed to slide) |
| <kbd>Space</kbd> | Bunny hop — hop at a ramp lip for bonus air |
| <kbd>Z</kbd> <kbd>X</kbd> <kbd>C</kbd> | Air tricks: No Hander / Superman / Heel Clicker |
| <kbd>Shift</kbd> | Boost (drains the meter) |
| <kbd>E</kbd> | **Punch** a nearby rider — also mid-air |
| <kbd>F</kbd> | **Kick** — also mid-air; landed hits pay boost |
| <kbd>R</kbd> | Ready / rematch in the lobby and on results |
| <kbd>Esc</kbd> / <kbd>Backspace</kbd> | Exit the activity |
| Exit button | Exit the activity |

Because the host's <kbd>E</kbd> is the punch during play, leave with
<kbd>Esc</kbd>, <kbd>Backspace</kbd>, or the explicit Exit button — never by
pressing <kbd>E</kbd>. While racing, chat focus, typing, dialogs and window blur
neutralize your controls but never pause the shared race or clock.

The local rider is predicted with the same rules the authority runs (30 Hz
accumulator, replay/reconciliation), and remote humans and AI are interpolated
from authoritative snapshots with a short buffer. You never send positions,
scores, finishes or hit claims — only input intentions.

## Six-rider population

A field is **always six riders**. Humans take the lowest free slots in join
order; deterministic server-chosen AI fill the rest at roster lock:

```text
humans 0 → 6 AI    humans 3 → 3 AI
humans 1 → 5 AI    humans 4 → 2 AI
humans 2 → 4 AI    humans 5 → 1 AI    humans 6 → 0 AI
```

A lone human starts and plays immediately (`minPlayers: 1`); there is no
"wait for another rider" gate. AI names and jersey colours are chosen
server-side from the source twenty-name roster, seeded from the match seed and
slot, and published in every snapshot so all clients see the same field. AI and
humans share one simulation path: the server simulates every rider, including AI.

A disconnected human is frozen at its last valid authoritative state (never
converted into AI mid-race) and reserved for a 30-second reconnect grace; when
the grace expires the rider is marked DNF (`disconnect`) once, and the race
continues for everyone else.

## Mountains and difficulties

**Mountains** (captain-selected in the lobby):

- **CLASSIC** — the canonical course; alpine frost into warm canyon, the
  all-rounder.
- **TIMBERLINE** — dense forest, tight rhythm, slalom tree weaves.
- **ROCKGARDEN** — wide, steep, littered with rock gardens; read them early.
- **DAILY** — a brand-new mountain from today's UTC date, identical for every
  player in the world. The **server** generates the Daily and publishes its
  `courseHash` at `GET /api/downhill/course/daily` (bounded `?date=YYYYMMDD`
  accepted within ±366 days); clients fetch the document and never generate it
  independently, so a stale client fails closed with `course_mismatch` instead
  of racing a different hill.

**Difficulties**: <kbd>R</kbd>… captain-selected in the lobby as
**CHILL**, **MAYHEM** (the game as designed) or **BRUTAL** (faster rivals, boost
on the gate, relentless revenge). Difficulty scales the AI's pace, cornering,
boost spending, swing cadence and revenge machine.

## Lifecycle

- **Lobby** — seated humans see the roster with slots, AI filler slots, the
  current mountain, difficulty, ready count, queue/spectator counts, the captain
  marker and an explicit exit.
- **Captain** — the first seated connected human is captain and may change
  mountain/difficulty while in the lobby (the captain-only `‹`/`›` cyclers in
  the lobby panel). Every change is authoritative via `activity_config`;
  non-captains get `not_captain`. On captain departure before lock, leadership
  transfers to the longest-seated connected human. Changing the mountain
  invalidates every rider's loaded course and readiness, and each client reloads
  the selected document before it can ready again.
- **Readiness** — explicit per rider; ready requires a matching course-hash load
  (`not_loaded` / `course_mismatch` otherwise) and expires after 60 s. All
  connected seated humans ready with at least one human locks the roster.
- **Countdown** — a 3-second, server-synchronized 3-2-1 (`startAt` published with
  `serverNow`; the client maps it to its own monotonic clock). Lock freezes
  roster, AI population, course identity, difficulty and match identity.
  Joining during countdown does not insert a rider.
- **Racing** — 30 Hz authoritative simulation; clients predict their own rider
  and interpolate the rest. The race never pauses: the race clock continues
  through disconnects, and a 180-second deadline applies.
- **Results** — server-ordered places from authoritative ticks; ties within
  1 ms share a place; DNF sorts after finishes with no fabricated time. Results
  are **session-local**. Rematch is explicit readiness from results and rotates
  the match identity, resetting all rider state without a reconnect, reload or
  scene rebuild.

New participants after lock may **watch** public race progress and **queue**
(FIFO) for the next race; pressing <kbd>E</kbd> at a busy cabinet queues you and
the panel offers "watch live" / "leave queue". A queue promotion during
lobby/results offers an open human slot with a 30-second acceptance window
(<kbd>R</kbd> or the Accept button) and re-checks room membership and proximity.
Watching never captures input, and no promotion teleports a user or hijacks a
human slot.

The mountain is prepared ahead of entry where the renderer supports it: after
the controller module is prefetched, the host loop may build and pose one
hidden game runtime in a graphics-job renderer transaction (2 ms idle / 4 ms
near-cabinet budget, paused under a lease, frame pressure or a hidden tab). The
prepared runtime is retained for a fast re-entry; if the captain selects another
mountain the retained runtime is released and rebuilt. Entry readiness requires
finite rider/grid state on valid course support, a posed lobby camera, prepared
programs and one hidden full-aspect frame; until then the activity presenter is
a strict no-op. Local entry-readiness samples are exposed read-only at
`window.__afterlight.downhillReadinessMetrics()` behind `?debug=1`.

## Enabling and rollout (operations)

Admission is gated by the backend flag, mirroring Summit Run and defaulting to
disabled in production (enabled in local dev):

```sh
AFTERLIGHT_DOWNHILL_MAYHEM_ENABLED=1   # enable admission (default: disabled)
```

- When disabled (or against a backend without the type), the cabinet reports the
  activity unavailable, no session is created, and the rest of the world, the
  Theater and the other cabinets work unchanged. Clients treat the flag as
  presentation only — it is **not** a security boundary; the server fails
  admission closed with a typed `race_unavailable` error.
- **Emergency abort/drain**: disable the flag, then let active races finish
  within the 180-second deadline (existing races are unaffected by the flag) or
  restart the Phoenix node for an immediate abort. Aborted races produce no
  winner, clients recover to world controls, and successor sessions use fresh
  identities.
- **Rollback**: disabling the flag is sufficient. No database migration is
  involved (results are session-local) and no retained world snapshot data
  (`data/game-state.json`, IPTV/EPG) is touched. Reverting the manifest entry to
  Signal Lost is a two-line change, since Signal Lost stays dormant in the
  repository.
- **Single-owner-node constraint**: duplicate-connection prevention is a
  node-local admission registry (`Afterlight.Activities.Admission`). Release v1
  is supported only on the current single-owner-node deployment; multi-owner
  rollout requires a global admission/fencing gate first.
- **Observability**: bounded, low-cardinality telemetry at
  `[:afterlight, :activity, :downhill_mayhem, join|start|leave|finish|abort|overload|strike]`
  (humans, AI, seated, queue, spectators, finished, tick debt, snapshot bytes) —
  never player/session ids or secrets.

## Provenance and attribution

Downhill Mayhem is a fan-made tribute and is redistributed with its notices
intact:

- **Original game** — `games/downhill-mayhem`, authored by **Pranshu Parmar
  (`pranshuparmar`)**; source README:
  `games/downhill-mayhem/README.md`. Fan-made tribute, **not affiliated with Sony**
  or the original developers. No original game assets are used — every model is
  built from Three.js primitives, every texture is canvas-generated, every sound
  is synthesized at runtime.
- **License** — Apache-2.0; full text at `games/downhill-mayhem/LICENSE`
  (Copyright 2026 Pranshu Parmar).
- **Three.js** — MIT; full text at `games/downhill-mayhem/THREE.LICENSE`
  (Copyright © 2010-2021 three.js authors).
- The original self-contained offline single file is preserved byte-for-byte as
  `games/downhill-mayhem/standalone.html`, so the offline/itch artifact and its
  attribution survive the refactor.

### Three.js r128 → r185 port note

The original standalone shipped an inlined **three.js r128**. The refactored
standalone shell and the hosted runtime share the repository's single
`three@^0.185.1`; the inlined r128 build is never in the hosted path. Porting
r128 → r185 required:

- `outputEncoding` / `sRGBEncoding` → `outputColorSpace` / `SRGBColorSpace`;
- r155+ physical light units — `HemisphereLight` / `DirectionalLight` intensities
  re-tuned against the source screenshots;
- `WebGLRenderer` property renames;
- `BufferGeometry` / `InstancedMesh` and `Fog` / `MeshLambertMaterial` behavior
  checks.

Visual parity is checked against the preserved `standalone.html`; hosted
rendering must match the standalone shell.

## Known limitations (honest v1)

- **No full 3D spectator camera.** Spectating is the cabinet's low-rate canvas
  display; a live 3D camera is a deferred candidate, not a release requirement.
- **Session-local results.** There is no durable global leaderboard, esports
  ladder or cross-Theater matchmaking. Standalone personal bests / ghosts /
  challenge links remain standalone-only and are never authoritative. GoatCounter
  analytics stays standalone-only and is disabled when hosted.
- **No second host primitive by design.** One renderer, one primary animation
  loop, one canvas/WebGL context and one application socket are hard contracts,
  not current limitations — but they also mean no independent spectator window.
- Mobile/touch parity is limited to the standalone game's own adapter; the
  hosted v1 targets desktop keyboard play.
- The four source mountains/difficulties are preserved; there are no additional
  mountains beyond them.
- WebGL is the supported baseline; there is no WebGPU dependency.

## Load characterization

Verification spec "Measured load capacity" requires measured, not asserted,
capacity: concurrent sessions with six simulated riders each through the real
transport, covering session **tick cost** (30 Hz reducer), **snapshot
serialization** and message rate, **BEAM scheduler impact**, **memory per
session**, garbage-collection behavior, and the **effect on normal social rooms**.
Reported capacity must state hardware/build/configuration and drive the initial
rollout limit.

`tools/load_client/` exists and a six-riders-per-session scenario has been added
(`tools/load_client/scenarios/downhill-six.json`). **Caveat:** the current load
client drives presence/transport (Phoenix channel join, movement, durable
commands, reconnect) — it does **not** yet speak the activity protocol
(`activity_join` / `activity_ready` / `activity_input` with `lease`/`sessionId`
state). Until that driver is added, the scenario characterizes the Theater-room
presence and transport load of six players per table, not the full authoritative
race tick. The activity-driving extension and the measured capacity report remain
open work under `tasks.md` §16.

## Verification

- **Pure parity** — golden movement/combat/AI fixtures are reproduced by the
  Elixir authority within ≤1 cm / 0.01 m/s with identical structural outcomes
  (JS `shared/downhill`, Elixir `Afterlight.Activities.DownhillMayhem`).
- **Browser gate** — `node scripts/downhill-mayhem-gate-browser.mjs [phase]`:
  two-browser walk-up <kbd>E</kbd> entry, shared lobby, captain settings,
  explicit readiness, synchronized countdown, racing, authoritative strike
  agreement, jump/trick/boost, finishes, identical standings, rematch and exit
  using real controls. Additional phases cover one-human races, third-user queue,
  disconnect/reconnect, grace expiry, captain departure, failed course load and a
  repeated enter/exit soak. Requires chromedriver on `:9515` and the dev stack;
  point `GATE_APP` at a production build (e.g. `vite preview`) to avoid dev-HMR
  reloads during a multi-minute race. Run `doctor` first if the debug hooks are
  missing.
  **Verified on this machine:** `doctor`, `entry` (two-browser shared
  2-human + 4-AI lobby, identical field/mountain/difficulty), `solo` (full
  one-human race to results), `captain` (leadership transfer), `exit` (clean
  teardown and restored world controls) and `soak` (3 cycles, one renderer/
  context, no HUD/body-class growth). Screenshots:
  `openspec/changes/integrate-multiplayer-downhill-mayhem-arcade/evidence/`.
  The long two-browser `race`/`rematch` phases reached a synchronized countdown
  and results with matching standings in one run, but repeated headless-browser
  crashes under memory pressure prevented a full green run; they remain open
  verification work, not claimed as passed.
- **Lifecycle soak** — repeated enter/exit cycles assert no growth in listeners,
  canvases, contexts, animation loops, timers, DOM, audio nodes or scene
  resources, and that renderer state returns to the pre-entry policy. Node-side
  soak: `tests/downhill-lifecycle-soak.test.js`; browser-side: the `soak` gate
  phase.

> **PARTIAL SUPERSESSION NOTICE.** This change repurposes the
> `orpheum-signal-lost` cabinet on the Orpheum arcade row. Two unarchived
> changes state the active row differently:
>
> - `add-place-activities-program` (capability `orpheum-arcade`) requires three
>   original games including Signal Lost.
> - `integrate-kart-royale-arcade` (proposal banner) says the row presents
>   "Pong, Rain Runner, Signal Lost, **Kart Royale** and Summit Run".
>
> After this change the active row is **Pong, Rain Runner, Downhill Mayhem,
> Kart Royale and Summit Run**. Signal Lost's activity definition,
> `src/activities/signalLost.js`, `shared/placeDefinitions.js` cabinet block,
> Elixir `Afterlight.Activities.SignalLost`, and its tests remain in the
> repository **dormant** (no Theater placement), re-placeable by a future
> manifest edit. Because both `orpheum-arcade` and the Kart requirements exist
> only as unarchived change deltas, they cannot receive a `MODIFIED`
> requirement here (the same constraint `fix-pool-cue-sensitivity` hit against
> `social-billiards`); the supersession is recorded in this banner and
> reconciled at archive time in `design.md` §Reconciliation.

## Why

Afterlight already hosts a complete, deterministic, single-player downhill
mountain-bike racer at `games/downhill-mayhem` (~2.7k lines of game logic plus
an inlined Three.js r128): six-rider fields, seeded procedural mountains
(Classic, Timberline, Rockgarden and a UTC-date Daily), tricks that charge a
boost meter, physical chaos, punches and kicks, AI rivals, difficulty scaling
and authored results. It is a standalone single-file `index.html` with no
network layer. Afterlight also now has two proven precedents that together make
real multiplayer integration practical without inventing anything:

- **Kart Royale** repurposed a Theater cabinet, lazily loads a separately
  developed Three.js game into the host renderer through the activity view
  lease, stages preparation and rejects iframe/second-renderer hosting.
- **Summit Run** extends the Phoenix `SessionServer` with a race lifecycle, a
  deterministic fixed-step authoritative reducer, client prediction and remote
  interpolation, explicit readiness, queues, reconnect/DNF and session-local
  results.

Downhill Mayhem's simulation is already expressed in compact track-space state
(`s` along the course, lateral offset, height, forward/lateral/vertical
velocity, grounded, trick/combat/crash/finish state) rather than arbitrary
rigid-body transforms, which is exactly what makes bounded authoritative
multiplayer feasible on BEAM. This change turns the former Signal Lost cabinet
into the **Downhill Mayhem** cabinet and makes the game a first-class,
server-authoritative, up-to-six-human multiplayer arcade activity with AI fill,
fighting, tricks, boost, shared results and rematch — without an iframe, a
second renderer, a second canvas, a second animation loop, a second socket or a
page reload.

## What Changes

- **Repurpose one existing Theater cabinet.** `orpheum-signal-lost` (east wall,
  `transform.position [10.42, 0, -3.85]`, `rotationY -Math.PI/2`) becomes
  `orpheum-downhill-mayhem` with a new `downhill-mayhem` activity type, a new
  `downhill` artwork motif, marquee `DOWNHILL MAYHEM`, tagline
  `RIDE • TRICK • FIGHT`, and interaction copy `Press E to ride`. Cabinet count
  stays five; `theaterWorld.js` geometry is unchanged. Signal Lost leaves
  `ORPHEUM_ACTIVITIES` but stays exported, registered and tested (dormant).
- **Refactor the game into a reusable hosted runtime** under
  `games/downhill-mayhem/src/` (shared three dependency, no inlined r128 in the
  hosted path), with a thin standalone shell so `npm run dev` / `npm run build`
  keep the standalone game playable. The hosted runtime exposes lifecycle
  responsibilities equivalent to `preload/prepare/enter/update/present/resize/
  dispose` and never owns the renderer, the primary RAF, a second canvas or a
  socket.
- **Extract a deterministic, renderer-free simulation core** into
  `shared/downhill/` (`rules`, `ai`, `course`): pure `step` from authoritative
  state plus bounded inputs, deterministic seeded randomness, and an
  authoritative canonical course representation shared with Elixir.
- **Authoritative multiplayer through the existing activity infrastructure.**
  Extend `Afterlight.Activities.SessionServer` with a `downhill-mayhem` race
  policy (`Afterlight.Activities.DownhillMayhem` + `.SessionPolicy` + `.AI` +
  `.Course` + `.Presentation`), reusing owner fencing, admission, queue,
  reconnect grace and bounded addressed delivery. Server simulates all six
  riders at a fixed 30 Hz tick; clients predict only their own rider and
  interpolate the rest. AI fill is server-simulated. Combat is server-resolved
  from authoritative state.
- **Lobby, captain, readiness, countdown, queue, late join, results and
  rematch**, preserving Downhill Mayhem's four mountains and three
  difficulties, with the first seated human as session captain.
- **Cabinet bystander display** through the existing lightweight canvas
  pipeline: idle/attract, lobby, countdown, racing progress and results — never
  a second mountain renderer.
- **Staged loading and prewarm** modeled on the Kart Royale entry-readiness
  work, so pressing E does not start a cold multi-second build.
- **Verification gates**: manifest/cabinet tests, pure-simulation golden
  fixtures with JS↔Elixir parity, networking and prediction tests, lifecycle
  leak soaks, a real two-browser end-to-end gate, load characterization and
  observability, behind a fail-closed feature flag.

## Capabilities

### New Capabilities

- `downhill-mayhem-arcade`: the repurposed physical cabinet — identity,
  discovery, prompt, lazy entry, attract/occupied display, social presence,
  dormant Signal Lost, and non-interference with the other Orpheum activities.
- `downhill-mayhem-runtime`: the hosted game lifecycle — renderer/view/input/
  HUD/audio ownership, staged loading, deterministic exit and restart, reentry
  hygiene, failure/cancellation behavior, and preservation of the standalone
  game and its appearance.
- `downhill-mayhem-multiplayer`: the authoritative race — session scoping,
  six-rider human/AI population, deterministic course, fixed-step simulation,
  input protocol and validation, prediction/reconciliation/interpolation,
  server-owned AI and combat, lobby/captain/readiness, queue/late join,
  disconnect/reconnect, results/rematch, bounded delivery and owner failure.
- `downhill-mayhem-verification`: automated unit/integration/browser gates,
  resource-leak budgets, load characterization and operational visibility.

### Modified Capabilities

None. `orpheum-arcade` and all activity/race capabilities exist only as
unarchived change deltas (`add-place-activities-program`,
`add-multiplayer-snowboard-arcade`, `integrate-kart-royale-arcade`,
`fix-kart-royale-instant-entry`); requirement-level modification is unavailable
to this change. The reconciliation is recorded in `design.md` §Reconciliation.

## Impact

- **Manifest/server projection**: `shared/placeDefinitions.js`
  (`'downhill-mayhem'` in `ACTIVITY_TYPES`, `DOWNHILL_MAYHEM_CABINET` +
  `DOWNHILL_MAYHEM_ACTIVITY_DEFINITION`, `ORPHEUM_ACTIVITIES` swap),
  `scripts/export-place-definitions.mjs` (race-type list) →
  `server_elixir/priv/place_definitions.json`,
  `server_elixir/lib/afterlight/world/place_definitions.ex` (race-type list).
- **Client**: `src/activities/downhill-mayhem.js` (bystander, static) and
  `src/activities/downhill/{controller,scene,prediction,interpolation,clock,hud,audio}.js`
  (lazy); `src/main.js` (static import; existing `present` lease hook and
  renderer-policy seam reused); `src/arcade/artwork.js` (`downhill` motif);
  `src/ui/activityDiscovery.js` (label); `src/style.css` (activity presentation
  class).
- **Simulation (single source)**: new `shared/downhill/` (`course.js`,
  `rules.js`, `ai.js`, `courseDocument.js`, `courseHash.js`, committed course
  documents) plus `games/downhill-mayhem/src/**` host/game modules.
- **Server**: `server_elixir/lib/afterlight/activities/downhill_mayhem.ex`
  (rules), `.../downhill_mayhem/session_policy.ex`, `.../downhill_mayhem/ai.ex`,
  `.../downhill_mayhem/course.ex`, `.../downhill_mayhem/presentation.ex`;
  dispatch clauses and feature flag in `session_server.ex`, `activities.ex`,
  `config/runtime.exs`.
- **Protocol**: `shared/activityProtocol.js` (type/course constants,
  `validateDownhillControls`/`validateDownhillFence`, error codes);
  `src/net/client.js` send path.
- **Game package**: `games/downhill-mayhem/package.json`, `vite.config.js`,
  refactored `index.html` shell; root `package.json` keeps one shared
  `three@^0.185.1` (already present) and a root↔game version-sync test.
- **Docs**: `README.md`, `docs/arcade.md`, new `docs/downhill-mayhem.md`,
  `AGENTS.md` repository-map row.
- **Build**: no iframe, no second canvas/renderer/RAF/socket; the lazy game
  chunk grows the existing >500 kB warning (documented, not silenced).

### Non-goals

- No iframe, second application, second renderer/canvas/RAF/WebGL context,
  second socket, peer-to-peer authority, browser-host authority, WebRTC
  gameplay networking or a new matchmaking service.
- No second backend service or Phoenix app; no rewrite of the activity
  framework; no replacement of Phoenix.
- No durable global leaderboard, esports ladder or cross-Theater matchmaking;
  results are session-local. Standalone PB/ghost/challenge-link persistence is
  standalone-only and never authoritative.
- No deletion of Signal Lost (or any other activity).
- No full 3D live spectator camera as a release requirement; the cabinet
  bystander display is a low-rate canvas render.
- No general rigid-body physics engine and no trusted client transforms,
  scores, finish claims or hit claims.
- No forced WebGPU migration; the supported backend remains the host WebGL
  renderer.
- No arbitrary rewrite of Downhill Mayhem's art or gameplay; the port preserves
  its mechanics within the tolerances in `design.md`.

# Reference implementation investigation

Inspected 2026-09-08. This records existing implementation evidence, not promised Afterlight behavior. Proposed integration decisions are normative only where incorporated into design and specification files.

## Source and provenance

The available reference checkout is `SSXTricky/`, origin `git@github.com:melpomenex/SSXTricky.git`, HEAD `e87f6c7dc80d1a3d440acbd8b44db8597b263c9d` (2026-09-06). The sibling `../SSXTricky` resolves to the same commit. The inspected nested checkout had only untracked `.zcode/plans/` changes. No source changes were made during investigation.

The user identifies this as their project and authorizes using it as a gameplay/implementation reference. No LICENSE is tracked and `SSXTricky/package.json` has no license field: do not describe it as MIT-licensed or infer a third-party distribution license. When adapting source, record the source path and commit. `SSXTricky/README.md:3` states that geometry and rider models are generated locally and original game assets are absent. Inspection supports procedural geometry/materials/audio; it does not independently prove historical authorship. The only tracked public asset is `SSXTricky/public/favicon.svg`. Original SSX branding appears in `SSXTricky/app/page.tsx` and `SSXTricky/app/layout.tsx`; it must not transfer to Afterlight.

## Actual implementation

Ripwire first mapped `SSXTricky/` and ranked `lib/game/engine.js:createGame`, `tick`, `rules.mjs:stepMotion` and course helpers. Their bodies, the React shell, package metadata, README, tracked-file inventory and rule tests were inspected.

This is a single-course JavaScript/Three.js WebGL prototype with a Next.js/React HUD, five scripted AI rivals, three tricks and client-local race state. It is not multiplayer. It has no checkpoint validation, authoritative finish, persistent results, custom shaders or WebGPU path. Its README explicitly identifies it as a prototype, with no controller support, rails, campaign or original music.

Movement is an arcade target-speed model. It advances distance automatically and damps lateral velocity toward steering input. Ground slope does not accelerate the board. Airborne motion applies vertical gravity. “Carving” is a sustained-steering condition that earns boost; it is not edge-angle or grip simulation. These distinctions matter when defining what will be adapted.

## Subsystem disposition

| Subsystem | Classification | Evidence and rationale |
| --- | --- | --- |
| Terrain generation | ADAPT | `SSXTricky/lib/game/engine.js:29–45`, `SSXTricky/lib/game/rules.mjs:3–4`: winding sine centerline, downhill heightfield and raised banks. Convert to versioned course data and one canonical sampler. |
| Snowboard movement | ADAPT | `SSXTricky/lib/game/rules.mjs:9–31`: distance plus damped lateral velocity provides a compact arcade starting point, not rigid-body board dynamics. |
| Gravity | REWRITE | `SSXTricky/lib/game/engine.js:182`: `vy -= 20 * dt` applies only in air. Extract into explicitly ordered fixed-step authority/prediction rules; do not claim existing slope gravity. |
| Acceleration | ADAPT | `SSXTricky/lib/game/rules.mjs:17–24`: target-speed smoothing; normal speed 29, tuck/lean up to 42, boost 48/56, brake 10. Treat these as prototype tuning. |
| Turning/carving | ADAPT | `SSXTricky/lib/game/rules.mjs:19–29`: steering targets 20 lateral units/s, tuck 14, air 13. Preserve control feel without importing the trick/boost economy. |
| Jumping | ADAPT | `SSXTricky/lib/game/rules.mjs:5,48–51,81`, `SSXTricky/lib/game/engine.js:136,172–181`: charged release and speed-dependent ramp launch are useful pure-rule starting points. |
| Airborne control | ADAPT | `SSXTricky/lib/game/rules.mjs:26`, `SSXTricky/lib/game/engine.js:182–194`: reduced lateral control and ballistic y, currently coupled to tricks. Remove that coupling. |
| Landing | REWRITE | `SSXTricky/lib/game/rules.mjs:68–75`, `SSXTricky/lib/game/engine.js:190–194`: height crossing snaps y; bail is based on unfinished trick duration. Specify contact crossing and recovery independently. |
| Collision | REWRITE | `SSXTricky/lib/game/rules.mjs:29–30`, `SSXTricky/lib/game/engine.js:199`: shoulder clamp/slow and coarse AI overlap bumps only. Trees, lift and gates are decorative. Define authoritative boundaries; racers should not collide in v1. |
| Slope handling | REWRITE | `SSXTricky/lib/game/rules.mjs:4,44–47`, `SSXTricky/lib/game/engine.js:207`: height samples, fixed rider pitch and ramp override. Derive contact normal from the canonical course sampler. |
| Camera | ADAPT | `SSXTricky/lib/game/engine.js:220–222`: smooth rear chase/lookahead and speed FOV. Adapt camera math to host-owned active-camera lifecycle. |
| Checkpoints | REWRITE | `SSXTricky/lib/game/engine.js:68–71`: gates at 600/1200 are cosmetic. Ordered swept-plane validation must be new. |
| Race logic | REWRITE | `SSXTricky/lib/game/rules.mjs:7`, `SSXTricky/lib/game/engine.js:117–118,198–200`: local AI progress and timer, with no membership or authority. |
| Finish logic | REWRITE | `SSXTricky/lib/game/engine.js:200`: local `distance >= COURSE_LENGTH` finishes immediately. Server must validate progression and assign finish ordering. |
| Course geometry | ADAPT | `SSXTricky/lib/game/engine.js:29–105`, `SSXTricky/lib/game/rules.mjs:38–47`: procedural terrain, peaks, pines, ramps and lift are reusable construction techniques; group, instance and retheme them. |
| Effects | ADAPT | `SSXTricky/lib/game/engine.js:120–124,202,212–218`: fixed-array snow particles and contact shadow are useful patterns, subject to host lifecycle and quality settings. |
| Input handling | REWRITE | `SSXTricky/lib/game/engine.js:137–150`, `SSXTricky/app/page.tsx:15`: independent window listeners and local pause conflict with host input ownership and multiplayer. Mobile touch is outside v1. |
| Renderer | DO NOT USE | `SSXTricky/lib/game/engine.js:5–22,153–155,224`: creates its own renderer, canvas, observer and RAF. Integrate geometry into Afterlight instead. |
| Asset pipeline | DO NOT USE | `SSXTricky/package.json`, `SSXTricky/lib/game/engine.js:24–27,65–67`: Next/React shell and procedural constructors provide no transferable GLB pipeline. Use host loading/cabinet facilities. |
| Shaders | DO NOT USE | `SSXTricky/lib/game/engine.js` uses stock MeshStandardMaterial, MeshBasicMaterial and PointsMaterial. There is no custom shader implementation to extract. |
| Snow rendering | ADAPT | `SSXTricky/lib/game/engine.js:29–45,120–124`: vertex-color rough snow and points offer a low-cost starting direction; retheme for Afterlight. |
| Game loop | REWRITE | `SSXTricky/lib/game/engine.js:155–225`: monolithic variable-step simulation/render/HUD, dt capped at .04. Replace ownership with host update and bounded fixed-step simulation. |
| State management | REWRITE | `SSXTricky/lib/game/engine.js:127–135,152,227`: mutable local closure and ready/countdown/running/paused/finished phases. Backend lifecycle and local presentation must be separate. |
| Small pure utilities | REUSE DIRECTLY | `SSXTricky/lib/game/rules.mjs:2,5`: clamp and bounded charge formula are pure, but use host equivalents where present and put tuning in versioned race rules. This classification does not justify copying duplicates. |
| Tricks, AI and branded UI | DO NOT USE | `SSXTricky/lib/game/rules.mjs:6–7,33–36,53–75`, `SSXTricky/lib/game/engine.js:117–118`, `SSXTricky/app/page.tsx`: v1 non-goals and incompatible standalone/SSX presentation. |

## Correctness and performance observations

The terrain mesh adds noise beyond lateral distance 29 (`SSXTricky/lib/game/engine.js:35–36`), while `groundHeight` excludes that noise and movement permits distance 35 from the centerline. Some reachable visual terrain therefore disagrees with collision height. Adaptation must eliminate this discrepancy: rendering, grounded contact, ramp contact, normals and server progression use the same course data. Decorative noise stays outside the legal corridor or becomes part of the canonical sampler.

The reference terrain has 39,121 vertices and 77,000 triangles. It creates 420 instanced trees, 140 separate peak/cap meshes and numerous separate poles, ramp details and lift pieces. These are source-derived counts, not measured frame-time results. Course adaptation should batch/instance scenery, bound particles and measure actual host draw calls and memory. Do not eagerly import the standalone engine just to obtain these assets.

Recommended integration preserves distance/lateral/height coordinates and arcade steering/charge-release feel, with one fixed-step kinematic model on the authority and client predictor. A shared numeric course representation and JS/Elixir golden vectors avoid assuming cross-language floating-point transcendental calculations are bit-identical. The same sampler generates rideable mesh and contact normals. New ordered checkpoints and finish logic must use server-observed swept crossings; client claims are insufficient. This requires no full rigid-body engine. Final tuning, step rates and protocol are specified in `design.md`, not inferred from this reference.

## Reference validation

Ran `node --test SSXTricky/tests/rules.test.mjs` successfully on 2026-09-08. The environment runner reported one passing file-level test; the file contains 13 named test calls. They cover bounded charged jump, combo awards, boost/braking, course clamp, timer/rank helpers, ramp height, speed lanes, trick landing/bail, a ramp-to-air-to-landing simulation and tuck/carve behavior.

This does not verify multiplayer, checkpoints, server finish order, reconnect, mesh/contact parity, slope normals, rendering or resource cleanup. No reference browser, build or visual validation was performed. Existing tests are behavior evidence and potential fixture inspiration, not acceptance evidence for the proposed feature.

## Afterlight integration evidence (parallel read-only investigation)

Inspected current working tree at `b6468e40a5639c41bf9c83c5d0e7cd012004d561`, 2026-09-08. The user already has modified activity implementations/manifest/theater and untracked `src/arcade/`, `public/arcade/`, `docs/arcade.md`, cabinet tests and SSXTricky. These are the integration baseline, not work implemented by this proposal. Exact line numbers may move when that work lands.

| Current file / symbol | Verified behavior and implication |
|---|---|
| `src/main.js` renderer construction and `frame` | `THREE.WebGLRenderer`, EffectComposer/RenderPass/Bloom, one frame loop. Camera swap exists but no activity scene selection. Activity updates currently sit in social unpaused block; 3D race must continue under local UI pause. |
| `src/realtime/gpu/backend.js` | Experimental realtime GPU path is not evidence of a live WebGPU world renderer. No renderer migration required. |
| `src/activities/runtime.js`, `registry.js`, `compositeController.js` | Synchronous initialize, generation/lifecycle/snapshot routing, active update and disposal. Return lightweight instance then prepare asynchronously; compose with theater controller. |
| `src/activities/participation.js` | Admission/lease/anchor/safe dismount already exist. Current dirty code auto-readies on seated result; type-specific explicit-ready policy required. E currently goes directly to join; load-first needs an optional runtime interception. |
| `src/activities/inputSeam.js`, `cameraSeam.js` | Focus/typing/Escape/neutralization and camera preference restoration exist. Neutral emits empty controls; snowboard adapter must translate. Camera ownership alone cannot choose another scene. |
| `src/arcade/cabinet.js` | Load-once canonical GLB, cloned per-instance materials, cached skins, primitive fallback/hot-swap, INT markers, LEDs and disposal. Ready textures bind directly; canvas fitting is separate. No new hardware framework needed. |
| `src/arcade/skins.js`, `artwork.js` | Existing left/right/front/controlPanel/marquee channels, palette/LED/control data, 13:9 canvas display. Add summit motif. |
| `src/activities/cabinetRenderer.js` | Visible/nearby/attract update limits and audio helper exist. Audio helper can create per-tone contexts if mixer omitted; runtime does not currently inject mixer. Use host mixer explicitly. |
| `shared/placeDefinitions.js`, `scripts/export-place-definitions.mjs` | Activity type/capacity/anchor validation and authoritative projection must change together; cabinet artwork remains client-only. |
| `server_elixir/lib/afterlight/activities.ex` | Existing Registry/DynamicSupervisor/session lookup keyed by room key, epoch, activity. Use owner identity, no separate snowboard supervisor. |
| `server_elixir/lib/afterlight/activities/session_server.ex` | Concrete two-player assumptions: starts at full capacity, loser slot `1-winner`, pauses for disconnect and forfeit/abort. Race policy extension is necessary, not already present. Has owner fencing, watchdog, grace, queue offers and transient state. |
| `server_elixir/lib/afterlight/activities/admission.ex` | Node-local unique identity reservation; no verified cross-node global lease. Restrict rollout accordingly. |
| `server_elixir/lib/afterlight/world/room_key.ex`, `rooms.ex` | Canonical key includes region/district/instance; public travel only supports main. Activity lookup currently receives wire room ID; canonical instance distinction must be introduced deliberately and tested without claiming new public instancing. |
| `server_elixir/lib/afterlight_web/game_channel.ex`, `gateway/router.ex` | Existing `activity_*` routing and signed socket identity. 2KiB input cap, 70/sec fixed-window outer input limit, five controls/sec and resnapshot one/5s. Server internal roles player/spectator differ from shared play/watch names. |
| `shared/activityProtocol.js` | Versioned envelopes, 60Hz+10 documented input limits, lease/sequence, canonical transform/score guard. Strict snowboard fields and match fencing must be added; accepted seq is not proof controls simulated. |
| `server_elixir/lib/afterlight/world/room_server.ex` | Generic `broadcast_frame` sends to every member and bypasses bounded presence helper. High-rate snowboard data requires bounded addressed recipients, low-rate public summaries. |
| `server_elixir/lib/afterlight/activities/results.ex` and completion recording | Current games/records do not express race timing standings. Session-local v1 avoids pretending existing durable score persistence handles races. |
| `server_elixir/lib/afterlight/telemetry.ex` | Existing exporter/VM/room telemetry, no verified snowboard/activity metrics. Add bounded low-cardinality metrics. |
| `tools/load_client/` | Actual Phoenix protocol-aware bots, scenarios, percentile reports; reusable for measured multi-session load, not proof of current thousand-user capacity. |
| `scripts/p2-gate-browser.mjs` | Existing untracked Chromedriver browser harness provides actual multi-browser pattern and cleanup; extend without depending on fake result injection. |

Existing tests to preserve: `tests/activity-runtime.test.js`, `activity-participation.test.js`, `activity-camera-input.test.js`, `activity-definitions.test.js`, `activity-protocol.test.js`, `cabinet-renderer.test.js`, `arcade-cabinet.test.js`, `orpheum-arcade.test.js`, and individual games. Backend: `server_elixir/test/afterlight/activities/{session_server_test,admission_test,p1_gate_test}.exs`, `server_elixir/test/afterlight_web/game_channel_activity_test.exs`. P1's 16 mock-room Pong sessions do not establish production race capacity.

The proposal phase did not run Afterlight application builds, browser races or load tests; none of those outcomes is claimed. Only planning files are changed. Documentation validation is recorded by the primary agent after synthesis.

## Implementation baseline (apply phase, 2026-09-08)

Rechecked at apply time per task 1.1. The pending canonical-cabinet work that
this design targeted as "uncommitted" has since **landed** on `main`:

- `95629f9` feat(arcade): canonical instanced GLB cabinet system
- `931606a` feat(activities): data-skinned cabinets, seat-accept ready-up, east-wall arcade row
- `f1c5d78` test(activities): follow manifest-driven cabinet placement and skins
- `66b060b` test(gate): P2 browser harness for cabinet completion runs
- `22204b3` chore(openspec): mark task 3.10 (local bests + leaderboard UI) complete
- `a52464d` docs: document the arcade wall, Records dialog and canonical cabinet system
- `850de04` chore(build): rebuild dist for canonical arcade cabinets (implementation HEAD)

Implementation for this change starts from `850de04dd` on a clean tree except
this change's own planning documents and one local `scripts/p2-gate-browser.mjs`
adjustment (dev port 4173, hardened `readAction`), which is preserved and
extended — never reverted — by task 9.3. The parent program
`add-place-activities-program` remains independently in progress; its landing
commits above are the integration baseline, not work of this change.

## Baseline record (task 1.3, 2026-09-08)

Measured at `850de04dd` before any snowboard implementation code:

- **Node**: `npm test` → 763 tests, 0 failures (includes the new
  `tests/snowboard-fixtures.test.js`, 8 tests). Existing failures: none.
- **Build**: `npm run build` → succeeds (Vite + wasm step) with the rustup
  stable toolchain first on PATH; the default non-rustup `cargo` on this
  machine lacks `wasm32-unknown-unknown` std and fails the `build:wasm` step —
  a pre-existing machine quirk, not a repository defect. The documented
  >500 kB chunk warning remains non-fatal.
- **Elixir targeted suites**: `session_server_test`, `admission_test`,
  `p1_gate_test`, `game_channel_activity_test` → 45 tests, 0 failures.
- **Browser prerequisites**: a live Chromedriver answers at
  `127.0.0.1:9515`; Chromium available (`/snap/bin/chromium`); Node v22.22.1.
  The `scripts/p2-gate-browser.mjs` harness pattern is reusable for task 9.3.
- **Isolated load environment**: `tools/load_client/` is **absent from this
  checkout** despite being referenced by the planning and task 9.7. It must be
  created (or its absence reconciled) before load-gate claims; treat the
  "existing protocol-aware bots" as unverified here.
- **Concurrent working-tree activity**: while phase 1 ran, a second stream of
  work modified `shared/placeDefinitions.js` (four arcade cabinet z positions
  shifted −0.4 south, theater minimap notch), `src/arcade/cabinet.js`,
  `docs/arcade.md` and `server_elixir/priv/place_definitions.json`. These are
  preserved untouched; snowboard edits to shared files must re-read the tree
  and layer on top of them, never revert them.

## Implementation evidence (phases 1–4, 2026-09-08)

- **Contracts (1.1–1.4)**: frozen fixture set under `tests/fixtures/snowboard/`
  (contract constants, D4 lifecycle scenarios, D7 wire messages, course
  format, course-parity golden points) with an Elixir loader
  (`Afterlight.Test.SnowboardFixtures`) and Node integrity tests. Baseline
  recorded above. Provenance in `docs/summit-run-assets.md`.
- **Manifest (2.1)**: `snowboard-race` type + `summit-run` definition (8
  wall-side queue anchors, minPlayers 2, explicit readiness, course
  metadata, interactionRadius 3.0 so the seated proximity re-check can never
  eject an anchored rider). JS validator, export projection and Elixir
  reader extended together; projection parity green. Fifth machine stands at
  (10.42, 2.6), south of the east gate arch.
- **Cabinet (2.2–2.4)**: original `summit` artwork motif; unique-skin /
  shared-geometry / disposal tests; fifth-machine layout tests green.
  Lightweight `src/activities/snowboard.js` drives the public summary/
  attract display from `audience:'summary'` frames only; a static-import
  guard test proves bystanders never pull mountain code. Browser screenshots
  deferred until the concurrently-used Chromedriver frees up.
- **Course + rules (3.1–3.3)**: deterministic authored course
  (`summit-night` v1, 22,525 height samples, 37 colliders, sha256-pinned,
  byte-identical shared/priv copies). Pure fixed-step rules per D5 (grade/
  tuck/brake/carve/shoulder/boundary/charge-release/ramp lips/normal-speed
  landing/crash recovery) plus swept obstacles, ordered gates, finish keys
  with within-tick fractions. 10 golden scenarios exported and reproduced by
  Elixir within D10 tolerance (≤1cm/0.01m/s, exact gate/finish outcomes).
- **Phoenix authority (4.1–4.5)**: pure reducer
  (`Afterlight.Activities.Snowboard`) + `SessionPolicy` lifecycle (min2
  explicit readiness → locked 3s countdown → 30Hz racing → session-local
  results with 120s retention; disconnects never pause a race — freeze then
  DNF(disconnect) at grace expiry; explicit leave → DNF(leave); 180s
  deadline; >500ms sim debt aborts `server_overload`; 120s nonready
  inactivity release). Canonical owner-derived session keys with wire
  roomId preserved in envelopes; instance/epoch isolation tested.
  `AFTERLIGHT_SNOWBOARD_ENABLED` admission flag fails closed with
  `race_unavailable`; durable Results path never called for snowboard.
  Single-owner-node admission constraint documented in `Admission`.

Verified at this checkpoint: `npm test` 803/803, `npm run build` green
(rustup toolchain on PATH for the wasm step), full `mix test` 615 + 1
property, 0 failures.

## Implementation evidence (phase 5, 2026-09-08)

- **Protocol (5.1)**: `shared/activityProtocol.js` gains
  `validateSnowboardControls` (strict per-kind allowlist: ride/neutral/
  loaded, finite steer ∈ [-1,1], unknown fields rejected, course-hash shape)
  and `validateSnowboardFence` (session/lease/match identity). The network
  facade (`src/net/client.js`) applies the strict allowlist to any controls
  carrying `kind` before the generic input validation.
- **Snapshots (5.2)**: snowboard sessions emit D7-shaped participant
  snapshots (`audience`, `snapshotSeq`, `serverTick`, course identity,
  per-rider sim rows, `lastAcceptedSeqs`, private `self` attachment with
  `appliedSeq`/`heldControls`/`serverTick`) and room-wide summaries
  (`riderCount`/`readyCount`/`capacity`/`progress` ≤8/`result`) — never
  leases, seqs or reconciliation data in summaries.
- **Delivery (5.3)**: `RoomServer.send_to_members/3` + `send_to_member/3`
  deliver addressed frames to current members only (stale pid sets can never
  widen the audience; 64-pid cap). `broadcast_activity_state` splits for
  snowboard: addressed full snapshots to seated riders + watchers, ≤2 Hz
  room-wide summaries plus immediate phase changes (pacing state merged via
  a self-message handler).
- **Prediction (5.4)**: `src/activities/snowboard/prediction.js` — shared
  fixed-step rules, 60-step history, accumulator stepping (any FPS, ≤4
  catch-up), reconciliation on `appliedSeq` (never `lastAcceptedSeqs`),
  replay of unapplied per-tick samples over the canonical held state,
  ≤0.5m/100ms smooth corrections, >3m or checkpoint/grounded/terminal
  mismatch hard reset, `resetSeq` clears prediction, 250ms freeze.
- **Interpolation (5.5)**: `interpolation.js` — 100ms buffer, serverTick
  interpolation, ≤100ms extrapolation then stale hold, non-increasing
  `snapshotSeq` dropped, equal-revision newer motion accepted, `resetSeq`
  clears buffers (teleports never animate).
- **Clock (5.6)**: `clock.js` — RTT-midpoint samples, lowest-RTT-of-8,
  monotonic `performance.now()` mapping, wall-clock changes irrelevant,
  uncertainty renders "syncing" and never postpones the start.

Verified: full `mix test` 616 + 1 property, 0 failures; `npm test` 815/815
(includes `tests/snowboard-sync.test.js`, 12 tests).

## Implementation evidence (phase 6 + scene, 2026-09-08)

- **View lease (6.1/6.2)**: `src/activities/viewLease.js` — generation-bound,
  owner-checked, idempotent release; wired into `main.js` so the lease
  swaps `renderPass.scene` AND `activeCamera` together, the race updates
  OUTSIDE the social pause gate (dialogs neutralize controls, never the
  race), world raycasts/theater overlay anchor are suppressed while held,
  resize reaches the leased camera, and release restores the social
  presentation through the existing camera seam. Runtime exposes
  `beginParticipationFor(item)`; `interact()` routes E there before the
  generic join — old games keep immediate join.
- **Resource cache (6.3)**: `src/activities/resourceCache.js` — refcounted,
  60s idle eviction via injected scheduler, `disposeOwner` releases only
  that attempt's handles; rematches share cached values.
- **Controller (6.4–6.6)**: `src/activities/snowboard/controller.js` —
  cancellable lazy load (attempt token), view capture on seat acceptance,
  30Hz held-state heartbeat with ride controls (A/D steer, W/Shift tuck,
  S brake, Space charge), blur/typing neutralization cancelling the charge,
  scoped HUD overlay (phase/time/position/checkpoint/results + Exit/
  Rematch), authoritative events own the HUD, exit/travel/dispose release
  the view and dispose scene instances without evicting shared cache
  resources. `snowboard.js` gains `beginParticipation` + controller
  forwarding + the session-storage resume hint (activity id only).
  Auto-ready on seat acceptance is disabled for `snowboard-race` only
  (`participation.js`); the handshake gate (`not_loaded`/`course_mismatch`)
  makes riders load before readying.
- **Scene (3.4)**: `src/activities/snowboard/scene.js` — terrain mesh from
  the canonical grid (render/contact agreement), instanced pines/rocks/
  lift towers/fence from the document, gate markers + finish breakline,
  floodlit lodge, ≤2000 snowfall points, one shadow-casting key light
  following the rider, chase camera with lookahead/speed-FOV (64–76°)/
  frame-independent smoothing/ground clearance, original robot rider rigs
  with carve lean; high/low presets.
- **Browser safety**: `shared/snowboard/course.js` is browser-importable —
  node:crypto hashing lives in `courseHash.js` (Node injects it); the
  lightweight module's import-guard test allows exactly one entry-gated
  dynamic import (the controller).

Verified: `npm test` 823/823; `npm run build` green (rustup toolchain on
PATH for the wasm step).

## Apply-phase completion state (2026-09-08, end of working block)

Implemented and verified: tasks 1.1–1.4, 2.1, 2.2, 2.4, 3.1–3.4, 4.1–4.5,
5.1–5.6, 6.1–6.6 (33 of 47), plus gate-script and documentation work:

- `scripts/snowboard-gate-browser.mjs` (task 9.3's two-browser gate script)
  is written and ready but has NOT been run — its evidence step remains
  open. `docs/summit-run.md` (10.1/10.2 controls, lifecycle, runbook,
  honest limits) and README/docs/arcade.md updates are in. `8.1` is
  partially realized by the scene's capped snowfall/presets; 8.2/8.3, 9.4–
  9.8 and the browser-dependent evidence (2.3 screenshots, 7.1–7.4,
  9.3 run, 10.3 archival reconciliation) are deliberately UNCHECKED.
- Browser verification is blocked by the concurrently active Chromedriver
  session in this shared checkout (safety guard refuses to launch a second
  flock); two-browser evidence and screenshots must run when it frees.
- Load/perf gates (9.4–9.7) additionally require `tools/load_client/`,
  which does NOT exist in this checkout despite planning references — its
  creation is real remaining work, and no capacity claims are made.
- 8.3 requires a two-human feel pass — inherently not automatable here.

Deliberately NOT claimed: real two-browser race evidence, measured
performance/load capacity, durable anything. The race ships disabled
(`AFTERLIGHT_SNOWBOARD_ENABLED`); no deployment occurred.

## Implementation evidence (fence hardening, audio, ripwire review — 2026-09-08 continued block)

- **Stale-match fence enforced end-to-end (D7/spec "old match packet")**:
  the client now tracks the authoritative `matchId` (join acceptance +
  snapshots) and signs leave/ready/input with it
  (`shared/activityProtocol.js` carries the field additively — generic
  clients unaffected); `SessionServer` rejects missing (`invalid_request`)
  and mismatched (`stale_match`) matchIds on ready (incl. queue-offer
  acceptance), input and leave; server-initiated releases sign with the
  current match. Tests: old-match leave/ready/input rejected with the race
  untouched; malformed missing-matchId rejected.
- **Audio (8.2)**: `src/activities/snowboard/audio.js` — synthesized
  wind/slide/carve loops driven by the predicted state, landing/checkpoint/
  countdown/finish one-shots, voice cap 16, injected mixer first with one
  lazily-created fallback context, mute respected, dispose stops everything
  and closes ONLY a fallback context (a host context outlives the race).
  Wired into the controller (created on view capture, disposed on release).
- **Ripwire review (9.8)**: fixed for real — the complexity-19 snapshot
  broadcaster extracted into `Afterlight.Activities.Snowboard.Presentation`
  (144 lines out of `SessionServer`; builders are pure and testable),
  `do_input`'s handshake and `do_leave`'s racing branch extracted,
  `do_ready_offer` split (accept/decline) with the expire pattern
  deduplicated ×3, the unused plural `send_to_members` removed, and
  `Presentation`'s internal-only functions privatized. `shared` root gate:
  0 findings. Remaining `server_elixir` gates (4) are documented residual
  debt: two module-size deltas (+250/+12/+22 LOC on a GenServer that was
  already 2151 lines — the race lifecycle's planned extraction into the
  policy module is the follow-up), an OTP handler-clause shape collision
  (idiomatic), and a docstring. New-symbol debt read and addressed in the
  same pass.
- **Final state**: `npm test` 829/829; full `mix test` 619 + 1 property,
  0 failures; `npm run build` green. Browser evidence (2.3 screenshots,
  7.1–7.4, 9.3 run) still blocked by the concurrently held Chromedriver;
  9.4–9.7 still require `tools/load_client` (absent) and an isolated
  environment; 8.3 requires two humans; 10.3 waits for that evidence.

## Implementation evidence (continued block 2 — fence, telemetry, review — 2026-09-08)

- **Stale-match fence end-to-end (D7/spec "old match packet")**: client
  tracks the authoritative matchId (join acceptance + snapshots) and signs
  leave/ready/input (validators carry it additively — generic clients
  unaffected); `SessionServer` rejects a missing matchId
  (`invalid_request`) and a mismatched one (`stale_match`) on ready (incl.
  queue-offer acceptance), input and leave; server-initiated releases sign
  with the current match. Tests prove an old-match leave/ready/input is
  rejected with the current race untouched.
- **Telemetry (9.6)**: `[:afterlight, :activity, :snowboard,
  join|start|leave|finish|abort|overload]` events through `:telemetry`
  with bounded measurements (riders/seated/queue/spectators/finished/
  debt_ms) and low-cardinality metadata (activity_type/phase/reason) — no
  player/session ids or secrets. Proven by a handler test (join→start→
  finish with `reason: "deadline"`, and abort on all-riders-gone).
- **Ripwire review (9.8)**: `shared` gate 0 findings. `server_elixir`
  fixes applied: the complexity-19 snapshot broadcaster extracted into
  `Afterlight.Activities.Snowboard.Presentation` (144 lines out of
  SessionServer, pure and testable), the loaded-handshake and
  racing-leave branches extracted from `do_input`/`do_leave`,
  `do_ready_offer` split with the offer-expiry pattern deduplicated ×3,
  the unused plural `send_to_members` removed, Presentation's
  internal-only surface privatized. Remaining 4 gates are documented
  residual debt: module-size deltas (+250/+12/+22 LOC on a GenServer
  already at 2151 — the race lifecycle's extraction into the policy
  module is the planned follow-up), an OTP handler-clause shape
  collision (idiomatic), and the Admission constraint docstring.
- **Known pre-existing flake (not this change)**: the full Elixir suite
  occasionally fails 1 theater/GameChannel global-state test
  (`OutboxRelay.publish_pending` / GameChannel relay); it reproduces with
  all snowboard test files removed (2 of 3 runs) and passes in isolation.
  Unrelated paths; no snowboard code touches the relay.

Final state of this block: full `mix test` 621 + 1 property with only the
documented pre-existing flake (0 failures in the targeted suites, 121/121
activities+channel); `npm test` 829/829; `npm run build` green. 36/47
tasks checked; the 11 open ones all require the browser (Chromedriver held
by the concurrent session), the absent `tools/load_client`, or two human
playtesters.

## Browser verification evidence (2026-09-09, gate runs)

Chromedriver freed; full browser verification executed. Recovery tooling
persists in `~/afterlight-gate/` (stack-up script, verify + capture
scripts, screenshots in `shots/`); dev-stack facts learned along the way:
the dev Postgres cluster runs from `~/.local/afterlight-pg` on **5433**
(start with pg_ctl after hard crashes), `PHX_CHECK_ORIGIN=false` is
REQUIRED for any non-5173 origin (the manual restarts without it rejected
the preview origin's sockets), and `VITE_WS_URL` MUST be baked at build
time (`VITE_TRANSPORT=phoenix VITE_WS_URL=ws://localhost:4000/ws vite
build --outDir dist-sb`) — plain `npm run build` bakes the production
Tailscale gateway from `.env.production`.

- **Gate runs** (`scripts/snowboard-gate-browser.mjs`, two fresh headless
  Chromium sessions, real key events, tp debug seam for navigation only):
  **entry PASS** (walk-up E → cancellable lazy load → joining → seated,
  "Playing as Slot 0"), **race PASS** (both riders seated → explicit R
  readiness → server countdown → both HUDs reach the RACE phase),
  **rematch PASS** (attempt 2; attempt 1 was a rider-b load-timing miss in
  the harness), **exit PASS** on the fixed path.
- **A real defect was found and fixed by the gate**: the E-exit path
  revoked the view lease WITHOUT leaving the session, leaving world input
  suppressed after exit ("world movement not restored" ×3). Fixed in
  `main.js` (revoke + participation.leave) and re-verified PASS. This is
  exactly the class of bug the browser gate exists to catch.
- **Screenshots** (`~/afterlight-gate/shots/`): four camera views of the
  Orpheum, the Summit bay approach, and the race HUD (lobby phase: Ready
  prompt + Exit/Rematch buttons, design-language styling).
- **Known harness flake (not a product defect)**: tp + nudge positioning
  sometimes drifts (lost keyups / late interaction re-target), so an E can
  land on a theater seat instead of the cabinet; the gate self-heals via
  retries. The dev server (5173) is also unusable for gating while the
  concurrent foosball work triggers Vite full-reloads — the gate runs
  against the stable `dist-sb` preview on 4199 with local WS env baked.
- **Server-side D4 matrix** (ExUnit, all passing): lone rider waits, 2-of-8
  countdown lock, unready/leave/disconnect cancellation, disconnect
  freeze→DNF(grace), leave→DNF, deadline→results, rematch rotation,
  stale-match fencing, queue promotion, inactivity release, empty reap,
  instance/epoch isolation, flag-disabled closed door, telemetry signals.

State: **42/47 tasks checked.** Remaining 5 are genuinely outside this
session: 8.3 (two-human feel pass), 9.4/9.5/9.7 (measured perf/soak/load —
`tools/load_client/` now EXISTS in the tree (concurrent work) but the
isolated 400/1000-rider environment and hardware-documented runs remain),
and 10.3 (archival reconciliation, deliberately last). Final suite state
at close: `npm test` 911/911, full `mix test` clean for all
snowboard/activity/channel suites (the documented pre-existing
theater/relay ordering flake excepted), `npm run build` green.

## Final planning validation

- `openspec validate add-multiplayer-snowboard-arcade --strict`: passed.
- `openspec status --change add-multiplayer-snowboard-arcade`: all four planning artifacts complete; implementation tasks remain unchecked.
- Scoped Ripwire quality-delta: zero reported regressions; test-gate: zero code tests/impacted symbols for planning documents. This is not gameplay validation.
- Documentation diff whitespace check passed; no Afterlight application build/render/load test was run for this documentation-only request.
- The shared checkout advanced during investigation to `850de04dd` (cabinet documentation/build commits by concurrent work), capturing initial proposal/design drafts along the way. This task did not create those commits or change game code. Evidence above records the inspected working-tree behavior; implementation must recheck its actual landing checkout.

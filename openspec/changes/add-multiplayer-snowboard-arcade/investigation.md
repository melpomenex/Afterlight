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

## Final planning validation

- `openspec validate add-multiplayer-snowboard-arcade --strict`: passed.
- `openspec status --change add-multiplayer-snowboard-arcade`: all four planning artifacts complete; implementation tasks remain unchecked.
- Scoped Ripwire quality-delta: zero reported regressions; test-gate: zero code tests/impacted symbols for planning documents. This is not gameplay validation.
- Documentation diff whitespace check passed; no Afterlight application build/render/load test was run for this documentation-only request.
- The shared checkout advanced during investigation to `850de04dd` (cabinet documentation/build commits by concurrent work), capturing initial proposal/design drafts along the way. This task did not create those commits or change game code. Evidence above records the inspected working-tree behavior; implementation must recheck its actual landing checkout.

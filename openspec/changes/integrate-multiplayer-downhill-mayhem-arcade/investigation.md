# Investigation — integrate-multiplayer-downhill-mayhem-arcade

Inspected 2026-09-10 on `main` (HEAD `0e3ba44`) with a clean working tree, via
three parallel read-only source passes plus targeted follow-up reads. Line
numbers are accurate at inspection time and may shift as concurrent work lands;
the named symbols are the contract. No files were modified by this
investigation.

Prior art reconciled: `openspec/changes/add-place-activities-program`,
`add-multiplayer-snowboard-arcade`, `integrate-ssxtricky-snowboard`,
`integrate-kart-royale-arcade`, and `fix-kart-royale-instant-entry`. The Kart
entry-readiness work (`1beca3d`, `3462220`, `55ce989`, `1056af0`) has **landed**
since the Kart proposal, so the loading/prewarm seams it described now exist in
source (`src/activities/kartRoyalePreparation.js`,
`src/activities/kartRoyalePrepareScheduler.js`, `src/activities/graphicsJobs.js`,
`src/activities/rendererPolicy.js`).

---

## 1. Signal Lost cabinet and the current Theater activity row

- `shared/placeDefinitions.js` is the single editable manifest (no Three/DOM
  imports). `ACTIVITY_TYPES` is a frozen list at lines 43–72; `signal-lost` is
  line 46, `kart-royale` line 48, `snowboard-race` line 49. `capacities.players`
  is validated 1–8, `spectators` 0–32, `queue` 0–16
  (`validateActivityDefinition` lines 1256–1265; mirror in
  `scripts/export-place-definitions.mjs` lines 139–142).
- `SIGNAL_LOST_CABINET` = lines 108–119 (title `SIGNAL LOST`, tagline
  `ASTEROID SURVIVAL`, motif `signal`).
- `SIGNAL_LOST_ACTIVITY_DEFINITION` = lines 199–217:
  `id 'orpheum-signal-lost'`, `type 'signal-lost'`, `rulesVersion 1`,
  `cabinet SIGNAL_LOST_CABINET`,
  `transform.position [10.42, 0, -3.85]`, `rotationY -Math.PI/2`,
  `footprint {width:0.85, depth:0.9}`, `interactionRadius 2.2`,
  one anchor `{slot:0, position:[9.3,0,-3.85], facing:Math.PI/2,
  dismount:[{x:8.55,z:-3.85}]}`, `capacities {players:1, spectators:16,
  queue:8}`, `rendererKey 'signalLostCabinet'`, `controllerKey 'signal-lost'`.
- `ORPHEUM_ACTIVITIES` = lines 838–844: Pong, Rain Runner, Signal Lost, Kart
  Royale, Summit Run. `ORPHEUM_ALL_ACTIVITIES` = lines 846–854 adds pool, air
  hockey, foosball, darts, piano, photo booth. Theater gets
  `ORPHEUM_ALL_ACTIVITIES` at line 972.
- Dormancy precedent: `SPOREFALL_ACTIVITY_DEFINITION` (lines 222–240) is
  exported but absent from `ORPHEUM_ACTIVITIES`; its cabinet/scene at z −1.8 is
  now Kart Royale. This is the exact pattern for Signal Lost.
- `KART_ROYALE_ACTIVITY_DEFINITION` (lines 248–266) and
  `SUMMIT_RUN_ACTIVITY_DEFINITION` (lines 297–327) show the required extra race
  fields: `minPlayers`, `readyPolicy:'explicit'`, `course {id,version}`. The
  validator requires those three for `['snowboard-race','drones','rc-boats']`
  (lines 1287–1291) and the export script for
  `['snowboard-race','drones','gutter-boats','rc-boats']` (lines 154–162).
- `src/world/theaterWorld.js` builds only bay scenery; the east-wall row studs
  already exist for each placed machine, so repurposing in place needs **no**
  theaterWorld change.
- `node scripts/export-place-definitions.mjs` writes
  `server_elixir/priv/place_definitions.json` (narrow projection: id/type/
  rulesVersion/transform/footprint/interactionRadius/anchors/capacities/
  environmentPolicy + race fields); `--check` fails on drift. Elixir reads it in
  `Afterlight.World.PlaceDefinitions` with a mirrored `@activity_types`
  allow-list (lines 35–41) and `activity_race_problems/2` (lines 593–626).

## 2. Canonical arcade cabinet, skin and artwork system

- `src/arcade/cabinet.js` — `createArcadeCabinet({activityDef, world,
  screenSource})` (line 286) builds one machine from the shared GLB
  (`public/arcade/cabinet/afterlight_arcade_cabinet.glb`), a 13:9 composite
  display canvas (`SCREEN.canvas [1040,720]`), skin/LED/control application and
  an `activityCamera`; `dispose()` (line 493) releases only its own textures/
  materials. `src/arcade/skins.js` owns `SKIN_CHANNELS` (line 32) and
  `normalizeCabinetSkin` (line 64). `src/arcade/artwork.js` owns
  `MOTIFS = {pong, rain, signal, spore, summit, kart, afterlight}` (lines
  84–490) and `paintSkinChannel` (line 497). Adding a `downhill` motif is a
  painter addition, no GLB change.
- Contract tests: `tests/arcade-cabinet.test.js` (placed-machine count = five,
  skin normalization, LED distinctness, anchor/dismount clearance, shared
  geometry), `tests/cabinet-renderer.test.js` (throttler tiers/screen budgets).
  `tests/activity-definitions.test.js`, `tests/orpheum-arcade.test.js` and
  `tests/nearby-activities.test.js` enumerate activities/type labels.

## 3. Activity stack, participation and view lease

- `src/activities/registry.js` — `registerActivityModule(type, {initialize})`
  (line 26); type must be in `ACTIVITY_TYPES`; duplicate registration throws.
  Modules self-register and `src/main.js` statically imports them (lines 44–78).
- `src/activities/runtime.js` — `createActivityRuntime` (line 20);
  `activate(seam)` (line 102) builds the per-module context
  (`activityDef, world, net, generation, roomId, getRenderer, getPlayer,
  audioMixer, acquireView, releaseView, scheduleGraphicsJob,
  runGraphicsTransaction, cancelGraphicsJobs`, …); `beginParticipationFor(item)`
  (line 311) is the pre-join hook; generation-fenced routing
  `acceptSnapshot/Event/Result/Error` (lines 231–302);
  `tickBackgroundPreparation` and `scheduleTheaterIdlePrefetches` (Kart hooks,
  lines 361–393).
- `src/activities/participation.js` — `createParticipationController` (line
  149); state `idle|joining|participating|watching|queued|leaving` (line 160);
  `join/leave/handleResult/handleSnapshot/interact/deactivate` (lines 219–531);
  seat acceptance applies the anchor and auto-readies **except**
  `type === 'snowboard-race'` (lines 345–350) — Downhill needs the same explicit
  exception.
- `src/activities/viewLease.js` — `createActivityViewLease` (line 19);
  `acquireView({owner, generation, scene, camera, resize, onRelease, present,
  toneMappingExposure})` (lines 41–74) rejects a second owner and stale
  generation; `present` is an optional presenter stored on the lease (lines
  44–49, 63); `release`/`revoke` are idempotent (lines 89–118).
- `src/main.js` — one `THREE.WebGLRenderer` (line 111), one `EffectComposer`
  (lines 135–183), one frame loop `frame(now)` (line 2048, started line 2351);
  `createActivityViewLease` `apply`/`restore` (lines 151–179) swap
  `renderPass.scene` + `activeCamera`, capture/restore renderer policy and
  bloom; the held branch (lines 2058–2075) calls
  `activityRuntime.update(...)` **outside the social pause gate**, then
  `lease.present()` if present else `composer.render()` (line 2071). Activity
  `interact()` routing (lines 1452–1495) calls
  `beginParticipationFor(nearest)` for activity items; the keyboard handler
  (lines 1803–1917) preventDefaults movement/Space while participating and
  routes Escape through `resolveEscapeAction` (`src/activities/inputSeam.js`).
  Renderer policy snapshot/restore is now a real module
  (`src/activities/rendererPolicy.js`, `captureRendererPolicy` line 15,
  `restoreRendererPolicy` line 96), and background GPU work is fenced by
  `src/activities/graphicsJobs.js` (`createGraphicsJobQueue` line 29).
- `src/main.js` debug hooks behind `?debug=1` (`window.__afterlight`, lines
  733–771) expose `player/room/participation/activity/netState/tp`, used by the
  browser gates.

## 4. Summit Run: the multiplayer precedent

- Bystander module `src/activities/snowboard.js` (registration line 525) drives
  the cabinet screen from `audience:'summary'` frames only and lazy-imports the
  controller (line 160); it stores a session-storage resume hint containing only
  `{activityId}`.
- Controller `src/activities/snowboard/controller.js`
  (`createSnowboardController` line 89): attempt token, lazy scene import,
  load handshake (`sendLoaded` line 424), explicit `sendReady` (line 466),
  `acquireView` on seat (lines 555–571), capture-phase input, 30 Hz heartbeat,
  `acceptSnapshot` reconciliation and remote buffers (line 643), `exit`/`dispose`
  (lines 782–804), reconnect re-acquire when `mine()` is already true
  (line 824).
- Prediction/interpolation/clock: `src/activities/snowboard/prediction.js`
  (`createPredictor` line 56, history 60 steps, ≤4 catch-up, 250 ms freeze,
  ≤0.5 m/100 ms smoothing, >3 m hard reset), `interpolation.js`
  (`createRemoteRiderBuffer` line 28, 100 ms buffer, ≤100 ms extrapolation,
  `resetSeq` clearing), `clock.js` (`createRaceClock` line 23, RTT-midpoint,
  lowest-RTT-of-8, monotonic `performance.now()`).
- Shared rules: `shared/snowboard/rules.js` (`DT = 1/30` line 44, `step` line
  314, `initialState`, `normalizeControls`, event list) and `shared/snowboard/
  course.js` (analytic course sampler, `buildCourseDocument` line 93,
  `loadCourse` line 250) with the committed
  `course-alpine-rush.json` and `courseDocument.js` JSON re-export.
- Audio `src/activities/snowboard/audio.js` (`createRaceAudio` line 20, voice
  cap 16) prefers an injected mixer and closes only a fallback context.
- Manifest `summit-run` (lines 297–327) is the model for the Downhill
  definition: `minPlayers:1`, `readyPolicy:'explicit'`,
  `course {id:'alpine-rush', version:2}`, 8 anchors, `capacities
  {players:8, spectators:32, queue:16}`.

## 5. Kart Royale: the hosted-runtime, view-lease and loading precedent

- `src/activities/kart-royale.js` — bystander (registration line 550),
  resource cache + preparation handle (lines 145–186), `beginParticipation`
  (line 443), `loadController` (line 188), background HUD and paint states,
  `dispose` (line 529).
- `src/activities/kart-royale/controller.js` —
  `createKartRoyaleController` (line 21), capture-phase input consuming KeyE
  (lines 172–187), `createAndBootHost` (line 256) with host readiness and
  prep, `acquireTheView` (line 404) passing `present` and
  `toneMappingExposure:1.05`, `body.kr-racing` presentation, retained host on
  exit (line 452), `exit`/`dispose`/`beginParticipation` (lines 543–619).
- Preparation seams now real: `kartRoyalePreparation.js`
  (`createKartRoyalePreparation` line 25, `prefetch/prepare/activate/suspend/
  retainHost/dispose`), `kartRoyalePrepareScheduler.js`
  (`createKartRoyalePrepareScheduler` line 23, `tick({maxMs, viewLeaseHeld,
  framePressure})`), `kartRoyaleProximity.js` (ENTER 8 / EXIT 10,
  `IDLE_BUDGET 2ms` / `NEAR_BUDGET 4ms`), `kartRoyalePrefetch.js`,
  `kartRoyaleRollout.js`, `kartReadinessMetrics.js`, `kartAllocationLedger.js`,
  `kartPerf.js`.
- Game-side host adapter: `games/kart-royale/src/host/{index,runtime,types}.ts`
  and `render/Renderer.ts` external-renderer mode; `games/kart-royale` keeps
  its own `package.json` declaring `three ^0.185.1`, and root provides the same
  version (installed 0.185.1) so the built app resolves **one** Three instance.
- `fix-kart-royale-instant-entry` (landed) is the explicit mandate this change
  reuses: `prefetch` theater-idle → incremental `prepare` with proxmity
  priority and frame budgets → readiness barrier (posed camera, hidden full-chain
  frame) → atomic activation under the lease; no cold `boot()` under the visible
  lease; bounded retention/eviction and an allocation ledger.

## 6. Phoenix/Elixir activity authority

- `server_elixir/lib/afterlight/activities.ex` — `Afterlight.Activities`;
  canonical session key `{room_key, room_epoch, activity_id}` (`via_tuple/3`
  line 25); `get_or_start_session/6` (line 45); owner-fence fail-closed
  `start_session/6` (lines 62–123) including the snowboard feature gate
  (lines 84–88); `list_public_summaries/1` (line 149).
- `.../activities/session_server.ex` (3129 lines) is the generic GenServer:
  per-type capacities from the projected manifest (lines 138–141); join/leave/
  ready/input/resnapshot dispatch (`handle_command/4` line 1035); `do_join/5`
  (line 1088) mints `lease_id` and calls `Admission.acquire`; `do_input/4` (line
  1685) enforces session/epoch/match/lease/sequence/controls; `snowboard_sim_tick`
  (line 350) with 30 Hz and `>500 ms` debt → `abort_snowboard_race(
  "server_overload")`; `begin_snowboard_race`/`finish_snowboard_race`/
  `abort_snowboard_race` (lines 2030–2138); `broadcast_snowboard_snapshots`
  (line 2868, addressed full snapshots + ≤2 Hz summaries) with
  `RoomServer.send_to_member/3`; `init_simulation`/`step_simulation` type
  clauses (lines 2167–2402) including `"signal-lost"` → `SignalLost`;
  `tick_interval_for/1` (line 2223, snowboard 33 ms) and
  `snapshot_interval_for/1` (line 2232, snowboard 50 ms).
- `.../activities/snowboard/session_policy.ex` — the lifecycle model to
  mirror: `@countdown_ms 3000`, `@race_deadline_ms 180_000`,
  `@results_retention_ms 120_000`, `@tick_interval_ms 33`,
  `@snapshot_interval_ms 50`, `start_ready?/2` (count ≥ min and every connected
  rider ready), `init_sim/1`, `step/3`, `dnf/3`, `standings/2` (places, sub-1 ms
  ties).
- `.../activities/snowboard.ex` — the pure reducer pattern (`initial_state/2`,
  `normalize_controls/1`, `step_rider/5`, `world_position/2`, `round_wire/1`)
  and `enabled?/0` (line 102).
- `.../activities/snowboard/presentation.ex` — exact envelope builders
  (`common_fields/1`, `full_snapshot/1`, `attach_self/3`, `summary/1`,
  `wire_status/1`); `.../snowboard/course.ex` — committed course loader/hash;
  `.../activities/signal_lost.ex`/`sporefall.ex` — pure authoritative sims for
  single-player arcade runs (`init_sim_state/1` + `step/3`), the pattern for a
  dormant-replaceable sim.
- `lib/afterlight_web/game_channel.ex` — `handle_activity/3` (line 1055):
  payload >2048 → `payload_too_large`; rate limits (`check_activity_rate_limit/2`
  line 1268: input 70/s, resnapshot 5 s, control 5/s); `session_room_key/3`
  (line 819) canonicalizes snowboard keys via `RoomKey.from_parts`; starts the
  session and replies `activity_state`/`activity_result`/`activity_error`.
  `lib/afterlight_web/gateway/router.ex` routes `activity_*` to Phoenix only.
- Feature flag: `config/config.exs:32` default false; `config/runtime.exs:169–179`
  reads `AFTERLIGHT_SNOWBOARD_ENABLED`; `Snowboard.enabled?/0`; admission
  returns `{:error, :race_unavailable}` and starts no session.
- Tests to mirror: `test/afterlight/activities/snowboard_test.exs` (JS↔Elixir
  golden parity, tolerance 1 cm / 0.01 m/s), `snowboard_session_test.exs` (real
  SessionServer, fake room loop, countdown/rematch/disconnect/stale-match),
  `snowboard_course_test.exs` (hash parity), `session_server_test.exs`,
  `p1_gate_test.exs`, `test/afterlight_web/game_channel_activity_test.exs`.

## 7. Downhill Mayhem source (`games/downhill-mayhem`)

- Deliverables: `index.html` (3184 lines, 772 kB), `README.md`, `LICENSE`
  (Apache-2.0), `THREE.LICENSE` (MIT), `media/`. The game code is lines 468–3182;
  line 402 is the inlined **three.js r128**; lines 422–467 are a GoatCounter
  analytics wrapper. The README documents the game's controls and modes
  (Classic/Timberline/Rockgarden/Daily; Chill/Mayhem/Brutal).

Sections (banner lines) and key symbols:

| Area | Lines | Key symbols |
| --- | --- | --- |
| utils | 477–494 | `clamp`, `lerp`, `smoothstep`, `mulberry32`, `hash2`, `vnoise2` |
| config | 495–606 | `SEED`, `TERRAINS`, `DIFFS`, `TRICKS`, `RIDER_DEFS`, `START_LATS`, physics constants (`G=11.5`, `SOFTCAP_V=33`, `PEDAL_A`, `BOOST_A/DRAIN`, `PUNCH_S/LAT/DY`, `HIT_METER`, `REVENGE_HUNT_T`, `CRASH_TIME`, `INVULN_TIME`) |
| track | 607–745 | `buildTrack`, `buildProfile`, `blur`, `sampleTrack`, `rampHeightAt`, `groundHeight`, `worldPos`; arrays `cx,cz,cy,ch,ccurv,cgrade`; `ramps`, `drops` |
| audio | 746–895 | `AudioSys` (own `AudioContext`, limiter, `startMusic` `setInterval` scheduler) |
| input | 896–1110 | `KEYMAP`, keydown/keyup, `pressQueue`, `pollGamepad`, `playerInput`, touch controls |
| three/world | 1111–1418 | `initThree`, terrain/scenery/gates builders |
| riders | 1419–1593 | `makeRider`, `makeRiders`, `RIDER_DEFS`, `buildRiderModel`, ghost |
| physics | 1594–1845 | `riderStep` (1700–1844), `handleLanding`, `crashRider`, `startTrick`, `completeTrick`, `updateTrick` |
| combat | 1846–1909 | `tryStrike` (1850–1896), `pairCollisions` (1897–1908) |
| AI | 1910–2183 | `aiThink` (1953–2156), `aiBoostWant`, `predictAirRemaining`, `rampAheadFor` |
| race flow | 2184–2688 | `resetRace`, `resetRiders`, `finishRider`, `updatePositions`, `updateRace`, `showResults`, `buildResultCard`, PB/ghost/challenge |
| HUD | 2689–2810 | `initHud`, `updateHud`, `popup` |
| rider visuals | 2811–2946 | `riderVisual`, `trickPose` |
| camera/fx | 2947–3044 | `updateCamera`, `pickDemoSubject`, `drawFx` |
| main loop | 3045–3090 | `frame(now)` (3050–3089), `simFrame`, dt cap `0.05`, hit-stop |
| boot | 3091–3117 | `boot`, demo race |
| test/debug | 3118–3181 | `window.GAME` getters + `GAME.test` (`autopilot`, `placeAt`, `skipTo`, `launch`, `spawnRivalNear`, `startMode`, `fastForward`, …) |

**Rider state** (`makeRider` lines 1538–1562): identity `def,idx,isPlayer,viz`;
`inp {pedal,brake,steer,hop,boost,punch,trick}`; physics `s,lat,y,vs,vlat,vy,
grounded,steerPos,lean,pitch,airTime,wasOnRamp,driftT,wallT,draftT,grudge,
revengeT`; race `finished,finishTime,racePos,rubber`; trick/boost
`trick,trickT,chain,pendingMeter,pendingNames,meter,boosting,boostLatch`;
crash/combat `crashed,crashT,invuln,crashSpinX/Y,punchAnimT,kickAnimT,
strikeKind,strikeSide,windupT,windupTarget,punchCd`; AI `phase,wf,wamp,lineBias,
reactT,pedalPhase`. This is the authoritative multiplayer state surface — no
rigid-body transforms are required.

**Course generation** is fully deterministic from `CUR_SEED`: `buildTrack`
(lines 627–703) uses `mulberry32(CUR_SEED)` and a separate
`mulberry32((CUR_SEED^0x9e3779)>>>0)` for the Daily personality, then
`buildProfile`/`blur` produce curvature/grade segment arrays, integrates the
centerline into `cx/cz/cy/ch`, adds `drops`, and selects `ramps`. Terrain relief
in `groundHeight` (lines 726–739) uses the deterministic `hash2`/`vnoise2`
noise (no `Math.random`). `buildScenery` (lines 1287–1383) is seeded by
`mulberry32(CUR_SEED+31)` and places slalom trees and rock gardens whose
positions participate in `riderStep` collision (lines 1823–1837). So the entire
authoritative contact surface and obstacle set are reproducible from the seed
and mountain knobs. The **Daily** seed comes from `dailySeed()` (line 558) —
`UTC year*10000 + (month+1)*100 + day` — i.e. an external clock read, not a
constant, so it cannot be a precommitted fixture.

**Physics** (`riderStep`): timers → zone classification → grounded
longitudinal (grade accel, pedal/brake, quadratic drag, boost, meter trickle,
soft cap) → grounded lateral (steer response, drift, centrifugal, steering,
wall push) → hop → airborne (gravity to `-VT_FALL`, reduced steering) →
trick update → integrate `s`/`lat` with `LAT_CLAMP` wall slam → ground
fall-away detach → landing (`handleLanding`) → tree/rock collision → finish.
Source substeps when `dt > 0.022` (`updateRace` lines 2457–2460: `sub = dt>0.022?2:1`),
i.e. the source's effective physics step is ≈1/60 s even though rendering is
variable. The main loop caps `dt` at 0.05 and `updateRace` is called once per
rendered frame.

**Combat** (`tryStrike` lines 1850–1896): target search over riders by
`ds<PUNCH_S(2.2)`, `dl<PUNCH_LAT(1.6)`, `dy<PUNCH_DY(1.4)`, skipping crashed/
invulnerable/finished; nearest wins; the victim gets `vlat += side*3 or 4.5`
(kick), `crashRider`, meter payout `HIT_METER + AIR_STRIKE_METER(air) +
BOOST_STRIKE_METER(boosting)`, and grudge seeding `grudge=true`,
`revengeT=REVENGE_HUNT_T*DIFF.rev`. The client supplies only "punch/kick
pressed"; the server must resolve the hit.

**AI** (`aiThink` lines 1953–2156): rubber-banding from gap, comeback-company
for a struggling player, revenge hunting (including BRUTAL `huntRace`), corner
speed planning, racing-line/hunt steering, tree/rock avoidance, hop/trick
decisions, and strike windups. It uses `Math.random()` in seven
gameplay-affecting places (lines 1555, 1556, 2092, 2102, 2122, 2131, 2144, 2145,
2320, 2323, 2324) — these must become a seeded deterministic RNG stream on the
authority.

**Race flow**: phases `boot → countdown → racing → finished` plus a
`DEMO` attract race; `resetRace` (line 2339), `finishRider` (line 2361, PB,
ghost, placement, photo finish, rank stamp), `showResults` (line 2494). Ranks:
`pts=(7-place)*14 + min(tricks*6,30) + min(decked*8,24) + (newPB?20:0)` (lines
2393–2401). Persistence: `localStorage['downhill-mayhem-best-<mode>-<seed>
<diff>']` PB/ghost (lines 2202–2204); challenge link `?c=x-<seed>-<time>-<diff>`
(lines 2215–2234). Analytics `window.TRACK`/`window.TRACKED` (lines 423–466)
must be removed/no-op'd in hosted mode (it makes a network request otherwise).

**Hosting seams present:** `window.GAME` and `GAME.test` (lines 3119–3181)
give the browser gate deterministic hooks (`placeAt`, `skipTo`, `launch`,
`autopilot`, `fastForward`); `AudioSys` owns a private `AudioContext`;
`initThree` owns a renderer/canvas/RAF; `frame()` re-arms `requestAnimationFrame`
as its first statement.

## 8. Three.js and dependency facts

- Root `package.json` declares `three ^0.185.1` (installed 0.185.1),
  `postprocessing ^6.39.5`, `n8ao ^2.0.1`, `simplex-noise ^4.0.3`,
  `vite ^7.1.0`; `vite.config.js` is minimal (no aliases/manualChunks). Lazy
  chunks come purely from dynamic `import()`.
- `games/kart-royale/package.json` declares `three ^0.185.1`,
  `postprocessing ^6.39.3`, `n8ao ^2.0.0`, `simplex-noise ^4.0.3`. Root and the
  game resolve one Three instance because root owns it; a root test
  (`tests/kart-royale-deps.test.js`) pins the agreement.
- `games/downhill-mayhem` currently has **no** package.json and inlines three.js
  **r128** (line 402). The hosted path must not ship r128; the standalone shell
  may keep its own three, but the single-source game modules must import the
  shared dependency. r128→r185 porting hazards: `Geometry`/`BufferGeometry`
  API (already `BufferGeometry`/`InstancedMesh` here), `outputEncoding` vs
  `outputColorSpace`, `sRGBEncoding`, light intensities (r155+ physical units),
  `WebGLRenderer` property renames, and `THREE.Fog`/`MeshLambertMaterial`
  behavior. These must be ported and visually checked against the source frames.

## 9. Risk register before design

1. **Simulation extraction size.** `riderStep`, `tryStrike`, `aiThink`,
   `handleLanding` and the track builder are interleaved with DOM/render/audio
   globals; the extraction is the largest workstream and must be done in
   runnable slices with replay fixtures.
2. **Cross-language numeric drift.** JS and Elixir must agree on the course and
   physics within tolerance or races desync. Mitigated by one shared algorithm
   plus golden fixtures (the Summit Run precedent) and hash-gated course
   identity.
3. **Daily non-determinism.** A date-derived seed cannot be a precommitted
   fixture; decision D5 addresses this explicitly.
4. **AI randomness.** Seven gameplay-affecting `Math.random()` sites must become
   a seeded stream or the authoritative field diverges.
5. **E conflict.** Theater `E` = interact; Downhill `E` = punch. Capture-phase
   input ownership must consume `E` before `interact()`, exactly as Kart does.
6. **Legacy r128.** A naive hosted import would duplicate a 600 kB+ Three build
   and split `instanceof`/caches; D3 addresses this.
7. **Loading.** The source boot builds the terrain mesh, scenery and riders
   sequentially; D17 stages it so E is not a cold build (Kart lesson).
8. **Shared renderer mutation.** Downhill renders with different pixel ratio,
   tone mapping, fog and clear behavior; the lease's renderer-policy
   snapshot/restore must cover it and background preparation must use the
   graphics-job transaction.
9. **Combat trust.** A naive "I hit player B" message is forgeable; D11 keeps
   resolution server-side.
10. **Concurrent unarchived changes.** Signal Lost placement appears in
    `add-place-activities-program` and the Kart banner; the supersession notice
    records it and archive-time reconciliation is required.

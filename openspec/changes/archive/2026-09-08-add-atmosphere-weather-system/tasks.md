# Implementation tasks — add-atmosphere-weather-system

Planning only: every checkbox is intentionally unchecked. Read design.md and ../add-social-place-framework/program.md first. Complete prerequisites before starting; each task depends on earlier tasks in this file unless explicitly stated. New paths below are proposed files to create, not claims they already exist. Commands run from repository root except `mix ...`, which runs from server_elixir. Preserve unrelated working changes.

## 1. Owner and pure semantic foundation

- [x] 1.1 Prove and complete the existing room lease integration

  - **Goal:** Prove and complete the existing room lease integration
  - **Files/symbols:** lib/afterlight/world.ex ensure_room_with_lease/epoch, world/room_server.ex/frames.ex/lease/renewer.ex/successor.ex; P9 integration evidence
  - **Reuse:** Existing Lease.Handle, Lease.acquire/renew, Directory, Renewer notifications, P9 failover tests; B D2.
  - **Required behavior:** Carry held handle into RoomServer, expose real epoch, acquire once on startup, consume successor handle, handle lease_renewed/fenced and propagate epoch into real output; retain single-node gate.
  - **Architecture constraints:** No weather-specific owner counter, second lease table or fake epoch0 production fallback; do not declare P9 done from isolated helper tests.
  - **Failure/cleanup:** Owner invalidation stops atmosphere and old output; renewer monitors/cancels on stop; handle DB failure through existing fence semantics.
  - **Tests:** New real integration cases in test/afterlight/world/failover_test.exs and game_channel_world_test.exs: join through channel, capture actual epoch, expire/kill/reacquire, greater epoch, delayed old output rejected; lease partition tests.
  - **Verify:** mix test test/afterlight/world/lease_test.exs test/afterlight/world/failover_test.exs test/afterlight/world/lease_partition_test.exs test/afterlight_web/game_channel_world_test.exs
  - **Done when:** Actual RoomServer frames carry held lease epoch and successor test proves monotonicity. If upstream already supplies this, record evidence and reuse; failing gate blocks shared activation.
  - **Do not change:** No enabling multi-node, rewriting lease algorithm or modifying durable domains unnecessarily.

- [x] 1.2 Implement pure atmosphere validation and transition math

  - **Goal:** Implement pure atmosphere validation and transition math
  - **Files/symbols:** new shared/atmosphereModel.js/atmospherePresets.js, tests/atmosphere-model.test.js, shared fixture JSON; projection exporter
  - **Reuse:** B D1/D3 numeric rules, existing pure shared-model test style.
  - **Required behavior:** Validate8KiB envelope semantics, finite ranges/modes, up to4 events; fixed/scheduled and fixed/accelerated time, smoothstep linear-space interpolation, cycle wrap, wetness keyframes, deterministic LCG and injected clocks.
  - **Architecture constraints:** Retained output argument for hot math; no Three.js, DOM, server fetch or garden-weather mutation.
  - **Failure/cleanup:** Malformed/unsupported states rejected whole; zero seed valid; missing state falls back known preset; duration0 not divided.
  - **Tests:** Boundary fixtures for0/half/full transition, cycle wrap, zero seed, wet/dry restoration, huge/nonfinite input, stale revisions/epochs, time discontinuity and join halfway.
  - **Verify:** node --test tests/atmosphere-model.test.js; node scripts/export-place-definitions.mjs --check
  - **Done when:** Pure vectors fully define semantics for Elixir and renderer, with no implementation decisions left to runtime adapters.
  - **Do not change:** No dynamic/user-authored weather or real-world weather API.

## 2. Room control-plane integration

- [x] 2.1 Hold semantic atmosphere in the existing room owner

  - **Goal:** Hold semantic atmosphere in the existing room owner
  - **Files/symbols:** new lib/afterlight/world/atmosphere.ex; room_server.ex/World/Frames; shared/protocol.js; GameChannel/Router
  - **Reuse:** Existing100ms room tick, tagged output, membership and slow-consumer policy; B D2/D3.
  - **Required behavior:** Initialize from public preset projection; snapshot after roster, on state/event changes and ≤30s repair; add rate-limited atmosphere_get; state/event revision independent of Theater; precompute future events with bounded lead/cadence.
  - **Architecture constraints:** No per-particle traffic, extra per-room process or weather DB; scheduled deadlines checked cheaply inside existing tick; max4 events8KiB.
  - **Failure/cleanup:** Empty room stops scheduler; lost lease emits nothing; unknown/no-atmosphere room responds unavailable; no fallback to Node.
  - **Tests:** new test/afterlight/world/atmosphere_test.exs cross-language fixtures and GameChannel integration: two clients same state, late join, membership rejection, bounds/rate limit, no-owner emission, empty-room cleanup.
  - **Verify:** mix test test/afterlight/world/atmosphere_test.exs test/afterlight_web/game_channel_world_test.exs
  - **Done when:** Snapshot captures show semantic-only payloads and exact epoch/revision/event rules from B.
  - **Do not change:** Do not repurpose World.Weather/weather_update or alter garden tick logic.

- [x] 2.2 Consume snapshots with room, revision and generation protection

  - **Goal:** Consume snapshots with room, revision and generation protection
  - **Files/symbols:** new src/atmosphere/stateClient.js; src/net/roomEpoch.js/client.js; src/places/runtime.js; src/main.js updateWeatherDisplay
  - **Reuse:** Existing NetworkClient handlers/desiredRoom and A generation; B D1/D2/D3.
  - **Required behavior:** Filter room before epoch; accept full replacement revisions; anchored server time separate from paused t; one resnapshot per5s; keep legacy weather display from overriding active atmosphere; attach directory semantic label.
  - **Architecture constraints:** No separate socket or listener per cached world; register once and route only current generation.
  - **Failure/cleanup:** Disconnect preserves benign local rendering, cancels shared events; resume seeks current state; invalid/unsupported frame marks unavailable without partial apply.
  - **Tests:** new tests/atmosphere-client.test.js: wrong-room high epoch, duplicates/revision gap, reconnect new epoch, delayed callbacks, settings resume, default fallback, no garden weather scene override.
  - **Verify:** node --test tests/atmosphere-client.test.js tests/net/room-epoch.test.js tests/transport-adapter.test.js
  - **Done when:** Late join and reconnect agree on high-level state while old-room frames cannot alter new place.
  - **Do not change:** No changes to Theater timeline revisions or binary payload format.

## 3. Local renderer and spatial response

- [x] 3.1 Create one retained active atmosphere controller and sky/light bindings

  - **Goal:** Create one retained active atmosphere controller and sky/light bindings
  - **Files/symbols:** new src/atmosphere/controller.js/sky.js; main hemisphere reference/frame; A runtime resource ownership; tools/atmosphere/harness.html/main.js
  - **Reuse:** Existing scene fog/sun/ACES/bloom and rAF; B D4.
  - **Required behavior:** Capture/restore baseline colors/intensities/exposure; active update only; sample fixed/scheduled state; gradient/cloud sky; test harness imports production modules with seeded clock/camera fixtures.
  - **Architecture constraints:** No extra rAF/postprocessing renderer; no sky object allocations per frame or hidden update loops.
  - **Failure/cleanup:** Deactivate idempotently detaches owned effects/restores globals; build error preserves old world; fixture seek cancels expired events.
  - **Tests:** new tests/atmosphere-lifecycle.test.js with fake renderer/light handles:600 hidden frames zero updates, restore exact values, double-dispose, failed activation, rapid generations.
  - **Verify:** node --test tests/atmosphere-lifecycle.test.js; npm run build
  - **Done when:** Harness renders light/fog/sky transitions in all camera modes and lifecycle counters return to baseline.
  - **Do not change:** No Theater geometry/engine or experimental WebGPU migration.

- [x] 3.2 Implement authored exposure and batched rain/splashes

  - **Goal:** Implement authored exposure and batched rain/splashes
  - **Files/symbols:** new src/atmosphere/exposure.js/precipitation.js; harness cover fixtures
  - **Reuse:** Existing BufferGeometry/Points/instancing concepts; B D4/D5 limits.
  - **Required behavior:** Classify ≤16 zones with deterministic priority and feather; batch4096/1024 rain segments and128/32 splashes; clip segment below roof not just head; external rain visible under shelter; pooled runoff anchors ≤64.
  - **Architecture constraints:** Preallocated typed arrays/uniforms, max6/3 effect batches total; no per-drop Mesh/DOM/raycast or network position.
  - **Failure/cleanup:** Off/hidden stops uploads; quality change reallocates only once; dispose arrays/geometry/materials on active controller exit.
  - **Tests:** new tests/exposure.test.js for boundaries/overlap/partial canopy and tests/precipitation.test.js for quality caps/reuse; harness screenshots under roof/first-person clip.
  - **Verify:** node --test tests/exposure.test.js tests/precipitation.test.js; npm run build
  - **Done when:** Cover visibly masks below-roof streaks, outside rain persists, counters satisfy budgets and no per-frame object growth appears.
  - **Do not change:** No height-aware movement physics or arbitrary raycast shelter engine.

- [x] 3.3 Make wet surface families survive static batching

  - **Goal:** Make wet surface families survive static batching
  - **Files/symbols:** src/districts.js buildDistrict batching; new src/atmosphere/surfaces.js; harness wet/dry slabs
  - **Reuse:** Existing instance colors and explicit dynamic exclusions; B D6.
  - **Required behavior:** Batch new builders by declared material family; keep immutable dry snapshots; apply absolute wet color/roughness, separate sheltered dry family, ≤8/4 pooled puddles and optional bounded procedural map/glints.
  - **Architecture constraints:** No per-instance material cloning or per-frame instanceColor updates; legacy single batch unchanged; no SSR/mirror promise.
  - **Failure/cleanup:** Restore dry parameters exactly; separate world material ownership; missing map falls back glints; dispose owned map only.
  - **Tests:** new tests/wet-surfaces.test.js:10 cycles no drift, two worlds isolated, post-batch material bound, sheltered family unchanged, dispose counts; existing districts tests.
  - **Verify:** node --test tests/wet-surfaces.test.js tests/districts.test.js; npm run build
  - **Done when:** Batched slabs visibly change with wetness and restore without corrupting another cached world.
  - **Do not change:** No material changes to Theater or unregistered legacy scenery.

## 4. Audio, events and comfort

- [x] 4.1 Extract local mixer and environmental zone audio

  - **Goal:** Extract local mixer and environmental zone audio
  - **Files/symbols:** new src/audio/mixer.js/environmentAudio.js; main sound/chime/footsteps; narrow TheaterScreenUI.setMixGain
  - **Reuse:** Existing user gesture, footsteps key and engine.setVolume; B D7.
  - **Required behavior:** One AudioContext; independent logical gains; retain footstep preference; crossfade exposed/roof/alcove loops500ms; user media volume multiplied by mix gain on all engine start/slider paths; optional P8 mix hook only.
  - **Architecture constraints:** No createMediaElementSource for CORS-hostile videos, no capture/voice detector, no rewriting provider engines or shared queue.
  - **Failure/cleanup:** Autoplay denial retries on gesture; stop/disconnect sources≤200ms on exit; unavailable provider volume reported; clear duck on adapter removal/travel.
  - **Tests:** new tests/environment-audio.test.js fake AudioContext: retained loops, gain smoothing, exit cancellation, malformed storage; extend tests/theater-ui.test.js for effective volume including new engine initialization.
  - **Verify:** node --test tests/environment-audio.test.js tests/theater-ui.test.js; npm run build
  - **Done when:** Zone transitions change sound without loop churn and media/user volume survives duck/unduck and engine replacement.
  - **Do not change:** No callPanel/calls.js, TURN/SFU, or original Sound toggle controlling media unexpectedly.

- [x] 4.2 Render bounded shared lightning and event envelopes

  - **Goal:** Render bounded shared lightning and event envelopes
  - **Files/symbols:** new src/atmosphere/events.js; audio event handles; harness event controls
  - **Reuse:** B server event IDs/timing and stateClient clock, resource generation.
  - **Required behavior:** One pooled active visual, ≤32 current-epoch seen IDs; lightning single800ms bounded pulse; distance-based delayed thunder0.5–4s; skip events begun before join/expired during pause; meteor handler slot prepared.
  - **Architecture constraints:** No independent local shared-event scheduler, per-event scene accumulation or rapid strobe; never change HUD flash layer.
  - **Failure/cleanup:** Cancel audio/visual handles on exit/disconnect/mute; duplicates no-op; >250ms-late live event skipped; clock discontinuity resnapshots.
  - **Tests:** new tests/ambient-events.test.js: duplicate, old snapshot, future join, 250ms edge, pause/visibility resume, travel-before-thunder, flash off, event count cap.
  - **Verify:** node --test tests/ambient-events.test.js tests/atmosphere-client.test.js
  - **Done when:** Two clients consume same future event IDs once and old events never replay on join or travel.
  - **Do not change:** No quests or user-triggered storm RPC.

- [x] 4.3 Add quality and comfort preferences with stable fallbacks

  - **Goal:** Add quality and comfort preferences with stable fallbacks
  - **Files/symbols:** new src/atmosphere/quality.js; index.html settings/src/style.css; main quality/atmosphere listeners
  - **Reuse:** Existing DPR selector, particle checkbox and native dialog; B D8.
  - **Required behavior:** Separate normal/reduced effect tiers from DPR; OS reduced-motion default with local override, flash default reduced/off option, audio gains; preserve light/fog/wetness when particles disabled; apply limits once per change.
  - **Architecture constraints:** Exact B count/texture/CPU ceilings; no silent raising limits; input labels/tab order visible and persistent key additive.
  - **Failure/cleanup:** Malformed/unavailable storage session defaults; preference changes cancel incompatible pending effects; restore shadow quality on place exit.
  - **Tests:** new tests/atmosphere-quality.test.js: tier caps, OS preference, zero/malformed storage, particle-off retains world, flash reduction, repeat changes stable allocations; browser narrow keyboard settings.
  - **Verify:** node --test tests/atmosphere-quality.test.js; npm test; npm run build
  - **Done when:** Preferences work without restart and reduced mode remains an atmospheric navigable scene.
  - **Do not change:** No whole-app render quality overhaul or hidden unconditional atmosphere-off behavior.

## 5. Evidence, protocol documentation and release gate

- [x] 5.1 Measure the harness and prove control-plane/lifecycle integration

  - **Goal:** Measure the harness and prove control-plane/lifecycle integration
  - **Files/symbols:** tools/atmosphere/capture.mjs and README (new); this change evidence/; docs/places.md and architecture/elixir/protocol-catalog.md/ownership.md
  - **Reuse:** A verification.md and existing realtime capture/report discipline; existing Phoenix test stack.
  - **Required behavior:** Implement measurement JSON with render.calls/triangles, active particles/lights/shadows, resource counters, frame p50/p95 and hardware/browser/DPR; run wet/cover/event fixtures plus 20 travel cycles; document new messages and separation from farm weather.
  - **Architecture constraints:** Do not use avatar benchmark as weather evidence; no production writes; only enable atmosphere flag after1.1 and protocol tests pass.
  - **Failure/cleanup:** Report unavailable GPU timer/heap metrics honestly; failing gate requires reduction and rerun, never fabricated screenshot/perf.
  - **Tests:** Full JS/Mix suites, harness visual run all cameras/two tiers, two-client snapshot/travel/reconnect test and existing Theater regression.
  - **Verify:** npm test; npm run build; mix test; node tools/atmosphere/capture.mjs --url http://localhost:5173 --place harness --matrix --out openspec/changes/add-atmosphere-weather-system/evidence (contract in A verification.md; use actual existing dev port)
  - **Done when:** Protocol is bounded and documented, owner test passes, visual/perf evidence records actual result and B is ready for C.
  - **Do not change:** No implementation of C layout in B, backend authority flip or P8/multi-node GO claims.

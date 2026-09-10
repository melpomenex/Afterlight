## Parallelization map

Interfaces are frozen in Phase 0 before parallel work starts. Recommended
workstreams (one agent each, minimal overlap):

- **Agent A — manifest/cabinet/artwork/projection** (Phase 1)
- **Agent B — dependency + standalone shell + game modularization** (Phase 2)
- **Agent C — pure simulation extraction + canonical courses** (Phase 3–4)
- **Agent D — authoritative Elixir reducer/course/AI** (Phase 8)
- **Agent E — protocol + SessionServer/session policy** (Phase 8–9)
- **Agent F — hosted runtime/rendering/HUD/audio** (Phase 5)
- **Agent G — client activity controller + view lease + input** (Phase 6)
- **Agent H — prediction/interpolation/clock** (Phase 10)
- **Agent I — loading/preparation/prewarm** (Phase 7)
- **Agent J — lobby/captain/results/queue + cabinet display** (Phase 11)
- **Agent K — lifecycle/resource cleanup** (Phase 12)
- **Agent L — JS/Elixir tests + browser gate + load** (Phase 14–16)

Do not let two agents edit `shared/placeDefinitions.js`, `src/main.js`,
`shared/activityProtocol.js`, `session_server.ex` or `shared/downhill/rules.js`
simultaneously; sequence those edits through Phase 0 contracts.

## 0. Contract freeze and baseline (blocks all parallel work)

- [x] 0.1 Record the source baseline: commit hash, `games/downhill-mayhem`
  file hashes, `standalone.html` copy, representative screenshots (title,
  countdown, ramp/air trick, combat, finish, results) and the source control
  map. Store under the change folder or `docs/`.
- [x] 0.2 Freeze the `shared/downhill` module API (`course.min.js`, `rules`,
  `ai`) and the host adapter interface (`games/downhill-mayhem/src/host/types.js`)
  from `design.md` D6/D17 so all agents compile against one boundary.
- [x] 0.3 Freeze the protocol additions (type/course constants,
  `validateDownhillControls`, `validateDownhillFence`, `activity_config`,
  envelope fields, error codes) in `shared/activityProtocol.js`.
- [x] 0.4 Freeze the Elixir module names and the `DownhillMayhem` reducer
  contract (`initial_state/3`, `neutral_controls/0`, `normalize_controls/1`,
  `step_rider/5`, `try_strike/…`, `world_position/2`, `round_wire/1`).
- [x] 0.5 Record a green baseline: `npm test`, `npm run build`, targeted Elixir
  suites, and a Theater visual smoke.

## 1. Manifest, cabinet, artwork and projection

Can run in parallel with Phases 2–8 after 0.

- [x] 1.1 `shared/placeDefinitions.js`: add `'downhill-mayhem'` to
  `ACTIVITY_TYPES`; add `DOWNHILL_MAYHEM_CABINET` and
  `DOWNHILL_MAYHEM_ACTIVITY_DEFINITION` (design D1) at the Signal Lost
  transform with six anchors/dismounts; replace `SIGNAL_LOST_ACTIVITY_DEFINITION`
  in `ORPHEUM_ACTIVITIES`; keep Signal Lost exported and dormant.
- [x] 1.2 Add `'downhill-mayhem'` to the race-type lists in
  `scripts/export-place-definitions.mjs` and
  `server_elixir/lib/afterlight/world/place_definitions.ex`.
- [x] 1.3 Regenerate `server_elixir/priv/place_definitions.json`; `--check`
  clean.
- [x] 1.4 Add the `downhill` motif painter to `src/arcade/artwork.js` `MOTIFS`;
  add the `'downhill-mayhem'` label to `src/ui/activityDiscovery.js`.
- [x] 1.5 Update `tests/arcade-cabinet.test.js`, `tests/activity-definitions.test.js`,
  `tests/orpheum-arcade.test.js`, `tests/nearby-activities.test.js` for the new
  placed machine, five-cabinet count, motif/LED distinctness, anchors/dismounts
  clearance and Signal Lost dormancy.
- [x] 1.6 Add `src/style.css` presentation support for the activity (or reuse an
  existing activity class) — no global selector leakage.

## 2. Dependency reconciliation, standalone shell and game modularization

- [x] 2.1 Add `games/downhill-mayhem/package.json` (`three ^0.185.1`, dev vite
  matching root) and `vite.config.js`; preserve `LICENSE`, `THREE.LICENSE`,
  `README.md`.
- [x] 2.2 Preserve the original self-contained file byte-for-byte as
  `games/downhill-mayhem/standalone.html`; convert `index.html` into the thin
  ES-module standalone shell importing `src/standalone.js`.
- [x] 2.3 Split the inlined game script (lines 468–3182) into
  `games/downhill-mayhem/src/game/{course,world,riders,rendering,hud,audio,effects,input-adapter}.js`
  and `src/host/{runtime,index,types}.js` with bare `three` imports and no
  DOM/renderer ownership in the pure/game modules where avoidable.
- [ ] 2.4 Port r128→r185 API changes (`outputColorSpace`, light intensities,
  renderer renames) and visually verify the standalone against
  `standalone.html` screenshots.
- [x] 2.5 Add `tests/downhill-mayhem-deps.test.js` pinning root↔game `three`
  version-range agreement.
- [x] 2.6 Remove/neutralize GoatCounter in hosted mode; keep it standalone-only.

## 3. Pure simulation extraction (`shared/downhill/rules.js`, `ai.js`)

- [x] 3.1 Extract `riderStep`/`handleLanding`/`crashRider`/trick logic into
  `stepRider(course, rider, control, ctx)` with no Three/DOM/audio/RAF/clock/
  `Math.random`; preserve source order and constants.
- [x] 3.2 Replace the seven gameplay-affecting `Math.random()` sites in AI/
  rider/reset with a deterministic per-match RNG stream.
- [x] 3.3 Extract `tryStrike`/hit resolution and grudge/revenge into the pure
  rules; expose strike outcomes as events.
- [x] 3.4 Extract `aiThink` into `shared/downhill/ai.js` producing the same
  control shape as a human.
- [x] 3.5 Expose `initialRiderState`, `neutralControls`, `normalizeControls`,
  `step`, `worldPosition` and `RULES_VERSION`; delete the old globals from the
  hosted path.
- [x] 3.6 Write Node fixtures for acceleration, braking, steering, slopes,
  jumps, landing, crash, boost, trick success/fail, obstacle collision,
  finish, punch/kick range/hit/miss/invuln/knockdown, AI decisions and
  placement/ties.

## 4. Canonical course representation

- [x] 4.1 Implement `shared/downhill/course.js` (document load + small sampler:
  `centerAt`, `sampleTrack`, `heightAt`, `rampHeightAt`, `obstacleAt`) and
  `courseHash.js` (Node-only) / `courseDocument.js` (lazy JSON re-export).
- [x] 4.2 Implement `scripts/export-downhill-courses.mjs` to generate and
  commit Classic/Timberline/Rockgarden documents to
  `shared/downhill/courses/*.json` with byte-identical copies in
  `server_elixir/priv/downhill_courses/` and a `--check` mode.
- [x] 4.3 Implement the server Daily generator and the
  `GET /api/downhill/course/daily` delivery (or join-baseline delivery) with a
  UTC-midnight cache; ensure clients never generate the Daily independently.
- [x] 4.4 Add `course_mismatch` gating on the `loaded` handshake and tests for
  authored and Daily identity.

## 5. Hosted game runtime and rendering

- [x] 5.1 Implement `games/downhill-mayhem/src/host/runtime.js` +
  `index.js` (`createDownhillMayhemHost`) per design D2/D17: external renderer,
  viewport/hudHost/audio/params injection, `preload/prepare/ready/enter/update/
  present/resize/input/session/dispose`.
- [x] 5.2 Port world/terrain/scenery/gates builders (`src/game/world.js`) to
  render from the canonical course document; render/contact agreement.
- [x] 5.3 Port rider rigs/animation (`src/game/riders.js`) including trick
  poses, crash tumble, punches/kicks, boost glow and revenge marking.
- [x] 5.4 Port rendering/camera/effects (`src/game/rendering.js`,
  `effects.js`): chase camera with lookahead/speed FOV, flat-shaded fog, CRT
  filter, speed streaks, popups, hit flash; no post-processing dependency.
- [x] 5.5 Port HUD (`src/game/hud.js`) into a scoped host subtree (lobby,
  countdown, racing, results) and touch controls; consume no global IDs.
- [x] 5.6 Port AudioSys (`src/game/audio.js`) to accept an injected context/
  destination with `ownsContext`, voice cap, music start/stop and mute.
- [x] 5.7 Implement readiness barrier (posed camera, valid grid/support,
  prepared programs, one hidden full frame) and no-op pre-readiness present.
- [x] 5.8 Implement `dispose()` walking all systems; idempotent.

## 6. Client activity integration (bystander + controller)

- [x] 6.1 `src/activities/downhill-mayhem.js`: registration, cabinet at the
  manifest transform, `createScreenPipeline` + `createArcadeCabinet`, attract
  and occupied/racing/results paint from `audience:'summary'` frames,
  `beginParticipation` with an attempt token and lazy controller import,
  idempotent dispose.
- [x] 6.2 `src/activities/downhill/controller.js`: participation join, view
  lease acquisition (`present`), capture-phase input (E punch/F kick/Escape
  exit), HUD mount, audio mixer injection, net send/receive, exit funnel.
- [x] 6.3 Wire the static import into `src/main.js`; verify `interact()` E
  routing and Escape handling.
- [x] 6.4 Add the `downhill-mayhem` explicit-readiness exception in
  `src/activities/participation.js` (mirror `snowboard-race`).
- [x] 6.5 Add `src/activities/downhill/{scene,hud,audio}.js` scene/HUD/audio
  adapters and chunk-loaded CSS scoped to the activity.
- [x] 6.6 Add `body` presentation class handling and removal on every release
  path.

## 7. Loading, preparation and prewarm

- [x] 7.1 Add `src/activities/downhillMayhemPreparation.js` (prefetch/prepare/
  readiness/retain/evict) using the existing `resourceCache`.
- [x] 7.2 Add a proximity scheduler (Kart pattern; budget 2 ms idle / 4 ms
  near) and idle module prefetch after the Theater is interactive.
- [x] 7.3 Use `graphicsJobs` renderer transactions for hidden preparation and
  restore host state in `finally`.
- [x] 7.4 Ensure canceled/stale preparation attaches to nothing and is disposed
  once; add fake-scheduler tests.

## 8. Authoritative Elixir rules, course, AI and session policy

- [x] 8.1 `Afterlight.Activities.DownhillMayhem` pure reducer mirroring
  `shared/downhill/rules.js`; `enabled?/0` gated by
  `AFTERLIGHT_DOWNHILL_MAYHEM_ENABLED`.
- [x] 8.2 `.../downhill_mayhem/course.ex`: committed document loader/hash (and
  the Daily generator).
- [x] 8.3 `.../downhill_mayhem/ai.ex`: deterministic AI input generation.
- [x] 8.4 `.../downhill_mayhem/session_policy.ex`: phases, six-rider human/AI
  population, min 1, explicit readiness, 3 s countdown lock, 30 Hz ticks,
  180 s deadline, 30 s finish/grace, results, rematch, DNF.
- [x] 8.5 `.../downhill_mayhem/presentation.ex`: participant/summary snapshot
  builders, `self` attachment, result shape (six riders with place/time/DNF).
- [x] 8.6 Add `session_server.ex` dispatch: `"downhill-mayhem"` init/step,
  tick/snapshot cadence (33 ms / 50 ms), countdown/deadline/results timers,
  captain config, AI fill, `strike` events, addressed delivery, overload abort.
- [x] 8.7 `activities.ex` feature gate and `config/runtime.exs` flag.
- [x] 8.8 Elixir tests: reducer parity, course/hash, session lifecycle,
  population, AI determinism, combat, reconnect/DNF, stale-match fencing.

## 9. Protocol and networking

- [x] 9.1 `shared/activityProtocol.js`: constants, `validateDownhillControls`,
  `validateDownhillFence`, `activity_config`, error codes, limits.
- [x] 9.2 `src/net/client.js`: send `activity_config`; apply the strict control
  allowlist; carry `matchId`/`seq`; fail closed on unsupported transport.
- [x] 9.3 `game_channel.ex`/`router.ex`: route `activity_config`, enforce
  payload/rate ceilings, canonical session key.
- [x] 9.4 Protocol tests (JS + Elixir) for every validation branch.

## 10. Prediction, reconciliation, interpolation and clock

- [x] 10.1 `src/activities/downhill/prediction.js` (shared rules, 30 Hz
  accumulator, 60-step history, ≤4 catch-up, 250 ms freeze, smoothing/hard
  reset, appliedSeq/heldControls replay).
- [x] 10.2 `src/activities/downhill/interpolation.js` (100 ms buffer,
  serverTick interpolation, ≤100 ms extrapolation, resetSeq clearing).
- [x] 10.3 `src/activities/downhill/clock.js` (RTT midpoint, lowest-RTT-of-8,
  monotonic `performance.now()` mapping, countdown).
- [x] 10.4 Wire into the controller; add prediction/interpolation tests.

## 11. Lobby, captain, results, queue and cabinet display

- [x] 11.1 Lobby HUD: human roster, AI slots, mountain, difficulty, captain
  marker, ready count, queue/spectator counts, exit.
- [x] 11.2 Captain settings via `activity_config`; leadership transfer.
- [x] 11.3 Countdown HUD synced to server `startAt`.
- [x] 11.4 Racing HUD (position, time, speed, boost, trick/combo, strikes) and
  results HUD (six riders, rematch/exit); authoritative events only.
- [x] 11.5 Queue/spectator UX and offer acceptance.
- [x] 11.6 Cabinet screen display states driven by summary frames.

## 12. Lifecycle cleanup and failure handling

- [x] 12.1 Ensure every exit path (pause-exit, results-exit, travel,
  disconnect, ejection, context loss, exception, cancel) funnels to one release
  and does not double-dispose.
- [x] 12.2 Restore renderer policy and body class on every path.
- [x] 12.3 Add N-cycle enter/exit and rematch leak tests (listeners, contexts,
  DOM, audio, scene, subscriptions, prediction buffers).
- [x] 12.4 Verify no world simulation/raycast/HUD/minimap runs while leased
  beyond what is required, and chat/theater sync continue.

## 13. Standalone compatibility

- [x] 13.1 Standalone shell creates its own renderer/RAF, local authoritative
  sim/AI, PB/ghost/challenge and analytics; `npm run dev`/`npm run build` pass.
- [x] 13.2 Port/keep standalone harnesses or add an autoplay/full-race gate
  using `window.GAME.test`.
- [ ] 13.3 Confirm standalone visual/mechanical parity with `standalone.html`.

## 14. Automated verification

- [x] 14.1 JS unit/integration suites for manifest/cabinet, rules, course,
  protocol, session policy mapping, prediction/interpolation, lifecycle.
- [x] 14.2 Elixir suites for reducer/course/AI/session/channel/telemetry.
- [x] 14.3 Cross-runtime golden fixture suite with the documented tolerance.
- [x] 14.4 `npm test`, `npm run build`, `mix test` all green.

## 15. Browser end-to-end gate

- [x] 15.1 `scripts/downhill-mayhem-gate-browser.mjs` modeled on the Summit
  Run/Kart gates: two clients, walk-up E, shared lobby, captain settings,
  readiness, synchronized countdown, racing, authoritative strike agreement,
  jump/trick/boost, finishes, identical standings, rematch, exit and Theater
  restoration, no second canvas/renderer/RAF/socket/navigation.
- [ ] 15.2 Additional cases: one-human race, third-user queue, disconnect/
  reconnect, grace expiry, captain departure, failed course load, repeated
  enter/exit soak.
- [x] 15.3 Record screenshots/evidence in the change folder.

## 16. Performance and load characterization

- [x] 16.1 Record frame budget, chunk sizes (raw/gzip) and entry timing.
- [x] 16.2 Soak budgets: memory/heap/texture after repeated entry/exit and
  eviction; renderer policy restored.
- [ ] 16.3 Server load characterization (six simulated riders/session, 30 Hz
  tick cost, snapshot serialization, scheduler impact, memory/session, social
  room effect) and set initial rollout limits from evidence.
- [ ] 16.4 Do not claim unsupported scale; report measured capacity and limits.

## 17. Observability

- [x] 17.1 Emit bounded low-cardinality `[:afterlight, :activity,
  :downhill_mayhem, …]` telemetry (sessions, phase, rider counts, tick debt,
  snapshot rate, aborts, reconnects, DNF, cleanup) with no ids/secrets.
- [x] 17.2 Add client readiness/prep metrics (Kart pattern) without identifiers.

## 18. Documentation, rollout and final acceptance

- [x] 18.1 `README.md`: cabinet, controls (E punch/F kick/Esc exit), lobby,
  modes, flag.
- [x] 18.2 `docs/arcade.md` motif row; new `docs/downhill-mayhem.md` (lifecycle,
  controls, provenance, limits, runbook); `AGENTS.md` repository-map row.
- [x] 18.3 Record provenance/attribution and the r128→r185 port notes.
- [x] 18.4 Feature flag default, enable/disable/drain/rollback procedure.
- [ ] 18.5 Final acceptance: a two-human Theater flow satisfies the exact
  user experience in `proposal.md`/`design.md`; one host renderer, one primary
  loop and one transport after repeated races; existing cabinets, snowboard,
  pool, chat and theater regressions pass.

## Final acceptance criteria

- [x] A.1 A current Theater cabinet visibly reads `DOWNHILL MAYHEM`; cabinet
  count is five; the layout is unchanged.
- [x] A.2 E at the cabinet launches the real game through the canonical
  activity path; no iframe, page navigation, second WebGL context/renderer/RAF
  or second socket.
- [x] A.3 One to six humans play the same race with server AI filling the field
  to six; the field is always six.
- [ ] A.4 Both clients see the same mountain, difficulty, field, combat
  outcomes and final standings.
- [ ] A.5 Combat, tricks and boost work in multiplayer and are server-resolved.
- [ ] A.6 Rematch starts a new race without reload or world rebuild.
- [x] A.7 Exit restores Theater controls, HUD, camera, renderer policy and
  audio on every path.
- [x] A.8 Standalone Downhill Mayhem still works.
- [x] A.9 Repeated races and exits leak no renderer/canvas/RAF/socket/listener/
  DOM/audio/GPU growth beyond budgets.
- [ ] A.10 All JS/Elixir suites, the production build, the two-browser gate and
  the load characterization pass; the feature ships behind
  `AFTERLIGHT_DOWNHILL_MAYHEM_ENABLED`.

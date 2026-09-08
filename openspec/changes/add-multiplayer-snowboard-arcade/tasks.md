## 1. Contract freeze and preparation (phase 0; integrator)

- [x] 1.1 Recheck working-tree baseline and pending `add-place-activities-program` integration; preserve cabinet changes and document landing commits in change evidence. Read investigation/design/specs and run scoped Ripwire planning before edits.
- [x] 1.2 Freeze D4 lifecycle, D7 wire fixtures (including private applied acknowledgments, role normalization, queue/cancel and summary audience), course format and rulesVersion. Add fixtures under `tests/fixtures/snowboard/` and matching Elixir fixture loader; all later lanes depend on this contract.
- [x] 1.3 Record baseline Node tests/build and targeted Elixir activity/channel tests; record existing failures separately. Confirm browser/Chromedriver and isolated load environment prerequisites. Do not claim unrelated failures are introduced here.
- [x] 1.4 Record SSXTricky commit/source authorization and extraction attribution in new `docs/summit-run-assets.md`; exclude branding/AI/React shell and unknown third-party assets.

## 2. Cabinet declaration and art (phase 1; content lane, after 1.2)

- [x] 2.1 Add `snowboard-race` type and `summit-run` manifest declaration, minPlayers/ready policy/course metadata and eight anchors in `shared/placeDefinitions.js`; extend JS validators and `scripts/export-place-definitions.mjs` plus Elixir projection/reader. Verify exact projection parity.
- [x] 2.2 Add summit skin motif in `src/arcade/artwork.js` through existing skin channels; reuse canonical GLB and fallback. Extend `tests/arcade-cabinet.test.js` for unique skin/shared geometry/disposal.
- [ ] 2.3 Place fifth cabinet in `src/world/theaterWorld.js` with coherent footprint/aisles; test all anchors, dismounts, gates/seats, existing four cabinets and four camera views in `tests/orpheum-arcade.test.js` and browser screenshots.
- [x] 2.4 Build bounded public summary/attract display in lightweight `src/activities/snowboard.js`; route summary audience separately and verify no mountain import for passive bystanders (after 1.2, may parallel 2.2–2.3).

## 3. Shared course and pure movement (phases 2–3; rules lane, after 1.2)

- [x] 3.1 Create versioned numeric course grid/centerline/ramp/obstacle/gate data and exact server export/hash under new `shared/snowboard/`; validate bounds, interpolation, collider cap and all recovery points before first physics use.
- [x] 3.2 Implement fixed-step JS rules per D5: grade acceleration, tuck/brake, damped carve, shoulders/boundaries, jump charge/release and air/landing. Add Node golden movement/neutralization fixtures.
- [x] 3.3 Add swept obstacle/recovery and ordered gate/finish math; test no recovery-gate credit, tunneling, multiple crossings, ties and deadline. Freeze fixtures for backend parity.
- [ ] 3.4 Build lazy `src/activities/snowboard/scene.js`: terrain from canonical samples, instanced pines/gates/lodge/ramps, original robot/board and chase camera; verify render/contact agreement and readable route (after 3.1, parallel with 3.2).

## 4. Phoenix race authority (phase 4; backend lane, after 1.2; parity waits 3.3)

- [x] 4.1 Add new `Afterlight.Activities.Snowboard` reducer under `server_elixir/lib/afterlight/activities/`, loading identical course data; reproduce pure motion/collision fixtures within D10 tolerance without rigid-body dependency.
- [x] 4.2 Extend `session_server.ex` through a snowboard lifecycle policy for min2/max8, explicit ready, locked countdown, deadlines, all placements/DNF, ties and results; preserve existing game dispatch and regressions.
- [ ] 4.3 Add independent reconnect/freeze/DNF, lease rotation, duplicate connection transfer, FIFO offer acceptance, inactivity/empty cleanup and results retention; test real session process lifetime.
- [ ] 4.4 Use owner-derived canonical room key for snowboard lookup in `activities.ex`; keep manifest/wire IDs distinct, fail admission closed, preserve owner fences and test two instance keys/epoch changes. Document single-owner-node admission constraint.
- [ ] 4.5 Add disabled-by-default server capability/admission flag; unsupported type gives typed unavailable, and terminal snowboard results remain bounded/session-local without calling unsupported durable Results path.

## 5. Protocol delivery and prediction (phase 5; network lane, after 1.2; integrate after 4)

- [ ] 5.1 Extend `shared/activityProtocol.js`, network facade/`src/net/phoenixClient.js` as needed and GameChannel activity validation for strict F identity, role aliases, all D7 controls/actions and stale match handling; preserve legacy envelopes.
- [ ] 5.2 Add exact full/summary/private-baseline schemas, appliedSeq/heldControls, serverTick/snapshotSeq/resetSeq and clock-correlated acknowledgments; test no private lease/input leakage and hard final size validation.
- [ ] 5.3 Implement bounded addressed race snapshot delivery using existing channel processes instead of room-wide full-frame fanout; cap recipients and slow consumers; low-rate summaries remain room-scoped. Test stalled actual transport, coalescing and chat continuity.
- [ ] 5.4 Implement JS prediction/reconciliation in new snowboard prediction module using per-tick history and applied acknowledgments, not accepted input counts; test unapplied input and stale/missing snapshot cases (after 3.2/5.2).
- [ ] 5.5 Implement 100ms remote interpolation/limited extrapolation and reset handling; test equal revision/new motion, wrong generation and visual correction thresholds.
- [ ] 5.6 Implement monotonic local countdown mapping from correlated server timestamps; test delayed join, jitter and local wall-clock change without modifying authoritative start.

## 6. Host view and seamless loading (phase 6; runtime lane, after 1.2; integrates 2–3/5)

- [ ] 6.1 Add optional prejoin `beginParticipation()` routing and generation-bound view lease to activity runtime/main/camera seam; preserve immediate join for old games. Test cancellation E/Esc and double-entry.
- [ ] 6.2 Switch existing render pass scene and camera together; resize leased camera, suppress world raycasts/view controls/theater overlay, keep race update outside social pause and preserve net/theater sync. No second renderer/RAF.
- [ ] 6.3 Implement application-owned resource cache with per-attempt handles and 60s idle eviction; dispose scene/listener/audio ownership on activity disposal, reject late preparation and verify warm rematch no fetch/build.
- [ ] 6.4 Add snowboard input adapter, `{}`→neutral translation, focus resume, charge cancellation and 30Hz held heartbeat; prevent typing/world movement crossover. Existing auto-ready is disabled only for snowboard.
- [ ] 6.5 Implement lobby/HUD/results overlay in lazy module and scoped CSS, accepted-avatar playing label and existing chat/call continuity; no fabricated durable records.
- [ ] 6.6 Wire safe exit/travel/error/disconnect, four-view restoration and resume acceptance/baseline/reacquisition with rotated lease and cleared old predictions. Add sessionStorage activity-only reload hint; no credentials saved.

## 7. Integrated race and rematch (phases 7–8; integrator, after 4–6)

- [ ] 7.1 Exercise real two-client join/load/ready/countdown and authoritative movement/gates/finish via Phoenix; compare HUD/results and private baseline routing with frozen fixtures.
- [ ] 7.2 Exercise all D4 cases: lone rider, 2/4/8 riders, locked countdown cancel, late watch/queue, offer timeout, only-one-left, all-left, grace resume/expiry and process/owner crash.
- [ ] 7.3 Integrate Rematch readiness/new match ID without scene/socket teardown; verify stale previous-match ready/leave/input cannot affect new race and queue promotions remain unready.
- [ ] 7.4 Verify results retention/DNF/tie display and honest session-only status; no unknown game type reaches durable score tables.

## 8. Effects and audio polish (phase 9; presentation lane, after 3.4/6.2)

- [ ] 8.1 Add capped snowfall/spray/trails and low/reduced-motion presets, static instancing and measured draw-call budget; avoid custom compute or new compression dependency without evidence.
- [ ] 8.2 Inject host audio mixer through activity context and add bounded slide/carve/wind/landing/countdown/finish voices; restore ambient gain lease on exit, preserve persisted mute/voice/theater controls.
- [ ] 8.3 Conduct two-human feel/readability pass for carve/jump/landing/obstacles; update versioned tuning/fixtures together and record route/camera/art screenshots. Do not transfer SSX trademarks/assets.

## 9. Automated release gates (phase 10; verification lane, after integration)

- [ ] 9.1 Complete Node suites for definitions, protocol, course/rules, prediction/interpolation, input/view/cancel/resource lifecycle; run all existing relevant tests plus `npm test` and `npm run build`.
- [ ] 9.2 Complete ExUnit reducer parity and SessionServer/Admission/GameChannel tests for same/different instance, malicious/stale commands, readiness, all placements, disconnect/cleanup/fencing and legacy games; run targeted suites then project-required checks.
- [ ] 9.3 Add `scripts/snowboard-gate-browser.mjs` based on existing Chromedriver harness with guaranteed cleanup: two-browser physical E happy path through race/rematch/exit, then extra riders and failure cases in verification spec. Use actual controls, not injected winner snapshots.
- [ ] 9.4 Run twenty rematches and twenty entry/exit cycles with renderer memory, heap, listener/timer/audio counters and eviction baseline; test pending-load cancellation and theater playback restoration; record artifacts.
- [ ] 9.5 Measure 1080p eight-rider high/low rendering, draw calls, gzip initial/lazy bytes and cold/warm load time against D10 budgets on documented hardware. Optimize measured bottlenecks and repeat only affected checks.
- [ ] 9.6 Add telemetry events/exported gauges/counters to existing `Afterlight.Telemetry`; collect local load-failure diagnostics, no high-cardinality labels or secrets. Prove tick/rate/disconnect/abort signals in tests.
- [ ] 9.7 Extend `tools/load_client/` with test-only independent owner/cabinet fixtures and scenarios for 100×4 and 250×4; run 15m soak + failures/slow receivers, concurrent chat/theater traffic, report actual capacity/cleanup in `docs/benchmarks/`.
- [ ] 9.8 Run scoped `ripwire --quality-delta` and `--test-gate` for implementation work; resolve findings and review the complete diff, protocol and resource boundaries before declaring release-ready.

## 10. Documentation and rollout (phase 11; integrator, after 9)

- [ ] 10.1 Update `README.md`, `docs/arcade.md` and new `docs/summit-run.md` with controls/lobby/DNF/reconnect/session-local records, asset provenance and troubleshooting; preserve honest WebGL and P6 status.
- [ ] 10.2 Record backend-first capability rollout, emergency abort/drain and rollback runbook; verify disabled/unsupported transport keeps world and old cabinets functional. Deployment requires the subsequent implementation scope/authorization; this proposal deploys nothing.
- [ ] 10.3 Reconcile parent activity-program spec overlap before archival, verify every acceptance criterion below against evidence and leave incomplete items unchecked. Archive only after implementation and review, not when planning files validate.

## 11. Dependency and ownership map

Phase 1 contracts unblock cabinet/content, pure rules, backend, network and host-view work in parallel. Rules fixtures unblock backend parity and predictor validation; completed backend/network/view/course converge at phase 7. Art/effects can progress independently after course/view seams. Integration unblocks browser/load gates; evidence unblocks rollout.

Shared-file owners: integrator owns `main.js`, activity runtime/participation and final manifest/export merges; backend owner owns SessionServer/Activities/RoomServer; network owner coordinates GameChannel/protocol changes with backend. Content lane supplies manifest/layout/art patches through integrator. Do not have multiple agents independently invent schemas or edit the same seam. Re-run Ripwire lane planning against the actual implementation checkout before delegation.

## 12. Final acceptance criteria

- Canonical cabinet GLB reused with unique original Summit Run skin, readable E/button interaction and safe layout; all four existing cabinets work.
- Two users at the same cabinet share lobby and can ready without filling eight slots; four/eight riders also work and instance keys isolate sessions.
- One host renderer/socket/identity/frame loop, lazy mountain resources, no reload/iframe/login or social-room travel; avatars/Kiln and chat/theater continuity preserved.
- Synchronized countdown, responsive local prediction, interpolated remotes, valid server checkpoints and server-ordered finish/ties/DNF agreed by all riders.
- Rematch rotates match identity and resets race state without reconnect/rebuild; Exit restores safe world controls from all four camera modes.
- One-player wait, late queue/watch, disconnect/grace/reload, first-player leave, all-opponents leave, crash/owner loss and cleanup meet exact contracts.
- No client transform/winner trust, stale command replay, leaked lease or unbounded audience/queue; unsupported transport fails gracefully.
- Original production assets with provenance; no required SSX branding/music, AI, full rigid-body dependency, ranked economy or premature framework.
- Automated backend and real two-browser happy path/failure regressions pass; baseline rendering without WebGPU works.
- Repeated rematches show no growing resources/performance degradation; performance/load reports state measured capacity and known limits.
- Existing multiplayer/theater/legacy content remains functional and unfinished migration work is not misreported complete.

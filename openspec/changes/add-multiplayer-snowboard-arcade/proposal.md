> **SUPERSEDED IN PART by `integrate-ssxtricky-snowboard` (2026-09-09).**
> The product decision to build "one original night mountain … robot
> snowboarders" from the SSXTricky prototype used as "a useful movement and
> mountain reference" is REVERSED: the actual user-owned SSXTricky Alpine Rush
> implementation (engine.js/rules.mjs presentation and mechanics — daylight
> course, ramps, speed lanes, pickups, tricks, boost) is now the port baseline.
> The SSX branding non-goal is retained (cabinet stays Summit Run). All
> authority, lifecycle, protocol, verification and cabinet-integration
> requirements below remain in force and are dependencies of the new change.
> See `openspec/changes/integrate-ssxtricky-snowboard/design.md`
> §"Reconciliation with add-multiplayer-snowboard-arcade".

## Why

Afterlight already lets friends walk up to shared arcade cabinets. **Summit Run** extends that experience into one polished 2–8 rider downhill race, entered and exited inside the same application. The local SSXTricky prototype provides a useful movement and mountain reference; Afterlight remains the runtime and authority.

## What Changes

- Add one uniquely skinned Orpheum cabinet using `public/arcade/cabinet/afterlight_arcade_cabinet.glb` and the existing activity manifest, interaction, participation and session machinery.
- Add a lazy 3D activity view using the existing renderer, with lobby, synchronized countdown, racing, results, rematch and safe return to the cabinet.
- Extend the existing Phoenix activity session with race-specific lifecycle and a small authoritative course-kinematics reducer; predict locally and interpolate remote riders. No browser host or second socket.
- Deliver one original night mountain, checkpoint gates, robot snowboarders, bounded snow/audio effects, operational instrumentation and automated multiplayer/load gates.
- Preserve existing arcade games, theater playback, chat, world presence and unfinished gardens/economy migration.

## Capabilities

### New Capabilities

- `snowboard-arcade`: cabinet identity, seamless activity view, loading, controls, visual/audio identity and world continuity.
- `snowboard-racing`: course/physics contract, authoritative race lifecycle, protocol, validation, rematch and recovery.
- `snowboard-verification`: regression, multiplayer, resource, telemetry and load-test release gates.

### Modified Capabilities

None of the archived base capabilities changes its general contract. This adds snowboard-specific behavior on top of the **unarchived** `add-place-activities-program` contracts; that change remains independently in progress. Its existing two-player lifecycle must remain unchanged. Its prohibition on isolated travel is preserved: the mountain is a leased rendering view within accepted social-room membership, not another place or application. Implementation must reconcile both changes before either is archived; do not duplicate its generic capability deltas.

## Impact

### Summary, motivation and current architecture

Current working-tree evidence: `src/main.js` uses `THREE.WebGLRenderer`, EffectComposer and one frame loop; the WebGPU realtime backend is experimental. `src/activities/` already owns registry, participation, camera/input seams and cabinet renderers. `src/arcade/` already provides data-driven GLB skins. Phoenix `Afterlight.Activities.SessionServer` already exists, but readiness, disconnect and result handling are substantially two-player shaped. Concrete evidence and reference classification are in `investigation.md`; implementation decisions are in `design.md`.

### User experience and scope

Walk to Summit Run, press E or the interaction button, load into a lobby, press Ready, race together, see authoritative results, then Rematch or Exit. One rider waits for another; no AI or solo fallback in v1. Existing chat continues. Social avatars remain at the cabinet with a playing label. A cheap live progress display lets passersby follow the race; full 3D spectating is nice-to-have, not a release blocker.

### Non-goals and future expansion

No SSX branding/art/music, standalone app, renderer migration, browser host, full rigid-body server engine, AI, tricks economy, ranks, global ladder, mobile controls, UGC or multiple courses. Reuse only justified seams: one optional activity view lease and a race lifecycle policy within existing sessions. Future games may reuse them after proving a need.

### Technical approach, cabinet integration and game runtime

Register type `snowboard-race`, cabinet ID `summit-run` in `theater`; retain generic upright model and add original mountain/trail artwork. Return a synchronous lightweight activity instance; import mountain code only on interaction. A generation-bound view lease switches the existing render pass scene/camera while retaining the social scene in memory. Exit restores world controls, camera preference and a collision-safe cabinet dismount.

### Multiplayer architecture, race lifecycle and networking

Use existing authenticated Phoenix connectivity and `activity_*` envelopes. Session identity follows the room owner and cabinet, with a new match ID for every countdown. No host is required. Two to eight asset-ready riders explicitly ready; all seated riders ready triggers a three-second scheduled start. Server runs bounded 30 Hz kinematics, receives inputs at 30 Hz, and publishes rider snapshots at 20 Hz to a bounded audience. Server crossings and monotonic time determine checkpoints and finish order. Disconnect grace is 30 seconds, with remaining racers continuing.

### Physics and course

Adapt the prototype's course-local representation and readable arcade controls; rewrite its local winner/AI logic. Use a shared versioned course heightfield and obstacle data for both render and simulation. One roughly 1.8 km night route has eight ordered checkpoints, broad carving bends, two forgiving jumps, readable hazards and a lit finish lodge. Implementation values and parity fixtures are specified in the design.

### Rendering, audio and asset strategy

WebGL is the release baseline. Instanced scenery, bounded particles and existing bloom provide snow/night atmosphere; no compute migration is required. Reuse the host AudioContext/mute controls. Create original procedural art, robot boards and synthesized effects. SSXTricky has no tracked license: preserve the user’s explicit source-reuse authorization and attribution; independently create anything with uncertain third-party provenance. See the asset manifest in the design.

### Performance, failure handling and security

Target 60 FPS on a recorded representative desktop, bound catch-up, memory and network queues, and lazy-load all mountain-specific assets. Fail entry back to the world, fence stale async work, resume only after authenticated membership acceptance, and visibly abort on session/owner loss. Clients submit controls only; the server does not accept scores, positions or finish claims. Existing Node-only transport reports the activity unavailable.

### Observability and testing

Extend current telemetry and load tooling; measure rather than claim BEAM capacity. Require reducer/parity tests, actual Phoenix integration, two-browser E-to-rematch flow, 4/8 riders, failure cases, repeated rematches and theater/cabinet regressions. Stage 100 sessions × 4 riders, then 1,000 riders across small sessions in an isolated test environment.

### Rollout and risks

Land contracts first, then independent frontend/backend/art work, then integration and measured release gates. Gate advertisement and admission on a proposed disabled-by-default snowboard feature flag. Roll back by disabling new joins and cleanly draining/aborting races, without touching saved world files. Main risks are two-player assumptions, room-wide snapshot fanout, predictor parity, lazy-view cleanup, reference licensing and uncommitted upstream cabinet work. No implementation or deployment is part of this proposal.

## Acceptance criteria

The implementation is accepted only when the existing GLB has its distinct Summit Run skin; nearby E/button entry opens a shared lobby without reload; two through eight riders can ready and start together; displayed countdowns synchronize; predicted local and interpolated remote riders traverse the same course; the server validates all ordered gates and determines finish/ties/DNF; all racers receive results; rematch works without reload or resource reconstruction; exit restores safe Afterlight controls; disconnect/reload/first-player departure does not destroy others' race; different owner-instance/cabinet keys remain isolated; abandoned processes/resources clean up; mountain resources are lazy; existing cabinets, multiplayer, chat and theater regressions pass; no second renderer/socket/authentication or required SSX branding/assets is introduced; backend and actual two-browser tests pass; and repeated rematches and measured load meet the documented performance/resource gates. The full executable checklist and thresholds are in `tasks.md` and the three capability specs.

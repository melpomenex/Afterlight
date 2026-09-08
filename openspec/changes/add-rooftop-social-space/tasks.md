# Implementation tasks — add-rooftop-social-space

Planning only: every checkbox is intentionally unchecked. Read design.md and ../add-social-place-framework/program.md first. Complete prerequisites before starting; each task depends on earlier tasks in this file unless explicitly stated. New paths below are proposed files to create, not claims they already exist. Commands run from repository root except `mix ...`, which runs from server_elixir. Preserve unrelated working changes.

## 1. Registration and navigable skeleton

- [x] 1.1 Register Rooftop and pin its compatibility contracts

  - **Goal:** Register Rooftop and pin its compatibility contracts
  - **Files/symbols:** shared/placeDefinitions.js/atmospherePresets.js; src/places/registry.js; src/districts.js; generated Phoenix projection; tests/rooftop.test.js (new)
  - **Reuse:** A definitions/worldFactory/readExploration and B preset projection.
  - **Required behavior:** Register or replace builder for rooftops; shell none, explicit stable seed/spawns/bounds/gates/minimap; objective optional per design; exact legacy IDs/seeds/edges retained. Ten seats/three groups, north utility/lounge and east overlook; retain note(−5,5), anemometer(6,−5), completion and original gates. Use E1 exact final coordinates.
  - **Architecture constraints:** No network implementation for a new place: use existing registered-room projection and atmosphere contract.
  - **Failure/cleanup:** Bad definition fails before travel; unaccepted new scene not featured; rollback retains save recognition.
  - **Tests:** Add tests/rooftop.test.js metadata/save and legacy gate golden checks; court remains no-note/no-objective, rooftops retains completed flag; Desert append does not change legacy route.
  - **Verify:** node scripts/export-place-definitions.mjs; node scripts/export-place-definitions.mjs --check; node --test tests/place-definitions.test.js tests/rooftop.test.js
  - **Done when:** rooftops resolves through the framework and every old valid save/route remains intact.
  - **Do not change:** No new rain-court/rooftop alias rooms, schema drops or original snapshot writes.

- [x] 1.2 Build Rooftop floor, collisions and seat approach skeleton

  - **Goal:** Build Rooftop floor, collisions and seat approach skeleton
  - **Files/symbols:** new src/world/rooftopWorld.js; tests/rooftop.test.js
  - **Reuse:** A world helper context, block clearance, bounds helpers and seating metadata.
  - **Required behavior:** Ten seats/three groups, north utility/lounge and east overlook; retain note(−5,5), anemometer(6,−5), completion and original gates. Use E1 exact final coordinates. Build large forms and actual obstacles before decoration; emit explicit sitting/dismount/group metadata; verify player/Kiln and all gate/seat approach points.
  - **Architecture constraints:** Flat movement y0, existing jump collisions, one world group; no navmesh/ramp dependency or per-object loop.
  - **Failure/cleanup:** Construction failure disposes owned partial resources; stand fallback safe spawn; no blocked exit hidden by test relaxation.
  - **Tests:** Use production isWalkable with0.25-grid flood fill for every seat stand point, both actor spawns, named route waypoints and each interaction within1.8; finite transforms after update; test rotated seat dismounts.
  - **Verify:** node --test tests/rooftop.test.js tests/seating.test.js tests/districts.test.js
  - **Done when:** Rooftop has a complete collision-safe route through every gathering zone and exits before polish.
  - **Do not change:** No collider removal merely to pass reachability; no adding required restoration to social space.

## 2. Composition and environmental binding

- [x] 2.1 Add the distinct Rooftop visual composition with bounded batching

  - **Goal:** Add the distinct Rooftop visual composition with bounded batching
  - **Files/symbols:** src/world/rooftopWorld.js; appropriate src/atmosphere modules; tests/rooftop.test.js
  - **Reuse:** A shell-none ownership/material-family batches and existing geometry helpers.
  - **Required behavior:** Author deck/utility/lounge/string lights and three skyline instance bands; windows batched, distant traffic32/8 instances, legacy note/anemometer retained; no navigable city.
  - **Architecture constraints:** Apply E world draw/triangle/light ceilings plus B effect ceilings. Repeated geometry instanced; animated parts excluded. No unique light per window, star or ember.
  - **Failure/cleanup:** Retain procedural fallback if optional texture unavailable; owned material/light/geometry disposal exact; no hidden animation.
  - **Tests:** Add builder integrity tests for instancing, light/shadow and object bounds; skyline maximum instances, unchanged optional restoration effect and finite traffic loop.
  - **Verify:** node --test tests/rooftop.test.js; npm run build
  - **Done when:** Distinct composition exists in all camera views within measured object/batch ceilings; large forms are not recolored legacy scenery.
  - **Do not change:** No external asset pipeline/install, per-particle meshes, giant mirror or experimental renderer switch.

- [x] 2.2 Bind Rooftop atmosphere, zones, sound and events

  - **Goal:** Bind Rooftop atmosphere, zones, sound and events
  - **Files/symbols:** src/world/rooftopWorld.js environment bindings; shared/atmospherePresets.js; B modules only through their existing interfaces
  - **Reuse:** A active lifecycle and B semantic snapshot/clock/quality/audio/event modules.
  - **Required behavior:** B scheduled time/preset interpolation and rain/cover/surfaces; four-segment1200s cycle with60s transitions, analytic wetness and skyline night response. Register authored roof/exposure/audio zones and exact comfort settings; all source loops after user gesture only; local particles never networked.
  - **Architecture constraints:** No room-ID branches in generic atmosphere controller; if a new binding is needed, extend tested common contract rather than duplicate a subsystem.
  - **Failure/cleanup:** On travel cancel pending events/audio, restore globals, stop uploads and dispose active effects; late join skips expired events.
  - **Tests:** Extend tests/rooftop.test.js and tests/ambient-events.test.js: schedule t0/30/60/299/300/600/900/1199/1200 and restart phase, rain+skyline simultaneously, no wrap snap.
  - **Verify:** node --test tests/rooftop.test.js tests/atmosphere-model.test.js tests/ambient-events.test.js tests/environment-audio.test.js; npm run build
  - **Done when:** Two test clients agree on semantic state and zones change perception while all effects remain local and cleanly deactivate.
  - **Do not change:** No user weather commands, garden tick coupling, new shared media or automatic capture.

## 3. Player experience, evidence and promotion

- [x] 3.1 Exercise social routes and record Rooftop acceptance

  - **Goal:** Exercise social routes and record Rooftop acceptance
  - **Files/symbols:** this change evidence/; tools/atmosphere/capture.mjs; tests/rooftop.test.js; README/AGENTS/docs/places.md
  - **Reuse:** A verification.md, B capture harness/quality counters, existing Phoenix stack and Theater regression tests.
  - **Required behavior:** Run real controls through all gathering groups, seats/stand/emotes, both actors and all exits; normal/reduced, OS reduced motion/flash off, all cameras, narrow viewport; record busiest Rooftop frame and20 travel round trips, two-client late join/reconnect. Update accepted destination docs and featured status only after gate passes.
  - **Architecture constraints:** Use isolated guest identities and disposable backend/media data; actual screenshots and measurements required; do not claim headless tests prove appearance.
  - **Failure/cleanup:** Explicitly test missing audio gesture, disconnect and event-in-flight exit; failed performance gate reduces costs/retests rather than raising budgets.
  - **Tests:** Run new place suite, full JS/Mix and build; exercise Theater engine/watchbar/queue through the shared verification matrix after world travel; add any regression found as targeted automated test.
  - **Verify:** npm test; npm run build; mix test; node tools/atmosphere/capture.mjs --url http://localhost:5173 --place rooftops --matrix --out openspec/changes/add-rooftop-social-space/evidence (contract in A verification.md; use actual existing dev port)
  - **Done when:** Rooftop meets its normative acceptance checklist with saved hardware/browser metrics and screenshots; no hidden simulation, seat trap or Theater regression remains.
  - **Do not change:** No production queue overwrite, original data deletion, deployment or marking other change tasks complete.

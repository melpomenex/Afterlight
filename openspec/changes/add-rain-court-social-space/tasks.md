# Implementation tasks — add-rain-court-social-space

Planning only: every checkbox is intentionally unchecked. Read design.md and ../add-social-place-framework/program.md first. Complete prerequisites before starting; each task depends on earlier tasks in this file unless explicitly stated. New paths below are proposed files to create, not claims they already exist. Commands run from repository root except `mix ...`, which runs from server_elixir. Preserve unrelated working changes.

## 1. Registration and navigable skeleton

- [x] 1.1 Register Rain Court and pin its compatibility contracts

  - **Goal:** Register Rain Court and pin its compatibility contracts
  - **Files/symbols:** shared/placeDefinitions.js/atmospherePresets.js; src/places/registry.js; src/districts.js; generated Phoenix projection; tests/rain-court.test.js (new)
  - **Reuse:** A definitions/worldFactory/readExploration and B preset projection.
  - **Required behavior:** Register or replace builder for court; shell none, explicit stable seed/spawns/bounds/gates/minimap; objective optional per design; exact legacy IDs/seeds/edges retained. Arcade x−8..8/z−8..−4, alcove northwest, basin(3,−1.8), six seats/three groups, original three gates; no note/objective. Use C1 exact seat and prop table.
  - **Architecture constraints:** No network implementation for a new place: use existing registered-room projection and atmosphere contract.
  - **Failure/cleanup:** Bad definition fails before travel; unaccepted new scene not featured; rollback retains save recognition.
  - **Tests:** Add tests/rain-court.test.js metadata/save and legacy gate golden checks; court remains no-note/no-objective, rooftops retains completed flag; Desert append does not change legacy route.
  - **Verify:** node scripts/export-place-definitions.mjs; node scripts/export-place-definitions.mjs --check; node --test tests/place-definitions.test.js tests/rain-court.test.js
  - **Done when:** court resolves through the framework and every old valid save/route remains intact.
  - **Do not change:** No new rain-court/rooftop alias rooms, schema drops or original snapshot writes.

- [x] 1.2 Build Rain Court floor, collisions and seat approach skeleton

  - **Goal:** Build Rain Court floor, collisions and seat approach skeleton
  - **Files/symbols:** new src/world/rainCourtWorld.js; tests/rain-court.test.js
  - **Reuse:** A world helper context, block clearance, bounds helpers and seating metadata.
  - **Required behavior:** Arcade x−8..8/z−8..−4, alcove northwest, basin(3,−1.8), six seats/three groups, original three gates; no note/objective. Use C1 exact seat and prop table. Build large forms and actual obstacles before decoration; emit explicit sitting/dismount/group metadata; verify player/Kiln and all gate/seat approach points.
  - **Architecture constraints:** Flat movement y0, existing jump collisions, one world group; no navmesh/ramp dependency or per-object loop.
  - **Failure/cleanup:** Construction failure disposes owned partial resources; stand fallback safe spawn; no blocked exit hidden by test relaxation.
  - **Tests:** Use production isWalkable with0.25-grid flood fill for every seat stand point, both actor spawns, named route waypoints and each interaction within1.8; finite transforms after update; test rotated seat dismounts.
  - **Verify:** node --test tests/rain-court.test.js tests/seating.test.js tests/districts.test.js
  - **Done when:** Rain Court has a complete collision-safe route through every gathering zone and exits before polish.
  - **Do not change:** No collider removal merely to pass reachability; no adding required restoration to social space.

## 2. Composition and environmental binding

- [x] 2.1 Add the distinct Rain Court visual composition with bounded batching

  - **Goal:** Add the distinct Rain Court visual composition with bounded batching
  - **Files/symbols:** src/world/rainCourtWorld.js; appropriate src/atmosphere modules; tests/rain-court.test.js
  - **Reuse:** A shell-none ownership/material-family batches and existing geometry helpers.
  - **Required behavior:** Author masonry tiers, warm windows, roof bands, copper runoff, trees and exposed/sheltered paving families; no common court shell.
  - **Architecture constraints:** Apply C world draw/triangle/light ceilings plus B effect ceilings. Repeated geometry instanced; animated parts excluded. No unique light per window, star or ember.
  - **Failure/cleanup:** Retain procedural fallback if optional texture unavailable; owned material/light/geometry disposal exact; no hidden animation.
  - **Tests:** Add builder integrity tests for instancing, light/shadow and object bounds; wet material binding and shelter roof not being a floor collider.
  - **Verify:** node --test tests/rain-court.test.js; npm run build
  - **Done when:** Distinct composition exists in all camera views within measured object/batch ceilings; large forms are not recolored legacy scenery.
  - **Do not change:** No external asset pipeline/install, per-particle meshes, giant mirror or experimental renderer switch.

- [x] 2.2 Bind Rain Court atmosphere, zones, sound and events

  - **Goal:** Bind Rain Court atmosphere, zones, sound and events
  - **Files/symbols:** src/world/rainCourtWorld.js environment bindings; shared/atmospherePresets.js; B modules only through their existing interfaces
  - **Reuse:** A active lifecycle and B semantic snapshot/clock/quality/audio/event modules.
  - **Required behavior:** B rain/mask/wet material/zone/event modules; fixed rain-night with intensity0.8, cool fill, four/two local lights and rain-chain drips. Register authored roof/exposure/audio zones and exact comfort settings; all source loops after user gesture only; local particles never networked.
  - **Architecture constraints:** No room-ID branches in generic atmosphere controller; if a new binding is needed, extend tested common contract rather than duplicate a subsystem.
  - **Failure/cleanup:** On travel cancel pending events/audio, restore globals, stop uploads and dispose active effects; late join skips expired events.
  - **Tests:** Extend tests/rain-court.test.js and tests/ambient-events.test.js: covered rain mask/alcove priority, existing legacy weather cannot override storm, travel-before-thunder.
  - **Verify:** node --test tests/rain-court.test.js tests/atmosphere-model.test.js tests/ambient-events.test.js tests/environment-audio.test.js; npm run build
  - **Done when:** Two test clients agree on semantic state and zones change perception while all effects remain local and cleanly deactivate.
  - **Do not change:** No user weather commands, garden tick coupling, new shared media or automatic capture.

## 3. Player experience, evidence and promotion

- [x] 3.1 Exercise social routes and record Rain Court acceptance

  - **Goal:** Exercise social routes and record Rain Court acceptance
  - **Files/symbols:** this change evidence/; tools/atmosphere/capture.mjs; tests/rain-court.test.js; README/AGENTS/docs/places.md
  - **Reuse:** A verification.md, B capture harness/quality counters, existing Phoenix stack and Theater regression tests.
  - **Required behavior:** Run real controls through all gathering groups, seats/stand/emotes, both actors and all exits; normal/reduced, OS reduced motion/flash off, all cameras, narrow viewport; record busiest Rain Court frame and20 travel round trips, two-client late join/reconnect. Update accepted destination docs and featured status only after gate passes.
  - **Architecture constraints:** Use isolated guest identities and disposable backend/media data; actual screenshots and measurements required; do not claim headless tests prove appearance.
  - **Failure/cleanup:** Explicitly test missing audio gesture, disconnect and event-in-flight exit; failed performance gate reduces costs/retests rather than raising budgets.
  - **Tests:** Run new place suite, full JS/Mix and build; exercise Theater engine/watchbar/queue through the shared verification matrix after world travel; add any regression found as targeted automated test.
  - **Verify:** npm test; npm run build; mix test; node tools/atmosphere/capture.mjs --url http://localhost:5173 --place court --matrix --out openspec/changes/add-rain-court-social-space/evidence (contract in A verification.md; use actual existing dev port)
  - **Done when:** Rain Court meets its normative acceptance checklist with saved hardware/browser metrics and screenshots; no hidden simulation, seat trap or Theater regression remains.
  - **Do not change:** No production queue overwrite, original data deletion, deployment or marking other change tasks complete.

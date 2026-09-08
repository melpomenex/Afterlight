# Implementation tasks — add-desert-camp-social-space

Planning only: every checkbox is intentionally unchecked. Read design.md and ../add-social-place-framework/program.md first. Complete prerequisites before starting; each task depends on earlier tasks in this file unless explicitly stated. New paths below are proposed files to create, not claims they already exist. Commands run from repository root except `mix ...`, which runs from server_elixir. Preserve unrelated working changes.

## 1. Registration and navigable skeleton

- [x] 1.1 Register Desert Camp and pin its compatibility contracts

  - **Goal:** Register Desert Camp and pin its compatibility contracts
  - **Files/symbols:** shared/placeDefinitions.js/atmospherePresets.js; src/places/registry.js; src/districts.js; generated Phoenix projection; tests/desert-camp.test.js (new)
  - **Reuse:** A definitions/worldFactory/readExploration and B preset projection.
  - **Required behavior:** Register or replace builder for desert-camp; shell none, explicit stable seed/spawns/bounds/gates/minimap; objective optional per design; exact legacy IDs/seeds/edges retained. Fire(0,−2), six radial fire seats plus two shelter seats, two explicit return gates, dunes/mesas beyond bounds, shell none; no new objectives or fuel. Use D1 exact coordinates.
  - **Architecture constraints:** No network implementation for a new place: use existing registered-room projection and atmosphere contract.
  - **Failure/cleanup:** Bad definition fails before travel; unaccepted new scene not featured; rollback retains save recognition.
  - **Tests:** Add tests/desert-camp.test.js metadata/save and legacy gate golden checks; court remains no-note/no-objective, rooftops retains completed flag; Desert append does not change legacy route.
  - **Verify:** node scripts/export-place-definitions.mjs; node scripts/export-place-definitions.mjs --check; node --test tests/place-definitions.test.js tests/desert-camp.test.js
  - **Done when:** desert-camp resolves through the framework and every old valid save/route remains intact.
  - **Do not change:** No new rain-court/rooftop alias rooms, schema drops or original snapshot writes.

- [x] 1.2 Build Desert Camp floor, collisions and seat approach skeleton

  - **Goal:** Build Desert Camp floor, collisions and seat approach skeleton
  - **Files/symbols:** new src/world/desertCampWorld.js; tests/desert-camp.test.js
  - **Reuse:** A world helper context, block clearance, bounds helpers and seating metadata.
  - **Required behavior:** Fire(0,−2), six radial fire seats plus two shelter seats, two explicit return gates, dunes/mesas beyond bounds, shell none; no new objectives or fuel. Use D1 exact coordinates. Build large forms and actual obstacles before decoration; emit explicit sitting/dismount/group metadata; verify player/Kiln and all gate/seat approach points.
  - **Architecture constraints:** Flat movement y0, existing jump collisions, one world group; no navmesh/ramp dependency or per-object loop.
  - **Failure/cleanup:** Construction failure disposes owned partial resources; stand fallback safe spawn; no blocked exit hidden by test relaxation.
  - **Tests:** Use production isWalkable with0.25-grid flood fill for every seat stand point, both actor spawns, named route waypoints and each interaction within1.8; finite transforms after update; test rotated seat dismounts.
  - **Verify:** node --test tests/desert-camp.test.js tests/seating.test.js tests/districts.test.js
  - **Done when:** Desert Camp has a complete collision-safe route through every gathering zone and exits before polish.
  - **Do not change:** No collider removal merely to pass reachability; no adding required restoration to social space.

## 2. Composition and environmental binding

- [x] 2.1 Add the distinct Desert Camp visual composition with bounded batching

  - **Goal:** Add the distinct Desert Camp visual composition with bounded batching
  - **Files/symbols:** src/world/desertCampWorld.js; appropriate src/atmosphere modules; tests/desert-camp.test.js
  - **Reuse:** A shell-none ownership/material-family batches and existing geometry helpers.
  - **Required behavior:** Author sand patches, distant dunes/mesas, cloth shelter/tent and lanterns; add reusable src/atmosphere/fireEmitter.js with24/12 flame quads,128/32 embers, smoke optional and smooth bounded fire light.
  - **Architecture constraints:** Apply D world draw/triangle/light ceilings plus B effect ceilings. Repeated geometry instanced; animated parts excluded. No unique light per window, star or ember.
  - **Failure/cleanup:** Retain procedural fallback if optional texture unavailable; owned material/light/geometry disposal exact; no hidden animation.
  - **Tests:** Add builder integrity tests for instancing, light/shadow and object bounds; fire envelope continuity and particle pool reuse tests in tests/fire-emitter.test.js.
  - **Verify:** node --test tests/desert-camp.test.js tests/fire-emitter.test.js; npm run build
  - **Done when:** Distinct composition exists in all camera views within measured object/batch ceilings; large forms are not recolored legacy scenery.
  - **Do not change:** No external asset pipeline/install, per-particle meshes, giant mirror or experimental renderer switch.

- [x] 2.2 Bind Desert Camp atmosphere, zones, sound and events

  - **Goal:** Bind Desert Camp atmosphere, zones, sound and events
  - **Files/symbols:** src/world/desertCampWorld.js environment bindings; shared/atmospherePresets.js; B modules only through their existing interfaces
  - **Reuse:** A active lifecycle and B semantic snapshot/clock/quality/audio/event modules.
  - **Required behavior:** B sky/events/zone/wind interfaces; add fireEmitter factory with bounded flame/embers and smooth nonshadow light; fixed desert-night plus shared meteors. Register authored roof/exposure/audio zones and exact comfort settings; all source loops after user gesture only; local particles never networked.
  - **Architecture constraints:** No room-ID branches in generic atmosphere controller; if a new binding is needed, extend tested common contract rather than duplicate a subsystem.
  - **Failure/cleanup:** On travel cancel pending events/audio, restore globals, stop uploads and dispose active effects; late join skips expired events.
  - **Tests:** Extend tests/desert-camp.test.js and tests/ambient-events.test.js: meteor late join/dedup, no rain required, sand shelter and fire+sky resource count.
  - **Verify:** node --test tests/desert-camp.test.js tests/atmosphere-model.test.js tests/ambient-events.test.js tests/environment-audio.test.js; npm run build
  - **Done when:** Two test clients agree on semantic state and zones change perception while all effects remain local and cleanly deactivate.
  - **Do not change:** No user weather commands, garden tick coupling, new shared media or automatic capture.

## 3. Player experience, evidence and promotion

- [x] 3.1 Exercise social routes and record Desert Camp acceptance

  - **Goal:** Exercise social routes and record Desert Camp acceptance
  - **Files/symbols:** this change evidence/; tools/atmosphere/capture.mjs; tests/desert-camp.test.js; README/AGENTS/docs/places.md
  - **Reuse:** A verification.md, B capture harness/quality counters, existing Phoenix stack and Theater regression tests.
  - **Required behavior:** Run real controls through all gathering groups, seats/stand/emotes, both actors and all exits; normal/reduced, OS reduced motion/flash off, all cameras, narrow viewport; record busiest Desert Camp frame and20 travel round trips, two-client late join/reconnect. Update accepted destination docs and featured status only after gate passes.
  - **Architecture constraints:** Use isolated guest identities and disposable backend/media data; actual screenshots and measurements required; do not claim headless tests prove appearance.
  - **Failure/cleanup:** Explicitly test missing audio gesture, disconnect and event-in-flight exit; failed performance gate reduces costs/retests rather than raising budgets.
  - **Tests:** Run new place suite, full JS/Mix and build; exercise Theater engine/watchbar/queue through the shared verification matrix after world travel; add any regression found as targeted automated test.
  - **Verify:** npm test; npm run build; mix test; node tools/atmosphere/capture.mjs --url http://localhost:5173 --place desert-camp --matrix --out openspec/changes/add-desert-camp-social-space/evidence (contract in A verification.md; use actual existing dev port)
  - **Done when:** Desert Camp meets its normative acceptance checklist with saved hardware/browser metrics and screenshots; no hidden simulation, seat trap or Theater regression remains.
  - **Do not change:** No production queue overwrite, original data deletion, deployment or marking other change tasks complete.

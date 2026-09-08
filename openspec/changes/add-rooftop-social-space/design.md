# Rooftop social space design

## Context

`rooftops` already has The High Awnings, note at(−5,5), landmark at(6,−5) and stored anemometer completion. Upgrade this destination rather than add a conflicting rooftop ID. It remains one of the twelve legacy biome contracts: preserve its optional field note, restoration effect and gate endpoints while promoting social use. D's acceptance precedes this larger visual showcase.

## Goals / Non-Goals

A broad roof gathering deck facing a convincing distant city with slow sunset→cloud→rain→night changes. Larger gathering **composition**, not a new server capacity claim. No new open city, LOD streaming engine, instanced shard directory, aircraft gameplay, record-player/media queue or second weather system.

## Decisions

### E1 — Geometry and social routes

Add **src/world/rooftopWorld.js** `buildRooftopScenery(ctx)`, shell:none; preserve stable seed oldIndex*37 and existing rooftops metadata/legacy completion. One flat concrete deck with low perimeter safety parapets at actual outer bounds, near side kept readable. North utility room centered(−6,−6.5), full obstacle3×2.4; covered lounge x−2..5,z−8..−4 with roofY3.1. Four seats at x−1,0.4,1.8,3.2,z−6.4 facing+z; four southern seats at (−6.5,5.8),(−3.7,6.4),(4.8,5.8),(6.2,5.8) facing−z; two east overlook seats at(8,−2.5),(8,−4), facing−x with explicit stand candidates inside deck. Reserve the north/west approach to existing note(−5,5); the second southern seat is fixed at (−3.7,6.4) to leave clearance. Pin these coordinates in the builder fixture and test the note approach. Do not delete or relocate the note without updating its metadata and regression.

Anemometer at(6,−5) retains old interaction and restored rotation, but runs a slow idle wind response even before restoration as baseline already does. Social areas, light and weather never require completion. Keep its signal/ring optional legacy decoration, not the place's main HUD objective. A's original west/east gates and south market exit remain; central z0 corridor clear. At least ten seat points in three groups. String lights from utility roof to lounge use one emissive batch, not individual lights. Vending machine at(8,6.8), full block1.2×0.8, cosmetic in v1. Small planters cluster behind seating.

Skyline is **background illusion**: three instanced silhouette bands z−18,−30,−48, different desaturated colors/heights, within far plane150. Windows are a single instanced/emissive atlas or batched quads by band; no unique texture/light per building. Traffic is ≤32/8 point/sprite instances moving along 2–3 fixed distant lanes; no agents/pathfinding. At most one distant transit speck, pooled under shared event visual slot; omit if budget exceeded. Roof edge and distant bands must not occlude primary controls or create walkable voids.

### E2 — Scheduled atmosphere without new authority

Use B `weatherMode:scheduled`, fixed configured server anchorAt=0, cycle1200s, timeMode accelerated rate=1/1200 phases matched to schedule. Keyframes: t0 sunset warm/dry; t300 cloudy dim/dry; t600 light rain intensity0.35 wetness0.7; t900 clear night rain0 wetness0.4; cycle returns sunset/dry. Each boundary transitions for60s, including t0 from previous cycle's night. Wetness keyframes interpolate analytically over each full300s segment so restart/late join agree; no garden weather input. Field from/to preset includes fog/light/cloud/audio/wind and B's fixed-size transition. Test t−1,0,30,60,299,300,600,900,1199,1200 and large now values; all finite and phase-correct. No permanent light snap on reconnect.

Preset variants defined in shared/atmospherePresets.js; no rooftop-specific if statements in RoomServer/controller. Skyline window gain rises with night phase; static groups use one uniform/material factor. Wind drives string/vegetation gently. Rain uses exact B emitter/cover/wetness; lounge shelter exposure0.1, utility interior0 (no enterable interior until a navigable doorway is authored). Roof runoff only from authored edge anchors. No lightning in initial rooftop profile; storm visual test here means skyline plus maximum light rain/cloud transition, not an undeclared heavy-storm mode. Do not offer user weather buttons.

### E3 — Budget and rollout

World excluding avatars ≤100/65 draws, ≤220k/140k triangles; ≤4/2 local nonshadow lights, same shared sun/hemisphere. Skyline ≤15/9 draws within world total. B effect limits apply; rooftop rain density can be ≤2048/512 because intensity0.35. Record whole-frame counts, not just skyline. Profile transition midpoint at t630 with skyline windows, all ten seated actors, rain/splashes/clouds. Test first person from west entrance, lounge and east overlook, plus all isometric angles.

Promote rooftops to featured only after B/C/D acceptance and own measurement. Exact frame-rate outcome needs hardware measurement; method and pass/fail defined in A verification.md. If budget fails, reduce skyline bands/window density/traffic and active lamps first, then particle density; retain gathering layout and readable night lighting. Do not flip experimental WebGPU to pass the test.

## Risks / Trade-offs

[Legacy landmark blocks lounge] → preserve coordinate and test interaction approach, author lounge around it. [Skyline dominates draw cost] → bands and instance colors, no buildings-as-scenes. [Schedule wrap snaps] → analytic circular keyframes and boundary fixtures. [Larger scene confused with larger room capacity] → directory displays actual occupancy only; no untested max-participant increase.

## Integration, ownership and failures

Use A's public definition/build registry and unchanged World room membership. Read A design D1–D8 and B design D1–D8 as required contracts. No new room protocol, writer, presence service, call service or render loop. RoomServer owns semantic atmosphere/events; controller owns local particles and sound; builder owns geometry/materials. Existing emotes are reused. The world is fully usable with no objectives completed, no farming data and no call adapter. Standing and travel clear all active seat/effect/input state. A missing optional visual/audio asset falls back to procedural shapes/synthesis; no asset failure may prevent travel. A world construction exception leaves the prior room intact; loss of network leaves local rendering with explicit unavailable synchronization. No social action queues while offline.

Bounds for all shipped scenes remain minX −11.3, maxX 11.3, minZ −9.5, maxZ 10.3. Player spawn (−9,0), Kiln (−8.2,1); preserve a 2-unit-wide central east/west corridor around z=0 and unobstructed south approach x=0 to z=8.8 where an exit exists. Geometric vertical variety is scenery only: walk plane stays y=0, jumps do not clear obstacles, no elevated navmesh/ramp assumption. `block` already adds 0.38 actor clearance; do not expand twice. New seats have explicit yaw and authored 1–4 stand points; sit poses may overlap chair collision, stand points must not. Build tests flood fill using production isWalkable at 0.25-unit spacing and require reachable approach distance <1.8 for each interaction; explicitly test stand poses free and connected. Never weaken collision to pass tests.

Only active controller/world updates; all local lights remain under its group. On leave stop/cancel audio and timed events, restore borrowed global lighting/material baselines, dispose active emitter resources, retain bounded static cached geometry per A. On return sample current server time and snapshot; never replay old events. Reduced quality/motion and flash-off use B controls. Test all three isometric views and first person; primary seating, exits and prompts must remain readable without changing activeCamera or forcing a view on entry.

## Asset strategy

First release uses procedural geometry, colors, generated small textures and synthesized audio; no runtime external art download. Existing Google Fonts/network media dependency is unaffected. An optional future GLTF hero prop or licensed ambience is not a prerequisite: before introduction record author/source, license permitting redistribution/modification, attribution and file hash in an asset ledger. No scraped unknown-license assets. Initial per-place added compressed assets ≤1MiB; decoded texture budget ≤8MiB normal/2MiB reduced including generated maps, recorded separately from renderer memory. Fall back to the procedural prop/audio without changing collisions or interactions. Load only upon first entry; no full-application prefetch of all scenes.

## Testing and evidence

Add the place-specific builder tests named in tasks.md and extend A's two-client travel and B's atmosphere tests. Save tests retain every original valid visited/completed ID; fresh social visits never fabricate completion or rewards. Unit tests prove geometry/state/cleanup contracts, not visual beauty. During implementation, produce screenshots and structured measurements under this change's evidence/ using A verification.md. No screenshot, performance or multiplayer acceptance is claimed in this planning session.

## Migration Plan

Register metadata/preset projection and test route invariants → construct collision skeleton → add scenery/instancing → bind atmosphere/audio → seat/social integration → test fixtures → actual browser controls/camera/autoplay/soak → publish evidence and update README/AGENTS/docs/places.md. Promote featured status only after acceptance. On failure, revert builder/preset registration to previous accepted definition (new places disappear from featured selector) without changing any original save IDs or durable data. Keep a recognized new ID in normalization after rollback so progress is not silently pruned; unavailable content routes to Theater with an explanation. No backend authority flip, schema migration or deployment command in this change.

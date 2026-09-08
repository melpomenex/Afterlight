# Desert Camp design

## Context

Desert has no existing room; add stable `desert-camp` only after Rain Court acceptance. The shared common urban shell would make brown court scenery; A's shell:none is essential. The first Desert scope intentionally uses existing fixed mode and event snapshots so no new server mechanism is needed.

## Goals / Non-Goals

A welcoming fire circle beneath a huge night sky, with quiet perimeter seating and cloth shelter. Fire is lit when visitors arrive and costs no fuel. No farming, resource collection, quests, fire-lighting shared mutation, desert traversal simulation or generated infinite terrain.

## Decisions

### D1 — Authored flat clearing and background

Add **src/world/desertCampWorld.js** `buildDesertCampScenery(ctx)`, stable seed629, shell:none. Floor uses large low-poly sand patches with low-frequency color variation, not court tiles. Peripheral dunes outside walk bounds and three staggered distant mesa silhouettes beyond z−13 create scale without requiring far movement/collision. Campfire at (0,−2), full block1.6×1.6; a circular open route around radius3 remains clear. North tent full obstacle3×2 at (−6,−6); cloth shelter x3..8,z−8..−4, roofY2.8 with narrow posts and no floor-spanning roof collider. Lanterns at (−7,−3),(6,−4),(−4,6); camp gear clustered against tent walls rather than random scattered boxes.

Six fire seats on radius3 around fire at angles30,90,150,210,270,330 degrees (angle measured in x/z; x=3*cos(a),z=−2+3*sin(a)). Face fire using rotY=atan2(−x,−2−z); sit full obstacle ≤0.76×0.62 axis-aligned conservative envelope, dismount 0.95 toward fire. Validate all envelopes and angles in tests. Two additional quiet seats at (6,−6) and (7.3,−6), facing +z, stand south; separation from fire distinguishes a second gathering group. Blankets are ground geometry/nonblocking and not a sleeping mechanic. The fire circle intentionally bends the east/west route south: reserve a 2-unit-wide route through (−9,0)→(−4,3)→(4,3)→(9,0). These fixed waypoints supersede the straight z0 corridor used in court/rooftops. Keep the seat coordinates above and test the complete route segments, including Kiln clearance. Do not move bounds to hide route failure.

Exits: west(−10.7,0)→court; east(10.7,0)→theater; no south market portal. Legacy seventeen gates/seeds remain byte-equivalent in manifest tests. Mark floor routes subtly with stone cairns/lantern placement. Minimap depicts tent, fire circle, shelter and two exits. Strong visual language: blue-black #111b2b sky, sand #8e7358, mesas #34333d, fire #ffb35c, lantern gold #e7b978. No industrial skyline shell.

### D2 — Reusable fire emitter through atmosphere controller

Add **src/atmosphere/fireEmitter.js** production factory; pass world anchor/radius from environment bindings. One flame billboarding/instanced batch (≤24 quads normal/12 reduced), one ember batch (≤128 normal, omitted reduced), and smoke sharing the sand batch (≤32 normal, omitted reduced). Preallocate; no per-flame light/Mesh allocation. Flame shader time or retained smooth envelope, no Math.random intensity per frame. Point light intensity `base*(1+0.08*sin(2.3*t)+0.04*sin(5.1*t+seedPhase))`, bounded positive; no shadow. Smoke/embers use wind input, never network transforms. Fire sound loop uses B mixer, spatial gain from distance to anchor with smooth minimum/maximum, no autoplay bypass. Readily audible/visible at seats but not louder than voice policy.

Fire is permanently ambient in v1. Do not implement Light fire/Extinguish messages, rewards, persistence or arbitrary fuel state. Reuse B event hooks for meteor, not fire permission. On deactivation delete active fire emitter buffers/light binding, stop sources, return all counters to zero; cached firepit geometry remains.

### D3 — Sky, sand, shelter and events

Preset `desert-night` fixed phase0.8, rain0, wetness0, wind[0.12,0.04], fog density0.008, exposure0.85. B sky module gains static batched star points (≤1500/500) and one faint procedurally generated Milky Way band (≤512² normal/256² reduced); recognizable impression, no astrophysical catalog requirement. Keep sky within far-plane150 and camera-mode coverage, do not move sky with player translation in a way that intersects scenery. Star twinkle bounded ≤10% slow modulation, frozen under reduced motion. Sand drift ≤192/48 instances, low near-ground opacity, sheltered tent exposure0.15 and softer wind audio. No full-screen dust overlay.

Meteor is B's shared `meteor` event every35–70s with 1200ms trail, same stable ID/time for occupants, one pooled trail and no scene accumulation. Late join skips elapsed stars; reduced motion uses optional caption without bright moving trail. No meteor shower swarm or quests. Cloth subtle wind displacement returns to baseline, disabled motion retains silhouettes. Firelight warm/cool sky contrast remains at reduced quality.

### D4 — Acceptance ceilings

World excluding avatars: ≤65/45 draws, ≤120k/80k triangles, 3/2 local nonshadow lights (one fire plus lanterns), no additional shadow lights. Total atmosphere batches must remain B's6/3 despite fire/star/sand additions: normal flame, ember, smoke/sand, stars, sky, event; reduced uses exactly three slots: flame, sand, and sky with shader stars; meteor motion is replaced by a caption and embers/smoke are omitted. Normal stars/sky and event retain their separate slots. If a proposed render path exceeds cap, combine or omit decorative layer, do not silently exceed it. Measure all six fire seats occupied and an active meteor/gust. Distinguish static geometry ownership from active effect memory. Soak 20 Desert→court→Theater cycles and 10min active camp.

## Risks / Trade-offs

[Campfire balloons particle draws] → explicitly share batches/omit smoke on reduced tier. [Ring blocks simple following] → broad alternative route and actual Kiln follow exercise, no navmesh claims. [Night too dark] → first-person visibility evidence plus cool fill, no dependence on bloom. [Dunes suggest explorable horizon] → composition/collision boundaries readable as backdrop, no fake open-world promises.

## Integration, ownership and failures

Use A's public definition/build registry and unchanged World room membership. Read A design D1–D8 and B design D1–D8 as required contracts. No new room protocol, writer, presence service, call service or render loop. RoomServer owns semantic atmosphere/events; controller owns local particles and sound; builder owns geometry/materials. Existing emotes are reused. The world is fully usable with no objectives completed, no farming data and no call adapter. Standing and travel clear all active seat/effect/input state. A missing optional visual/audio asset falls back to procedural shapes/synthesis; no asset failure may prevent travel. A world construction exception leaves the prior room intact; loss of network leaves local rendering with explicit unavailable synchronization. No social action queues while offline.

Bounds for all shipped scenes remain minX −11.3, maxX 11.3, minZ −9.5, maxZ 10.3. Player spawn (−9,0), Kiln (−8.2,1); preserve the 2-unit-wide bent east/west route specified in D2; this camp has no south exit. Geometric vertical variety is scenery only: walk plane stays y=0, jumps do not clear obstacles, no elevated navmesh/ramp assumption. `block` already adds 0.38 actor clearance; do not expand twice. New seats have explicit yaw and authored 1–4 stand points; sit poses may overlap chair collision, stand points must not. Build tests flood fill using production isWalkable at 0.25-unit spacing and require reachable approach distance <1.8 for each interaction; explicitly test stand poses free and connected. Never weaken collision to pass tests.

Only active controller/world updates; all local lights remain under its group. On leave stop/cancel audio and timed events, restore borrowed global lighting/material baselines, dispose active emitter resources, retain bounded static cached geometry per A. On return sample current server time and snapshot; never replay old events. Reduced quality/motion and flash-off use B controls. Test all three isometric views and first person; primary seating, exits and prompts must remain readable without changing activeCamera or forcing a view on entry.

## Asset strategy

First release uses procedural geometry, colors, generated small textures and synthesized audio; no runtime external art download. Existing Google Fonts/network media dependency is unaffected. An optional future GLTF hero prop or licensed ambience is not a prerequisite: before introduction record author/source, license permitting redistribution/modification, attribution and file hash in an asset ledger. No scraped unknown-license assets. Initial per-place added compressed assets ≤1MiB; decoded texture budget ≤8MiB normal/2MiB reduced including generated maps, recorded separately from renderer memory. Fall back to the procedural prop/audio without changing collisions or interactions. Load only upon first entry; no full-application prefetch of all scenes.

## Testing and evidence

Add the place-specific builder tests named in tasks.md and extend A's two-client travel and B's atmosphere tests. Save tests retain every original valid visited/completed ID; fresh social visits never fabricate completion or rewards. Unit tests prove geometry/state/cleanup contracts, not visual beauty. During implementation, produce screenshots and structured measurements under this change's evidence/ using A verification.md. No screenshot, performance or multiplayer acceptance is claimed in this planning session.

## Migration Plan

Register metadata/preset projection and test route invariants → construct collision skeleton → add scenery/instancing → bind atmosphere/audio → seat/social integration → test fixtures → actual browser controls/camera/autoplay/soak → publish evidence and update README/AGENTS/docs/places.md. Promote featured status only after acceptance. On failure, revert builder/preset registration to previous accepted definition (new places disappear from featured selector) without changing any original save IDs or durable data. Keep a recognized new ID in normalization after rollback so progress is not silently pruned; unavailable content routes to Theater with an explanation. No backend authority flip, schema migration or deployment command in this change.

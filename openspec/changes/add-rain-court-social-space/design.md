# Rain Court design

## Context

`court` already names The Rain Court, first in districts, and is seeded with zero. Its scenery is two benches and a few puddles; the common shell creates generic paving/walls/backdrop. It has no field note or restoration item and readExploration always preserves court as visited. Upgrade that existing identity; do not create rain-court as a second room. A supplies shell:none and explicit legacy gates (west Theater, east canal, south market); preserve those destinations and their existing coordinates. C proves B in a real destination after its harness.

## Goals / Non-Goals

Rain is the reason to visit: wet blue stone, warm occupied-looking windows, a roof to sit beneath and a small sheltered alcove. No quest, collectible, restoration objective, farming bed, unlock or new shared interaction. Seats and existing wave/emotes provide the initial interaction slice.

## Decisions

### C1 — Composition and route plan

Use **src/world/rainCourtWorld.js** `buildRainCourtScenery(ctx)` (new). Set court shell:none; builder owns floor/backdrop/lights. North arcade spans x −8..8, z −8..−4, roofY=3.4. Back wall at z−8.8, low enough/stepped away so default isometric and first person can read warm windows; front support posts centered (−7,−4.2),(0,−4.2),(7,−4.2), full obstacle 0.3×0.3. Do not make roof slab an x/z obstacle. Its roof silhouette is authored in bands/openings so seats are visible from isometric viewpoints; test actual occlusion rather than using roof transparency to mask a bad composition.

An open square x −8..8,z −3..6 provides the rain field. Rain-chain basin at (3,−1.8), full obstacle 1.6×1.4, is the recognizable *visual* landmark; it is not the legacy landmark objective type. Rain chains descend from an eastern canopy edge to it. Drain channels lead toward a shallow southern puddle, all flat/nonblocking. Trees/planters at (8,5) and (−7,6), full obstacles 1.2×1.2. Central z=0 path remains clear after actor expansion; basin north edge does not overlap it. Clear approaches to west/east gates and south market gate are preserved.

Alcove under northwest roof x −8..−4,z −8..−5.5, roofY=3.4, has denser timber/masonry side walls, no closing wall across entrance. Three seat groups: arcade north-facing-back bench centers (−2,−6.6),(2,−6.6), facing +z (yaw0); alcove centers (−6.5,−6.8),(−5.2,−6.8), facing +z; exposed bench (5.8,4.4),(7.1,4.4), facing −z (yawPI). Each seat full obstacle ≤0.76×0.62; stand 0.95 units along facing. Use individual seat positions within coherent bench geometry, not duplicated solid obstacles across their approach. At least six usable seats and three distinct gathering zones. Decorative covered table at (−2,−7.7) full obstacle 1.6×0.6 avoids seat approaches. No object at spawn/Kiln path.

Palette: paving #405a62/#52666c, dry stone #526065, rain/fog #283f51, brass/lamps #ffc47a, foliage #344b3e. Layer masonry in coarse/medium scales, instance repeated tiles/brick bands, use copper runoff pipes and two tree silhouettes. Keep near edge low/open. Update minimap path from this exact skeleton with arcade/basin footprint and preserved exit markers.

### C2 — Weather, shelter, surfaces and sound

Court preset `rain-night`, fixed time phase 0.82, fixed heavy rain intensity0.8, wind[0.2,0.05], fog density0.022, exposure0.9; sun/hemisphere provide cool fill and warm local lamps. Register north arcade exposure0.1 priority10, alcove exposure0 priority20, tree canopy exposure0.55 priority5, each with B's 0.5 feather and roof height. Mask rain below actual roofs while outdoor rain stays visible. Roof-edge drips join the batched runoff budget; no free global emitter. Exposed paving wet family, roof paving dry family, max eight authored puddles; bright wet glints local near lamps, not a mirror across entire floor. B's pinned family values restore correctly after travel.

Audio zone tuples use B's exposed/arcade/alcove mix. Distinguish direct rain/splash from roof patter by filtered synthesized layers; no loop restarts crossing boundaries. Rain-chain trickle is a low-gain fixed anchor under weather bus, no raycast. Local tree motion uses wind scalar and deterministic sine/noise only at normal motion; leaves remain visible when reduced motion is enabled.

Shared lightning uses B's event policy (45–90s, one 800ms pulse, finite direction origin) and delayed thunder. Do not flash HUD/white screen or add a lightning shadow light. Off/reduced comfort preference wins over shared intensity. Optional persistent weather text describes heavy rain; thunder need not be the only indication of any actionable state.

### C3 — Budget and acceptance

World scenery ceiling excluding avatars: 80 draw calls normal, 60 reduced; 160k triangles normal, 110k reduced; at most 4 local nonshadow point lights normal/2 reduced plus existing shared sun/hemisphere. Group lamp glows as emissive geometry; do not turn every window into a light. B's rain/event/splash/texture ceilings apply in addition. Measure heaviest rain + lightning + six seated actors, normal/reduced, all camera modes. Reduced tier simplifies tree clusters and puddles but keeps arcade/basin/seat silhouettes identical.

Acceptance requires visibly falling rain on light and dark backgrounds; wet/dry paving contrast; sheltered rain mask and differentiated roof audio; readable amber/cool balance; basin recognizable from entry; no camera-clipping streaks, submerged feet, trapped seats or obsolete objective HUD. A rainfall toggle alone is not this slice. Record two-client semantic agreement/late join and 20 court↔Theater transitions with no extra active emitters/audio nodes.

## Risks / Trade-offs

[Roof hides seats] → use stepped roof bands and actual camera evidence; no giant opaque slab over all social content. [Wet batching loses response] → use B material-family grouping, not removed source mesh mutation. [Old court test assumes no note] → preserve no note/no objective, retain and strengthen test. [Atmosphere makes menu unreadable] → overlays remain compact with stable contrast and bounded scrolling.

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

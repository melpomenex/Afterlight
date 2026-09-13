## Context

See `proposal.md` for motivation. Inspection baseline: checkout `e3570b8`, 2026-09-13. This is a planning-only source inspection, not a runtime benchmark. The pre-existing untracked `openspec/changes/add-kart-royale-loading-indicator/` is separate work and must remain intact. Several Kart, Downhill and floating-media changes are still open; recheck their actual code before applying this plan.

### Current architecture and evidence

Paths and symbols below are current unless explicitly marked proposed. “World” is already overloaded: `main.js`'s `currentWorld`, its `worlds` map and place runtime's `activeWorld` are built **place geometry objects**, not a personal environmental identity. `Afterlight.World` is the server room/presence domain. Neither becomes the preference store.

| Area inspected | Actual implementation and consequence |
| --- | --- |
| Theater and functional layout | `src/world/theaterWorld.js`, registered through `src/districts.js` and `src/places/registry.js`; `src/places/worldFactory.js` supplies shell, obstacles, items, gates and static batches. The auditorium, screen quad, seats, cabinets and lounges share one place. |
| Environment definition and selection | `shared/theaterEnvironments.js` exports `THEATER_ENVIRONMENTS`, `environmentForPreset`, `getTheaterVariant`, `randomTheaterWorldPreset`. `src/ui/worldSelector.js:createWorldSelector` already labels the UI World, highlights preset buttons and calls a selection callback. |
| Current ownership and random assignment | `main.js:selectTheaterEnvironment` sets `environmentOverride` and local atmosphere overrides, then sends `atmosphere_set`. `syncTheaterEnvironment` clears a differing local override when a synced server preset exists. Bootstrap selects valid `?preset=`, then `?world=`, else random. This reruns on reload. Separately, Phoenix `world/atmosphere.ex:new` randomly selects one of six defaults when constructing the theater atmosphere unless configured. The server ultimately wins; neither mechanism persists a personal World. |
| Environment lifecycle | `src/environments/runtime.js:createTheaterEnvironmentRuntime` builds into a child group with `createEnvironmentKit`, installs `materialFamilies/zones/emitterAnchors/sky` hooks, supports `setVariant`, retains the old environment if a new build fails, and caches the active theater environment across travel. `index.js` eagerly imports/registers six builders. Selection builds geometry synchronously, not through an asset preloader. |
| Places and travel | `src/places/runtime.js:createPlaceRuntime.travel` prepares hidden geometry, fences generations, commits actors/presentation/membership, then activates controllers. `main.js:setRoom` delegates. `src/places/travelState.js` resolves defaults and resets. `theaterAdapter.js` controls the one media UI and cinema lifecycle. A cosmetic switch must not call travel. |
| Activity lifecycle | `src/activities/registry.js:registerActivityModule` maps supported types to `initialize`; `runtime.js:activate/enterActivity` passes the host seams, handles participation and pre-join loading, and fences activation/attempt state. `viewLease.js:createActivityViewLease` lends scene/camera and optional `present`; camera-only and in-place activities also exist. `mediaPresentation.js` owns the floating-media lease. |
| Actual renderer | `main.js` creates ONE `THREE.WebGLRenderer`, orthographic and perspective cameras, ACES tone mapping, capped DPR 1.5, directional shadows, Three addon `EffectComposer/RenderPass/UnrealBloomPass`. Resize, input rays, screen projection and leased scenes use the active camera. No renderer migration is needed. |
| WebGPU | `src/realtime/gpu/{session,webgpu,liveInstanced}.js` and `flags.js` contain experimental entity acceleration/bridging. `webgpuBackend.js` also contains backend machinery. This is not the World renderer; WGSL pipeline work is not required. Preserve flag-off operation and verify enabled entity rendering remains separate. |
| Scene lighting/sky/weather | `src/atmosphere/controller.js:createAtmosphereController` captures/restores fog/background/sun/hemisphere/exposure; uses sky, precipitation and wet-surface modules. `stateClient.js` tracks server time, room/epoch/revision and events. Environment builders own local geometry; kit wind uses retained uniforms. These presentation and semantic paths currently overlap and must be separated. |
| Textures/materials/environment maps | `src/world/theaterTextures.js:theaterMaterials` caches procedural canvas PBR materials, mostly 256/512 textures and a 256×128 warm-hall environment. Some materials bind their own envMap, so changing `scene.environment` alone will not change every reflection. `src/environments/lib/{redwoodMaterials,cloudMaterials}.js` generate additional surfaces. Clone only opted-in materials; do not mutate globally shared hall/cabinet/gameplay materials. |
| Particles and audio | `src/atmosphere/precipitation.js` batches precipitation; `src/environments/lib/{particles,skyFx}.js` supply scenery effects. `src/audio/{mixer,environmentAudio}.js` retain one gesture-enabled mixer and synthesized loops. `main.js:updateEnvironmentAudio` uses theater variant audio or zone exposure; it still samples semantic weather. Room one-shots use `src/atmosphere/events.js`. |
| Asset loading and GLB conventions | `src/arcade/cabinet.js` deduplicates template fetch/GLTF parse, clones configurable materials and refcounts artwork textures via `TextureLoader`. A primitive cabinet stays playable until GLB hot-swap. `src/avatars/loader.js` is a separate GLTF cache/presentation boundary. No general World asset manifest exists. The inspected cabinet is 8,568,456 bytes, 62 meshes, 17 materials, 10 texture entries, with material extensions but no Draco/Meshopt compression extension. |
| Resource caching/disposal | `src/activities/resourceCache.js:createResourceCache` has owner/key references, optional 60-second idle eviction and explicit sweeps. Its implementation does not make each release idempotent, verify release ownership, represent repeated same-owner acquires accurately, or dispose resolved Promise values automatically. Do not assume its comment-level async guarantees are implemented. `src/environments/lib/kit.js` has an explicit owned-resource ledger; cached place resources and template resources have distinct lifetimes. |
| Preload/preparation | Kart's `kartRoyalePrepareScheduler.js`, `kartRoyalePreparation.js` and host incremental batches prepare a single runtime using idle/proximity opportunity. `graphicsJobs.js` runs synchronous GPU transactions between host frames with renderer capture/restore. There is no general place/cabinet World-decoration prefetch layer. Browser module evaluation remains cached after scene disposal. |
| Multiplayer/identity | `src/net/client.js:NetworkClient` preserves `afterlight-guest-id`, migrating the old guest key; storage denial uses a session identity. `src/net/phoenixClient.js` obtains a signed guest token through `/api/auth/guest`, rejoins via the existing facade. `server_elixir/lib/afterlight/accounts/player.ex` persists identity/room/avatar, not environmental preferences. `src/ui/profileModal.js` handles nickname/avatar presentation; no account World field exists. |
| Authority | `server_elixir/lib/afterlight_web/game_channel.ex`, `afterlight/gateway/router.ex`, `afterlight/world/{room_server,atmosphere}.ex` own supported room transport and atmosphere. `shared/activityEnvironment.js` and `server_elixir/lib/afterlight/activities/environment.ex` project `none/frozen/live` semantic conditions for activities. Changing visual weather must never alter those inputs. Node specialty services and protected JSON snapshots are unrelated. |
| Collision/spawns/interactions | `shared/placeDefinitions.js` owns stable bounds, transforms, participant anchors and spawn data. `src/world/bounds.js:isWalkable` handles flat expanded rectangles; `src/social/{seating,interactions}.js` handle approaches/dismount and interaction lookup. Race course documents and pure rules determine course/physics geometry. Cosmetic builders must receive no mutation seam for these. |

### Actual places and activity contexts

`PLACE_DEFINITIONS` currently enumerates `court`, `canal`, `station`, `aqueduct`, `caldera`, `understory`, `saltworks`, `rooftops`, `mangrove`, `trestle`, `foundry`, `frost-spire`, `delta`, `archives`, `kiln-terrace`, `theater`, `desert-camp`. Market is special-cased by `src/world/marketWorld.js`/main; `tiny-view` is a test fixture, not a shipped destination. The guide's district counts are not the catalog authority.

| Context/type | Actual host | Initial policy in this change |
| --- | --- | --- |
| Theater, arcade row and West Lounge | One `place:theater`; no standalone arcade or pool route | Full surroundings using retained six theater builders; regional cosmetic anchors for arcade exterior/lounge, one atmosphere and ambience owner |
| Pool (`billiards` compatibility alias), air hockey, foosball | `src/activities/{pool,airHockey,foosball}.js` attach `tableScene.group` to the place; pool switches camera | Inherit parent surroundings; no second environment host and no table/rules reskin |
| Darts, piano, photo booth | Same Orpheum activity registry/parent group | Inherit parent surroundings; gameplay/audio cues remain owned by activity |
| Kart Royale (`kart-royale`) | Lazy `src/activities/kart-royale/controller.js` → `games/kart-royale/src/host/{index,runtime}.ts` | Partial, initially sky/light/fog/ambient profile and bounded far scenery hook; preserve native racing world |
| Summit Run (`snowboard-race`) | `src/activities/snowboard/{controller,scene}.js` | Partial with cold-climate adapter; sky/light/far silhouettes/ambient profile, authored snow course intact |
| Downhill Mayhem (`downhill-mayhem`) | `src/activities/downhill/{controller,scene}.js` → `games/downhill-mayhem/src/host/runtime.js` | Ambient initially; rendering/ambience only, course unchanged |
| Pong, Rain Runner | Canvas cabinet games in theater | None inside game surface; physical cabinet surroundings still inherit theater |
| Signal Lost, Sporefall | Registered types/modules but not placed in current manifest | Explicit none for game surface; no new placement |
| Court: gutter-boats, chess, checkers; Canal: rc-boats | In-place activities | Parent ambient presentation; authoritative water/wind/course cues preserved |
| Rooftops: drones, paper-airplanes | In-place activities | Parent ambient; no cosmetic wind substituted for flight conditions |
| Archives: chess, tile-puzzle; Foundry: hammer-strike, forge-challenge; Understory: light-music-puzzle | In-place activities | Parent ambient; preserve puzzle/heat/material cues |
| Desert Camp: horseshoes, telescope; Frost Spire: curling; Mangrove/Delta: fishing, skipping-stones | In-place activities | Parent ambient; telescope instrument sky and other gameplay cues stay fixed/authoritative |
| All remaining places, including Market | Existing place builders | Ambient: bounded light temperature and ambience palette; retain landmarks, terrain, weather cues and routes |

All activity types are covered above. Proposed View IDs are namespaced `place:<id>` and `activity:<type>`; regions such as arcade are anchors within a host, not new rooms. All in-place activity declarations use `host: 'parent'`; their inheritance level describes surrounding presentation. A `none` internal game does not suppress its parent's World.

### Existing environment migration inventory

All six share the current preset picker/local override/server replacement mechanism described above, client random default at bootstrap and server random default on new theater atmosphere. None currently saves the chosen World: `src/environments/quality.js` exposes `environment/variant` fields but main does not use them to restore/save selection; `ENVIRONMENT_VARIANT_KEY` is only an unused constant. Quality is stored under `afterlight-environment-v1`.

| World (keep ID/name) | Variants (default first) | Current builder/assets | Global/reusable vs retained Theater interpretation |
| --- | --- | --- | --- |
| `coastal` / Coastal Dusk | sunset, storm, midnight | `buildCoastal` in `src/environments/coastal.js`; terrain, water, rocks, wind trees, grass, flock | Promote palette/sky/audio/features and rock/water/vegetation factories; keep asymmetric headland, terrace protection and shore positions Theater-specific |
| `rainforest` / Rainforest Canopy | mist, afternoon, thunderstorm | `buildRainforest` in `rainforest.js`; procedural giants, ferns/vines, waterfall, pools/mist | Share wet green atmosphere and vegetation/mist recipes; retain protected clearing and waterfall composition |
| `alpine` / Alpine Aurora | aurora, morning, snowfall | `buildAlpine` in `alpine.js`; basin, conifers, snow peaks, frozen water | Share cold lighting, aurora hints, conifer/rock recipes; retain basin terrain and frozen-lake placement |
| `desert` / Desert Oasis | golden, sandstorm, night | `buildDesert` in `desert.js`; mesas, palms, sand, oasis, dust | Share warm sky/dust palette and rock/palm kit; retain canyon floor, mesas and spring composition |
| `redwood` / Ancient Redwood Forest | firefly, fog, sunshafts | `buildRedwood` in `redwood.js`; `redwoodGeometry/redwoodMaterials`, ferns, trunks, stream, shafts | Share bark/moss recipes and trunk/fern geometry; retain oversized trees, protected floor and stream layout |
| `cloud` / Cloud Garden | sunrise, day, storm | `buildCloud` in `cloud.js`; `cloudMaterials`, cloud-sea shader, floating islands, flowers/flock | Share clouds/flowers/island primitives and sky palette; retain theater island footprint and waterfall |

There are no six World GLB scene bundles to migrate: these environments are procedural. Atmosphere/audio/light data can transfer immediately; new boardwalk/lodge art or complete racing-biome scenery is future authoring, not an implementation prerequisite. Keep all existing `env-*` IDs resolvable for old links, exports and server fixtures.

## Goals / Non-Goals

**Goals:** establish a single preference owner; cover every existing context with an explicit inheritance policy; deliver observable cross-View presentation for all six Worlds; preserve gameplay, room identity and loading performance; provide modular assets and a safe adapter seam.

**Non-Goals:** move gameplay geometry, invent an Arcade place, import example Worlds such as Space/Ocean as new IDs, replace Three/WebGL, rebuild SSX source, add a second canvas/RAF/socket, synchronize props, implement an editor or account preference service. Keep room scope as a future extension, not a second user-selectable mode now.

## Decisions

### D1. Canonical state and declarative model

Add pure `shared/worldDefinitions.js`. Move the six identity/variant records into its canonical `WORLD_DEFINITIONS`; retain `shared/theaterEnvironments.js` as compatibility exports and preset lookup adapters. Do not copy the six records into a second independently editable catalog. Keep renderer imports in client registries. Existing server preset projection stays byte-equivalent unless a separately justified semantic change is required.

Proposed contract (JSDoc/ES modules, not a TypeScript conversion):

```js
WorldDefinition = {
  id, name, version: 1, defaultVariant,
  variants: { [variantId]: {
    atmospherePreset, // compatibility env-* mapping; visual input, not authority
    visuals, features, audio
  } },
  assetKit: [/* logical asset/factory IDs */],
  interpretations: { [viewId]: { adapterKey, assetIds, slotOverrides } }
};
WorldSelection = { worldId, variantId };
WorldSupport = {
  mode: 'full' | 'partial' | 'ambient' | 'none',
  host: 'self' | 'parent',
  slots: [/* explicit safe slots */],
  adapterKey, defaultPresentationKey
};
```

`src/worlds/state.js:createWorldState` (proposed) is instantiated once in main and owns the only mutable active `WorldSelection`, revision and persistence status. Consumers receive a read-only snapshot/subscription. `requested` loads and `appliedRevision` are transaction records, never another World preference. Retain the built-place `currentWorld` variable initially; always call the new value `worldState.selection.worldId` to avoid confusing a Three group with an ID. A sweeping rename is unnecessary.

Variants already exist and must survive migration. They are subordinate to World identity; changing variants does not create a new World or alter deterministic gameplay seeds. Initial cosmetic seed remains the existing preset-derived seed to preserve theater geometry. Future per-person variation can use a separate hashed guest/world/view seed; never consume gameplay RNG.

Alternative rejected: independently stateful managers per game would reproduce the mismatch. A new server World entity is unnecessary for local presentation.

### D2. Persistence, guests and URL precedence

Extend `src/environments/quality.js` into the storage adapter for the existing `afterlight-environment-v1` record, version 2: `{ version: 2, quality, worldId, variantId }`. The storage key remains stable; quality normalization and World normalization are separate pure functions. Preserve unrelated fields when updating. Read v1 `environment/variant` only if the World exists; infer its default variant when missing/invalid. Write `environment/variant` compatibility mirrors on every successful World save, with new fields authoritative in v2 records. An old build can retain those mirrors through its quality writer; a subsequent v1 read migrates them again. A v2 record with an invalid World is repaired rather than allowing stale mirrors to override it. Do not invent a migration from the unused `afterlight-theater-environment` key; no shipped writer/format was found. Do not alter `afterlight-save`, identity, audio or media keys.

Bootstrap order: valid `?preset=<env-*>` session preview; else valid `?world=<existing-id>` preview/default variant; else valid saved selection; else migratable v1 selection; else uniform random among six World IDs once and use its default variant. Invalid query parameters fall through without destroying a save. Missing/corrupt/removed saved World is repaired through the same once-only assignment and persisted. An unavailable catalog uses the deterministic built-in coastal/sunset fallback without trying to load unknown code. No server snapshot is a migration source. The room-atmosphere delta retains the historical scenario title “Agricultural rain” for archive compatibility but updates its assertion to keep the retired domain absent; it does not authorize restoring any gardening behavior.

Resolve and persist a missing durable preference even when launching a URL preview, but show the preview as the active selection for that session. Picker selection explicitly saves the chosen World, including when it matches a preview. On reload without URL, use the durable preference. Each tab initializes once; cross-tab live synchronization is deferred, with last explicit write winning future loads.

Persistence follows this browser, like existing graphics/comfort settings, regardless of guest-token renewal or nickname changes. Denied reads/writes retain session selection and return `saved: false`; UI says “For this visit” rather than claiming saved. Cross-device profile sync is future work; a future authenticated persistence adapter can replace storage without changing renderer/authority contracts. No identity is needed to render or assign a World offline.

### D3. World resolution and integration contract

Add `src/worlds/{registry,resolver,host}.js`. Extend client place registration metadata and activity module registration with normalized `worldSupport` (similar to existing `mediaPolicy`), rather than adding presentation fields to authoritative course or activity environment contracts. A validator compares namespaced IDs against real place definitions plus Market and actual activity registration. Unknown modules get safe `none`, with a development diagnostic; shipped modules must declare a policy.

Resolver inputs: selection, View ID, support, quality/comfort and available adapter/asset capabilities. Output: selection revision, adapter/asset plan, permitted atmosphere fields, fallback level and reason. Resolution is pure/deterministic. Chain: exact World/View interpretation → generic World profile filtered through View slots → View's native presentation → retained existing scene. Missing individual assets fall back per slot; no random replacement World. `none` selects native presentation immediately. The saved World remains selected even if its art is unavailable.

Self hosts expose only cosmetic `root`, bounded named anchors, immutable exclusion volumes, optional material clones and explicit lighting/fog/audio setters. Useful first slots: sky/horizon, distant scenery, decoration, lighting, fog, particles, audio. Environment-map and postprocessing slots require explicit adapter support; they are not automatically enabled by `full`. Place host anchors live alongside builder output; optional `ENV_*` GLB markers can implement the same contract later. No generic arbitrary property overrides or access to obstacle/item arrays.

Reuse `src/environments/lib` factories through logical asset IDs. Do not move all helpers just for naming. Initial anchors: theater arcade exterior, lounge exterior and distant backdrop; prove that two regions can compose the same cached kit without a second full scene. No new collidable furniture. Phase-one migration retains existing theater compositions exactly; anchor adoption follows after their visual baseline passes.

### D4. Functional geometry and multiplayer-safe presentation

World-owned scenery must never mutate floors, walls, bounds, doors, seats, actor/spawn transforms, participant/dismount anchors, table positions/dimensions, raycast gameplay surfaces, race tracks, checkpoints, ramps, pickups, hazards, wind physics or networked state. Keep IDs, course hashes, seeds and rule versions unchanged. These are existing shared contracts even where social walking collision executes client-side rather than as a full server physics simulation.

Non-collidable is necessary but insufficient: solid-looking trees in walking routes would violate the existing solid-theater-scenery contract. Reject decoration whose transformed bounds intersect navigation clearance, interaction approaches, spawn volumes or instrument sightlines. Keep substantial geometry outside protected volumes; use below-knee accents only where allowed. Clearances include first-person camera eye band and active activity cameras. World lighting/fog may not hide course edges, pucks, balls, rivals or semantic weather cues.

Users with different Worlds can share the same room because only scenery changes. Do not append World IDs to room/session keys, presence, movement or leaderboard payloads. Do not send `atmosphere_set` from the migrated picker. Phoenix remains the authority for semantic atmosphere; old clients can continue using the existing endpoint and broadcasts without changing a new client's preference.

Separate `createAtmosphereStateClient`'s accepted semantic state from proposed `src/worlds/presentationSample.js`: the latter provides local visuals to the retained atmosphere controller. Remove personal overrides from semantic fallback state. Activities continue consuming `shared/activityEnvironment.js`/Elixir projections. For activities with frozen/live environment policies, preserve authoritative wind/rain/visibility cues over local cosmetic weather; local rain cannot imply different boat/flight physics. Global World contributes palette/ambience, not forces. Room one-shots remain deduplicated and are rendered only when compatible with the local presentation and comfort settings; no substituted thunder or lightning when suppressed.

Reserve a pure scope resolver shape for future `local/room/fixed`: fixed → valid authorized room selection → personal selection. Initially use local for aware Views and native fixed art for none; do not add a room World message or control. Social profile badges/invitations can later refer to the stable World ID without making it simulation state.

### D5. Theater, table games and other places

Main owns activation of the World host after destination presentation baseline is installed. The theater adapter continues to own cinema/media only. Replace `effectiveEnvironmentPreset/environmentOverride/selectTheaterEnvironment` with a compatibility wrapper reading/selecting canonical state. `syncTheaterEnvironment` derives its preset from the World definition, never server preference replacement. All 18 mappings and variant `setVariant` behavior survive.

The theater, arcade and lounges have one atmosphere host. Pool/air hockey/foosball reuse it with their existing table groups/cameras and must not acquire another audio loop, scene or room. Distinct lounge/arcade decoration can use approved regional anchors; table gameplay materials remain untouched. Other shipped places receive ambient World lighting temperature/audio treatment only, respecting authored practical lights and semantic weather. This reaches every applicable View without pretending each has a custom biome scene.

Keep footer wording **World**; dialog title **Choose your World**; explain “Your surroundings, saved in this browser. You still share the place with everyone here.” Mark preview/session-only states honestly. Make the control available from other place HUDs and Settings; during a leased game, Settings offers the same selection without releasing participation. Clear held input via existing modal policy; online simulations do not pause. Do not add another panel to the playable center.

### D6. Hosted games use narrow adapters

**Kart Royale:** actual runtime sequence is pipeline → sky → materials → track → scenery → race → items/effects/camera/HUD/audio → draw budget. Extend `games/kart-royale/src/host/{types,index,runtime}.ts` with an optional plain presentation profile and `setWorldPresentation` seam. Route sky/light/fog/probe parameters through `render/{Atmosphere,Sky}.ts`; expose a separate cosmetic far-scenery root from `world/Scenery.ts`, leaving `Track`, `TrackLayout`, `TrackGeometry`, collision probing, race initialization and RNG order untouched. `render/Materials.ts` caches shared procedural maps; use variants/local uniforms only for declared cosmetic surfaces. Its independent `postprocessing` composer remains behind `lease.present()`.

Do not transplant theater lighting values into Kart's physically different light/exposure/shadow system. Adapter translates normalized palette/horizon/ambience intent into bounded native values. Native coastal Sunset Bay is the coastal default interpretation; others initially receive restrained compatible atmosphere and horizon identity, with native trackside structures retained. A later rainforest village kit can replace approved background groups, not the track. Prepared base runtime readiness keys exclude World ID; a separate cosmetic key includes World/variant/tier/revision. Selection changes do not invalidate expensive gameplay preparation.

`Sky.ts` installs global `THREE.ShaderChunk` patches and owns PMREM/cube targets. Apply/restore through existing hosted graphics transactions; renderer policy snapshots alone do not restore shader chunks. Capture/rebind or scope affected chunks explicitly for each render ownership boundary and test theater → warm Kart → theater. Do not clone a second Sky or run two prepared Kart runtimes. PMREM updates are optional deferred work; retain the previous/native probe until safely ready. Avoid full shader recompiles for simple palette changes.

**Summit Run:** `createSnowboardScene` is the in-repo port of `SSXTricky/lib/game/engine.js`, not a hosted copy of that standalone app. It loads canonical `shared/snowboard/course.js` data, creates 550×70 terrain subdivisions, 70 peaks, 420 instanced trees and 160 particles at high (80 particles/0.6 tree scale at low). Expose sky/light/fog and far-scenery groups plus `setWorldPresentation`; exclude the course mesh, gates, ramps, boost lanes/pickups, rider/contact-shadow/snow-spray cues. Preserve seed 321 draw order by using a separate decoration stream. Coastal means icy maritime horizon, rainforest humid alpine greens, alpine current cold sky, desert warm snow-at-dusk, redwood forested mountain, cloud high-altitude cloud horizon. These are small profiles, not six courses. Change disposal traversal to respect borrowed resources before adding any cached textures/geometries.

**Downhill:** `createDownhillMayhemRuntime` calls `game/rendering.js:createRendering` and `game/world.js:buildWorld` from a committed course. Add optional ambient profile setters there through `src/activities/downhill/scene.js:createDownhillSceneAdapter`; leave course/rider/rules/session mode intact. Initially tint sky/light and blend local ambience only. Wider scenery inheritance is deferred.

Retro game pixels remain none; in-place activities inherit parent once. Alternatives rejected: duplicate race scenes, patching rules with World IDs, rebuilding hosts on selection, and unconditional copying of theater sky/materials.

### D7. Resource ownership, loading and runtime changes

Extend the existing application resource cache with idempotent acquisition handles, verified ownership, accurate repeated owner/key acquires, deduplicated pending factories, rejection removal/retry and resolved-resource disposal. Preserve current callers' return shape or adapt them explicitly. Cancellation releases one consumer; abort a shared fetch only with no remaining consumers. A late completion can populate a bounded cache but cannot attach after cancellation. Do not start a second generic cache.

Proposed `src/worlds/assets.js` maps logical IDs to procedural factories or vetted URLs and metadata (revision, tier, estimated bytes, disposer). Persistent metadata and decoded immutable source assets may survive View changes. GPU resources are keyed by renderer/context generation as well as asset/version/tier; material variants/texture color spaces belong in the key. View hosts own instantiated groups, material clones, particles and audio leases; shared geometry/textures belong only to cache handles. Never put borrowed resources into `kit.track` or dispose them by blanket traversal. Eviction stops voices/releases render targets/textures/geometries and owned image bitmaps; never disposes the renderer, global AudioContext, cabinet template or unrelated cached place.

On startup load catalog, preference and current View profile; do not preload six kits or all games. Preserve current theater builder loading first, then separate optional adapter imports only where measured. On intent/proximity use the current Kart scheduler or place-selection intent to request active World/destination cosmetics. Priority is gameplay first, cheap profile second, prominent scenery third, near/distant decoration last. Reuse existing idle/proximity CPU budgets and graphics queue. GPU work while a leased game is active must execute through that owner's between-frame transaction; the host's current blocked graphics queue cannot simply be bypassed. Asset bytes/GLTF parse/texture decode may complete asynchronously; GPU upload/compile submissions must be budgeted and measured, not assumed interruptible. If the existing synchronous theater builders exceed the measured task budget, split their terrain/instance generation into resumable batches preserving deterministic draw order and output; wrapping a monolithic build in a Promise does not make it nonblocking.

Transactions fence `{placeGeneration, activityAttempt, worldRevision, rendererGeneration}`. A World selection commits canonical identity immediately and applies its cheap valid profile; optional geometry stages hidden. When ready and still current, swap only the cosmetic root at a frame boundary, then release old resources. Same-world variants reuse geometry where supported. Failure retains valid old geometry or native scenery and reports fallback against the new selected identity; it never reports old art as successfully applied new art. Retry is explicit or a new asset revision, not a per-frame failure loop. Latest selection wins; return from a leased game refreshes the cached social host before rendering it, without resetting camera preference, player, seat, media or race.

First release may swap geometry instantly; retain the existing 500 ms audio crossfade. No required dual-world sky render targets, volumetric blend or full-scene fade. On inactive cached hosts suspend all cosmetic updates/uploads/events/audio; under memory pressure detach heavy decoration and release handles without unloading functional places. Bound pending work to the active destination and most recent intent; share assets, not an unbounded N×M cache.

Fallback detail: unknown/removed preference → D2 repair; missing interpretation → generic allowed atmosphere; missing GLB/texture/probe/audio → slot/native fallback; optional lazy-import failure → native View; gameplay module failure → existing activity failure path, not disguised as a World problem. Storage/network/audio failures are independent.

### D8. Budgets and verification gates

Reuse existing policy targets, not guessed performance promises; the referenced targets are acceptance requirements, not proof that this checkout meets them. Existing environment tiers low/medium/high/ultra use terrain segments 72/112/160/208, open-water 128/192/288/384, vegetation multipliers .35/.6/1/1.5, clouds 1/2/3/4 and birds 4/7/10/14. Keep tiers device-derived; ultra explicit. Atmosphere caps remain 4096/1024 rain drops and six/three active batches for normal/reduced. Aggregate World and place precipitation under one budget; do not multiply it per sub-View. Extra fog/particles yield to comfort and gameplay visibility. New ambient adapters add zero dynamic lights, zero shadow maps and zero postprocessing passes. Reuse the host's lights and preserve existing shadow policy (social 2048 or reduced 1024; Kart retains its native cascades).

The cabinet's 8.57 MB asset demonstrates why it must be shared, not copied into every World. Existing theater maps are typically 256–512; Kart materials use tier-scaled 512/1024 tiles and 128 macro maps. New cosmetic textures should start at these proven sizes; larger assets need measured visual benefit and decoded/GPU accounting. First rollout adds no required external World bundle. For later kits, record compressed bytes, decoded CPU bytes, mipmapped GPU bytes, draw/material/triangle counts and upload cost before admission. There is no trustworthy measured universal World-MB or prop-count limit yet; counts must fit existing tier family scales and the measured frame/cache envelopes. Asset review rejects unbudgeted kits, rather than inventing a total based solely on GLB file size.

Use the existing Kart retention ceilings as a **combined** envelope for prepared Kart plus optional cached World assets, not an extra allowance per system: estimated GPU/owned CPU 256 MiB each, 128 MiB each when deviceMemory <=4 GiB. Evict zero-reference cosmetics first; never evict a live owner. The initial existing theater may exceed a proposed retention envelope when active; report its baseline, permit active play and avoid speculative duplicate retention. `renderer.info` is counts, not free VRAM; estimate bytes conservatively, count shared data once and label estimates.

Preserve the existing instant-entry gates from `fix-kart-royale-instant-entry/design.md`: ready E→first selection frame p95 <=500 ms, ready input <=1,000 ms; suspended return first frame <=200 ms and input p95 <=500 ms; race initialization overhead <=100 ms excluding countdown. Theater TTI preparation increase <=5% and <=100 ms; walking p95 frame interval increase <=2 ms; no new preparation CPU task >50 ms. Optional World work never extends gameplay readiness; defer it when budgets are exhausted. Record cold and uncached failures honestly rather than promising subsecond cold startup.

Required evidence: production build, named browser/GPU/device/resolution/DPR/tier, five cold loads and at least 20 warm/return cycles; capture initial/cached transition times, CPU tasks, draws, triangles, material/program counts, particle/light/shadow counts, allocations, media/audio continuity and errors. Use desktop hardware and constrained hardware; software rendering is correctness-only. After eviction, owned GPU ledger returns to baseline; forced-GC heap within max(10%,20 MiB) of module-prefetched baseline and no sustained rise across cycles. Do not run unrelated game tests for this proposal; these are implementation gates, currently unmeasured.

### D9. Authoring and diagnostics

World author: add one pure catalog row with default/variants and logical kit IDs; register optional renderer factories/interpretation adapters; validate all IDs, variant mappings, asset references and fallback availability; test generic fallbacks across the policy matrix. A new World requires no N×M scenes. View author: register one namespaced policy beside its existing module/builder; expose safe slots/anchors/exclusions and lifecycle handles; run invariance, fallback, visual and ownership tests. No giant World×View switch in main.

Future Blender assets belong under `public/worlds/<world-id>/shared/` with logical IDs resolved centrally, and `public/worlds/<world-id>/views/<view-id>/` only for justified exceptional pieces. Keep existing `public/arcade` and `public/avatars` conventions untouched. Author meters, applied transforms, ground-contact origin, Three/glTF Y-up and +Z-facing directional props (match cabinet convention). Use stable `ENV_<category>_<name>` marker names; never reuse `INT_*` to imply gameplay interaction. Export reusable meshes/instances, named materials, packed ORM (linear) with sRGB base/emissive textures, explicit alpha/culling, no embedded cameras/lights or collision assumptions. LOD variants share silhouette/origin/scale; author fewer material slots and atlas reusable surfaces. Do not require Blender MCP at runtime. Draco/Meshopt/KTX2 need tested decoder plumbing first; no unconditional compressed export to unsupported loaders. Start with current GLTFLoader-compatible GLBs and measure compression separately.

Extend existing debug-only `__afterlight` environment/introspection and `__kartPerf` records: selected World/variant, actual View/host, policy, applied revision, fallback reason, pending/cache/live resource counts, estimated CPU/GPU bytes, timing and failed asset IDs. Keep `?world`/`?preset` previews; add diagnostic World switching to exercise leased Views without changing persistence. No identity tokens in dumps. Build validation rejects duplicate/unknown IDs, invalid mode/slot/adapter references, missing default variant/native fallback, invalid asset URLs/revisions and unsafe anchor placements. Catalog errors fail development checks; production keeps the current playable View.

## Risks / Trade-offs

- [Personal visuals disagree with authoritative weather] → separate samples and preserve activity cues; test two clients with different Worlds under identical frozen/live conditions.
- [Kart global shader patches or probe work contaminate Theater] → owner-scoped transactions and explicit ShaderChunk restore tests, including background preparation and context loss.
- [Cache comments overpromise semantics] → strengthen handle/async ownership before sharing assets, test repeated releases, stale promises and same-owner duplicates.
- [Solid cosmetic scenery blocks sight or appears walk-through] → exclusion-volume tests plus first-person and activity-camera review; do not “fix” by adding client-specific collision.
- [Existing whole-scene disposal destroys shared assets] → convert only affected adapters to explicit ledgers; test source/template retention.
- [Uniform presets flatten each game's art] → normalized intent through native adapters; exact theater geometry remains, race lighting uses native bounds and visibility gates.
- [Browser-only persistence is mistaken for account persistence] → explicit UI copy and session-only failure state; future adapter seam.
- [Older builds overwrite v2 preference during quality changes] → tolerate v1 reads/mirrors and preserve fields in new writes; rollback never deletes data.
- [In-flight loading/media changes overlap] → inspect/rebase their actual seams before implementation; do not absorb unrelated incomplete tasks or claim their gates passed.

## Migration Plan

1. **Foundation:** capture existing 18 theater variants and game baselines; add canonical pure catalog and preference migration behind proposed `?world-system=off` rollback plus build-controlled enable flag. Default off until gates pass. Build both branches from the same catalog.
2. **Theater and semantic separation:** migrate the picker/state and renderer sample, keep server atmosphere/projection unchanged, retain all theater geometry. Verify two-client isolation, reload and storage denial. Update tests that currently expect picker `atmosphere_set` emission.
3. **Coverage:** add View capability resolver, parent-host integration and ambient place profiles; wire Kart partial, Summit partial and Downhill ambient adapters. Every actual context has a declared policy and fallback before default enablement.
4. **Composition and lifecycle:** strengthen cache, add bounded logical kit/anchor composition with shared existing factories in theater arcade/lounge regions; integrate optional prefetch and transactional hot swap. Do not require new external art.
5. **Acceptance and enablement:** run full tests/build, focused Phoenix tests and visual/performance gates; update README, AGENTS and environment/arcade/game guides. Enable only after measured gates pass. Roll back locally with the flag or release the previous build; retain v2 preference, protected files and server compatibility.
6. **Future, not checklist prerequisites:** richer World/View art, authored seasons/weather, per-person decorative seeds, shared-room scope/UI, profile sync and social invitations, new asset compression pipeline. No full World editor.

### Verification map

- Pure tests: catalog/default/18 preset parity; URL precedence; missing/malformed/removed preference; v1 migration; unavailable storage; no reroll on travel/reconnect; quality writes retain selection; deterministic all-World/all-View resolution and none/parent semantics.
- Runtime tests: latest-wins A→B→C, failing/stale imports, resource rejection/retry, double-release/same-owner handles, shared fetch cancellation, context loss, budget eviction, hidden-host suspension, same-variant no rebuild; no membership/participation/media mutation.
- Geometry tests: compare before/after across all six Worlds and variants for bounds, obstacles, screenQuad, seat/gate/table/cabinet/participant/spawn transforms, course hashes/rules/checkpoints and exclusion volumes. Include exact deterministic race trajectories with identical controls and seeds.
- Browser: theater → arcade approach → pool play → theater; theater → Kart → theater; theater → Summit → theater; Downhill and other places; active switch in theater, lounge, another place and leased game; two distinct browser identities/Worlds sharing players and activities; none game; offline/storage failure; rejected assets, rapid navigation, resize and all camera modes. Check floating media remains one playback session and failed World audio never changes mute/voice/media policy.
- Screenshots: all 18 theater variants baseline equivalence, six World profiles in Kart/Summit/Downhill, each policy class at low/high; review HUD at desktop, actual preview and narrow sizes. Art readability is a human/visual gate, not a DOM assertion.
- Commands during implementation: `npm test`, `npm run build`, `node scripts/export-place-definitions.mjs --check`, focused `mix test` for world atmosphere/activity environment in `server_elixir`, existing Kart/floating-media/game browser gates plus a new `scripts/world-inheritance-gate-browser.mjs` with the above matrix. A build alone is insufficient.

## Open Questions

Only art tuning and measurement remain deferrable: exact intensity bounds for each native game adapter, representative constrained hardware, and whether later optional World kits warrant compressed textures. They cannot relax gameplay invariance, loading, ownership or existing quality/comfort requirements. If a profile cannot pass those gates, keep its documented generic/native fallback and report the failed visual gate before default enablement.

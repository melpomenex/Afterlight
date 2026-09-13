## 1. Baselines and integration boundaries

- [x] 1.1 Recheck the current checkout and overlapping Kart loading/rendering, Downhill and floating-media changes; record the integration baseline and owned files in this change's evidence, verifying no unrelated work is overwritten.
- [x] 1.2 Capture all eighteen theater variants and functional geometry signatures from `src/world/theaterWorld.js`/`shared/placeDefinitions.js`; verify the artifact includes bounds, obstacles, screenQuad, seats, cabinets, tables, spawns and participant/dismount anchors.
- [x] 1.3 Capture native Kart/Summit/Downhill screenshots and cold/warm timing/allocation baselines using existing browser gates and `kartPerf`; verify hardware, production build, quality and unmeasured limitations are recorded per design D8.

## 2. World catalog and durable selection (after 1)

- [x] 2.1 Introduce `shared/worldDefinitions.js` as the single six-World/eighteen-variant catalog and adapt `shared/theaterEnvironments.js` compatibility exports; verify all existing preset mappings and server projection remain equivalent with catalog tests and `node scripts/export-place-definitions.mjs --check`.
- [x] 2.2 Extend `src/environments/quality.js` with v2 World preference migration and field-preserving writes; verify valid v1 data, invalid variants, corrupt/removed IDs, quality-only edits and storage failures without changing unrelated save keys.
- [x] 2.3 Add `src/worlds/state.js` with one selection owner, revision and persistence status; verify uniform initial assignment with injected RNG and no reroll on travel, reconnect, token renewal or nickname change.
- [x] 2.4 Add pure bootstrap query resolution for existing `?preset`/`?world` previews; verify valid/invalid precedence, nonpersistent preview, explicit preview saving and missing-durable-preference assignment.
- [x] 2.5 Add the build-controlled rollout and `?world-system=off` rollback policy; verify both code paths load and rollback leaves saved World, quality, identity and game data intact.

## 3. View policies and presentation host (after 2)

- [x] 3.1 Add normalized `worldSupport` metadata to `src/places/registry.js` and `src/activities/registry.js`, plus `src/worlds/registry.js`; verify every actual place including Market and every activity type/alias has the D3 policy, while the fixture is not exposed as a destination.
- [x] 3.2 Implement `src/worlds/resolver.js` with World/View, generic, native and existing-scene fallbacks; verify the six-World/all-View matrix, restricted slots, unknown declarations, missing variants and none/parent-host behavior.
- [x] 3.3 Implement `src/worlds/host.js` lifecycle and immutable cosmetic anchor/exclusion contract; verify stale generations, idempotent teardown, no gameplay mutation access and rejection of props overlapping approach/spawn/camera clearance.
- [x] 3.4 Add catalog/asset/adapter/default validation and development diagnostics for invalid declarations; verify named errors in validation and playable runtime fallback for unavailable optional adapters.

## 4. Separate personal presentation from semantic authority (after 3)

- [x] 4.1 Add `src/worlds/presentationSample.js` and integrate the sample seam into `src/atmosphere/controller.js`; verify personal profile does not mutate `stateClient` accepted state or `shared/activityEnvironment.js` frozen/live results.
- [x] 4.2 Replace main's environment override/bootstrap/selection wiring with canonical World state and remove picker `atmosphere_set` emission; verify existing room snapshots and old-client mutations cannot replace personal selection or cause room rejoin.
- [x] 4.3 Bind `src/environments/runtime.js` to the selected World while preserving builders, variants and hooks; verify all eighteen migration signatures/screenshots and no theater rebuild on World selection beyond cosmetic groups.
- [x] 4.4 Integrate active-owner presentation through `src/main.js`, `src/places/runtime.js` activation seams and `src/activities/viewLease.js`; verify travel, same-scene camera activity, leased-scene return and failed loads restore correct camera/renderer ownership without resetting player, seat or media.
- [x] 4.5 Preserve authoritative cues/events in `src/atmosphere/{stateClient,events}.js` and World sample resolution; verify wind/rain-dependent activities receive identical semantic values and incompatible cosmetic one-shots are suppressed without replay.
- [x] 4.6 Update `src/audio/environmentAudio.js`/main mixing for one active World/View ambience; verify parent activities do not duplicate voices, hidden social ambience stops, exit meets 200 ms, crossfades and mute/media/voice gains remain local.
- [x] 4.7 Run focused Phoenix atmosphere/activity-environment tests and add a two-client compatibility test using `server_elixir/lib/afterlight_web/game_channel.ex` and existing transport seams; verify identical authority under different Worlds and no new wire fields, room keys or protected snapshot writes.

## 5. Personal picker and social coverage (after 4)

- [x] 5.1 Update `src/ui/worldSelector.js`, `index.html`, `src/style.css` and main bindings for Choose your World, browser scope, preview/session-only feedback and Settings access; verify keyboard focus, modal input clearing and desktop/preview/narrow layouts.
- [x] 5.2 Make Settings World selection reachable during supported leased activities using existing input ownership; verify switching preserves the activity session, score and floating media without accidental Escape exit or stuck controls.
- [x] 5.3 Add bounded ambient profiles for every non-theater place through the place presentation host; verify all six profiles affect permitted lighting/audio while preserving semantic weather, landmarks and gameplay sightlines.
- [x] 5.4 Bind pool, air hockey, foosball, darts, piano, photo booth and the remaining in-place modules to parent inheritance; verify arcade-to-pool play and the D3 activity matrix create no extra environment hosts or duplicate ambience.

## 6. Safe shared assets and optional preparation (after 3; before asset-sharing adapters)

- [x] 6.1 Strengthen `src/activities/resourceCache.js` acquisition/release ownership and idempotence while preserving current callers; verify double release, unauthorized release, same-owner repeated acquire and multi-owner retention tests.
- [x] 6.2 Add pending-factory deduplication, rejection retry, cancellation and resolved-value disposal to the cache; verify one consumer cancellation cannot cancel another, late completions cannot leak and context-specific resources are not reused incorrectly.
- [x] 6.3 Add `src/worlds/assets.js` logical factories/URLs and estimated allocation metadata using existing environment-kit ledger conventions; verify borrowed geometry/textures are released by handles and never disposed by local group traversal.
- [x] 6.4 Add bounded hidden staging/latest-selection commit and explicit retry to World hosts; verify A→B→C out-of-order completion, travel during load, individual GLB/texture/probe/audio failure and preserved playable fallback.
- [x] 6.5 Integrate optional destination prefetch with `kartRoyalePrepareScheduler.js`, place intent and `graphicsJobs.js`; verify no additional RAF, no wait on optional cosmetics, deduplicated requests and no GPU jobs outside the current owner's safe transaction.
- [x] 6.6 Split measured over-budget synchronous environment terrain/instance builders into resumable batches only where necessary; verify deterministic output matches the eighteen baseline variants and no cosmetic build is merely hidden inside an uninterruptible Promise.
- [x] 6.7 Add shared allocation admission/idle eviction within design D8's combined retention envelope; verify low-memory pressure evicts unreferenced cosmetics first and twenty return cycles stop hidden updates and return owned resources to baseline after eviction.
- [x] 6.8 Expose safe theater arcade/lounge exterior anchors and reuse existing kit factories in both regions; verify shared resource identity, independent placement/release and unchanged functional signatures, with no required new external art.

## 7. Hosted game presentation adapters (after 4 and 6)

- [x] 7.1 Extend Kart `games/kart-royale/src/host/{types,index,runtime}.ts` and `src/activities/kart-royale/controller.js` with optional World profile/setter; verify prepared gameplay readiness survives a World change and native standalone defaults remain valid.
- [x] 7.2 Implement six bounded Kart profiles in `render/{Atmosphere,Sky}.ts` and a safe far-scenery seam in `world/Scenery.ts`; verify track/collision/checkpoint/RNG signatures and deterministic race results are unchanged, with native fallback on missing scenery.
- [x] 7.3 Scope Kart shader-chunk/probe/material updates to graphics ownership and keep its `present` composer; verify background warm, active switch, suspend/reentry, context loss and theater return do not leak ShaderChunk or renderer policy changes.
- [x] 7.4 Add partial World profiles and far-scenery hooks to `src/activities/snowboard/scene.js`/controller with borrowed-resource-safe disposal; verify all six cold-climate interpretations, canonical terrain/course/RNG signatures and identical race outputs.
- [x] 7.5 Add ambient profile setters through Downhill `src/activities/downhill/scene.js` and `games/downhill-mayhem/src/{host/runtime,game/rendering}.js`; verify sky/light/audio changes preserve course/rider simulation, camera and current participation.
- [x] 7.6 Verify the integrated policy matrix for parent table games and none retro/dormant games; deliver screenshots proving surrounding World identity without altering game pixels, table geometry or unplaced-game manifest status.

## 8. Diagnostics and release acceptance (after 5–7)

- [x] 8.1 Extend main's debug-only `__afterlight` environment data and `__kartPerf` records with selection, actual host, applied revision, fallback, assets and labeled byte estimates; verify forced World/View combinations and failure traces contain no identity tokens.
- [x] 8.2 Add `scripts/world-inheritance-gate-browser.mjs` covering navigation, hot switching, two-client Worlds, slow/missing assets, offline/storage denial, context loss and rapid cancellation; verify the complete design verification matrix on the existing supported stack.
- [ ] 8.3 Capture all eighteen theater variants and six profiles for each hosted adapter at low/high quality, including first-person and table cameras; verify baseline composition, navigability, readable cues and responsive dialogs with real screenshots.
- [ ] 8.4 Run the production performance cohort in design D8 (five cold and twenty warm cycles on desktop and constrained hardware); verify entry/frame/TTI/retention limits, GPU/CPU accounting and no sustained leaks, recording failed or unavailable gates honestly.
- [ ] 8.5 Run `npm test`, `npm run build`, the projection check, focused Phoenix tests and relevant existing Kart/Downhill/floating-media browser gates; verify failures caused by this change are resolved and unrelated baseline limitations are distinguished.
- [ ] 8.6 Update `README.md`, `AGENTS.md`, `docs/theater-environments.md`, `docs/arcade.md`, game guides and new `docs/worlds.md` with the actual personal scope, APIs, Blender kit conventions and fallback authoring; verify links and controls match implemented behavior.
- [ ] 8.7 Enable the feature only after acceptance evidence passes, exercise the rollback flag once and finalize this change's evidence; verify rollback retains World preference and all existing user/server data. Future rich art, room scope and profile sync are not prerequisites.

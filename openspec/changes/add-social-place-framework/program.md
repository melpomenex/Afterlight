# Social places program — architectural handoff

Planning baseline: 2026-09-07. This is a specification program, not an implementation report. All new implementation checkboxes remain empty. Start with `add-social-place-framework`; read its proposal/design/specs/tasks and this document before editing. Reinspect any touched file: the baseline has uncommitted user work in environment configuration, index.html, server/index.js, Elixir runtime config, garden tick, contract board, IRC bridge and generated assets. Do not overwrite it.

## Product and release order

Afterlight is a collection of beautiful shared places on the internet. Theater remains the default spawn and a specialized watch-together destination. No new place needs an objective, resource, reward or unlock. Presence, sitting, existing emotes and global town chat provide companionship before voice ships. The current chat is global `#afterlight`, not private room conversation; do not imply acoustic zones make text or voice private.

1. **A — add-social-place-framework:** metadata/lifecycle/seating plus truthful Places directory; prove The Orpheum unchanged.
2. **B — add-atmosphere-weather-system:** pure state, rendering/audio modules, owner integration and control-plane snapshots/events. Deliver a deterministic test harness, not a substitute destination.
3. **C — add-rain-court-social-space:** first complete weather destination, replaces `court` composition with its ID intact.
4. **D — add-desert-camp-social-space:** new `desert-camp`; fire/sky/events prove reuse.
5. **E — add-rooftop-social-space:** replaces `rooftops` composition, retains its optional legacy note/anemometer completion.
6. **F — deemphasize-legacy-farming:** depends only on A; stage alongside B/C. Makes social HUD primary without removing data or changing economic rules.

B's owner integration gate must pass before its shared effects are enabled. C/D/E release evidence depends on the previous vertical slice. P8 voice GO is not a gate for any place. No empty conferencing change is created. This document is a dependency map, not machine-enforced cross-change scheduling: the implementation model must complete prerequisites explicitly.

## Repository evidence and corrections to old guidance

| Evidence inspected | Consequence for design |
|---|---|
| `src/main.js` imports market/garden builders, `getOrCreateDistrictWorld`, `setRoom`, `frame` | The guide's eager `courtGroup` / `enterDistrict` architecture is stale. Extract around actual functions; do not rebuild the old architecture. |
| `src/districts.js` 17 entries, explicit `DISTRICT_BUILDERS`, `buildDistrict` | Already has a registry, conditional notes/landmarks and static batching. Keep this machinery; add an opt-out for the universal urban shell. |
| `court` has bench/puddle scenery, no objective or note; `rooftops` has existing note/anemometer | No new `rain-court` or competing `rooftop` ID. Preserve saves, routes and optional existing completion. |
| `getOrCreateDistrictWorld` derives all east/west gates from array order and adds a south market gate | Freeze legacy edges explicitly before appending Desert; adding a definition must not silently reroute Theater. |
| `setRoom` hides groups before lazy build; a newly built group defaults visible; accepts invalid room then renders market | Resolve/build before commit; unknown IDs visibly fall back to Theater and must not join invisible unknown rooms. |
| `setRoom` does not explicitly clear `nearest`, `keys`, `press`, or `currentGardenBeds`; `frame` passes `currentGardenBeds || isDone` to every world | Extract a tested transition reset and a typed world-update adapter. A garden snapshot must never masquerade as a district completion flag. |
| `sitOn` fixes yaw to PI and standZ to seat.z−0.8; `standUp` always changes Theater UI | Seat primitive needs explicit world-space sit/dismount poses; Theater adapter alone requests cinema view. |
| `src/world/bounds.js`, `tests/districts.test.js` | Bounds helpers exist; tests duplicate old bounds, exclude court from flood fill, require objectives on every non-court entry and pin length 17. Replace those assumptions with manifest contracts; strengthen route coverage. |
| `src/net/client.js`, `phoenixClient.js`, `roomEpoch.js` | One `game:v1` transport multiplexes rooms; desiredRoom replay is essential. No per-place socket. Existing epoch helper keys by desiredRoom before frame.roomId: explicit wrong-room filtering is necessary for new messages. |
| `World.RoomServer`, `Rooms`, `Frames`, GameChannel | Membership truth is a player-ID-keyed roster with conn_ref fencing, **not Phoenix Presence**. `Rooms.resolve` accepts arbitrary public strings; directory must use a build-controlled allow-list and never enumerate private gardens. |
| `World.epoch`, `ensure_room_with_lease`, RoomServer state/Frames | Lease modules exist, but RoomServer has no epoch callback/handle and ensure_room_with_lease ignores its handle at this baseline. Frames default epoch 0. Checked tasks do not prove integration. B gate requires a real takeover/late-frame test and existing lease wiring, not invented weather epochs. |
| GameChannel `handle_info({:world_frame,...})` | Current frames lack sender room identity and can remain queued across travel. A explicitly tags/filters public room output, preserving binary payload format while filtering its envelope. |
| `Afterlight.World.Weather`, `Gardens.Tick`, `updateWeatherDisplay` | Agricultural weather is a global string consumed by crop moisture; current display also overwrites fog. B isolates presentation without changing that simulation. |
| `TheaterScreenUI` | Specialized DOM/engine ownership includes pending resolutions, async load tokens, volume, homography and cinema chat docking. Keep the object; lifecycle wrapper only. No WebGL media texture. |
| `Afterlight.Theater`, Catalog, specialty adapters and P5/P7 evidence | Durable media is Ash-owned when flipped. Preserve HTTP catalog uploads, metadata-only catalog, lazy EPG/list pulls, canonical torrent picks and grants. Never duplicate queue synchronization. |
| Conferencing Call/CallMembership/MediaGrant, Actions/Feature, SFU behaviour | Resources/grants exist; full browser calls/signaling/worker acceptance are unfinished. Static acoustic metadata is readiness, not a working or private voice service. |
| `UnrealBloomPass`, ACES, PCF shadow sun, 120 global Points, Web Audio in main | Weather targets current WebGL renderer and existing composer. No SSR/volumetric rewrite or new WebGPU requirement. Current synth nodes connect directly to destination and ambient source cannot be stopped by travel. |
| Realtime changes, `tools/realtime`, `benchmarks/realtime` | Reuse measurement/report discipline and entity backend. Particle data never enters avatar SoA/worker/WASM paths. GPU harness is not proof of live-world visual parity. |
| README and AGENTS | Contradict each other and current code about transport, controls, room count and snapshots. Real keys: **T** Travel, **M** Market, V emotes. README even suggests deleting catalog originals; F removes that instruction. |

Ripwire was available; scoped task packing and `--impact=setRoom` / `--affected=setRoom` ranked the actual seams. Impact found interact/renderDistrictList/openDistricts and no indexed test reaching setRoom. This is a coverage warning, not proof there are no tests. Elixir was inspected directly because Ripwire has no Elixir grammar. No tools were installed. No runtime tests or visual/performance measurements were performed for this planning task.

## Existing-change dependency/conflict matrix

Statuses below are `openspec list` observations, not acceptance certification. Complete changes still in `changes/` are unarchived; do not duplicate their capability definitions in `openspec/specs` merely to satisfy a dependency.

| Actual change ID | Observed status | Relationship / required action |
|---|---|---|
| port-backend-to-elixir | complete 22/22 | Governance foundation. Preserve one writer, Ash durability and sidecar boundary; product pivot supersedes farming identity, not migration correctness. |
| add-parity-fixture-baseline | complete 25/25 | Reuse test fixture discipline; do not update historical vectors to hide regressions. |
| add-phoenix-gateway-transport | complete 24/24 | Hard foundation; use NetworkClient/game:v1 and signed identity. No transport replacement. |
| add-world-room-runtime (archive/2026-09-07-*) | archived | Single roster/room process authority; A adds a read projection, B adds transient atmosphere to same owner. |
| add-ash-accounts-domain | complete 28/28 | Identity/grants/receipts foundational regardless of farming. |
| add-ash-theater-catalog-domains | complete 29/29 | Preserve Ash bill/catalog actions, specialized UI, upload and snapshot paths; rerun P5 regressions when lifecycle changes. |
| add-node-specialty-adapters | complete 21/21 | Preserve torrent grant/Range and IRC boundaries; no new environmental sidecar. |
| add-social-chat-relay | complete 14/14 | Keep town chat global and DMs unchanged. Room chat/privacy would require a separate product change. |
| add-conferencing-media-spike | in-progress 5/28 | Integrate metadata and one audio-duck seam only. P8 owns capture, signaling, TURN, worker, capacity and measured GO/NO-GO; no automatic capture on travel. |
| add-distributed-room-ownership | complete 20/20 | Existing lease/fence owner. B first proves/repairs its live RoomServer integration, with evidence attributed to P9; no parallel weather owner or fake epoch. Multi-node remains gated. |
| add-observability-security-loadtesting | in-progress 22/29 | Reuse telemetry/load client. Environment GPU budgets are additional browser measurements, not a claim P10 fleet gates passed. |
| add-ash-gardens-economy-restoration | in-progress 32/46 | **Continue as compatibility/correctness infrastructure; reduce product ambition.** Retain unfinished import/export, conservation, transactions and cutover evidence (sections 6,7,9). Defer suggested new farming enhancements. Never archive an incomplete migration as completed; never partially flip interconnected domains. A–E do not depend on its production ceremony. |
| remove-node-server-authority | complete 21/21 | Evidence/docs still acknowledge transitional ownership and P6 gaps. Do not interpret complete as all Node write paths gone. Keep rollback within actual authority map; no resurrection of Node-only support. |
| add-theater-district | complete 32/32 | Reference destination; preserve all three pending capabilities and seat/cinema behavior. |
| add-torrent-streaming | complete 18/18 | Preserve source/pick/status/Range, no generic framework rewrite. |
| add-youtube-playlist-import | complete 19/19 | Preserve mixed-link choice, preview/confirm and batch reporting. |
| realtime-binary-gpu-acceleration | complete 11/11 | Parallel performance program. Atmosphere is JSON control metadata, no new binary entity components. |
| add-realtime-benchmark-harness | complete 18/18 | Reuse versioned hardware/results methodology, not avatar benchmarks as weather results. |
| add-realtime-wasm-decoder | complete 12/12 | No change to decoder ABI. |
| add-realtime-worker-pipeline | complete 12/12 | Preserve reset/dispose and negotiated fallback. |
| add-realtime-gpu-rendering | complete 12/12 | Experimental renderer remains optional; production WebGL weather first. |
| add-realtime-live-wiring | complete 6/6 | Preserve joinRoom interception/reset and snapshot negotiation. |
| wire-realtime-entity-backend | complete 13/13 | Preserve CPU/GPU avatar seam and seated/airborne/emote semantics. |

Archived biome, crafting, market/garden, camera, jumping, IRC and presence changes remain compatibility contracts. A modifies only the responsive navigation requirement in `biome-exploration-mechanics`; old lore/restoration requirements remain intact for their original twelve IDs, including rooftops. New Desert has no restoration contract. C preserves court's existing no-note/no-objective contract.

## Read-next and commands

Implementation order is A tasks in numeric order, then B, C, D, E; F after A. Each task names new versus existing files, reuse, behavior, constraints, cleanup, tests, command, measurable completion and exclusions. Paths are repository-relative unless stated otherwise. Node commands run at repository root; Mix commands run with working directory `server_elixir`. Browser acceptance requires an existing or explicitly started `npm run dev:stack`; read actual ports, use isolated guest identities and synthetic fixtures. Never mutate production Theater content for a smoke test.

The build invokes Cargo's wasm target before Vite. Missing wasm toolchain is a build prerequisite to report, not permission to remove it. OpenSpec validation is the only executed verification required now; implementation must run the commands in its tasks.

## Gates with a concrete result

- **Owner integration (B 1.1):** join a real Phoenix room, assert emitted atmosphere epoch equals held lease epoch; kill/reacquire, assert strictly greater epoch and old-owner output rejected. Failure blocks synchronized activation; local deterministic harness can proceed. Repair using existing Lease/Renewer/Directory/Successor, never invent a separate weather-generation authority.
- **Voice:** P8 GO report and tested call API required before attaching a real adapter. Missing/no-go means no call CTA/capture, not a blocked social-place release.
- **Visual/GPU:** each slice uses B's measurement protocol at normal/reduced quality with four camera modes and busiest effects; record hardware and actual p50/p95 rather than guaranteeing universal 60 FPS. Failed budget requires density/light/geometry reduction and remeasurement before promotion.
- **Multi-node:** P10 evidence + actual owner routing remains upstream. Directory returns unknown for a remote/unavailable owner until that path is proven; do not sum local registries as a global count.

## Answers to the 22 architecture questions

| # | Decision / location |
|---|---|
| 1 | Place manifest wraps the existing district builder contract; A D1. |
| 2 | Immutable plain data in shared/placeDefinitions.js, renderer references in src/places/registry.js; A D1. |
| 3 | One client PlaceRuntime activated from setRoom; A D2. |
| 4 | Inject optional specialized adapter, retain TheaterScreenUI singleton; A D4. |
| 5 | Prepare/activate/deactivate/dispose, explicit ownership; A D2/D6. |
| 6 | Same game:v1, desiredRoom replay, tagged room output; A D3. |
| 7 | Targeted atmosphere snapshot after successful World join/roster; B D2. |
| 8 | Preset/transition/seed/wind/time/events owned by RoomServer; B D1/D2. |
| 9 | Drops/splashes/embers/dust/cloud noise/foliage purely local; B D4. |
| 10 | Existing lease epoch plus atmosphere-only revision; B D2 and owner gate. |
| 11 | Authored x/z rectangles with roof height, exposure and feather; B D5. |
| 12 | Same authored volumes, priority and gain/filter values; B D7. |
| 13 | Owned material families with immutable dry parameters, absolute interpolation; B D6. |
| 14 | Bounded future event windows with IDs/timestamps in snapshot; B D3. |
| 15 | One active controller and existing rAF; no inactive ticks/audio/timers; A D6/B D4. |
| 16 | Independent normal/reduced effect tiers and existing DPR control; B D8. |
| 17 | Reduced motion retains fog/light/wetness, suppresses vigorous motion; flashes separately off/reduced; B D8. |
| 18 | Adapter and regression matrix, no engine/queue rewrite; A D4 and verification.md. |
| 19 | Metadata-only group/acoustic policy; P8 call adapter owns capture/subscriptions; A D7. |
| 20 | F contextual UX, P6 preservation/correctness continues; no destructive sunset. |
| 21 | Static definition + builder + zones/preset + optional adapter + tests; A authoring task. |
| 22 | Named unit, World/GameChannel, browser lifecycle, media and measurement gates in tasks/verification.md. |

## Handoff entry points

Read this reconciliation first, then [A design](design.md) and [A tasks](tasks.md). Follow the release order above through sibling change directories. The shared [implementation verification contract](verification.md) defines the browser, provider, capture and resource gates. [Planning validation](planning-validation.md) records checks actually performed in this specification session and distinguishes them from unexecuted runtime acceptance.

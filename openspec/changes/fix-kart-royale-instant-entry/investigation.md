# Investigation evidence — Kart Royale entry

Source inspection: 2026-09-10, baseline commit `8f9e59d6a`. No production code changed and no new browser timing run performed. The user's ~30-second observation is the motivating report, not a timing measured by this investigation. Local generated `dist` was inspected without rebuilding; its sizes are illustrative and must be refreshed during baseline implementation. This document synthesizes host, runtime and asset investigations.

## Actual end-to-end path

```mermaid
sequenceDiagram
  participant P as Player / main.js
  participant A as Kart activity instance
  participant N as Existing participation / Phoenix
  participant C as Kart controller
  participant H as Hosted Kart runtime
  participant R as Shared WebGL renderer
  P->>P: nearest item by x/z distance each social frame
  P->>A: E → interact → beginParticipationFor
  A->>C: await dynamic controller import
  C->>N: join cabinet (existing connection)
  N-->>C: accepted participation / anchor (or queue)
  C->>H: await dynamic host module import; construct
  C->>R: acquire view lease immediately
  Note over H,R: unfinished scene + origin camera can now present
  C->>H: await boot
  loop 13 ordered systems
    H->>H: await rAF; init system
    R->>H: lease.present runs between boot stages
  end
  H->>R: prewarm: compileAsync → shadow depth → geometry upload
  H-->>C: boot resolved
  C->>H: beginSession; attach input
  P->>H: host frame update / lateUpdate (first camera pose)
  H->>R: full game present
  P->>H: selection → explicit race start → countdown → driving
```

### Host symbols and ownership

- `src/main.js:2224` searches nearest item in x/z each social frame; `interact` at 1463 routes E to activity participation at 1490. Held-view/occupied-participation E currently has exit behavior before this route.
- `shared/placeDefinitions.js:248` defines the Kart cabinet at `[10.42,0,-1.8]`, rotation `-π/2`, radius `2.2`, footprint `.85 x .9`, one player, 16 spectators, queue eight; seat anchor `[9.3,0,-1.8]`, dismount `[8.55,-1.8]`.
- `src/activities/runtime.js:297` delegates to the activity instance; `src/activities/kart-royale.js:130` memoizes the lazy controller import, with `beginParticipation` at 326 awaiting it. The visibility throttler drives attract-canvas repaint, not resource preparation.
- `src/activities/kart-royale/controller.js:336` toasts loading and calls the existing participation join. `src/activities/participation.js:219` sends the request; accepted result handling at 329 sets participating, sends ready and anchors the world player.
- Controller `update:265` waits for accepted participation, then `createAndBootHost:163` imports the game at 170. The constructor receives the host renderer, viewport, HUD root and optional audio mixer; no iframe/router/React tree is mounted. `acquireTheView:220` leases scene/camera/present; crucially line 197 acquires before line 201 awaits boot. The `booted` guard at 287 protects updates only.
- `src/main.js:131` switches leased scene/camera; `:2055` skips social simulation and invokes the lease presenter. Normal source input/world updates are suspended. The `present` callback continues during boot as soon as the pipeline can render.
- `games/kart-royale/src/host/index.ts:27` composes the same runtime used by standalone `src/main.ts`. The standalone shell is not imported into Afterlight. `beginSession/endSession:114` only attach/detach game input; they are not complete suspend/resume operations.
- Controller `handleViewRelease:244` always disposes the host today. Immutable module code can remain browser-cached, but generated scene/GPU resources are destroyed and boot repeats.

### Runtime dependency graph and costs

`games/kart-royale/src/host/runtime.ts:102` constructs `RenderPipeline`, input, sky, Materials, Track, Scenery, Effects, Items, Race, ChaseCamera, HUD, Audio and draw budget; creates a scene and `PerspectiveCamera` at line 139. At line 179 the init sequence is:

`pipeline → input → sky → materials → track → scenery → race → items → effects → camera → HUD → audio → drawBudget`.

Boot at line 327 yields one rAF before each init, then awaits init. These ~14 frame boundaries impose a minimum delay of roughly 0.23 seconds at 60 Hz before accounting for any work, not 30 seconds by themselves. Long synchronous bodies still block a frame. Sky supplies the PMREM environment/sun; material consumers generate textures on demand; Track supplies support/collision samples; Scenery and Race consume Track; Items needs the kart field; Camera/HUD/audio consume Race. This is not a set of independent awaits to blindly parallelize.

`Materials.ts:1721 init` primarily configures settings. `get:1729` generates/cache-misses lazily when world/kart builders ask for materials; attributing all material generation to Materials.init would miss most cost. `Track.ts:110` builds procedural geometry; Scenery dresses it; `Race.ts:210` builds eight karts and the racing line. `Sky.ts:1960` bakes the environment cube and PMREM. `Renderer.ts:245` adopts the external renderer; composer/passes and state are still initialized separately for Kart.

`runtime.ts:395` awaits `prewarm(ctx)` after all systems and resize. `core/Prewarm.ts:392` reveals hidden pooled objects, cages registered off-scene materials, widens camera layers, compiles actual framebuffer variants at 476, warms shadow depth and geometry upload at 481–488. It logs aggregate counts/time but not complete entry attribution. This existing work must move to preparation, not be duplicated at E.

### Renderer version and infrastructure reuse audit

| System | Actual hosted behavior | Design consequence |
| --- | --- | --- |
| Renderer/canvas | `src/main.js:97` WebGLRenderer; Kart external mode adopts it. Installed root and nested Three are 0.185.1. | Reuse already exists; no WebGPU replacement/device work. |
| Frame loop | Main activity update + lease present. Runtime has boot rAF yields, no second recurring loop. | Schedule preparation on host; boot yields are not extra animation loops. |
| Scene/camera/composer | Kart owns separate scene, camera and postprocessing/N8AO pipeline. | Appropriate per-game resources; warm/cache while restoring global renderer state. |
| GPU cache | WebGL program cache on shared renderer; prewarm already uses compileAsync. | Retain live material resources; HTTP cache alone is insufficient. |
| Assets/loaders | Procedural geometry/Canvas/DataTextures; no separate runtime asset fetch manager found. | Optimize measured generation; do not add decoder dependencies. |
| Audio | Synthesized Web Audio; optional host mixer context/destination; fallback private context. | Defer session audio effects/unlock to gesture; no audio download/decode waterfall. |
| Input | Host capture forwarding + game Input/touch lifecycle. | Detach all session listeners while warm/suspended. |
| Physics | Custom JS kart step and Track sample/probe; no external WASM physics runtime. | Prepare track/grid/corner tables, freeze simulation until valid. |
| Network | Existing Afterlight net/Phoenix participation; admission-only Kart SessionServer policy. | Preserve queue/seat authority, parallel local work; no network race bootstrap. |
| Workers/WASM | No Kart worker/WASM initialization found. Afterlight realtime worker/WASM is separate. | Mark these timing categories N/A unless implementation adds them with evidence. |
| App/shared state | Hosted runtime, no router/React/standalone page startup; module-level Materials/prewarm state remains. | Single prepared instance; audit globals and cleanup. |

Installed `node_modules/three/src/renderers/WebGLRenderer.js:1487` implements `compileAsync` by calling `this.compile(scene,camera,targetScene)` synchronously before constructing the completion Promise. Its later ~10 ms poll reads program readiness; there is no inherent 30-second timer. This permits capture settings/target → call compileAsync → synchronously restore state → await the returned promise. Protect the relevant materials until polling settles. Submission itself may stall and still needs measurement. `initTexture:3529` and `initRenderTarget:3513` are available, but existing upload/prewarm coverage should be reused and tested rather than calling APIs blindly.

## Root-cause classification

**Confirmed work on the critical path:** controller import, admission roundtrip before game import, full procedural system construction, sequential system init, PMREM/composer preparation, shader/geometry warm, and post-boot camera pose. Every exit rebuilds the runtime. The intermediate view readiness bug is source-confirmed.

**Likely large contributors, not measured:** procedural material/texture and scenery/kart generation; GPU upload/PMREM/shader work; duplicated Three module parsing/evaluation. The local lazy bundle is substantial, so a slow uncached connection can add delay. Compilation completion may dominate on weak/software GPUs.

**Unknown:** relative milliseconds of each; the actual deployed browser/network/GPU behind the 30-second report; first-postprocessing-frame stalls after boot; current incremental memory. No discovered deliberate 30-second retry/sleep explains the whole wait. Existing browser gate `waitGameLive` at `scripts/kart-royale-gate-browser.mjs:159` permits 120 seconds and checks eventual UI state; that proves neither low latency nor absence of intermediate bad frames.

Historical predecessor evidence reports successful eventual entry/racing/exit and a four-cycle forced-GC heap sequence of 222 → 371 → 880 → 672 MB under SwiftShader. Those are a warning to audit disposal, not current measurements or proof that a 256 MiB cache fits. Some predecessor checkboxes and implementation differ; source controls this design.

## Under-map analysis

`runtime.ts:139` creates an origin camera. `game/Camera.ts:653 init` sets projection/lookup/event state but not position; `lateUpdate:716` creates the actual view. Controller deliberately prevents update until boot ends while the lease presenter is already callable. Once geometry exists, this exposes an origin-camera partial world until the first complete update/lateUpdate. During awaited prewarm, temporarily revealed objects/layers may also be presented. This is a concrete invalid intermediate presentation path and the strongest explanation of the reported below-world image.

Actual kart placement differs: `Race.formGrid:320` samples the banked road and uses `sample position + normal * GRID_LIFT` at 347; `Kart.placeAt:1095` resets motion/jump/respawn state and the object transform at 1135. There is no demonstrated “gravity started before ground” cause. `Kart.step:1147` uses custom physics and first-step corner-table generation at 1152. Capture camera transforms, track-support values and filmstrip through delayed boot phases to prove whether the user's specific frame is the origin view, temporary prewarm reveal, or an additional bug. The readiness contract protects all of them.

## Asset inventory and caching

Local dist snapshot; raw bytes and locally computed gzip bytes (not observed HTTP encoding):

| Resource | Raw bytes | Gzip bytes | First-playable relevance |
| --- | ---: | ---: | --- |
| Kart `controller-B_OdX4ct.js` | 4,313 | 1,923 | activity adapter |
| Kart `index-DEABedUw.js` | 1,782,995 | 612,133 | host/runtime/builders/dependencies |
| Kart `index-CypvppCO.css` | 37,980 | 9,100 | game UI |
| **Incremental Kart sum** | **1,825,288** | **623,156** | indicative module/style transfer |
| Root `index-B9rkzMv9.js` | 1,606,553 | 454,946 | Afterlight already loaded |
| Theater `hls-BOLXTnjL.js` | 592,426 | 184,796 | not Kart startup |
| Afterlight `decode.worker-D595la5n.js` | 16,214 | 5,622 | not Kart startup |
| Shared cabinet GLB | 8,568,456 | not measured | Theater cabinet template, not E-triggered Kart world |

No runtime Kart GLB/glTF, Draco/Meshopt decoder, KTX2/Basis, texture image, audio file, or WASM payload was found. Documentation screenshots and tools are not playable resources. Thus required external model/audio/WASM bytes are absent from this inspected path; do not infer actual HTTP transfer totals without a fresh build/network trace.

Generated footprint is substantial despite absent downloads. `Materials.ts:160 BASE_SIZE` includes many 1024-square road/cobble/kerb/sand/grass/cliff/tunnel/wall/stucco/frond maps and 512-square dirt/roof/wood/metal/rubber/water/banner/crowd maps; macro textures are 128. `Materials.res:1929` scales low to quarter, medium half, high/ultra full with caps. `Textures.buildMaps:561` produces albedo, Sobel normal and ORM. One RGBA8 1024² map with full mips is ~5.33 MiB; a three-map set ~16 MiB, or ~4 MiB for 512². These are formulas, not residency measurements; count shared maps once and inspect formats/mips.

Sky uses a 512² high+ or 256² low six-face half-float environment cube; the high base cube is ~12 MiB before PMREM/depth. High near/far shadows are 3072² and 2048² (`Sky.ts:722,743`); viewport postprocessing targets add more. Full GPU/CPU totals need the allocation ledger in design D7.

Required for READY initially: track/support data, world/visible materials/sky, kart roster/full AI field, valid selection/grid camera, required shader variants/uploads, final-size pipeline and UI resources. Defer gesture audio activation and optional diagnostics; keep admission concurrent but necessary for active ownership. Defer optional FX/alternate meshes only after first-use hitch testing, since prewarm intentionally covers dormant projectiles.

Root `vite.config.js` has no dedupe/manual chunk rule. Local root and Kart large bundles both embed Three internals; nested `games/kart-royale/node_modules/three` exists at matching version. Dedupe may reduce transfer/evaluation, but byte savings need a fresh module report. Kart `Textures.setTextureBudget:112` patches `THREE.Texture.prototype.needsUpdate` globally and never restores it: scope this to Kart resources before sharing module identity, or low-memory Kart policy can alter Theater textures.

Root `vercel.json` has no explicit asset Cache-Control; nested standalone Kart config sets immutable year-long `/assets` caching but does not govern the Afterlight root deployment. Hashed assets support immutable caching; actual deployed headers remain unmeasured. Existing Vite modulepreload helper runs when dynamic import is invoked, not during Theater startup. No Kart service worker/prefetch registration was found. Do not add redundant storage layers; distinguish downloaded, evaluated, generated/decoded, GPU-ready and game-ready.

## Race/leak audit requiring implementation

- Outer activity controller-import continuation lacks a disposed/generation recheck (`kart-royale.js:328`); travel can be followed by a stale join.
- Controller exit/release nulls host without invalidating all async attempts; awaited boot can later dereference it or publish stale state. Host `booted` is set before completion, and repeat boot returns immediately rather than joining a promise.
- Runtime boot does not inspect disposed/canceled at each yield; teardown can be followed by additional initialization. Track initialized/failing ownership and wait/fence noncancelable GPU work.
- Seat-loss condition at controller 272 requires currentActivity to stay set, but participation leave/abort clears it. Main disconnect at 1076 does not directly deactivate participation. Subscribe to real ownership/transport loss; handle null activity as loss.
- Lease rejection can reattempt creation every frame; fatal update callbacks can clear host synchronously before later `host.dead` access. Use stable instances and bounded failure state.
- Context-loss watch is installed on window without capture; native canvas context events do not bubble. Bind to renderer.domElement and test a real canvas event.
- Main renderer snapshot is after leased resize; capture before mutation. On release restore policy but size for the current viewport, not stale pre-entry dimensions.
- Prewarm holds target/layer/reveal mutations across await. Refactor state restoration before live Theater can render.
- `Race.dispose:841` removes kart objects but does not itself release their geometry/material resources. Other system cleanup and module globals need a complete ownership ledger. Never dispose host-owned renderer/audio/net.
- Cached `endSession` is not enough: detach HUD/touch/global input/audio/context listeners and freeze simulation/present, then remount session resources on activation. No workers/new physics engine need retention in the current path.

The selected design is in design.md; behavior contracts are in specs/kart-royale-entry-readiness/spec.md; ordered executable work is in tasks.md.

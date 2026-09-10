# Evidence — fix-kart-royale-instant-entry

## Phase 1 — Baseline instrumentation and evidence

### Task 1.1 — Source audit, baseline revision and test landscape

- **Baseline revision**: `8f9e59d6a9c5e65143d6efdd8b9e486917e9282b` (HEAD on `main`).
- **Predecessor status**: `integrate-kart-royale-arcade` is unarchived on `main` with its implementation in place (`src/activities/kart-royale.js`, `src/activities/kart-royale/controller.js`, `shared/placeDefinitions.js`, `games/kart-royale/src/host/`).
- **Source audit against investigation.md**:
  - `src/activities/kart-royale/controller.js`:
    - Lines 197-201: `acquireTheView()` is called *before* `await host.boot()`.
    - Line 228: `present: () => host.present()` exposes the unbooted scene immediately to the frame loop.
    - `host.ctx.camera` begins at `(0, 0, 0)` and is never posed by `ChaseCamera.init()`; `lateUpdate` only runs after boot resolves.
    - `booted = true` in `host/index.ts` line 94 is set before `runtime.boot()` resolves, and repeated calls return immediately without awaiting the in-flight boot.
    - Controller import continuation (`src/activities/kart-royale.js:328`) lacks a disposed check.
    - Seat loss check (`controller.js:272`) requires `currentActivity` to match, which clears on participation leave/ejection.
  - `src/main.js`:
    - Lines 131-155: snapshot of renderer state occurs *after* `leasedResize(innerWidth, innerHeight)`.
    - Lines 2055-2070: `activityView.held` presents `lease.present()` directly during the host's frame loop.
- **Related tests located with Ripwire**:
  - `tests/kart-royale-controller.test.js` (controller lifecycle, load failure, seat loss, input neutralization, capture listeners).
  - `tests/kart-royale-cabinet.test.js` (bystander display, occupancy state, no static game imports).
  - `tests/kart-royale-deps.test.js` (dependency range compatibility for three/postprocessing/n8ao/simplex-noise).
  - `tests/arcade-cabinet.test.js` (cabinet instancing and skin registration).
  - `scripts/kart-royale-gate-browser.mjs` (Puppeteer browser entry/race/exit gate).
  - `games/kart-royale/package.json` (`tsc --noEmit && vite build`).
- **Initial test run**:
  - `node --test tests/kart-royale-controller.test.js tests/kart-royale-cabinet.test.js tests/kart-royale-deps.test.js`: 16/16 pass.
  - `npm --prefix games/kart-royale run build`: clean pass (`tsc --noEmit && vite build`).
  - Standalone and host ownership contracts preserved: host owns WebGLRenderer, canvas, and main animation loop; standalone owns its own HTML page and Vite entry.

### Task 1.2 — Performance records instrumentation

- Implemented `src/activities/kartPerf.js`:
  - Opt-in via `?debug=1` or `globalThis.__afterlightKartPerfEnabled = true`.
  - Mark prefix: `afterlight:kart:<generation>:<attemptId>:<phase>`.
  - Bounded ring buffer: last 20 attempts capped.
  - Exports JSON through `window.__afterlight.kartPerformance()`, `window.__afterlight.exportKartPerformance()`, and `window.__kartPerf`.
  - Records environment details (DPR, viewport dimensions, GPU backend, software GPU flag).
  - External decode/WASM labeled explicitly as `N/A` (procedural generation; pure JS simulation).
- Instrumented host points:
  - `src/main.js`: `interaction` span on E dispatch at the cabinet.
  - `src/activities/kart-royale.js`: `controller-import` span around lazy import.
  - `src/activities/kart-royale/controller.js`: `admission` span around server session join; `host-import`, `construct`, `boot` spans; `ready`, `input-ready`, and `first-visible-frame` marks; attempt conclusion with status and duration.
  - `games/kart-royale/src/host/runtime.ts`: `system-wait:<name>` and `system-init:<name>` per phase; `GPU-prepare` around prewarm.
- Added automated test: `tests/kart-royale-perf.test.js` (passes, verifies ring buffer capping and opt-in enablement).

### Task 1.3 — Granular subsystem instrumentation

- Subsystem spans wired in:
  - `render/Materials.ts`: `material-cache-miss:<key>` around procedural material construction in `get()`.
  - `render/Textures.ts`: `textures:build-maps` around texture generation and Sobel normal calculation.
  - `world/Track.ts`: `track:geometry` around procedural heightfield and road mesh construction.
  - `world/Scenery.ts`: `scenery:build` around world sets and dressing.
  - `game/Race.ts`: `race:grid` around starting grid and track-support placement.
  - `kart/Kart.ts`: `race:corner-table` around corner curvature table preparation.
  - `render/Sky.ts`: `sky:pmrem` around environment cube bake and PMREM processing.
  - `core/Prewarm.ts`: separated `gpu-prepare:compile-<surface>` (compiler wall time), `gpu-prepare:shadow-depth` (depth variants), and `gpu-prepare:geometry-upload` (vertex buffers).
- Verification:
  - `npm --prefix games/kart-royale run build`: clean pass (`tsc --noEmit && vite build`).
  - `node --test tests/kart-royale-perf.test.js tests/kart-royale-cabinet.test.js tests/kart-royale-controller.test.js`: 17/17 pass.

### Task 1.4: Defect Reproduction & Classification (Under-Map Frame)
- **Harness execution**: `node scripts/kart-royale-gate-browser.mjs trace`
- **Session ID**: `45c4f484a8751f3cad008a44d9923e80` (Chromium with `--use-gl=angle --use-angle=swiftshader`)
- **Captured filmstrip artifacts**:
  - `01-prompt-at-cabinet.png` (372 KB) — player stands at Orpheum cabinet before pressing E
  - `02-lease-acquired-unposed.png` (1.8 MB) — moment view lease is acquired before boot completes
  - `03-prewarm-booting.png` (1.5 MB) — mid-boot while shaders and geometry upload
  - `04-booted-ready.png` (2.3 MB) — host boot completed and camera posed at track
  - `05-roster-select-live.png` (2.3 MB) — game HUD mounted and roster selection interactive
  - `defect-trace.json` (1.1 KB) — frame-by-frame trace log
- **Defect classification**:
  - **Defect Cause**: **(a) Camera at world origin `(0, 0, 0)` with default rotation `(0, 0, 0)` (`quaternion: [0, 0, 0, 1]`) pointing along default `-Z` under the track plane.**
  - **Mechanism**: In `controller.js`, `acquireTheView()` was invoked *before* `await host.boot()`. The moment the lease is acquired, `main.js` switches rendering to the game scene and camera, calling `host.present()` on every frame. Because `host.ctx.camera` begins at `(0, 0, 0)` and `ChaseCamera.update()` has not run, 18 frames were rendered looking from `(0, 0, 0)` under the track.
  - **Kart spawn timing**: Karts are only initialized later during `Race.init()` halfway through boot (`kartsCount: 0` during the first 18 unposed frames; `kartsCount: 11` once `Race.init` completes).
  - **Verification data**:
    - Unposed frames during lease: `18`
    - First visible pose: `position: [0, 0, 0]`, `quaternion: [0, 0, 0, 1]`, `isOrigin: true`
    - Ready pose (after boot): `position: [-5.67, 9.38, 3.51]`, `quaternion: [-0.116, 0.0005, -0.0035, 0.9932]`, `isOrigin: false`

### Task 1.5: Baseline Network Transfer, Bundle Composition & Three.js Duplication Audit
- **Build command**: `npm run build` (vite v7.3.6, target `es2022`)
- **Bundle composition & chunking breakdown**:
  - **Host initial entry**:
    - `dist/index.html`: 14.67 kB (4.76 kB gzip)
    - `dist/assets/index-QhU5f1yJ.js`: 1,609.67 kB (456.15 kB gzip) — core Afterlight runtime, Three.js instance #1, physics, UI
    - `dist/assets/pipelineCore-ahA2aAvK.js`: 4.24 kB
    - `dist/assets/decode.worker-D595la5n.js`: 16.21 kB
  - **Kart Royale dynamic entry**:
    - `dist/assets/controller-CzNKW9HT.js`: 5.75 kB (2.50 kB gzip) — dynamic controller wrapper
    - `dist/assets/index-dFyO9NCD.js`: 1,784.51 kB (612.63 kB gzip) — Kart Royale game engine, systems, postprocessing, Three.js instance #2
    - `dist/assets/index-CypvppCO.css`: 37.98 kB (9.10 kB gzip) — Kart Royale HUD and overlay styles
    - Total Kart entry transfer (cold): **1,828.24 kB raw (624.23 kB gzip)**
- **Three.js duplication audit**:
  - **Status: CRITICAL DUPLICATION CONFIRMED.**
  - `games/kart-royale` has its own `node_modules/three` package directory separate from root `node_modules/three`.
  - Vite default resolution resolves `three` imports in `games/kart-royale/**` to its nested `node_modules/three`.
  - Consequence: The Kart game chunk `index-dFyO9NCD.js` bundles its own independent copy of Three.js (classes, WebGLRenderer helpers, math structures, revision symbols). It does not import Three symbols from the host chunk.
  - Adding deduplication (`resolve.dedupe: ['three']`) will be addressed in optimization to eliminate ~600 kB of duplicated code from the game chunk.
- **External asset decode & WASM audit**:
  - External 3D models (GLTF/GLB) for Kart Royale: **0 bytes** (100% procedural track, terrain, grandstands, billboard pines, and karts).
  - External audio assets (MP3/OGG/WAV) for Kart Royale: **0 bytes** (100% synthesized Web Audio API nodes).
  - External WASM binaries for Kart Royale: **0 bytes** (100% pure TypeScript/JS).
  - *Accounting exclusion*: Shared arcade cabinet template GLB (`public/arcade/cabinet/afterlight_arcade_cabinet.glb`) and courtyard WASM (`public/wasm/afterlight_realtime.wasm`) belong to the host/theater environment and are not charged to Kart Royale entry.
- **Cache behavior**:
  - Cold load requires 3 HTTP requests (`controller-*.js`, `index-*.js`, `index-*.css`).
  - Warm load: HTTP 304 / memory cache (0 transfer bytes on re-entry within session).

### Task 1.6: Phase Timings, Device Baselines, Arrival Windows & Hotspot Ranking
- **Hardware GPU Baseline (NVIDIA GeForce RTX 2060 SUPER via ANGLE / OpenGL ES 3.2)**:
  - `interaction` dispatch (E press to handler): **1.3 ms**
  - `controller-import` (dynamic import of `controller.js`): **40.8 ms**
  - `admission` (participation request/response round-trip): **31.9 ms**
  - `host-import` (dynamic import & parse of `games/kart-royale/src/host/index.ts` 1.78 MB bundle): **316.4 ms**
  - `construct` (`createKartRoyaleHost` and system instantiations): **208.3 ms**
  - Premature view lease acquisition & first unposed frame presented: **+1.9 ms** after construct (at t = 9088.2 ms)
  - Remaining asynchronous boot systems (`Track`, `Scenery`, `Materials`, `Prewarm`): **~1,500 - 2,000 ms** (rendered with unposed camera at `(0,0,0)`)
- **Software GPU Baseline (SwiftShader)**:
  - Shader compilation & prewarm (`core/Prewarm.ts` via `compileAsync` and shadow passes): **25,000 - 30,000 ms**
  - Unposed frames exposure: **16 - 18 frames** captured during trace before readiness
- **Theater Performance Baseline**:
  - Target framerate: 60 FPS (16.6 ms per frame budget)
  - DOM WebGL Canvases: Exactly 1 WebGL canvas active (verified by browser gate)
- **Memory & Lifecycle**:
  - Current baseline: `host.dispose()` called on every exit, releasing all textures, geometry, and materials.
  - Re-entry triggers 100% rebuild and re-parse from scratch (no warm retention in v1 baseline).
- **Player Arrival Lead Times (Orpheum spawn `(0, 8)` to cabinet `(9.3, -1.8)`, distance ~13.5 units)**:
  - Normal walking (~3.6 units/s): **~3.75 seconds**
  - Sprinting with Shift (~7.2 units/s): **~1.88 seconds**
  - Bunny hopping chain (~10.8 units/s): **~1.25 seconds**
  - Selection / countdown: Roster select is indefinite until Enter; countdown is 3.0s.
  - *Implication*: A proximity trigger at 8-10 units provides ~1.2s to ~2.5s of preparation lead time before player presses E.
- **Measured Hotspot Ranking (highest to lowest cost)**:
  1. **`core/Prewarm.ts`** (shader compileAsync, shadow depth pass, geometry uploads): 50-70% of total boot on hardware GPU, >90% on software rasterizer.
  2. **`host-import`** (evaluating 1.78 MB bundle containing duplicated Three.js): ~316 ms.
  3. **`construct`** (instantiating ~15 systems in `createKartRoyaleHost`): ~208 ms.
  4. **`world/Track.ts`** (`track:geometry` spline generation, extrusions, collision trees): ~150 - 350 ms.
  5. **`world/Scenery.ts`** (`scenery:build` instancing trees, fences, grandstands): ~80 - 150 ms.
  6. **`render/Materials.ts` & `Textures.ts`** (`textures:build-maps` offscreen canvas drawing): ~40 - 80 ms.
  7. **`game/Race.ts` & `kart/Kart.ts`** (`race:grid`, `race:corner-table` lookup generation): ~20 - 45 ms.
  8. **`controller-import` + `admission`**: ~72 ms.





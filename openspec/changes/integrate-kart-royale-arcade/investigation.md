# Investigation — integrate-kart-royale-arcade

Repo state inspected: branch `main` at `38ea82d`, working tree carries unrelated
uncommitted deletions (see §9). All findings below were verified against the
current source by five parallel read-only investigation passes plus targeted
follow-up reads of `src/main.js`, `src/activities/snowboard.js`,
`shared/placeDefinitions.js`.

## DISCOVERED CURRENT INFRASTRUCTURE

### 1. Theater cabinet lineup and manifest data flow

- `shared/placeDefinitions.js` is the single editable manifest (no Three/DOM
  imports). The Theater (`id: 'theater'`) gets `activities:
  ORPHEUM_ALL_ACTIVITIES` (line 922).
- **Five upright cabinets** exist, all built from one canonical GLB
  (`public/arcade/cabinet/afterlight_arcade_cabinet.glb`) by
  `createArcadeCabinet({ activityDef, world, screenSource })` in
  `src/arcade/cabinet.js`:

  | Activity id | type | position / rotY | capacities |
  | --- | --- | --- | --- |
  | `orpheum-pong` | `pong` | `[10.42, 0, -7.95]`, −π/2 | 2 players |
  | `orpheum-rain-runner` | `rain-runner` | `[10.42, 0, -5.9]`, −π/2 | 1 |
  | `orpheum-signal-lost` | `signal-lost` | `[10.42, 0, -3.85]`, −π/2 | 1 |
  | `orpheum-sporefall` | `sporefall` | `[10.42, 0, -1.8]`, −π/2 | 1 |
  | `summit-run` | `snowboard-race` | `[10.42, 0, 2.6]`, −π/2 | 8 riders, own bay |

  Pool/air-hockey/foosball/darts/piano/photo-booth are non-cabinet activities
  (11 Orpheum activities total).
- Cabinet block shape (verbatim `SUMMIT_RUN_CABINET` pattern): `{ model:
  'upright', skin: { title ≤24 chars, tagline, motif, palette{base,ink,accent,glow} },
  led{color,intensity}, controls{player1,player2}, screen{type:'canvas'|'image'|'video'} }`,
  validated by `validateActivityDefinition`. Activity definitions add
  `transform`, `footprint`, `interactionRadius`, `participantAnchors[{slot,
  position, facing, dismount}]`, `capacities`, `environmentPolicy`,
  `spectatorPolicy`, `rendererKey`, `controllerKey` (race types add
  `minPlayers`/`readyPolicy`/`course`).
- `ACTIVITY_TYPES` (lines 43–71) is a frozen 27-entry list; `sporefall` sits at
  line 47. `SPOREFALL_ACTIVITY_DEFINITION` (line 198) occupies the row slot
  this change repurposes; its geometry (`anchor [9.3,0,-1.8]`, dismount
  `[8.55,-1.8]`) is reused verbatim.
- Skin/artwork plumbing: `src/arcade/skins.js` (`normalizeCabinetSkin`,
  `SKIN_CHANNELS`, 13:9 screen composite 1040×720), `src/arcade/artwork.js`
  (`MOTIFS = { pong, rain, signal, spore, summit, afterlight }`,
  `paintSkinChannel`, `skinFileUrl` for optional `public/arcade/games/<id>/`
  files). Contract tests: `tests/arcade-cabinet.test.js`,
  `tests/cabinet-renderer.test.js` (throttler tiers 60/20/10/0 fps, screen
  pipeline budgets, cabinet audio caps).
- `src/world/theaterWorld.js` builds only bay scenery (row studs at
  z ∈ {−7.95, −5.9, −3.85, −1.8}; Summit bay studs at z 0.35..5.25) — repurposing
  in place requires **no** theaterWorld change.
- Projection: `node scripts/export-place-definitions.mjs` →
  `server_elixir/priv/place_definitions.json` (transform/anchors only).

### 2. Activity runtime, participation and the view lease

- `src/activities/registry.js`: `registerActivityModule(type, { initialize })`,
  type must be in `ACTIVITY_TYPES`; modules self-register and are
  side-effect-imported by `src/main.js` (lines 38–63, 26 types).
- `src/activities/runtime.js` `createActivityRuntime({...acquireView,
  releaseView...})`: `activate(seam)`, generation-fenced snapshot/event/result
  routing, `beginParticipationFor(item)` (line 288) calling the module's
  optional `beginParticipation()` **before** the generic join.
- `src/activities/participation.js`: join→joining→participating→leaving state
  machine, anchors/dismounts via `applyAnchor`/`applyDismount`
  (`src/main.js` lines 559–587: snap avatar, clear movement/jump), auto-ready
  for all types except `snowboard-race`.
- **View lease** `src/activities/viewLease.js`:
  `acquireView({ owner, generation, scene, camera, resize, onRelease })`,
  `release(owner)`/`revoke()`, stale-generation and second-owner rejection.
  `src/main.js` (lines 124–169) wires `apply` (swap `renderPass.scene`,
  `activeCamera`, call `leasedResize`, exposure 1.25, `bloom.enabled = false`,
  exit cinema) and `restore` (re-point pass, restore camera seam, restore
  exposure/bloom). The held branch of `frame()` (lines 2023–2033) updates the
  activity **outside** the social pause gate, calls `composer.render()`, skips
  world sim/raycast/HUD, and returns early. **No `present` hook exists today**
  — the lease always renders through the host composer.
- **Camera seam** `src/activities/cameraSeam.js` (older camera-only tier used
  by Pong/Pool); **input seam** `src/activities/inputSeam.js`
  (`createActivityInputManager`, `resolveEscapeAction`/`ESCAPE_TARGETS`);
  `src/activities/resourceCache.js` (`createResourceCache({ idleEvictMs })`,
  refcounted warm cache).
- E routing (`src/main.js interact()`, lines 1430–1459): leased-view exit →
  stand up → leave-if-occupied → `beginParticipationFor` → generic
  `participation.interact`. Escape hierarchy in the keydown handler (lines
  1846–1880); while participating, WASD/arrows/Space/KeyC are preventDefaulted
  and Space is inert (lines 1767–1791).
- **Networking**: activities require the Phoenix transport
  (`net.supportsActivities`, `src/net/client.js`); envelopes
  `ACTIVITY_JOIN/LEAVE/READY/INPUT/RESNAPSHOT/STATE/EVENT/RESULT/ERROR`
  (`shared/protocol.js` lines 175–229); server side
  `server_elixir/lib/afterlight/activities/session_server.ex` (per-type
  `step_simulation` clauses, capacities from the projection, queues, disconnect
  grace, idle reap) + `activities.ex` (Registry/DynamicSupervisor).
  `AFTERLIGHT_SNOWBOARD_ENABLED` gates only the snowboard sim (deploy env →
  `runtime.exs`), not the client bundle. **There is no purely local activity
  path** — every cabinet goes through a Phoenix session.

### 3. Summit Run precedent (canonical vs. specific)

Canonical (reused by this change): lightweight statically-imported bystander
module (`src/activities/snowboard.js`) + lazily dynamic-imported controller
(`snowboard/controller.js`) started from `beginParticipation()` with a
cancellable attempt token; view lease acquisition on seat; capture-phase
window listeners; HUD root appended to `document.body` with scoped `.sbx-*`
classes and chunk-loaded `hud.css`; audio via `createRaceAudio({ mixer,
getContext })` that prefers an injected mixer and closes only a fallback
context (note: the bootstrap currently passes **no** `audioMixer` —
`createSnowboardController` is called without it, so the mixer injection seam
exists and is tested but is not wired); `sessionStorage` reload hint; DNF on
leave/disconnect.

Summit-Run-specific (not generalized): Elixir race simulation, 30 Hz input
heartbeats, explicit R-ready, prediction/interpolation/clock, `course`
manifest block, golden fixtures — none of which Kart Royale v1 needs.

### 4. Host renderer/audio/HUD facts

- `src/main.js` creates ONE `THREE.WebGLRenderer({ canvas: $('world'),
  antialias: true })`, pixel ratio `min(dpr, 1.5)`, PCFSoftShadowMap, ACES
  1.15; composer is **three-addons** `EffectComposer` + `RenderPass` +
  `UnrealBloomPass` (lines 4–6, 96–102) — a different package lineage than
  Kart Royale's `postprocessing` composer.
- Audio: `createAudioMixer` / `createEnvironmentAudio` (lines 235–240), one
  lazily-created AudioContext behind the Sound gesture; buses
  `{master, environment, ambience, weather, effects}`; no per-activity bus or
  ducking; `createCabinetAudio` connects into `effects` when a mixer exists.
- No activity DOM overlay root and no activity body class exist (only
  `body.theater-watching` for cinema and `body[data-hud-context]` place
  policy); no `webglcontextlost` handling anywhere in root `src/`/`shared/`.
- Root debug hooks: `window.__afterlight` behind `?debug=1` (`player/facing/
  room/participation/activity/sim/paused/netState/tp/project`).

### 5. Kart Royale runtime map (`games/kart-royale`, ~65k lines TS, 49 files)

- **Entry/bootstrap**: `index.html` (`#app`, `#ui`, `#boot`) → `src/main.ts`:
  constructs 13 systems at module scope (`pipeline` (RenderPipeline), `input`,
  `sky`, `materials`, `track`, `scenery`, `effects`, `items`, `race`,
  `camera` (ChaseCamera), `hud`, `audio`, `drawBudget`), builds the single
  `Ctx` (one `THREE.Scene`, one `PerspectiveCamera(62, …, 0.2, 3000)`),
  `boot()` inits systems one per rAF with a progress bar, then
  `installFeel/ installResizeListeners/ installContextRecovery/ resize/
  prewarm/ Recorder.install()` and `requestAnimationFrame(frame)`.
- **Renderer/RAF**: `RenderPipeline.createRenderer()` in `src/render/Renderer.ts`
  creates the WebGLRenderer, appends its canvas to `#app`, publishes
  `(globalThis).__render`; the `postprocessing` `EffectComposer` (HalfFloat →
  8-bit fallback ladder, then direct/override-material rungs) is built in
  `Renderer.ts` with passes from `src/render/PostFX.ts` (N8AO → DoF+bloom →
  grade/motion-blur/CA/vignette/SMAA). `frame()` in `main.ts` re-arms
  `requestAnimationFrame` as its **first statement** — unstoppable; no
  `cancelAnimationFrame` anywhere; `dispose()` methods exist across 23 files
  but **nothing ever calls them**.
- **Input**: `src/core/Input.ts` — window keydown/keyup/blur/gamepad
  listeners + `SWALLOW` preventDefaults + never-removed anonymous gesture
  blockers; key map: WASD/arrows steer+throttle, Shift drift, Space/Enter/
  **KeyE**/Ctrl item, Q look-back, Escape/P pause; gamepad analogue;
  `TouchControls` (`src/core/TouchControls.ts`) mounts `.tc-root` +
  `#tc-style` and sets `<html data-*>` attributes (thorough `unmount()`).
- **Audio**: `src/audio/Audio.ts` + `Synth.ts` — gesture-gated
  `AudioContext` (`Synth(volume, external)` already accepts an external
  context), full synth bus graph, `dispose()` currently closes the context
  unconditionally.
- **HUD/menus**: `src/ui/HUD.ts` hosts on `#ui || document.body`, builds the
  `.kr` tree (lap plate, timer, position, item box, speedo, countdown,
  minimap); `src/ui/Menus.ts` — title/select/pause/results screens;
  `RaceState { Menu, Countdown, Racing, Finished, Results, Paused }`.
- **Race lifecycle**: `src/game/Race.ts` — 8 karts (1 player + 7 AI,
  `src/game/AI.ts` solved racing line), 3 laps, 32 checkpoints, rocket-start
  windows, OOB/stuck watchdogs, `Race.reset() === start()` re-arms countdown
  reusing karts/AI/track (built once in `init`); items in
  `src/game/Items.ts`/`Projectiles.ts`; one deterministic seeded course
  ("Sunset Bay", `mulberry32(1907240611)` in `src/world/TrackLayout.ts`).
- **Quality**: `src/core/Settings.ts` (`profileDevice` + one-shot WebGL2 GL
  probe, `detectQuality`, presets, pixel/texture budgets, `?quality=`/`?scale=`
  overrides), adaptive `SCALE_RUNGS` ladder in `main.ts`, `src/core/Prewarm.ts`
  shader warmup; context-loss ladder + recovery in `Renderer.ts` (proven by
  `tools/context-loss-test.mjs`).
- **Globals**: `__ctx`, `__render`, `__gameReady`, `__loopHealth`, `__freeze`,
  `__feel`, `__camMode`, `__drawBudget`, `__frameWatch`, `__gl()`; a patched
  `console.error` (`Diagnostics`); `Recorder` binds keydown 'R'.
- **Build**: own `package.json` (name `kart-game`; deps `three ^0.185.1`,
  `postprocessing ^6.39.3`, `n8ao ^2.0.0`, `simplex-noise ^4.0.3`; devDeps
  `@types/three`, `puppeteer`, `typescript ^7`, `vite ^8`), own lockfile,
  **node_modules not installed** in this checkout; `vite.config.ts` minimal
  (`build.target 'es2022'`); `npm run build` = `tsc --noEmit && vite build`
  is the shipped gate; `test` is a stub.
- **Tools** (`games/kart-royale/tools/`): `vite-server.mjs` lifecycle +
  `shot.mjs`, `autoplay.mjs` (full-race outcome gate), `drift-bench.mjs`,
  `fps-bench.mjs`, `fill-probe.mjs`, `hitch-check.mjs`, `tear-hunt.mjs`,
  `mobile-soak.mjs` (budgets: 80 MB textures, 40 MB/min heap, 350 MB peak, 0
  context losses), `context-loss-test.mjs`, `camera-probe*.mjs`,
  `lap-frame.mjs`, `ai-health.mjs`, `steer-test.mjs`, `select-test.mjs`,
  `idle-test.mjs`, `touch-*.mjs`, `controls-*.mjs`, `perf*.mjs`,
  `tex-probe.mjs` — all run via `node tools/<name>.mjs` against a
  self-spawned vite server; none are npm-scripted.

### 6. Build/dependency mismatch analysis

- Root: `three ^0.180.0` (installed 0.180.0), vite 7 (a dependency), **no**
  `postprocessing`/`n8ao`/`simplex-noise`; no workspaces; TS only transitive
  (5.9.3 via vercel); root `vite.config.js` is 3 lines (worker format) —
  no aliases/manualChunks; lazy chunks come purely from dynamic `import()`
  (proven snowboard chunks in `dist/assets/`).
- Kart Royale declares three **0.185.x** + the three missing libs → importing
  game source into the root build fails today until root installs them and
  aligns three (see D3/D9). One shared Three instance from root's
  `node_modules` once aligned; kart's own lockfile/dev server stay separate
  for standalone.
- `.vercelignore` does **not** exclude `games/`; Vercel builds the frontend
  from root (`vite build`); the Phoenix container never builds the frontend.
- No precedent imports from `games/` into `src/` today (the only hit is
  `skinFileUrl`'s public-asset URL scheme). The snowboard precedent is a
  source port into `src/activities/snowboard/` + `shared/snowboard/` with the
  design mandate "no iframe, second renderer, socket or animation loop" —
  this change follows that mandate but keeps the game's single source in
  `games/kart-royale` instead of copying it (the user's reuse requirement).

### 7. Testing infrastructure

- Root: `npm test` = `node --test tests/**` (~120 files). Relevant contracts:
  `arcade-cabinet.test.js`, `cabinet-renderer.test.js`,
  `activity-definitions/-runtime/-participation/-protocol/-session-bind`,
  `orpheum-arcade.test.js`, `nearby-activities.test.js`, `p1..p4-gate.test.js`
  (p1 test 2 = the 20-cycle travel/camera/world-group cleanup audit),
  `snowboard-cabinet.test.js` (bystander economy + static-import audit +
  single-dynamic-import rule), `snowboard-controller/-host-view/-audio` etc.
- Browser gates: `scripts/snowboard-gate-browser.mjs` (two chromedriver
  sessions, entry/race/rematch/exit phases, movement-restored assertion) and
  `scripts/p2-gate-browser.mjs`; they need chromedriver + a running app with
  `?debug=1`. Load tooling (`tools/load_client`) assumes the full stack.
- No root `webglcontextlost` handling; kart's context-loss recovery is
  standalone-proven only.

### 8. Relevant existing OpenSpec decisions

- `add-place-activities-program` (unarchived, 71/78): manifest-driven
  activities, `orpheum-arcade` capability requiring Pong + "three original
  games", 16-activities-per-place cap, CanvasTexture screens (focus 20 Hz /
  attract 10 Hz / hidden none).
- `add-multiplayer-snowboard-arcade` (unarchived, 42/47) +
  `integrate-ssxtricky-snowboard` (23/23, unarchived): the view-lease decision
  record (D1), lazy controller + attempt tokens, resource cache, lease-based
  renderer borrowing, "no iframe/second runtime", audio injection contract,
  generation fencing. Archive-time reconciliation is an explicit unchecked
  task there — this change must not disrupt it.
- `fix-pool-cue-sensitivity` precedent: cannot `MODIFIED`-delta an unarchived
  capability → new capability + supersession notice (adopted here).

## PROPOSED NEW INFRASTRUCTURE (does not exist yet)

Everything below is introduced by this change (details in `design.md`):

- `KART_ROYALE_ACTIVITY_DEFINITION` + `'kart-royale'` activity type;
  Sporefall definition goes dormant (kept in the manifest file).
- `src/activities/kart-royale.js` (bystander module) and
  `src/activities/kart-royale/controller.js` (lazy controller).
- `games/kart-royale/src/host/{runtime,index,types}.ts` host adapter +
  standalone-shell refactor of `src/main.ts`; externalRenderer mode in
  `RenderPipeline`; detachable `Input`; external-context `Synth`; explicit
  HUD host; injected `Settings` params.
- Optional `present` field on the view lease payload + the held-branch
  `lease.present ?? composer.render()` dispatch in `src/main.js`.
- Generalized renderer-state snapshot/restore around the lease; lease-carried
  exposure override; `audioMixer` in the activity initialize context.
- `'kart'` artwork motif; `body.kr-racing` presentation rule.
- Admission-only `"kart-royale"` clause in the Phoenix SessionServer.
- New tests (`kart-royale-cabinet/-controller/-host`, deps sync) and
  `scripts/kart-royale-gate-browser.mjs`; adapted soak budgets.
- Root dependency changes: `three ^0.185.1`, `postprocessing`, `n8ao`,
  `simplex-noise`; `build.target 'es2022'`.

## 9. Compatibility with current work

- `git status` shows uncommitted deletions of `downhill-mayhem/`,
  `operation-ironhold/`, `turbo-kart-rush` at the repo root — the in-progress
  move of those games into `games/` (committed as `1da1c79`/`38ea82d`). This
  change does not touch them; implementation must not commit or revert those
  paths incidentally.
- `games/kart-royale` itself is committed (`38ea82d`) and unmodified.
- Overlapping unarchived OpenSpec changes: `add-place-activities-program`
  (supersession recorded), `add-multiplayer-snowboard-arcade` /
  `integrate-ssxtricky-snowboard` (infrastructure extended additively; their
  archive reconciliation unaffected), `fix-pool-cue-sensitivity` (no overlap).
- No `kart` references exist anywhere in `src/`, `shared/`, or
  `server_elixir/lib/` today — no naming collisions to reconcile.
- The empty `openspec/changes/integrate-kart-royale-arcade/` scaffold
  (`.openspec.yaml` only) was created by this planning session.

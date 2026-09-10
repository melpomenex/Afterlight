## 1. Contracts and build boundary (no client behavior change)

Prerequisite for every later phase; must land green on its own.

- [x] 1.1 Bump root `three` to `^0.185.1` in `package.json` / `package-lock.json` (`npm install`), add `postprocessing@^6.39.3`, `n8ao@^2.0.0`, `simplex-noise@^4.0.3` as root dependencies.
- [x] 1.2 Set `build: { target: 'es2022' }` in root `vite.config.js` (matches `games/kart-royale/vite.config.ts`).
- [x] 1.3 Run the full host verification on the bumped tree: `npm test`, `npm run build`, and a dev-server visual smoke of the courtyard + Theater; fix any three r180→r185 fallout before proceeding.
- [x] 1.4 Add `tests/kart-royale-deps.test.js`: assert root `package.json` declares the same `three`/`postprocessing`/`n8ao`/`simplex-noise` version ranges as `games/kart-royale/package.json` (fail with a named diff on drift).
- [x] 1.5 Define the host interface contract file `games/kart-royale/src/host/types.ts` (options/result shapes from design D2) so Phases 2–4 compile against one boundary.

## 2. Cabinet declaration and art

Can proceed in parallel with Phase 3 after Phase 1.

- [x] 2.1 In `shared/placeDefinitions.js`: add `'kart-royale'` to `ACTIVITY_TYPES`; add `KART_ROYALE_CABINET` + `KART_ROYALE_ACTIVITY_DEFINITION` (design D1 block, at Sporefall's transform/anchor geometry); replace the `SPOREFALL_ACTIVITY_DEFINITION` entry in `ORPHEUM_ACTIVITIES` with the new definition, keeping `SPOREFALL_ACTIVITY_DEFINITION` exported and dormant.
- [x] 2.2 Regenerate the server projection: `node scripts/export-place-definitions.mjs` (committed `server_elixir/priv/place_definitions.json`); confirm `--check` clean.
- [x] 2.3 Add the `'kart'` motif painter to `src/arcade/artwork.js` `MOTIFS` (checkered strip, kart silhouette, drift sparks, speed lines, golden-hour palette per design D1).
- [x] 2.4 Update `tests/arcade-cabinet.test.js`: five machines with Kart Royale replacing Sporefall — skin normalization, LED distinctness, motif uniqueness, anchor/dismount clearance at the reused coordinates; update `tests/activity-definitions.test.js` and any place/world tests that enumerate Orpheum activities.
- [x] 2.5 Update `src/ui/activityDiscovery.js` `labelForType` with the `'kart-royale'` label; check `tests/nearby-activities.test.js` / `tests/orpheum-arcade.test.js` enumerations.

## 3. Kart Royale runtime adaptation (inside `games/kart-royale`)

Standalone behavior must stay identical; the standalone harness suite gates every step.

- [ ] 3.1 Extract `src/host/runtime.ts` from `src/main.ts`: systems construction (same documented order), the `Ctx` build, the boot sequence (per-system init with progress callback), the adaptive-scale ladder (`SCALE_RUNGS` accounting), update/lateUpdate stepping, `resize`, and pause/reset plumbing — with no module-scope singletons and no RAF.
- [ ] 3.2 Refactor `src/main.ts` into a thin standalone shell: own renderer path, own RAF re-arm, `#app`/`#ui`/`#boot` DOM, `installContextRecovery`, `installFeel`, `Diagnostics` console wrap, `Recorder`, `window.__*` hooks, `?quality=`-style param reads — all standalone-only, delegating to `createKartRoyaleRuntime`.
- [ ] 3.3 `src/render/Renderer.ts` `RenderPipeline`: accept `externalRenderer` — skip `createRenderer()`/canvas append/context-loss listener ownership; keep the composer fallback ladder and `present()` against the injected renderer; expose the pixel-ratio/size policy for lease use.
- [ ] 3.4 `src/core/Input.ts`: split listener installation from handling — `attach(target)`/`detach()` plus public `handleKeyDown`/`handleKeyUp`/`neutralize`; fix `blockPageGestures` removal (or fence it standalone-only per design D5); keep the key map unchanged (item still includes KeyE).
- [ ] 3.5 `src/audio/Audio.ts` + `src/audio/Synth.ts`: accept `{ context, destination }`; add `ownsContext` so `dispose()` never closes an injected context; gate `syncSuspend` to muting the master gain when the context is external.
- [ ] 3.6 `src/ui/HUD.ts`: honor an explicit `hudHost` element before the `#ui || document.body` fallback; audit `ui.css` + `TouchControls` embedded CSS for non-scoped selectors and scope/fence any that would style the host page.
- [ ] 3.7 `src/core/Settings.ts`: accept injected quality/feature params; hosted mode must not read `location.search`; keep `?quality=`/`?scale=` standalone overrides working.
- [ ] 3.8 Implement `src/host/index.ts` `createKartRoyaleHost(options)` per design D2 (ready promise with boot progress, update/present/resize, input routing, race pass-throughs, `startScreen: 'select'`, `setMuted`, `dispose` walking every system's `dispose()` including `Materials` singleton reset and PMREM env teardown).
- [ ] 3.9 Standalone harness gate after the refactor: `node tools/autoplay.mjs`, `node tools/drift-bench.mjs`, `node tools/shot.mjs`, `node tools/context-loss-test.mjs` all pass; `npm run build` (`tsc --noEmit && vite build`) passes; `npm run dev` boots the standalone shell.

## 4. Afterlight activity integration

Depends on Phases 1–3.

- [x] 4.1 Create `src/activities/kart-royale.js` bystander module (Summit Run pattern): `registerActivityModule('kart-royale', …)`, `createArcadeCabinet({ activityDef, world, screenSource })` at the manifest transform, attract/occupied canvas painter (13:9 composite, "KART ROYALE" + "PRESS E TO RACE", occupied state from `audience:'summary'` snapshots), `beginParticipation()` with attempt-token dynamic import of `./kart-royale/controller.js`, idempotent `dispose()`.
- [x] 4.2 Create `src/activities/kart-royale/controller.js`: loading toast + cancellable import of `games/kart-royale/src/host/index.ts` via the resource cache; `participation.join`; on seat + `host.ready` → `acquireView({ owner, generation, scene, camera, resize, present, onRelease })`; capture-phase input wiring (D5); HUD host root + `body.kr-racing`; `exit(reason)` funnel (pause-leave, results-arcade, travel, ejection, context loss, exceptions); warm-cache retain/evict via `src/activities/resourceCache.js`.
- [x] 4.3 Extend `src/activities/viewLease.js` with the optional `present` payload field (pure data, no lessee behavior change); thread `lease.present ?? composer.render()` through the held branch of `frame()` in `src/main.js`.
- [x] 4.4 Generalize the lease renderer-state handling in `src/main.js` (`apply`/`restore`): snapshot/restore `{ toneMappingExposure, toneMapping, outputColorSpace, shadowMap.enabled, shadowMap.type, pixelRatio, size }`; lease-carried exposure override (snowboard keeps 1.25, kart passes 1.05); re-assert host sizing on restore.
- [x] 4.5 Thread `audioMixer` into the activity module initialize context (`createActivityRuntime` in `src/activities/runtime.js` + `src/main.js` wiring) and hand it to the kart controller (design D7); keep it optional so snowboard behavior is unchanged.
- [x] 4.6 Add the `body.kr-racing` rule to `src/style.css` (theater-watching element set minus chat suppression); ensure removal via the lease `onRelease` hook.
- [x] 4.7 Phoenix admission clause: in `server_elixir/lib/afterlight/activities/session_server.ex` add the `"kart-royale"` policy — seat/queue/anchor/disconnect-grace/idle-reap from capacities, no authoritative sim tick, occupancy snapshots on change, no input-watchdog ejection; run the Elixir test suite.
- [x] 4.8 Wire the static import into `src/main.js` activities import block; verify `interact()` routing (`beginParticipationFor` → join) and Escape handling (`resolveEscapeAction` ACTIVITY target) behave per design D4/D5.

## 5. Input, UI and audio polish

Depends on Phase 4; can interleave with Phase 6.

- [x] 5.1 Verify and test the E-key contract: while the lease is held, E is consumed by the game (capture-phase) as item-fire and never reaches `interact()`; during loading, E/Escape cancel cleanly; document the mapping in `README.md`.
- [x] 5.2 Pause/exit UX: pause menu "Leave cabinet" and results "Back to the arcade" actions call `exit('exit')`; blur → `race.setPaused(true)` + `input.neutralize()`; Escape on pause resumes (native behavior preserved).
- [x] 5.3 Touch path: `TouchControls` mount/unmount around the session on coarse-pointer devices; `html[data-*]` attributes and `#tc-style` removed on exit; no `blockPageGestures` listeners when hosted.
- [x] 5.4 Audio behaviors: race audio starts after the E gesture; host Sound toggle governs when the mixer exists; fallback context created/closed only when no mixer; visibility mutes rather than suspends an external context.

## 6. Performance and resource work

- [x] 6.1 Confirm world suspension while racing: no world sim/raycast/minimap/HUD updates in the held branch; other cabinets under `createVisibilityThrottler` tiers; theater screen quad suppressed.
- [ ] 6.2 Warm-cache policy: idle eviction window (~60 s) configurable; eviction disposes the host fully (systems dispose, `Materials` singleton reset, PMREM/texture budget freed); second entry within the window skips world rebuild (< 1 s measured).
- [ ] 6.3 Renderer-state restore audit: after exit, `toneMapping`/exposure/color space/shadow config/pixel ratio/size match pre-entry exactly (assert in the controller test with a stub renderer).
- [x] 6.4 Record the grown lazy chunk size and build-time delta in the change folder evidence; do not silence the >500 kB warning.

## 7. Verification, docs and regression

Depends on all prior phases.

- [x] 7.1 `tests/kart-royale-cabinet.test.js`: bystander economy (registration, display states from summaries, idempotent dispose leaves `world.group` empty, static-import audit — no static game imports, exactly one dynamic import site).
- [x] 7.2 `tests/kart-royale-controller.test.js`: attempt-token stale-load discard; lease generation binding; listener unsubscribe asserted after dispose; exit funnel (travel/ejection/context-loss paths); N-cycle enter/exit with camera/world-group/instance zeroing (p1-gate 20-cycle pattern).
- [ ] 7.3 `tests/kart-royale-host.test.js`: host contract with a stubbed renderer/context — update drives systems with no RAF, present routes through the pipeline, external audio context never closed, injected params respected, `startScreen` honored.
- [x] 7.4 `scripts/kart-royale-gate-browser.mjs`: chromedriver gate (entry / race / pause-exit / movement-restored / reentry / second-session occupancy) modeled on `scripts/snowboard-gate-browser.mjs`; run and record results.
- [x] 7.5 Re-run standalone harnesses post-integration (autoplay, drift-bench, shot, context-loss) plus root `npm test` and `npm run build`; spot-run the snowboard browser gate.
- [ ] 7.6 Soak/budgets: repeated-session heap + texture soak with committed budgets (0 context losses; ≤ 40 MB/min sustained growth; post-exit + eviction memory back to baseline ±10%); record evidence in the change folder.
- [ ] 7.7 Manual playtest per AGENTS.md smoke checklist: discovery, full race, rematch, both exit paths, queue as second player, travel mid-race, reload after race, audio on/off.
- [x] 7.8 Docs: `README.md` (Kart Royale cabinet, controls incl. E-as-item and exit paths), `docs/arcade.md` (kart motif, repurposing note, context-loss stance), `AGENTS.md` repository-map row for the new activity modules.

## 8. Final acceptance criteria

- [x] 8.1 A current Theater cabinet is visibly Kart Royale themed; cabinet count is five; Theater layout unchanged.
- [x] 8.2 E at the cabinet launches the real game through the canonical activity path; no iframe, no page navigation, no second WebGL canvas/renderer/RAF.
- [x] 8.3 The race uses the existing course, physics, AI field, items, HUD, audio and quality tiers; controls match standalone except the documented host mappings.
- [x] 8.4 Theater locomotion/input/HUD/audio are suspended during the race and fully restored after every exit path; renderer state is byte-for-byte the pre-entry policy.
- [x] 8.5 Other cabinets and activities (Pong, Rain Runner, Signal Lost, Summit Run, pool, tables) regress nothing.
- [x] 8.6 Game code is lazy-loaded; bystanders download only cabinet metadata/artwork; repeated sessions leak no listeners/DOM/audio/GPU/heap growth beyond budgets.
- [ ] 8.7 Cancellation, failure, travel, disconnect and context-loss paths all return safely to a functional Theater with bounded messages.
- [ ] 8.8 Standalone Kart Royale development and harnesses still work from `games/kart-royale`.

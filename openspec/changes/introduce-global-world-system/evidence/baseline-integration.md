# Integration Baseline and Boundaries

**Date:** 2026-09-13
**Git Commit:** e3570b8 (HEAD -> main, origin/main, origin/HEAD) `build: refresh production assets for random world entry`
**Branch:** main

## Current Working Tree Status

Working tree contains pre-existing uncommitted changes from another active change:
- `openspec/changes/add-kart-royale-loading-indicator/` (untracked)
- `src/activities/kartRoyaleLoadingState.js` (untracked)
- `tests/kart-royale-loading-state.test.js` (untracked)
- `src/activities/kart-royale.js` (modified: loading card DOM, loadingSession, presentationTerminal)
- `src/activities/kart-royale/controller.js` (modified: `onBootPhase`, `notifyPresentationLive` parameters and callbacks)

## Overlapping Subsystems Recheck

1. **Kart Royale Loading / Preparation:**
   - The changes in `src/activities/kart-royale.js` and `src/activities/kart-royale/controller.js` introduce entry-phase reporting (`modules` -> `host` -> `graphics` -> `grid`) and loading card DOM.
   - Any modifications to `src/activities/kart-royale/controller.js` for the World system (e.g. passing world presentation profile to the host runtime) must preserve these callbacks (`onBootPhase`, `notifyPresentationLive`) and not conflict with or overwrite the loading session mechanics.
   - `games/kart-royale/` is clean at `e3570b8`.

2. **Downhill Mayhem:**
   - `src/activities/downhill.js`, `src/activities/downhill/`, and `games/downhill-mayhem/` are clean at `e3570b8`.
   - Integration will add optional ambient presentation hooks without altering course simulation or network protocols.

3. **Floating Media:**
   - `src/activities/mediaPresentation.js`, `src/ui/floatingMedia.js`, `src/ui/floatingMediaLayout.js`, `src/ui/floatingMediaReservations.js`, `src/ui/mediaPresentationState.js` are clean at `e3570b8`.
   - World switching must preserve floating media lease and presentation surface without dispatching room-level media events.

4. **Theater and Districts:**
   - `src/world/theaterWorld.js`, `src/districts.js`, `shared/placeDefinitions.js` are clean at `e3570b8`.

## Owned Files for `introduce-global-world-system`

- **Shared / Models:**
  - `shared/worldDefinitions.js` (NEW)
  - `shared/theaterEnvironments.js` (compatibility exports)
- **Environments / World Presentation:**
  - `src/environments/quality.js` (v2 preference migration & persistence)
  - `src/environments/runtime.js` (bind to world state)
  - `src/worlds/` (NEW: `state.js`, `registry.js`, `resolver.js`, `host.js`, `presentationSample.js`, `assets.js`)
- **Places & Activities Registration:**
  - `src/places/registry.js` (`worldSupport` metadata)
  - `src/activities/registry.js` (`worldSupport` metadata)
  - `src/activities/resourceCache.js` (ownership, idempotence, dedup, eviction)
- **Atmosphere & Main Coordination:**
  - `src/atmosphere/controller.js` (sample visual presentation from personal world)
  - `src/main.js` (worldState initialization, HUD world selector integration)
  - `src/audio/environmentAudio.js` (single active world ambience)
- **UI:**
  - `src/ui/worldSelector.js`, `src/style.css`, `index.html` (Choose your World dialog)
- **Game Adapters:**
  - `games/kart-royale/src/host/{types,index,runtime}.ts`, `render/{Atmosphere,Sky}.ts`, `world/Scenery.ts`
  - `src/activities/kart-royale/controller.js` (carefully merged with loading indicator)
  - `src/activities/snowboard/scene.js`, `src/activities/snowboard/controller.js`
  - `src/activities/downhill/scene.js`, `games/downhill-mayhem/src/host/runtime.js`, `game/rendering.js`
- **Tests & Documentation:**
  - `tests/world-*.test.js`
  - `scripts/world-inheritance-gate-browser.mjs`
  - `README.md`, `AGENTS.md`, `docs/theater-environments.md`, `docs/worlds.md`

## Verification of Non-Interference
- All existing tests pass (`npm test`: 1559 passing).
- `npm run build` succeeds.
- No files from `openspec/changes/add-kart-royale-loading-indicator/` or uncommitted loading indicator changes will be discarded or overwritten.

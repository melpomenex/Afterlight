# Integrated Policy Matrix for Parent Table Games and Retro/Dormant Games

**Captured At:** 2026-09-13T15:55:00.000Z
**Change:** `introduce-global-world-system` (Task 7.6)

## 1. Matrix Overview

The global world system classifies all interactive activities into strict view policies:
- **Hosted Games (`kart-royale`, `snowboard-race`, `downhill-mayhem`):** Declare dedicated view leases and custom presentation adapters (partial or ambient) that adapt sky, lighting, or distant scenery without altering track geometry, physics, or simulation determinism.
- **Parent Table Games (`pool`, `billiards`, `air-hockey`, `foosball`, `darts`, `piano`, `photo-booth`):** Inherit the parent theater's surrounding world group.
  - Policy: `mode: 'full'`, `host: 'parent'`, `slots: []`, `adapterKey: null`.
  - Resolution: `inheritedFromParent: true`, `atmosphere: null`, `audioProfile: null`.
  - Invariance: Table 3D meshes, collision footprints, participant anchors, dismount targets, and ball/puck simulation are 100% unaltered. No duplicate environment meshes, no duplicate audio sources, and no secondary atmosphere hosts are created.
- **Retro / Dormant Games (`pong`, `rain-runner`, `signal-lost`, `sporefall`):** Render native 2D game pixels on canvas/cabinet surfaces.
  - Policy: `mode: 'none'`, `host: 'parent'`, `slots: []`, `adapterKey: null`.
  - Resolution: `inheritedFromParent: true`, `atmosphere: null`, `audioProfile: null`.
  - Invariance: Native canvas rendering, CRT scanlines, and retro simulation loops are preserved byte-for-byte. Surrounding world identity is visible outside the cabinet frame without corrupting in-game graphics.
- **In-Place Place Activities (e.g. `gutter-boats`, `chess`, `curling`, `fishing`, `telescope`, etc.):** Inherit district ambient lighting and audio.
  - Policy: `mode: 'ambient'`, `host: 'parent'`, `slots: []`.

## 2. Activity Placement and Manifest Status

The Orpheum manifest is deep-frozen in `shared/placeDefinitions.js`:
- Active floor activities (`ORPHEUM_ACTIVITIES`):
  1. `orpheum-pong` (`pong`)
  2. `orpheum-rain-runner` (`rain-runner`)
  3. `orpheum-downhill-mayhem` (`downhill-mayhem`)
  4. `orpheum-kart-royale` (`kart-royale`)
  5. `summit-run` (`snowboard-race`)
- Full catalog activities (`ORPHEUM_ALL_ACTIVITIES`):
  - All 5 active floor machines above
  - `orpheum-pool` (`pool`)
  - `orpheum-air-hockey` (`air-hockey`)
  - `orpheum-foosball` (`foosball`)
  - `orpheum-darts` (`darts`)
  - `orpheum-piano` (`piano`)
  - `orpheum-photo-booth` (`photo-booth`)
- Dormant status:
  - `orpheum-signal-lost` (`signal-lost`): Kept registered and valid in activity type definitions, but unplaced on the active Orpheum floor (slot occupied by Downhill Mayhem).

## 3. Verification

Verified via automated test suites:
- `tests/table-games-world-matrix.test.js`:
  - `parent table games inherit surrounding world identity without altering table geometry or creating secondary hosts` (PASS)
  - `retro and dormant games declare mode none and inherit parent host without altering game pixels` (PASS)
  - `unplaced and placed activity manifest status is preserved` (PASS)
- `tests/world-parent-activities.test.js`:
  - `table games declare full mode and parent host with empty slots` (PASS)
  - `retro arcade games declare none mode and parent host with empty slots` (PASS)
  - `all in-place activities declare ambient mode and parent host with empty slots` (PASS)

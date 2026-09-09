## Why

The user expects the game already present in `SSXTricky/`, but Summit Run currently implements a different, sparse night mountain with robot riders. Fixing its black terrain and loading handshake does not satisfy that intent: the actual Alpine Rush course, riders, movement, jumps, tricks and arcade presentation must be the basis of the cabinet game.

## What Changes

- Port the actual `SSXTricky/lib/game/engine.js` and `rules.mjs` experience into the existing Afterlight activity integration: daylight alpine scenery, broad snow banks, peaks, trees, chairlift, banners, ramps, cyan speed lanes, pickups, snowboard riders, camera, particles and trick feedback.
- Preserve carving, tuck/lean, charge jumps, ramp launches, boost, Q/E/X tricks, combos and bails from the source game. Cosmetic resemblance alone is insufficient.
- Retain the existing 2–8 human shared race, Phoenix authority, cabinet membership, chat, results/rematch and safe exit. Multiplayer remains the working scope assumption; original AI opponents and Free Ride are deferred, not silently substituted for human multiplayer.
- Extract host-driven lifecycle and rendering seams; do not embed a Next.js app, iframe, second renderer, socket or animation loop.
- Version the course and simulation contract to match Alpine Rush, with deterministic client/server parity and server-owned scores, pickups and boosts.
- Add source-versus-integrated visual and gameplay acceptance evidence. Black-screen repairs and green protocol tests alone are explicitly insufficient.

## Capabilities

### New Capabilities

- `ssxtricky-integration`: source-game fidelity, authoritative gameplay adaptation, host lifecycle, compatibility and verification.

### Modified Capabilities

None in archived base specs. This change explicitly supersedes the original-night-mountain, robot-rider and reference-only decisions in the unarchived `add-multiplayer-snowboard-arcade` change. Implementation must reconcile its overlapping proposal/design/specs/tasks before either change is archived. Shared race and activity lifecycle contracts remain dependencies.

## Impact

Affected: `SSXTricky/lib/game/engine.js`, `SSXTricky/lib/game/rules.mjs`, `SSXTricky/app/page.tsx`, `SSXTricky/app/globals.css` as source; production `src/activities/snowboard*`, shared snowboard model/course, Phoenix snowboard simulation/presentation, activity protocol, HUD and tests. No Next.js/React runtime dependency is required in Afterlight. Existing generated course hash, protocol capability and simulation version need coordinated rollout. Preserve unrelated working-tree changes and original data snapshots.

Planning only. No deployment or implementation is authorized by this proposal request.

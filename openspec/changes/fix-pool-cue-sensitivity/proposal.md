## Why

Moving the mouse to aim the pool cue in the Orpheum billiards lounge is unusably twitchy: the cue jerks around far too fast with small pointer motion, making fine aim impossible and the game feel broken.

## What Changes

- Add smoothed, sensitivity-bounded mouse aim for the pool cue so small pointer movements produce small, predictable angle changes instead of instant 1:1 jumps.
- Guard the aim singularity near the cue ball (ignore/attenuate aim updates when the pointer ray lands within a small radius of the cue ball) so jitter near the ball no longer whips the cue around.
- Keep keyboard (A/D), touch-drag, and gamepad aim behavior unchanged in capability terms; only the mouse pointer-move path gains damping/slew-limiting.
- Add regression coverage for mouse-aim stability (small pointer deltas stay bounded; near-ball jitter does not swing the angle).

## Capabilities

### New Capabilities
- `pool-cue-control`: Stable, controllable pool-cue mouse aiming — bounded sensitivity, near-ball dead zone, and frame-rate-independent smoothing for the cue aim angle.

### Modified Capabilities
<!-- None — `social-billiards` (aim/spin/credible motion) lives in the in-progress `add-place-activities-program` change and is not yet merged under `openspec/specs/`, so this change carries its aim-stability requirements as a new `pool-cue-control` delta. -->

## Impact

- `src/activities/pool/controller.js`: mouse pointer-move aim path (`onTablePointerMove` / `aimAtWorldPoint` / `aimAngle` update, `update()` keyboard/gamepad paths untouched in behavior).
- `src/activities/pool.js` / `src/activities/pool/tableScene.js`: no contract change (still consumes `controller.aimAngle`); cue/aim-guide rendering inherits stability.
- `tests/`: new unit coverage for aim-angle stability (e.g. `tests/pool-aim.test.js` or extension of existing pool controller coverage).

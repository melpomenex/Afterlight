## 1. Reproduce and characterize

- [x] 1.1 Confirm current mouse-aim path sets `aimAngle` directly from `atan2` on every pointermove with no smoothing or near-ball guard.
- [x] 1.2 Document baseline failure cases: small pointer jitter produces large angle jumps; hover near the cue ball whips the cue.

## 2. Controller aim stabilization

- [x] 2.1 Add target-angle state plus near-ball dead zone to the mouse hover-aim path in `src/activities/pool/controller.js` (pointer sets target, not the rendered angle).
- [x] 2.2 Converge the rendered `aimAngle` toward the target each frame in `controller.update()` with delta-scaled exponential damping and a per-second slew cap, using shortest-arc wrap handling.
- [x] 2.3 Keep keyboard, touch-drag power/stroke, gamepad, ball-in-hand placement, and shot payload (`angle` = displayed aim) behavior unchanged.

## 3. Regression coverage

- [x] 3.1 Add unit tests for aim stability (small pointer deltas stay bounded; near-ball jitter does not swing the angle; convergence reaches the target without oscillation; wrap seam takes the short arc).
- [x] 3.2 Run `npm test` and resolve relevant failures.

## 4. In-game verification

- [x] 4.1 Run `npm run build` and resolve actual build errors.
- [ ] 4.2 Verify in the running game: slow fine aim near a target ball, fast sweep across the table, hover/jitter on and just outside the cue ball, keyboard and gamepad aim parity, and a shot fired from the displayed aim.
- [ ] 4.3 Confirm no regression to ball-in-hand placement, power charging, spin widget, cameras, or existing pool physics/rules tests.

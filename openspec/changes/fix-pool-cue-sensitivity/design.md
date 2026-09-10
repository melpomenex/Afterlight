## Context

See `proposal.md` for motivation. Current state (`src/activities/pool/controller.js`): `onTablePointerMove` raycasts the pointer onto the table plane and `aimAtWorldPoint` sets `aimAngle = atan2(local.z - cueZ, local.x - cueX)` immediately on every pointermove event. There is no damping, no sensitivity bound, and no guard for the `atan2` singularity when the ray lands near the cue ball — so small positional noise near the ball becomes a large angular swing, and every mouse jitter is rendered 1:1 by `tableScene.updateCue` / `updateAimGuides` via `controller.aimAngle` in `src/activities/pool.js`. Keyboard (`A/D` at 1.4 rad/s) and gamepad (2.0 rad/s) paths already use bounded per-frame rates in `controller.update(delta, ...)`; the mouse path is the outlier.

## Goals / Non-Goals

**Goals:**
- Make mouse aiming feel planted: small motions give small angle changes, fast sweeps follow smoothly, hover near the cue ball is stable.
- Keep the fix frame-rate independent and confined to the mouse aim path; keyboard/touch/gamepad capabilities unchanged.
- Cover the behavior with a unit regression test that does not need a browser or GPU.

**Non-Goals:**
- No changes to shot physics, power charging, spin, ball-in-hand rules, camera modes, or network shot payloads.
- No new settings UI or per-player sensitivity preference in this change.
- No touch-input redesign beyond leaving the existing touch-drag path intact.

## Decisions

- **Target-angle plus damped follow (chosen) over direct assignment.** Store mouse input as a target angle; converge the rendered `aimAngle` toward it each frame in `controller.update()` with an exponential, delta-scaled factor plus a per-second slew cap. Rationale: reuses the existing frame loop (already delta-driven), makes behavior frame-rate independent, and turns event-burst jitter into a smooth path. Alternative (scale raw pointer deltas / CSS-level throttling) rejected: it leaves the near-ball singularity in place and behaves differently at different event rates.
- **Near-ball dead zone (chosen) over clamping the angle.** When the pointer's table-local point falls within a small radius (order of a few ball diameters, tuned against `BALL_DIAMETER` from `shared/pool/physics.js`) of the cue ball, skip updating the target angle. Rationale: directly removes the singular region where `atan2` gain is unbounded; simple, predictable, and testable. Alternative (gain scheduling by distance) considered more continuous but harder to tune blindly; the dead zone can graduate to distance-scaled gain later without changing specs.
- **Angle-wrap-aware interpolation.** Converge along the shortest arc (wrap delta to [-π, π]) so sweeps across the ±π seam do not spin the long way around. No alternative seriously considered; naive lerp across the seam is visibly wrong.
- **Constants live next to the controller, not in shared physics.** Sensitivity/slew/dead-zone values are presentation tuning, not authoritative physics, so they stay client-side in the controller module. This keeps server snapshots, `shared/pool/*` physics, and Elixir session tests untouched.

## Risks / Trade-offs

- [Risk] Over-damping makes the cue feel laggy → Mitigation: pick a fast time constant (cue visibly tracks within ~100–200 ms) and a generous slew cap; verify by feel in the running game per AGENTS.md §10 smoke check.
- [Risk] Dead zone feels like a "stuck" cue if too large → Mitigation: keep the radius small (just enough to cover the singular region) and resume tracking immediately outside it; manual check hovering at and just outside the radius.
- [Risk] Touch-drag aim shares pointer events and could inherit mouse damping unintentionally → Mitigation: scope the new path to the mouse hover-aim branch; stroke-drag power and ball-in-hand tap paths keep existing behavior and are covered by manual check.

## Migration Plan

Client-only presentation change; no save, protocol, or server migration. Rollback is reverting the controller aim path. No feature flag proposed — behavior is strictly a stability improvement over an unusable control.

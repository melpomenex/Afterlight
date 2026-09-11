## Why

In Afterlight's Orpheum 8-ball billiards lounge, players encounter two critical UX and gameplay defects that undermine the activity:

1. **Obstructed post-shot camera**: Immediately after releasing a shot in cue mode, the camera automatically jumps to a direct overhead position centered at `(tableX, 3.8, tableZ)`. Because the Orpheum's suspended brass pendant lamp and mounting cord hang at `(tableX, 2.6–3.9, tableZ)`, the camera is placed directly into and behind the opaque lamp fixture, completely obstructing the player's view of the balls and table.
2. **Drastically insufficient shot power**: The billiards cue input treats normalized UI control values (`0.0..1.0` from the F-key charge mechanic, touch slider, or gamepad) directly as physical launch speed in meters per second (`m/s`). Because tournament pool physics supports launch speeds up to 15.0 m/s, capping ordinary shots at ~1.0 m/s produces feeble rolls where even a 100% full-power release cannot disperse the rack or achieve a natural legal break.

## What Changes

- **Unobstructed automatic shot-follow camera**: Redesign post-shot camera behavior when shooting from cue mode. Instead of forcing a direct-overhead perspective, the camera transitions to a table-relative elevated 3/4 shot-follow view that keeps the entire table and moving balls in frame while staying completely clear of the overhead lamp footprint.
- **Preserve explicit manual camera modes**: Maintain the player's ability to cycle through manual modes (`cue`, `standing`, `overhead`) via the `C` key or HUD toggle. Explicit overhead selection remains fully functional; automatic post-shot transitions never alter or corrupt the user's selected base mode.
- **Fluid transitions & reduced motion**: Ensure camera transitions between aiming, shot-follow, and settled states are smooth (~0.2–0.4s) while strictly respecting `prefers-reduced-motion` with instant/minimal transitions that still avoid lamp obstruction.
- **Normalized power abstraction & authoritative conversion**: Preserve normalized `0.0..1.0` shot power across all client input channels (keyboard `F`, mouse/touch drag, HUD slider, gamepad) and network payloads. Introduce an authoritative, nonlinear power mapping to physical cue-ball speed (`0.65..10.5 m/s`) at the rules/physics boundary:
  $$\text{speed} = \text{MIN\_CUE\_SPEED} + (\text{MAX\_CUE\_SPEED} - \text{MIN\_CUE\_SPEED}) \times p^{\text{POWER\_EXPONENT}}$$
  with $\text{MIN\_CUE\_SPEED} = 0.65\text{ m/s}$, $\text{MAX\_CUE\_SPEED} = 10.5\text{ m/s}$, and $\text{POWER\_EXPONENT} = 1.35$.
- **Strict JS and Elixir parity**: Implement identical constants and conversion logic in `shared/pool/rules.js` and `server_elixir/lib/afterlight/activities/pool/rules.ex`.
- **Authoritative server validation**: Validate and clamp incoming normalized power at the server boundary (`session_server.ex`) to ensure client inputs cannot inject out-of-bounds velocities.
- **Preserve presentation contracts**: Audio synthesis, cue pullback animation, and HUD displays continue consuming normalized `0.0..1.0` values without leaking physical speed units into presentation APIs.
- **Automated regression testing**: Add tests for camera state lifecycle, obstruction-free camera placement, power-curve mapping and monotonicity, full-power break dispersion, and JS/Elixir numerical parity.

## Capabilities

### New Capabilities

- `pool-shot-camera-power`: Unobstructed table-follow post-shot camera behavior and calibrated authoritative cue shot power for the Orpheum 8-ball billiards activity.

### Modified Capabilities

<!-- None in openspec/specs/. Billiards capabilities exist in unarchived feature work. -->

## Impact

- Client: `src/activities/pool/camera.js`, `src/activities/pool.js`, `src/activities/pool/controller.js`.
- Shared: `shared/pool/physics.js`, `shared/pool/rules.js`.
- Server: `server_elixir/lib/afterlight/activities/pool/rules.ex`, `server_elixir/lib/afterlight/activities/session_server.ex`.
- Tests: `tests/p3-gate.test.js`, `tests/pool-rules.test.js`, `tests/pool-shot-lifecycle.test.js`, `tests/pool-camera.test.js`, `tests/pool-power.test.js`, and Elixir test suites (`pool_rules_test.exs`, `pool_session_test.exs`, `pool_power_test.exs`).
- Documentation: Developer and control notes regarding normalized input vs physical speed.

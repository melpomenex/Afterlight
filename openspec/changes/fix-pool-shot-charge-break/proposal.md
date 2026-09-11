## Why

In Afterlight's 8-ball billiards activity (`orpheum-pool`), charging up a shot via the keyboard (`F`), touch slider, or gamepad trigger currently behaves like an oscillating timing meter that continuously swings up and down between 0.05 and 1.0. When players hold the charge control intending to deliver maximum power for a break shot, the meter immediately reverses at 1.0 and drains down toward 0.05. When the player releases the button, the shot executes at near-zero power, producing a feeble roll that barely nudges the rack.

In popular pool games (such as Miniclip 8 Ball Pool, GamePigeon 8-Ball, and Yahoo Pool), power charging is a deliberate pull-back or hold-to-fill action: charging increases power up to 100% and **clamps and holds at maximum charge** until release. Furthermore, break shots at maximum power in popular games deliver explosive, satisfying rack dispersal with clear visual and audio cues and intuitive shot cancellation.

## What Changes

- **Hold-to-charge clamp at maximum**: When holding `F`, gamepad trigger, or pulling back the cue, power smoothly ramps from baseline to 100% (`1.0`) and firmly clamps at maximum charge. It never reverses or drains back to zero while held. Releasing the input at any point fires the shot at the currently held power level.
- **Explicit shot cancellation**: While charging, pressing `Escape`, right-clicking, or pressing `C` cancels the charged shot without striking the ball, resetting the cue and power meter back to neutral.
- **Visual & tactile charge feedback**: When power reaches maximum charge (`1.0`), the HUD power meter and cue pull-back display a distinct full-charge highlight/pulse indicating maximum power is ready.
- **Calibrated break speed & rack dispersion**: Calibrate `POOL_MAX_CUE_SPEED` to 32.0 m/s (~3x previous power, providing thunderous, explosive arcade break shots with dynamic multi-cushion scattering) across both JavaScript (`shared/pool/physics.js`, `shared/pool/rules.js`) and Elixir (`server_elixir/lib/afterlight/activities/pool/rules.ex`, `server_elixir/lib/afterlight/activities/pool/physics.ex`), while raising the physics speed clamp to 50.0 m/s and adaptive substepping to 96 steps to strictly prevent tunneling.
- **Energetic rack dispersal**: Ensure a direct, center-aligned 100% break shot reliably scatters the triangular rack across the table, yielding active cushion rebounds and realistic pocketing opportunities without ball clustering or physical instability.
- **Automated test coverage**: Add automated tests verifying that hold-to-charge clamps at 1.0, release-at-max fires at 1.0, cancellation properly aborts the shot, and break physics disperses the rack forcefully in both JS (`tests/pool-power.test.js`) and Elixir (`pool_power_test.exs`).

## Capabilities

### New Capabilities

- `pool-shot-charge-break`: Calibrated hold-to-charge power clamping, shot cancellation, full-charge feedback, and authoritative break shot rack dispersion for 8-ball billiards.

### Modified Capabilities

<!-- None in openspec/specs/. Billiards capabilities exist in unarchived feature work. -->

## Impact

- Client: `src/activities/pool/controller.js` (charge clamping, cancellation, full-charge state), `src/activities/pool/tableScene.js` (cue pullback and charge indicator), `src/activities/pool/audio.js` (strike audio scaling).
- Shared: `shared/pool/physics.js` and `shared/pool/rules.js` (`POOL_MAX_CUE_SPEED` calibrated to 32.0 m/s, speed clamp 50.0 m/s, substep cap 96).
- Server: `server_elixir/lib/afterlight/activities/pool/rules.ex` and `server_elixir/lib/afterlight/activities/pool/physics.ex` (`@max_cue_speed` parity, speed clamp 50.0, substep cap 96).
- Tests: `tests/pool-power.test.js`, `server_elixir/test/afterlight/activities/pool_power_test.exs`.

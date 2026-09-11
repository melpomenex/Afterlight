## 1. Physics and Power Curve Calibration (Shared & Server)

- [x] 1.1 Update `POOL_MAX_CUE_SPEED` to 32.0 m/s (~3x power), raise strike speed clamp to 50.0 m/s, and scale substep cap to 96 in `shared/pool/physics.js` and `shared/pool/rules.js`
- [x] 1.2 Update `@max_cue_speed` to 32.0, raise strike speed clamp to 50.0, and scale substeps to 96 in `server_elixir/lib/afterlight/activities/pool/rules.ex` and `physics.ex`
- [x] 1.3 Update power curve calibration checkpoints and parity assertions in `tests/pool-power.test.js` and `server_elixir/test/afterlight/activities/pool_power_test.exs`

## 2. Input Controller Hold-to-Charge Clamping and Cancellation

- [x] 2.1 Refactor charging in `src/activities/pool/controller.js` to monotonically ramp power and clamp at 1.0 without oscillating or draining downward
- [x] 2.2 Implement explicit shot charge cancellation in `src/activities/pool/controller.js` that resets power and aborts shot execution
- [x] 2.3 Wire `Escape` key and secondary mouse button (right-click) to trigger shot charge cancellation when charging is active
- [x] 2.4 Synchronize gamepad trigger/button charging in `controller.js` to use identical clamping and release semantics

## 3. Visual and Audio Feedback for Maximum Charge

- [x] 3.1 Add full-charge visual highlight state to the HUD power bar in `src/activities/pool/controller.js` and `src/style.css` when `shotPower >= 0.99`
- [x] 3.2 Verify 3D cue stick pullback in `src/activities/pool/tableScene.js` remains smoothly anchored at maximum displacement while clamped at 1.0
- [x] 3.3 Tune cue strike audio playback in `src/activities/pool/audio.js` to scale punch and low-frequency resonance at full power

## 4. Verification and Automated Testing

- [x] 4.1 Add automated tests in `tests/pool-power.test.js` verifying hold-to-charge clamping at 1.0, release-at-max execution, and shot cancellation
- [x] 4.2 Add test assertions confirming 32.0 m/s break speed forcefully disperses all 15 object balls across the table with multiple cushion rebounds
- [x] 4.3 Run Elixir test suite (`pool_power_test.exs`, `pool_rules_test.exs`, `pool_session_test.exs`) to confirm server-side physics and power parity
- [x] 4.4 Run full project test suite and build verification (`npm test`, `npm run build`)

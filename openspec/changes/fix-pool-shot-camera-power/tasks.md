## 1. Camera Lifecycle & Placement

- [x] 1.1 Inspect current pool camera lifecycle in `src/activities/pool/camera.js` and `src/activities/pool.js`.
- [x] 1.2 Verify Orpheum lamp and table transforms in `src/world/theaterWorld.js` to ensure clear line-of-sight.
- [x] 1.3 Define table-relative offset for the automatic shot-follow camera (`localX: -1.1, localY: 2.45, localZ: 2.35`).
- [x] 1.4 Implement temporary shot-follow presentation state in `camera.js` that activates during shots without mutating base mode.
- [x] 1.5 Preserve explicit manual camera cycling (`cue` -> `standing` -> `overhead`) via `C` key and HUD.
- [x] 1.6 Implement dual position/look-at smoothing and preserve `prefers-reduced-motion` instant transitions.

## 2. Shot Power & Authoritative Physics

- [x] 2.1 Define normalized shot-power contract (`0.0..1.0` UI/input/network, `0.65..10.5 m/s` physical speed).
- [x] 2.2 Add JS `normalizedPowerToCueSpeed` and constants in `shared/pool/physics.js` / `shared/pool/rules.js`.
- [x] 2.3 Add Elixir `normalized_power_to_cue_speed` and constants in `server_elixir/lib/afterlight/activities/pool/rules.ex`.
- [x] 2.4 Call speed conversion inside `Rules.shoot` on both JS and Elixir sides before invoking `strikeCueBall`.
- [x] 2.5 Validate and clamp incoming `controls.power` to `[0.0, 1.0]` in `server_elixir/lib/afterlight/activities/session_server.ex`.
- [x] 2.6 Audit all input methods (`F` charge, mouse stroke, touch slider/button, gamepad) and presentation systems (audio, cue mesh, HUD) to ensure no double conversion.

## 3. Automated Testing & Parity

- [x] 3.1 Add camera regression tests in `tests/pool-camera.test.js` (cue aiming, moving-shot offset, settled return, manual overhead, reduced motion, lamp clearance).
- [x] 3.2 Add power curve unit tests in `tests/pool-power.test.js` (bounds, monotonicity, representative values, invalid input resilience).
- [x] 3.3 Add break dispersion test demonstrating multi-ball rack separation and rail contact at full power.
- [x] 3.4 Add Elixir parity test suite in `server_elixir/test/afterlight/activities/pool_power_test.exs`.
- [x] 3.5 Update existing unit test call sites that passed raw m/s to use normalized power values.
- [x] 3.6 Run full JS test suite (`npm test`) and Elixir test suite (`mix test`).
- [x] 3.7 Run production build check (`npm run build`).

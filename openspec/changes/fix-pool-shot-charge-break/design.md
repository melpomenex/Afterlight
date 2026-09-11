## Context

In Afterlight's Orpheum 8-ball billiards activity (`orpheum-pool`), players interact with the cue stick using keyboard (`F`), mouse drag, HUD slider, or gamepad. See `proposal.md` for the motivation regarding weak break shots and unintended power loss during charging.

Currently:
1. `src/activities/pool/controller.js` implements a ping-pong power oscillator:
   ```javascript
   if (isCharging) {
     shotPower += chargeDirection * delta * 0.9;
     if (shotPower >= 1.0) {
       shotPower = 1.0;
       chargeDirection = -1; // reverses immediately upon reaching 1.0
     } else if (shotPower <= 0.05) {
       shotPower = 0.05;
       chargeDirection = 1;
     }
     updatePowerDisplay();
   }
   ```
   Holding `F` to charge up reaches 1.0 in ~0.66s, then immediately drains down toward 0.05. When the player releases `F` after holding it, `onKeyUp` calls `executeShot()` at whatever degraded power the meter reached on its downward swing.
2. There is no cancellation mechanism: once charging begins, releasing the key or pointer unconditionally fires the cue stick.
3. Maximum physical launch speed is capped at `POOL_MAX_CUE_SPEED = 10.5` m/s in `shared/pool/physics.js` and `server_elixir/lib/afterlight/activities/pool/rules.ex`. While 10.5 m/s prevents completely static racks, it represents the very low end of competitive breaks (~23 mph) and lacks the punch and dispersal characteristic of popular arcade pool games (such as Miniclip 8 Ball Pool).

## Goals / Non-Goals

**Goals:**
- Provide an intuitive hold-to-charge mechanic that ramps power up and firmly clamps at 100% (`1.0`) while held.
- Releasing the charge input at any time executes the shot at the held power level.
- Provide clean shot cancellation via `Escape` key, secondary mouse click (right-click), or camera cycle (`C`).
- Provide clear visual and audio feedback when maximum charge is reached (HUD glow/pulse, maximum cue pullback, full-scale audio).
- Calibrate `POOL_MAX_CUE_SPEED` from 10.5 m/s to 13.0 m/s (~29 mph) across both JavaScript and Elixir rules, producing energetic and satisfying rack dispersal.
- Maintain full zero-tunneling guarantees and physical simulation stability.

**Non-Goals:**
- Replacing the 2D physics solver with an external library.
- Changing 8-ball game rules (turn assignment, foul rules, called pocket rules remain identical).
- Adding complex cue elevation or jump-shot physics.

## Decisions

### 1. Monotonic Charge Ramp with Maximum Clamping
- **Decision**: In `controller.js`, when charging starts, ramp `shotPower` monotonically from baseline upward toward 1.0 at a comfortable rate (~0.85 per second). When `shotPower` reaches 1.0, clamp it at 1.0. Do not reverse direction.
- **Rationale**: Popular pool games (Miniclip, GamePigeon, Yahoo Pool) treat power as a deliberate choice rather than a reflex mini-game. Clamping at 1.0 allows players to hold for full power without fear of timing penalties or sudden power collapse.
- **Alternatives Considered**:
  - *Ping-pong meter with a sweet-spot bonus*: Overcomplicates a casual lounge game and causes player frustration when missing the timing window.
  - *Auto-shoot upon reaching 1.0*: Disorienting because the player does not control the release instant.

### 2. Explicit Shot Cancellation
- **Decision**: Introduce a `cancelShotCharging()` method in `controller.js`. When charging is active:
  - Pressing `Escape` intercepts the key before exit handling, cancels the charge, and resets power to baseline.
  - Right-clicking (secondary mouse button) cancels the charge.
  - The cue stick immediately returns to resting aim position without firing.
- **Rationale**: Standard pool games allow players to back out of a shot if they change their mind about aim, angle, or power.
- **Alternatives Considered**:
  - *Requiring users to drag power back to zero*: Unusable for keyboard `F` charging.

### 3. Calibrating Max Break Speed to 32.0 m/s (~3x Power)
- **Decision**: Update `POOL_MAX_CUE_SPEED` to `32.0` m/s in:
  - `shared/pool/physics.js`
  - `server_elixir/lib/afterlight/activities/pool/rules.ex`
  Raise the cue ball strike speed clamp from 15.0 m/s to 50.0 m/s in both `shared/pool/physics.js` and `server_elixir/lib/afterlight/activities/pool/physics.ex`.
  Raise the adaptive substepping ceiling from 36 to 96 substeps in both engines.
  Formula remains:
  $$\text{speed}(p) = 0.65 + (32.0 - 0.65) \times p^{1.35}$$
- **Rationale**: While authentic real-world breaks sit around 25-30 mph, arcade pool games like Miniclip / GamePigeon feature high-speed energetic breaks where the cue ball hits with tremendous momentum, instantly scattering all 15 balls with multiple ricochets across the table. 32.0 m/s (~71 mph) delivers high arcade satisfaction without compromising accuracy or consistency.
- **Substepping Safety & Zero-Tunneling Guarantee**: The physics engine uses adaptive substepping with `MAX_SUBSTEP_DISPLACEMENT = 0.007` m. At 32.0 m/s, maximum displacement per 60Hz frame is $32.0 / 60 \approx 0.533$ m. With $\lceil 0.533 / 0.007 \rceil = 77$ substeps, raising the substeps cap from 36 to 96 ensures that maximum displacement per substep is $\le 5.6$ mm—far below the ball radius ($28.5$ mm) and cushion boundary. Tunneling remains mathematically impossible.

### 4. Visual and Audio Feedback for Full Charge
- **Decision**:
  - In `src/activities/pool/controller.js`, when `shotPower >= 0.99`, add a `pool-power-full` class to the power meter element to activate an energetic CSS pulse.
  - In `src/activities/pool/tableScene.js`, cue stick pullback reaches maximum travel offset (-0.28m) at full charge.
  - In `src/activities/pool/audio.js`, cue strike sound maps `power` logarithmically for extra low-end impact on max-power releases.

## Risks / Trade-offs

- **[Risk] High-speed balls penetrating cushions or skipping pockets**
  → *Mitigation*: The substepping algorithm dynamically scales up to 96 substeps with a 7mm displacement threshold. Both JS and Elixir physics suites test ball-cushion and pocket capture at up to 50.0 m/s without tunneling.
- **[Risk] Escape key conflicts with table exit**
  → *Mitigation*: The `Escape` event handler checks `isCharging` first; if charging is active, it calls `cancelShotCharging()`, prevents default, and stops propagation, leaving the player at the table.

## Context

In Afterlight's Orpheum West Lounge, the 8-ball billiards activity (`orpheum-pool`) provides a multiplayer 3D billiards experience. Two interconnected defects hinder gameplay:
1. When shooting in `cue` camera mode, releasing the cue stick immediately forces the camera to a direct-overhead viewpoint at `(tableX, 3.8, tableZ)`. The Orpheum scene contains an overhead brass billiards pendant lamp suspended at `(tableX, 2.6, tableZ)` with shade dimensions `0.55m x 0.18m x 1.4m` and a dark cord extending to `y = 3.9m`. Placing the camera at `y = 3.8m` puts it directly on the cord and behind the opaque brass shade, rendering the table and balls invisible.
2. The user input layer (charging with `F`, mouse stroke drag, touch HUD slider, and gamepad triggers) manages shot power as a normalized fraction `p in [0.0, 1.0]`. However, this normalized fraction was fed directly into `strikeCueBall` as physical launch velocity in `m/s`. Consequently, a 100% full-power shot launched the cue ball at only `1.0 m/s` (instead of tournament break speeds of `10–12 m/s`), resulting in an inability to disperse the rack or score a natural legal break.

## Goals / Non-Goals

**Goals:**
- Provide an unobstructed, broadcast-quality elevated 3/4 shot-follow camera when shots are released from `cue` mode.
- Preserve explicit manual camera modes (`cue`, `standing`, `overhead`) via `C` key and HUD cycling.
- Keep camera transitions smooth (~0.2–0.4s) while respecting `prefers-reduced-motion` with instant snaps that still avoid lamp obstruction.
- Maintain normalized `0.0..1.0` power semantics across all user input methods, HUDs, animations, audio, and network messages.
- Convert normalized power into physical launch speed (`0.65..10.5 m/s`) authoritatively at the rules boundary.
- Ensure strict numerical and behavioral parity between JS (`shared/pool/rules.js`) and Elixir (`server_elixir/lib/afterlight/activities/pool/rules.ex`).
- Validate and clamp incoming normalized power on the authoritative server.
- Add regression coverage for camera obstruction avoidance, power curve monotonicity, break dispersion, and JS/Elixir parity.

**Non-Goals:**
- Deleting, hiding, or modifying the geometry or lighting of the Orpheum hanging lamp.
- Rewriting the core billiards physics solver (substepping, friction, spin, cushion restitution remain intact).
- Modifying standard 8-ball rules logic or weakening legal break requirements.
- Exposing raw meters-per-second values to players in HUD or UI.

## Decisions and Architecture

### 1. Camera State Model & Lifecycle

The camera maintains the player's selected base mode (`cue`, `standing`, `overhead`) while resolving an active presentation state based on participation and ball movement:

```
[User Base Mode: CUE]
        │
        ▼ (balls settled & shooter)
 ┌──────────────┐
 │    AIMING    │  Low over-the-shoulder cue perspective
 └──────┬───────┘
        │
        │ shot released (!settled or status == "shooting")
        ▼
 ┌──────────────┐
 │ SHOT-FOLLOW  │  Elevated 3/4 table-follow view (unobstructed)
 └──────┬───────┘
        │
        │ balls settle (settled && status != "shooting")
        ▼
 ┌──────────────┐
 │    AIMING    │  Smooth return to cue aiming perspective
 └──────────────┘

[Manual Cycling via 'C' Key]:
  CUE (with auto shot-follow) ──► STANDING ──► OVERHEAD ──► CUE
```

- When `mode === 'standing'`: The camera stays in the elevated 3/4 lounge view regardless of shot phase.
- When `mode === 'overhead'`: The camera stays in the manual overhead view as explicitly chosen by the user.
- When `mode === 'cue'`: The camera presents `AIMING` view while balls are settled, smoothly transitions to `SHOT-FOLLOW` while balls are moving, and returns smoothly to `AIMING` once balls settle.
- Non-shooters and spectators default to the standing lounge perspective unless they have explicitly chosen another mode.

### 2. Table-Local Coordinates & Obstruction Avoidance

The Orpheum table is placed at `(-8.6, 0, -4.5)` with rotation $R = \pi / 2$. Rather than hardcoding world coordinates that break under table rotation, camera offsets are defined in table-local coordinates and transformed to world space:

$$\begin{aligned}
\text{worldX} &= \text{tableX} + \cos(R) \cdot \text{localX} + \sin(R) \cdot \text{localZ} \\
\text{worldY} &= \text{tableY} + \text{localY} \\
\text{worldZ} &= \text{tableZ} - \sin(R) \cdot \text{localX} + \cos(R) \cdot \text{localZ}
\end{aligned}$$

For the shot-follow camera:
- `localX = -1.1` (longitudinal: slightly offset towards table head)
- `localY = 2.45` (elevation: 2.45m above floor, 1.67m above cloth)
- `localZ = 2.35` (lateral: offset into the open lounge aisle, away from the west wall)

For the theater configuration ($R = \pi/2$):
- World position: `x = -6.25`, `y = 2.45`, `z = -3.4`
- Look target: `(tableX, tableY + 0.08, tableZ) = (-8.6, 0.86, -4.5)`
- Line-of-sight analysis: The lamp shade is centered at `(-8.6, 2.6, -4.5)` with width `0.55m` in X (spanning `x in [-8.875, -8.325]`). As the camera ray descends from `y = 2.45m` at `x = -6.25m` to `y = 0.86m` at `x = -8.6m`, its elevation at the eastern lamp edge (`x = -8.325m`) is `1.05m`—more than `1.4m` below the bottom of the lamp fixture. Sightlines to the table surface and all 16 balls remain 100% unobstructed.

### 3. Camera Smoothing and Reduced Motion

- **Normal Motion**: Both `camera.position` and `currentLookAt` smoothly interpolate toward `targetPos` and `lookTarget` using exponential decay (`lerpSpeed ≈ 0.12–0.15`), producing an organic ~250–350ms transition without angular snaps.
- **Reduced Motion (`prefers-reduced-motion: reduce`)**: The camera instantly sets `camera.position.copy(targetPos)` and `currentLookAt.copy(lookTarget)`. No forced sweeping is performed, and the viewpoint avoids the lamp obstruction.

### 4. Normalized Shot Power and Power Curve

Input abstractions and network protocol retain normalized values $p \in [0.0, 1.0]$. The authoritative conversion to physical launch velocity occurs at the rules layer using a calibrated power curve:

$$\text{speed}(p) = \text{MIN\_CUE\_SPEED} + (\text{MAX\_CUE\_SPEED} - \text{MIN\_CUE\_SPEED}) \times \left(\text{clamp}(p, 0, 1)\right)^{\text{POWER\_EXPONENT}}$$

Configured constants:
- `POOL_MIN_CUE_SPEED = 0.65` m/s
- `POOL_MAX_CUE_SPEED = 10.5` m/s
- `POOL_POWER_EXPONENT = 1.35`

Calibration checkpoints:
| Normalized Input $p$ | Physical Speed | In-Game Character |
|---|---|---|
| $0.00$ | $0.65$ m/s | Minimum committed stroke / gentle nudge |
| $0.10$ | $1.09$ m/s | Soft finesse shot / snooker escape |
| $0.25$ | $2.17$ m/s | Controlled positional tap |
| $0.35$ | $3.04$ m/s | Medium pocketing shot |
| $0.50$ | $4.51$ m/s | Standard firm shot across full table |
| $0.75$ | $7.33$ m/s | Heavy power shot / rail escape |
| $1.00$ | $10.50$ m/s | Full-power break / rack explosion |

The exponent $1.35$ expands control precision in the bottom half of the stroke meter while reserving top-end speeds for dramatic breaks.

### 5. Authoritative Pipeline & Validation

```
[Client Controller] (F key, touch, gamepad)
        │
        ▼ (normalized power 0.0..1.0)
[Network Activity Input] (`controls.power = 0.0..1.0`)
        │
        ▼ (Phoenix channel / WebSocket)
[Server session_server.ex]
        │ ──► validate & clamp: min(max(power, 0.0), 1.0)
        ▼
[Rules.shoot] (shared JS & Elixir)
        │ ──► speed = normalizedPowerToCueSpeed(power)
        ▼
[Physics.strike_cue_ball]
        │ ──► applies physical speed in m/s to cue ball velocity vector
        ▼
[Simulation Stepping]
```

Presentation systems (audio pitch/volume, cue pullback animation, HUD meter) consume normalized power directly from the controller and never receive converted m/s values.

## Risks and Mitigations

- **Risk: Camera oscillation near settling threshold**:
  - *Mitigation*: The shot camera activates when `!settled || status === 'shooting'` and only releases when `settled && status !== 'shooting'`. Physics settling is hysteresis-backed with linear velocity $< 0.002\text{ m/s}$ and angular velocity $< 0.05\text{ rad/s}$.
- **Risk: Double power conversion**:
  - *Mitigation*: `strikeCueBall` in `physics.js` / `physics.ex` remains strictly physical (`m/s`). Only `shoot()` in `rules.js` / `rules.ex` executes `normalizedPowerToCueSpeed()`. The controller and network transport carry normalized floats exclusively.
- **Risk: Out-of-bounds client input**:
  - *Mitigation*: `session_server.ex` clamps incoming power floats to `[0.0, 1.0]`. Invalid non-numeric values safely default to `0.0` (which maps to `MIN_CUE_SPEED`).

## Migration Plan

- Backward-compatiblewire protocol: `controls.power` was already a float in `[0.0, 1.0]`. No wire schema version increment is required.
- Existing tests: Unit tests that previously passed raw m/s numbers (e.g., `3.0`, `4.0`) to `shoot()` are updated to pass normalized values (`0.35`, `0.45`), verifying identical physical trajectories.

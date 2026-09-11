## Purpose

Provide an unobstructed, broadcast-quality camera experience during 8-ball billiards shots and deliver authentic, authoritative cue shot power that scales from delicate finesse taps to forceful, rack-dispersing breaks.

## ADDED Requirements

### Requirement: Unobstructed post-shot camera behavior
When a shot is executed from `cue` camera mode, the billiards camera SHALL transition to an elevated 3/4 table-follow viewpoint offset horizontally from the table center rather than jumping directly overhead beneath or into the hanging lamp fixture.

#### Scenario: Shot released in cue mode transitions to offset shot-follow view
- **WHEN** the player shoots while using `cue` camera mode
- **THEN** the camera smoothly shifts to a high 3/4 perspective offset from the table center
- **AND** the camera does not place its viewpoint directly overhead at `(tableX, y, tableZ)`.

#### Scenario: Moving balls remain clearly visible without lamp obstruction
- **WHEN** balls are moving across the pool table
- **THEN** the camera line of sight to the table surface passes comfortably beneath the hanging lamp fixture
- **AND** all balls on the table remain in frame and readable.

#### Scenario: Settled balls return to cue aiming view
- **WHEN** all balls on the table have settled following a shot
- **AND** the active player remains in `cue` mode
- **THEN** the camera smoothly returns to the low over-the-shoulder cue aiming perspective.

### Requirement: Preserved manual camera modes
The pool camera SHALL preserve user-selected manual camera modes (`cue`, `standing`, `overhead`) across shot lifecycles.

#### Scenario: Player explicitly cycles to overhead view
- **WHEN** the player cycles the camera mode to `overhead`
- **THEN** the camera positions directly above the table center
- **AND** the viewpoint remains in overhead mode until the player cycles away.

#### Scenario: Player explicitly cycles to standing view
- **WHEN** the player cycles the camera mode to `standing`
- **THEN** the camera remains in the elevated lounge 3/4 perspective throughout aiming and shot execution.

### Requirement: Reduced-motion accessibility
When `prefers-reduced-motion` is active, the pool camera SHALL avoid animated sweeping transitions while still avoiding the overhead lamp obstruction.

#### Scenario: Reduced motion uses immediate positioning
- **WHEN** `prefers-reduced-motion` is detected
- **THEN** camera position transitions occur immediately without multi-frame lerp interpolation
- **AND** moving-shot positioning uses the unobstructed table-follow offset rather than the lamp-blocked overhead position.

### Requirement: Normalized power mapping to physical cue ball speed
The billiards rules engine SHALL map normalized user shot power $p \in [0.0, 1.0]$ into physical cue-ball launch speed $v \in [0.65, 10.5]\text{ m/s}$ using a calibrated nonlinear power curve:
$$v = 0.65 + (10.5 - 0.65) \times (\text{clamp}(p, 0, 1))^{1.35}$$

#### Scenario: Full power produces maximum break speed
- **WHEN** a shot is executed at normalized power $1.0$
- **THEN** the cue ball is struck with physical velocity approximately $10.5\text{ m/s}$
- **AND** a center hit on the opening rack forcefully disperses all 15 object balls across the table.

#### Scenario: Low power provides finesse control
- **WHEN** a shot is executed at normalized power $0.10$
- **THEN** the cue ball is struck with physical velocity approximately $1.09\text{ m/s}$
- **AND** the stroke delivers delicate finesse control suitable for short-distance rolling.

#### Scenario: Monotonic speed scaling across normalized range
- **WHEN** comparing launch speeds across increasing normalized power inputs
- **THEN** speed strictly increases: $\text{speed}(0.10) < \text{speed}(0.25) < \text{speed}(0.50) < \text{speed}(0.75) < \text{speed}(1.00)$.

### Requirement: Authoritative server power validation & parity
The server SHALL validate incoming normalized power on the network payload and evaluate physical speed with exact numerical parity to the client simulation.

#### Scenario: Server clamps out-of-bounds power
- **WHEN** an incoming shot payload contains power $< 0.0$ or $> 1.0$
- **THEN** the server clamps the value into $[0.0, 1.0]$ before computing physical launch speed
- **AND** does not produce out-of-bounds velocities.

#### Scenario: JS and Elixir evaluate identical physical speed
- **WHEN** evaluating the same normalized power input in JS and Elixir
- **THEN** both implementations compute identical physical launch speeds within floating-point tolerance ($10^{-5}$).

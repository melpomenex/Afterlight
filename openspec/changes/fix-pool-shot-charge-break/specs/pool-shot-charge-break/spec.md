## Purpose

Defines the behavioral contracts for pool shot charging, maximum power clamping, explicit shot cancellation, and authoritative break shot rack dispersion for 8-ball billiards in The Orpheum.

## ADDED Requirements

### Requirement: Hold-to-charge clamping at maximum power
The pool input system SHALL ramp shot power smoothly upward from baseline toward 1.0 (100%) while the primary shot charging input (such as held `F` key or gamepad trigger) remains active. When power reaches 1.0, the power level SHALL firmly clamp at 1.0 and MUST NOT oscillate, decrease, or ping-pong back down while the input continues to be held. Releasing the charge input SHALL immediately execute the shot at the held power level.

#### Scenario: User holds charge to maximum power
- **WHEN** the player activates and holds the charge input for longer than the time required to reach 100% power
- **THEN** the shot power smoothly reaches 1.0 and remains firmly locked at 1.0 without decreasing or bouncing downward

#### Scenario: User releases charge at maximum power
- **WHEN** the player releases the charge input while power is clamped at 1.0
- **THEN** the shot executes immediately with normalized power equal to 1.0

#### Scenario: User releases charge before reaching maximum
- **WHEN** the player releases the charge input while power is rising at an intermediate value (for example, 0.65)
- **THEN** the shot executes immediately with normalized power equal to the intermediate value (0.65)

### Requirement: Explicit shot cancellation during charging
The pool input system SHALL allow players to abort an active charge without striking the cue ball. When charging is in progress, triggering an explicit cancellation action SHALL immediately abort the charge, reset power to neutral baseline, and prevent the cue stick from striking the cue ball upon input release.

#### Scenario: User cancels charging with Escape key
- **WHEN** the player presses the `Escape` key while charging a shot
- **THEN** charging is cancelled immediately, the cue stick returns to neutral rest position, and no shot is executed

#### Scenario: User cancels charging with secondary mouse click
- **WHEN** the player presses the secondary pointer button (right-click) while charging a shot
- **THEN** charging is cancelled immediately, the HUD power indicator resets, and no shot is executed

### Requirement: Visual and tactile feedback at maximum charge
The presentation layer SHALL provide distinct visual feedback when the shot charge reaches 100%. The HUD power fill indicator SHALL display a full-charge highlight state, the 3D cue stick pullback displacement SHALL reach its maximum travel distance, and releasing the shot SHALL play cue strike audio scaled to maximum intensity.

#### Scenario: Full charge indicator activation
- **WHEN** shot power reaches 1.0 during charging
- **THEN** the HUD power meter adds an active full-charge visual indicator and the 3D cue stick remains pulled back at maximum distance

#### Scenario: Audio scaling at full charge release
- **WHEN** a shot is released at 1.0 power
- **THEN** the cue strike audio event is synthesized at full relative volume and punch

### Requirement: Calibrated break speed and authoritative rack dispersion
The billiards physics simulation on both client and authoritative server SHALL convert a normalized 1.0 shot power to a physical cue ball launch speed of 32.0 m/s using the shared power curve. A direct centerline break shot executed at 1.0 power SHALL forcefully disperse the 15-ball triangular rack across the table surface, causing multiple cushion rebounds and spreading object balls into both halves of the table without tunneling or ball overlap errors.

#### Scenario: Maximum power break shot dispersion
- **WHEN** a player executes a 1.0 power break shot directly into the apex ball of an undisturbed 15-ball rack
- **THEN** the cue ball strikes the apex ball at 32.0 m/s, dispersing all 15 object balls across the table and producing multiple cushion collision events

#### Scenario: Authoritative client and server parity
- **WHEN** normalized shot power values across [0.0, 1.0] are converted to physical speeds
- **THEN** both the JavaScript physics engine and the Elixir server rules module produce identical physical launch speeds clamped between 0.65 m/s and 32.0 m/s

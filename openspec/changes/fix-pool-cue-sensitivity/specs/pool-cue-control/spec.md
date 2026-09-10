## Purpose

Stable mouse aiming for the Orpheum pool cue so small pointer movements produce small, predictable cue-angle changes and the cue no longer jerks or whips around during normal aiming.

## ADDED Requirements

### Requirement: Bounded mouse-aim sensitivity
The pool cue mouse-aim path SHALL map pointer motion to aim-angle changes with bounded sensitivity so that ordinary small pointer movements produce small angle deltas, and rapid pointer motion cannot instantaneously whip the cue across large arcs.

#### Scenario: Small pointer motion stays small
- **WHEN** the pointer moves a small distance across the table surface during the player's turn
- **THEN** the resulting cue aim-angle change is proportionally small and free of visible jumps.

#### Scenario: Fast pointer sweep stays controlled
- **WHEN** the pointer sweeps rapidly across the table
- **THEN** the cue angle follows smoothly toward the pointer direction at a bounded angular rate rather than snapping instantly.

### Requirement: Near-ball aim dead zone
The pool cue mouse-aim path SHALL attenuate or ignore aim updates when the pointer's table-surface ray lands within a small radius of the cue ball, where the aim-angle computation is singular and tiny positional noise otherwise produces large angular swings.

#### Scenario: Jitter near the cue ball does not whip the cue
- **WHEN** the pointer hovers or jitters within the near-ball radius around the cue ball
- **THEN** the cue aim angle remains stable instead of swinging wildly.

#### Scenario: Aiming resumes outside the dead zone
- **WHEN** the pointer moves outside the near-ball radius
- **THEN** normal smoothed aiming resumes toward the pointer direction.

### Requirement: Frame-rate-independent aim smoothing
The pool cue aim angle SHALL converge smoothly toward its target with frame-rate-independent damping so aiming feels identical at different frame rates and does not stutter or overshoot.

#### Scenario: Consistent feel across frame rates
- **WHEN** the same pointer motion is applied at different frame rates
- **THEN** the cue settles to the same final angle along a smooth path without oscillation.

### Requirement: Preserve other aim inputs and shooting behavior
Keyboard fine-aim, touch-drag aim, gamepad aim, power charging, spin selection, ball-in-hand placement, and shot execution SHALL keep their existing behavior; only the mouse pointer-move aim path gains damping, sensitivity bounding, and the near-ball dead zone.

#### Scenario: Keyboard and gamepad aim unchanged
- **WHEN** a player aims with keyboard or gamepad instead of the mouse
- **THEN** aim rates and behavior match the pre-change experience.

#### Scenario: Shots still fire from the displayed aim
- **WHEN** the player shoots after mouse-aiming
- **THEN** the shot uses the currently displayed (smoothed) cue angle.

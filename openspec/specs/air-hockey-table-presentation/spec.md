# air-hockey-table-presentation Specification

## Purpose
Defines how the Orpheum air hockey table's playing surface is presented so it reads as furniture under the room's lighting: calibrated luminance and finish, legible markings and equipment, and intentionally preserved accent glow.
## Requirements
### Requirement: Non-glowing bed surface

The air hockey bed SHALL present a mid-tone laminate that reflects the available Orpheum lighting without clipping to white or reading as an emissive light source.

#### Scenario: Viewed under Orpheum lighting

- **WHEN** the player views the table in the Orpheum while the room's hall, stage, and chandelier lighting and the game's bloom treatment are active
- **THEN** the rendered bed shows a laminate tone and stays below the bloom threshold instead of glowing as a solid white surface

#### Scenario: Any supported camera angle

- **WHEN** the player views the table through any supported camera mode or isometric angle
- **THEN** no region of the bed produces a mirror-like blown highlight

### Requirement: Bounded finish response

The bed SHALL use a diffuse satin finish whose brightest specular response remains bounded under the room's static point and directional lights and the suspended scoreboard.

#### Scenario: Static room lights present

- **WHEN** the table is rendered with the Orpheum's static lights and the suspended scoreboard housing in place
- **THEN** the lit bed does not clip to pure white anywhere on its playing surface

### Requirement: Court marking and equipment legibility

Court markings and equipment SHALL remain visually distinguishable against the recalibrated bed.

#### Scenario: Reading the court

- **WHEN** the player looks at the table from a normal play or spectating distance
- **THEN** the red center line, center circle, goal creases, and cyan defensive lines are readable against the bed

#### Scenario: Equipment contrast

- **WHEN** the puck and both mallets rest or move on the bed
- **THEN** each remains visually distinguishable from the bed surface

### Requirement: Preserved intentional glow

Intentional emissive accents on the table SHALL remain functional and readable.

#### Scenario: Goal celebration

- **WHEN** a goal is scored
- **THEN** the scoring side's goal glow strip flashes as designed and the digital scoreboard display remains readable


## Purpose

Keeps the Orpheum's foosball table physically and visually clear of unrelated scenery, and records the retirement of the theater's field-note stand so it is never rebuilt inside the play area.

## ADDED Requirements

### Requirement: Unobstructed foosball bay

The Orpheum foosball bay at `[-5.8, 7.0]` SHALL contain only its intended contents: the table model, its runner carpet and brass borders, the floor surfaces beneath them, and the declared foosball activity anchor with its collision footprint. No other scenery mesh, collision rectangle, or interactable SHALL overlap the table's footprint or its standing approaches.

#### Scenario: Built theater has no conflicting geometry

- **WHEN** the theater world is built for a fresh or previously visited save
- **THEN** no obstacle and no interaction item other than the foosball activity occupies the bay, and nothing intersects the table volume

#### Scenario: Approaching the table

- **WHEN** the player walks up to the foosball table from its north, south, east, or west play approaches
- **THEN** the route is walkable to within interaction range and the foosball activity is the offered interaction

### Requirement: Theater field note is retired

The Orpheum SHALL NOT declare or build a field note. No field-note stand, its collision, its interaction item, or its lore copy SHALL exist in the theater; the former "house rules" note is removed content.

#### Scenario: Manifest declares no theater note

- **WHEN** the place manifest is validated
- **THEN** the theater entry has no note coordinate, note title, or note body, while its objective, landmark, seats, screen and activities are unchanged, and the manifest still validates cleanly

#### Scenario: Rebuilt theater contains no note

- **WHEN** the theater world is built and its interaction items are inspected
- **THEN** no field-note item or note stand geometry exists anywhere in the theater, including the former stand position inside the foosball bay

### Requirement: Other places keep their notes

Removing the theater's note SHALL NOT alter any other place. Every other place that declares a field note SHALL still build its note stand and offer a reachable field-note interaction.

#### Scenario: Non-theater notes survive

- **WHEN** any other place that declares a note is built
- **THEN** its field-note stand and interaction item are present and reachable from the place entrance

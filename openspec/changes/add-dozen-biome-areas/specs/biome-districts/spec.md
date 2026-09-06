## Purpose

Defines the registry, environmental metadata, entrance spawn configurations, and district connectivity for twelve distinct exploration biomes in Afterlight.

## ADDED Requirements

### Requirement: Biome District Registry
The system SHALL maintain a registry containing twelve unique atmospheric biome districts (`aqueduct`, `caldera`, `understory`, `saltworks`, `rooftops`, `mangrove`, `trestle`, `foundry`, `frost-spire`, `delta`, `archives`, and `kiln-terrace`). Each district definition MUST include a stable ID, display name, district tag, subtitle, narrative description, landmark coordinate, field note coordinate, spawn coordinate, atmospheric fog color, sunlight tint, objective label, interaction prompt, completion status text, and completion announcement message.

#### Scenario: Querying biome district definitions
- **WHEN** the game or navigation interface requests the district definition for any of the twelve biome IDs
- **THEN** the system returns a complete definition object containing all required narrative, coordinate, and atmospheric properties

#### Scenario: Distinct atmospheric color palettes
- **WHEN** the player enters any of the twelve biome districts
- **THEN** the environment fog and sunlight colors update to match the district's registered theme colors

### Requirement: District Connectivity and Route Topology
The system SHALL integrate all twelve biome districts into the continuous sequential travel route between the west and east gates, preserving bidirectional navigation across the entire district network.

#### Scenario: Traversing through sequential biome gates
- **WHEN** the player walks into an active east gate in a biome district
- **THEN** the player is transported to the entrance of the next district in the sequence

#### Scenario: Reverse gate traversal
- **WHEN** the player walks into an active west gate in a biome district
- **THEN** the player is transported to the entrance of the preceding district in the sequence

### Requirement: Unobstructed Actor Spawning
The system SHALL provide verified collision-free coordinates for both the player character and companion actor upon entering each of the twelve biome districts.

#### Scenario: Spawning into a biome district
- **WHEN** the player enters any of the twelve biome districts
- **THEN** the player actor is positioned at the designated spawn coordinate without colliding with any obstacles or boundary perimeters

#### Scenario: Companion follower placement
- **WHEN** the player arrives at the designated spawn coordinate of a biome district
- **THEN** the companion actor is positioned adjacent to the player in a collision-free location with clear line-of-sight

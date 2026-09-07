## Purpose

Covers player interaction with field note lore stands, landmark environmental restoration, persistent state tracking, SVG minimap route rendering, and fast-travel district dialog UI across all twelve biomes.

## ADDED Requirements

### Requirement: Field Note Lore Inspection
The system SHALL place an accessible field note stand in each of the twelve biome districts containing atmospheric lore reflecting the history and character of the biome.

#### Scenario: Reading a field note
- **WHEN** the player approaches the field note stand and triggers the interaction key or button
- **THEN** an on-screen toast displays the note title, author attribution, and poetic lore text

### Requirement: Landmark Environmental Restoration
The system SHALL provide an interactive landmark prop in each of the twelve biome districts that, when activated by the player, performs a permanent restoration action, triggers a sensory feedback effect (e.g. glowing beacons, rotating machinery, flowing channels), announces completion to the player, and records the district as completed.

#### Scenario: Restoring a biome landmark
- **WHEN** the player interacts with an unrestored landmark in a biome district
- **THEN** the system triggers the restoration animation and audio-visual effect, marks the district completed, displays the completion announcement toast, and updates the HUD objective status

#### Scenario: Idempotent landmark interaction
- **WHEN** the player interacts with a landmark that has already been restored
- **THEN** the system preserves the restored visual state without duplicating completion rewards or re-triggering completion toasts

### Requirement: Exploration State Persistence and Migration
The system SHALL persist visited and completed status for all twelve biomes in the persistent player save data and cleanly migrate legacy save records without erasing previous player progress.

#### Scenario: Persisting newly discovered biomes
- **WHEN** the player visits a new biome district or restores its landmark
- **THEN** the system updates the visited and completed arrays in persistent storage

#### Scenario: Loading legacy or partial save data
- **WHEN** the game loads an older save file missing newer biome IDs or with malformed keys
- **THEN** the system normalizes the save state, preserves all valid existing progress, and populates sensible default exploration states

### Requirement: Biome Minimap Schematics and Coordinate Projection
The system SHALL render a custom SVG vector route schematic representing the floor plan and key paths of each biome on the HUD minimap, projecting the player's world position accurately within the minimap viewBox.

#### Scenario: Displaying biome minimap schematic
- **WHEN** the player enters a biome district
- **THEN** the HUD minimap SVG updates its path vector to illustrate the architecture and corridors of that biome

#### Scenario: Player position marker tracking
- **WHEN** the player moves within a biome district
- **THEN** the indicator blip on the minimap updates in real-time corresponding to the player's normalized world coordinates

### Requirement: Responsive District Navigation Dialog
The system SHALL provide a modal dialog listing all districts (introductory areas and twelve exploration biomes) in an accessible, scrollable responsive layout showing visited status, completion indicators, and quick-travel buttons.

#### Scenario: Opening district navigation dialog
- **WHEN** the player opens the district selection dialog via hotkey or on-screen button
- **THEN** the dialog displays entries for all available districts, indicating which have been visited or restored

#### Scenario: Fast-traveling to a discovered district
- **WHEN** the player selects an available district from the dialog
- **THEN** the dialog closes, and the player is transported to the entrance of the selected district

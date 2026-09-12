# biome-exploration-mechanics

## MODIFIED Requirements

### Requirement: Exploration State Persistence and Migration
The system SHALL persist visited and completed status for all twelve biomes in the persistent player save data and cleanly migrate legacy save records without erasing previous player progress. Loading SHALL drop ids that are no longer known — including the retired Glass Garden (`garden`) — while preserving every other visited or completed district and normalizing malformed keys.

#### Scenario: Persisting newly discovered biomes
- **WHEN** the player visits a new biome district or restores its landmark
- **THEN** the system updates the visited and completed arrays in persistent storage

#### Scenario: Loading legacy or partial save data
- **WHEN** the game loads an older save file missing newer biome IDs, with malformed keys, or recording the retired Glass Garden
- **THEN** the system normalizes the save state, preserves all valid existing progress, drops only the unknown/retired ids, and populates sensible default exploration states

## Purpose

Governs procedural 3D world construction, walkable clearance routes, collision boundary modeling, instanced rendering batching, and dynamic environmental animations for all twelve exploration biomes.

## ADDED Requirements

### Requirement: Distinct Biome Architectural Scenery
The system SHALL procedurally construct a visually unique isometric 3D environment for each of the twelve biomes using layered geometry, thematic material palettes, and distinct prop families that reflect the environmental theme (e.g. subterranean stone sluices, geothermal basalt flues, bioluminescent fungal shelves, salt evaporation terraces, high-altitude catwalks, mangrove stilt roots, iron trestle viaducts, industrial slag heaps, frosted glass spires, tidal marsh weirs, stone archive bookcases, and terracotta kiln ovens).

#### Scenario: Subterranean and industrial biome generation
- **WHEN** the player enters an industrial or subterranean biome such as `aqueduct`, `caldera`, or `foundry`
- **THEN** the world builder generates layered stone walls, pipes, masonry courses, and machinery specific to that biome's architectural theme

#### Scenario: Vegetative and aquatic biome generation
- **WHEN** the player enters a natural or waterborne biome such as `understory`, `mangrove`, or `delta`
- **THEN** the world builder generates organic foliage, water channels, roots, or reeds specific to that biome's natural theme

### Requirement: Navigable Route Clearance and Collision Modeling
The system SHALL register explicit rectangular collision boundaries and obstacle boxes for all substantial props and walls, ensuring an unobstructed walkable corridor between spawn points, transition gates, field notes, and landmark interactables.

#### Scenario: Unobstructed route to landmark
- **WHEN** the player navigates from the entrance spawn point toward the biome's landmark
- **THEN** a clear walking corridor with at least actor clearance is available without intersecting collision boxes

#### Scenario: Unobstructed route between gates
- **WHEN** the player walks across the district from the west gate to the east gate
- **THEN** a clear continuous route exists without dead ends or impassable obstacles

#### Scenario: Accessible field note approach
- **WHEN** the player approaches the field note stand in any biome
- **THEN** the player can stand within interaction distance of the note without being blocked by obstacle collision

### Requirement: Instanced Mesh Static Batching
The system SHALL batch repetitive static, non-emissive architectural boxes into instanced meshes to maintain rendering performance, while excluding animated, transparent, emissive, and interactive meshes from batching.

#### Scenario: Static scenery batching
- **WHEN** a biome world finishes procedural construction
- **THEN** static opaque geometry is consolidated into instanced meshes, reducing individual draw calls

#### Scenario: Animated prop exclusion
- **WHEN** a dynamic or animated prop is added to a biome world
- **THEN** the animated prop remains outside the static batch and retains independent transformation updates

### Requirement: Dynamic Environmental Elements and Animation
The system SHALL provide active frame-based animation routines for biome-specific dynamic elements (such as water ripples, rising steam, pulsing spores, rotating wind vanes, or shimmering crystal facets) during district updates.

#### Scenario: Active frame animation
- **WHEN** the game loop updates an active biome district
- **THEN** all registered dynamic environmental elements advance their animation state based on elapsed time

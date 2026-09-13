## Purpose

Defines how places and activities interpret the visitor's World through reusable cosmetic presentation while preserving their functional identity and shared gameplay.

## ADDED Requirements

### Requirement: Declarative World and View contracts

World definitions SHALL declare stable identity, default variant, variant profiles, reusable asset references and optional View interpretations. Each shipped View context SHALL declare full, partial, ambient or none inheritance, its supported presentation slots and native fallback. In-place activities SHALL reuse their parent's environment host. Invalid or duplicate IDs, unknown Views/assets/adapters, invalid capability declarations and missing fallbacks SHALL be detected by development validation; runtime failures SHALL preserve a playable native View.

#### Scenario: New View without a custom interpretation
- **WHEN** a registered compatible View has no bespoke scenery for a registered World
- **THEN** it resolves the permitted generic World presentation without requiring a duplicate complete scene.

#### Scenario: Invalid content declaration
- **WHEN** a definition references an unknown asset or lacks a native fallback
- **THEN** validation identifies the offending declaration before release.

### Requirement: Deterministic inheritance and fallback

Resolution SHALL prefer the World-specific View interpretation, then generic World presentation filtered by supported slots, then native View presentation, then the existing playable scene. Missing individual resources SHALL fall back per slot. Unsupported Views SHALL retain their native presentation and SHALL NOT change the selected World. Fallback SHALL be observable in diagnostics and SHALL NOT randomly select another World.

#### Scenario: Missing Kart interpretation
- **WHEN** a World's Kart-specific decoration is missing
- **THEN** Kart uses its allowed generic World profile and native scenery while preserving the selection and race.

#### Scenario: Fixed retro game
- **WHEN** a rainforest visitor plays a game declaring none inheritance
- **THEN** that game's internal graphics remain native while its surrounding arcade still uses rainforest.

### Requirement: Functional geometry is invariant

Personal World variation SHALL NOT change collision, navigable floors/walls, bounds, doors, spawn or participant positions, seats, interactions, cabinet/table geometry, authoritative coordinates, race course layout, checkpoints, ramps, hazards, physics or gameplay randomness. Cosmetic scenery SHALL be non-authoritative and excluded from navigation/interaction/sightline clearances; solid-looking scenery SHALL NOT be introduced where a player can walk through it. Substantial cosmetic geometry SHALL remain outside protected gameplay volumes.

#### Scenario: Two clients at the same table
- **WHEN** coastal and rainforest clients share a pool session
- **THEN** they see identical table, ball and participant coordinates, collision and outcomes despite different surroundings.

#### Scenario: Unsafe decorative anchor
- **WHEN** a proposed tree overlaps a spawn, walking route or cabinet approach
- **THEN** it is rejected or omitted without adding client-specific collision.

### Requirement: Existing Theater and social contexts inherit once

All existing theater environments and variants SHALL retain their authored composition, screen, media, seating and functional layout. Arcade cabinets, pool, air hockey, foosball, darts, piano and photo booth SHALL share their parent's World surroundings without duplicate scene or audio ownership. Other shipped places SHALL adopt permitted ambient World treatment while preserving authored landmarks, lighting cues and authoritative weather-dependent activity cues.

#### Scenario: Theater migration
- **WHEN** each existing variant is selected after migration
- **THEN** its theater scenery remains available around the same functional theater and shared screen.

#### Scenario: Arcade to pool
- **WHEN** a visitor moves from an arcade cabinet to the lounge pool table
- **THEN** the World remains coherent with one surrounding environment and the table remains playable in all its camera modes.

### Requirement: Hosted games interpret the same World safely

Kart Royale and Summit Run SHALL support partial World presentation through safe atmosphere and distant scenery slots. Summit Run SHALL retain its snow-sport identity using climate-appropriate interpretations. Downhill Mayhem SHALL support ambient World presentation initially. None of these integrations SHALL reset a game, change its course, timing, rules, deterministic simulation or authority. Native and generic fallbacks SHALL remain usable for every World.

#### Scenario: Coastal snowboarding
- **WHEN** a coastal visitor enters Summit Run
- **THEN** it uses a compatible cold maritime atmosphere while preserving its snow terrain, ramps, gates and mechanics.

#### Scenario: Identical race inputs
- **WHEN** identical race inputs and seeds are replayed under all six Worlds
- **THEN** trajectories, checkpoint results and race timing are identical.

### Requirement: Reusable composition

World identity SHALL be composed from shared atmosphere, reusable kit resources and optional bounded View overrides. Adding a World SHALL NOT require a complete scene for every View. Cosmetic anchors SHALL identify placements and exclusions independently of gameplay interaction markers. At least two theater regions SHALL demonstrate reuse of a common kit without duplicating the theater or its functional geometry.

#### Scenario: Shared kit in arcade and lounge
- **WHEN** the arcade exterior and lounge exterior reference the same World asset
- **THEN** they reuse the asset resource with independent safe placements and release ownership independently.

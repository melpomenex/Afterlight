# player-identity

## MODIFIED Requirements

### Requirement: Atmospheric Nickname Generation and Sanitization
The system SHALL provide an atmospheric procedurally generated default nickname using adjective, machine/urban noun, and number components (e.g., CopperLantern42, RustCompass17), while validating and sanitizing player-chosen nicknames. The generated word bank SHALL contain no produce, plant or gardening terms, and no fallback name SHALL be "Gardener".

#### Scenario: Player accepts auto-generated nickname
- **WHEN** a new player joins without entering a custom nickname
- **THEN** the system assigns a generated thematic nickname matching the industrial/afterlight naming conventions

#### Scenario: Custom nickname validation and sanitization
- **WHEN** a player submits a custom nickname containing HTML tags, control characters, or excessive length (>20 chars)
- **THEN** the server strips unsafe characters, trims whitespace, caps length, and returns the sanitized nickname

#### Scenario: Duplicate nickname resolution
- **WHEN** two active players share the same sanitized nickname base
- **THEN** the server appends a disambiguating numeric suffix to distinguish them in the game

### Requirement: Avatar Differentiation and Remote Movement Interpolation
The system SHALL render distinctive procedural player avatars (maintenance-robot silhouette with outfit colors derived from player ID) with no farming tools or gardener props attached, and SHALL smoothly interpolate remote player positions and rotations at 8–15 Hz without visual teleportation.

#### Scenario: Rendering remote players
- **WHEN** another player enters or moves within the same room
- **THEN** the client renders their custom procedural player avatar with an overhead nickname plate and smoothly interpolates their position and walking animation

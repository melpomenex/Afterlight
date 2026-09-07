## Purpose

Manages guest player identity, deterministic nickname generation and validation, visual character customization, and remote player rendering with smooth interpolation.

## Requirements

### Requirement: Guest Token Generation and Persistence
The system SHALL generate a unique persistent UUID guest token on first launch and store it in local storage, reusing it on subsequent launches without requiring mandatory account creation.

#### Scenario: First-time guest connection
- **WHEN** a player visits the game without an existing guest token in local storage
- **THEN** the client generates a unique UUIDv4 token, stores it locally, and sends it during server connection handshake

#### Scenario: Returning guest connection
- **WHEN** a player returns to the game with an existing guest token stored locally
- **THEN** the client transmits the saved token to resume the existing player session and restored data

### Requirement: Atmospheric Nickname Generation and Sanitization
The system SHALL provide an atmospheric procedurally generated default nickname using adjective, nature/produce noun, and number components (e.g., MossRadish42, AmberCarrot24), while validating and sanitizing player-chosen nicknames.

#### Scenario: Player accepts auto-generated nickname
- **WHEN** a new player joins without entering a custom nickname
- **THEN** the system assigns a generated thematic nickname matching the atmospheric naming conventions

#### Scenario: Custom nickname validation and sanitization
- **WHEN** a player submits a custom nickname containing HTML tags, control characters, or excessive length (>20 chars)
- **THEN** the server strips unsafe characters, trims whitespace, caps length, and returns the sanitized nickname

#### Scenario: Duplicate nickname resolution
- **WHEN** two active players share the same sanitized nickname base
- **THEN** the server appends a disambiguating numeric suffix to distinguish them in the game and economy

### Requirement: Avatar Differentiation and Remote Movement Interpolation
The system SHALL render distinctive procedural gardener avatars (with apron, hat, boots, and tools) with colors derived from player ID, and SHALL smoothly interpolate remote player positions and rotations at 8–15 Hz without visual teleportation.

#### Scenario: Rendering remote players
- **WHEN** another player enters or moves within the same room
- **THEN** the client renders their custom procedural gardener avatar with an overhead nickname plate and smoothly interpolates their position and walking animation

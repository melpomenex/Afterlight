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
The system SHALL render distinctive procedural player avatars (maintenance-robot silhouette with outfit colors derived from player ID) with no farming tools or gardener props attached, and SHALL smoothly interpolate remote player positions and rotations at 8–15 Hz without visual teleportation. On the negotiated live binary path, remote avatars SHALL be driven by the ongoing entity stream rather than only by join-time messages, and a decode-session reset (room travel, rejoin, or renderer/worker start) SHALL NOT remove and recreate remote avatars in a loop. Each remote guest SHALL own exactly one avatar keyed to that guest's identity, and the local player and Kiln SHALL NOT be rendered as remote avatars.

#### Scenario: Rendering remote players
- **WHEN** another player enters or moves within the same room
- **THEN** the client renders their custom procedural player avatar with an overhead nickname plate and smoothly interpolates their position and walking animation

#### Scenario: Remote movement on the negotiated binary path
- **WHEN** the binary data plane is negotiated and another player moves through the place
- **THEN** that player's avatar receives position, rotation, and pose-flag updates from the binary entity stream after the join roster and interpolates smoothly, instead of freezing at the join-roster position

#### Scenario: Room travel never flickers remote avatars
- **WHEN** the local player travels to another place while a remote player is present, or the decoder session otherwise re-establishes itself
- **THEN** the remote avatar is not repeatedly cleared and recreated, and after the destination roster applies it remains stable and keeps receiving movement updates

#### Scenario: Stable avatar identity
- **WHEN** binary entity rows for a remote player arrive, including spawn rows that are not accompanied by a resolved guest id (for example the WASM decode path)
- **THEN** the client updates the single avatar keyed to that player's guest id, creates no placeholder avatar under the numeric entity id, and never creates remote avatars for the local guest or Kiln

## Purpose

Defines how Afterlight exposes objective-free social destinations while preserving district identities, travel, specialized venues and existing player data.

## ADDED Requirements

### Requirement: Registered social places

The system SHALL support immutable registered definitions of environment, venue and view places, with finite bounds, safe actor spawns, display identity and declared capabilities. New social places SHALL NOT require restoration objectives. Invalid definitions SHALL fail validation before activation.

#### Scenario: Objective-free environment

- **WHEN** a registered environment has no objective or field note
- **THEN** it can be built, entered and used without inventing completion metadata.

#### Scenario: Small view

- **WHEN** a valid view uses smaller bounds and no travel gates
- **THEN** movement and minimap use its bounds and the Places selector remains an exit.

#### Scenario: Bad definition

- **WHEN** duplicate IDs, invalid bounds or unknown builder keys are registered
- **THEN** validation reports the offending definition and prevents its activation.

### Requirement: Atomic local travel

Travel SHALL prepare a valid destination before leaving the current place, then change world, collisions, bounds, spawns, atmosphere, identity and accessibility metadata together. It SHALL clear prior seat, nearest interaction, movement target, held keys, pointer gesture, jump momentum and transient emote. A stale garden snapshot SHALL NOT become district completion state.

#### Scenario: Travel from a garden while interacting

- **WHEN** the player travels with a held jump, selected bed and received garden data
- **THEN** destination spawns grounded with no old target/seat and only its own interactions and completion state.

#### Scenario: Builder failure

- **WHEN** destination construction fails
- **THEN** the previous world and membership remain active and a retryable travel error is available.

#### Scenario: Rapid travel

- **WHEN** a previous destination finishes asynchronous work after a newer activation
- **THEN** the stale result cannot change the active place, audio, media or HUD.

### Requirement: Stable identities and return behavior

The system SHALL preserve court, rooftops, theater and all existing district save IDs, legacy gate destinations and valid saved progress. Theater SHALL remain default entry without a query override. Unknown deep links SHALL visibly fall back to Theater rather than joining a room different from the rendered world.

#### Scenario: Existing save

- **WHEN** a save includes restored rooftops and visited court
- **THEN** both remain valid without conversion or loss of unrelated save fields.

#### Scenario: Existing garden shortcut

- **WHEN** the URL uses room=garden
- **THEN** the player enters their personal cultivation room, while the registered garden district remains separately selectable.

#### Scenario: Unknown room

- **WHEN** a URL names an unregistered public destination
- **THEN** the rendered and requested room are both Theater and the fallback is explained.

### Requirement: Specialized venues remain independent

Theater SHALL preserve its seats, projected screen aspect/homography, cinema mode, all playback engines, shared timeline, queue, imports, playlists, IPTV/EPG, torrent picks/grants and late-join behavior. Generic place activation SHALL NOT replace its media synchronization.

#### Scenario: Theater round trip

- **WHEN** a player leaves Theater for an environment and returns while media is playing
- **THEN** old environment effects stop and Theater resumes its authoritative current item/timeline with existing controls and local lists intact.

#### Scenario: External seat

- **WHEN** a visitor sits on an environment bench
- **THEN** the avatar sits without opening Theater cinema mode or showing its screen.

#### Scenario: Specialized controller failure

- **WHEN** a venue controller cannot activate
- **THEN** travel to other places remains available and the failure does not corrupt room membership.

### Requirement: Resource lifetime is place scoped

Only the active place SHALL receive costly audiovisual updates. Deactivation SHALL stop local audio within 200ms, cancel pending events, hide local lights and remove active emitter resources; repeated cleanup SHALL be safe. Shared actor and renderer resources SHALL survive travel.

#### Scenario: Hidden place

- **WHEN** a weather place is hidden for 600 rendered frames
- **THEN** its effect update count, particle uploads and active sound sources remain zero.

#### Scenario: Repeated travel

- **WHEN** a player completes 20 round trips between two cached places
- **THEN** active emitter/listener/source counts return to their baseline each time without disposing another place’s resources.

### Requirement: Room membership and opt-in voice

Places SHALL reuse existing room membership and desired-room reconnect semantics. Tagged room output SHALL be discarded when it belongs to a previous room, including output awaiting binary encoding. Entering or reconnecting SHALL NEVER start microphone/camera capture or automatically join a call.

#### Scenario: Queued old room frame

- **WHEN** an old-room frame arrives after travel
- **THEN** it cannot create old avatars, alter atmosphere or update the new room’s epoch.

#### Scenario: Voice unavailable

- **WHEN** the conferencing adapter is absent or disabled
- **THEN** seating, chat, travel and Theater still work and no capture prompt appears.

#### Scenario: Leave with a call

- **WHEN** a visitor leaves a place while an opt-in call adapter is active
- **THEN** local capture stops and call association/ducking is cleared through the existing conferencing lifecycle.

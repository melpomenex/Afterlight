## Purpose

Make activities discoverable, playable and watchable inside Afterlight places while preserving travel, companionship and existing media.

## ADDED Requirements

### Requirement: Validated place declarations
Each activity SHALL have a stable place-local ID, supported type/rules version, finite transform, footprint, interaction radius, participant anchors, capacity and spectator policy. Missing activity declarations SHALL mean no activities. Invalid or duplicate declarations SHALL fail validation on both client and server projections.

#### Scenario: Invalid content
- **WHEN** a declaration has a duplicate ID, unknown type or out-of-bounds anchor
- **THEN** validation names the place and activity before it becomes playable.

#### Scenario: Compatibility
- **WHEN** an existing place declares no activities
- **THEN** its existing controls and world still work.

### Requirement: World interaction and visibility
Players SHALL enter from a nearby physical object using E or an equivalent accessible button. Accepted participation SHALL stop avatar movement and preserve the avatar for other occupants; Kiln SHALL remain in the world. Spectators SHALL see canonical gameplay on the physical table or cabinet without joining play. Activities SHALL NOT require payment, progression or travel to an isolated scene.

#### Scenario: Three visitors
- **WHEN** two visitors play while a third walks past
- **THEN** the third sees their avatars and live game state at the object.

#### Scenario: Occupied activity
- **WHEN** a visitor interacts with a full table
- **THEN** watch and queue actions are available and never silently replace a player.

### Requirement: Exclusive control and exit
Activity controls SHALL own gameplay input only while active. Chat/dialog focus and window blur SHALL neutralize activity input; typing SHALL never control the activity. Escape SHALL dismiss the top dialog/chat first, otherwise leave activity mode before settings. Leave, travel, disconnect and failed entry SHALL restore usable world controls and clear movement, jump, pointer and pending activity input.

#### Scenario: Travel during join
- **WHEN** the player travels before a join response arrives
- **THEN** the response cannot capture the new room camera or controls and old membership is released.

#### Scenario: Chat during match
- **WHEN** a player opens chat and types WASD or Space
- **THEN** the avatar and activity receive no movement/fire input from typing.

#### Scenario: Escape
- **WHEN** an active player with no focused dialog presses Escape
- **THEN** the player leaves immediately locally and can walk safely beside the object.

### Requirement: Shared lifecycle and resources
Only active-place activity visuals/audio SHALL update. Returning SHALL obtain current state. Physical layouts SHALL retain navigable entrances, exits, seats and theater sightlines. Cabinet rendering SHALL preserve the existing theater DOM screen and all four world views.

#### Scenario: Repeated travel
- **WHEN** a player visits and leaves an activity place twenty times
- **THEN** there are no accumulating timers, audio nodes or render targets, and legacy interactions still work.

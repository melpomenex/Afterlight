## Purpose

Guarantees that a connected player reliably becomes a member of a district room, so room-scoped multiplayer — presence events and movement relay — works from the first moment of connection, including when the room request races the WebSocket handshake or the connection drops and recovers.

## Requirements

### Requirement: Room membership established on connect
The system SHALL ensure that every connected player becomes a member of a room — their requested room if one was requested, otherwise the default Market Court — such that the player both receives that room's presence broadcasts and has their own movement relayed to the room.

#### Scenario: Room request sent before the socket opens
- **WHEN** a client requests a room join during page load, before the WebSocket handshake completes
- **THEN** the client still ends up a member of the requested room once connected, and receives presence events for other members of that room

#### Scenario: No room requested
- **WHEN** a client connects without requesting a specific room
- **THEN** the player is placed in the default Market Court room and is reachable by its broadcasts

### Requirement: Room membership re-established after reconnect
The system SHALL re-establish the player's room membership after a disconnection and successful reconnect, without requiring the player to reload the page.

#### Scenario: Reconnect after connection loss
- **WHEN** the client's connection drops and automatically reconnects
- **THEN** the player rejoins their previous room and resumes receiving that room's presence events

### Requirement: Room-scoped presence delivery
The system SHALL deliver join, leave, and movement presence events for a room only to members of that room, and SHALL deliver them to every member of that room.

#### Scenario: Two players in the same district
- **WHEN** a second player enters the same district room
- **THEN** each player receives the other's presence join and ongoing movement updates

#### Scenario: Players in different districts
- **WHEN** two connected players occupy different district rooms
- **THEN** neither receives the other's presence or movement events

### Requirement: Movement from players without room membership is ignored
The system SHALL ignore movement updates from a player who is not a member of any room, without errors and without corrupting any player's state.

#### Scenario: Movement before room assignment completes
- **WHEN** a connected player sends movement updates while belonging to no room
- **THEN** the server drops the updates silently and no other player receives them

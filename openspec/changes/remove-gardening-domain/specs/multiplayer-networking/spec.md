# multiplayer-networking

## MODIFIED Requirements

### Requirement: Room-Based Networking and Scoped Presence
The system SHALL organize clients into isolated rooms — the Market Court (`market`) and every public place id (`theater`, and the manifest's other place ids) — broadcasting movement and room interactions only to players co-located in the same room.

#### Scenario: Joining a room
- **WHEN** a player navigates to the Market Court or any public place
- **THEN** the server updates their room membership, notifies existing occupants in that room, and synchronizes presence

#### Scenario: Leaving a room
- **WHEN** a player moves to another room or disconnects
- **THEN** occupants of the departed room receive a leave notification and remove the remote avatar

### Requirement: Authoritative Validation and Reconnect Resilience
The server SHALL be authoritative over room membership, presence relay and movement validation, and SHALL support automatic client reconnection with exponential backoff and state reconciliation.

#### Scenario: Client reconnection after temporary disconnect
- **WHEN** a client WebSocket connection drops and reconnects
- **THEN** the client sends its persistent guest token, the server restores player state without progress loss, and the client resynchronizes full room and player data

#### Scenario: Rejection of invalid client commands
- **WHEN** a client transmits an invalid action (such as a non-finite movement pose or a durable command without live room membership)
- **THEN** the server rejects the request or drops the input with bounded feedback and preserves authoritative state integrity

### Requirement: Atomic Server Persistence
The server SHALL serialize player profiles and their current room atomically to durable storage, ensuring that retained account and room-selection state survives server restarts; the retained theater and catalog domains persist through their own stores.

#### Scenario: Server restart recovery
- **WHEN** the server process restarts and initializes
- **THEN** all saved player profiles and current-room selections are restored accurately from disk

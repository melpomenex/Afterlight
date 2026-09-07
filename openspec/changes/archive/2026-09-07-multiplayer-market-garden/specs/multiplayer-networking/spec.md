## Purpose

Delivers real-time WebSocket communication, room partitioning, authoritative simulation, state synchronization, resilient reconnects, and atomic file-backed persistence.

## ADDED Requirements

### Requirement: Room-Based Networking and Scoped Presence
The system SHALL organize clients into isolated rooms (`market`, `garden:<playerId>`, `glasshouse:<playerId>`), broadcasting movement and room interactions only to players co-located in the same room.

#### Scenario: Joining a room
- **WHEN** a player navigates to the Market Court or a garden
- **THEN** the server updates their room membership, notifies existing occupants in that room, and synchronizes presence

#### Scenario: Leaving a room
- **WHEN** a player moves to another room or disconnects
- **THEN** occupants of the departed room receive a leave notification and remove the remote avatar

### Requirement: Authoritative Validation and Reconnect Resilience
The server SHALL be authoritative over coin balances, inventory quantities, crop maturation, and economic trades, and SHALL support automatic client reconnection with exponential backoff and state reconciliation.

#### Scenario: Client reconnection after temporary disconnect
- **WHEN** a client WebSocket connection drops and reconnects
- **THEN** the client sends its persistent guest token, the server restores player state without progress loss, and the client resynchronizes full room and player data

#### Scenario: Rejection of invalid client commands
- **WHEN** a client transmits an invalid action (such as spending unowned coins or planting without seeds)
- **THEN** the server rejects the request with an error packet and preserves authoritative state integrity

### Requirement: Atomic Server Persistence
The server SHALL serialize player profiles, gardens, inventories, and market order states atomically to durable storage, ensuring persistence survives server restarts.

#### Scenario: Server restart recovery
- **WHEN** the server process restarts and initializes
- **THEN** all saved players, garden beds, active crop growth states, wallets, and order books are restored accurately from disk

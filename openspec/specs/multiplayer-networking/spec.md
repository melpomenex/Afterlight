## Purpose

Delivers real-time WebSocket communication, room partitioning, authoritative simulation, state synchronization, resilient reconnects, and atomic file-backed persistence.

## Requirements

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

### Requirement: Gateway WebSocket Origin Policy
The gateway SHALL accept WebSocket connections only from the browser origins it is explicitly configured to serve — at minimum the development client origins (the Vite dev server on `localhost`/`127.0.0.1`) and the deployed production frontend origin — and SHALL reject upgrades from unlisted origins. The development stack's default configuration SHALL include its own client origin, so `npm run dev:stack` works with no extra environment setup. When an origin is rejected, or when the gateway's origin configuration is missing or malformed, the failure SHALL be diagnosable: the gateway logs the rejected origin, and a stack-level connectivity check SHALL fail loudly (non-zero exit / visible error) rather than leaving the client in an indefinite silent reconnect loop.

#### Scenario: Development client connects to the gateway
- **WHEN** the game client served by the development server opens a WebSocket to the gateway using a valid guest token
- **THEN** the upgrade succeeds and the client reaches the joined state without manual configuration

#### Scenario: Unlisted origin rejected
- **WHEN** a WebSocket upgrade arrives from an origin that is not in the gateway's configured origin list
- **THEN** the gateway refuses the upgrade, and the rejection is visible in the gateway's logs with the offending origin

#### Scenario: Misconfigured origins fail loudly
- **WHEN** the stack's connectivity smoke check runs against a gateway whose origin configuration does not include the client origin
- **THEN** the check reports the specific failing handshake (origin and status) and exits non-zero instead of passing

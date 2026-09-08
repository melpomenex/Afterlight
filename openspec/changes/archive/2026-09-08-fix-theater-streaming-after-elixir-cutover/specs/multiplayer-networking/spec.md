## ADDED Requirements

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

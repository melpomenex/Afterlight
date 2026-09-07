# elixir-foundation

## MODIFIED Requirements

### Requirement: Minimal supervision tree, owning nothing

The application supervision tree SHALL start the Repo, a PubSub, telemetry, and the web Endpoint. From this change onward it SHALL additionally start the gateway's own processes: the transient session registry and the connect rate limiter. The Endpoint SHALL accept game protocol traffic through the socket surface this change defines (`/ws` → `AfterlightWeb.UserSocket` → `AfterlightWeb.GameChannel`) and through no other surface; the foundation's own scope remains free of game traffic. It SHALL NOT start room processes, presence or membership structures, domain contexts, or any scheduler of game behavior (those arrive with `add-world-room-runtime` and the Ash domain phases). The Node server SHALL remain the sole authoritative writer for every durable domain still assigned to it in `docs/architecture/elixir/ownership.md`.

#### Scenario: supervision tree grows only by declared phases

- **WHEN** the application starts in a deployment whose domain router routes every game domain to `node` and before the world runtime lands
- **THEN** the Repo, PubSub, telemetry, Endpoint, and the gateway's session registry and rate limiter are running
- **AND** no room, presence, membership, or game-domain process exists beyond the gateway surfaces this change defines

#### Scenario: game protocol arrives only through declared gateway surfaces

- **WHEN** a client connects and plays through the Phoenix endpoint with this change active
- **THEN** the traffic enters via the `/ws` UserSocket and GameChannel, and no other endpoint surface accepts game protocol messages

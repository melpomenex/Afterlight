# elixir-foundation

## MODIFIED Requirements

### Requirement: Minimal supervision tree, owning nothing

The application supervision tree SHALL start the Repo, a PubSub, telemetry, and the web Endpoint, plus the gateway processes added by `add-phoenix-gateway-transport` (transient session registry, connect rate limiter). From this change onward it SHALL additionally start the World supervisor: the `Afterlight.World` room registry and its DynamicSupervisor of per-room RoomServer processes. Room processes own transient world state only (rosters, poses, emote cooldowns) — the tree still SHALL NOT start durable domain contexts or any scheduler of durable game behavior. The Node server SHALL remain the sole authoritative writer for every durable domain still assigned to it in `docs/architecture/elixir/ownership.md`.

#### Scenario: world processes join the tree

- **WHEN** the application starts with this change active
- **THEN** the World supervisor and its DynamicSupervisor are running under the P1 tree alongside the Repo, PubSub, telemetry, Endpoint, and gateway processes
- **AND** no durable domain context or writer is started by the Elixir app

#### Scenario: room processes are transient only

- **WHEN** rooms start and stop under the DynamicSupervisor during play
- **THEN** no durable store, file, or table is read or written by any room process

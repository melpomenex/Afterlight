# realtime-live-wiring

## Purpose
The flag-gated client integration of the binary data plane: additive transport
hooks, capability advertisement, pipeline composition with the existing
renderer contract, and unconditional legacy neutrality when flags are off or
the server does not negotiate.

## ADDED Requirements

### Requirement: Additive-only transport integration
Binary-frame routing and capability advertisement SHALL be additive: without the `realtime_binary` flag, hello SHALL NOT carry the `rt` object, binary frames SHALL be dropped exactly as before, and no pipeline code SHALL run. With the flag on a legacy server, the `rt` hello field SHALL be ignored server-side and the session SHALL proceed entirely on the JSON path.

#### Scenario: Flags off are byte-identical

- **WHEN** the game runs with no rt flags
- **THEN** the wire carries the legacy hello without an `rt` field and no pipeline module is instantiated

#### Scenario: Legacy server ignores capabilities

- **WHEN** hello advertises `rt` to a server without binary support
- **THEN** the server ignores the field and gameplay proceeds unchanged on JSON

### Requirement: Self-disarming negotiation and renderer-contract consumption
When the server's `welcome` lacks an `rt` reply, the wiring SHALL disarm (detach the binary handler, clear advertisement, dispose the pipeline). When active, the pipeline's output SHALL reach the renderer only through the existing `RemotePlayersManager` contract (`setPlayer`/`removePlayer`), room travel SHALL reset the pipeline, and resync SHALL reuse the desired-room join replay — no new message types.

#### Scenario: Disarm on legacy welcome

- **WHEN** a negotiating client receives a `welcome` without `rt`
- **THEN** the binary handler detaches and subsequent traffic flows exactly as legacy

#### Scenario: Resync reuses the join replay

- **WHEN** the pipeline signals a baseline-gap resync
- **THEN** the client replays `join_room` for its desired room and the fresh snapshot restores exact state

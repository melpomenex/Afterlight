# Port Backend to Elixir/Phoenix/Ash (umbrella)

## Why

Afterlight's durable state is a synchronously rewritten whole-file JSON blob (`server/storage.js`) and its realtime layer is a single raw-WebSocket Node process. This cannot atomically transfer assets between players, cannot survive failures without divergence between memory and disk, and has no path to the 1,000-session target. The architecture package (`docs/architecture/elixir/`) selects Elixir/Phoenix with PostgreSQL for durable truth, supervised OTP room processes for realtime state, and Ash as the durable domain layer. The playable Three.js client is an asset to preserve, not debt to replace.

This change is the umbrella that governs the migration sequence. It establishes the single-writer rule, the parity-before-authority rule, and the phase gates; the subordinate changes implement each phase.

## What Changes

- Introduce an Elixir/Phoenix/Ash application (`server_elixir/`) alongside the existing Node server, initially owning nothing.
- Add a protocol/domain router at the gateway so unmigrated domains keep being served by Node over a private authenticated boundary while migrated domains are served by Phoenix/Ash.
- Replace client-trusted guestIds with server-signed guest credentials; preserve `NetworkClient` semantics via a Phoenix Channels adapter.
- Move durable domains one at a time to Ash/AshPostgres/PostgreSQL with deterministic JSON import, validation, and read-only retention of the originals: accounts → theater+catalog → gardens+economy+restoration (one transactional group).
- Keep transient world state (movement, presence) in supervised OTP room processes; move the chat relay to `Afterlight.Social` in the P7 window (`add-social-chat-relay`); keep WebTorrent and IRC as authenticated Node sidecars; treat conferencing as an independent media spike.
- Preserve every existing behavior of the Three.js frontend; no LiveView rewrite, no frame-rate state over the network beyond today's 10 Hz snapshots, no dual writes at any point.

Depends on: nothing (this is the root change). Subordinates, in dependency order:

| # | Change | Phase gate |
|---|---|---|
| 00 | `add-parity-fixture-baseline` | Fixtures reproducible; runner green before any authority moves |
| 01 | `add-elixir-phoenix-foundation` | App compiles/tests; Node game untouched |
| 02 | `add-phoenix-gateway-transport` | Two browsers join via Phoenix; unmigrated domains proxied; signed identity |
| 03 | `add-world-room-runtime` | Supervised rooms; reconnect resnapshots; no mailbox growth |
| 04 | `add-ash-accounts-domain` | Identity server-derived; legacy players imported; idempotent |
| 05 | `add-ash-theater-catalog-domains` | Theater/catalog parity green; Node writes disabled for them |
| 06 | `add-ash-gardens-economy-restoration` | Conservation under concurrency; atomic fills; retry-safe |
| 07 | `add-node-specialty-adapters` | Torrent/IRC behind authenticated grants; game survives sidecar loss |
| 07a | `add-social-chat-relay` | Chat relay moves to `Afterlight.Social` in the P7 window; IRC adapter boundary; game chat survives sidecar loss |
| 08 | `add-conferencing-media-spike` | Explicit go/no-go on SFU with measurements; game unaffected |
| 09 | `add-distributed-room-ownership` | Lease/epoch fencing proven under partition |
| 10 | `add-observability-security-loadtesting` | 1k-session profile measured honestly; failure suites green |
| 11 | `remove-node-server-authority` | No Node writer remains for migrated domains; suites green |

## Capabilities

### New Capabilities

- `migration-governance`: the ownership, cutover, parity, and rollback rules every subordinate change must satisfy.

### Modified Capabilities

None. This change creates the governance capability; subordinates declare their own capability deltas against it and against the client contract.

## Impact

- **Client**: none required for this umbrella; subordinates preserve `src/net/client.js` behavior behind a transport adapter (`src/net/`). Three.js ownership of canvas/rAF/input/camera/theater DOM is inviolable.
- **Server**: new `server_elixir/` Elixir app; existing `server/` remains authoritative for unmigrated domains and later loses authority domain-by-domain (P11 removes the rest).
- **Shared**: `shared/*.js` pure rules are frozen as the parity reference; Elixir ports must match fixtures before cutover.
- **Persistence**: `data/*.json` become read-only snapshots after their domain's cutover; PostgreSQL becomes durable truth.
- **Docs**: `docs/architecture/elixir/ownership.md`, `protocol-catalog.md`, `parity-notes.md` are the coordination contract; architecture README/decisions gain the Ash ADR.
- **Tests**: the existing `node --test` suite stays green throughout; each subordinate adds parity/unit/DB/concurrency layers per its phase gate.

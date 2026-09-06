# migration-governance

## Purpose

Define the rules that keep Afterlight's backend migration safe: a single authoritative writer per durable domain, parity proven before authority transfers, an explicit client-compatibility contract, and a rollback posture that is honest about what is reversible. Every subordinate migration change MUST satisfy these requirements; reviewers reject changes that weaken them.

## ADDED Requirements

### Requirement: Single-writer authority

The system SHALL maintain exactly one authoritative writer for each durable domain at every instant during and after the migration. The mapping of domain → owner SHALL be recorded in `docs/architecture/elixir/ownership.md` and updated by every change that moves authority. Message routing between the legacy Node server and the Phoenix gateway SHALL be decided server-side by domain; clients SHALL NOT select the implementation that serves a domain.

#### Scenario: no dual writes

- **WHEN** a subordinate change enables the Elixir/Ash writer for a domain
- **THEN** the corresponding Node write paths for that domain are disabled in the same change
- **AND** no configuration exists in which both write the same durable domain

### Requirement: Parity before authority

The Elixir implementation of a domain's deterministic rules SHALL reproduce the JS parity fixtures for that domain before any change flips authority for it. Fixtures SHALL be language-neutral JSON with pinned clock, seed (where applicable), and masked generated identifiers, per `docs/architecture/elixir/parity-notes.md`.

#### Scenario: fixtures gate a cutover

- **WHEN** a change proposes to route a domain's writes to the Elixir implementation
- **THEN** the parity suite for that domain's rules passes against the exported fixtures
- **AND** the change records the fixture run in its verification evidence

### Requirement: Client preservation

The migration SHALL NOT alter observable behavior of the Three.js client: canvas ownership, requestAnimationFrame, input, camera, local prediction, theater DOM overlay/homography, minimap, and HUD remain browser-owned. Any LiveView or server-rendered surface introduced around the game SHALL NOT own DOM descendants of the game island (`phx-update="ignore"` or equivalent). The `NetworkClient` public API, message semantics, `desiredRoom` reconnect replay, snapshot-before-delta ordering, and self-echo filtering SHALL be preserved by any transport adapter.

#### Scenario: transport swap is invisible

- **WHEN** a client is served by the Phoenix gateway instead of the Node WebSocket
- **THEN** two browsers see equivalent presence, emotes, seated/airborne flags, chat, and theater state
- **AND** a disconnect/reconnect restores the desired room and full snapshots without a second logical session

### Requirement: Declared tightenings

The migration MAY declare narrow, server-side-only behavior tightenings (e.g. bounds clamping, duplicate-connect supersession) provided each is named in the migrating change's design and recorded in `docs/architecture/elixir/protocol-catalog.md` §"Declared tightenings" with a client-impact analysis. Behavior changes that are not so declared SHALL be treated as parity failures.

#### Scenario: A tightening is traceable

- **WHEN** a migration change alters server-side behavior in a way a modified or non-compliant client could observe
- **THEN** that tightening is named in the change's design and listed in the protocol catalog's declared-tightenings section with its client-impact analysis
- **AND** spec-compliant clients observe no difference

### Requirement: Durable command contract

Durable mutations SHALL carry `{protocol_version, request_id, expected_revision, payload}` with actor identity derived from the server-verified session, never from client-supplied IDs. The system SHALL persist deduplication receipts keyed by actor and request_id including payload hash, SHALL reject a reused request_id with a different payload, and SHALL make exact retries idempotent. Every durable command class SHALL declare its receipt key in the change that migrates it: classes carrying a client correlation id (garden/node/machine `actionId`, order `orderId`, torrent/playlist `requestId`) SHALL use it as the receipt key; classes without one (`market_buy`, `market_sell`, `contract_complete`, the theater queue/control ops, `iptv_list_remove`, `set_nickname`) SHALL be given SERVER-MINTED receipt ids with documented NO-DEDUP interim semantics (transport-level at-least-once delivery; effects defined idempotent-by-value where they are), and the change migrating them SHALL state this explicitly. Post-commit publication SHALL use an outbox pattern with at-least-once delivery; consumers SHALL tolerate repeated event IDs/revisions. Under overload the system SHALL reject durable commands before execution with a retryable response rather than silently discarding them; transient movement MAY be coalesced or dropped under the documented rules.

#### Scenario: Retried command has one effect

- **WHEN** the same durable command (actor, request_id, payload) is delivered twice across a reconnect
- **THEN** its economic effect is applied exactly once
- **AND** the second delivery returns the original outcome without re-executing

#### Scenario: Every command class declares its receipt key

- **WHEN** a change migrates a durable command class that carries a client correlation id
- **THEN** that id is the receipt key and exact retries dedup as above
- **AND** a class carrying no client correlation id is given a server-minted receipt id with documented no-dedup interim semantics, stated in the migrating change before the flip

### Requirement: Money and inventory correctness

Coins and item quantities SHALL be integers end-to-end with nonnegative database constraints. A market fill SHALL commit buyer balance, seller balance, reservations, both inventories, order remainders, fee, trade record, ledger entries, receipt, and outbox record in a single transaction with deterministic lock ordering. Harvest SHALL commit bed state and inventory mutation atomically. GenServer state alone SHALL NOT be relied upon for financial correctness.

#### Scenario: concurrent fills cannot oversell

- **WHEN** two buyers concurrently fill the same resting sell order
- **THEN** one fill succeeds for the remaining quantity and the other is rejected or partially filled by remaining quantity only
- **AND** total coins and inventory across all players are conserved including explicit fees

### Requirement: Cutover and rollback honesty

Each authority flip SHALL follow freeze → snapshot with hash → idempotent import → validate (counts, totals, conservation) → route → enable writer → retain source read-only. After PostgreSQL receives authoritative writes for a domain, reverting to JSON as the writer SHALL NOT be considered a valid rollback; the change SHALL document forward-fix and reverse-export (under write freeze) behavior instead.

#### Scenario: import is repeatable

- **WHEN** the same source snapshot is imported twice
- **THEN** the second import is a no-op (idempotent) and validation reports identical counts and totals

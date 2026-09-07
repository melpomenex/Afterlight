# accounts-domain

## Purpose

Durable session identity for Afterlight: guest sessions live in PostgreSQL as Ash resources owned by `Afterlight.Accounts`, identity derives from server-issued signed tokens, nicknames sanitize and deduplicate with byte-exact parity against the JS reference (ports proven now, routed at the P6 activation), legacy players import idempotently from the JSON snapshot as a read-only shadow migration source, and the command-receipt/outbox infrastructure that every later migration phase reuses lands here. The authority this capability takes in P4 is identity/session-only (session token binding, revocation, expiry; receipts; outbox): the `players` record stays Node-authored in `game-state.json` until the P6 economy-group flip activates the `Player` resource as writer. Governance rules it operates under are defined in `migration-governance`.

## ADDED Requirements

### Requirement: Players schema as a read-only shadow import

The system SHALL define the `Afterlight.Accounts.Player` resource mapped to a `players` table with the stable guest id string as primary key, and columns `nickname`, `coins`, `xp`, `level`, `reputation`, `reserved_coins` (integers with nonnegative database CHECK constraints; level >= 1), `inventory` and `materials` (validated jsonb, interim until the P6 economy normalization), `current_room`, and `last_seen` (epoch milliseconds). In P4 these rows SHALL be a read-only shadow populated by the snapshot-hashed idempotent import (a migration source): the Node-authored columns stay authoritative in `game-state.json` until the P6 economy-group flip activates the resource as writer. Phoenix SHALL write no Node-authored player column in P4 — only the session-derived `active` flag follows session lifecycle.

#### Scenario: Shadow rows survive restart

- **WHEN** the Elixir application restarts after the shadow import
- **THEN** every imported player row retains its imported values from PostgreSQL without a re-import
- **AND** no Phoenix write path for a Node-authored player column exists in P4

#### Scenario: Negative balance is unrepresentable

- **WHEN** any code path attempts to persist `coins < 0` or `reserved_coins < 0`
- **THEN** the database constraint rejects the write and the action returns a failure
- **AND** no player row with a negative integer balance can exist

### Requirement: Server-derived identity from signed sessions

The system SHALL derive the acting player exclusively from a server-issued signed token bound to a `GuestSession` row; the session SHALL record a hash of the token (never the token itself), its issue and expiry times, and its player reference. Client-supplied ids, including the localStorage guestId, SHALL NOT be accepted as authorization at any policy or action.

#### Scenario: Handshake binds token to session row

- **WHEN** a client connects with a valid signed token issued in an earlier session
- **THEN** the gateway resolves the corresponding durable session row and binds the connection to its player id
- **AND** `hello` stays relayed to Node, so the `welcome` payload is Node-built exactly as before and the guest id remains only a stable lookup key (`garden:<guestId>` room ids and self-echo filtering unchanged)

#### Scenario: Hello identity cannot diverge from the bound player

- **WHEN** a hello whose `guestId` differs from the connection's durably bound session player arrives (P2's token-claim equality rule, carried forward now that the binding is durable)
- **THEN** the gateway refuses or rewrites the hello to the bound player id, so the Phoenix actor and the relayed Node session cannot resolve two different identities for one connection

#### Scenario: Forged or absent token is rejected

- **WHEN** a client presents no token, an expired token, a revoked token, or a token whose signature does not verify
- **THEN** no actor identity is established and no accounts mutation is permitted

### Requirement: Self-scoped mutation policies

Account policies SHALL allow a session to mutate only the player row its token is bound to, and SHALL forbid reading or mutating any other player through accounts actions. No accounts action in P4 SHALL write a Node-authored player column (the shadow is read-only); session rows are strictly scoped to their own actor.

#### Scenario: Player cannot mutate another player

- **WHEN** a session invokes any accounts action addressing a player id other than its own
- **THEN** the policy denies the action without revealing whether the target exists

### Requirement: Nickname sanitization parity

The `set_nickname` action SHALL sanitize input with semantics identical to `shared/identity.js sanitizeNickname`: strip HTML tags and control characters, remove characters outside `[\w\s-]` (JS ASCII semantics), collapse whitespace, truncate to 20 UTF-16 code units with trailing trim, and fall back to a generated default nickname when the result is shorter than 3 characters. The Elixir port SHALL pass the exported parity fixtures before the accounts activation. Routing note: `set_nickname` stays Node-side in P4 (it writes a Node-authored column); the action executes against live traffic only from the P6 activation.

#### Scenario: Hostile nicknames sanitize identically

- **WHEN** the parity fixture set runs hostile inputs (tags, control chars, emoji/astral characters at the truncation boundary, whitespace runs, short garbage) through the Elixir sanitizer
- **THEN** every output is byte-identical to the JS reference output, including fallback-generated results with pinned seeds

### Requirement: Nickname deduplication ladder parity

The `allocate_nickname` flow SHALL preserve `resolveDuplicateNickname` semantics against the set of nicknames on ACTIVE players: the sanitized base if free, then `<base>2` through `<base>99` in order, then a single random 3-digit suffix. Historical (inactive) duplicate nicknames SHALL NOT block or be rewritten by allocation. Routing note: allocation is fixture-tested in P4 but executes against live traffic only from the P6 activation (nicknames are Node-authored until then).

#### Scenario: Live collision descends the ladder

- **WHEN** a second live player requests the nickname of an already-active player
- **THEN** the first free suffixed candidate (`base2`, `base3`, …) is allocated
- **AND** an exhausted ladder falls back to one random 3-digit suffix, matching the JS behavior

#### Scenario: Historical duplicates coexist

- **WHEN** the imported data contains two inactive players sharing a nickname
- **THEN** both rows are retained unchanged and neither is treated as colliding with the other

### Requirement: Case-insensitive uniqueness among active sessions

The system SHALL enforce nickname uniqueness, case-insensitively, among players with a live session, via a database partial unique index (`lower(nickname)` WHERE active — a static boolean predicate) maintained transactionally with session creation and revocation and by a bounded session-expiry reaper: a periodic job SHALL flip `active` to false when the player's last live session is revoked or expired, freeing the nickname slot (expiry does not passively flip anything). Uniqueness SHALL be enforced by the constraint (insert-retry on violation), not by check-then-insert alone. The index SHALL be created in P4 but SHALL constrain writes only from the P6 activation (P4 rows are a read-only shadow).

#### Scenario: Case variants collide while active

- **WHEN** an active player holds nickname `MossyRadish42` and another live player requests `mossyradish42`
- **THEN** the database rejects the direct insert and the allocation ladder produces a distinct nickname

#### Scenario: Revocation frees the name

- **WHEN** the holder of the last live session for a nickname has that session revoked, or the bounded expiry reaper observes the last live session expired
- **THEN** the player's `active` flag is set false and a new session may claim that exact nickname again (from the P6 activation)

### Requirement: Wire behavior unchanged; shadow import round-trips the player object

P4 SHALL change no wire payload: `hello` and `set_nickname` stay relayed to Node, so `welcome` and `inventory_state` remain Node-built with the same player object field set (`id`, `nickname`, `coins`, `xp`, `level`, `reputation`, `reservedCoins`, `inventory` with `seeds`/`produce`/`reservedProduce`/`sprinklers`, `materials`, `currentRoom`, `lastSeen`). The shadow import SHALL round-trip: for every imported row, rebuilding the legacy player object SHALL reproduce the snapshot's field set, pinning the P6 activation's payload parity in advance.

#### Scenario: Client sees no change in P4

- **WHEN** a client connects in P4 and compares `welcome` against a pre-P4 recording for the same player state
- **THEN** the payloads are identical, because hello is relayed and Node still builds and sends them

#### Scenario: Shadow import round-trips

- **WHEN** an imported player row is serialized back into the legacy player object shape
- **THEN** the field sets and values match the snapshot record exactly (after the documented `normalizePlayer` normalization)

### Requirement: Snapshot-hashed idempotent import

The `mix afterlight.import_game_state` task SHALL read `players` from a snapshot copy of `data/game-state.json` as a MIGRATION SOURCE for the read-only shadow (the live file is never frozen or written by this task): it SHALL snapshot and hash the source before reading it for import, import players upsert-by-id so a second run against the same snapshot is a no-op, validate that the imported player count and integer totals (coins, xp) equal the snapshot's, mark imported rows read-only shadow, and reproduce `normalizePlayer` exactly: players missing `materials`, `reservedCoins`, or inventory sections are normalized (missing sections defaulted, non-finite/non-positive material counts removed, values floored) before insert. The task SHALL tolerate a partial `game-state.json`: an absent or empty `players` section is reported as "nothing to import" and succeeds.

#### Scenario: Second import is a no-op

- **WHEN** the same snapshot is imported twice
- **THEN** the second run performs no writes, reports identical counts and totals, and records the same snapshot hash

#### Scenario: Count validation fails loudly

- **WHEN** the imported player count differs from the snapshot's player count, or any row fails normalization
- **THEN** the task exits non-zero with a per-row report and the flip is blocked

#### Scenario: Additive-defaults quirk normalizes cleanly

- **WHEN** the snapshot contains a player without `materials` or with `inventory.sprinklers` absent or non-positive
- **THEN** the imported row equals the result of running Node's `normalizePlayer` on that record (empty materials map, sprinklers 0, counts floored)

### Requirement: Command receipt deduplication

The system SHALL persist a `CommandReceipt` for every durable command carrying `(actor, request_id)`, with a `payload_hash` of the canonical payload and the recorded `outcome`. An exact retry SHALL return the original outcome without re-executing; a reused `(actor, request_id)` with a different `payload_hash` SHALL be rejected with a stable error before any effect. In P4 no client-facing durable command routes through Phoenix (economic commands follow in P5/P6, and `set_nickname` routes at the P6 activation); the mechanism SHALL be created and exercised by integration tests so the contract is proven before consumers arrive.

#### Scenario: Retried command has one effect

- **WHEN** the same durable command (actor, request_id, payload) is delivered twice in an integration test across a simulated reconnect
- **THEN** its effect is applied exactly once and the second delivery returns the first outcome

#### Scenario: Id reuse with different payload is rejected

- **WHEN** a client re-sends a previously used request_id with a different payload
- **THEN** the command is rejected with a stable idempotency error and no state changes

### Requirement: Outbox publication after commit

Durable accounts state changes that other systems consume SHALL be recorded as `OutboxEvent` rows in the committing transaction and published at-least-once by a relay; consumers SHALL dedupe by event id and revision. No broadcast required for correctness SHALL be sent before the commit succeeds.

#### Scenario: Publication survives a crash

- **WHEN** the process crashes after commit but before publication
- **THEN** the relay later publishes the outbox event and the consumer applies it exactly once effect

### Requirement: Session revocation and connection stickiness

The system SHALL support revoking a session (immediately invalidating its token) and SHALL run a bounded periodic session-expiry reaper that flips the player's `active` flag false when the player's last live session is revoked or expired, freeing the nickname slot (from the P6 activation). A duplicate connect with the same player identity SHALL rebind to the existing player row and session rather than creating a second logical session, preserving the P3 duplicate-connect behavior (the older transport closes without evicting the newer session).

#### Scenario: Revoked or expired token is dead on arrival

- **WHEN** a client presents a token whose session has been revoked, or whose session has expired
- **THEN** the handshake fails, and once the reaper observes the expired last live session the nickname slot is available again

#### Scenario: Duplicate connect stays one session

- **WHEN** the same player connects a second transport with the same identity while the first is still open
- **THEN** one logical session and one player row exist; closing the older transport does not evict the newer session

### Requirement: GuestId claim window

The system SHALL provide a documented claim window during which a handshake presenting a signed token plus a historical localStorage guestId binds to the shadow-imported player row with that id (the binding is recorded durably on the session row; player data authority itself activates at P6). The system SHALL document that the guest id remains a stable key and was never a secret; after the window the guestId SHALL NOT be accepted as authorization.

#### Scenario: Historical guest claims its row

- **WHEN** a returning player connects with a P2 token and the guestId present in their localStorage from the Node era
- **THEN** the token binds durably to the shadow-imported row carrying that guestId, whose imported nickname and balances round-trip to the legacy shape

### Requirement: Rollback honesty

P4 flips no existing authority — players remain Node-written and hello stays relayed — so this change SHALL NOT be required to provide a player reverse export (the P6 economy-group change owns the players cutover ceremony and its reverse export). P4's new durability (sessions, receipts, outbox) is additive; rollback SHALL be possible by reverting session issuance to the P2 transient session registry with Node untouched. After the P6 activation makes PostgreSQL authoritative for players, reverting to `game-state.json` as the writer SHALL NOT be considered a valid rollback; forward-fix is the default posture and reverse export is the documented escape hatch.

#### Scenario: P4 rollback is additive-only

- **WHEN** operators revert the session-authority activation
- **THEN** the gateway falls back to the P2 transient session registry, Node behavior is unchanged, and the new tables simply go dormant

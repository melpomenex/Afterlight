## 1. Parity fixtures for identity

- [x] 1.1 Verify `tests/fixtures/parity/` covers `identity.sanitizeNickname` (tag strip, control chars, `[\w\s-]` whitelist, whitespace collapse, 20-UTF-16-unit truncation with astral characters, <3-char fallback with pinned seed) and `resolveDuplicateNickname` (free base, ladder 2..99 in order, exhausted-ladder random fallback with pinned seed, lowercase collision, active-vs-historical sets) from the `add-parity-fixture-baseline` export; add missing cases to the exporter, not by hand.
- [x] 1.2 Port `sanitizeNickname` and the `resolveDuplicateNickname` ladder into `Afterlight` (pure, injectable RNG) and wire them into the `Afterlight.Parity` runner; UTF-16-unit truncation implemented explicitly (not grapheme slicing); runner green on all identity fixtures.
- [x] 1.3 Add a `lower()`-vs-`toLowerCase()` divergence fixture: assert post-sanitize nicknames are ASCII-only so the SQL `lower()` index folding and JS folding cannot disagree.

## 2. Ash resources and database migration

- [x] 2.1 Create the `Afterlight.Accounts` domain and `Player` resource: `id` (string PK, guest-id format validated on create), `nickname`, `coins`/`xp`/`level`/`reputation`/`reserved_coins` integers with nonnegative checks (level >= 1, defaults 0/0/1/0/0), `inventory` and `materials` jsonb with shape-validating Ash changes (known section keys, nonnegative integer values), `current_room` default `'market'`, `last_seen` epoch-ms integer, `active` boolean.
- [x] 2.2 Create `GuestSession` resource: uuid PK, `player_id` reference, `token_hash` (SHA-256, unique), `issued_at`/`expires_at`/`revoked_at` epoch-ms integers.
- [x] 2.3 Write the initial accounts migration (`priv/repo/migrations`): citext extension, `players`/`guest_sessions` tables per design D2 with CHECK constraints, `players_active_nickname_unique` partial unique index on `lower(nickname) WHERE active` (static predicate; constrains writes only from the P6 activation), `players_current_room_idx`, `guest_sessions_player_idx`, and the `guest_sessions_live_idx (player_id) WHERE revoked_at IS NULL` partial index (expiry is a query predicate, not an index predicate — a `expires_at > now()` predicate is invalid in Postgres).
- [x] 2.4 Create `CommandReceipt` (composite PK `(actor, request_id)`, `payload_hash`, `outcome` jsonb, `created_at`) and `OutboxEvent` (identity PK, aggregate/revision/event_type/payload, `published_at` null, partial unpublished index) resources + migration, as shared P5/P6 infrastructure.

## 3. Actions and policies

- [x] 3.1 Implement `create_guest_session`: verify the P2 signed token, upsert the session row (token hash stored, token never persisted), flip `players.active` true in the same transaction, and bind/claim the historical guestId per the claim window (D7).
- [x] 3.2 Implement `set_nickname` (sanitize via the parity-ported sanitizer, receipt-carrying with a SERVER-MINTED receipt id per governance — no client correlation id, documented no-dedup interim semantics) and `allocate_nickname` (JS-exact ladder; insert-retry on the unique index violation; random fallback behind the injected RNG); both are fixture-tested but not routed until the P6 activation.
- [x] 3.3 Implement `touch_last_seen` (P6-routed), session `revoke` (set `revoked_at`), and the bounded periodic session-expiry reaper (flips `active` false when the player's last live session is revoked or expired, so the nickname slot frees — expiry does not passively flip anything).
- [x] 3.4 Write policies: actor resolved only from a verified `GuestSession`; self-mutations only; no accounts action may read or write another player; no accounts action may write a Node-authored player column in P4 (only the session-derived `active` flag).
- [x] 3.5 Emit `OutboxEvent` rows for nickname and session-lifecycle changes inside the committing transaction; add the relay/poller with at-least-once publication and `published_at` stamping.

## 4. Gateway wiring and Node flip

- [x] 4.1 Keep `hello` and `set_nickname` relayed to Node in the gateway router (session/room/chat registration unchanged, `welcome` stays Node-built); on socket connect, bind the verified token to a durable `GuestSession` row and assert the exact Node field set is untouched by recording a wire-capture diff against P2 behavior.
- [x] 4.2 Preserve duplicate-connect stickiness: a second connect with the same identity rebinds the session instead of creating a second logical session; the older transport closing does not evict the newer session (port the P3 semantics test).
- [x] 4.3 Verify the negative scope: no forward-write API and no `adjust_balance`/`adjust_inventory` surface exists; `server/storage.js` and the Node player-mutating handlers are untouched (record the grep/diff evidence in verification notes).
- [x] 4.4 Mark imported `players` rows read-only shadow and add a guard test asserting Phoenix writes no Node-authored player column in P4 (only the session-derived `active` flag follows session lifecycle); `game-state.json` stays Node-authored and live-written.
- [x] 4.5 Open the guestId claim window per D7: handshake accepts token + historical guestId, binds durably on the session row to the shadow-imported row, documents window end (import + 30-day `last_seen` recency grace), and never accepts the bare guestId as authorization.

## 5. Import and export tooling

- [x] 5.1 Implement `mix afterlight.import_game_state` as the shadow MIGRATION SOURCE import: copy-aside + SHA-256 before reading (live file never frozen), `system_imports` row keyed by domain, upsert-by-id idempotency, `normalizePlayer`-equivalent repair (missing `materials`/`reservedCoins`/inventory sections, non-finite/non-positive removal, flooring), partial-file tolerance ("nothing to import" success), read-only shadow marking, and count/total validation (player count, coins and xp sums) that exits non-zero on mismatch.
- [x] 5.2 Implement `mix afterlight.export_players` as rehearsal tooling for the P6 reverse-export path (runs under an explicit write freeze; the P6 ceremony owns the authoritative cutover usage) and document it in the cutover runbook.
- [x] 5.3 Update `docs/architecture/elixir/ownership.md` rows #1/#2 (session authority P4; player data authority stays with the P6 economy-group change) and leave the `protocol-catalog.md` §3 persistence map unchanged (players remain file-written until P6).

## 6. Tests

- [x] 6.1 Ash unit tests: sanitize fallback paths, dedup ladder ordering, receipt accept/reject/replay outcomes, policy denials for cross-player access.
- [x] 6.2 DB integration tests (SQL sandbox): nonnegative CHECK constraints reject negative coins/reserved_coins/xp/reputation; partial unique index blocks case-variant active duplicates and allows historical duplicates; revocation frees the nickname; the session-expiry reaper frees the nickname slot for an expired last live session.
- [x] 6.3 Import tests: idempotent second run (no writes, identical counts), count/total validation failure aborts, `normalizePlayer` quirk fixtures (missing materials, sprinklers 0, float flooring), partial file no-op, snapshot-hash mismatch detection.
- [x] 6.4 Receipt and outbox tests: retry-same-command-once-effect across a simulated reconnect; id reuse with different payload rejected; crash-after-commit publishes exactly-once effect via the relay.
- [x] 6.5 Gateway integration tests: `welcome`/`inventory_state` field-set parity against a Node recording fixture; duplicate-connect stickiness; claim-window bind and post-window guestId rejection.

## 7. Cutover and verification

- [x] 7.1 Rehearse the activation ceremony on a staging copy: snapshot+hash → shadow import → validate (26 players, coin totals) → activate durable session issuance; record measurements and the snapshot hash in the change's verification notes. No routing flip: Node keeps writing `players` and serving `hello`/`set_nickname` throughout.
- [x] 7.2 Verify parity gates: identity fixtures green in CI, `npm test` green (Node untouched), duplicate-connect and reconnect suites green.
- [x] 7.3 Exercise in the dev environment: two-browser join + rename (still Node-served) + durable session issuance across reconnect, then confirm `game-state.json` still carries a live `players` section written by Node and the shadow-import row count matches the snapshot.

# Accounts cutover runbook (P4)

P4 takes **session authority only**. Node keeps writing `players` in
`data/game-state.json` and keeps serving `hello` / `set_nickname`.
PostgreSQL holds durable `guest_sessions`, command receipts, outbox
events, and a **read-only shadow** of players imported as a migration
source.

## GuestId claim window

The guest id is a stable lookup key (`garden:<guestId>`, self-echo
filtering). It was never a secret and is never authorization.

- Handshake: signed P2 token **plus** the localStorage guestId (already
  bound into the token by `POST /api/auth/guest`).
- Window: from the first shadow import until `imported_at + 30 days`,
  **or** while `last_seen` is within 30 days.
- During the window, a verified token for a historical guestId binds to
  the imported shadow row.
- After the window, an **unclaimed** shadow row cannot be claimed.
  Bare guestId without a token is always refused.

## Shadow import

```sh
cd server_elixir
mix afterlight.import_game_state --file ../data/game-state.json
```

The task copies the file aside and SHA-256s it **before** reading. The
live file is never frozen. A second run against the same snapshot is a
no-op. A different snapshot after a recorded import exits non-zero
(`hash_mismatch`). Missing/empty `players` prints "nothing to import"
and exits 0.

## Reverse-export rehearsal (P6 ceremony owns the real cutover)

```sh
mix afterlight.export_players --out /tmp/players.json --freeze-ack yes
```

Refuses without `--freeze-ack yes`. P4 does not disable Node writes.

## Rollback

Revert session issuance to the P2 ETS registry. Node is untouched.
The new tables go dormant. Do not treat reversing `players` to JSON as
a valid rollback after the P6 activation.

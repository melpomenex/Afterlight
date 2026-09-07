# P4 verification notes (`add-ash-accounts-domain`)

## Negative scope (task 4.3)

`hello` and `set_nickname` remain `:node` in `Afterlight.Gateway.Router`.
No `adjust_balance` / `adjust_inventory` action exists on
`Afterlight.Accounts.Player`. `server/storage.js` is untouched in this
change (grep: no Elixir accounts path writes Node player columns except
session-derived `active` / `claimed_at`).

## Wire

Welcome / inventory_state stay Node-built: the gateway relays `hello`
and pushes whatever Node sends. Gateway tests inject a P2-shaped player
object and assert the field set is forwarded unchanged.

## Shadow import rehearsal (task 7.1)

Source: `data/game-state.json` (live file not frozen; copy-aside hashed first).

- SHA-256: `4e7882612fd628886e02ddd518c639b052a3034dcf0cd00924393301e41e3a36`
- Imported: **30** players, coins sum **1836**, xp sum **9** (the 26-player figure in the original audit is stale)
- Second run: no-op, same hash
- Reverse-export rehearsal: `mix afterlight.export_players --freeze-ack yes`

## Negative grep (task 4.3)

- No `adjust_balance` / `adjust_inventory` on `Afterlight.Accounts.Player`
- `git diff` against `server/storage.js` and Node player-mutating handlers: empty
- Router: `hello` and `set_nickname` remain `:node`

## Not verified here

Two-browser join + rename in a live game window (task 7.3 UI). Covered instead by gateway channel tests (relayed hello/welcome field set, duplicate-connect stickiness, durable session bind on connect).

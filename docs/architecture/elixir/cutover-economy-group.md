# Economy Group Cutover Runbook (P6)

P6 moves personal gardens, wallets, inventory balances, the NPC market, the player
order book, trades, contracts, gather nodes, and the Great Mill from Node into
PostgreSQL as **one atomic authority group** (`Afterlight.Gardens`, `Afterlight.Economy`,
`Afterlight.Restoration`, ownership.md rows 5–11).

## Cutover Ceremony (Tasks 6.1 – 6.4)

### 1. Write Freeze
Node disables write operations for all ten economy command types (`garden_action`,
`market_buy`, `market_sell`, `order_place`, `order_cancel`, `contract_complete`,
`node_harvest`, `machine_contribute`, `machine_mill`, `machine_craft`) and stops
its 1 Hz tickers' persistence.

### 2. Snapshot & Import
Take a snapshot copy of `data/game-state.json`, compute its SHA-256 hash, and import
it idempotently:

```sh
cd server_elixir
mix afterlight.import_economy_group --file ../data/game-state.json --freeze-ack yes
```

The importer:
- Copies the file aside and hashes it before parsing.
- Verifies and records `snapshot_sha256` in `import_snapshots`.
- Aborts on hash mismatch (`{:error, :hash_mismatch}`) if a different snapshot was recorded.
- Returns identical report as a no-op on repeated import of the same hash.
- Normalizes player inventory jsonb into typed `inventory_balances` rows (with zero-row deletion).
- Writes off any legacy orphaned `reservedProduce` (excess over open sell escrow) and logs reconciliation ledger notes.
- Validates all invariants: per-player inventory equality, file↔table sum equality, order escrow reconciliation, level preservation without recompute, and global coin conservation.

### 3. Automated Rehearsal
Run the end-to-end rehearsal script before executing cutover:

```sh
./scripts/rehearse-economy-cutover.sh
```

### 4. Reverse-Export Rehearsal
Under an explicit write freeze, export PostgreSQL state into `game-state.json` format:

```sh
mix afterlight.export_game_state --out /tmp/game-state.json --freeze-ack yes
```

Refuses to run without `--freeze-ack yes`.

## Forensic-Only / Downgrade Posture

The reverse-export tool exists **strictly for forensic comparison and emergency downgrade
to pre-P6 builds**.

- **Forward-fix preferred**: Once PostgreSQL becomes the authoritative writer and mutations accumulate, reverting to the legacy Node JSON writer is **not** a lossless rewind and is **not** a valid ongoing operational pattern.
- **Downgrade limitation**: In a critical emergency requiring fallback to pre-P6 software, reverse export creates a best-effort point-in-time snapshot, but any subsequent actions on Node will lose relational auditability and database constraint guarantees.
- **Node read-only**: Following cutover, Node's write paths for rows 5–11 remain permanently disabled (`AFTERLIGHT_NODE_DURABLE_READ_ONLY=1`).

## 1. Foundations: parity math, schemas, policies

- [x] 1.1 Create `Afterlight.Parity.Numeric`: `js_round/1` (floor(x + 0.5)), `js_to_fixed_3/1` reproducing `Number(x.toFixed(3))`, safe int coercion, and magnitude guards; unit tests pinning the negative-half and formatting edge cases from `docs/architecture/elixir/parity-notes.md`.
- [x] 1.2 Write migrations for `gardens`, `beds`, `sprinklers`, `wallets`, `inventory_balances` (with `acquired_seq`), `market_multipliers`, `orders` (matching partial indexes on `(crop_id, side, price, created_at)`), `trades`, `ledger_entries`, `contracts` + `contract_board`, `gather_nodes`, `machines`, `machine_materials`, `machine_contributions`, `import_snapshots` — all integer money/quantity columns, bigint ms timestamps, float8 for moisture/health/multiplier, and the nonnegative/clamp CHECK constraints from design D2.
- [x] 1.3 Define Ash resources with identities, changesets, and preparations for the three domains; wire `command_receipts`/`outbox_events` reuse from P4 into every write path.
- [x] 1.4 Implement the actor-scoped policies (own wallet/beds/orders; communal machine contributions; actor from server-verified session only) and policy tests proving forged player ids cannot touch another wallet, garden, or order.
- [x] 1.5 Define the shared payload encoder (JS number rendering: integral floats without decimal point, shortest float repr, null handling, insertion-order field maps) with round-trip tests against JS `JSON.stringify` fixture vectors.

## 2. Parity ports (fixtures green before any authority work)

- [x] 2.1 Port `shared/gardenModel.js` (createInitialBeds, tillBed, plantBed, waterBed, tickBed, canHarvest, harvestBed, sprinklerCoverage) and `shared/crops.js` stage/quality math as pure, state-in/state-out modules; run the P0 fixture sequences multi-step.
- [x] 2.2 Port `shared/economy.js` (calculateNpcSellPrice, calculateNpcSeedPrice, clampMultiplier, updateMarketMultiplier) over the full goods × qualities × multipliers fixture table, including `toFixed(3)` chains.
- [x] 2.3 Port `server/orderbook.js` placeOrder/cancelOrder/sortBooks as a pure matching engine over ordered lists; run the fixture scripts covering price-time priority, partial fills, fee min-1 boundary, crop-mismatch break, and self-match allowed.
- [x] 2.4 Port `server/nodes.js` (isDepleted, harvest, reapExpired, tick, getStatesForDistrict) and `server/machines.js` (contribute clamp matrix, millWheat grade order, craft cost order) with fixture coverage of every guard reason string.
- [x] 2.5 Port contract generation with injected RNG (3 slots, 5-min cadence, flour rule, reward/rep/xp math, `expiresAt` +10 min) and `fulfillContract` deduction over acquisition-ordered produce; run pinned-seed fixtures.
- [x] 2.6 Record the full parity suite result (all green) as the flip-gate evidence required by `migration-governance` ("Parity before authority").

## 3. Gardens domain

- [x] 3.1 Implement `Afterlight.Gardens` actions `till_bed`, `plant_bed`, `water_bed`, `harvest_bed`, `place_sprinkler` as single transactions (bed row + inventory delta + xp/level + ledger + receipt + outbox) with the exact rejection reason strings and the owner-only policy.
- [x] 3.2 Implement the 1 Hz `Afterlight.Gardens.Tick` server (loaded gardens only — loaded at hello for every connecting player with no eviction, faithful to Node's `getOrCreateGarden`-for-every-connector + never-pruned map; dtSeconds = 1.0, `is_raining` from the world runtime, RAIN-only) using the D6 tick math; persist on stage change exactly as `server/gardens.js` does.
- [x] 3.3 Implement garden load semantics: resume from persisted floats, stage self-catches-up via timestamp math, no moisture catch-up; add the code comment + docs note documenting deterministic catch-up as a named follow-up.
- [x] 3.4 Build `garden_state`/`inventory_state`/`action_result` payload builders (bed field order, fixture shape, message strings incl. harvest copy and error copy) and the payload parity suite against JS-serialized fixtures.

## 4. Economy domain

- [x] 4.1 Implement `npc_buy`/`npc_sell` domain functions: price math via `Afterlight.Parity.Numeric`, multiplier row updates in the lock ladder, goods-forced grade B, xp awards (no level recompute on sell), ledger rows, receipts, outbox `market_update`/`inventory_state`.
- [x] 4.2 Implement `place_order`: parameter validation + sanity bounds, escrow moves (coins↔reserved_coins, produce↔reserved_produce) via conditional updates, order row insert with client orderId, matching-loop invocation, remainder persistence.
- [x] 4.3 Implement `Afterlight.Economy.MarketFill`: the single-transaction fill (advisory `pg_advisory_xact_lock` per crop market, lock ladder, conditional remainder/reservation updates, fee `max(1, js_round(value·0.02))`, trade + ledger + receipt + outbox rows) with the ledger conservation property asserted in-transaction in tests.
- [x] 4.4 Implement `cancel_order` (takes the same per-crop advisory lock as fills so a cancel can never interleave between a fill's remainder update and its balance movements, per design D3; owner-scoped remainder refund, `not_found` for foreign/unknown ids) and the book snapshot query (bids/asks ordering, remainder quantities, latest-20 trades) for `market_update`.
- [x] 4.5 Implement `complete_contract` over the persisted board: slot lookup (`contract_not_found`), acquisition-order (`acquired_seq`) grade deduction, `insufficient_qualifying_produce`, reward/rep/xp + level recompute, slot replacement on reroll, outbox `contract_update`.
- [x] 4.6 Implement the contract board lifecycle: persisted `last_refresh_at`, 5-minute reroll job with injected RNG (flour contracts only while the mill is restored — read via `Afterlight.Restoration`), mill-restoration-forced reroll hook, and no expiry enforcement (documented).
- [x] 4.7 Build `market_update`/`trade_filled`/`inventory_state` payload builders (prices iteration order CROP_LIST→GOODS with `isGood`, book entry shapes, trade object, zero-key-absent player inventory) and the payload parity suite.
- [x] 4.8 Normalize the P4 interim inventory jsonb into `inventory_balances` (seeds/produce/reserved_produce/materials/fixture rows, zero-row deletion, `acquired_seq` assignment) behind a migration + idempotent backfill task.

## 5. Restoration domain

- [x] 5.1 Implement `Afterlight.Restoration.gather`: district-room precheck, conditional depletion update, 1-material grant + ledger + receipt + outbox in one transaction, `node_depleted` loser path with `respawnAt`.
- [x] 5.2 Implement the 1 Hz node reaper/tick (reap elapsed depletions, emit district `node_state` on respawn) and the district join snapshot builder.
- [x] 5.3 Implement `contribute_to_machine` (guard ladder + `applied = min(requested, held, remaining)` clamp, audit row, restore-in-same-step, machine_update + contract reroll outbox events) and `mill_wheat`/`craft_sprinkler` with ordered grade/cost iteration.
- [x] 5.4 Build `node_state`/`machine_update` payload builders and the payload parity suite (required/contributed key order, machine status shapes, action_result title/message strings).

## 6. Import ceremony and validation

- [x] 6.1 Implement `Afterlight.Import.EconomyGroup` + `mix afterlight.import_economy_group`: freeze-aware, snapshot + SHA-256 into `import_snapshots`, hash-mismatch abort, idempotent keyed inserts importing ALL economy-group domains from the single frozen `game-state.json` snapshot — players' wallets/inventories (jsonb → balance rows; the P4 shadow import is a rehearsal, not the source), gardens/beds/fixtures, orders (ids verbatim), trades, marketMultipliers (float8-exact), nodes, machines — plus the orphaned `reservedProduce` write-off (zeroed with a documented `import`-kind reconciliation ledger note).
- [x] 6.2 Implement the validation report: per-player jsonb→balance-rows equality (the file's inventory/reservation objects rebuild to exactly the imported rows) and file↔table sum equality for coins/reserved/inventory; orders-escrow ↔ reserved-pools equality across the book; `level` copied without recompute; global conservation Σ(coins+reserved); `reserved_coins ≥ Σ open buy escrow` (residue-aware) and `reserved_produce = Σ open sell escrow` (after the orphan write-off); mill and node state equality; counts match.
- [x] 6.3 Implement the no-op guarantee (second import of the same hash mutates nothing and reports identical counts/totals) and a rehearsal script running freeze→snapshot→import→validate→report end to end against a copy of the current `data/game-state.json`.
- [x] 6.4 Implement the reverse export tool (PG → `game-state.json` shape under a fresh write freeze) with a diff test against the original snapshot, and document its forensic-only/downgrade posture in the runbook.

## 7. Concurrency, integration, and load tests

- [x] 7.1 DB integration suite on real PostgreSQL (SQL sandbox): every action's transaction boundaries — harvest bed+inventory atomicity, escrow placement, cancel refunds, contract completion, gather grant, contribution clamp — including forced failure between effects (rollback leaves nothing applied).
- [x] 7.2 Concurrency tests: two buyers racing one resting order (single winner per unit, loser rests or partials), two gathers on one node (one winner, one `node_depleted`), concurrent sprinkler placement (unique index backstop), receipt retry storm (exactly-once effects).
- [x] 7.3 StreamData property suites: randomized placements/cancels/fills/NPC trades/harvests/contributions maintain — nonnegative balances, `filled ≤ quantity`, reserved pools reconcile to open orders (buy-side ≥, sell-side =), per-trade ledger conservation Δ(coins)+Δ(reserved) = −fee, and receipt idempotency under duplicated command delivery.
- [x] 7.4 Outbox tests: commit-then-crash loses no broadcast, at-least-once redelivery is deduped by (event_id, revision), reconnect resnapshot equals accumulated event stream.
- [x] 7.5 Market contention benchmark script (two buyers × one resting order; mixed 8-crop hot-market load): measure fill ack latency, record p95 vs the < 250 ms same-region target, verify no deadlocks under the lock ladder, and write the measured results into the flip evidence.

## 8. Gateway, cutover, and Node write-off

- [x] 8.1 Wire the ten command types (`garden_action`, `market_buy`, `market_sell`, `order_place`, `order_cancel`, `contract_complete`, `node_harvest`, `machine_contribute`, `machine_mill`, `machine_craft`) through the gateway envelope into the Ash actions with actor derivation from the session and `actionId`/`orderId` → `request_id` mapping.
- [x] 8.2 Flip the `hello` message to Phoenix and compose the ENTIRE `welcome` field set from PostgreSQL — `player`, `prices`, `contracts`, `orderBook`, `garden_state`, `node_state`, `machine_update`, `weather`, plus the `theater`/`iptv` slices handed over by P5 — preserving the connection-order contract (hello → welcome → garden_state → chat_history → join snapshots) and pinning the full `welcome` field set with a parity test.
- [x] 8.3 Add the single atomic domain-map flip for the whole group behind operator control (`AFTERLIGHT_ECONOMY_OWNER` + siblings in `runtime.exs` / `dev-elixir-stack.sh`); write-freeze gate for import window remains a follow-up for production ceremony.
- [x] 8.4 Disable the Node write paths for the group in the same release (`AFTERLIGHT_NODE_DURABLE_READ_ONLY=1` in dev stack; Node `storage.save()` skipped) and update `docs/architecture/elixir/ownership.md` rows 5–11.
- [x] 8.5 Verify the JS test suite (`npm test`) stays green through implementation and document any pre-flip behavior contracts the suite pins.

## 9. Acceptance and verification

- [ ] 9.1 End-to-end two-client rehearsal on staging: plant→water→harvest→npc sell→place/fill/cancel orders→complete contract→gather→contribute→mill→craft with payload captures diffed byte-for-byte against the Node server for identical action scripts.
- [ ] 9.2 Execute the production cutover ceremony (freeze → snapshot+hash → import → validation report green → flip → Node read-only) with the recorded evidence bundle (parity run, validation report, benchmark p95, reverse-export diff).
- [ ] 9.3 Post-flip verification: conservation audit job over live ledgers, outbox age and fill p95 dashboards live, one full server-restart drill proving gardens/contracts/nodes/mill survive with identical state.
- [ ] 9.4 Update `README.md`/`AGENTS.md` backend sections and file the follow-up proposals: deterministic garden offline catch-up, escrow price-improvement residue refund, contract expiry enforcement.
- [ ] 9.5 Add protocol-catalog §6 "Declared tightenings" rows, with client-impact analysis, for: (a) the contract board persisting across restarts (today's board regenerates at boot); and (b) the §3 correction that `trade_filled` is sent to BOTH parties — buyer and seller, verified in `server/index.js` — where the catalog currently says "targeted to filler"; the change is right and the catalog baseline is wrong, and the row records this so a future reviewer does not "fix" the implementation to match the erroneous catalog.

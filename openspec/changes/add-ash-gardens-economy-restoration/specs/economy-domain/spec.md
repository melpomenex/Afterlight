# economy-domain

## Purpose

Own wallets, inventory balances, the NPC market, the player order book, trades, and the contract board as durable PostgreSQL state (`Afterlight.Economy`, ownership.md rows 6–9). Every coin and item is an integer balance with nonnegative database constraints and explicit reservation columns; every market fill is one transaction with deterministic lock order; every retried command applies once. Deterministic rules (prices, rounding, matching priority, fees, contract rewards) reproduce the JS behavior proven by the P0 parity fixtures; client payloads and error reason strings stay byte-compatible.

## ADDED Requirements

### Requirement: Integer wallets and inventory balances with database constraints
The system SHALL store money and items in `wallets` (`coins`, `reserved_coins`) and `inventory_balances` (one row per player, item kind, and item id) as integer columns with nonnegative CHECK constraints; balance arithmetic that would go negative SHALL be rejected by conditional updates in the transaction, with the constraints as backstop. Resting buy orders SHALL hold escrow as explicit `reserved_coins`; resting sell orders SHALL hold escrow as `reserved_produce` balance rows — escrow SHALL NEVER be inferred from order rows alone. The P4 interim player inventory jsonb SHALL be normalized into balance rows keyed by item id (seeds, `cropId_quality` produce, reserved produce, materials, sprinkler fixtures); rows reaching zero SHALL be deleted so payload key presence matches the JS objects.

#### Scenario: Balance cannot go negative
- **WHEN** any code path attempts to debit more coins or items than a balance holds
- **THEN** the conditional update matches zero rows, the transaction fails, and the CHECK constraint backstop rejects any negative value ever being stored

#### Scenario: Inventory jsonb is normalized once
- **WHEN** the importer runs against a P4 player holding `seeds.radish: 6`, `produce.flour_B: 1`, `reservedProduce.carrot_A: 2`, `materials.copper: 2`, and `inventory.sprinklers: 1`
- **THEN** six balance rows exist with exactly those quantities under kinds seed, produce, reserved_produce, material, and fixture
- **AND** re-running the import against the same snapshot changes nothing

### Requirement: NPC buy and sell price parity
`npc_buy` (seeds) and `npc_sell` (produce; processed goods forced to grade B) SHALL reproduce the JS price math exactly: sell price `max(1, js_round(basePrice · multiplier · qualityMultiplier · 0.85))`, seed price `max(1, js_round(seedCost · (1 + (multiplier − 1) · 0.4)))` with `js_round` = floor(x + 0.5). NPC sell SHALL reject `insufficient_produce` when the graded produce balance is short; NPC buy SHALL reject `insufficient_coins` when coins cannot cover `unitCost · quantity`. Successful sells award `js_round(quantity · 3)` xp without recomputing level; the Elixir port SHALL pass the P0 economy fixture tables for all goods × qualities × multipliers.

#### Scenario: Instant sell at a discounted bid
- **WHEN** a player sells 2 radishes of grade B while the radish multiplier is 1.0 (base 8)
- **THEN** the unit price is `max(1, round(8 · 1.0 · 1.0 · 0.85))` = 7 coins each, 14 coins are credited, `radish_B` is debited by 2, and xp rises by 6 with level unchanged

#### Scenario: Buying seeds rejects broke players
- **WHEN** a player with 3 coins buys 1 basil seed (seedCost 15, multiplier 1.0 → cost 15)
- **THEN** the command is rejected with `insufficient_coins` and no balance changes

### Requirement: Market multiplier dynamics with toFixed parity
Each tradable item SHALL have a persisted multiplier updated by `updateMarketMultiplier`: `m += netDemand · 0.03`, then mean reversion `m += (1 − m) · 0.05`, clamped to [0.4, 2.5], and written back as the exact double produced by `Number(m.toFixed(3))`. Seed purchases SHALL apply netDemand `+0.2·quantity`; NPC sells `−0.5·quantity`. The stored value SHALL round-trip through the database bit-exactly (float8), and the Elixir chain SHALL pass the P0 `updateMarketMultiplier` fixture chains.

#### Scenario: A sell nudges the price down and reverts toward 1
- **WHEN** the wheat multiplier is 1.0 and a player NPC-sells 2 wheat (netDemand −1.0)
- **THEN** the stored multiplier equals `Number((1.0 − 0.03 + (1 − 0.97) · 0.05).toFixed(3))` = 0.972

#### Scenario: Clamp bounds a buying frenzy
- **WHEN** repeated seed purchases drive the multiplier above 2.5
- **THEN** the stored multiplier never exceeds 2.5, and prices computed from it never imply a value outside the fixture table

### Requirement: Order placement with server-side escrow
`place_order` SHALL validate parameters (`invalid_order_params` for a missing id/side/crop, non-positive or non-integer price/quantity, or magnitudes beyond the documented sanity bounds), normalize price and quantity with `js_round`, and move escrow in the same transaction as the order insert: a buy debits `coins` by `js_round(price · quantity)` and credits `reserved_coins` (`insufficient_coins` when short); a sell debits the `cropId_quality` produce balance and credits the matching `reserved_produce` balance (`insufficient_produce` when short). The client `orderId` SHALL be the durable order id and the command `request_id`; the order row SHALL record the unfilled remainder and `created_at` for price-time priority.

#### Scenario: Buy escrow moves coins into reserve
- **WHEN** a player with 100 coins places a buy order for 5 carrots at price 10
- **THEN** coins become 50, reserved_coins becomes 50, and an open order row for 5 exists before any matching result is visible

#### Scenario: Invalid parameters rejected
- **WHEN** a client places an order with quantity 0 or a non-positive price
- **THEN** the command is rejected with `invalid_order_params` and no escrow moves

### Requirement: Price-time matching with preserved quirks
Matching SHALL fill a new order against resting orders of the same crop only, in price-time priority (bids: price DESC then `created_at` ASC; asks: price ASC then `created_at` ASC), executing each fill at the maker's resting price for `min(maker remaining, taker remainder)`. The port SHALL preserve exactly: the crop-mismatch break (matching stops when the best resting order is for a different crop — it does not skip ahead), self-match allowed (a player's own resting order may fill their crossing order), partial fills leaving both orders in the book, and full fills removing the maker. Each trade SHALL charge the seller a fee of `max(1, js_round(value · 0.02))` and credit the seller `value − fee`. Buyer reservation debits SHALL be `execPrice · quantity` (maker price), so price-improvement residue remains in the buyer's `reserved_coins` exactly as the current server behaves.

#### Scenario: Price-time priority across two asks
- **WHEN** asks rest at price 9 (earlier) and 8 (later) and a buy order for price 9 quantity 3 arrives
- **THEN** the first fill takes the price-9 ask first at price 9 for its remaining quantity before touching the price-8 ask

#### Scenario: Crop mismatch stops matching
- **WHEN** the best ask is for kale and a crossing radish buy order arrives while a radish ask rests deeper in the book
- **THEN** matching breaks at the kale ask, the radish deeper ask is not consumed, and the buy remainder rests on the book

#### Scenario: Self-match is permitted
- **WHEN** a player's buy order crosses their own resting sell order
- **THEN** the trade executes at the resting price with the fee charged exactly as for distinct players, and both sides' balances adjust within the one transaction

#### Scenario: Fee floor
- **WHEN** a trade's value is 10 (fee `max(1, round(10 · 0.02))`)
- **THEN** the fee is 1 coin, the seller receives 9, and a ledger row records the fee

### Requirement: The market fill is one transaction with deterministic lock order
A fill SHALL commit buyer balance, buyer reservation, seller balance, seller reservation, both inventory effects, both order remainders, the fee, the trade row, ledger entries for every delta, the command receipt, and the outbox events in a single database transaction. Matching transactions SHALL serialize per crop market via a transactional advisory lock and SHALL acquire all other rows in the documented ladder (multipliers, then wallets by player id, then inventory balances, then orders); oversell SHALL be prevented by a conditional remainder update (`quantity − filled ≥ q`) and reservation debits by conditional updates (`reserved ≥ delta`), with nonnegative CHECK constraints as backstop. GenServer or process state SHALL NOT be relied upon for financial correctness.

#### Scenario: Two buyers race one resting order
- **WHEN** two buyers concurrently submit crossing orders for the same resting sell order of 5 units
- **THEN** the fills serialize on the market lock, at most 5 units sell, the loser rests as a bid (or partially fills the remainder only), and no trade row exceeds the maker's remaining quantity

#### Scenario: Conservation including fees
- **WHEN** any fill commits
- **THEN** across all wallets Δ(coins) + Δ(reserved_coins) = −fee for that trade, buyer produce gained equals quantity bought, seller reserved_produce debited equals quantity sold, and every delta has a matching ledger row
- **AND** a concurrent conservation audit over a randomized StreamData workload of placements, cancels, fills, NPC trades, and harvests never observes a violated invariant

#### Scenario: Crash mid-fill leaves nothing applied
- **WHEN** the server dies after the trade row insert but before commit
- **THEN** rollback leaves escrow, balances, remainders, and the receipt exactly as before the attempt, and the client's retry re-executes cleanly

### Requirement: Idempotent commands and at-least-once publication
Every economy command (`npc_buy`, `npc_sell`, `place_order`, `cancel_order`, `complete_contract`) SHALL persist an `(actor, request_id)` receipt with payload hash inside its transaction; an exact retry SHALL return the original response with no additional effect, and a reused id with a different payload SHALL be rejected. Post-commit broadcasts (`market_update`, `contract_update`, `inventory_state`, `trade_filled`) SHALL be written to the outbox in the same transaction and delivered at-least-once; consumers SHALL dedupe by event id and revision so a redelivered fill cannot double-apply to any client view.

#### Scenario: Retried order placement applies once
- **WHEN** the same `place_order` (actor, request_id, payload) arrives twice across a reconnect
- **THEN** escrow moves and trades execute exactly once, and the second delivery returns the original outcome

#### Scenario: Redelivered outbox event
- **WHEN** the dispatcher delivers the same `market_update` event twice after a publish retry
- **THEN** consumers apply it once and no duplicate broadcast reaches a client session as a distinct update

### Requirement: Order cancellation refunds the remainder
`cancel_order` SHALL remove the actor's own order (foreign or unknown ids reject with `not_found`) and refund its unfilled remainder in the same transaction: a buy returns `remaining · price` from `reserved_coins` to `coins`; a sell returns `remaining` units from `reserved_produce` to `produce`. Cancellation SHALL emit `market_update` via the outbox.

#### Scenario: Cancel a partially filled buy order
- **WHEN** a player cancels a buy order for 10 at price 12 with 4 filled
- **THEN** reserved_coins drops by 72, coins rises by 72, and the order no longer appears in book snapshots

#### Scenario: Cancelling someone else's order
- **WHEN** a player submits `order_cancel` with another player's order id
- **THEN** the response is `not_found` and nothing changes

### Requirement: Persisted three-slot contract board
The contract board SHALL be persisted in a `contracts` table with exactly 3 live slots (unique slot 0–2), each contract carrying client, crop, quantity (3–6; flour 2–4 while the mill is restored), minQuality (A with the current probability, else B), `reward = js_round(base · 1.35-or-1.0 · quantity · 1.4)`, reputation `js_round(quantity · 5)`, xp `js_round(quantity · 8)`, and `expiresAt = generatedAt + 10 minutes` exactly as generated today. The board SHALL reroll every 5 minutes on the persisted cadence (surviving restarts) and on mill restoration; reroll randomness SHALL be injected so parity fixtures can pin it. `complete_contract` SHALL reject `contract_not_found`, gather qualifying produce (quality rank ≥ minQuality, C<B<A<A+) in acquisition order, reject `insufficient_qualifying_produce` when short, and in one transaction deduct the produce, credit coins/reputation/xp, and recompute `level = floor(xp / 100) + 1`. Contract persistence is new durability added by this change (the current board is memory-only); `expiresAt` remains display data and SHALL NOT begin rejecting completions in this change.

#### Scenario: Board survives restart
- **WHEN** the server restarts between two reroll windows
- **THEN** the same three contracts are served with their original ids and expiry, and the next reroll happens at the persisted cadence boundary, not immediately on boot

#### Scenario: Completion consumes grades in acquisition order
- **WHEN** a player holds carrot_A acquired before carrot_A+ and completes a carrot contract requiring minQuality A for 3 units while holding 2 A and 2 A+
- **THEN** the deduction consumes the 2 earlier-acquired A first and 1 A+, exactly matching the JS Object.entries walk
- **AND** an identical-balance player who acquired the A+ first sees the A+ consumed first

#### Scenario: Mill restoration spawns flour demand
- **WHEN** the final mill contribution restores the mill
- **THEN** the board rerolls immediately with the flour-contract slot rules applied and every player receives `contract_update`

### Requirement: Economy payload and error parity
`market_update` (`{prices, orderBook}` — crops in CROP_LIST order then goods with `isGood: true`; entries `{cropId, name, basePrice, multiplier, instantBid, instantAskSeed?, seedCost?}`; book `{bids, asks, trades ≤ 20}` with entries `{id, playerId, price, quantity, cropId}` and quantity = remainder), `trade_filled` (`{trade{id, buyerId, sellerId, cropId, price, quantity, quality, value, fee, executedAt}}` to both parties), `inventory_state` (full player object with `reservedCoins`, nested inventory, zero-valued keys absent), and `contract_update` (`{contracts}`) SHALL be byte-compatible with the current server, with JS number rendering and field order. Error reason strings SHALL be exactly: `insufficient_coins`, `insufficient_produce`, `invalid_order_params`, `not_found`, `contract_not_found`, plus the legacy strings the JS emits (`insufficient_qualifying_produce`, `unknown_crop`, `invalid_request`).

#### Scenario: Market update after a fill matches byte-for-byte
- **WHEN** a fill commits and the outbox publishes `market_update`
- **THEN** a fixture comparing the Elixir payload against the JS serialization for the equivalent state matches keys, key order, values, and number rendering exactly

#### Scenario: Both traders learn of the fill
- **WHEN** a resting sell order is filled by a taker
- **THEN** buyer and seller sessions each receive `trade_filled` with the identical trade object and their own fresh `inventory_state`

### Requirement: Actor-scoped economy security
Actor identity SHALL derive from the server-verified session only; client-supplied player/guest ids SHALL NOT authorize anything. `npc_buy`, `npc_sell`, `place_order`, `cancel_order`, and `complete_contract` SHALL operate only on the authenticated actor's wallet, inventory, and orders. All derived amounts (total cost, escrow, execution, fee, rewards) SHALL be computed server-side; client-supplied order price and quantity SHALL be validated as positive integers within the documented magnitude bounds using `invalid_order_params` for anything else.

#### Scenario: Forged player id cannot spend another wallet
- **WHEN** a command arrives whose payload names a victim's player id but whose session belongs to an attacker
- **THEN** the command resolves against the attacker's own wallet only, and the victim's balances are untouched

#### Scenario: Absurd magnitudes rejected
- **WHEN** an order arrives with price 10^15 or a non-finite quantity
- **THEN** it is rejected with `invalid_order_params` before any escrow or book mutation

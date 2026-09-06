# restoration-domain

## Purpose

Own the communal restoration loop — gather nodes across the three districts and the shared machines (the Great Mill) — as durable PostgreSQL state (`Afterlight.Restoration`, ownership.md rows 10–11). Node depletion timestamps and machine progress persist across restarts; harvest races resolve deterministically in the database; contributions are clamped exactly as today and audited per player. Deterministic rules (respawn timing, consumption grade order, craft costs, clamp ladder) reproduce the JS behavior proven by the P0 parity fixtures, with byte-compatible payloads and error reason strings.

## ADDED Requirements

### Requirement: Gather nodes with persisted respawn timers
The system SHALL persist the 9 gather nodes (3 per district: foundry/copper, trestle/timber, frost-spire/glass) in a `gather_nodes` table with a nullable `depleted_at` timestamp and the fixed 180000 ms respawn interval. A node SHALL be available exactly when `now ≥ depleted_at + respawn_ms` or `depleted_at` is null; elapsed depletion entries SHALL be reaped by the 1 Hz tick, which SHALL emit district `node_state` events when a node becomes available. Because the timestamp is absolute, respawn remaining time SHALL survive restarts unchanged (no re depletion on boot).

#### Scenario: Respawn survives a restart
- **WHEN** a node is depleted and the server restarts 60 seconds later
- **THEN** the node reports unavailable with `respawnAt` equal to the original depletion time plus 180000 ms, and becomes available 120 seconds after the restart without any player action

#### Scenario: District snapshot on join
- **WHEN** a player joins a district room containing nodes
- **THEN** they receive a targeted `node_state` listing every node in that district with `{nodeId, material, available, depletedAt, respawnAt}`, matching the JS snapshot shape

### Requirement: Gathering grants one material atomically
The `gather` action SHALL require the node's district to equal the actor's current room ('Nothing to gather here.' otherwise) and SHALL, in one database transaction: mark the node depleted at the current time, credit 1 unit of its material to the actor's `material` balance, write the ledger row and command receipt, and enqueue the outbox events. The actor SHALL receive `action_result` (success, 'Gathered', 'Pried loose 1x <Material Name>.') and `inventory_state`, and the district SHALL receive `node_state`.

#### Scenario: Successful gather
- **WHEN** a player standing in the foundry gathers an available copper node
- **THEN** the node becomes depleted, the player's copper balance rises by exactly 1, and both the district broadcast and the personal results are published from the same commit

#### Scenario: Wrong district rejected
- **WHEN** a player in the market room sends `node_harvest` for a foundry node
- **THEN** the action result is failure with 'Nothing to gather here.' and nothing changes

### Requirement: Node harvest race picks exactly one winner
When two actors gather the same available node concurrently, the depletion SHALL be applied by a conditional update (`depleted_at IS NULL OR now ≥ depleted_at + respawn_ms`) so exactly one transaction wins; the loser SHALL receive the `node_depleted` failure result with the `respawnAt` of the just-depleted node and no material credit. The database SHALL make overselling a node impossible regardless of application ordering.

#### Scenario: Two players tap one node
- **WHEN** two players in the same district send `node_harvest` for the same node in the same tick
- **THEN** one receives success plus 1 material, the other receives `node_depleted`, and the node's `depleted_at` is written once

#### Scenario: Depleted node cannot be farmed by retry
- **WHEN** the losing player retries the same request_id after the reconnect
- **THEN** the receipt returns the original `node_depleted` outcome and no second material is ever granted for the same depletion window

### Requirement: Mill restoration with clamped audited contributions
The Great Mill SHALL be persisted in `machines` plus `machine_materials` rows (required copper 4, timber 4, glass 4 — in the JS key order for iteration) with `contributed ≤ required` enforced by CHECK constraints. `contribute_to_machine` SHALL be open to every authenticated actor and SHALL preserve the guard ladder and reason strings exactly: `mill_already_restored`, `material_not_needed`, `invalid_quantity` (non-positive or non-integer), `material_fulfilled` (remaining 0), `insufficient_materials` (held 0). The applied amount SHALL be `applied = min(floor(requested), held, remaining)`; the transaction SHALL debit the actor's materials by `applied`, raise `contributed` by `applied`, write one `machine_contributions` audit row (player, material, applied, at), and — when the last requirement is met in that same step — flip the mill to restored, stamp `restoredAt`, and emit `machine_update` plus the contract-board reroll `contract_update` events. The market room SHALL receive `machine_update` after every accepted contribution.

#### Scenario: Over-contribution clamps to remaining need
- **WHEN** the mill still needs 2 timber and a player holding 5 timber contributes 5
- **THEN** exactly 2 leave the player's inventory, `contributed.timber` reaches 4, and the audit row records applied = 2

#### Scenario: Restoration lands in the final contribution's step
- **WHEN** a contribution delivers the final outstanding unit of the last incomplete material
- **THEN** the same transaction restores the mill, stamps `restoredAt`, publishes `machine_update` with status restored, and triggers the contract reroll broadcast

#### Scenario: Contribution audit trail
- **WHEN** the mill is restored after contributions from three different players
- **THEN** `machine_contributions` contains one row per accepted contribution identifying who supplied which material and how much, in order

### Requirement: Milling and crafting after restoration
`mill_wheat` SHALL require the restored mill (`mill_broken` otherwise) and reject `invalid_quantity` or `no_wheat`; it SHALL consume the actor's wheat in grade order C → B → A → A+ (lowest first, an ordered list — never map order) up to `min(requested, available)` and credit that many `flour_B` 1:1 in one transaction. `craft_sprinkler` SHALL require the fixture id `sprinkler` (`unknown_fixture` otherwise) and, in one transaction, verify and deduct `{copper: 2, glass: 2}` from the actor's materials (`insufficient_materials` with the offending material) and credit 1 sprinkler kit to the actor's `fixture/sprinklers` balance.

#### Scenario: Milling consumes lowest grades first
- **WHEN** a player holds 1 wheat_C, 2 wheat_B, 1 wheat_A and mills 3 wheat
- **THEN** wheat_C is exhausted, wheat_B drops to 1, wheat_A is untouched, and `flour_B` rises by 3

#### Scenario: Crafting a sprinkler kit
- **WHEN** a player holding copper 3 and glass 2 crafts a sprinkler
- **THEN** copper drops to 1, glass to 0 (key removed), the kit balance rises to 1, and the success result reads 'Assembled 1x Garden Sprinkler. Place it on a garden bed from your satchel.'

#### Scenario: Craft without glass
- **WHEN** a player holds copper 2 and glass 1 and attempts the craft
- **THEN** the action fails with `insufficient_materials` naming glass and no materials are deducted

### Requirement: Restoration payloads and error parity
`node_state` (`{roomId, nodes[{nodeId, material, available, depletedAt, respawnAt}]}`), `machine_update` (`{machines{mill{status, required, contributed, restoredAt}}}` with required/contributed keys in the JS insertion order), `action_result` (titles 'Gathered' / 'The Great Mill' / 'Machine Shop' with the exact JS messages), and `inventory_state` SHALL be byte-compatible with the current server. Error reason strings SHALL be exactly: `node_depleted`, `mill_already_restored`, `material_not_needed`, `invalid_quantity`, `material_fulfilled`, `insufficient_materials`, plus the legacy `mill_broken`, `no_wheat`, `unknown_fixture`, `unknown_node`.

#### Scenario: Machine update matches the JS shape
- **WHEN** a contribution is accepted and `machine_update` is published
- **THEN** a payload fixture against the JS serialization for the equivalent state matches keys, key order, values, and number rendering exactly

#### Scenario: Depleted gather feedback
- **WHEN** a player gathers a depleted node (without a duplicate request_id)
- **THEN** they receive an `action_result` failure titled 'Gathered' with 'This cache is picked clean. It needs time to regrow.'

### Requirement: Restoration import and persistence parity
The importer SHALL map `game-state.json` `nodes` (nodeId → depletedAt) and `machines.mill` (status, required, contributed, restoredAt) into the restoration tables idempotently, preserving absolute depletion timestamps so remaining respawn times carry over exactly. Validation SHALL confirm the mill's per-material contributed totals and every node's depleted/available state match the source snapshot before the domain flips.

#### Scenario: Import is repeatable
- **WHEN** the same source snapshot with one depleted node and a half-contributed mill is imported twice
- **THEN** the second import is a no-op and validation reports identical node states and mill totals

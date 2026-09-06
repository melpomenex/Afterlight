# gardens-domain

## Purpose

Own the player's personal garden as durable, server-authoritative state: a 4×3 plot of 12 beds with tilling, planting, watering, harvest, and sprinkler fixtures. Growth is derived from persisted timestamps plus per-second tick math identical to `shared/gardenModel.js`; harvest commits bed state and produce rewards atomically with inventory and xp. Authority for this domain belongs to `Afterlight.Gardens` (ownership.md row 5) from the P6 cutover onward.

## ADDED Requirements

### Requirement: Garden ownership and bed grid
The system SHALL give every player exactly one garden of 12 beds in a 4-column × 3-row grid, persisted in the `gardens` and `beds` tables with one row per bed (`index` 0–11, unique per garden). A garden action SHALL be accepted only when the authenticated actor owns the garden (the `garden:<playerId>` room's owner equals the actor); any other actor SHALL receive the rejection action result 'You can only cultivate your own garden.' and no state change. Bed state SHALL persist across restarts and reconnection with identical values.

#### Scenario: Another player cannot cultivate your plot
- **WHEN** a player inside someone else's `garden:<ownerId>` room sends a `garden_action`
- **THEN** the action is rejected with an `action_result` of success false and message 'You can only cultivate your own garden.'
- **AND** no bed, inventory, or xp row changes

#### Scenario: Garden survives restart
- **WHEN** the server is restarted after a player tills bed 0 and plants bed 3
- **THEN** the player's garden reloads with bed 0 prepared and bed 3 planted with its original `plantedAt` timestamp intact

### Requirement: Bed lifecycle actions with exact rejections
The system SHALL support `till_bed`, `plant_bed`, `water_bed`, `harvest_bed`, and `place_sprinkler` as Ash actions reproducing `shared/gardenModel.js` semantics, rejecting with exactly the legacy reason strings: `bed_not_found` for an out-of-range index, `invalid_bed`, `occupied` (till on a planted bed), `not_prepared` (plant on an untilled bed), `already_planted`, `unknown_crop`, `not_ready` (harvest before HARVESTABLE), `fixture_already_present`, and `sprinkler_limit_reached`. Planting SHALL require a seed of the requested crop ('No seeds of that type in inventory.' otherwise) and place_sprinkler SHALL require a crafted kit ('No sprinkler kit in your satchel. Craft one at the machine shop.' otherwise).

#### Scenario: Planting without seeds
- **WHEN** a player plants a prepared bed with a crop for which they hold zero seeds
- **THEN** the action is rejected with 'No seeds of that type in inventory.' and the bed remains prepared and unplanted

#### Scenario: Watering resets moisture
- **WHEN** a player waters a bed
- **THEN** the bed's moisture becomes 1.0 and `lastWateredAt` becomes the current server time
- **AND** if the bed has a crop planted, `moistureHistorySum` increases by 1.0 and `moistureChecks` by 1

### Requirement: Seed, kit, and reward accounting is transactional
Each successful garden action SHALL commit bed mutation and its inventory/xp effects in one database transaction: `plant_bed` consumes one seed and awards 3 xp without recomputing level; `harvest_bed` credits `yield` produce of grade `quality` (keyed `cropId_quality`), awards the crop's xp, and recomputes `level = floor(xp/100) + 1`; `place_sprinkler` consumes one sprinkler kit. A failure at any step SHALL roll back the whole action.

#### Scenario: Harvest credits produce and xp atomically
- **WHEN** a player harvests a ready radish bed that grades 'A' (yield 2, xp 12)
- **THEN** the bed, the `produce` balance `radish_A` +2, the +12 xp, and the recomputed level are committed in one transaction
- **AND** a crash between any two effects leaves all of them unapplied

#### Scenario: Level math parity
- **WHEN** a player's xp reaches 100 through harvest or contract xp
- **THEN** their stored level becomes 2 on the next harvest or contract completion
- **AND** xp gained from planting or NPC selling does not by itself recompute level

### Requirement: Growth stage parity
Bed `stage` SHALL be computed exactly as `getGrowthStage(plantedAt, duration, now)`: elapsed seconds over `growDuration` (or `regrowDuration` for a repeat-harvest crop after its first harvest), thresholds at progress 0.15/0.45/0.75/1.0 mapping to stages SEED/SPROUT/JUVENILE/MATURE/HARVESTABLE (2–6), with stage PREPARED (1) for unplanted beds and EMPTY (0) for untilled beds. Duration selection SHALL use `regrowDuration` only when `harvestCount > 0` and the crop is `repeatHarvest`. The Elixir port SHALL pass the P0 `gardenModel`/`crops` fixture sequences, including repeat-harvest beds whose `plantedAt` resets to the harvest time.

#### Scenario: Stage crosses MATURE at 75 percent
- **WHEN** a radish (growDuration 25 s) was planted 19 seconds ago
- **THEN** the bed reports stage JUVENILE (4), and one second later still JUVENILE
- **AND** at exactly progress 1.0 the stage becomes HARVESTABLE (6)

#### Scenario: Repeat harvest resets to regrow timing
- **WHEN** a tomato bed (regrowDuration 45 s) with harvestCount 1 is harvested again
- **THEN** harvestCount becomes 2, `plantedAt` resets to the harvest time, `moistureHistorySum` resets to the bed's current moisture, `moistureChecks` to 1, and the stage drops to JUVENILE

### Requirement: Moisture, health, and history tick parity
The system SHALL run a 1 Hz tick applying `tickBed(bed, dtSeconds = 1.0, isRaining, now, sprinkled)` in the same float accumulation order as `shared/gardenModel.js`: moisture capped at 1.0 and replenished by `dt·0.05` when raining or sprinkler-covered, otherwise decayed by `dt·(0.008·waterDemand)` for planted beds and `dt·0.005` for bare beds with a floor of 0; health floored at 0.2 and drained by `dt·0.002` while moisture ≤ 0.05, otherwise restored by `dt·0.001` and capped at 1.0 (planted beds only); `moistureHistorySum += moisture·dt` and `moistureChecks += dt` (a float, planted beds only). Sprinkler coverage SHALL be the occupied bed plus orthogonal neighbors in the 4-column grid (`sprinklerCoverage`). The `isRaining` flag SHALL come from the world runtime's weather and SHALL be true only for the RAIN state (drizzle does not water). The port SHALL pass the P0 tick fixture sequences.

#### Scenario: Rain waters uncovered beds
- **WHEN** the world weather is RAIN and a planted bed with moisture 0.5 and no sprinkler coverage ticks once
- **THEN** its moisture becomes 0.55 (float arithmetic identical to the JS fixture value)

#### Scenario: Sprinkler covers orthogonal neighbors
- **WHEN** a sprinkler sits on bed index 5 of the 12-bed grid
- **THEN** beds 1, 4, 5, 6, and 9 are sprinkler-covered and replenish moisture while it stands

#### Scenario: Dry bed loses health
- **WHEN** a planted bed sits at moisture 0 across multiple ticks
- **THEN** its health decreases by 0.002 per tick until the 0.2 floor, and its moisture history records the drought

### Requirement: Offline behavior is faithful to the current simulation
The system SHALL catch up only what the current Node simulation catches up: `stage` derives from `plantedAt` versus the current time, so a garden left offline advances stages on reload; moisture, health, `moistureHistorySum`, and `moistureChecks` SHALL resume from their persisted values without applying the elapsed offline time. The system SHALL document deterministic offline moisture catch-up as an explicit non-goal deferred to a follow-up change.

#### Scenario: Garden parked overnight
- **WHEN** a player returns after hours away to a planted bed that was moist at departure
- **THEN** the bed's stage reflects the full elapsed growth time, while its moisture and health equal the persisted values it had when the garden was last ticked

### Requirement: Sprinkler placement and limits
`place_sprinkler` SHALL insert a `sprinklers` fixture row for the bed atomically with consuming one kit from the actor's `fixture/sprinklers` inventory balance. Placement SHALL be rejected with `fixture_already_present` when that bed already holds a fixture (including a concurrent placement that won the unique `(garden_id, bed_index)` index), and with `sprinkler_limit_reached` when the garden already has 3 fixtures.

#### Scenario: Third sprinkler accepted, fourth rejected
- **WHEN** a player with 3 sprinklers placed attempts a fourth placement
- **THEN** the action is rejected with `sprinkler_limit_reached` and the kit is not consumed

#### Scenario: Two tabs place on the same bed
- **WHEN** the same player concurrently places sprinklers on the same bed from two sessions
- **THEN** exactly one placement succeeds and consumes one kit, the other fails with `fixture_already_present`

### Requirement: Idempotent garden commands
Garden actions SHALL run under the durable command contract: the client `actionId` maps to the envelope `request_id`, a `(actor, request_id)` receipt with payload hash is written in the action's transaction, an exact retry returns the original outcome without re-applying, and a reused id with a different payload is rejected.

#### Scenario: Reconnect replays a plant command
- **WHEN** the client re-sends the same `garden_action` request_id after a reconnect because it never saw the reply
- **THEN** the seed is consumed and the bed planted exactly once, and the retry returns the original success result

### Requirement: Garden state payload parity
`garden_state` payloads SHALL be byte-compatible with the current server: `{roomId, beds, fixtures?}` where each bed serializes `{index, prepared, cropId, plantedAt, lastWateredAt, moisture, health, moistureHistorySum, moistureChecks, stage, harvestCount}` with the JS number rendering (integral floats without a decimal point) and `null` for unplanted fields; fixtures serialize `{type, bedIndex}`. The owner's join snapshot and every post-action room broadcast SHALL use the same builder; after a successful action the garden room SHALL receive `garden_state` and the actor `inventory_state` and `action_result`, in the same order as today.

#### Scenario: Action broadcast sequence
- **WHEN** a player waters a bed in their garden room with a visitor present
- **THEN** both players receive `garden_state` for the room, the actor additionally receives `inventory_state` then `action_result` (success, 'Action complete'), and the payload fields match the JS serialization field-for-field

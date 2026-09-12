# gardening-retirement Specification

## Purpose
Defines the complete, non-destructive retirement of Afterlight's garden/economy domain and its "Gardener" identity, leaving a gardener-free player experience without losing saved progress, frozen snapshots or navigation.

## Requirements

### Requirement: Gardener-free identity and copy

The system SHALL generate default nicknames from an industrial/afterlight word bank containing no produce, plant or gardening terms, and SHALL NOT assign, fall back to, or display "Gardener" anywhere player-facing — including local and remote avatar labels, the profile HUD, settings copy, IRC bridge usernames and welcome text, emote hints and place copy. Nickname sanitization, duplicate resolution and persistence SHALL keep their existing behavior.

#### Scenario: New player naming

- **WHEN** a player joins without a nickname
- **THEN** they receive an industrial/afterlight name such as CopperLantern42 or RustCompass17 that contains no produce, plant or gardening term

#### Scenario: Invalid nickname fallback

- **WHEN** a nickname is blank, too short or invalid and a default must be substituted
- **THEN** the substituted name is generated from the same word bank and is never "Gardener"

#### Scenario: Remote avatar label

- **WHEN** a remote player is rendered without a nickname
- **THEN** their overhead label uses a neutral visitor label, not "Gardener"

#### Scenario: IRC bridge default

- **WHEN** a player's IRC bridge session is created without a game nickname
- **THEN** the IRC username is a neutral default such as `visitor`, and the IRC welcome text no longer addresses the town's gardeners

### Requirement: Identity storage migration

The client SHALL read the legacy `afterlight-gardener-guest-id` and `afterlight-gardener-nickname` values when the new `afterlight-guest-id` and `afterlight-nickname` keys are absent, persist the value under the new key, and keep the same guest identity and nickname. When storage is unavailable, the session-local identity SHALL remain usable and no error SHALL surface.

#### Scenario: Existing player upgrade

- **WHEN** a returning player has only the legacy storage key holding their guest id
- **THEN** the client reuses that same guest id, writes it under the new key, and keeps their nickname

#### Scenario: New player

- **WHEN** neither the new nor the legacy storage key exists
- **THEN** the client creates a fresh guest id and nickname under the new keys

#### Scenario: Storage unavailable

- **WHEN** storage access throws
- **THEN** the guest identity stays valid for the session and the game continues without a save error

### Requirement: Legacy farming surfaces removed

The HUD SHALL expose no farming or economy controls in any place: no tool belt or active-tool hint, no coin/reputation/XP pills, no satchel/inventory dialog, no market/seed/contract/order surfaces, no mill panel, no garden beds, no material nodes, no tool digits 1–6 and no inventory/market shortcuts. Place identity, people, chat, emotes, travel and nickname editing SHALL remain. The legacy HUD preference and its settings toggle SHALL be gone.

#### Scenario: Arriving anywhere

- **WHEN** a player arrives in any place
- **THEN** the HUD shows no tool belt, economy pills, satchel or market surfaces, and no economy snapshot is requested

#### Scenario: Economy keys

- **WHEN** the player presses 1–6, I or M during play
- **THEN** no tool, inventory or market surface opens and movement and interaction are unaffected

#### Scenario: Profile dialog

- **WHEN** the player opens their profile
- **THEN** only nickname editing and presence information are shown, with no coins, reputation, level or XP

### Requirement: Scenery-only Market Court

The `market` room SHALL remain a reachable legacy room and the default-room fallback; its square scenery and western district gateway SHALL remain, while the trade board, seed vendor, contracts board, mill, machine bench and garden gate are removed. Arrival copy SHALL describe the square without produce, trading or gardening, and legacy districts SHALL keep their south gates pointing at the `market` room.

#### Scenario: Arrival

- **WHEN** a player enters the Market Court
- **THEN** the square renders without economy stalls, the mill or the garden gate, and the location text is neutral

#### Scenario: Gateway travel

- **WHEN** a player uses a district's south gate or the Market Court's western gateway
- **THEN** travel works exactly as before with unchanged room ids and cleared movement state

#### Scenario: Default fallback

- **WHEN** a client connects without requesting a room and never replays a join
- **THEN** membership falls back to the Market Court

### Requirement: Retired district manifest stability

The Glass Garden (`garden`) SHALL be removed from the place manifest, minimap schemas, builders and save resolution. Every remaining legacy district SHALL keep its stable id, its explicit procedural seed and its west/east loop and south `market` gate destinations, with `canal` adjacent to `station`.

#### Scenario: Removed destination

- **WHEN** a client requests `?room=garden` or loads a save whose current room is `garden`
- **THEN** the request resolves as unknown and visibly falls back to The Orpheum, never to a mismatched room

#### Scenario: Stable seeds

- **WHEN** the manifest is rebuilt after the removal
- **THEN** every remaining district's procedural seed equals its pre-removal value

#### Scenario: Gate loop

- **WHEN** the player walks east from the Sluiceworks (`canal`)
- **THEN** they arrive at The Last Platform (`station`), and every other west/east/south gate destination is unchanged

### Requirement: Retired wire surface tolerated

Servers SHALL refuse the retired command types `garden_action`, `market_buy`, `market_sell`, `order_place`, `order_cancel`, `contract_complete`, `node_harvest`, `machine_contribute`, `machine_mill` and `machine_craft` without ending the session, and SHALL never emit the retired snapshot types `garden_state`, `inventory_state`, `market_update`, `contract_update`, `node_state`, `machine_update` or `trade_filled`. Clients SHALL ignore unknown or retired snapshots without user-visible error.

#### Scenario: Old client command

- **WHEN** a client sends a retired command
- **THEN** the server answers with a bounded error or no-op and continues serving the session

#### Scenario: Stale snapshot

- **WHEN** a snapshot for a retired type arrives
- **THEN** the client discards it without an error toast or broken UI

#### Scenario: Retained protocol untouched

- **WHEN** clients send movement, chat, emote or theater messages
- **THEN** the retained protocol behaves exactly as before this change

### Requirement: Non-destructive retirement

The retirement SHALL NOT modify or delete `data/game-state.json`, `data/iptv.json` or `data/epg.json`, and SHALL NOT erase retained player progress. Before Postgres tables or player economy columns are dropped, a dated economy export SHALL be written outside those protected snapshot files.

#### Scenario: Snapshot integrity

- **WHEN** the retirement lands
- **THEN** the three protected snapshot files still exist and their SHA-256 hashes match their recorded P11 values

#### Scenario: Glass Garden save

- **WHEN** a player loads a save containing the retired Glass Garden completion
- **THEN** every other visited and completed district is preserved

#### Scenario: Drop safety

- **WHEN** the drop migration runs
- **THEN** a dated economy export exists outside `data/game-state.json`

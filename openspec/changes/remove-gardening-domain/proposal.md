# remove-gardening-domain

## Why

Afterlight has pivoted to shared places, but the garden/economy domain and the "Gardener" identity still define the HUD, wire protocol, persistence, both servers, the specs and the deployment. The unfinished P6 gardens/economy migration keeps that dead weight on life support. Remove the domain completely, and give new users non-gardening names.

## What Changes

- **BREAKING** Remove garden cultivation: personal garden rooms/worlds, beds, crops, growth/moisture/harvest, sprinklers, seed inventory, crop visuals and their tests.
- **BREAKING** Remove gathering/crafting/restoration economy: material nodes, machine shop/Great Mill, flour, NPC pricing, order book, contracts, coins/XP/level/reputation, and the satchel/inventory/progression UI.
- Remove the public legacy district **The Glass Garden** (`garden`), its nursery objective/note and minimap schema. Preserve every remaining district's explicit seed and the west/east loop with `canal` adjacent to `station`.
- Strip the Market Court to a scenery-only legacy room: remove the trade board, seed vendor, contracts board, mill, machine bench and garden gate; keep the `market` room id, default-room fallback, canal gateway and arrival surface.
- **BREAKING** Remove all gardener identity: replace the produce-based nickname generator with an industrial/afterlight word bank, remove every "Gardener" fallback and label (avatar factory, remote fallback, profile HUD, settings copy, IRC bridge username/MOTD, emote hint, place notes), and migrate the guest/nickname storage keys without losing an existing identity.
- Remove legacy farming presentation: tool belt, satchel/market dialogs, mill panel, coin/rep/XP pills, tool keys 1–6, `I`/`M` shortcuts, the "Legacy gardener HUD" preference and the `placeHudPolicy` demotion layer. Keep place identity, chat, emotes, travel and a nickname-only profile.
- **BREAKING** Retire the garden/market wire surface: `garden_action`, `market_buy/sell`, `order_*`, `contract_complete`, `node_harvest`, `machine_*` and their snapshots. Servers refuse retired commands without crashing and clients ignore stale retired snapshots.
- **BREAKING** Remove the Elixir `Gardens`, `Economy`, `EconomyGroup` and `Restoration` domains, their supervision, routing flags, mix tasks, parity fixtures, Postgres tables and player economy columns. Take a frozen export first; the original `data/*.json` snapshots are never modified or deleted.
- Supersede `add-ash-gardens-economy-restoration` (P6) and the legacy-farming portions of `deemphasize-legacy-farming`.
- Update tests, scripts, README, AGENTS.md, `docs/places.md` and architecture/ownership/cutover documentation.

## Capabilities

### New Capabilities

- `gardening-retirement`: gardener-free identity and copy, removed legacy farming surfaces, the scenery-only Market Court, identity storage migration, retired-protocol tolerance and non-destructive retention of frozen snapshots.

### Modified Capabilities

- `player-identity`: nickname generation moves to an industrial/afterlight theme with no produce nouns or "Gardener" fallbacks; avatar text is player/visitor language, not gardener language.
- `world-room-runtime`: personal `garden:<playerId>` room identity and its join snapshots are removed; weather is relayed as presentation only (no garden tick, no P6 transfer); the proxied durable-domain and crash-recovery lists no longer name gardens/economy/restoration.
- `multiplayer-networking`: room partitioning no longer includes personal gardens; authority and persistence requirements drop coins/inventory/crops/trades/gardens/order books in favor of the retained state.
- `biome-exploration-mechanics`: exploration-save normalization explicitly drops the retired Glass Garden id while preserving every other visited/completed district.
- `realtime-binary-protocol`: the spawn-identity requirement stops citing the removed `garden:<guestId>` room id as its continuity example.

### Removed Capabilities

- `garden-cultivation`: soil preparation, planting, growth, harvesting and the crop catalog are deleted.
- `gathering`: district material nodes, timed respawn and material inventory are deleted.
- `crafting`: community machine restoration, milling, flour and sprinkler crafting are deleted.
- `market-economy`: NPC liquidity, dynamic pricing, the order book and rotating contracts are deleted.

## Dependencies

Supersedes `add-ash-gardens-economy-restoration` (P6) and the legacy-farming parts of `deemphasize-legacy-farming`; neither is to be implemented or completed as written. Builds on the social-places framework (`add-social-place-framework`) and the Phoenix/Node stack (`port-backend-to-elixir`, `remove-node-server-authority`). No dependency requires P6 to land first — this change cancels it.

## Impact

Client: `index.html`, `src/style.css`, `src/main.js`, `src/ui/*` (marketModal, placeHudPolicy), `src/world/*` (marketWorld, gardenWorld, bounds), `src/places/*`, `src/net/client.js`, `src/render/*` (avatars, plants), `shared/*` (identity, protocol, placeDefinitions, emotes, gardenModel, crops, materials, economy). Node: `server/*` (gardens, economy, orderbook, nodes, machines, storage, index, chat, irc, ircAdapter) and parity/verify/bench scripts. Elixir: `server_elixir/lib/afterlight/{gardens,economy,economy_group,restoration,import/economy_group,export/game_state}`, `protocol/payloads.ex`, `gateway/{welcome,router}.ex`, `accounts/*`, `world/{rooms,weather}.ex`, `application.ex`, config, mix tasks, parity fixtures and tests, plus a new drop migration. Docs: README, AGENTS.md, `docs/places.md`, `docs/architecture/elixir/*`. Frozen originals (`data/game-state.json`, `data/iptv.json`, `data/epg.json`) are read-only throughout.

## Non-goals

No replacement farming/progression system, no new economy, no Market Court redesign (it stays a scenery-only legacy square), no removal of the nature-themed restoration districts (`understory`, `mangrove`, `delta`, `trestle`, `frost-spire`, and the rest) and no removal of the courtyard/canal/signal restoration landmarks. No social-graph, new activity or navigation redesign. Planning artifacts authorize no runtime implementation in this session.

## Migration and rollback

Stop writes before dropping anything: freeze the economy domains, export them to a dated archive outside the protected snapshots, then remove code and drop tables/columns. Client storage keys are migrated additively and tolerate unavailable storage. `readExploration()` already ignores retired ids, so old saves lose only the Glass Garden completion. Rollback before the drop migration is a code revert; after the drop, restore from the dated export. Original `data/*.json` files and migration history are never deleted or rewritten.

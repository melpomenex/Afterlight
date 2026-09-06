## Why

Afterlight has an atmospheric, rain-soaked isometric visual identity, but its gameplay was a single-player restoration prototype. This change transforms the game into a persistent, playable multiplayer market-gardening game. Players can cultivate crops in their personal garden, harvest graded produce, trade in a shared Market Court with real players and NPC liquidity, accept rotating market contracts, and reinvest earnings while preserving the game's wet stone, warm amber lights, and procedural Three.js aesthetic.

## What Changes

- **Transform Core Loop**: Shift from recovering power cells to prepare → plant → tend → harvest → pack → sell/trade → reinvest → expand.
- **Player Identity & Avatars**: Generate persistent guest UUIDs, sanitized nicknames (with an automatic atmospheric nickname generator), and custom procedural gardener avatars with hats, aprons, satchels, and watering cans.
- **Server-Authoritative Cultivation**: Add an interactive garden system with tilling, planting, watering, moisture decay, 5 visible growth stages, and deterministic quality grading (C, B, A, A+) across 7 initial crops (radish, lettuce, carrot, kale, basil, tomato, strawberry).
- **Three-Tier Economy**: Introduce NPC liquidity (instant buying/selling at reference prices), bounded dynamic supply/demand pricing with mean reversion, and a server-matched player order book with inventory/coin reservations.
- **Contracts & Progression**: Add rotating town contracts for restaurants and cafes, gardening XP, reputation, and garden upgrades.
- **Multiplayer Architecture**: Implement a Node.js WebSocket server (`ws`) supporting rooms (`market`, `garden:<playerId>`), 8–15 Hz movement broadcast, client interpolation, atomic file-backed persistence, and resilient auto-reconnect.
- **UI & HUD Rework**: Replace the old cell restoration HUD with gardening tool selection (1–5 keys), crop inspectors, contextual hints, a polished market trading modal, and live weather/presence indicators.
- **World & Bounds Refactor**: Modularize `main.js`, add explicit world bounds configuration per room to govern camera, collision, clicking, and minimaps, and repurpose the Rain Court into the shared Market Court.

## Capabilities

### New Capabilities
- `player-identity`: Persistent guest session tokens, nickname validation and generation, remote player presence, avatar rendering, and movement interpolation.
- `garden-cultivation`: Garden plot management, soil preparation, planting, moisture decay, 5-stage crop growth, harvesting, quality calculation, and server-authoritative garden state.
- `market-economy`: Reference prices, dynamic supply/demand shifts, order book matching, order management, NPC contracts, and market UI.
- `multiplayer-networking`: WebSocket protocol, room-based presence, state replication, safe reconnection, and server-side atomic persistence.

### Modified Capabilities
<!-- No existing capabilities existed under openspec/specs/. -->

## Impact

- **Client Source**: `src/main.js` refactored into modular packages (`src/render/`, `src/world/`, `src/game/`, `src/net/`, `src/ui/`).
- **New Shared & Server Code**: `shared/` for protocol and crop/economy definitions; `server/` for WebSocket server, room management, garden logic, order book, and storage.
- **Dependencies**: Added `ws` for the multiplayer server in `package.json`.
- **Backward Compatibility**: Old `afterlight-save` localStorage progress is preserved untouched; new multiplayer game state uses server authority and a isolated storage key for local client tokens.
- **Tests**: Comprehensive automated test suites for identity, crop growth, quality, order matching, persistence, and end-to-end multi-client WebSocket interactions.

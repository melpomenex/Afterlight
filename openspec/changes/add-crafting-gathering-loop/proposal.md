## Why

The farming economy and the 16 explorable biomes currently run in parallel and never touch: exploration awards no resources and nothing economic depends on it, so biomes are visited once and never revisited, and the shared Market Court gives players no shared project. Braiding the two with gatherable materials, a restorable machine shop, and crafting turns two side-by-side systems into one loop — explore → gather → craft → farm → sell → reinvest — and gives the multiplayer court a reason for players to stand in the same room.

## What Changes

- **Material gather nodes**: Server-owned resource nodes in three districts — copper in the Rustfall Foundry, timber at the Overgrown Trestle, glass shards in the Glacial Glasshouse. Harvesting depletes the node; nodes respawn on a server timer.
- **Materials inventory**: Player inventory (server-side) extends beyond crops to hold materials; the satchel UI shows them alongside produce.
- **The Great Mill**: A broken machine in the Market Court machine shop. Any player can contribute materials toward its restoration; contribution progress is visible to everyone in the court. Once restored, it converts wheat into flour, for everyone, permanently (server-persisted).
- **Flour as a processed good**: Storable, tradable, NPC spot-priced, and demanded by a new rotating restaurant contract tier, making contracts reward the craft chain rather than raw crops alone.
- **Sprinkler crafted tool**: Crafted from copper and glass; once placed/owned, the server-side garden tick auto-waters adjacent beds, proving crafted tools can upgrade farming itself.
- **Depends on `fix-presence-race`**: Shared restoration and milling must be observable by multiple players, which requires working presence.

## Capabilities

### New Capabilities
- `gathering`: Server-authoritative material nodes in explorable districts — spawn placement, harvest interaction, depletion, timed respawn, and materials entering the player's server-side inventory.
- `crafting`: The machine shop — community-pooled machine restoration, machine recipe processing (wheat → flour), processed goods in the economy, and crafted tool effects on garden simulation (sprinkler).

### Modified Capabilities
<!-- No existing capabilities exist under openspec/specs/. -->

## Impact

- **Server**: New materials and machines modules (state, interactions, persistence alongside `server/gardens.js`); `server/economy.js` gains flour pricing and a flour contract tier; garden tick applies sprinkler moisture.
- **Shared**: `shared/protocol.js` gains message types (node harvest, mill contribute/status); a goods/materials catalog alongside `shared/crops.js`.
- **Client**: `src/world/` district props for nodes and the mill (batched static geometry, dynamic node/mill visuals per the existing batching rules), interact dispatch for new interaction types, satchel UI for materials, HUD/toast wiring for restoration progress.
- **Persistence**: New server-side state for nodes and machines; existing `afterlight-save` exploration progress is untouched in this slice. Deferred to later changes: biome-landmark-gated recipe unlocks (requires server-side exploration migration), additional machines/recipes beyond the mill, weather and season systems.
- **Tests**: Node harvest/respawn, pooled restoration, milling conversion, flour contracts, sprinkler moisture effects.
- **Docs**: README player-facing sections for gathering, the machine shop, and new controls.

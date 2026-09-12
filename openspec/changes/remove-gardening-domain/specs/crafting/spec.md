# crafting

## REMOVED Requirements

### Requirement: Community-pooled machine restoration

**Reason**: The Great Mill and machine shop were the economy's crafting landmark inside the Market Court, now stripped of all economy content.

**Migration**: No replacement. Mill geometry, contribution actions and the mill HUD panel are deleted; persisted machine state stays in the frozen snapshots.

### Requirement: Milling recipe processing

**Reason**: Wheat, flour and the milling interaction are removed with farming.

**Migration**: No replacement. `machine_mill` is a retired wire type; no NPC or inventory path substitutes for it.

### Requirement: Flour in the economy

**Reason**: The dynamic-pricing and contract systems that priced flour are removed in full.

**Migration**: No replacement. `flour` disappears from pricing tables, contract generation and the frozen snapshots' readers.

### Requirement: Sprinkler crafted tool

**Reason**: Sprinklers watered garden beds, which no longer exist.

**Migration**: No replacement. Sprinkler crafting, placement, coverage simulation and preview are deleted with the personal garden.

### Requirement: Machine state visible to arriving players

**Reason**: There is no machine shop state left to synchronize when a player arrives.

**Migration**: No replacement. `machine_update` is a retired wire type with no producer or consumer.

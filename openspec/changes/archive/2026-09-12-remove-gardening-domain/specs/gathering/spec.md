# gathering

## REMOVED Requirements

### Requirement: Material nodes in explorable districts

**Reason**: The gathering loop existed only to feed crafting and the removed machine shop; the districts themselves stay walkable without node props.

**Migration**: No replacement. Material-node geometry is removed from the world factory and the node definitions are deleted; the foundry, trestle and frost-spire districts keep their existing scenery, seeds and gates.

### Requirement: Server-authoritative harvest

**Reason**: Materials no longer exist as an inventory, so no server-validated harvest action remains.

**Migration**: No replacement. `node_harvest` is a retired wire type; servers refuse it without crashing and clients ignore stale node snapshots.

### Requirement: Timed respawn that survives restarts

**Reason**: Node depletion and respawn state only served material gathering.

**Migration**: No replacement. Persisted `nodes` values stay untouched in the frozen snapshots and are no longer read or written.

### Requirement: Shared node visibility

**Reason**: With no harvestable nodes there is no depletion state to broadcast.

**Migration**: No replacement. `node_state` is a retired wire type with no producer.

### Requirement: Material inventory persistence

**Reason**: Copper, timber and glass inventories are removed with the crafting economy.

**Migration**: No replacement. Player material balances remain in the frozen snapshots and Postgres columns are dropped only after the dated economy export described by `gardening-retirement`.

## Purpose

Makes the explorable districts economically meaningful by placing server-authoritative material nodes in them: harvestable copper, timber, and glass that deplete on harvest, respawn on a timer, survive server restarts, and enter the player's server-side material inventory.

## ADDED Requirements

### Requirement: Material nodes in explorable districts
The system SHALL place harvestable material nodes at fixed positions in explorable districts — copper in the Rustfall Foundry, timber at the Overgrown Trestle, glass shards in the Glacial Glasshouse — reachable on foot within each district's existing walkable bounds.

#### Scenario: Discovering a node
- **WHEN** a player walks up to a material node in its district
- **THEN** the node is interactable and the interaction prompt identifies the material it yields

### Requirement: Server-authoritative harvest
The system SHALL grant the harvested material to the player's server-side inventory only through a server-validated interaction, depleting the node as part of the same atomic action.

#### Scenario: Harvesting an available node
- **WHEN** a player interacts with an available material node
- **THEN** one unit of that material is added to the player's inventory, the node becomes depleted, and the node's visual state changes accordingly

#### Scenario: Harvesting a depleted node
- **WHEN** a player interacts with a depleted node
- **THEN** the action is rejected, no material is granted, and the node remains depleted

### Requirement: Timed respawn that survives restarts
The system SHALL respawn depleted nodes after a fixed interval and SHALL persist node depletion and respawn state so that reconnecting or a server restart cannot be used to farm a node repeatedly.

#### Scenario: Node becomes available again
- **WHEN** the respawn interval elapses after a node is depleted
- **THEN** the node becomes harvestable again and its visuals reflect availability

#### Scenario: Server restart between harvest and respawn
- **WHEN** the server restarts after a node was harvested but before it respawned
- **THEN** the node is restored in its depleted state with its remaining respawn time intact

### Requirement: Shared node visibility
The system SHALL make node depletion and respawn visible to every player present in the district, not only the harvesting player.

#### Scenario: Another player watches a harvest
- **WHEN** player A harvests a node while player B is present in the same district
- **THEN** player B sees the node transition to its depleted state

### Requirement: Material inventory persistence
The system SHALL store harvested materials in the player's server-side inventory, so materials survive disconnection, reconnection, and server restarts, and the client's satchel display mirrors the server state.

#### Scenario: Materials persist across reconnection
- **WHEN** a player disconnects and reconnects after harvesting materials
- **THEN** their material inventory is unchanged

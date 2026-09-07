## Purpose

Introduces the machine shop as the crafting heart of the Market Court: a community-restored Great Mill that turns gathered materials and farmed wheat into a processed good, wired into the existing economy, plus a first crafted tool that upgrades farming itself.

## Requirements

### Requirement: Community-pooled machine restoration
The system SHALL present the Great Mill in the Market Court as broken, requiring a defined quantity of materials to restore; any player may contribute eligible materials from their inventory; contribution progress SHALL be visible to every player in the court; and restoration SHALL be server-persisted so it is permanent across restarts.

#### Scenario: Contributing materials toward restoration
- **WHEN** a player contributes required materials while the mill is broken
- **THEN** the materials leave their inventory, the mill's progress increases, and all players in the court see the updated progress

#### Scenario: Contributing materials that are not needed
- **WHEN** a player offers materials the mill does not need, or more than it still requires
- **THEN** the contribution is rejected or clamped to the remaining need, and unaccepted materials stay in the player's inventory

#### Scenario: Restoration completes
- **WHEN** the mill's total contributed materials reach its requirement
- **THEN** the mill becomes restored, its visuals change accordingly for everyone, and the restored state survives a server restart

### Requirement: Milling recipe processing
The system SHALL allow any player to use a restored mill to convert wheat into flour through a server-validated interaction, consuming wheat from and adding flour to that player's inventory.

#### Scenario: Milling wheat into flour
- **WHEN** a player with wheat interacts with a restored mill
- **THEN** wheat is deducted and an equivalent amount of flour is added to their inventory

#### Scenario: Milling with missing inputs or a broken mill
- **WHEN** a player interacts with the mill without wheat, or while the mill is broken
- **THEN** the action is rejected and no items change hands

### Requirement: Flour in the economy
The system SHALL treat flour as a tradable good with an NPC spot price following the same dynamic pricing rules as crops, and SHALL offer rotating contracts that require flour.

#### Scenario: Selling flour to the NPC market
- **WHEN** a player instant-sells flour
- **THEN** coins are credited at the current dynamic flour price, moving the market multiplier the same way crop sales do

#### Scenario: Fulfilling a flour contract
- **WHEN** a player delivers the required quantity of flour to a contract demanding it
- **THEN** the contract pays out its reward and a replacement contract appears

### Requirement: Sprinkler crafted tool
The system SHALL let a player craft a sprinkler from copper and glass, consuming the materials server-side, and SHALL have the server-side garden simulation apply moisture automatically to the beds the sprinkler covers.

#### Scenario: Crafting a sprinkler
- **WHEN** a player with the required copper and glass crafts a sprinkler
- **THEN** the materials are deducted and the sprinkler is added to their garden as a permanent, server-persisted fixture

#### Scenario: Automatic watering
- **WHEN** time passes while a sprinkler is placed
- **THEN** the beds it covers retain moisture without manual watering, while uncovered beds continue to dry normally

### Requirement: Machine state visible to arriving players
The system SHALL send the current machine shop status — restoration progress and restored machines — to players when they enter the Market Court, so late joiners see the same world state.

#### Scenario: Arriving after restoration
- **WHEN** a player enters the Market Court after the mill was restored
- **THEN** they see the mill in its restored state without contributing or retriggering anything

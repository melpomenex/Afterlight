## Purpose

Defines server-authoritative garden beds, planting, moisture decay, five visible growth stages, harvesting, produce grading, and inventory storage.

## ADDED Requirements

### Requirement: Soil Preparation and Planting
The system SHALL allow players to prepare empty soil beds with a hoe, plant seeds from inventory into prepared beds, and spend one seed unit per planted bed.

#### Scenario: Preparing uncultivated soil
- **WHEN** the player selects the hoe tool and interacts with an empty, unprepared soil bed
- **THEN** the bed transitions to the prepared/tilled state with darkened tilled soil visuals

#### Scenario: Planting seeds in prepared bed
- **WHEN** the player selects a seed type from inventory and uses it on a prepared bed
- **THEN** one seed is deducted from player inventory, the bed is marked as planted with the crop type, and the crop instance begins growth at stage 1

#### Scenario: Preventing planting in unprepared or occupied beds
- **WHEN** the player attempts to plant seeds in an unprepared bed or a bed that already holds a crop
- **THEN** the action is rejected and no seeds are deducted

### Requirement: Crop Moisture and Visible Growth Stages
The system SHALL track moisture decay and progression across at least five distinct growth stages (Seed, Sprout, Juvenile, Mature, Harvestable), visibly altering crop geometry.

#### Scenario: Watering crops
- **WHEN** the player selects the watering can and waters a planted or prepared bed
- **THEN** the bed's moisture is replenished to maximum and the soil mesh visibly darkens

#### Scenario: Moisture decay and rain replenishment
- **WHEN** game time elapses without water
- **THEN** soil moisture decays over time, and outdoor beds gain moisture during rain weather events

#### Scenario: Multi-stage growth visual progression
- **WHEN** a crop reaches growth time thresholds based on its configured duration
- **THEN** the crop advances sequentially through its 5 growth stages and updates its 3D plant geometry

### Requirement: Harvesting and Quality Grading
The system SHALL allow harvesting only when crops reach the harvestable stage, calculating a deterministic quality grade (C, B, A, A+) based on moisture history and health, and depositing produce into inventory.

#### Scenario: Harvesting mature crop
- **WHEN** the player uses the harvest tool or interact action on a harvestable crop
- **THEN** the crop is removed (or reset to growing for repeat crops), produce with a calculated quality grade is added to inventory, and gardening XP is awarded

#### Scenario: Preventing harvest of immature crop
- **WHEN** the player attempts to harvest a crop that has not reached the harvestable stage
- **THEN** the harvest action is rejected and the crop remains growing in the bed

### Requirement: Initial Crop Catalog
The system SHALL support at least seven configurable crops: Radish, Lettuce, Carrot, Kale, Basil, Tomato, and Strawberry, each defining growth duration, water demand, yield, base value, and repeat harvest capability.

#### Scenario: Crop catalog initialization
- **WHEN** the game loads crop definitions
- **THEN** all seven crops are available with their respective parameters, seed prices, base values, and color palettes

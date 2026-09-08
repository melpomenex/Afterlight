## Purpose

Defines the non-destructive shift from farming-centered presentation to social places while retaining legacy access, data and migration correctness.

## ADDED Requirements

### Requirement: Social presentation is primary

Social places SHALL prioritize place identity, people, chat, emotes and travel. Tool belts, farming rewards and economic progress SHALL NOT define their primary HUD. Legacy inventory/market access SHALL remain available and accurately labeled.

#### Scenario: Enter a social place

- **WHEN** a visitor leaves their garden for Rain Court
- **THEN** farming tools/coin progression leave the primary HUD and the held farming tool visual returns to hands.

#### Scenario: Inventory arrives

- **WHEN** a server inventory update arrives in a social place
- **THEN** cached values update without revealing hidden farming HUD sections.

### Requirement: Legacy access and controls survive

Market Court, personal gardens and legacy biomes SHALL remain accessible through Legacy areas and valid deep links. T SHALL remain travel; M and I SHALL retain labeled optional legacy functions. Emote-wheel and typing focus rules SHALL take precedence over contextual tool shortcuts.

#### Scenario: Return to garden

- **WHEN** a visitor selects their garden from Legacy areas
- **THEN** existing cultivation controls and saved progress are available.

#### Scenario: Emote selection

- **WHEN** a social visitor presses a number while the emote wheel owns input
- **THEN** it selects an emote and does not equip a farming tool.

### Requirement: Data and migration preservation

Presentation demotion SHALL NOT delete saves, original snapshots, tables or migration history, stop economic jobs, split domain ownership or mark unfinished migration work complete. Existing correctness/import/export/conservation work SHALL remain assigned to its owning change.

#### Scenario: Demotion rollout

- **WHEN** the new presentation is enabled
- **THEN** original snapshot contents and all existing balances/completion remain unchanged by the rollout.

#### Scenario: P6 incomplete

- **WHEN** production import or conservation evidence is missing
- **THEN** the migration remains incomplete and the product documentation does not claim it finished.

### Requirement: Accessible reversible UI

Hidden legacy controls SHALL be removed from keyboard navigation in social contexts; visible dialogs SHALL return focus and preserve narrow-screen access. Reverting the presentation SHALL NOT require data migration.

#### Scenario: Rollback

- **WHEN** the new HUD policy is disabled
- **THEN** legacy controls return without modifying or restoring any shared data.

#### Scenario: Keyboard walkthrough

- **WHEN** a user tabs through a social HUD
- **THEN** focus does not enter hidden farming controls and Places/close/chat remain usable.

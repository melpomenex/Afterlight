## Purpose

Defines Rooftop as a complete navigable multiplayer social destination with distinct composition, reusable atmosphere and measurable acceptance.

## ADDED Requirements

### Requirement: Rooftop continuity and gathering

The rooftop SHALL preserve rooftops identity, original gates, field note and saved anemometer completion while providing at least ten seats across three gathering groups. Social use SHALL NOT depend on restoration.

#### Scenario: Unrestored visitor

- **WHEN** a fresh visitor enters rooftops
- **THEN** all gathering areas, seats and weather are usable without completing the anemometer.

#### Scenario: Existing completed save

- **WHEN** a visitor with rooftops completed returns
- **THEN** the optional legacy restoration remains visible and no completion data is lost.

### Requirement: Bounded city illusion

The place SHALL present a distinct distant skyline with lit windows and bounded traffic detail beyond a navigable rooftop deck. Distant scenery SHALL NOT imply navigable city simulation or require additional room/presence systems.

#### Scenario: Look over edge

- **WHEN** a visitor uses the overlook in first person and isometric views
- **THEN** the skyline reads at distance while safe deck bounds and nearby seats remain clear.

### Requirement: Scheduled changing atmosphere

Rooftop SHALL use the shared schedule for sunset, cloud, light rain and night, including continuous cycle boundaries. Late join and restart SHALL sample the current schedule phase without replaying elapsed events.

#### Scenario: Mid-rain transition join

- **WHEN** a visitor joins 30 seconds into the rain transition
- **THEN** their light/fog/cloud/rain/wetness match current schedule phase rather than beginning at sunset.

#### Scenario: Cycle wrap

- **WHEN** the night segment returns to sunset
- **THEN** visual/audio state transitions continuously with finite values.

### Requirement: Skyline and weather acceptance

The place SHALL meet its specified world/effect budgets with skyline and maximum rain active simultaneously, at normal/reduced quality and all camera modes. It SHALL NOT require an experimental renderer or larger room capacity to pass.

#### Scenario: Rooftop acceptance

- **WHEN** the place is proposed for featured status
- **THEN** measured skyline-plus-weather results, seat/legacy-interaction evidence and cleanup soak are available and meet the gates.

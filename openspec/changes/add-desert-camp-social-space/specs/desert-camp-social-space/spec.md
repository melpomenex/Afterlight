## Purpose

Defines Desert Camp as a complete navigable multiplayer social destination with distinct composition, reusable atmosphere and measurable acceptance.

## ADDED Requirements

### Requirement: Desert identity and access

Desert Camp SHALL register desert-camp without changing legacy IDs, seeds or gate destinations. It SHALL offer a safe flat clearing, two return gates, tents/cloth shelter, dunes/mesas and at least eight seats across fire and quiet groups.

#### Scenario: New entry

- **WHEN** visitors travel to desert-camp
- **THEN** player/Kiln spawn safely and both exits and seating groups are reachable.

#### Scenario: Legacy route

- **WHEN** Desert is registered
- **THEN** the original seventeen-district gate destinations remain unchanged.

### Requirement: Fire as social anchor

The campfire SHALL be lit without fuel, payment or restoration and SHALL include bounded flame/ember effects, smooth warm illumination and user-enabled audio. Fire-circle seats SHALL face inward and provide safe standing.

#### Scenario: Sit by fire

- **WHEN** a visitor uses any fire-circle seat
- **THEN** the avatar faces the fire, others see sitting, and standing does not trap them inside the firepit or chair.

#### Scenario: Reduced quality

- **WHEN** effect quality is reduced
- **THEN** fire remains a recognizable illuminated anchor with bounded particles and no added shadow lights.

### Requirement: Desert atmosphere reuse

The place SHALL use the common atmosphere/event lifecycle for dry night, stars/Milky Way impression, subtle sand/wind and bounded shared meteors. It SHALL NOT require rain-specific controller branches or per-particle networking.

#### Scenario: Meteor late join

- **WHEN** a visitor joins after a meteor started
- **THEN** the old meteor is skipped and the next future event follows current shared timing.

#### Scenario: Leave camp

- **WHEN** a visitor travels to Theater
- **THEN** camp sound, flame/ember updates and meteor resources stop and no sand remains in Theater.

### Requirement: Desert acceptance

Acceptance SHALL include normal/reduced budgets, all camera modes, actual Kiln routes, eight-seat use and a ten-minute active/20-round-trip resource report.

#### Scenario: Camp acceptance

- **WHEN** the implementation claims the destination complete
- **THEN** its report demonstrates a distinct sand/sky/fire composition and measured bounded resources, without a progression objective.

## Purpose

Provides reusable sitting and safe standing behavior in social environments without changing Theater presentation or introducing reserved seating.

## ADDED Requirements

### Requirement: Oriented social seats

Seats SHALL declare a valid sitting pose and safe dismount choices. The system SHALL orient the local avatar to the seat and expose sitting through the existing remote presence pose. Seats SHALL NOT require restoration, payment or network reservation.

#### Scenario: Fire-facing seat

- **WHEN** a player uses a seat oriented toward a campfire
- **THEN** their avatar faces the fire and other occupants see a seated pose.

#### Scenario: Existing Theater seat

- **WHEN** a historical Theater seat lacks extended metadata
- **THEN** its existing facing, seated offset, clear front dismount and cinema behavior are preserved.

### Requirement: Safe escape from seating

E, movement, Space, walk-click, Escape and travel SHALL provide a way to leave seating, clear jump momentum and restore normal movement. Dismount SHALL choose a walkable authored point or the safe spawn if none remains usable.

#### Scenario: Blocked dismount

- **WHEN** the first dismount point is blocked but another is free
- **THEN** the avatar stands at the free point and can walk away.

#### Scenario: No dismount available

- **WHEN** all authored dismount choices are blocked
- **THEN** standing uses the verified safe spawn instead of trapping the avatar.

#### Scenario: Throttled pose packet

- **WHEN** a sit/stand transition occurs inside the normal movement send throttle
- **THEN** the next permitted movement transmission carries the resulting seated state.

### Requirement: Seating composes with existing input

Seated emotes SHALL retain folded legs; leaving or jumping SHALL clear the pose appropriately. Dialog and chat focus SHALL NOT trap a seated player or allow typing to move the avatar.

#### Scenario: Chat to standing

- **WHEN** a seated player exits chat and uses the stand action
- **THEN** focus returns to gameplay and the player stands safely.

#### Scenario: Seated emote

- **WHEN** a seated player performs an existing emote
- **THEN** other occupants see the emote while the seated lower-body pose remains consistent.

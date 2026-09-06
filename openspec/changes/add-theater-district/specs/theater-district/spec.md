## Purpose

The Orpheum is a travelable theater district where players sit down together in front of a big screen. This capability covers the place itself — layout, seating, restoration objective, and how seated players appear to each other — not what plays on the screen (see `video-screen`, `shared-viewing`).

## ADDED Requirements

### Requirement: Theater is a travelable district
The system SHALL expose a stable district with id `theater` (display name "The Orpheum") that is reachable through the existing district selector and gate network, with its own fog/lighting theme, title, objective label, minimap diagram, entrance spawn positions for the player and Kiln, and exploration-save integration consistent with existing districts.

#### Scenario: Travel to the theater
- **WHEN** the player selects The Orpheum in the district menu or enters its gate
- **THEN** the auditorium is shown with its own atmosphere, the HUD title/objective/minimap update to the theater, the player and Kiln appear at the entrance, and held movement keys and stale interaction targets are cleared

#### Scenario: Return after reload
- **WHEN** the player reloads while their saved current district is `theater`
- **THEN** they are restored to the theater entrance, previously completed theater objectives remain completed, and its completion visuals are already applied on rebuild

### Requirement: Auditorium is navigable
The theater SHALL be laid out within the standard district bounds as a readable auditorium: rows of seats with at least one clear aisle, a screen wall with a raised stage/screen area, a projector position, a field-note stand, and gate openings, such that the player can walk from the entrance to any seat, the field note, the screen area, the projector, and both gates by direct movement without needing route planning. Seats and other large props SHALL be solid; decorative litter SHALL not block movement.

#### Scenario: Walk to a back-row seat
- **WHEN** the player click-walks from the entrance toward a seat in the rearmost row
- **THEN** they reach an interaction-adjacent standing point via a clear aisle without getting stuck on seat rows or decor

### Requirement: Players can sit in seats
Each theater seat SHALL be an interactable: pressing E (or the on-screen action button) near a seat seats the player in it — the actor snaps to the seat position facing the screen in a visibly seated pose, walking stops, and the interaction prompt offers to stand. Pressing E again, or pressing any movement key, SHALL stand the player up and return control. Sitting MUST be idempotent (repeated interaction does not duplicate state) and MUST work for any seat, not a single designated one.

#### Scenario: Sit and stand
- **WHEN** the player interacts with a seat, then presses a movement key
- **THEN** the player visibly sits in that seat facing the screen, and afterwards stands up at the seat and can walk away

#### Scenario: Sitting is per-seat
- **WHEN** two players each interact with different seats in the same room
- **THEN** each sits in the seat they chose, and no seat can hold two seated players visibly overlapping (a taken seat shows its occupant seated, not standing inside it)

### Requirement: Remote players appear seated
The presence system SHALL carry an additive seated flag so that when a remote player sits, other clients render that player's avatar seated at their seat; when they stand or move, clients render them walking again. The flag MUST be additive and MUST NOT break clients or servers that predate it.

#### Scenario: Friend sits across the room
- **WHEN** a remote player in the same room sits in a seat
- **THEN** other players in that room see the avatar seated in that seat, and see it stand and walk normally when the player moves

### Requirement: Projector restoration objective
The theater SHALL follow the standard one-landmark district loop: an objective to restore power to the projector, completable via interaction, with a visible in-world completion effect (marquee and aisle lights coming on and the screen powering on), recorded in the existing exploration save as id `theater`, idempotent under repeated interaction, applied immediately when rebuilding an already-completed theater, and NOT required for the screen to play content.

#### Scenario: Restore and see it persist
- **WHEN** the player interacts with the dead projector, then travels away, returns, and reloads
- **THEN** the marquee/aisle lights and screen power-on state are visible each time, the objective shows done, and interacting again does not duplicate anything

### Requirement: Theater field note
The theater SHALL include a readable field note in keeping with the game's tone, reachable from the entrance, persisted with the existing field-note behavior.

#### Scenario: Read the note
- **WHEN** the player walks to the note stand and interacts
- **THEN** the note's title and body are shown, and the interaction works again after travel and reload

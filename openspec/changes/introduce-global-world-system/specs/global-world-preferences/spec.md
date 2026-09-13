## Purpose

Defines a persistent personal environmental identity that follows a visitor across Afterlight places and activities without becoming multiplayer simulation state.

## ADDED Requirements

### Requirement: One canonical personal World

The system SHALL maintain one active personal World ID and subordinate variant for each running client. Place travel, activity entry/exit, participation changes, reconnect, nickname changes and guest-token renewal SHALL NOT change that selection. The initial catalog SHALL preserve coastal, rainforest, alpine, desert, redwood and cloud, including all eighteen existing variants and preset links.

#### Scenario: Round trip through games
- **WHEN** a coastal visitor approaches the arcade, plays pool, enters Kart Royale, returns, enters Summit Run and returns to the theater
- **THEN** their selected World and variant remain coastal and the original variant throughout.

#### Scenario: Existing variants
- **WHEN** any of the eighteen existing environment preset links is opened
- **THEN** it resolves to the same World and variant identity as before the migration.

### Requirement: Initial assignment and browser persistence

A visitor with no valid saved or migratable World SHALL receive a uniform random assignment among the six registered Worlds, using that World's default variant, once per initialization and persist it when storage permits. Valid saved choices SHALL take precedence over new assignment. Unknown, removed, malformed or corrupt saved selections SHALL be repaired once using this policy. An unavailable catalog SHALL use the built-in coastal/sunset fallback. Storage denial SHALL preserve the selection for the running session without throwing or claiming it was saved. Browser-local persistence SHALL NOT be described as account-wide persistence.

#### Scenario: Returning guest
- **WHEN** a guest reloads with a saved rainforest/mist selection
- **THEN** the selection is restored without rerolling, regardless of a new connection token.

#### Scenario: Missing or removed preference
- **WHEN** no valid registered World can be recovered from saved data
- **THEN** one valid World is assigned and subsequent travel and reconnect do not assign again.

#### Scenario: Storage unavailable
- **WHEN** a selection cannot be written to browser storage
- **THEN** it remains active for the session and the picker indicates that it applies for this visit.

### Requirement: Compatible preference migration

The system SHALL migrate valid environment/variant fields from the existing environment-preference record to World selection, preserve quality and unrelated preferences, and use a World's default variant when only its variant is invalid. Quality updates SHALL preserve World selection. Existing game saves, identity tokens, media lists and server snapshots SHALL NOT be reset or repurposed.

#### Scenario: Legacy record
- **WHEN** the existing preference record contains environment alpine, variant aurora and quality low
- **THEN** alpine/aurora and low quality are retained through migration and reload.

#### Scenario: Quality change
- **WHEN** a visitor changes quality after selecting redwood/fog
- **THEN** the saved and active World remain redwood/fog.

### Requirement: Deep links are session previews

A valid preset query SHALL override a valid World query for the session; a valid World query SHALL use its default variant. Invalid queries SHALL fall through to saved selection or initial assignment. A preview SHALL NOT overwrite an existing durable preference. If no durable selection exists, initial assignment SHALL still be persisted independently of the preview. Explicit picker selection SHALL persist the chosen selection, including selection of the previewed World.

#### Scenario: Preview without saving
- **WHEN** a cloud visitor opens a valid coastal preset link then returns without query parameters
- **THEN** the link session shows coastal and the next session restores cloud.

#### Scenario: Save the preview
- **WHEN** the visitor explicitly selects the previewed coastal variant in the picker
- **THEN** coastal becomes the durable selection when storage succeeds.

### Requirement: Personal World selection UX

The existing World picker SHALL select the visitor's World, explain browser-local scope and shared occupancy, and show the current variant and persistence/preview status. It SHALL be reachable in the social HUD and Settings, including a supported active game through Settings. Selection SHALL work offline, preserve participation and media, and not request a room atmosphere change. Dialog input, focus, close behavior and narrow-screen usability SHALL follow existing controls.

#### Scenario: Offline selection
- **WHEN** an offline visitor selects desert/night
- **THEN** their supported View adopts its presentation without waiting for a server reply.

#### Scenario: Change while playing
- **WHEN** a participant changes World through Settings during a supported game
- **THEN** the game session, score and participation remain intact and gameplay input is cleared safely while the dialog is open.

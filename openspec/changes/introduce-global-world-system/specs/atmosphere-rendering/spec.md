## ADDED Requirements

### Requirement: Personal World presentation composes with render ownership

A compatible View SHALL render local World atmosphere through its current presentation owner, with only explicitly supported slots applied. Hidden or suspended View environments SHALL perform no cosmetic updates or uploads. On release or failure, borrowed renderer state, shader changes and material parameters SHALL be restored without altering other cached Views. Personal lighting, fog, particles and weather SHALL preserve gameplay visibility, all camera modes and authoritative activity cues.

#### Scenario: Return from a hosted game
- **WHEN** a visitor exits Kart after a personal World change or failed probe update
- **THEN** the theater renders the current selected World with correct restored renderer/shader state and no changes to its screen, actors or camera preference.

#### Scenario: Two weather consumers
- **WHEN** a local World prefers calm skies while an activity requires authoritative wind or rain cues
- **THEN** the activity retains those readable cues and receives no different physical conditions from local visual settings.

#### Scenario: Hidden theater
- **WHEN** a separate game scene owns presentation
- **THEN** hidden theater World particles, animation uploads and visual events stop until the theater is presented again.

#### Scenario: Comfort limits across hosts
- **WHEN** a visitor changes World with particles disabled and reduced motion enabled
- **THEN** those settings remain effective across the social host and supported game adapters without multiplying effect budgets.

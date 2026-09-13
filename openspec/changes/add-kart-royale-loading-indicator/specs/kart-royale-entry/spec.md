## Purpose

Defines what a player observably experiences when entering the Kart Royale cabinet: from pressing E until the race view is presented, the game must give persistent, honest loading feedback so a slow cold start (tens of seconds) is never mistaken for a frozen game, and every way the attempt can end must leave the player in an understandable state.

## ADDED Requirements

### Requirement: Persistent loading feedback during entry
When a player activates the Kart Royale cabinet, the system SHALL present a loading indicator that remains visible from the activation until the race view is presented or the attempt reaches a terminal state. The indicator MUST NOT be transient-only: a toast alone does not satisfy this requirement.

#### Scenario: Cold entry shows a lasting indicator
- **WHEN** a player presses E at an idle Kart Royale cabinet and the race host needs a cold boot
- **THEN** a loading indicator appears and stays visible for as long as the boot continues, including after any transient toast has disappeared

#### Scenario: Indicator clears when the race view is presented
- **WHEN** the boot completes and the race view takes over presentation
- **THEN** the loading indicator is removed and does not remain under or behind the race view

### Requirement: Honest phase progress
The loading indicator SHALL communicate progress as the actual boot phases it passes through (loading game modules, preparing the race host, warming up graphics, preparing the grid) and elapsed time. The indicator MUST NOT display a fabricated completion percentage or a countdown to a promised finish time.

#### Scenario: Phases advance with real boot work
- **WHEN** the boot passes from module import into host construction and graphics warm-up
- **THEN** the indicator's phase labels advance accordingly and never move backwards within one attempt

#### Scenario: Elapsed time is shown, no percentage invented
- **WHEN** the boot has been running for a while without completing
- **THEN** the indicator continues to show activity (phase label and/or elapsed time) and shows no percentage of completion

### Requirement: Cancellation stays available and visible
For as long as the boot is cancellable, the loading indicator SHALL visibly offer the cancellation control (press Esc to cancel), and activating it SHALL dismiss the indicator and return the player to the world without the race view appearing afterwards.

#### Scenario: Player cancels a slow boot
- **WHEN** the player presses Esc while the loading indicator is visible and the boot is still running
- **THEN** the indicator disappears, the attempt terminates, and the Theater view continues unchanged

### Requirement: Fast re-entry does not flash
When a retained, ready race host allows near-instant entry, the system SHALL NOT show a disruptive loading indicator for the brief preparation; any indicator that did appear MUST be dismissed without a perceptible flash.

#### Scenario: Retained host re-entry
- **WHEN** a player re-enters the cabinet while a retained ready host exists and presentation starts almost immediately
- **THEN** either no loading indicator is shown or it is dismissed within a moment without flashing

### Requirement: Terminal failures restore an understandable state
When the entry attempt fails (load failure, boot error, graphics context loss) or is terminated (seat loss, travel, dispose), the loading indicator SHALL be removed and the system SHALL surface the outcome through the existing failure feedback (toast) where a failure message exists. The indicator MUST NOT remain visible after the attempt has ended.

#### Scenario: Boot failure dismisses the indicator
- **WHEN** the race host fails to load or boot while the loading indicator is visible
- **THEN** the indicator is removed and the existing failure toast is shown instead

#### Scenario: Cabinet screen returns to its idle presentation
- **WHEN** an entry attempt ends by any terminal path
- **THEN** the cabinet screen resumes its normal idle/occupied presentation rather than staying on a loading state

### Requirement: Cabinet screen reflects boot state
While a player is booting the cabinet's race, the cabinet's own display SHALL present a loading state (distinct from the attract mode and from the occupied/racing display), so a player looking at the machine sees that the game is loading.

#### Scenario: Cabinet shows loading during its player's boot
- **WHEN** the boot for the seated player's session is running and the cabinet screen is visible
- **THEN** the cabinet screen paints a loading presentation instead of the "PRESS E TO RACE" attract mode

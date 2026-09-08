## MODIFIED Requirements

### Requirement: Responsive District Navigation Dialog

The system SHALL provide an accessible, scrollable responsive Places modal over the full-window game. It SHALL list accepted featured social places first and retain all existing districts, Market Court and the personal garden in an expandable Legacy areas section. Existing visited and completion indicators SHALL remain available for legacy districts; objective-free places SHALL NOT receive compulsory restoration badges. The T hotkey and Travel button SHALL open the selector, and native cancellation SHALL close it and restore gameplay focus.

#### Scenario: Opening district navigation dialog
- **WHEN** the player opens the selector via T or the Travel button
- **THEN** it displays accepted featured destinations and an accessible Legacy areas section with the existing districts and their saved status

#### Scenario: Fast-traveling to a discovered district
- **WHEN** the player selects an available district from either section
- **THEN** the dialog closes and the player travels to the selected district's safe entrance

#### Scenario: Keyboard and narrow-screen access
- **WHEN** the selector is used by keyboard or in a narrow viewport
- **THEN** all destinations and the close action remain reachable without overlapping essential controls, and closing clears held movement and returns focus to the game

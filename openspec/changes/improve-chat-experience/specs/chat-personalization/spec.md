## Purpose

Provides a structured, persistent user customization system for the Afterlight chat interface, allowing players to personalize presets, density, typography, layouts, and environmental world themes.

## ADDED Requirements

### Requirement: Chat appearance presets
The system SHALL provide authored appearance presets that configure the chat panel's visual language as a harmonious baseline. The presets SHALL include:
- `afterlight`: Warm industrial copper, brass accents, and subtle moss patina (default).
- `minimal`: Muted borders, reduced contrast, distraction-free reading.
- `glass`: Translucent frosted surface with refined light borders.
- `terminal`: Retro phosphor amber palette and Space Mono typography.
- `cozy`: Warm hearth amber surface with softer rounded accents.
- `cinematic`: High-contrast dark backdrop optimized for watching theater media.

#### Scenario: Selecting an appearance preset
- **WHEN** the user selects the "Terminal" preset in the appearance panel
- **THEN** the chat panel immediately applies the monospace font, amber accent tokens, and dark terminal surface styling

### Requirement: Modular styling dimensions
The system SHALL allow players to customize independent presentation dimensions without breaking chat layout or readability:
- **Layout**: Comfortable, Compact, Bubble.
- **Density**: Compact (tighter padding/line height), Default, Spacious.
- **Font Size**: Small (11.5px), Normal (13px), Large (14.5px).
- **Background**: Solid, Translucent, Glass, Transparent, Match World.
- **Timestamps**: Always, Hover, Hidden.
- **Avatars**: Show, Hide.

#### Scenario: Adjusting density and font size
- **WHEN** the user changes density to "Spacious" and font size to "Large"
- **THEN** the chat log adjusts message line height, element spacing, and font sizes accordingly without clipping text

#### Scenario: Toggling avatar visibility
- **WHEN** the user disables avatar visibility
- **THEN** message lines hide avatar badges and initials while retaining sender names and readability

### Requirement: World theme integration (Match World)
When the background mode is set to `match-world`, the chat panel SHALL dynamically bind semantic color tokens (surface tint, border tint, and accent glow) to the active environment (`coastal`, `rainforest`, `alpine`, `desert`, `redwood`, `cloud`). If the active world changes while chat is open, the styling SHALL transition smoothly while maintaining WCAG AA text contrast.

#### Scenario: Match World with coastal environment
- **WHEN** the player is in The Orpheum with the coastal world active and `match-world` background is enabled
- **THEN** the chat panel adopts cool sea-glass teal accents and subtle oceanic tinted surfaces

#### Scenario: Contrast preservation
- **WHEN** any world theme or preset is applied
- **THEN** all message text maintains at least 4.5:1 contrast against the computed background

### Requirement: Appearance settings dialog with live preview and persistence
The system SHALL provide an appearance settings modal accessible from the chat panel header. The dialog SHALL feature an interactive Live Preview showing real-time updates as options change, a "Reset to defaults" button, and persistent synchronization to `localStorage` under `afterlight-chat-preferences`.

#### Scenario: Live preview updates immediately
- **WHEN** the user modifies options within the settings modal
- **THEN** the live preview component demonstrates the changes immediately before closing the dialog

#### Scenario: Persistence across browser reloads
- **WHEN** the user configures custom chat settings and reloads the page
- **THEN** all custom preferences are re-applied accurately on startup

#### Scenario: Reset to defaults
- **WHEN** the user clicks "Reset to defaults"
- **THEN** all chat appearance dimensions revert to the default Afterlight preset and clean configuration

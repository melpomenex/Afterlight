## Purpose

The player-facing chat experience inside the Afterlight HUD: reading the town conversation, speaking into it, whispering directly to others, all without breaking movement controls or the game's quiet visual language.

## Requirements

### Requirement: Chat panel in the HUD
The game SHALL display a collapsible chat panel in the HUD showing recent messages (channel, direct, and system) with sender attribution, visually distinguishing direct messages, action lines, and one's own messages. The panel SHALL follow the existing translucent HUD visual language and remain readable and non-overlapping at desktop and narrow viewport widths.

#### Scenario: Panel shows conversation
- **WHEN** players and IRC users exchange messages
- **THEN** the panel lists them in order with sender names, and direct/action/system lines are visually distinct

#### Scenario: Narrow viewport
- **WHEN** the game is viewed at the narrowest supported viewport
- **THEN** the chat panel does not overlap or obscure other essential HUD controls

### Requirement: Conversation history on connect
On connecting, a player SHALL receive the recent channel history from the server (a bounded buffer of at least the last 50 messages) so the panel is not empty while others are mid-conversation. History SHALL also include messages sent while the player was offline but the server was running.

#### Scenario: Late joiner catches up
- **WHEN** a player connects while two others have been chatting
- **THEN** the panel shows the recent prior messages before any new ones

### Requirement: Input focus and typing safety
The player SHALL open chat input with a dedicated key (T or Enter) and by clicking the input. While the input has focus, typing MUST NOT move the player or trigger other game hotkeys, and Escape SHALL release focus back to the game. Sending with Enter SHALL return focus to the game unless Shift (or an explicit setting) keeps it open.

#### Scenario: Typing does not move the robot
- **WHEN** the chat input is focused and the player types "wasd"
- **THEN** the player's robot does not move

#### Scenario: Escape releases focus
- **WHEN** the player presses Escape while the input is focused
- **THEN** focus returns to the game and movement keys work again immediately

### Requirement: Sending messages and slash commands
Typed input SHALL send to the shared channel by default. The player SHALL be able to send direct messages with `/msg <nick> <text>` and action lines with `/me <action>`. Unknown or malformed commands SHALL produce visible feedback, and empty input SHALL NOT be sent.

#### Scenario: Channel message
- **WHEN** the player types "hello town" and presses Enter
- **THEN** the message appears in their panel (echoed exactly once) and other participants receive it

#### Scenario: Direct message command
- **WHEN** the player types `/msg KilnBot ping`
- **THEN** only the holder of nickname KilnBot receives it, and the player's panel shows it as a direct message

#### Scenario: Malformed command
- **WHEN** the player types `/msg` with no target or text
- **THEN** the panel shows usage feedback and nothing is sent

### Requirement: Unread awareness and offline state
When the panel is collapsed, newly arriving messages SHALL produce a visible unread indicator (with a count) on the panel toggle. While the multiplayer connection is down, the input SHALL be disabled with a clear status note and submissions SHALL NOT pretend to succeed.

#### Scenario: Unread badge while collapsed
- **WHEN** messages arrive while the panel is collapsed
- **THEN** the toggle shows an unread count that clears when the panel is opened

#### Scenario: Disconnected chat
- **WHEN** the game has lost its server connection and the player attempts to type
- **THEN** the input is disabled or refuses to send with an explanatory note, and no message is echoed as delivered

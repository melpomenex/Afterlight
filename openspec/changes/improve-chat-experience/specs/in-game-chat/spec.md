## MODIFIED Requirements

### Requirement: Chat panel in the HUD
The game SHALL display a collapsible chat panel in the HUD showing recent messages (channel, direct, and system) with sender attribution, visually distinguishing direct messages, action lines, and one's own messages. The panel SHALL support consecutive message grouping by sender within a temporal window (3 minutes) and multiple layout modes (Comfortable, Compact, Bubble). The panel SHALL follow the existing translucent HUD visual language and remain readable and non-overlapping at desktop, cinema view, and narrow viewport widths.

#### Scenario: Panel shows conversation
- **WHEN** players and IRC users exchange messages
- **THEN** the panel lists them in order with sender names, and direct/action/system lines are visually distinct

#### Scenario: Panel shows grouped conversation
- **WHEN** a player sends multiple consecutive messages within 3 minutes without intervening senders
- **THEN** subsequent messages are grouped under the sender's header without repeating the avatar/name badge

#### Scenario: Layout mode reflow
- **WHEN** the user selects Compact, Comfortable, or Bubble layout mode
- **THEN** existing and incoming messages render immediately according to the selected layout structure

#### Scenario: Narrow viewport
- **WHEN** the game is viewed at the narrowest supported viewport
- **THEN** the chat panel does not overlap or obscure other essential HUD controls

### Requirement: Input focus and typing safety
The player SHALL open chat input with dedicated keys (T, Enter, or Slash) and by clicking the input. While the input or any chat popup has focus, typing MUST NOT move the player or trigger other game hotkeys. Escape SHALL hierarchically dismiss any active popup (emoji picker, autocomplete) before releasing focus back to the game canvas. Sending with Enter SHALL return focus to the game unless Shift (or Shift+Enter) keeps it open. The composer SHALL preserve partial message drafts across panel collapse/expand and room transitions.

#### Scenario: Typing does not move the robot
- **WHEN** the chat input is focused and the player types "wasd"
- **THEN** the player's robot does not move

#### Scenario: Escape releases focus
- **WHEN** the player presses Escape while the input is focused
- **THEN** focus returns to the game and movement keys work again immediately

#### Scenario: Hierarchical Escape releases transient UI then game focus
- **WHEN** the emoji picker is open and the player presses Escape
- **THEN** the emoji picker closes and focus returns to the chat input without blurring to the game

#### Scenario: Draft preservation
- **WHEN** a player types a draft in the composer and collapses the panel or travels between rooms
- **THEN** reopening the chat panel retains the exact typed draft

### Requirement: Unread awareness and offline state
When the panel is collapsed, newly arriving messages SHALL produce a visible unread indicator (with a count) on the panel toggle. When the panel is open and the user has scrolled up to read history, incoming messages MUST NOT force or jerk the scroll position; the panel SHALL display an unread jump pill indicator (`↓ N new messages`) that jumps to the newest message when clicked. While the multiplayer connection is down, the input SHALL be disabled with a clear status note and submissions SHALL NOT pretend to succeed.

#### Scenario: Unread badge while collapsed
- **WHEN** messages arrive while the panel is collapsed
- **THEN** the toggle shows an unread count that clears when the panel is opened

#### Scenario: Scroll anchoring and jump indicator
- **WHEN** the user scrolls upward in the chat log and new messages arrive
- **THEN** the user's scroll position is preserved without jumping and an unread jump pill displays the number of new messages

#### Scenario: Clicking jump pill scrolls to latest
- **WHEN** the user clicks the unread jump pill
- **THEN** the log smoothly scrolls to the bottom and the jump pill disappears

#### Scenario: Disconnected chat
- **WHEN** the game has lost its server connection and the player attempts to type
- **THEN** the input is disabled with an explanatory note, and no message is echoed as delivered

## ADDED Requirements

### Requirement: Native Unicode emoji picker
The chat panel SHALL include an accessible, keyboard-navigable native Unicode emoji picker button adjacent to the composer. The picker SHALL offer categorized tabs (Smileys, Gestures, Animals, Food, Travel, Activities, Objects, Symbols), instant keyword search, recently used emoji tracking stored in localStorage, arrow-key grid navigation, Enter to insert at cursor position, and Escape to dismiss.

#### Scenario: Opening and searching the emoji picker
- **WHEN** the user clicks the emoji toggle button or focuses it and presses Enter
- **THEN** the picker opens with categorized emoji, and typing in search filters results in real time

#### Scenario: Keyboard navigation in emoji grid
- **WHEN** navigating inside the emoji grid using Arrow keys
- **THEN** the active emoji focuses with a visible focus ring, and pressing Enter inserts the emoji into the composer at the cursor position

#### Scenario: Recently used emoji persistence
- **WHEN** an emoji is selected from the picker
- **THEN** it is added to the recently used row and persists in localStorage across reloads

### Requirement: Contextual emoji and mention autocomplete
The composer SHALL provide contextual autocomplete suggestions: typing a colon followed by letters (e.g. `:wave`) SHALL display an emoji autocomplete popover; typing `@` followed by letters SHALL display a player mention autocomplete popover with online players. Autocomplete suggestions SHALL support navigation with Up/Down arrow keys, insertion with Enter or Tab, and cancellation with Escape or backspace.

#### Scenario: Emoji shortcode autocomplete
- **WHEN** the user types `:heart` into the composer
- **THEN** an autocomplete popover suggests matching heart emoji with preview and shortcode, and pressing Enter or Tab replaces the shortcode with the selected emoji

#### Scenario: Mention autocomplete
- **WHEN** the user types `@` followed by the prefix of an active player's nickname
- **THEN** matching player nicknames are listed, and selecting one inserts `@Nickname ` into the composer

### Requirement: Message interaction, replies, and mentions
Messages in the log SHALL expose contextual actions on hover and keyboard focus, including Reply and Copy. Clicking Reply SHALL populate a quoted reference in the composer (`↳ @user: snippet`); when rendered in the log, reply references SHALL be clickable and scroll smoothly to the referenced source message. Messages that mention the current player's nickname SHALL display with a distinct personal highlight. Clicking any sender's nickname in the log SHALL insert an `@Nickname ` mention in the composer.

#### Scenario: Threaded-lite reply action
- **WHEN** the user activates Reply on an existing message
- **THEN** the composer displays the reply target and formats the outgoing message with a structured quote header

#### Scenario: Clicking a reply quote jumps to original message
- **WHEN** a user clicks the quote header on a reply message
- **THEN** the chat log scrolls to the referenced original message and temporarily highlights it

#### Scenario: Current user mention highlight
- **WHEN** an incoming message contains `@<CurrentPlayerNickname>`
- **THEN** the message line renders with a distinct personal mention highlight

## Purpose

Connects the in-game WebSocket world and the IRC server so players, external IRC users, and bots share one conversation: the same channel, the same direct messages, and consistent presence.

## Requirements

### Requirement: Per-player IRC presence
When a player completes the game handshake, the server SHALL establish that player's presence on the IRC server under their game nickname inside `#afterlight`, and SHALL tear it down when the player disconnects. External IRC clients SHALL see the player join and quit in step with their game session.

#### Scenario: Player appears and disappears on IRC
- **WHEN** a player connects to the game and later disconnects
- **THEN** an external IRC client in `#afterlight` first receives the player's JOIN and later their QUIT

#### Scenario: Nick conflict at connect time
- **WHEN** a player's game nickname is already held by an external IRC connection
- **THEN** the player is still bridged under a derived, collision-free nickname (documented suffix) and their in-game chat works normally

### Requirement: In-game messages reach IRC
A player's chat message sent through the game connection SHALL appear in `#afterlight` as a PRIVMSG from that player's IRC presence, and SHALL be delivered to all other in-game players. The server SHALL sanitize content and cap message length before relay; oversized or empty submissions are rejected with feedback.

#### Scenario: Game to IRC relay
- **WHEN** an in-game player sends "the mill is restored!"
- **THEN** an external IRC client in `#afterlight` receives that text as a PRIVMSG attributed to the player's nickname

#### Scenario: Length cap
- **WHEN** a player submits a message longer than the allowed length
- **THEN** it is not relayed as-is; the sender receives feedback and other users never see an over-long line

### Requirement: IRC messages reach the game
A PRIVMSG sent to `#afterlight` by any IRC connection SHALL be delivered to every connected in-game player, attributed to the sender's nickname, with external senders distinguishable from players. CTCP ACTION (/me) text SHALL be relayed as an action-style message rather than raw CTCP.

#### Scenario: IRC to game relay
- **WHEN** an external IRC client sends PRIVMSG `#afterlight` :bots online
- **THEN** every connected player's game session receives the message attributed to that client's nickname

#### Scenario: Action message
- **WHEN** an IRC client sends a CTCP ACTION to `#afterlight`
- **THEN** in-game players see it as an action line from that nickname, not as literal CTCP bytes

### Requirement: Direct message relay both directions
A player's direct message to a nickname SHALL be delivered only to that nickname's IRC connection (or, if the target is an in-game player, only that player's session). An IRC client's PRIVMSG addressed to a player's nickname SHALL be delivered only to that player's game session. Directing a message at an unknown nickname SHALL produce clear feedback to the sender and deliver nothing to anyone else.

#### Scenario: Player DMs an IRC bot
- **WHEN** an in-game player sends a direct message to an external IRC client's nickname
- **THEN** only that IRC connection receives the PRIVMSG; no other client or player sees it

#### Scenario: Bot DMs a player
- **WHEN** an external IRC client sends PRIVMSG to a player's nickname
- **THEN** only that player's game session receives the direct message

#### Scenario: Unknown target
- **WHEN** a sender directs a message to a nickname that is not online
- **THEN** the sender receives failure feedback and no other party receives anything

### Requirement: Presence event sync
Game-side room joins and leaves SHALL NOT require any action on IRC (room presence stays a game concept), but chat-visible presence events — players connecting or disconnecting, and external IRC users joining or leaving `#afterlight` — SHALL surface as system lines in the in-game chat panel so players can tell who is around.

#### Scenario: External bot joins the channel
- **WHEN** an external IRC client JOINs `#afterlight`
- **THEN** connected players see a system line naming the newcomer in their chat panel

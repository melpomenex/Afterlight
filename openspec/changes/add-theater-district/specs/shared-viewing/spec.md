## Purpose

Everyone in The Orpheum watches one screen: a single server-authoritative "now playing" state per theater room, controlled by any occupant, snapshotted for late joiners, and persisted across restarts. This capability defines the shared-state behavior; source formats and player-facing controls are covered by `video-screen`.

## ADDED Requirements

### Requirement: One shared screen state per room
The theater room SHALL have a single authoritative playback state containing at minimum: the current item's source type, its resolved playable URL, a display title, playing/paused flag, playback position tracking, the queue, and the nickname of whoever last changed it. Clients SHALL NOT be required to derive shared state from other clients' messages.

#### Scenario: State is attributable
- **WHEN** a player flips the channel or queues a video
- **THEN** other players in the room can see what is playing and who changed it

### Requirement: Any occupant can control
Any player present in the theater room SHALL be able to queue, play, flip, pause, seek, skip, and clear — there is no host permission. Every accepted control action SHALL update the shared state for all players in the room.

#### Scenario: Second viewer takes over
- **WHEN** player A queues a video and player B, in the same room, pauses it
- **THEN** both players (and anyone joining later) see the paused state

### Requirement: Changes broadcast to the room
Every accepted change to the shared state SHALL be delivered to all players in the theater room promptly (well under a second in normal operation), and rejected/invalid actions SHALL produce an error feedback only to the sender without disturbing the shared state.

#### Scenario: Rejected action does not disturb the room
- **WHEN** a player sends a malformed or invalid control action
- **THEN** only that player receives an error and every other player's screen state is unchanged

### Requirement: Late joiners get a snapshot
When a player joins the theater room (including on reconnect), the server SHALL send them the current shared state — now playing, position, playing/paused, and queue — and their screen SHALL settle on the same item at approximately the shared position rather than restarting the item from zero.

#### Scenario: Join mid-video
- **WHEN** a player enters the theater while a 10-minute video is 4 minutes in
- **THEN** their screen begins showing that video near the 4-minute mark with the shared queue intact

### Requirement: Shared playback clock
While playing, all viewers SHALL derive the current position from the shared state's timeline (a recorded position plus elapsed shared time) rather than from when their own client loaded the media, so viewers' positions stay aligned; seeking SHALL move the timeline for everyone, and pausing SHALL hold a stable position that resumes from for everyone. Clients SHALL tolerate and gently correct small drift without visible stutter.

#### Scenario: Pause is shared
- **WHEN** any player pauses, waits, then resumes
- **THEN** all viewers resume from the same shared position, not from locally elapsed time

#### Scenario: Seek is shared
- **WHEN** a player seeks forward 30 seconds
- **THEN** other viewers' screens jump to the new shared position

### Requirement: Theater state persists
The shared theater state (now playing and queue) SHALL persist across server restarts via the existing game-state persistence, with malformed or missing theater data tolerated (defaults to empty/idle). A stop/clear control SHALL reset the room to the idle state for everyone.

#### Scenario: Server restart keeps the room's place
- **WHEN** the server is restarted while a video plays and a client reconnects
- **THEN** the client receives the persisted now-playing state and queue

### Requirement: Server-side validation and limits
The server SHALL validate theater actions before applying them: `http(s)` URLs only, bounded title/URL lengths, a bounded queue size, and bounded seek targets within the item's known duration when known. IPTV channel selection SHALL share the resolved stream URL and name, not a channel index, so viewers who never imported the originating list see the same channel. Oversized or malformed inputs SHALL be rejected without affecting existing state or other clients.

#### Scenario: Queue limit enforced
- **WHEN** the queue is at its maximum and a player tries to add another item
- **THEN** the server rejects the addition with an explanatory error and the existing queue is unchanged

#### Scenario: Channel survives for non-importers
- **WHEN** a player who imported a private IPTV list selects channel 42
- **THEN** a player who never imported that list still receives and plays channel 42's resolved stream

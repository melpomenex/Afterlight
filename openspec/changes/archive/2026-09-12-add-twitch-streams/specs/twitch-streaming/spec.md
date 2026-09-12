## Purpose

Twitch links pasted into The Orpheum play for the whole room through Twitch's official embeds, covering live channels, VODs, and clips with honest shared-clock semantics for each.

## ADDED Requirements

### Requirement: Twitch share links are recognized at the input
The booth SHALL accept Twitch share links: a live channel (`twitch.tv/<channel>`, including the `www` and `m` hosts), a VOD (`twitch.tv/videos/<id>`), a clip (`clips.twitch.tv/<slug>`), and a channel clip path (`twitch.tv/<channel>/clip/<slug>`). A recognized link SHALL be classified as a Twitch source carrying its kind (channel, video, or clip) and identifier so the whole room plays the same content. Twitch pages that do not name a channel, VOD, or clip — directory, settings, search, collections, and `player.twitch.tv` embed URLs — SHALL be rejected with a readable message instead of reaching the bill.

#### Scenario: Channel link accepted
- **WHEN** a player submits `https://twitch.tv/<channel>` in the booth
- **THEN** it is accepted as a live Twitch channel and starts or queues for the room

#### Scenario: VOD and clip links accepted
- **WHEN** a player submits `https://www.twitch.tv/videos/<id>` and, separately, a `clips.twitch.tv` clip link
- **THEN** each is accepted with its type preserved (the VOD as a seekable video, the link as a clip)

#### Scenario: Non-content Twitch page rejected
- **WHEN** a player submits `https://www.twitch.tv/directory` or `https://player.twitch.tv/?channel=<channel>`
- **THEN** it is rejected with a readable message and nothing is added to the bill

### Requirement: Live channels play as live
A Twitch channel item SHALL play as a live stream through Twitch's official interactive embed. Because a live stream has no meaningful shared position, the bill SHALL refuse seeking on it (`seek_unsupported`), joining clients SHALL attach to the live edge within a few seconds, and position-based advance SHALL NOT end the item. When the broadcast ends, the item SHALL end and the bill SHALL advance to the next queued item or idle. When the channel is offline, occupants SHALL see the player's offline state while the item keeps its place on the bill and no room-wide failure is reported.

#### Scenario: Join a live channel in progress
- **WHEN** a player joins the theater while a Twitch channel is the live item
- **THEN** their screen shows the live stream within a few seconds and their client does not seek to a shared position

#### Scenario: Seeking a live channel is refused
- **WHEN** an occupant seeks the live Twitch channel item
- **THEN** the action is refused with the readable cannot-be-rewound result and playback continues

#### Scenario: Channel offline then back
- **WHEN** the live item's channel goes offline and later resumes
- **THEN** occupants see the offline state while the bill stays unchanged, and playback resumes on the same item when the channel returns

#### Scenario: Broadcast ends
- **WHEN** the live stream ends
- **THEN** the bill advances to the next queued item or to idle

### Requirement: VODs play on the shared clock
A Twitch VOD item SHALL behave like the screen's other seekable sources: joins start near the room's shared position, the bill's play, pause, and seek controls apply, drift is corrected locally, and the item's natural end advances the bill.

#### Scenario: Join mid-VOD
- **WHEN** a player joins while a Twitch VOD is the live item at a shared position
- **THEN** their screen starts at or seeks to that shared position

#### Scenario: VOD ends
- **WHEN** the VOD finishes
- **THEN** the bill advances exactly once to the next queued item or to idle

### Requirement: Clips play as bounded inserts
A Twitch clip item SHALL play through Twitch's non-interactive clip embed. Because that player exposes no programmatic transport, the bill's pause and seek controls SHALL NOT apply to a clip, and the booth SHALL present the clip as a non-synchronized insert. A clip SHALL NOT be able to wedge the screen: the room's clients SHALL advance it no later than a bounded guard after it became the live item (Twitch clips are at most 60 seconds long), and any occupant MAY skip it earlier.

#### Scenario: Clip advances at the guard
- **WHEN** a clip is the live item and the guard interval elapses
- **THEN** the bill advances to the next queued item or to idle without waiting for a manual skip

#### Scenario: Clip skipped early
- **WHEN** an occupant skips a clip before the guard elapses
- **THEN** the bill advances immediately and the guard does not advance it a second time

#### Scenario: Booth states the limitation
- **WHEN** a clip is the live item
- **THEN** the booth marks the clip as not synchronized and offers skip in place of transport controls that cannot work

### Requirement: Twitch embeds are official and host-scoped
Twitch content SHALL load only through Twitch's official players: the interactive `player.twitch.tv` player for channels and VODs (with a non-interactive iframe fallback) and the `clips.twitch.tv` embed for clips. Every embed URL SHALL carry a `parent` value derived from the host serving the game so that local development, preview, and production hosts are each accepted, and no arbitrary page or third-party player SHALL be embedded.

#### Scenario: Serving host becomes parent
- **WHEN** the game is served from a host and a Twitch item loads
- **THEN** the embed's parent parameter matches that serving hostname and playback is not refused for a missing parent

#### Scenario: Only official players load
- **WHEN** any Twitch item plays
- **THEN** the loaded frame origin is Twitch's player or clip embed, never an arbitrary website

### Requirement: Twitch failures stay honest and local
Because Twitch's interactive player exposes no documented fatal-source error event, a Twitch item SHALL NOT be reported failed room-wide on ambiguous evidence such as blocked autoplay, transient network trouble, or an offline channel. Blocked unmuted autoplay SHALL surface the existing start-playback gesture affordance. If the player API does not become ready, the client SHALL retry the embed once and then show a local playback problem without advancing the shared bill.

#### Scenario: Blocked autoplay
- **WHEN** the browser blocks unmuted autoplay of a Twitch item
- **THEN** the start-playback gesture affordance appears and the shared bill does not change

#### Scenario: Embed never becomes ready
- **WHEN** the Twitch player API does not report ready within the client's timeout
- **THEN** the client retries the embed once and then shows a local problem without advancing the bill for the room

## Purpose

The screen in The Orpheum plays shared media: YouTube and Vimeo videos, direct video files, HLS streams, and channels from user-imported IPTV lists, with a queue that auto-advances. This capability covers what the screen can play and how a single player drives it; synchronization between players is covered by `shared-viewing`.

## ADDED Requirements

### Requirement: Screen shows an idle state
The theater screen SHALL be visible in the auditorium with an idle/static presentation whenever nothing is playing, and SHALL show what is currently playing (title or channel name) to nearby players. The screen's content SHALL be legible when the player is seated or standing near the seating rows.

#### Scenario: Fresh theater
- **WHEN** the player enters a theater where nothing has been queued
- **THEN** the screen shows its idle state and the interaction point offers the screen controls

### Requirement: Supported source types
The system SHALL accept and play: YouTube video URLs (standard watch URLs, `youtu.be` short links, and shorts), Vimeo video URLs, direct media file URLs ending in common video types (at minimum `.mp4` and `.webm`), and HLS playlist URLs (`.m3u8`). URLs that do not match a supported pattern SHALL be rejected with a clear message rather than silently failing later.

#### Scenario: Queue each source type
- **WHEN** the player submits, in turn, a YouTube watch URL, a `youtu.be` link, a Vimeo link, an `.mp4` URL, and an `.m3u8` URL
- **THEN** each is accepted and plays on the screen, and an invalid URL (e.g. random text or an unsupported site) is rejected with a readable message

#### Scenario: Direct file playback survives a missing SDK
- **WHEN** external player SDKs are unavailable (e.g. offline) but a direct media URL is reachable
- **THEN** the direct media still plays via the built-in player path

### Requirement: Shared queue with auto-advance
The screen SHALL maintain a queue of upcoming items. Players can add items by URL, see the queue contents, remove items, skip ahead, and play an item immediately. When the current item ends naturally, the next queued item SHALL start automatically; when the queue is empty the screen returns to idle. The queue SHALL be bounded (system-defined maximum, at least 20 items).

#### Scenario: Auto-advance
- **WHEN** a short video finishes while another item is queued
- **THEN** the next queued item starts playing without user action and the finished item leaves the queue

#### Scenario: Skip and play-now
- **WHEN** the player skips, or chooses "play now" on a queued item
- **THEN** the screen switches to that item immediately and the queue reorders accordingly

### Requirement: IPTV list import
The system SHALL let a player load an IPTV playlist in M3U/M3U8 format by pasting playlist text, uploading a file, or fetching a URL, and SHALL parse channel entries (at minimum each entry's stream URL and display name; group/logo metadata when present). Entries that fail to parse SHALL be skipped without failing the whole import, and a completely invalid playlist SHALL be reported with a clear message. Each player's imported lists SHALL be saved locally (per browser) and remain selectable in later sessions without re-import.

#### Scenario: Import a mixed-quality list
- **WHEN** the player pastes an M3U playlist where some `#EXTINF` entries are malformed
- **THEN** the valid channels appear in the guide, the malformed ones are skipped, and the player is told how many channels loaded

#### Scenario: Saved list persists
- **WHEN** the player imports a list, reloads the game, and opens the guide
- **THEN** the previously imported list is still available without re-importing

### Requirement: Channel guide and flipping
Players SHALL be able to browse the channels of a loaded IPTV list in a guide (scrollable, showing channel names and groups when available), start a channel on the shared screen by selecting it, and flip to the previous or next channel with a single control. If no list is loaded yet, attempting to flip SHALL prompt the player to import a list rather than doing nothing.

#### Scenario: Flip channels
- **WHEN** an IPTV channel is playing and the player activates the next-channel control twice
- **THEN** the screen switches to each subsequent channel in the list in order

### Requirement: Viewer controls
While media plays, the player SHALL be able to pause and resume the shared screen, skip the current item, adjust local volume without affecting the shared state, and stop/clear playback. These controls SHALL be reachable both from the screen's interaction point and from a seat, and game keyboard controls (movement, E, camera) SHALL keep working while the guide/queue panels are open without typing interference.

#### Scenario: Pause from a seat
- **WHEN** a seated player pauses the screen
- **THEN** playback pauses for that screen, volume changes affect only the local listener, and WASD/E still stand the player up rather than being swallowed by the panel

### Requirement: Playback failure handling
When media fails to load or play (unreachable URL, removed video, unsupported codec), the screen SHALL show a visible error state naming the failed item, the game SHALL continue running normally, and the queue SHALL advance to the next item (or idle) rather than hanging forever.

#### Scenario: Dead link in the queue
- **WHEN** the current item's stream URL cannot be loaded
- **THEN** the screen shows an error notice for that item and playback proceeds to the next queued item or idle

### Requirement: Embed safety
The system SHALL only load media from `http(s)` URLs: YouTube and Vimeo content through their official embed players, other URLs as video streams. Arbitrary web pages MUST NOT be embeddable, and non-`http(s)` schemes MUST be rejected on both input and shared state.

#### Scenario: Malicious link rejected
- **WHEN** a player submits a `javascript:` URL or a link to an arbitrary website
- **THEN** it is rejected with a message and never appears on the screen for anyone

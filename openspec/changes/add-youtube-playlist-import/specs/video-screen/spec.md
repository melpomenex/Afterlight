## MODIFIED Requirements

### Requirement: Supported source types
The system SHALL accept and play: YouTube video URLs (standard watch URLs, `youtu.be` short links, and shorts), Vimeo video URLs, direct media file URLs ending in common video types (at minimum `.mp4` and `.webm`), HLS playlist URLs (`.m3u8`), and BitTorrent magnet links (resolved by the server; governed by the magnet pick-gate requirement below). YouTube playlist URLs (`playlist?list=…`, and the `list=` parameter of mixed links) are not directly playable: they SHALL be routed into the playlist import flow (the `youtube-playlist-import` capability) rather than rejected as unsupported. URLs that do not match a supported pattern SHALL be rejected with a clear message rather than silently failing later.

#### Scenario: Queue each source type
- **WHEN** the player submits, in turn, a YouTube watch URL, a `youtu.be` link, a Vimeo link, an `.mp4` URL, and an `.m3u8` URL
- **THEN** each is accepted and plays on the screen, and an invalid URL (e.g. random text or an unsupported site) is rejected with a readable message

#### Scenario: Direct file playback survives a missing SDK
- **WHEN** external player SDKs are unavailable (e.g. offline) but a direct media URL is reachable
- **THEN** the direct media still plays via the built-in player path

#### Scenario: Magnet accepted at input
- **WHEN** a player submits a well-formed `magnet:?xt=urn:btih:…` link in the theater
- **THEN** it is accepted into the magnet flow (resolve, then pick a file) instead of being rejected as an unsupported URL

#### Scenario: Playlist link routed to import
- **WHEN** a player submits a `youtube.com/playlist?list=…` link to the Add-by-URL field
- **THEN** the playlist import flow starts (recognition, resolution, preview) instead of an unsupported-link error

### Requirement: Shared queue with auto-advance
The screen SHALL maintain a queue of upcoming items. Players can add items by URL, see the queue contents, remove items, skip ahead, and play an item immediately. Multiple items MAY be added by a single player action through a batch operation (e.g. a playlist import); such a batch SHALL be applied as one state change, remain bounded by the queue maximum, and report its outcome to the acting player. When the current item ends naturally, the next queued item SHALL start automatically; when the queue is empty the screen returns to idle. The queue SHALL be bounded (system-defined maximum, at least 20 items).

#### Scenario: Auto-advance
- **WHEN** a short video finishes while another item is queued
- **THEN** the next queued item starts playing without user action and the finished item leaves the queue

#### Scenario: Skip and play-now
- **WHEN** the player skips, or chooses "play now" on a queued item
- **THEN** the screen switches to that item immediately and the queue reorders accordingly

#### Scenario: Batch add appears once for everyone
- **WHEN** a player confirms a batch import while others are watching the queue
- **THEN** the imported items appear in every viewer's queue list from a single update, in playlist order, and no intermediate partial queue state is broadcast

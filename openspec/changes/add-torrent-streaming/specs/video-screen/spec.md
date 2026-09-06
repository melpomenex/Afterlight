## MODIFIED Requirements

### Requirement: Supported source types
The system SHALL accept and play: YouTube video URLs (standard watch URLs, `youtu.be` short links, and shorts), Vimeo video URLs, direct media file URLs ending in common video types (at minimum `.mp4` and `.webm`), HLS playlist URLs (`.m3u8`), and BitTorrent magnet links (resolved by the server; governed by the magnet pick-gate requirement below). URLs that do not match a supported pattern SHALL be rejected with a clear message rather than silently failing later.

#### Scenario: Queue each source type
- **WHEN** the player submits, in turn, a YouTube watch URL, a `youtu.be` link, a Vimeo link, an `.mp4` URL, and an `.m3u8` URL
- **THEN** each is accepted and plays on the screen, and an invalid URL (e.g. random text or an unsupported site) is rejected with a readable message

#### Scenario: Direct file playback survives a missing SDK
- **WHEN** external player SDKs are unavailable (e.g. offline) but a direct media URL is reachable
- **THEN** the direct media still plays via the built-in player path

#### Scenario: Magnet accepted at input
- **WHEN** the player submits a well-formed `magnet:?xt=urn:btih:…` link in the theater
- **THEN** it is accepted into the magnet flow (resolve, then pick a file) instead of being rejected as an unsupported URL

### Requirement: Embed safety
The system SHALL only load media from `http(s)` URLs: YouTube and Vimeo content through their official embed players, other URLs as video streams — including torrent items, which viewers receive as http(s) streams from the game server. Magnet URIs are the one accepted input exception: they are instructions to the server, never loaded by any browser, and reach the shared bill only through the pick-gate flow. Arbitrary web pages MUST NOT be embeddable, and every other non-`http(s)` scheme MUST be rejected on both input and shared state.

#### Scenario: Malicious link rejected
- **WHEN** a player submits a `javascript:` URL or a link to an arbitrary website
- **THEN** it is rejected with a message and never appears on the screen for anyone

#### Scenario: Magnet never embedded
- **WHEN** a torrent item plays on the shared screen
- **THEN** the browser loads only the game server's http(s) stream, never the magnet itself

## ADDED Requirements

### Requirement: Magnet sources with a pick gate
The screen SHALL accept BitTorrent magnet links (`magnet:?xt=urn:btih:…`, hex or base32 infohash) as sources alongside YouTube, Vimeo, direct files, and HLS. A magnet SHALL NOT reach the shared bill directly: submitting one first resolves server-side, the submitting player picks which video file plays from the resolved list, and only the pick starts/queues the item for the room. The bill's entry SHALL name both the torrent and the chosen file. Cancelling the picker SHALL leave the shared screen and queue exactly as they were.

#### Scenario: Paste, pick, everyone watches
- **WHEN** a player pastes a valid magnet and picks one of several video files
- **THEN** the chosen file starts (or queues) on the shared screen for the whole room, titled by torrent and file, and the other files are not played

#### Scenario: Cancel the picker
- **WHEN** a player closes the file picker without choosing
- **THEN** the shared screen and queue are unchanged and no torrent item remains anywhere on the bill

### Requirement: Torrent loading state
While a torrent item is being fetched (peers connecting, data arriving), the screen's loading state SHALL show the swarm progress reported by the server instead of a bare spinner, and SHALL transition to normal playback once the file streams. A torrent item that fatally fails SHALL fall under the existing playback failure handling (error state, queue advances).

#### Scenario: Loading shows progress
- **WHEN** a picked torrent file starts while the swarm is still being reached
- **THEN** viewers see its connecting/downloading progress on the screen, then the video itself once streaming begins

### Requirement: Torrent items persist as magnets
Torrent entries on the shared bill SHALL be stored and synchronized by their magnet and chosen file (not by a server-local URL), so the bill survives reloads and server restarts and every viewer plays the same file. A stored torrent item that no longer resolves SHALL follow the existing failure handling rather than breaking the bill.

#### Scenario: Reload mid-torrent
- **WHEN** a viewer reloads the game while a torrent file is playing
- **THEN** they rejoin the same torrent file at the room's shared position

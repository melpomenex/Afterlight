## MODIFIED Requirements

### Requirement: Supported source types
The system SHALL accept and play: YouTube video URLs, Vimeo video URLs, direct media file URLs (including `.mkv` and `.avi` when server preparation is available), HLS playlist URLs (`.m3u8`), and BitTorrent magnet links (with pick gate). Unsupported patterns SHALL be rejected with a clear message.

#### Scenario: MKV plays after preparation
- **WHEN** a player submits a reachable `.mkv` URL and the server has ffmpeg available
- **THEN** the room eventually plays the prepared stream with audio and working seek

#### Scenario: Queue each legacy source type
- **WHEN** the player submits YouTube, Vimeo, `.mp4`, and `.m3u8` URLs
- **THEN** each still plays without regression

## MODIFIED Requirements

### Requirement: Every supported source kind plays from a connected client
A connected client SHALL be able to make the room's screen play each supported source kind end to end: a YouTube or Vimeo link, a direct media file URL (`.mp4`/`.webm`), an HLS playlist URL (`.m3u8`), a magnet link resolved to a picked file (per the torrent capability), and a Twitch channel, VOD, or clip link (whose live, VOD, and clip transport semantics are governed by the `twitch-streaming` capability). Submitting a source through the booth and playing it SHALL result in audible/visible playback on the submitting client and on other occupants' clients, or a readable error — never a silent no-op.

#### Scenario: Queue and play each source kind
- **WHEN** a connected player submits, in turn, a YouTube watch URL, an `.mp4` URL, and an `.m3u8` URL, playing each
- **THEN** each plays on the shared screen for the room, and an unsupported URL is rejected with a readable message

#### Scenario: Magnet resolves to playback
- **WHEN** a connected player pastes a magnet link, the metadata resolves, and they pick a video file from the picker
- **THEN** the picked file plays on the shared screen via a granted stream, with load progress shown while the swarm is being reached

#### Scenario: Twitch link plays for the room
- **WHEN** a connected player submits a Twitch channel, VOD, or clip link
- **THEN** the item plays on the shared screen for the room with the transport semantics of its Twitch type, or is rejected with a readable message

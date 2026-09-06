## Purpose

Let players fill the Orpheum's shared queue from a YouTube playlist by pasting its link: the game recognizes the link, resolves the playlist server-side, and — after an explicit preview-and-confirm step — enqueues the videos for the whole room, bounded by the queue's limits and reported honestly.

## ADDED Requirements

### Requirement: Playlist links are recognized at the input
The theater's Add-by-URL field SHALL recognize YouTube playlist links — standalone playlist URLs (`youtube.com/playlist?list=…` including `music.youtube.com`) and mixed links (`watch?v=…&list=…`) — and route them into the playlist import flow instead of reporting an unsupported link. Recognition SHALL be visible at the field (status line) so the player knows pasting worked before pressing anything. Links that are not playlists (channels, search results, random text) SHALL continue to be rejected as unsupported.

#### Scenario: Standalone playlist link starts an import
- **WHEN** the player pastes `https://www.youtube.com/playlist?list=PL…` into the URL field
- **THEN** the field identifies it as a YouTube playlist and activating Add/Enter starts the import flow rather than showing "not something the projector can play"

#### Scenario: Non-playlist links unchanged
- **WHEN** the player pastes a channel URL or gibberish into the URL field
- **THEN** it is rejected with the existing unsupported-link message and no import flow starts

### Requirement: Mixed links offer a choice
When the pasted link contains both a video and a playlist (`watch?v=…&list=…`), the game SHALL ask every time, offering at minimum "import the playlist" and "add just this video"; both choices SHALL work, and dismissing the choice SHALL leave the shared screen and queue untouched. A plain video link with no `list=` parameter SHALL never show this choice.

#### Scenario: Choose the playlist from a mixed link
- **WHEN** the player pastes a `watch?v=…&list=…` link and chooses "import the playlist"
- **THEN** the import flow starts for the whole playlist

#### Scenario: Choose just the video
- **WHEN** the player pastes a `watch?v=…&list=…` link and chooses "add just this video"
- **THEN** only that video is queued (or played now, per the chosen button) and the playlist is not resolved

### Requirement: Server-side resolution of public playlists
The game server SHALL resolve a public YouTube playlist to an ordered list of its videos (at minimum video IDs and titles, in playlist order) without requiring the player or operator to supply any credentials. Resolution SHALL be performed by the server (browsers cannot fetch YouTube directly), SHALL be bounded by a timeout, a response size cap, and a maximum video count at least as large as the queue maximum, and SHALL be rate-limited so a player cannot spam resolutions. Mix/radio lists (infinite lists such as `list=RD…`) SHALL NOT be importable as playlists and SHALL be declined with a message that still offers adding the plain video when one is present; private, deleted, or unavailable playlists SHALL fail with a clear, specific message.

#### Scenario: A public playlist resolves
- **WHEN** the server is asked to resolve a public playlist of 12 videos
- **THEN** it returns the playlist's title and 12 videos in playlist order, each with a playable video ID and title, within the bounded time

#### Scenario: Mixes are declined, private lists fail clearly
- **WHEN** the player pastes a mix link (`list=RD…`) or a private/deleted playlist
- **THEN** the import flow explains why it cannot import that list (infinite mix / not public) and, for a mix with a video in the link, still allows queuing that video

### Requirement: Preview and confirm before anything is shared
Resolved playlist contents SHALL be shown to the importing player before they reach the shared bill: at minimum the playlist title, the video count, and the first few video titles. Only an explicit confirmation SHALL enqueue the videos; cancelling or closing the preview SHALL leave the shared screen, queue, and persistence exactly as they were. The preview SHALL be reachable only in the theater room and SHALL follow the established picker-dialog interaction (game keys keep working, Escape closes).

#### Scenario: Confirm fills the reel
- **WHEN** the player reviews a preview of 12 videos and confirms
- **THEN** the videos are enqueued for the whole room with their resolved titles and the importing player sees a success summary

#### Scenario: Cancel changes nothing
- **WHEN** the player closes the preview without confirming
- **THEN** the shared screen, queue, and saved state are exactly as before the paste

### Requirement: Batch enqueue is atomic, bounded, and honest
Importing SHALL apply the confirmed videos as one atomic batch (a single state change and one broadcast to the room), and the existing queue maximum SHALL bound the result: the batch fills the remaining queue capacity in playlist order and videos beyond capacity are not added. The outcome SHALL be reported to the importing player: how many videos were queued, and — when the reel could not fit them all — that some were left out and how many. If the queue is already full, nothing is added and the player is told the reel is full. Partial failure of the resolution (a few videos unavailable) SHALL skip the bad entries without failing the batch.

#### Scenario: Playlist larger than the queue
- **WHEN** a confirmed import of 80 videos meets a queue that can accept 30 more
- **THEN** the first 30 videos in playlist order are queued in one batch, and the player is told 30 were queued and 50 did not fit

#### Scenario: Full reel rejects cleanly
- **WHEN** a player confirms an import while the queue is at its maximum
- **THEN** nothing is added, the shared state is unchanged, and the player sees the queue-full message

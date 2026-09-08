## Purpose

The screen in The Orpheum plays shared media for everyone in the room: YouTube and Vimeo videos, direct video files, HLS streams, and torrent files, driven by one authoritative shared bill. This capability covers what a connected player sees the screen do end to end — on join, on queue changes, and on failures — under the current gateway-and-sidecar architecture.

## Requirements

### Requirement: Playback follows the shared bill on join
When a player enters the theater, the client SHALL apply the authoritative bill snapshot delivered at join time and present the live item within a few seconds: playing media for an in-progress item, or the idle state when the bill has nothing playing. A snapshot whose live item's authoritative position lies past the item's duration SHALL be treated as ended — the client reports that once and the bill advances (or returns to idle) — never as a permanently loading or silently wrong screen.

#### Scenario: Joining a room with something playing
- **WHEN** a player joins the theater while another occupant's queued video is the live item
- **THEN** their screen shows that item playing at the shared timeline position within a few seconds of joining

#### Scenario: Joining with a long-stale live item
- **WHEN** a player joins a theater whose live item was last updated far longer ago than the item's duration
- **THEN** the screen does not hang in a loading state; the stale item is reported ended once and the screen advances to the next queued item or the idle state

#### Scenario: Joining an idle theater
- **WHEN** a player joins a theater with an empty bill
- **THEN** the screen shows its idle state and the booth controls are available

### Requirement: Every supported source kind plays from a connected client
A connected client SHALL be able to make the room's screen play each supported source kind end to end: a YouTube or Vimeo link, a direct media file URL (`.mp4`/`.webm`), an HLS playlist URL (`.m3u8`), and a magnet link resolved to a picked file (per the torrent capability). Submitting a source through the booth and playing it SHALL result in audible/visible playback on the submitting client and on other occupants' clients, or a readable error — never a silent no-op.

#### Scenario: Queue and play each source kind
- **WHEN** a connected player submits, in turn, a YouTube watch URL, an `.mp4` URL, and an `.m3u8` URL, playing each
- **THEN** each plays on the shared screen for the room, and an unsupported URL is rejected with a readable message

#### Scenario: Magnet resolves to playback
- **WHEN** a connected player pastes a magnet link, the metadata resolves, and they pick a video file from the picker
- **THEN** the picked file plays on the shared screen via a granted stream, with load progress shown while the swarm is being reached

### Requirement: Room-wide bill changes arrive live
When any occupant changes the shared bill (add, play now, skip, remove, or playback control), every connected occupant in the theater SHALL see the resulting screen change within the broadcast cadence (about two seconds) without reloading. A client SHALL NOT be able to mistake an unacknowledged bill change for success: the booth SHALL either reflect the change or surface a readable error.

#### Scenario: Another occupant queues a video
- **WHEN** occupant A adds a video while occupant B is seated in the theater
- **THEN** B's screen and queue reflect the new item within about two seconds

#### Scenario: Service refuses an action
- **WHEN** the gateway or playback service refuses a booth action (for example, a queue cap or an unrouted message)
- **THEN** the acting player sees a readable error message, and the shared bill is unchanged

### Requirement: Playback failures self-heal
A live item that cannot play (unreadable source, failed stream, fatally stalled download) SHALL end visibly — the room sees an error naming the item — and the bill SHALL advance to the next queued item or idle. Repeated failures SHALL NOT wedge the screen, duplicate bill entries, or loop endlessly on the same item.

#### Scenario: Broken source skipped
- **WHEN** the live item's source fails to load or report fatal progress
- **THEN** the room sees the item named as failed and playback continues with the next queued item or idle

#### Scenario: Advancing is idempotent
- **WHEN** several occupants' clients report the same item ended or failed
- **THEN** the bill advances exactly once and the queue contains no duplicates

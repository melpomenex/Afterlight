## Purpose

The Orpheum's server-side torrent engine lets the room watch video that circulates as BitTorrent magnets (Linux release media, public-domain and Creative Commons films, community mirrors). Covers resolving a magnet to a file list, streaming the chosen file with seek support, reporting swarm progress, and keeping the download cache bounded and disposable.

## ADDED Requirements

### Requirement: Magnet resolution with a metadata timeout
The system SHALL resolve a submitted `magnet:` URI's metadata on the game server (never in a player's browser) and SHALL return the torrent's display name and its playable file list (file path and size, video files distinguishable) to the submitting player only. Only magnet URIs carrying a supported infohash (v1, hex or base32) SHALL be accepted; anything else SHALL be rejected with a clear message. Resolution SHALL be bounded by a system-defined timeout (at least 30 seconds); an unreachable or too-slow swarm SHALL fail with a readable, retryable error and SHALL leave the shared screen and queue untouched.

#### Scenario: Resolve a magnet
- **WHEN** a player pastes a valid magnet link in the theater
- **THEN** the server fetches the torrent's metadata and the player sees its name and file list without anything appearing on the shared screen yet

#### Scenario: Dead swarm
- **WHEN** a magnet's metadata cannot be fetched within the timeout
- **THEN** the player sees a clear error naming the failure, can try again, and the shared bill is unchanged

#### Scenario: Not a magnet
- **WHEN** a player submits a `magnet:` URI without an infohash, or a torrent-resolve request for some other scheme
- **THEN** the request is rejected with a readable message

### Requirement: Room-gated, communal control
Torrent resolution and file picking SHALL only be available to players inside The Orpheum, like every other projector control. Once a picked file plays on the shared screen, any occupant MAY pause, resume, seek, skip, or remove it exactly like any other source.

#### Scenario: Resolve from another district
- **WHEN** a player outside the theater submits a magnet for resolution
- **THEN** the request is refused with the theater-room message and nothing resolves

#### Scenario: Another viewer skips a torrent
- **WHEN** a torrent file is playing and a different occupant skips it
- **THEN** the screen advances for the whole room as with any other item

### Requirement: Range-capable streaming endpoint
The chosen file SHALL be streamed by the game server over HTTP with Range request support, so the room's shared seek/pause playback math works unchanged. Only video files inside the resolved torrent SHALL be served; requests for nonexistent files or indexes SHALL fail cleanly. The endpoint SHALL use the same cross-origin posture as the theater's other HTTP routes so the dev client and same-origin deployments both play.

#### Scenario: Seek into a partially downloaded file
- **WHEN** a viewer seeks forward to an unmapped region of a torrent file
- **THEN** the server serves the requested byte range and playback continues from there

#### Scenario: Non-video file request
- **WHEN** an HTTP request names a file index that is not a video file or does not exist
- **THEN** the server refuses it without disturbing the playing item

### Requirement: Swarm status reporting
While a torrent item is the live item, the server SHALL periodically broadcast its fetch progress to the theater room (at minimum: percent fetched and connected peer count). A viewer's loading state SHALL show that progress instead of a generic spinner; when no fresh status exists, the client SHALL fall back to the generic loading state without erroring.

#### Scenario: Progress while connecting
- **WHEN** a torrent item starts but peers are still being reached
- **THEN** viewers see a connecting/downloading progress indication rather than an indefinite silent load

#### Scenario: Status fades
- **WHEN** status updates stop arriving (e.g. an older server without the feature)
- **THEN** viewers see the ordinary loading state and playback behavior is unchanged

### Requirement: Bounded, disposable cache
Downloaded torrent data SHALL be stored on the server under the game's data directory, keyed by infohash, subject to a size cap (system-defined, environment-tunable, default at most 4 GB) with least-recently-used eviction of torrents not on the live bill, and torrents no longer referenced by the shared bill SHALL be removed after an idle period. Deleting the cache directory SHALL never corrupt game state or other persisted data; the server SHALL re-fetch evicted content on demand.

#### Scenario: Cache cap respected
- **WHEN** newly fetched torrent data would push the cache past its size cap
- **THEN** the least recently used inactive torrents are evicted until it fits, and anything currently playing is untouched

#### Scenario: Cache deleted under the server
- **WHEN** the server's torrent cache directory is emptied externally
- **THEN** the game continues; affected items re-download from the swarm when played again

### Requirement: Restart resilience
Torrent items on the shared bill SHALL survive a server restart as their canonical magnet plus chosen file. After a restart, playing a torrent item SHALL resume from the local cache when present and otherwise re-resolve from the swarm; a missing or corrupt cache SHALL degrade to re-downloading, never to a crash or a corrupted bill.

#### Scenario: Restart mid-bill
- **WHEN** the server restarts while a torrent item is on the bill and a player later joins the theater
- **THEN** the bill still shows the torrent item and it plays again, from cache or swarm

### Requirement: Fatal swarm failure advances the bill
If a torrent item's file cannot start or fatally stalls (no metadata, no peers, unreadable stream), the room SHALL see the existing playback failure behavior — a visible error naming the item and the queue advancing — rather than hanging the screen.

#### Scenario: Stalled torrent skipped
- **WHEN** a torrent item's download stalls fatally while it is the live item
- **THEN** viewers see the error state for that item and the next queued item (or idle) starts

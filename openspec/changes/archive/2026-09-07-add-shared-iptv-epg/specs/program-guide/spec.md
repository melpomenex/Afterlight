## Purpose

The channel guide can show schedule information from a player-uploaded XMLTV program guide (EPG): what is on now and what is next for matched channels, with times in the viewer's local timezone. The guide is an upload that persists on the game server and is shared by the whole room; nothing is bundled with the game.

## ADDED Requirements

### Requirement: Guide upload
The system SHALL let a player upload a program guide in XMLTV format as a file (`.epg`, `.xml`, or `.xmltv`), either plain or gzip-compressed, with an optional display name. The server SHALL parse the upload and report success or failure clearly. A failed or invalid upload SHALL be rejected with a readable message and SHALL leave the previously active guide (if any) in place. No guide SHALL ship with the game or be fetched by the server on its own.

#### Scenario: Upload a gzipped guide
- **WHEN** a player uploads a gzip-compressed XMLTV file
- **THEN** the guide is accepted, parsed, and reported as active with a summary (name and coverage)

#### Scenario: Invalid file rejected safely
- **WHEN** a player uploads a file that is not recognizable XMLTV
- **THEN** the upload is rejected with a clear message and any previously active guide remains active

### Requirement: One active guide, shared
At most one program guide SHALL be active at a time; a successful upload replaces the previous guide. All theater occupants SHALL learn the active guide's presence and summary (source name, how many channels carry schedule data), and late joiners SHALL receive that summary on entering the theater. Replacing or removing the guide SHALL NOT interrupt screen playback or alter the shared viewing state.

#### Scenario: Replace the guide mid-screening
- **WHEN** a player uploads a newer guide while a channel is playing for the room
- **THEN** the new guide becomes active for everyone, and the channel keeps playing uninterrupted

#### Scenario: Late joiner sees guide status
- **WHEN** a player enters the theater after a guide was uploaded
- **THEN** their guide UI indicates schedule data is available without anyone re-uploading

### Requirement: Tolerant bounded parsing
Guide parsing SHALL be tolerant: channels or programmes with missing or malformed fields SHALL be skipped without failing the whole import, and content SHALL be bounded by a maximum file size, channel count, and programme count. Content beyond a bound SHALL be truncated (or the upload rejected) and the outcome reported honestly. Parsing SHALL NOT block other server work unreasonably for large guides (at least a 50 MB-class file with tens of thousands of programmes SHALL be accepted).

#### Scenario: Guide with damaged entries
- **WHEN** an uploaded guide contains some programmes with missing times or titles
- **THEN** the damaged entries are skipped, the healthy ones are stored, and the summary reflects what actually loaded

#### Scenario: Oversized guide
- **WHEN** an upload exceeds the file-size bound
- **THEN** it is rejected with a clear message and the active guide is unchanged

### Requirement: Now/next in the channel guide
When a guide is active, each channel in the guide SHALL be matched to schedule data by the playlist entry's `tvg-id` against the guide's channel id, falling back to normalized display-name comparison. Matched channels SHALL show the programme on air now and the programme that follows next, with start/end times rendered in the viewer's local timezone; channels without schedule data SHALL simply show no schedule, without errors. While the guide stays open, now/next SHALL stay current as time passes (the "now" programme advances or clears at its end time).

#### Scenario: Matched channel shows schedule
- **WHEN** a guide is active and a player opens the guide on a list whose entries carry matching `tvg-id`s
- **THEN** those channels show the current and next programme with local times

#### Scenario: Name-only fallback
- **WHEN** an entry has no `tvg-id` but its display name matches a guide channel name
- **THEN** the channel still shows schedule data

#### Scenario: Time passes while browsing
- **WHEN** a player keeps the guide open across the end time of the current programme
- **THEN** the displayed "now" entry advances to the next programme without reloading the guide

### Requirement: Guide persists across restarts
The active guide SHALL survive a server restart, remaining matched to the shared playlists. A missing or corrupt persisted guide SHALL disable schedule display rather than crashing the server or corrupting other persisted state; players can restore it by uploading a guide again.

#### Scenario: Restart keeps the schedule
- **WHEN** the server restarts after a guide was uploaded and a player opens the guide
- **THEN** matched channels still show now/next programmes

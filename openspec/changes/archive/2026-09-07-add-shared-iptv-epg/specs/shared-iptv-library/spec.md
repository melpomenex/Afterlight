## Purpose

The Orpheum's channel lineup is a shared, server-persisted library: any player can load IPTV playlists onto the game server and every occupant of the theater can then browse the guide, pick channels, and flip through the same lineup without importing anything themselves. Covers upload/import, server-side limits and safety, catalog snapshots for joiners, coexistence with personal local lists, and list removal.

## ADDED Requirements

### Requirement: Uploading a shared playlist
The system SHALL let a player add an IPTV playlist to the shared theater library by pasting playlist text, uploading an M3U/M3U8/TXT file, or supplying a URL, with an optional display name. Parsing SHALL follow the existing playlist semantics: valid channel entries (stream URL, display name, group/logo metadata when present) are kept, unparseable entries are skipped, and the player SHALL be told how many channels loaded. On success, every occupant of the theater room SHALL see the new list in the guide without reloading, and the uploader SHALL see the saved list confirmed. No playlist SHALL ship with the game or be created by the server itself; the library starts empty.

#### Scenario: One player imports, everyone can browse
- **WHEN** a player uploads a playlist file while two other players are in the theater
- **THEN** the uploader sees the list saved, and both other players can open the guide and browse that list's channels without importing anything

#### Scenario: Late joiner receives the catalog
- **WHEN** a player enters the theater after several playlists were uploaded
- **THEN** their guide shows the full shared catalog on arrival, without any upload action

#### Scenario: Mixed-quality playlist
- **WHEN** a player pastes an M3U playlist in which some entries are malformed
- **THEN** the valid channels are saved to the shared library, the malformed ones are skipped, and the uploader is told how many channels loaded

### Requirement: Server-side URL fetch
Playlist imports by URL SHALL be fetched by the game server, not the player's browser, and SHALL only follow `http` and `https` addresses; any other scheme SHALL be rejected with a clear message. An unreachable URL, a timeout, or a response too large SHALL fail the import with a readable error and leave the existing library unchanged.

#### Scenario: CORS-hostile playlist URL
- **WHEN** a player imports a playlist URL whose host sends no cross-origin headers
- **THEN** the import still succeeds because the server performed the fetch

#### Scenario: Unsafe or dead URL
- **WHEN** a player submits an `ftp://` address, or a URL that times out or returns an oversized body
- **THEN** the import is rejected with a clear message and the shared library is unchanged

### Requirement: Catalog limits
The shared library SHALL be bounded: a maximum number of saved lists, a maximum text size per playlist, and a maximum number of channels per list (at least 12 lists and 5,000 channels per list). Uploads beyond a limit SHALL be rejected or truncated with a clear message, and a rejected upload SHALL leave the existing library unchanged. The limits SHALL be generous enough for full multi-thousand-channel country playlists.

#### Scenario: Oversized playlist rejected cleanly
- **WHEN** a player uploads a playlist exceeding the per-list channel maximum
- **THEN** the upload is rejected with a readable reason and the previously saved lists still work

#### Scenario: Large real-world list accepted
- **WHEN** a player uploads a well-formed playlist of several thousand channels
- **THEN** it is saved whole, and guide navigation over it stays usable

### Requirement: Browsing and tuning from the shared catalog
Every theater occupant SHALL be able to open the channel guide, choose among the shared lists, filter channels by country and category as today, tune any channel to the shared screen, and flip previous/next within the chosen shared list — all without a local import. Tuning a shared channel SHALL behave like channel tuning today: the chosen stream plays for everyone watching the screen. Flipping with no shared list and no personal list available SHALL still prompt the player to add a playlist rather than doing nothing.

#### Scenario: Viewer who never imported flips channels
- **WHEN** a player who has never imported anything activates next-channel while a shared list exists
- **THEN** the screen tunes to the next channel of that shared list for the whole room

#### Scenario: Guide filters work on shared lists
- **WHEN** a player picks a shared list in the guide and chooses a country filter
- **THEN** only channels of that country/category are listed, exactly as with a locally imported list

### Requirement: Personal lists coexist
A player's locally saved lists SHALL keep working as a private fallback visible only to them. The player SHALL be able to push a personal list into the shared library, after which it is subject to the same limits and visible to everyone. The guide SHALL present the shared catalog as the primary source, with personal lists still selectable.

#### Scenario: Push a personal list
- **WHEN** a player pushes one of their locally saved lists to the shared library
- **THEN** other theater occupants see it in the guide, and the player's local copy remains for private use

### Requirement: Removing shared lists
Any theater occupant MAY remove a shared list (the theater has no host; control is communal). Removal SHALL be announced to the room, SHALL leave other lists and current playback untouched, and SHALL not be recoverable except by uploading the playlist again.

#### Scenario: Remove without breaking playback
- **WHEN** a player removes a shared list while its channel plays on the screen
- **THEN** the list disappears from everyone's guide, the current channel keeps playing, and the other lists remain

### Requirement: Library persists across restarts
The shared library SHALL survive a server restart: after restart, joining the theater presents the same lists. A missing or corrupt persisted library SHALL start empty rather than crashing the server or corrupting other persisted state.

#### Scenario: Restart keeps the lineup
- **WHEN** the server is restarted after playlists were uploaded and a player joins the theater
- **THEN** the guide shows the same shared lists as before the restart

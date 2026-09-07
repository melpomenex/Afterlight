# Add Shared IPTV & EPG

## Why

The Orpheum's channel guide is currently per-browser: whoever imports an M3U/M3U8 playlist keeps it in their own localStorage, so everyone else in the room can only watch whatever channel that one person tunes — they cannot browse the guide, pick a different channel, or flip through the list themselves. There is also no schedule information anywhere, so "what's on" is guesswork. A shared hangout space should have a shared TV lineup and a program guide.

## What Changes

- **Shared, server-persisted IPTV playlists**: importing a playlist (paste text, file upload, or URL) now uploads it to the game server, which parses, stores, and broadcasts it to everyone in the theater room. Every occupant sees the same catalog in the guide, can filter it by country/category, tune any channel, and flip prev/next — with no local import required. Nothing is bundled or hardcoded server-side; the library starts empty and is built entirely from player uploads.
- **Server-side playlist URL fetch**: import-by-url moves to the server (strict `http(s)`-only, size/time caps), so playlists behind CORS-hostile hosts work for the whole room instead of failing in one player's browser.
- **Program guide (EPG) uploads**: players can upload an XMLTV guide file (`.epg`/`.xml`/`.xmltv`, plain or gzip). The server parses it, persists it, and the channel guide shows *now* (and *next*) programmes for matched channels. One guide is active at a time; a new upload replaces it. Like playlists, guides are uploads only — none ships with the game.
- **Guide now/next**: channels in the guide matched by `tvg-id`/XMLTV channel id (with a display-name fallback) display the current and upcoming programme with local-times, refreshed while the guide is open.
- **Personal lists remain**: existing localStorage lists keep working as a private fallback and can be pushed to the shared library; shared lists become the guide's primary source.
- **Persistence split**: the IPTV library and EPG live in their own files under `data/` (e.g. `iptv.json`, `epg.json`), not inside `game-state.json`, whose whole-state rewrite would otherwise carry multi-megabyte guide blobs on every save. Both survive server restarts and are snapshotted to players who join the theater.

Depends on: `add-theater-district` (pending — builds on its `video-screen` guide, `theater_channel` tuning, and `TheaterManager` snapshot/broadcast flow; no requirement in those specs changes).

## Capabilities

### New Capabilities
- `shared-iptv-library`: The room-shared channel catalog as player-facing behavior — uploading playlists by paste/file/URL, server-side size/count limits and http(s) enforcement, the catalog snapshot every theater occupant receives, browsing/tuning/flipping from the shared catalog without a local import, pushing personal lists into the library, and list removal.
- `program-guide`: The uploaded XMLTV program guide as player-facing behavior — guide file upload (plain or gzip), one-active-guide replacement, tolerant parsing with bounded size, channel matching to playlist entries, and now/next programme display in the channel guide with local times.

### Modified Capabilities
- (none — no capability has been archived yet; `video-screen`'s tune/flap behavior and `shared-viewing`'s screen sync are unchanged. The pending `add-theater-district` specs are extended by the two new capabilities above, not altered.)

## Impact

- **Shared**: `shared/protocol.js` — new `MSG_TYPES` (`IPTV_STATE` S→C broadcast/snapshot, `IPTV_ERROR` S→C); new `shared/xmltv.js` (pure tolerant XMLTV parser + channel matcher + now/next lookup, usable by server and tests); playlist parsing reuses `parseM3U` from `shared/theaterModel.js`.
- **Server**: new `server/iptv.js` manager (playlist library + EPG state, owns its own persistence files — kept out of `server/storage.js`'s whole-state `game-state.json` writes); new HTTP upload endpoints on the existing `http.createServer` in `server/index.js` (`POST /api/theater/playlists`, `POST /api/theater/epg`) with CORS preflight, raw-body reads, gzip detection, and byte caps; WELCOME/JOIN_ROOM snapshot wiring and `IPTV_STATE` broadcasts on change.
- **Client**: `src/ui/theaterScreen.js` (import flow posts to the server, guide renders the shared catalog first with personal lists below, now/next rows and refresh while open, EPG status line, push-personal-list action); `src/net/client.js` (upload fetch helpers deriving the API base from the WS URL, `iptv_state` handler); `src/main.js` wiring only where the net handler registers.
- **Persistence**: new `data/iptv.json` (playlist catalog) and `data/epg.json` (compact parsed guide), each written atomically and independently of `game-state.json`. `game-state.json` format is untouched.
- **Dependencies**: none new — gzip handled by Node's built-in `zlib`; XMLTV parsed by a hand-rolled tolerant parser over the small tag set the format needs (`<channel>`, `<programme>`, `<title>`, …), no XML dependency.
- **Tests**: new `tests/iptv-epg.test.js` (XMLTV parsing/matching/now-next, library limits, manager persistence) and an upload-endpoint/integration test against a real server instance; `tests/theater.test.js` unaffected.
- **Docs**: README (uploading playlists and a guide, what fellow viewers get, size limits, the local `guide.epg` test file), AGENTS.md (theater section gains the shared library/EPG architecture note).

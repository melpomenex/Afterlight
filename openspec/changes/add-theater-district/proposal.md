# Add Theater District

## Why

Afterlight is a quiet place to explore alone, but the multiplayer infrastructure (presence, rooms, shared market/garden state) already turns it into a shared city. The one thing players cannot do together is *hang out*: sit somewhere warm and watch something. A theater district gives the world a destination whose purpose is co-presence — an auditorium where anyone can queue a video, load an IPTV list, flip channels, and everyone seated in the room watches the same thing at the same time.

## What Changes

- New travel-to district **The Orpheum** (`theater`): an atmospheric cinema auditorium with rows of sit-able chairs, a large screen, projector booth, marquee, and field note. Follows the established district recipe (definition, builder, gates, minimap path, HUD, exploration save).
- New **sit** interaction on theater seats (and reusable `seat` item type): the player snaps into a chair in a seated pose, movement keys or E stand up; remote players see each other seated via an additive presence flag.
- New **media screen** that plays shared content: YouTube, Vimeo, direct `.mp4`/`.webm` links, and HLS `.m3u8` streams, rendered as a DOM overlay anchored to the in-world screen (player SDKs/`hls.js`; iframes cannot be WebGL textures).
- New **queue** for YouTube-style video items with auto-advance: anyone in the room can add, reorder, skip, or play-now.
- New **IPTV support**: users import M3U/M3U8 playlists (file or pasted URL/text), browse them in a channel **guide**, and flip channels; selecting a channel shares the *resolved stream URL* so viewers who never imported the list still see it.
- New **shared viewing sync**: server-authoritative theater room state (now-playing source, position, play/pause, queue) broadcast on change and snapshotted to late joiners, following the garden/nodes pattern; anyone present may control the screen (chill-hangout rule).
- Projector **restoration completion** (marquee + screen power-up) per the standard one-landmark district loop; watching is *not* gated on completion.
- New protocol message types, a server `TheaterManager` with persistence in `data/game-state.json`, and a new `hls.js` dependency.

Depends on: nothing in flight; coordinates with `fix-presence-race` (both touch `server/world.js` presence payloads — sitting flag is additive) and is compatible with `add-irc-chat` (no chat integration required).

## Capabilities

### New Capabilities
- `theater-district`: The Orpheum as a travelable district — layout, seating/sitting behavior, restoration objective and visible power-up, field note, minimap/HUD/save integration, and seated visibility for remote players.
- `video-screen`: The screen as a media player — accepted source types (YouTube, Vimeo, direct video files, HLS), the shared queue with auto-advance, IPTV M3U import/parsing, the channel guide, channel flipping, and viewer controls.
- `shared-viewing`: Multiplayer synchronization of the theater — server-authoritative now-playing state, control actions from any occupant, snapshots for late joiners, drift correction, persistence across restarts, and input validation/limits.

### Modified Capabilities
- (none — no capability has been archived yet; additive presence `sitting` flag is specified under `theater-district`)

## Impact

- **Shared**: `shared/protocol.js` — new `MSG_TYPES` (`theater_state`, `theater_queue`, `theater_play`, `theater_control`, `theater_channel`) and room id `theater`; new `shared/theaterModel.js` (pure state reducer + M3U parser + sync-time math) usable by both server and tests.
- **Server**: new `server/theater.js` manager (state, queue, apply-actions, snapshot); `server/index.js` handler blocks + JOIN_ROOM/WELCOME snapshot wiring; `server/world.js` additive `sitting` in movement/presence; `server/storage.js` persists `theater` section with additive defaults.
- **Client**: `src/districts.js` (definition + builder + DISTRICT_BUILDERS entry, appended last to avoid reseeding existing districts); new `src/world/theaterWorld.js` auditorium builder with seats; new `src/ui/theaterScreen.js` (screen overlay, projection anchoring, YT/Vimeo/hls playback, guide dialog, queue dialog); `src/main.js` (interact dispatch for `seat`/`theater_screen`, sit state, mapPaths entry, net.on registrations); `src/net/client.js` send wrappers.
- **Dependencies**: `hls.js` (npm) for `.m3u8`; YouTube IFrame API and Vimeo player SDK loaded lazily from CDN at runtime (like the existing Google Fonts dependency — degrades gracefully offline).
- **Persistence**: `data/game-state.json` gains a `theater` section (now-playing, queue); seat/sitting state is not persisted. Player-saved IPTV lists live in client localStorage.
- **Tests**: new `tests/theater.test.js` (model reducer, M3U parsing, sync math, manager persistence) and `tests/theater-net.test.js` (two-client room sync + late-join snapshot against a real server on port 0); `tests/districts.test.js` gains theater expectations (pathability, spawn clearance, builder integrity).
- **Docs**: README (theater controls, supported sources, IPTV import, known CORS/stream limitations), AGENTS.md (theater integration points, screen-overlay architecture note).

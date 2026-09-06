## 1. Shared model and protocol

- [x] 1.1 Add `shared/protocol.js` message types: `THEATER_STATE`, `THEATER_QUEUE`, `THEATER_CONTROL`, `THEATER_CHANNEL`; define the `theater` room id constant and document payload shapes
- [x] 1.2 Create `shared/theaterModel.js` with `classifySource()` (youtube/vimeo/file/hls/invalid, http(s)-only), URL→embed/element mapping, title/URL length caps, queue cap (50), seek-clamp and timeline helpers (`effectivePositionSec(state, nowMs)`)
- [x] 1.3 Implement the pure reducer `applyTheaterAction(state, action, actor)` covering queue add/remove/playNow/skip/clear, pause/resume/seek/ended/failed, and channel select, each returning `{state, error?}` per the validation rules
- [x] 1.4 Implement `parseM3U(text)` returning `{entries: [{url, name, group?, logo?}], skipped}` with graceful handling of malformed `#EXTINF` blocks and non-M3U input

## 2. Server

- [x] 2.1 Create `server/theater.js`: `TheaterManager` holding state, delegating to the reducer, exposing `applyAction(playerId, action)` / `snapshot()` / `tick`, with per-sender `error` results and no server-side URL fetching
- [x] 2.2 Extend `server/storage.js` with an additive `theater` section (`{now, queue}`), `normalizeTheater()` defaults, and atomic save wiring
- [x] 2.3 Wire `server/index.js`: dispatch the three new message types, broadcast `THEATER_STATE` to the `theater` room on every applied change, send the snapshot on `JOIN_ROOM` for `theater`, include theater state in `WELCOME`
- [x] 2.4 Add optional `sitting` flag to movement handling in `server/world.js` so it flows into presence join/update payloads (additive; coordinate with `fix-presence-race` if it has landed)
- [x] 2.5 Verify server restart restores persisted theater state (manual or via test from 5.x)

## 3. Client — district and seating

- [x] 3.1 Add the `theater` district definition (appended last): id, name "The Orpheum", theme colors, objective "Restore power to the projector", landmark/note/spawn coordinates, messages
- [x] 3.2 Build `src/world/theaterWorld.js` auditorium: screen wall + raised stage backdrop, curved seat rows with two aisles as `block()` obstacles, projector booth, marquee over the entrance, field-note stand, entrance/gate arches; static geometry instanced, marquee/screen sheen in a dynamic subgroup
- [x] 3.3 Implement the `seat` interactable and sit behavior in `src/main.js`: snap to seat anchor facing the screen, seated pose, suppress movement/walk-click while seated, stand on E or any movement key, per-seat occupancy
- [x] 3.4 Add `sitting` to local movement sends and render seated pose for remote players in `main.js` presence handling
- [x] 3.5 Add projector restoration landmark: interact → exploration save id `theater`, idempotent; `update(time, done)` lights the marquee, aisle lamps, and screen power-on sheen (applied on rebuild); playback not gated on completion
- [x] 3.6 Register `mapPaths.theater` minimap schematic and confirm HUD title/objective/accessibility labels for the new room
- [x] 3.7 Confirm gate routing (west = previous last district, east = court), spawn clearances for player and Kiln, and that existing districts are unaffected by the append

## 4. Client — screen, queue, IPTV

- [x] 4.1 Create `src/ui/theaterScreen.js`: screen overlay element anchored to the projected screen quad via per-frame `matrix3d` homography, hidden when the theater is not the active room; idle/static and error visual states
- [x] 4.2 Implement playback engines: direct `<video>` for `.mp4`/`.webm`, lazy `import()` of `hls.js` for `.m3u8`, lazy CDN load of YouTube IFrame API and Vimeo player SDK with timeout fallback; local volume control; autoplay-blocked fallback affordance
- [x] 4.3 Implement the shared clock: sync position on every `THEATER_STATE`, drift correction beyond ~1.5 s, pause/resume/seek wiring, and `ended`/`failed` reports guarded by current item id
- [x] 4.4 Add the theater controls panel + queue dialog (view queue, add by URL, remove, skip, play-now, clear) using the existing game-modal pattern with input/typing guards
- [x] 4.5 Add IPTV import (paste text, file upload, URL fetch with CORS error message), local saved-lists storage in localStorage, channel guide dialog (names/groups), channel prev/next flipping, and the "import a list first" prompt
- [x] 4.6 Wire `interact()` branches for `theater_screen`/projector items, `net.on(THEATER_STATE)` registration, and `src/net/client.js` send wrappers
- [x] 4.7 Add `hls.js` to `package.json` and verify the main bundle stays under the existing warning threshold thanks to dynamic import

## 5. Tests

- [x] 5.1 `tests/theater.test.js`: classifySource cases (valid/invalid, scheme enforcement), reducer behaviors (queue ops, limits, seek clamps, ended/failed guards), timeline math, M3U parsing (valid, mixed, garbage), state persistence round-trip via `Storage`
- [x] 5.2 `tests/theater-net.test.js`: boot real server on port 0; two clients join `theater`; queue/pause/flip from one → other receives `THEATER_STATE`; late joiner gets snapshot mid-playback; rejected action errors only the sender and leaves shared state intact
- [x] 5.3 Extend `tests/districts.test.js` expectations for the theater: metadata integrity, flood-fill reachability of seats/note/projector/gates, spawn clearance, finite `update()` output
- [ ] 5.4 Run `npm test` and resolve all failures

## 6. Verification and docs

- [ ] 6.1 `npm run build` succeeds; confirm no new bundle-size warning regression
- [ ] 6.2 Browser-verify in the running app: travel to The Orpheum, sit/stand, restore projector (marquee/lights persist across travel+reload), queue a YouTube video and a direct `.mp4`, verify second browser window sees synced playback, pause/seek from one window, late-join mid-video, IPTV import + guide + channel flipping, dead-link auto-advance, and existing districts/save regression pass
- [ ] 6.3 Check all three camera views and a narrow viewport for overlay alignment and HUD overlap; confirm keyboard controls still work with panels open
- [ ] 6.4 Update README (theater controls, supported sources, IPTV import steps, CORS/streaming limitations) and AGENTS.md (theater integration points, screen-overlay architecture note)

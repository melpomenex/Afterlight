# Design — Add Theater District

## Context

The game already has: a generic room model (any string roomId gets presence via `WorldManager`, `server/world.js:29`), a snapshot-on-join pattern (garden/nodes/market state sent on `JOIN_ROOM`/`HELLO`, `server/index.js:157-176`), a `<dialog class="game-modal">` UI pattern (`src/ui/marketModal.js`), an explicit `DISTRICT_BUILDERS` map (`src/districts.js:490`), and node:test server integration tests that boot the real server on port 0 (`tests/presence-race.test.js`). There is **no** precedent for HTML anchored to world positions, and WebM/Canvas textures cannot capture cross-origin iframes — which forces the screen rendering decision below. Motivation: see proposal.md — Why.

## Goals / Non-Goals

**Goals:**
- One rendering path that plays YouTube, Vimeo, direct files, and HLS on the in-world screen.
- Shared, server-authoritative playback that survives restarts and late joins, with no host/permission model.
- A district that would pass the existing district test suite and AGENTS.md district recipe on its own merits (layout, completion effect, note).
- All shared logic (state reducer, M3U parsing, timeline math, URL classification) in pure `shared/` modules runnable under `node --test`.

**Non-Goals:**
- Voice/text chat, watch-party invitations, private rooms, per-user screens.
- Webcam/microphone, DRM content, torrent/P2P streaming, playlist (.txt XML/ASX) formats beyond M3U/M3U8.
- A CORS proxy for IPTV fetching (documented limitation instead).
- Elevating actors onto stage platforms or tiered geometry (flat movement contract stays).
- Integrating with the in-flight `add-irc-chat` change.

## Decisions

**1. Screen = DOM overlay anchored to the 3D screen via per-frame homography.**
The screen mesh gets a bezel and an "off" material; actual content renders in a DOM element (YouTube/Vimeo `<iframe>`, `<video>` + `hls.js` for direct/HLS) positioned by projecting the screen quad's four corners to CSS pixels each frame and applying a `matrix3d` homography, plus a visibility check when the theater isn't the active room.
*Why:* YouTube/Vimeo only exist as iframes; a cross-origin iframe cannot be a WebGL texture source, and even cross-origin `.mp4` textures taint without CORS headers. A plain modal dialog (the market pattern) would work but kills the sit-and-watch-the-big-screen fantasy. *Alternatives rejected:* `THREE.VideoTexture`-only (breaks YT/Vimeo entirely); hybrid texture-for-files + overlay-for-embeds (two rendering paths, visible seams when switching).

**2. Shared timeline: `{itemId, playing, positionSec, updatedAt}` on the server.**
Effective shared position = `positionSec + (clientNow - updatedAt)/1000` while playing (client clocks are close enough; no NTP exchange). Clients hard-resync on every `theater_state` message; between messages they correct drift only when off by more than ~1.5 s, and corrections never feed back into messages (prevents correction loops between clients). Seek/pause just writes a new `positionSec`/`updatedAt`.
*Alternatives rejected:* continuous clock-sync protocol (overkill for a hangout); per-client free playback with no shared clock (fails "watch together").

**3. Auto-advance is server-driven via an `ended` report.**
The focused viewer (seated or nearest active viewer; any client may report) sends `theater_control {op:'ended', itemId}` when media ends; the server applies it only if `itemId` matches the current item (guards against stale/duplicate reports), pops the queue, and broadcasts. Media error states report `op:'failed'` the same way, satisfying the dead-link spec scenario.

**4. Theater state lives in a pure model + thin server manager.**
`shared/theaterModel.js` holds: URL classification (`classifySource`: youtube | vimeo | file | hls | invalid), the state reducer (`applyTheaterAction(state, action, actor)` → `{state, error?}`), validation/limits (http(s) only, length caps, queue cap 50, seek clamps), timeline math, and the M3U parser (text → `{name, url, group, logo}` entries, skipping malformed `#EXTINF` blocks). `server/theater.js` is a thin manager holding state, delegating to the reducer, persisting via `storage`, and broadcasting `THEATER_STATE` to the room. This mirrors `shared/gardenModel.js` + `server/gardens.js` and makes every rule unit-testable.
*Alternatives rejected:* validation only in the HTTP-style handler chain (untestable, scattered); trusting clients with raw state (validation spec requires server-side limits).

**5. Protocol: three client→server messages, one server→client message.**
`theater_queue {op: add|remove|playNow|skip|clear, item?, index?}`, `theater_control {op: pause|resume|seek|ended|failed, positionSec?, itemId?}`, `theater_channel {url, title}` (IPTV flip, resolved URL included per the shared-viewing spec). Server replies with full `THEATER_STATE` snapshots (small payloads; no delta complexity), plus `action_result` for sender feedback and `error` for rejections. Snapshot is sent on `JOIN_ROOM` for room `theater`, following the node-state pattern.

**6. Persistence: additive `theater` section in game-state.json.**
`{now: {…} | null, queue: […]}` saved on every applied change via the existing atomic write-temp-rename `Storage`; `normalizeTheater()` defaults missing/corrupt data to idle. Rollback-safe: old code ignores the section; new code tolerates its absence. Personal IPTV lists stay in `localStorage` (per browser), never on the server.

**7. District integration: append-only.**
Definition appended as the last entry of `districts` (existing index order, seeds, and the courtyard's hard-coded east gate stay untouched); west gate links the previous last district, east gate wraps to court. Explicit `theaterWorld` builder registered in `DISTRICT_BUILDERS`, `mapPaths.theater` schematic, standard bounds (no bounds/camera changes). Auditorium: screen wall + raised stage backdrop (visual only, no walkable elevation), curved seat rows as `block()` obstacles with two aisles, projector booth prop, marquee over the entrance, field-note stand. Static geometry instanced; marquee bulbs and screen power-on sheen stay in a dynamic subgroup (emissive/animated → excluded from the static batch). Completion (`exploration.completed` id `theater`) powers the marquee/aisle lights and screen sheen via `update(time, done)` and is applied on rebuild — it is cosmetic and does not gate playback.

**8. Sitting: `seat` item type, local pose state, additive presence flag.**
`interact()` gains a `seat` branch: records `seatedOn = {x, z, rotY}` on the local actor, suppresses movement/walk-click/click-marker until stand (E on the seat, or any movement key). Remote players: `movement` payload gains optional `sitting: true`; `WorldManager` relays it inside the existing presence payloads; remote avatar update renders a seated pose (legs folded, no leg-swing) when the flag is set. Strictly additive — coordinates with `fix-presence-race` without changing its semantics (a seated player still sends one final movement, then goes quiet).

**9. SDKs: lazy, off the critical path.**
`hls.js` is an npm dependency but dynamically `import()`ed only when an HLS item actually plays (keeps the main bundle under the existing 500 kB warning threshold). YouTube IFrame API and the Vimeo player SDK load from their CDNs on first embed use with a timeout; if unavailable (offline), embeds show the screen's error state while direct-file/HLS playback continues. Volume is local to each `<video>`/postMessage player and never part of shared state.

## Risks / Trade-offs

- [IPTV URL fetch blocked by CORS] → First-class paste-text and file-upload import paths; document the limitation in README; no proxy.
- [Browser autoplay policy blocks unmuted autoplay] → Playback always starts from a user gesture (queue/channel controls); if the browser still blocks, show a "tap to unmute/play" affordance on the overlay instead of a silent black screen.
- [Homography misalignment across the 3 camera views and zoom levels] → Compute from live projection (not cached transforms); verify visually in all views during implementation; fade the overlay out when the screen center is behind the camera or off-screen.
- [Overlay steals walk-clicks near the screen] → The overlay only covers the projected screen rect high on the back wall, away from walkable ground; the guide/queue use the existing modal pattern that already guards typing and clicks.
- [Un-embeddable/dead YouTube videos] → Embed error surfaces → report `failed` → auto-advance (spec'd), with a visible notice naming the item.
- [Client clock skew distorts shared position] → Skew of a few seconds only shifts the start point slightly; drift self-corrects on the next state broadcast; acceptable for a hangout.
- [In-flight `fix-presence-race` also touches `server/world.js`] → `sitting` is purely additive to payload objects; rebase order documented in tasks; no behavioral overlap.
- [Server relays stream URLs (SSRF-ish outbound fetch by clients)] → Server never fetches URLs itself, only validates and relays; `http(s)` scheme enforcement and length caps bound abuse; browsers enforce their own mixed-content rules.

## Migration Plan

Additive only: new protocol messages (old clients ignore unknown types), new optional presence field, new storage section with normalization, district appended to the array. Rollback = remove the district definition and let save normalization filter the unknown `theater` id, as it already does. No existing save, bundle, or test contract changes shape.

## Open Questions

None material — remaining choices (seat count, marquee art, exact copy) are implementation aesthetics resolved during the build.

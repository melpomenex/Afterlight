# Building on Afterlight

This file applies to the entire repository. Read it before changing the game. It is a practical guide to preserving the existing experience while extending it. The user's current instructions take precedence; do not treat this document as a reason to ask permission for routine, authorized implementation work.

## 1. What you are building

Afterlight is a collection of beautiful shared places on the internet, implemented as a small, playable, atmospheric isometric game made with Three.js. The player is a rust/gold maintenance robot accompanied by Kiln, a smaller cream-colored robot. The setting is an abandoned industrial city that is still worth repairing. Exploration, companionship, little discoveries, and visible acts of restoration are the experience.

Product identity (since the social-places program): the featured shared places — The Orpheum, The Rain Court, and accepted destinations after them — are what the game is; the market garden, trading and restoration landmarks are **retained legacy content**, fully playable but no longer the default presentation. The contextual HUD policy (`src/ui/placeHudPolicy.js`) leads social places with place identity, people, chat, emotes and travel, while every legacy control stays reachable. Demoting the presentation never deletes data and never substitutes for the still-unfinished gardens/economy migration (P6), which continues as correctness work.

The visual reference is a detailed industrial courtyard after rain: layered masonry, wet paving, copper pipes, ivy, warm window light, a high isometric camera, and restrained translucent HUD panels. The existing game is a procedural interpretation, not a copy of the original game's assets or unseen mechanics.

Reference video, if needed for a visual task:
https://video.twimg.com/amplify_video/2096004824751890434/vid/avc1/3692x2160/gaoPiuxsByXKZaqU.mp4

Preserve these qualities:

- A real, controllable 3D game, not a static mockup or a menu pretending to be a game.
- Distinct places with coherent architecture and readable routes.
- Small environmental stories, meaningful interactions, and persistent results.
- Kiln accompanying the player across areas.
- Warm amber details against desaturated stone, green, teal, or blue surroundings.
- A quiet, humane tone. Example: “If anyone comes back, leave the light on.”
- A full-window world with compact HUD overlays. Do not turn it into a conventional website with a navigation bar and content sections.

Do not interpret “add levels” as just changing the background color, moving the camera, or adding names to a selector. A new level should have its own composition, navigable layout, landmark, interaction, and state.

## 2. Start here on each task

1. Read this file and the relevant source files. Inspect the actual current code; this document can become stale. When entering an unfamiliar subsystem, let Ripwire (section "Ripwire — repository intelligence") rank where to look before opening many files.
2. Read `package.json` for available commands and `README.md` for player-facing behavior.
3. Check for existing work before editing. Do not overwrite user changes, deployment configuration, or unrelated modifications.
4. State briefly what you are implementing. Make reasonable choices within the user's scope rather than repeatedly asking for confirmation.
5. Implement a complete vertical slice: visuals, gameplay, feedback, persistence where relevant, and verification.
6. Keep changes scoped. Improve nearby code when necessary, but do not combine a small feature with an unsolicited framework migration or wholesale rewrite.
7. Finish with a concise account of what changed, how to use it, and what was actually verified. Report real limitations candidly.

For documentation-only changes, inspect and validate the documentation; do not run unrelated rendering tests or change game code.

## 3. Repository map and tools

| File | Responsibility |
| --- | --- |
| `index.html` | Canvas, base HUD, companion panel, interaction card, settings dialog, Places dialog, initial loading overlay. |
| `src/style.css` | Full-window presentation, typography, translucent panels, responsive layouts, Places selector styles. |
| `src/main.js` | Renderer, lighting, original courtyard geometry, actors, global state, input, collision, interaction dispatch, travel, HUD updates, audio, save/load, animation loop. |
| `src/cameraControl.js` | Pure camera-mode math: four-view cycle, per-view movement basis (view-relative in first person), pitch clamps, pointer drag/click classification. No renderer dependencies; covered by `tests/camera.test.js`. |
| `src/jump.js` | Pure jump/bunny-hop math: vertical arc, hold-to-rehop chains, momentum scalar with per-hop gain and cap, reset rules. No renderer or network dependencies; covered by `tests/jump.test.js`. |
| `src/districts.js` | Re-exports the shared place manifest, exploration-save normalization, and the per-district scenery builders, registered into `src/places/registry.js`. |
| `shared/placeDefinitions.js` | The single editable place manifest: pure, deep-frozen definitions (identity, kind, seeds, bounds, spawns, frozen legacy gates, minimap paths, atmosphere keys, capabilities, featured/legacy flags) plus validation. No Three.js/DOM imports. |
| `src/places/` | `registry.js` (builder/controller registry), `worldFactory.js` (build pipeline: validate → shell → builder → batch), `runtime.js` (the tested travel coordinator behind setRoom), `travelState.js` (pure resolution/reset/generation helpers), `theaterAdapter.js` (specialized Orpheum lifecycle). |
| `src/social/` | `seating.js` (seat normalization, safe dismount, one seat controller) and `interactions.js` (bounded interaction registry for gates/seats/notes/screen). |
| `src/ui/placeSelector.js` | The Places selector: native-dialog modal behind T/Travel; featured destinations first, legacy areas retained, live occupancy via the bounded place_directory protocol (unknown stays unknown). |
| `src/ui/placeHudPolicy.js` | Pure place-context HUD policy (deemphasize-legacy-farming): social vs legacy classification from manifest metadata plus room id; per-context visible sections, shortcut scope, presentation-only tool clear/restore, contextual copy; the reversible `afterlight-legacy-ui-v1` preference behind Settings' "Legacy gardener HUD". Covered by `tests/place-hud-policy.test.js`; applied at context changes by `main.js` and `src/ui/marketModal.js`. |
| `src/world/theaterWorld.js` | The Orpheum builder: auditorium, seats (obstacles + `seat` items), screen mesh + world-space `screenQuad`, marquee/projector restoration visuals. Registered in `DISTRICT_BUILDERS`. |
| `src/ui/theaterScreen.js` | Theater screen UI: DOM overlay homography-anchored to the in-world screen (sized to the projected quad with the screen's world aspect so media stays crisp and unsquashed), playback engines (video/HLS/YouTube/Vimeo + torrent via the file engine), shared-clock sync, booth/guide/torrent-picker dialogs (country → category IPTV navigation), shared IPTV library + personal localStorage lists (HTTP uploads, lazy `iptv_list` pulls, now/next guide columns), torrent resolve→pick flow, YouTube playlist import (input recognition, mixed-link choice, preview→confirm), cinema view (`body.theater-watching`). |
| `server/theater.js`, `shared/theaterModel.js` | Theater room state: thin server manager (passes `addMany` batch reports through) + pure reducer/URL-classifier (incl. magnet links and YouTube playlist/mixed links; `youtubePlaylist` kind is an import target, refused by playback ops)/M3U parser (captures `tvg-id` for guide matching)/timeline math (all rules live in the shared model). |
| `server/iptv.js`, `shared/iptvModel.js`, `shared/xmltv.js` | Shared Orpheum channel library + program guide: thin manager owning `data/iptv.json` / `data/epg.json` (deliberately outside `game-state.json`), pure limits/library actions/normalization/M3U serializer, and a dependency-free tolerant XMLTV parser + tvg-id/name matcher + now-next lookup. |
| `server/torrents.js`, `shared/torrentModel.js` | Torrent engine: thin server manager over `webtorrent` (resolve, Range streaming, cache cap/reap) + pure magnet validation, picker ordering, pick/status sanitation, error text. |
| `server/youtubePlaylist.js` | Server-only YouTube playlist resolver for the theater import: bounded page fetch (timeout, size cap, consent cookies) + pure `extractPlaylistVideos()` over `ytInitialData` (classic `playlistVideoRenderer` and current `lockupViewModel` layouts), fixture-tested; declines mixes and non-public lists with stable reasons. |
| `tests/districts.test.js` | Node tests for exploration-save normalization and approximate navigational reachability in the new districts. |
| `README.md` | Running the project and playing the game; update when controls or player-facing features change. |
| `package.json`, `package-lock.json` | ES modules, dependencies, scripts, reproducible dependency versions. |
| `dist/` | Generated Vite output. Edit source, then build; do not implement features by editing generated bundles. |

Stack: vanilla JavaScript ES modules, Three.js, Vite, DOM/CSS HUD, Web Audio. The supported multiplayer stack is **Phoenix gateway + Node specialty sidecar** (`npm run dev:stack`): Phoenix owns transport, world presence (dev flip), chat relay (dev flip), and signed identity; Node retains torrent/IRC HTTP, theater uploads, and transitional WS relay for domains not yet ported (see `docs/architecture/elixir/ownership.md` §5). The transitional relay is real, unfinished migration surface: the gardens/economy cutover (P6, `add-ash-gardens-economy-restoration`) has not happened — checkbox completion in other changes never proves it — so documentation and reports must never claim all Node writers are retired or the P6 production import complete. Legacy Node-only transport (`npm run dev` + `npm run server`) is deprecated (removal 2026-12-01).

**Data directory policy:** never delete original snapshot files (`data/game-state.json`, `data/iptv.json`, `data/epg.json` — SHA-256 recorded in P11 evidence). Only regenerable caches (torrent cache dir) may be cleared. Sidecar-owned files (`data/torrents/`) are written only by `server/torrents.js`.

Commands:

```sh
npm install       # When dependencies are missing or intentionally changed
npm run dev:stack # Supported stack: Node sidecar :3001 + Phoenix gateway :4000 + Vite :5173
npm run dev       # Vite only (legacy Node transport; deprecated, removal 2026-12-01)
npm test          # Node test runner
npm run build     # Production output in dist/
npm run preview   # Serve the production build for inspection
```

Use the existing local server if it is running. Do not launch a second server and unknowingly test a stale port. Vite can choose another port when its preferred port is occupied; read its output. The current dev script binds to `0.0.0.0`; do not confuse a network-accessible development process with a deployment.

If the environment blocks package downloads or binding a server socket, use the available approval mechanism for the specific command. Do not disable sandbox/security controls. An earlier session needed authorized network access for npm and authorization to bind the development server. These were environment restrictions, not application defects.

The build currently emits a non-fatal warning about a JavaScript chunk exceeding 500 kB. It is not a failed build. Do not silence it by arbitrarily raising thresholds. Address actual loading/performance needs when in scope.

The CSS requests Google Fonts with local font fallbacks. Game geometry and synthesized sound do not depend on external game assets. Do not claim the font styling is entirely offline without changing this dependency.

## 3a. Ripwire — repository intelligence

Ripwire (`~/.local/bin/ripwire`, installed via `RIPWIRE_REPO=redhat-et/ripwire bash -c "$(curl -fsSL https://raw.githubusercontent.com/redhat-et/ripwire/main/scripts/install.sh)"` if missing) is the preferred first-line repository navigation and change-impact tool for this project. It is a development-time tool only: it must never become an Afterlight runtime dependency, build dependency, bundle input, or CI gate. If it is not installed, keep working with normal file reads and searches — do not install software without authorization.

**Before broad grep/search, large-scale file reading, or guessing where a subsystem lives, run Ripwire instead:**

- Orient in an unfamiliar area: `ripwire .` (ranked symbol map), or scoped: `ripwire src`, `ripwire server shared`.
- Ask a specific question: `ripwire . --for="<task or question>"`.
- Plan a substantial feature: `ripwire . --pack-task="<feature in plain English>"` before writing it — use the result to find reusable building blocks, files/symbols to touch, architecture boundaries, and tests.
- Before modifying a load-bearing symbol, inspect its blast radius: `ripwire . --callers=<symbol>`, `--uses=<symbol>`, and `--impact=<symbol>`. Also ask "which tests cover this?" with `--affected=<symbol>`.
- When a symbol's body is needed, prefer `ripwire . --expand=<symbol>` over opening a large file; normal reads remain fine when needed.
- For a small but contract-sensitive edit: `ripwire . --edit-check=<symbol>`; escalate to full change review if it reports a contract change.
- After a non-trivial diff, run `ripwire . --situ` (what your change touched and what may be affected); use `ripwire . --pr-context[=main]` (add `--max-tokens=8000` if large) for broader review, then `ripwire . --test-gate`.
- When several agent branches/worktrees are landing together: `ripwire . --merge-scout=<ref1>,<ref2>,<ref3>` for conflicts and merge order. To find stranded or superseded unmerged work: `ripwire . --stray-content --plan`.

Ripwire supplements, and does not replace: `npm test`, `npm run build`, README requirements, and the OpenSpec workflow (proposals, specs, and tasks remain mandatory where they apply). Ripwire findings are evidence for planning; they never bypass process, and missing Ripwire edges are never proof that no dependency exists.

Scope caveats for this repository:

- Run roots deliberately. `ripwire .` indexes the whole tree, including untracked vendored trees (`serviceradar/`, `server_elixir/` deps and build output) that can dominate results with unrelated symbols. For Afterlight work prefer scoped roots like `src server shared tests` (multi-root: `ripwire src server shared`).
- **Elixir caveat.** The installed Ripwire build has no Elixir grammar, so `server_elixir/**.ex`/`.exs` files receive no AST/symbol/call-graph analysis. Use Ripwire for the JavaScript side, but supplement Elixir work with targeted source inspection, project search, and Elixir tooling/tests. Do not treat missing Ripwire edges in Elixir code as proof that no caller or dependency exists.

## 4. Runtime architecture: understand before editing

### Shared actors, separate worlds

`main.js` creates the original courtyard directly in `scene`, then reparents its content into `courtGroup`. The player, Kiln, particles, click marker, sun, and hemisphere light stay shared outside that group.

`worlds` is a `Map` keyed by stable district ID. Each world exposes:

```js
{
  group,       // THREE.Group holding this area's scene objects and local lights
  obstacles,   // Collision rectangles for this area
  items,       // Interactable objects for this area
  update(time, completed) {} // In-place animation/state-dependent visuals
}
```

The courtyard is eager-built in `main.js`. Other districts are lazy-built on first visit by `buildDistrict(def, completed)` and cached. Traveling toggles group visibility; it does not reconstruct visited districts. Hidden areas remain in memory, but their geometry and local lights should not render.

Do not accidentally parent global actors or global lights into a district. Do not add local scenery directly to the shared `scene` after grouping; it could appear in every area. Use the target world's group. If extending the original courtyard after its initial construction, explicitly use `courtGroup` and its stored data rather than whichever area happens to be active.

`objects` and `interactables` in `main.js` are mutable references to the active world's arrays. They are intentionally reassigned on travel. Code that assumes they always belong to the courtyard will modify the wrong level.

### What travel must do

`setRoom(id)` is now a thin wrapper over the place runtime (`src/places/runtime.js`), which owns the transition order. A committed travel:

1. Resolves the requested ID (valid deep link wins; absent link stays The Orpheum; unknown IDs visibly fall back to Theater — never market under a mismatched wire ID; personal gardens keep their adapter).
2. Prepares the destination world hidden before leaving the current place; a build failure keeps the previous world, membership and HUD, with a retryable travel error.
3. Deactivates the prior place's controller, stops an active call adapter locally, stands the actor up, and takes a new activation generation so stale async work is discarded.
4. Swaps the visible group, active world, bounds and spawns; clears nearest, walk target, marker, held keys, pointer gesture, queued jump/momentum, emote wheel and seat.
5. Applies the destination's presentation (fog/background/sun, title, location labels, minimap, canvas accessible name), saves visited/current, clears the remote roster, and binds the room through `net.joinRoom` (desiredRoom replay intact).
6. Activates the place's controller with the current generation and announces local readiness; network status is separately `joining/online/offline` — joining is never claimed as accepted membership.

Preserve these responsibilities (they live in the runtime and its tests, `tests/place-travel.test.js`). Hidden areas remain in memory, but their geometry and local lights must not render, and only the active place receives animation updates.

Travel currently resets position to an entrance, not the precise point of departure. Reload restores the last district at its entrance. Exact position saving is not implemented.

### Input and frame loop

- WASD and arrow keys move relative to the selected camera angle (in first person: relative to the view yaw).
- Shift runs. E interacts. C cycles four views (three isometric angles, then first person). T opens Places. M opens the Market Exchange.
- Space jumps. Holding Space bunny hops: each landing with Space held relaunches on the same frame, preserving horizontal momentum plus a small gain, capped at ~1.5× run speed. Jump/bhop rules live in `src/jump.js` (pure, covered by `tests/jump.test.js`); `main.js` feeds it grounded/input facts each frame and applies the returned y and speed scalar. Collision is unchanged: obstacles and bounds block mid-air.
- Pressing on the ground starts a gesture: released below the drag threshold it walks exactly like the old click; a drag instead turns the view (first person only). Gesture rules live in `src/cameraControl.js`.
- Mouse wheel changes orthographic zoom within bounds (no effect in first person).
- Escape opens settings; in cinema view it returns to the game first. Native dialog cancellation closes dialogs through explicit handlers.
- Settings and the Places selector pause gameplay and clear held movement keys.
- Losing window focus clears held keys.
- The frame loop caps delta time and animates legs, companion movement, collectibles, particles, active district visuals, and the camera.

### Jump state hygiene

Jump momentum is session-local and resets at every path that clears held keys: `standUp()`, `sitOn()`, `setRoom()`, pause toggles (settings/districts), chat-input focus, and window blur, all through `clearJumpMomentum()` in `main.js`. Landing without Space held resets inside `stepJump()`. While airborne the jump state owns the avatar's y (tucked legs); the grounded walk bob is untouched. Presence carries an additive `airborne` flag (relayed by `server/world.js` like `sitting`, never persisted); `RemotePlayersManager` animates a standardized hop parabola from the flag and treats missing flags as grounded. Kiln stays ground-bound.

### Active camera and first person

`main.js` holds two cameras — the original orthographic one for the three isometric modes and a perspective one for first person — and routes every consumer through a single `activeCamera` reference: the composer's `RenderPass.camera`, the click raycast, `resize()`, the follow logic, and the theater `screenQuad` projection. When touching any of those, use `activeCamera`, not a specific camera, or the view modes drift apart. First person is mode 3 in the `cameraMode` cycle: the frame loop places the perspective camera at the player's eye height (lowered while seated), `player.visible` is false for the owner's avatar only, movement rotates through `moveBasis()`, and entering the mode seeds the yaw from the avatar's facing (camera and avatar facing conventions differ by π). Camera mode, yaw, and pitch are session-local presentation state: never saved, never synced.

Keep input methods equivalent where possible: interaction works through E and the on-screen button; travel works through gates and the Places selector. Do not break keyboard play after the user clicks a button. Do not hijack typing in inputs/selects. Keep keyboard focus indicators visible.

Do not introduce another requestAnimationFrame loop for each object or district. Register district animation in `update()` and run it from the existing active-world loop. Use elapsed time or delta time, not assumptions about 60 FPS.

### The theater (The Orpheum): screen overlay, shared playback, sitting

The theater is a standard district, plus three mechanisms that exist nowhere else:

- **Screen overlay, not a texture.** The screen's content is a DOM element (`#theater-screen`) positioned every frame by projecting the builder's `screenQuad` (four world-space corners exposed on the built district) and applying a CSS `matrix3d` homography. YouTube/Vimeo only exist as cross-origin iframes, which can never be WebGL textures; direct files/HLS play in a `<video>`, so one DOM path covers every source. The overlay is hidden outside the theater room and skipped when the quad projects off-screen. Do not batch the screen panel or attach content meshes: the overlay floats above the canvas, and the 3D screen is just a bezel.
- **Server-owned playback.** All rules live in `shared/theaterModel.js` (pure reducer: URL classification with `http(s)`-only enforcement, queue caps, batch `addMany` for playlist imports, seek clamps, M3U parsing). The server applies actions, persists `{now, queue}` into `data/game-state.json`, and broadcasts full `theater_state` snapshots to the room on every change and on room join. Clients render snapshots, derive position from the shared timeline (`positionSec` + elapsed since `updatedAt`, skew-corrected via `serverNow`), correct drift locally only, and report `ended`/`failed` once per item id. Anyone in the room may control; there is no host.
- **Playlist import is resolve→preview→confirm, never a bill entry.** Playlist links classify as `kind: 'youtubePlaylist'`, which the `add`/`channel` ops refuse (`use_import`) and normalization drops; only the import flow adds its videos, as one atomic `addMany` (re-classified server-side, capped by `QUEUE_MAX`, honest `{queued, skipped, didNotFit}` report sent to the actor as `theater_import_result` before the room broadcast). Resolution is server-only (`server/youtubePlaylist.js`: bounded fetch + `ytInitialData` extraction, `theater_playlist_resolve`/`theater_playlist_resolved`, one per player plus cooldown) because browsers cannot fetch YouTube; mixes (`RD…`/`UL…`) and non-public lists are declined with stable reasons. Mixed `watch?v=…&list=…` links stay playable videos carrying `listId` context — the client asks "import the playlist or add just the video" every time. Server rejections ride the bare `error` message, which the theater UI surfaces in the add-status line only while a resolve is pending.
- **Sitting and cinema view.** Seats are `block()` obstacles with `seat` items; `interact()` snaps the actor into the chair (legs folded), suppresses movement, and sends an additive `sitting` flag through movement/presence so remote players render seated. Sitting engages cinema view (`body.theater-watching`): the overlay reflows into a large stage, the chat panel docks beside it via CSS only (its DOM is owned by the chat feature), the HUD hides, and the homography write pauses while `theaterSync` keeps running. Standing, <kbd>Esc</kbd>, or travel reverses it. The projector-restoration landmark is cosmetic and does not gate playback.
- **The theater is the world spawn.** The default initial room (no `?room=` override) is `theater`, and `setRoom('theater')` engages cinema view on every entry; movement keys, walk clicks, or Escape step out of the view in place (watch-without-sitting never moves the actor). The server's HELLO default room stays the Market Court — the client's `JOIN_ROOM` replay is what lands players in the theater, so keep `desiredRoom` semantics intact when touching reconnect logic.

### Torrent streaming (magnet links): server-side engine, pick-gated bill

Theater room rules for magnets (`src/ui/theaterScreen.js`, `shared/theaterModel.js`, `shared/torrentModel.js`, `server/torrents.js`, `server/index.js`):

- **Magnets are a server-side source kind, never a browser fetch.** `classifySource()` accepts `magnet:?xt=urn:btih:…` (v1 hex/base32, normalized to hex) as `kind: 'torrent'`, but a magnet alone cannot reach the bill: the reducer's `add`/`channel` ops require a structurally valid pick (`fileIndex`/`filePath`/`fileBytes`, video extension). The flow: booth paste → `torrent_resolve` (room-gated, one per connection) → server resolves metadata via `webtorrent` (lazy import; a broken install degrades to `engine_unavailable` errors, never a boot failure) → `torrent_files` to the requester only → picker dialog → the pick travels as a normal queue op or `theater_channel` with additive pick fields. Cancelling the picker touches no shared state.
- **The magnet stays canonical.** Bill items keep `{url: <magnet>, infohash, fileIndex, filePath, fileBytes}` so the bill survives restarts; clients build the playback URL locally (`net.apiBase` + `/api/theater/torrent/:infohash/:fileIndex`) and play it through the ordinary file engine — the browser only ever loads the game server's http(s) stream. `normalizeTheaterState()` keeps torrent items only when the pick survives sanitization (including `infohash`); losing it drops the item rather than stranding an unplayable entry.
- **Serving and cache live in `TorrentManager`.** `server/torrents.js` wraps webtorrent: per-file read streams with Range (206) support, video-extension allow-list, 404/416/503 responses; infohash→magnet library persisted at `data/torrents/library.json` so the stream endpoint can re-add after restart. On the shared 1 Hz tick: ~2 s `torrent_state` broadcast (progress/peers/ready) while a torrent item is live or a resolve is in flight, idle reaps (~10 min, bill-referenced infohashes exempt, `destroyStore: false` keeps data), and LRU disk-cap enforcement (`TORRENT_CACHE_MAX_BYTES`, default 4 GB; dir override `TORRENT_CACHE_DIR`). The cache directory is disposable by contract.
- **Status is additive and ignorable.** Clients fold `torrent_state` into the loading caption and booth now-panel and silently fall back to the generic loading state when it is stale or absent — old servers keep working with new clients and vice versa (old servers simply drop torrent items through the existing classifier).

### Shared IPTV library & program guide: server-persisted uploads (`server/iptv.js`, `shared/iptvModel.js`, `shared/xmltv.js`, `server/index.js`)

Theater room rules for the channel catalog and EPG:

- **Uploads only; the server invents nothing.** The library starts empty and no guide ships with the game. Playlists (paste text / file / URL — the URL is fetched server-side, `http(s)`-only, 15 s timeout, size-capped streamed read) go over HTTP `POST /api/theater/playlists` on the existing `http.createServer`; guides over `POST /api/theater/epg` (raw bytes, gzip detected by magic, `gunzipSync` with `maxOutputLength`). Both endpoints enforce caps before parsing (`shared/iptvModel.js` constants), answer CORS (`Origin` echo + preflight) for the dev origin, and broadcast a full `iptv_state` catalog to the theater room on success. Do not move uploads onto WS frames: guides reach tens of MB.
- **Persistence is split on purpose.** `IptvManager` owns `data/iptv.json` and `data/epg.json` with atomic tmp+rename writes; `game-state.json` is rewritten whole on every save, so multi-MB catalogs must never ride in it. Corrupt/missing files normalize to empty library / no guide, never a throw. Persist failures roll back the in-memory change.
- **Catalog snapshots are metadata-only.** `iptv_state` carries `{ id, name, addedBy, channelCount }` per list plus an EPG summary (`channels` = channels carrying schedule data); channel arrays travel only on demand via `iptv_list_get` → `iptv_list` (cached per client session), and now/next via bounded `epg_lookup` → `epg_schedule` (`EPG_LOOKUP_MAX` keys per batch, re-polled by the client while the guide is open). All three control messages are theater-room-gated like the projector ops. Guide matching keys are the playlist entry's `tvg-id`, falling back to normalized display name (`parseM3U` must keep capturing `tvgId`).
- **Client rendering contract.** The booth's list select groups shared lists ("Theater library") ahead of personal localStorage lists; shared lists resolve channels lazily and a flip requested before the pull lands is replayed when `iptv_list` arrives (`pendingFlip`). The guide's now/next columns update rows in place from the schedule cache (no re-render, preserving scroll); the EPG refresh interval runs only while the guide dialog is open. Removing a shared list (any occupant) broadcasts a new catalog and must never touch playback state.


## 5. Recipe: add a complete district

### A. Plan a readable place

Choose a distinct purpose and silhouette before generating details. Write a short internal description of:

- The place: e.g. a rooftop observatory, a flooded workshop, a market under broken awnings.
- Its main landmark and the action the player performs there.
- A clear route from entrance to landmark and both exits.
- Two or three supporting prop families, rather than random unrelated boxes.
- Lighting palette and one small animated detail.
- A field note and the visible result of restoration.

Lay out floor, obstacles, entrances, and landmark first. Then add architectural layers and decoration. A beautiful unreachable interaction is a failed feature.

### B. Add a stable definition

Add the definition to the shared manifest (`shared/placeDefinitions.js`), not to a renderer module. The full field reference, validation rules and the server projection step live in `docs/places.md`; the short form:

```js
{
  id: 'observatory',                 // Unique and stable: becomes save data
  name: 'The Listening Roof',
  district: 'ROOFTOP DISTRICT / 08', // HUD micro-label
  subtitle: 'ABOVE THE STATIC',
  color: '#596779',                  // Fog/background theme
  sun: '#d8d1b5',
  description: 'A quiet receiver above the city.',
  kind: 'environment',               // 'environment' | 'venue' | 'view'
  seed: <explicit constant>,         // never derived from array order
  bounds: { minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3 },
  spawn: [-9, 0],                    // x,z; verify both actors fit
  companionSpawn: [-8.2, 1],
  exits: [ /* declared gates; targets are validated */ ],
  minimapPath: 'M24 24H130V96H24Z',  // radar schematic
  shell: 'legacy-urban',             // or 'none' when the builder owns everything
  builderKey: 'observatory',         // resolved via src/places/registry.js
  atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' },
  capabilities: { seating: false, sharedMedia: false, conferencing: false },
  social: { featured: false, legacy: false },
  // objective/note tuples optional; a present tuple must be complete
}
```

Append after the legacy entries; never reorder, rename or reseed existing ones. Then regenerate the committed server projection: `node scripts/export-place-definitions.mjs` (`--check` catches drift). `objective`, `action`, `done`, `message`, `landmark`, `note`, `noteTitle`, `noteBody` are the legacy restoration tuple — optional for social places, complete-or-rejected when present.

### C. Implement geometry explicitly

Register the builder under the definition's `builderKey` (biome builders live in `DISTRICT_BUILDERS` in `src/districts.js`, which registers them into `src/places/registry.js`). An unknown builder key is a named error before any geometry is built — there is no silent fallback scenery anymore.

Use the district-local helpers (`box`, `block`, `glow`, `lamp`, `random`) provided by `src/places/worldFactory.js`. Add visible large props to `obstacles` using `block()`. Keep decorative ground litter non-blocking. Ensure local lights, transparent surfaces, interactables, and animation objects remain attached to the world group and out of the static instanced batch when they animate.

The world factory adds the field-note stand and landmark indicator from the definition, plus gate items from the declared exits. Do not duplicate them, or leave a generic indicator floating without a meaningful physical landmark beneath it. `docs/places.md` is the authoring reference; `AGENTS.md` §6/§7 still govern collision and rendering quality.

### D. Wire all integration points

A new definition is not sufficient. Check each of these:

- The builder produces distinct geometry for the ID and passes reachability/clearance tests.
- `minimapPath` in the definition draws an appropriate floor/route diagram; landmark/note markers correspond to actual world coordinates.
- Gate destinations are declared explicitly in `exits` (legacy west/east/market topology is frozen in `shared/placeDefinitions.js` and never recomputed).
- The Places selector picks the place up automatically: `social.featured` lists it among the featured cards, otherwise it appears under "Legacy areas"; occupancy appears only if the place is in the server projection.
- HUD labels, descriptions, and accessible names are accurate.
- Save normalization accepts the stable new ID and does not damage existing progress (`readExploration` filters unknown IDs).
- The server projection is regenerated (`node scripts/export-place-definitions.mjs --check`).
- Tests and README describe the new area and any new mechanics.

Seeds are explicit manifest values, so appending a place cannot shift existing scenery — but reordering or reseeding can. `LEGACY_DISTRICT_IDS` and the legacy gate topology are frozen; new places declare their own exits.

### E. Implement a real completion effect

Existing added districts use one `landmark` objective per area. `interact()` records the district ID in `saved.exploration.completed`, persists, and updates the HUD. The builder's `update(time, completed)` applies corresponding visual state.

Good completion effects: valve starts turning, nursery lights brighten and seedlings grow, signal pulses above the platform. A toast alone is weak feedback. Ensure the effect also appears immediately when building an already-completed district after a reload.

Make completion idempotent: pressing E repeatedly must not duplicate rewards or progress. If adding multiple objectives in one district, extend the save schema, normalization, HUD, and tests; do not overload the current single boolean-like completion ID with ambiguous meanings.

## 6. Collision, navigation, and camera gotchas

Current movement is flat, rectangle-based, and deliberately simple. There is no navmesh, ramp elevation, or general pathfinding. Jumping adds temporary vertical motion only: while airborne, `isWalkable()` and world bounds still gate every x/z step exactly as grounded, nothing can be cleared or stood on, and landing always restores grounded handling. Do not make jumps clear obstacles without implementing height-aware collision and reworking the reachability tests.

Exact current contracts:

```text
Walkable boundary: -11.3 < x < 11.3 and -9.5 < z < 10.3
Click-target clamp: x [-11, 11], z [-9, 10]
block(x,z,w,d): stores half-extents w/2 + 0.38, d/2 + 0.38
Interaction search: nearest eligible item strictly less than 2 world units away
New area gates: x = -10.7 / +10.7, z = 0
New area companion spawn: player x + 0.8, player z + 1
Minimap: cx = 24 + (x+12)/24*106; cy = 24 + (z+10)/21*72
```

The +0.38 collision expansion approximates actor clearance. Stored `w` and `d` are **half-extents with clearance**, not original full dimensions. Do not expand them twice.

Movement checks x and z separately, allowing sliding along obstacles. Click-to-walk heads directly toward a target and stops when blocked; it does not find a route around a crate. Kiln follows the player directly and can also get caught on obstacles. Keep routes broad and avoid mazes that require pathfinding unless implementing pathfinding as part of the task.

The canal uses collision rectangles to block water while preserving a bridge crossing. Keep the visual bridge and collision-free strip aligned. Do not remove water collision just to make a reachability test pass.

For each interactable, ensure at least one clear standing point within interaction range. Large machines need interaction anchors near an accessible edge, not deep inside their center. Do not enlarge the global interaction radius to compensate for poor placement.

Tall structures and roofs can hide the player or landmark from the isometric view. Use open fronts, low foreground walls, selective roof transparency, or an intentional occlusion solution. Inspect the actual screenshot; a mathematically correct layout can still be unreadable.

The world bounds, click clamp, camera framing, minimap projection, and tests are coupled. If making a larger map, update all of them together, preferably through shared level bounds. Do not enlarge only the floor mesh.

Adding stairs or visually elevated walkways does not give actors elevation support: the picking plane and movement assume y=0, and `move()` resets actor y for walking bob. Implement height-aware movement/picking before claiming a walkable multistory level.

## 7. Rendering quality and performance

### Match the established art direction

Build depth with layered geometry: wall courses and coping stones, roof ribs or tiles, pipe brackets, window divisions, lamp caps, bench supports, equipment vents, and small patches of foliage. Use controlled variation in stone color and placement. Keep procedural randomness deterministic so reloads do not rearrange the level.

Prioritize large forms first, then medium props, then small details. The landmark and walkable route should remain clear when the image is viewed small. A handful of meaningful repeated details is better than a large amount of unstructured visual noise.

Use physically shaded surfaces, subtle bloom for emissive accents, directional shadows, and fog to connect the scene. Preserve the orthographic/isometric identity. Do not compensate for weak composition with excessive bloom, saturated colors, or fog that conceals everything.

### Instance static geometry correctly

The original courtyard was initially too heavy to inspect reliably in browser automation. Static geometry was subsequently batched into `THREE.InstancedMesh`. Preserve that approach for repetitive paving, masonry, roof pieces, foliage, and props.

Current district batching selects opaque, non-emissive boxes directly under the group, copies their transforms/colors into an instanced mesh, then removes the original meshes from the group.

**Important failure mode:** if you animate one of those original box objects later, nothing visible moves because it has been removed. Keep animated objects out of the static batch explicitly, put them under an appropriate dynamic subgroup, or update instance matrices properly. Do not add meaningless emission merely to evade the batch filter. If refactoring batching, prefer explicit static/dynamic ownership.

The static batch uses a shared roughness/metalness. It preserves per-instance color, not every source material property. Exclude glass, water, emissive details, and other surfaces requiring distinct material behavior.

Call `updateMatrix()` before copying an object's matrix into an instance. When modifying instances after rendering begins, mark instance attributes as needing updates and maintain bounds as appropriate. Do not mutate a shared material to change only one object unless all users should change.

Avoid creating geometry, materials, textures, or lights every frame. Cache reusable materials/geometries. Use a modest number of local lights; emissive meshes do not need a point light each. Keep shadows concentrated on the main directional light unless there is a measured reason for more shadow-casting lights.

The current renderer uses capped pixel ratio, 2048 directional shadows, ACES tone mapping, and a bloom composer. Resizing must update camera projection, renderer, and composer together. Do not remove shadows/bloom or lower quality drastically just because browser tooling timed out; first inspect draw calls, allocation patterns, and actual rendering behavior.

Cached worlds intentionally retain GPU resources. Do not dispose shared resources on ordinary travel. If implementing unloading for many levels, define resource ownership and dispose only resources no longer used by another cached world or global actor.

## 8. Save compatibility

Storage key: `afterlight-save`. Current conceptual shape:

```js
{
  cells: [0, 1, 2],          // Collected courtyard cell IDs
  restored: true,           // Courtyard generator state
  exploration: {
    current: 'garden',
    visited: ['court', 'canal', 'garden'],
    completed: ['garden'],  // Completed non-courtyard district IDs
  },
}
```

Old saves may contain only `cells` and `restored`. `readExploration()` supplies defaults, filters unknown IDs, and deduplicates exploration arrays. The main save loader currently requires a cells array before accepting the loaded object. Do not assume changing `readExploration()` alone updates all top-level load behavior.

Keep district IDs stable. If renaming an ID, provide migration rather than silently deleting progress. Keep new fields additive where possible. Treat malformed JSON, invalid types, unavailable storage, and unknown IDs defensively.

Persistence can fail, e.g. restricted storage. The game should continue in session-only mode. Do not leave a fake “saved” claim after a failed write.

Never clear the user's save to make testing easier. Prefer an isolated test context/save fixture. If a real preview is used for gameplay verification, recognize that interactions save progress. Do not reset unrelated completed objectives. Test reset only in an explicitly disposable context.

## 9. HUD, layout, and accessibility

Use the existing visual language: translucent dark teal panels, muted borders, cream body text, small spaced monospace labels, restrained gold accents, and asymmetric corner rounding. DM Sans is the main UI font; Space Mono supports labels and keys, both with fallbacks.

Keep the HUD informative but out of the playable center. The title sits top-left, local map/objective top-right, companion bottom-left, interaction near the bottom, controls/actions along the footer. Place selection (the Places selector) and settings use native dialogs.

The HUD is contextual (deemphasize-legacy-farming). `src/ui/placeHudPolicy.js` classifies the active place from manifest metadata (`social.featured`, `kind: 'venue'`) plus room id — the Market Court, personal gardens (`garden:<owner>`) and the legacy biomes stay legacy; unknown metadata defaults to social — and `main.js` applies the policy only at context changes: `body[data-hud-context]` plus `data-hud-legacy` markers on `.player-stats-row`, `#hud-tool-hint`, `#tool-belt`, `#btn-inventory` and `#btn-market` drive the CSS, and the hidden sections also get `hidden` so they leave the tab order. Inventory/welcome messages re-assert visibility from the policy; they can never reveal a hidden panel. Entering a social place clears the held visual tool to hands and the personal garden restores it — presentation state only, never an inventory read or write. Settings' **Legacy gardener HUD** checkbox (preference key `afterlight-legacy-ui-v1`) flips every place back to the legacy presentation instantly, with no data changes; storage failures keep the choice session-local. Keep every HUD DOM id stable regardless of visibility: `marketModal` state consumers still write into them so cached balances are ready when a legacy context shows them.

At approximately 930px viewport width, the companion panel and centered interaction panel previously overlapped. A 901–1100px rule now moves the interaction to the right. Existing breakpoints also include 900px and 560px. Check interactions between these rules when adding buttons or enlarging panels; appending a broad rule can override a carefully tuned narrower one.

Check at least a desktop viewport, the actual in-app preview size, and a narrow viewport for HUD changes. Panels must not overlap each other, hide essential buttons, or make landmarks impossible to click. Dialogs need bounded height and scrolling on small screens.

Keep button accessible names, canvas description, keyboard focus styles, and dialog close behavior meaningful. Do not make a functional button with only a decorative symbol and no accessible name.

The transient toast is hidden on very narrow screens in current CSS. If introducing information essential to progression, provide a persistent objective or another accessible place to read it; do not rely exclusively on that toast.

Use player-facing copy, not implementation terminology. Say “Districts” or “Sound on,” not “scene manager,” “WebGL quality pipeline,” or “audio context initialized.”

## 10. Verification: a build is necessary, not sufficient

For changes to gameplay, districts, persistence, or rendering:

1. Run `npm test` and resolve relevant failures.
2. Run `npm run build` and resolve actual build errors.
3. Open the running app through the available browser tooling. Follow that tool's current instructions; do not assume old tab IDs or undocumented APIs still work.
4. Inspect the scene visually. DOM text cannot prove geometry, lighting, or occlusion is correct.
5. Exercise the changed behavior through real controls. Do not claim interaction success based only on code inspection.
6. Check browser errors. Separate external font/network issues from actual runtime failures.
7. Reload after changes if hot reload did not apply them. HMR may reset the player to the saved district entrance; that is not evidence movement failed.
8. Report the verification actually performed. If browser tooling is blocked, say which checks passed and what remains unverified.

After the implementation, Ripwire review is encouraged but optional: `ripwire . --situ` (and `--pr-context` for broad diffs) can point at symbols your change may have affected, and `--test-gate` can suggest tests — but the steps above are the actual gate. Ripwire never substitutes for running the commands itself.

Minimum useful gameplay smoke check for a new area:

- Enter it using the Places selector (T) and inspect title, map, objective, lighting, player, and Kiln.
- Walk a real route, including any bridge or tight passage.
- Reach its field note and read it.
- Reach its landmark, interact, and observe both visible world change and objective progress.
- Interact again and confirm no duplicate completion/reward.
- Travel away and return; completion and visual state remain correct.
- Reload; current district and completed objectives remain correct.
- Use a gateway with E; confirm destination and cleared movement state.
- Confirm the original courtyard still loads and existing collection/restoration behavior has not regressed when relevant code changed.
- Exercise pause/resume and camera controls when input or rendering was touched.

`tests/districts.test.js` currently does a 0.5-unit grid flood fill using duplicated collision rules, verifies player/companion spawn clearance, and checks for reachable points within 1.8 units of objectives/exits. It also checks save normalization, existence of instanced scenery, and finite positions after update calls.

These tests do **not** prove click-pathfinding works, Kiln follows every route, the camera shows the landmark, the HUD fits, shaders render correctly, or browser localStorage works. They cover the added districts, not a full executable courtyard simulation. Keep test claims accurate.

If changing collision rules, update tests with the same contract or extract a shared pure helper. Do not weaken reachability assertions to accept an inaccessible design. Add targeted tests for meaningful new state transitions or migration behavior; avoid redundant tests that just restate constants.

## 11. Known limitations: do not accidentally promise more

- Procedural, stylized art; not the original video's detailed production assets.
- Flat movement, direct click-to-walk, and direct companion following; no route planning or physics simulation.
- Entrance respawn on travel/reload; no exact-position persistence.
- Three added areas each currently have one restoration action and one field note.
- District order, gate routing, minimap shapes, world dimensions, and camera assumptions have hard-coded integration points.
- Only active world animation runs; cached hidden areas do not simulate a living city off-screen.
- Responsive click/tap play exists; there is no dedicated touch joystick.
- Fog/particles provide atmosphere; do not describe the current effect as a full volumetric mist or weather simulation.
- A local preview is not a production deployment. Existing `.vercel` files do not authorize a new publish operation or identify a verified public URL.

These are implementation facts, not prohibitions. Improve them when relevant to the user's request, with corresponding architecture and verification work.

## 12. Completion checklist

Before handing back a feature, ask yourself:

- Is this playable, with a discoverable control and understandable feedback?
- Does the new place have an identity beyond a recolor of an existing place?
- Can the player reach the content without walking through major props or getting trapped?
- Does Kiln remain visible and accompany travel?
- Do menu, map, HUD, scene, interaction state, and save data agree?
- Does completion visibly persist when returning or reloading?
- Are static details batched and dynamic objects still actually animated?
- Did I inspect the relevant visual result and test the changed behavior?
- Did I preserve old progress and avoid unrelated changes?
- Have I updated README and, if architecture changed, this guide?

Then provide a short user-facing response with the result and controls. Keep detailed engineering guidance here rather than overwhelming the player with implementation notes.

## Emote wheel

Hold V opens `src/ui/emoteWheel.js`: clockwise six-way selection, center dead zone, release to commit; Escape, blur, resize, and state changes cancel. The Emotes button opens click/touch selection; 1–6 and arrow keys select, Enter confirms. The capture-phase handler consumes wheel input before gameplay shortcuts. `shared/emotes.js` owns the allow-list and sector math. `src/render/avatars.js` poses a visual rig and shoulder pivots through the existing frame loop, leaving collision position and nickname tags untouched. Emotes are transient room broadcasts, validated and rate-limited on the server, played immediately locally, and ignored on self echo. Movement/jumping cancel poses; seated legs remain folded. No emote data is persisted.

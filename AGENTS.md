# Building on Afterlight

This file applies to the entire repository. Read it before changing the game. It is a practical guide to preserving the existing experience while extending it. The user's current instructions take precedence; do not treat this document as a reason to ask permission for routine, authorized implementation work.

## 1. What you are building

Afterlight is a small, playable, atmospheric isometric exploration game made with Three.js. The player is a rust/gold maintenance robot accompanied by Kiln, a smaller cream-colored robot. The setting is an abandoned industrial city that is still worth repairing. Exploration, companionship, little discoveries, and visible acts of restoration are the experience.

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

1. Read this file and the relevant source files. Inspect the actual current code; this document can become stale.
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
| `index.html` | Canvas, base HUD, companion panel, interaction card, settings dialog, initial loading overlay. |
| `src/style.css` | Full-window presentation, typography, translucent panels, responsive layouts, district selector styles. |
| `src/main.js` | Renderer, lighting, original courtyard geometry, actors, global state, input, collision, interaction dispatch, travel, HUD updates, audio, save/load, animation loop. |
| `src/cameraControl.js` | Pure camera-mode math: four-view cycle, per-view movement basis (view-relative in first person), pitch clamps, pointer drag/click classification. No renderer dependencies; covered by `tests/camera.test.js`. |
| `src/jump.js` | Pure jump/bunny-hop math: vertical arc, hold-to-rehop chains, momentum scalar with per-hop gain and cap, reset rules. No renderer or network dependencies; covered by `tests/jump.test.js`. |
| `src/districts.js` | District definitions, exploration-save normalization, procedural builders for the three added districts. |
| `src/world/theaterWorld.js` | The Orpheum builder: auditorium, seats (obstacles + `seat` items), screen mesh + world-space `screenQuad`, marquee/projector restoration visuals. Registered in `DISTRICT_BUILDERS`. |
| `src/ui/theaterScreen.js` | Theater screen UI: DOM overlay homography-anchored to the in-world screen (sized to the projected quad with the screen's world aspect so media stays crisp and unsquashed), playback engines (video/HLS/YouTube/Vimeo + torrent via the file engine), shared-clock sync, booth/guide/torrent-picker dialogs (country → category IPTV navigation), shared IPTV library + personal localStorage lists (HTTP uploads, lazy `iptv_list` pulls, now/next guide columns), torrent resolve→pick flow, cinema view (`body.theater-watching`). |
| `server/theater.js`, `shared/theaterModel.js` | Theater room state: thin server manager + pure reducer/URL-classifier (incl. magnet links)/M3U parser (captures `tvg-id` for guide matching)/timeline math (all rules live in the shared model). |
| `server/iptv.js`, `shared/iptvModel.js`, `shared/xmltv.js` | Shared Orpheum channel library + program guide: thin manager owning `data/iptv.json` / `data/epg.json` (deliberately outside `game-state.json`), pure limits/library actions/normalization/M3U serializer, and a dependency-free tolerant XMLTV parser + tvg-id/name matcher + now-next lookup. |
| `server/torrents.js`, `shared/torrentModel.js` | Torrent engine: thin server manager over `webtorrent` (resolve, Range streaming, cache cap/reap) + pure magnet validation, picker ordering, pick/status sanitation, error text. |
| `tests/districts.test.js` | Node tests for exploration-save normalization and approximate navigational reachability in the new districts. |
| `README.md` | Running the project and playing the game; update when controls or player-facing features change. |
| `package.json`, `package-lock.json` | ES modules, dependencies, scripts, reproducible dependency versions. |
| `dist/` | Generated Vite output. Edit source, then build; do not implement features by editing generated bundles. |

Stack: vanilla JavaScript ES modules, Three.js, Vite, DOM/CSS HUD, Web Audio. There is no React runtime, physics engine, backend, or asset pipeline required for the current game. Do not add one without a concrete benefit to the requested feature.

Commands:

```sh
npm install       # When dependencies are missing or intentionally changed
npm run dev      # Normally http://localhost:5173
npm test         # Node test runner
npm run build    # Production output in dist/
npm run preview  # Serve the production build for inspection
```

Use the existing local server if it is running. Do not launch a second server and unknowingly test a stale port. Vite can choose another port when its preferred port is occupied; read its output. The current dev script binds to `0.0.0.0`; do not confuse a network-accessible development process with a deployment.

If the environment blocks package downloads or binding a server socket, use the available approval mechanism for the specific command. Do not disable sandbox/security controls. An earlier session needed authorized network access for npm and authorization to bind the development server. These were environment restrictions, not application defects.

The build currently emits a non-fatal warning about a JavaScript chunk exceeding 500 kB. It is not a failed build. Do not silence it by arbitrarily raising thresholds. Address actual loading/performance needs when in scope.

The CSS requests Google Fonts with local font fallbacks. Game geometry and synthesized sound do not depend on external game assets. Do not claim the font styling is entirely offline without changing this dependency.

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

`enterDistrict()` currently:

1. Validates the requested ID and finds its definition.
2. Builds and caches an unseen district, including its gates.
3. Shows only the destination group.
4. Replaces the active obstacles and interaction arrays.
5. Moves the player and Kiln to safe entrance positions.
6. Clears the old movement target, nearest item, click marker, and held keys.
7. Updates fog, background, sunlight, title, location labels, objective label, minimap, and canvas accessible name.
8. Saves the current/visited district and updates its objective display.
9. Announces arrival, or gives a suitable welcome-back message after reload.

Preserve these responsibilities. Forgetting to clear an old `nearest` item can make E affect a previous area's object. Forgetting to switch collision arrays creates invisible obstacles or walk-through scenery. Forgetting local lights causes the previous district to illuminate the next one.

Travel currently resets position to an entrance, not the precise point of departure. Reload restores the last district at its entrance. Exact position saving is not implemented.

### Input and frame loop

- WASD and arrow keys move relative to the selected camera angle (in first person: relative to the view yaw).
- Shift runs. E interacts. C cycles four views (three isometric angles, then first person). M opens Districts.
- Space jumps. Holding Space bunny hops: each landing with Space held relaunches on the same frame, preserving horizontal momentum plus a small gain, capped at ~1.5× run speed. Jump/bhop rules live in `src/jump.js` (pure, covered by `tests/jump.test.js`); `main.js` feeds it grounded/input facts each frame and applies the returned y and speed scalar. Collision is unchanged: obstacles and bounds block mid-air.
- Pressing on the ground starts a gesture: released below the drag threshold it walks exactly like the old click; a drag instead turns the view (first person only). Gesture rules live in `src/cameraControl.js`.
- Mouse wheel changes orthographic zoom within bounds (no effect in first person).
- Escape opens settings; in cinema view it returns to the game first. Native dialog cancellation closes dialogs through explicit handlers.
- Settings and Districts pause gameplay and clear held movement keys.
- Losing window focus clears held keys.
- The frame loop caps delta time and animates legs, companion movement, collectibles, particles, active district visuals, and the camera.

### Jump state hygiene

Jump momentum is session-local and resets at every path that clears held keys: `standUp()`, `sitOn()`, `setRoom()`, pause toggles (settings/districts), chat-input focus, and window blur, all through `clearJumpMomentum()` in `main.js`. Landing without Space held resets inside `stepJump()`. While airborne the jump state owns the avatar's y (tucked legs); the grounded walk bob is untouched. Presence carries an additive `airborne` flag (relayed by `server/world.js` like `sitting`, never persisted); `RemotePlayersManager` animates a standardized hop parabola from the flag and treats missing flags as grounded. Kiln stays ground-bound.

### Active camera and first person

`main.js` holds two cameras — the original orthographic one for the three isometric modes and a perspective one for first person — and routes every consumer through a single `activeCamera` reference: the composer's `RenderPass.camera`, the click raycast, `resize()`, the follow logic, and the theater `screenQuad` projection. When touching any of those, use `activeCamera`, not a specific camera, or the view modes drift apart. First person is mode 3 in the `cameraMode` cycle: the frame loop places the perspective camera at the player's eye height (lowered while seated), `player.visible` is false for the owner's avatar only, movement rotates through `moveBasis()`, and entering the mode seeds the yaw from the avatar's facing (camera and avatar facing conventions differ by π). Camera mode, yaw, and pitch are session-local presentation state: never saved, never synced.

Keep input methods equivalent where possible: interaction works through E and the on-screen button; travel works through gates and the Districts selector. Do not break keyboard play after the user clicks a button. Do not hijack typing in inputs/selects. Keep keyboard focus indicators visible.

Do not introduce another requestAnimationFrame loop for each object or district. Register district animation in `update()` and run it from the existing active-world loop. Use elapsed time or delta time, not assumptions about 60 FPS.

### The theater (The Orpheum): screen overlay, shared playback, sitting

The theater is a standard district, plus three mechanisms that exist nowhere else:

- **Screen overlay, not a texture.** The screen's content is a DOM element (`#theater-screen`) positioned every frame by projecting the builder's `screenQuad` (four world-space corners exposed on the built district) and applying a CSS `matrix3d` homography. YouTube/Vimeo only exist as cross-origin iframes, which can never be WebGL textures; direct files/HLS play in a `<video>`, so one DOM path covers every source. The overlay is hidden outside the theater room and skipped when the quad projects off-screen. Do not batch the screen panel or attach content meshes: the overlay floats above the canvas, and the 3D screen is just a bezel.
- **Server-owned playback.** All rules live in `shared/theaterModel.js` (pure reducer: URL classification with `http(s)`-only enforcement, queue caps, seek clamps, M3U parsing). The server applies actions, persists `{now, queue}` into `data/game-state.json`, and broadcasts full `theater_state` snapshots to the room on every change and on room join. Clients render snapshots, derive position from the shared timeline (`positionSec` + elapsed since `updatedAt`, skew-corrected via `serverNow`), correct drift locally only, and report `ended`/`failed` once per item id. Anyone in the room may control; there is no host.
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

Add a definition to `districts` in `src/districts.js` with the fields the current builder/UI expects:

```js
{
  id: 'observatory',                 // Unique and stable: becomes save data
  name: 'The Listening Roof',
  district: 'ROOFTOP DISTRICT / 08',
  subtitle: 'ABOVE THE STATIC',
  color: '#596779',                  // Fog/background theme
  sun: '#d8d1b5',
  description: 'A quiet receiver above the city.',
  objective: 'Tune the receiver',
  action: 'Align the receiver',
  done: 'Receiver listening',
  message: 'A distant voice returns through the static.',
  landmark: [6, -5],                 // x,z, not x,y
  note: [-6, 5],
  noteTitle: 'A patient listener',
  noteBody: '“Give the silence a little time.”',
  spawn: [-9, 0],                    // x,z; verify both actors fit
}
```

This example is a template, not an existing level or a complete implementation.

### C. Implement geometry explicitly

Add an explicit builder branch for the new ID. **Current gotcha:** `buildDistrict()` uses `if canal / else if garden / else station`. Merely appending a definition will silently build station scenery for the new ID. Replace that fallback with an explicit station branch and add your own branch; consider throwing for unknown IDs to prevent silent mistakes.

Use the district-local helpers. Add visible large props to `obstacles` using `block()`. Keep decorative ground litter non-blocking. Ensure local lights, transparent surfaces, interactables, and animation objects remain attached to the world group.

The common builder already adds a field-note stand and a landmark indicator based on the definition. Do not accidentally duplicate these, or leave a generic indicator floating without a meaningful physical landmark beneath it.

### D. Wire all integration points

A new definition is not sufficient. Check each of these:

- `buildDistrict()` has distinct geometry for the ID.
- `main.js`'s `mapPaths` includes the ID, with an appropriate floor/route diagram.
- Landmark/note map markers correspond to actual world coordinates.
- Gate destinations form the intended route. New districts currently get west = previous array element and east = next element, wrapping to court. The courtyard's east gate is explicitly hard-coded to `canal`; it does not automatically follow arbitrary reorderings.
- `districts[0]` remains the courtyard unless you deliberately update every index-based assumption.
- The district menu creates a usable entry and reports visited/restored state correctly.
- HUD labels, descriptions, and accessible names are accurate.
- Save normalization accepts the stable new ID and does not damage existing progress.
- Tests and README describe the new area and any new mechanics.

District order also currently affects procedural seeds and displayed numeric map codes. Reordering can change existing scenery even when IDs remain unchanged. Prefer appending or use explicit per-district seeds/codes if reorganizing the route.

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

Keep the HUD informative but out of the playable center. The title sits top-left, local map/objective top-right, companion bottom-left, interaction near the bottom, controls/actions along the footer. District selection and settings use native dialogs.

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

Minimum useful gameplay smoke check for a new area:

- Enter it using Districts and inspect title, map, objective, lighting, player, and Kiln.
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

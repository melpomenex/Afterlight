# Adding a place to Afterlight

This is the authoring guide for the social place framework (OpenSpec change
`add-social-place-framework`). It documents the modules as they are
implemented today: a place is one immutable definition plus a builder
function, with optional seats, notes, landmarks, a server projection and —
rarely — a specialized controller. The Orpheum (`theater`) is the default
spawn and the reference specialized venue; every legacy district is a normal
place.

The whole pipeline:

1. **Define** the place in `shared/placeDefinitions.js` (plain data).
2. **Build** it: register a builder function in `src/districts.js`
   (`DISTRICT_BUILDERS` → `src/places/registry.js`).
3. **Wire spawns, bounds, gates, seats, notes** — declared in the definition
   or authored inside the builder as items.
4. **Project** the definition to the Phoenix side with
   `node scripts/export-place-definitions.mjs`.
5. **Test** the definition and the builder's geometry.
6. *(Optional)* a **specialized controller** for venue behavior.

Nothing else is required: the travel runtime
(`src/places/runtime.js`), the Places selector (`src/ui/placeSelector.js`),
the seat system (`src/social/seating.js`), the interaction registry
(`src/social/interactions.js`) and the room runtime on the server all pick
the place up from the manifest.

## 1. Define the place — `shared/placeDefinitions.js`

`shared/placeDefinitions.js` is the single editable manifest. It must stay
free of Three.js and DOM imports: Node tests, the projection script and the
browser all read this exact module. All exported data is deep-frozen.

```js
// Append after the legacy entries; never reorder or rename existing ones.
{
  id: 'desert-camp',                 // kebab-case, stable forever (save data)
  name: 'Desert Camp',
  district: 'DUNE DISTRICT / 21',    // HUD micro-label
  subtitle: 'FIRE AND STATIC',
  color: '#5c4a3a',                  // fog color
  sun: '#f2c48d',                    // directional light color
  description: 'A fire still burning at the edge of the city.',
  kind: 'environment',               // 'environment' | 'venue' | 'view'
  seed: 17 * 37,                     // explicit deterministic seed — never derived
  bounds: { minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3 },
  spawn: [-9, 0],                    // player entrance, strictly inside bounds
  companionSpawn: [-8.2, 1],         // Kiln's entrance
  exits: [                           // declared gates; unknown targets fail validation
    { id: 'west', kind: 'district', position: [-10.7, 0], target: 'theater' },
    { id: 'east', kind: 'district', position: [10.7, 0], target: 'court' },
    { id: 'market', kind: 'market', position: [0, 8.8], target: 'market' },
  ],
  minimapPath: 'M24 24H130V96H24Z',  // HUD radar schematic (SVG path)
  shell: 'none',                     // 'legacy-urban' | 'none' (see §3)
  builderKey: 'desertCamp',          // resolves through src/places/registry.js
  atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' },
  capabilities: { seating: true, sharedMedia: false, conferencing: false },
  social: { featured: true, legacy: false },
  // objective / note are OPTIONAL. A *present* tuple must be complete:
  // objective needs action + done + message + landmark; note needs
  // noteTitle + noteBody. Social places usually declare neither.
}
```

Field rules enforced by `validatePlaceDefinition()` (run automatically by the
world factory before any geometry, and by `validatePlaceDefinitions()` for
whole lists — duplicate ids are reported with the offending id):

- `id` kebab-case and unique; `name` non-empty; `kind` one of `PLACE_KINDS`.
- `seed` a finite, non-negative **explicit** number. Legacy entries use
  `oldIndex * 37` (court is `0`); new places append their own constant.
  Seeds drive procedural scenery — changing one changes the place.
- `bounds` finite and non-inverted; `spawn`/`companionSpawn` finite
  `[x, z]` pairs strictly inside bounds.
- `exits[].target` must be a known place id or `market` (when `knownIds` is
  passed); `position` is a finite `[x, z]` pair at the wall line.
- `minimapPath` non-empty; `shell` one of `PLACE_SHELLS`; `builderKey`
  non-empty (the registry resolves it at build time — an unknown key is a
  named error, never fallback scenery).
- `atmosphere` present; `preset` `null` or a known preset key from `shared/atmospherePresets.js`
  (`PLACE_WEATHER_MODES` and `PLACE_TIME_MODES` are `fixed` or `scheduled`). When `preset` is set,
  the room receives authoritative semantic `atmosphere_state` snapshots owned by the room's
  lease holder, and the client's `AtmosphereController` binds scene fog, sky, lighting,
  precipitation, and wet surfaces. This place atmosphere is strictly decoupled from legacy
  agricultural weather (`weather_update`), which continues to drive crop moisture in garden rooms.
  Places with `preset: null` (legacy districts, theater) keep their baseline presentation.
- `environment` returned by the place builder can declare up to 16 authored shelter `zones`
  (priority-ordered cover with roofY clipping, feathering, and acoustic properties) plus emitter
  anchors for puddles and roof-edge runoff.
- `capabilities`: all three of `seating` / `sharedMedia` / `conferencing`
  declared as booleans (`PLACE_CAPABILITIES`).
- `social.featured` / `social.legacy` booleans. **Featured** places are the
  accepted destinations the Places selector lists first; **legacy** places
  are the original districts (all seventeen legacy entries are
  `legacy: true`, and the selector still retains them in "Legacy areas").
  The same metadata classifies the HUD: featured places and
  `kind: 'venue'` present the social HUD, everything else keeps the legacy
  gardener HUD — see §9.
- Restoration metadata is opt-in for social places, but partial tuples are
  rejected: `action`/`done`/`message`/`landmark` only ever travel with an
  `objective`, and `noteTitle`/`noteBody` only with a `note`.

Hard rules for the module itself:

- `LEGACY_DISTRICT_IDS` and the legacy west/east/market gate topology are
  frozen in `legacyExits()`. **Append** new definitions at the end of
  `PLACE_DEFINITIONS` (today built as `LEGACY_DISPLAY.map(defineLegacyPlace)`
  — add the new entry after that mapping, not inside `LEGACY_DISPLAY`, whose
  wrapper pins `legacy: true` and the frozen legacy exits). Never reorder,
  rename or reseed an existing entry, and never derive gates from array
  order again.
- `PLACE_DEFINITIONS` is capped at 64 entries (the projection's limit).
- Personal gardens (`garden:<owner>`) and `market` are **not** manifest
  entries: they keep their own adapters in `src/places/travelState.js`
  (`resolveRoomRequest`) and are added to the Places selector by
  `main.js`'s destination provider, never by the manifest.
- `PLACE_VIEW_FIXTURE` shows the smallest legal definition (tiny bounds, no
  gates, no shell): the schema does not force a district-sized level. It is
  test-only and never projected to the server.

## 2. Register a builder — `src/districts.js` + `src/places/registry.js`

Builder *references* live on the renderer side, never in the manifest. The
legacy table in `src/districts.js` is the single place biome builders are
added:

```js
const DISTRICT_BUILDERS = {
  // ...
  desertCamp: buildDesertCamp,                       // your function
};
for (const [key, build] of Object.entries(DISTRICT_BUILDERS)) {
  registerPlaceBuilder(key, build);                  // src/places/registry.js
}
```

`registerPlaceBuilder(key, build)` throws on duplicate keys or non-functions;
`requirePlaceBuilder(def)` (used by the world factory) throws
`Place "<id>" declares unknown builder key: <key>` before any geometry is
built. Inspect the registry with `hasPlaceBuilder` / `getPlaceBuilder` /
`placeBuilderKeys`.

Your builder receives one context from the world factory and must author its
scenery through it:

```js
function buildDesertCamp(ctx) {
  const { group, obstacles, items, animated, geometry, colors,
          material, box, block, glow, lamp, random, def, completed,
          environment } = ctx;
  // box(x, y, z, w, h, d, color)  — visible mesh (batched when static)
  // block(x, z, w, d)             — collision rectangle (adds 0.38 clearance)
  // glow(...) / lamp(x, z, color) — emissive accents / a street lamp + light
  // random()                      — deterministic PRNG seeded by def.seed
  // environment                   — { zones, materialFamilies, emitterAnchors }
}
```

Builder rules (see `AGENTS.md` §6/§7 for the underlying contracts):

- `block(x, z, w, d)` stores **half-extents plus 0.38 clearance**; never add
  the clearance twice. Every interactable needs a clear standing spot within
  the 2-unit interaction radius.
- Tall scenic forms inside the walkable area must be solid: the first-person
  camera renders at `near = 0.1` and is only kept out of geometry by
  collision, so every prop reaching the standing eye band (walls, piers,
  drapery, counters, wall sconces, gate arches) needs a matching `block()`.
  Author those footprints as data beside the scenery — the Orpheum keeps
  `THEATER_FLOOR_PADS` (footprint overlap audit) and `THEATER_SOLID_VOLUMES`
  (obstacle coverage plus 0.38 clearance tests) in
  `src/world/theaterWorld.js`, and takes its gate-arch volumes from
  `gateVisualBoxesFor(def)` in `src/places/worldFactory.js` so the rendered
  slab and its collision share one source. Low litter and floor coverings
  stay non-blocking (`tests/theater-scenery.test.js` is the exemplar gate).
- Animated meshes must stay out of the static instanced batch: the factory
  batches opaque, non-emissive direct box children, so put dynamic objects in
  a subgroup or register an `animated.push((time, done) => …)` callback.
- Deterministic everything: use `random()`, never `Math.random()` — reloads
  must not rearrange the place.
- Attach local lights and scenery to `ctx.group`, never to the shared scene.
- If the place owns a screen-like anchored surface, set `ctx.screenQuad` to
  four world-space corners — that is the only hook the Theater's DOM overlay
  projection consumes (`src/ui/theaterScreen.js`).
- Return nothing; mutate `ctx`. The factory owns the return contract.

## 3. Shells, gates, notes, landmarks — `src/places/worldFactory.js`

`buildPlaceWorld(def, { completed })` runs the shared pipeline: validate →
resolve builder → build shell → run builder → place note/landmark items →
gather nodes → static instanced batching → return
`{ group, obstacles, items, update(time, done), setNodeStates, screenQuad,
environment, ownedResources }`. The returned group stays hidden and
unparented until a travel commit shows it; on a builder throw the factory
disposes exactly the resources it tracked (`ownedResources`) and rethrows.

- `shell: 'legacy-urban'` reproduces the historical urban construction
  (floor, paving, perimeter walls, skyline, two lamps) and consumes its share
  of the seed. `shell: 'none'` skips all of it: the builder owns the complete
  environment.
- Gates are not authored in the builder. `gateItemsFor(def)` turns the
  definition's `exits` into `district_gate` / `market_gate` items with the
  legacy wording; `main.js` appends them plus the physical arches.
- A declared `note` becomes a `field-note` item and stand; a declared
  `landmark` becomes the restoration indicator + `landmark` item. Their
  *visible world result* on completion is the builder's `update(time, done)`
  job (the factory handles the signal/ring recolor for declared landmarks).
- `update(time, done)` receives a strict boolean `done` for districts
  (`worldUpdateInput` in `src/places/travelState.js` keeps garden bed
  snapshots from ever masquerading as a completion flag).

## 4. Seats and interactions — `src/social/`

Seats are ordinary items authored by the builder:

```js
items.push({
  type: 'seat', id: 'fire-1', x: 2, z: 3,
  sit: { x: 2, y: 0, z: 3, rotY: 0 },   // world-space pose; y stays 0
  dismount: [{ x: 2, z: 4.2 }, { x: 3.4, z: 3 }], // 1–4 escape candidates
  groupId: 'fire', acousticZoneId: null, animationProfile: 'folded',
  title: 'Warm up', sub: 'Sit by the fire',
});
```

`normalizeSeat()` validates the shape (readable authoring errors). A seat
**without** `sit` is a legacy Theater seat and normalizes to the exact
historical offsets (`LEGACY_SEAT_POSE`: sit z −0.08, rotY π, stand z −0.8) —
only the theater may rely on that. `chooseDismount()` takes the first
authored point that is currently walkable and falls back to the place's
verified safe spawn, so a player can never be trapped. Sitting never opens
cinema view; only the active Theater adapter reacts to
`onSeatChanged` (§6).

The interaction registry (`createInteractionRegistry` /
`registerCoreInteractions` in `src/social/interactions.js`) owns the
framework item types `district_gate`, `market_gate`, `garden_gate`, `seat`,
`field-note` and `theater_screen`. Unknown item types return
`{ handled: false }` and main.js's legacy dispatch runs as before. Do not
extend it into a plugin system.

## 5. Project the definition to the server (required)

Phoenix cannot import ES modules, so the manifest is projected into a
committed, bounded JSON subset that `Afterlight.World.PlaceDefinitions`
validates and loads at boot:

```sh
node scripts/export-place-definitions.mjs           # regenerate
node scripts/export-place-definitions.mjs --check   # fail on drift (run in CI and after every manifest edit)
```

This rewrites `server_elixir/priv/place_definitions.json`
(`schemaVersion`, per place: `id`, `public: true`, `kind`, `bounds`,
`atmosphere`) in canonical key order. The projection is a build artifact —
**hand-editing it is caught by `--check`**; the manifest stays the only
editable source. It is capped at 64 entries, never contains builder keys,
prose, objectives or personal gardens, and only allow-listed ids receive
directory/atmosphere features on the wire. Until you run the export, the
server does not know the place exists.

## 6. Optional: a specialized controller

Most places need nothing. A venue with its own media/UI engine (today only
the Orpheum, via `src/places/theaterAdapter.js` around the `TheaterScreenUI`
singleton) registers a controller object in `src/places/registry.js`:

```js
registerPlaceController('desert-camp', {
  activate({ roomId, world, generation, def }) {},  // idempotent
  deactivate() {},                                   // idempotent, stops audio/timers ≤200ms
  onSeatChanged(detail) {},                          // optional
  // dispose() for owned resources when a place is evicted (not yet exercised)
});
```

The place runtime calls `activate` on commit with the current generation and
`deactivate` on leaving; stale generations are discarded before activation,
only the active controller ever receives updates, and a throwing controller
never blocks travel. The theater adapter is the reference implementation:
it only drives the existing UI's public lifecycle methods
(`setRoomActive`, `setWatchMode`, `setSeated`, `updateScreenQuad`), closes
its owned dialogs through their own `close()`, and never rebuilds the UI or
touches personal caches.

## 7. The Places selector and the directory

`src/ui/placeSelector.js` builds the T/Travel modal from the manifest:
definitions with `social.featured` are listed first, everything else (plus
`market` and the personal garden, provided by main.js) lands in the
collapsible "Legacy areas" group with the existing visited/restored badges.
Occupancy comes from the bounded read-only protocol (task 3.3):

- client → server: `place_directory_get { requestId }`
  (`MSG_TYPES.PLACE_DIRECTORY_GET`), one in flight, ≥5 s between requests;
- server → client: `place_directory { requestId, serverNow, entries:
  [{ roomId, occupancy, observedAt, atmosphereLabel? }] }`
  (`MSG_TYPES.PLACE_DIRECTORY`), ≤64 entries / 16 KiB / 500 ms deadline;
- `occupancy` counts unique identities (requester included); `0` only for a
  known public room with no live process; `null` = unknown/unreachable —
  the selector renders `—`, never a fabricated count;
- the selector polls every 10 s while open, treats data older than 30 s as
  unknown, guards replies with the request id, renders all dynamic strings
  as text, and stops polling on close/disconnect.

If the new place should count its visitors, it must be in the projection
(§5) — unprojected rooms simply never appear in `entries` and show unknown.

## 8. Tests

- **Definition:** add cases to `tests/place-definitions.test.js` contracts
  (validation messages, bounds, spawns, objective tuples). Appending a valid
  entry must not change any legacy seed or gate — `tests/place-worlds.test.js`
  proves that with the 17-edge golden topology; extend it if your place adds
  gates.
- **Builder:** prove reachability and clearance the way
  `tests/districts.test.js` does (flood fill over duplicated collision
  rules, spawn clearance, objective/exit reachability). Metadata validation
  cannot prove a route is walkable — builder tests must.
- **Seats:** explicit poses and blocked-dismount fallbacks follow
  `tests/seating.test.js`.
- **Selector/runtime behavior:** `tests/place-selector.test.js` and
  `tests/place-travel.test.js` drive the production modules with injected
  DOM/timers/seams — extend them there instead of adding new stubs.

Then run the standard gate:

```sh
node --test tests/place-definitions.test.js tests/place-worlds.test.js tests/districts.test.js
npm test
npm run build
node scripts/export-place-definitions.mjs --check
```

Finally, exercise the place in the browser per `AGENTS.md` §10: travel in
through the Places selector and through a gate, walk a real route, sit, use
every interaction, reload, and check the HUD/minimap/labels at desktop and
narrow viewports.

## 9. Legacy fields, HUD context, and non-destructive migration

**The legacy restoration tuple is optional, not obsolete.** `objective`
(with `action`/`done`/`message`/`landmark`) and `note` (with
`noteTitle`/`noteBody`) are the original restoration/lore fields. Social
places usually declare neither — a new place never needs an objective,
resource, reward or unlock — but a present tuple must be complete, and the
twelve legacy districts that carry one keep their original contracts intact
(`rooftops` keeps its optional note and anemometer completion, for example).
Completion badges surface as legacy status, never as a compulsory social
objective.

**The flags decide the HUD, not a hardcoded list.** The contextual HUD
policy (`src/ui/placeHudPolicy.js`, covered by
`tests/place-hud-policy.test.js`) classifies each place from this manifest
metadata: `social.featured === true` or `kind: 'venue'` presents the social
HUD (no tool belt, coin/XP pills, Satchel/Market footer buttons or mill
panel; the held tool clears to hands and is restored on re-entering the
personal garden). Everything else — the Market Court, personal gardens
(`garden:<owner>`, by room id) and the legacy biomes — keeps the full
gardener HUD. Unknown or missing metadata falls back to the safe social
default. Flipping a place's `social.featured` flag changes its presentation
with no code change; I/M remain reachable everywhere as labeled optional
legacy dialogs.

**Never destroy to demote.** Presentation work must not delete, reorder,
rename or reseed manifest entries (ids are save data), must not remove the
legacy gate topology, and must not touch the original snapshots
(`data/game-state.json`, `data/iptv.json`, `data/epg.json` — immutable
forensics; only the regenerable torrent payload cache may be cleared). The
gardens/economy migration to Ash (P6,
`openspec/changes/add-ash-gardens-economy-restoration`) continues as
compatibility/correctness work owned by that change: its import, concurrency
and cutover tasks remain open regardless of how the HUD presents farming,
and no place-authoring or presentation task may claim the migration
complete or execute any part of it. The current Node ↔ Phoenix authority
map lives in `docs/architecture/elixir/ownership.md`.

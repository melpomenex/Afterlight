# Arcade cabinets — the canonical upright system

Every upright arcade machine in Afterlight is the **same GLB model**, differentiated
entirely by data: artwork, LED trim, control plastics, screen content. Adding a game
cabinet is a content task — no Blender, no new model, no new component.

```text
ONE CABINET MODEL  +  PER-GAME SKIN  +  PER-GAME SCREEN  +  PER-GAME LED  =  MACHINE
```

## Where things live

| Path | Responsibility |
| --- | --- |
| `public/arcade/cabinet/afterlight_arcade_cabinet.glb` | The hero cabinet model (loaded once per session, ~8.5 MB). Blender-exported; root node `ARC_Cabinet_ROOT`. |
| `public/arcade/games/<game-id>/` | Optional author artwork, dropped in later without code changes (see *Artwork files*). |
| `src/arcade/cabinet.js` | Canonical factory: template load/cache, per-cabinet instantiation, material cloning, skin/screen/LED/control application, interaction markers, focused camera, dispose. |
| `src/arcade/skins.js` | Pure skin normalization + validation + screen aspect-fit math (node-testable). |
| `src/arcade/artwork.js` | Procedural artwork painter per motif; used until real files exist. |
| `shared/placeDefinitions.js` | Each activity definition's `cabinet` block (single editable source). |
| `src/activities/snowboard.js` + `src/activities/snowboard/` | Summit Run: the lightweight summary/attract module plus the lazy race controller/scene (mountain code loads only on entry — see `docs/summit-run.md`). |
| `tests/arcade-cabinet.test.js` | Skin, layout, isolation, and disposal contracts. |

## Model contract (verified against the GLB)

Nodes are resolved **by name**, never traversal order. Blender re-exports are safe as
long as names survive; missing names log once in dev (`[ArcadeCabinet] Missing …`).

Skin targets (materials):

| Material | Surface | World size (w×h) | Artwork canvas |
| --- | --- | --- | --- |
| `MAT_Skin_Left` / `MAT_Skin_Right` | side panels | 0.825 × 1.730 | 512×1024 |
| `MAT_Skin_Front` | front panel | 0.700 × 0.660 | 768×720 |
| `MAT_Skin_ControlPanel` | control deck | 0.710 × 0.335 | 1024×480 |
| `MAT_Skin_Marquee` | backlit marquee | 0.700 × 0.272 | 1024×400 |
| `MAT_ScreenContent` | CRT display | 0.520 × 0.360 (13:9) | — (live canvas, see below) |
| `MAT_LED_Emissive`, `MAT_CoinSlot_Emissive` | trim LEDs, coin slots | — | — (emissive color) |
| `MAT_Plastic_Blue`, `MAT_Plastic_Red` | P1 / P2 joystick balls + buttons | — | — (color) |

Shared and never mutated per cabinet: `MAT_Cabinet_Black`, `MAT_Metal_Black`,
`MAT_Plastic_Black`, `MAT_Metal_Brushed`, `MAT_Glass`, `MAT_Speaker`,
`MAT_Plastic_Cream`.

Interaction / emitter markers (empty nodes): `INT_PlayerStand`, `INT_PlayerLookTarget`,
`INT_ScreenCenter`, `INT_ControlPanel`, `INT_AudioSource`, `INT_P1`, `INT_P2`.

Screen layering is preserved: `Screen_Display` carries content, `Screen_Glass` stays a
physical transparent layer above it, `Screen_Bezel` frames it. Never put content on the
glass.

The model ships at natural human scale (~0.78 m deep, 0.74 m wide, 1.73 m tall) with
its front facing +z. The factory verifies the height and rescales only if a re-export
drifts.

## Adding a game cabinet (the whole workflow)

1. **Define the activity** in `shared/placeDefinitions.js` (there must be a matching
   `ACTIVITY_TYPES` entry and a registered module in `src/activities/registry.js`).
2. **Give it a `cabinet` block** (all fields optional — defaults render a neutral
   Afterlight machine):

```js
cabinet: Object.freeze({
  model: 'upright',                       // canonical GLB (future: 'cockpit', …)
  skin: Object.freeze({
    title: 'METEOR COMMAND',              // marquee/side art text (≤ 24 chars)
    tagline: 'INSERT COIN',               // small control-panel line
    motif: 'signal',                      // painter preset: 'pong' | 'rain' |
                                          // 'signal' | 'spore' | 'kart' | 'summit' |
                                          // 'afterlight'
    palette: Object.freeze({
      base: '#14102a',                    // background
      ink: '#e9e6f7',                     // primary art color
      accent: '#7c5cd6',                  // secondary / frame
      glow: '#a78bfa',                    // emissive accent
    }),
    files: { marquee: 'marquee.webp' },   // optional real artwork, wins over
  }),                                     // the procedural painter per channel
  led: Object.freeze({ color: '#a78bfa', intensity: 1.8 }),
  controls: Object.freeze({ player1: '#a78bfa', player2: '#31d2c8' }),
  screen: Object.freeze({ type: 'canvas' }),
}),
```

3. **Place it**: set `transform` (position + `rotationY`), `footprint` (axis-aligned
   world extents of the *rotated* cabinet — the row on the east wall uses
   `width: 0.85, depth: 0.9`), and `participantAnchors` (stand ~1.1 m in front of the
   cabinet face, facing it; dismount spots on walkable ground).
4. Regenerate the projection: `node scripts/export-place-definitions.mjs` (server gets
   transform/anchors only — the `cabinet` block is client-side presentation).
5. Run `npm test`; `tests/arcade-cabinet.test.js` proves the new machine's row fit
   (gate/spawn/seat clearance) and skin validity.

## Availability gating (server-authoritative, honestly presented)

Some arcade games are **admission-gated**: their sessions stay closed until an
operator opts in through the runtime environment. Today those are the two
server-authoritative racers — Summit Run (`AFTERLIGHT_SNOWBOARD_ENABLED`) and
Downhill Mayhem (`AFTERLIGHT_DOWNHILL_MAYHEM_ENABLED`). Both default ON in Mix
dev and in `deploy/docker-compose.yml` (override with `0`/`false`).

The gate lives in ONE canonical registry,
`server_elixir/lib/afterlight/activities/availability.ex`
(`Afterlight.Activities.Availability`): one entry per gated game — activity
type, display title, `enabled?/0` predicate. It feeds three consumers, so they
can never drift apart again:

1. **Session admission** (`Activities.start_session/6`): a closed game fails
   with the typed `race_unavailable` error and never starts a session. Do not
   re-add per-game clauses there.
2. **Error naming** (`GameChannel`): the rejection message names the actual
   game — "Downhill Mayhem isn't open on this server" — from the activity's
   title. (It previously hardcoded "Summit Run" for every closed race.)
3. **The join-time availability handshake**: every world join pushes one
   additive `activity_availability` frame
   (`{ roomId, closed: [{ id, type, title }] }`) listing the gated games this
   server has closed. Clients store it
   (`src/activities/availability.js`, pure) and present those cabinets as
   **"Coming soon · not open on this server"** in the interaction card instead
   of advertising a machine the server is guaranteed to reject. Pressing E on a
   closed cabinet explains itself; no join is sent. The frame is presentation
   only — the server remains the admission authority, and old servers/clients
   that never exchange it keep working exactly as before.

Adding a gated game = one entry in the Availability registry (plus its env
flag wiring in `config/runtime.exs` and, for production, the compose default).
`tests/activity-availability.test.js` and
`server_elixir/test/afterlight/activities/availability_test.exs` pin the
contract, including that every gated type matches a real declared activity.

## How games use the cabinet

Game modules call one function; the factory does everything else:

```js
const cabinet = createArcadeCabinet({ activityDef, world, screenSource: canvas });
group.position.set(posX, posY, posZ);   // cabinet.group, added to world.group already
group.rotation.y = rotY;
// per frame (after drawing your canvas):
cabinet.update(time);
// focused play:
setActivityCamera?.(cabinet.activityCamera);   // derived from INT_* markers
// teardown:
cabinet.dispose();
```

- `screenSource` may be an `HTMLCanvasElement` (composited 13:9, letterboxed, never
  stretched) or a ready `THREE.Texture` (video / render target — bound directly).
  The source type is a future-proofing hook for live minigame rendering targets.
- Until the GLB arrives (slow network) the machine renders a footprint-matched
  primitive stand-in and **hot-swaps** to the model when it lands. If the model can
  never load, the stand-in is the honest permanent fallback; playability never
  depends on the asset.
- Distance tiers, throttling, and spatial audio stay with the game modules
  (`createVisibilityThrottler` / `createCabinetAudio`); the factory adds only a cheap
  LED breathing pulse inside `cabinet.update()`.
- `cabinet.marker(name)` / `markerWorldPosition(name)` expose the `INT_*` nodes for
  camera work, audio anchoring, and future two-player positioning (`INT_P1/INT_P2`).

## Artwork files (drop-in later, no code changes)

Put files in `public/arcade/games/<game-id>/` and declare them in `skin.files`:

```text
left.webp 512×1024   right.webp 512×1024   front.webp 768×720
control-panel.webp 1024×480   marquee.webp 1024×400
```

Declared files load async; on 404 the procedural painter takes over and dev logs a
warning. Channels are independent — a real marquee can ship while sides stay
procedural. Textures are sRGB, clamp-wrapped, mipmapped, anisotropy 4, cached per
game+channel and shared by every cabinet of that game (refcounted; disposal of one
machine never frees a texture a sibling still uses).

**UV notes (verified against the GLB's vertex data):**
- Replacement textures must use `flipY = false` (the glTF convention the model's UVs
  are authored against). The factory sets this for skin channels and the CRT.
- The **left** side panel samples mirrored (Blender symmetric layout); the right panel
  is correct. The factory flips the `left` channel's texture automatically — author
  files for both sides use the **same orientation**. Do not pre-mirror artwork.
- The **marquee channel is applied as the material's emissiveMap** (white emissive) so
  the machine is backlit by its own artwork — the stock emissive art is cleared.
  Author bright, high-contrast marquee art. All other channels render non-emissive.
- Painted control decks must not fake control markings: the real sticks and buttons
  are 3D meshes sitting on the plate (keep printed art to pinstripes/labels).

## Material isolation rules (why skins don't leak)

- `templateScene.clone(true)` shares geometry; materials named in
  `PER_CABINET_MATERIALS` are cloned **per instance** during a single traversal.
- Only per-cabinet materials are ever mutated (LED emissive, plastics, skin maps,
  screen map). Shared materials are treated as immutable.
- `tests/arcade-cabinet.test.js` enforces: distinct LED/screen instances per cabinet,
  `setLed` isolation, shared glass/body identity across cabinets, and safe disposal.

## Known limitations

- One cabinet type exists (`upright`); racing cockpits / light-gun cabinets will be
  new `model` keys backed by their own GLBs — the definition schema already
  anticipates this.
- Attract screens are the games' own canvases; there is no shared attract-loop
  scheduler yet (the throttler tiers already cap idle cost at 10 Hz per cabinet).
- No per-button color control beyond P1/P2 plastics; the 6+6 button meshes share the
  player materials by design.
- Cabinet audio uses each game's positional synth; `INT_AudioSource` is exposed but
  not yet wired to sample playback.


## Kart Royale (the hosted-game cabinet)

`orpheum-kart-royale` (fourth row slot, Sporefall's former position) is the
first cabinet whose game is a full external application hosted through the
activity stack rather than a small in-repo game:

- The game lives in `games/kart-royale` (TypeScript, own standalone dev
  server) and is loaded as ONE lazy chunk only when a player presses E —
  bystanders never download it (`src/activities/kart-royale.js` bystander +
  `src/activities/kart-royale/controller.js` lazy host adapter; the
  bystander-economy audit in `tests/kart-royale-cabinet.test.js` enforces the
  import boundary).
- The host application keeps its single WebGL renderer and frame loop; the
  game borrows presentation through the activity view lease's optional
  `present` hook (its `postprocessing`-package composer renders through the
  shared renderer) with a renderer-state snapshot/restore bracketing the
  lease. See `openspec/changes/integrate-kart-royale-arcade/design.md` D3.
- The cabinet screen shows the animated attract mode (title, drifting kart,
  sparks, `PRESS E TO RACE`) when idle and an occupied state while someone
  races — derived only from session occupancy; there is no live race
  telemetry on the wire in v1.
- WebGL context loss during a race exits the session with an honest toast;
  the host world has no context-loss recovery (pre-existing gap, unchanged).
- Browser gate: `scripts/kart-royale-gate-browser.mjs` (phases entry, race,
  exit, reentry, bystander) against the running dev stack.
- **Staged entry (fix-kart-royale-instant-entry):** the bystander module may
  idle-prefetch the controller chunk after Theater interactivity, then warm
  track/scenery/materials in 2–4 ms frame slices as you approach the cabinet.
  Boot waits for grid/camera readiness before the view lease presents; cancel
  with <kbd>Esc</kbd> during the loading toast. Exiting via **Leave cabinet**
  or results **Back to the arcade** suspends the prepared host in a one-slot
  cache (~60 s idle eviction) for fast re-entry; travel and dispose paths
  invalidate it. Rollout: on by default when frame-bound graphics jobs are
  available; `?kartPrep=0` or `localStorage afterlight-kart-prep-v1 = 0`
  disables speculative preparation/retention. Debug: `?debug=1` exposes
  `window.__afterlight.kartPerformance()` and readiness metrics.

## Floating theater media while a game is active

Since `add-floating-minigame-media`, the theater's current stream follows the
player into every playable activity instead of leaving the screen when the
camera changes (Pool) or the projected quad is cleared (hosted racers):

- The `activityRuntime` acquires a generation/attempt-fenced presentation
  lease (`src/activities/mediaPresentation.js`) before lazy loading or a
  direct join; the theater UI (`src/ui/theaterScreen.js`) keeps the ONE
  existing playback surface and only switches presentation classes. No
  second decoder, renderer, RAF, canvas or source assignment is created, and
  presentation changes emit no theater action.
- Entry mutes programmatically controllable providers; the floating chrome
  (`src/ui/floatingMedia.js`) is a one-row icon strip — speaker,
  hide/restore, enlarge/reduce, a draggable move handle whose small menu
  holds **Reset position**, and **Back to game** — with full accessible
  names and tooltips on every control.
  Layout and reservations are pure (`src/ui/floatingMediaLayout.js`,
  `src/ui/floatingMediaReservations.js`); activity modules declare their
  critical HUD/touch selectors through `mediaPolicy.reservedSelectors`.
- Twitch clips and degraded embeds keep the same frame with native audio
  controls and an honest "automatic mute unavailable" notice — they are an
  explicit exception, never a false muted indicator.
- Rollback: `?floating-media=off` or `localStorage afterlight-floating-media
  = off` disables acquisition; games play exactly as before.
- Gate: `scripts/floating-media-gate-browser.mjs` (phases baseline, ui, lock,
  flow, perf, sources, rollback; deterministic ffmpeg fixture, local bill
  probe, identity/mutation/network assertions).

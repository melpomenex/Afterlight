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

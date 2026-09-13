# Theater environments — six worlds around the ONE Orpheum

The Theater Environment campaign gives The Orpheum (`theater`) six authored
surrounding worlds. The theater itself is **never rebuilt**: an environment is
the layer around it — terrain, water, vegetation, distant scenery, sky,
lighting, particles, ambient animation and ambience. One shared room, one set
of seats, one screen; the world outside changes.

| World | Id | Variants (preset ids) |
| --- | --- | --- |
| Coastal Dusk | `coastal` | `env-coastal-sunset`, `env-coastal-storm`, `env-coastal-midnight` |
| Rainforest Canopy | `rainforest` | `env-rainforest-mist`, `env-rainforest-afternoon`, `env-rainforest-thunderstorm` |
| Alpine Aurora | `alpine` | `env-alpine-aurora`, `env-alpine-morning`, `env-alpine-snowfall` |
| Desert Oasis | `desert` | `env-desert-golden`, `env-desert-sandstorm`, `env-desert-night` |
| Ancient Redwood Forest | `redwood` | `env-redwood-firefly`, `env-redwood-fog`, `env-redwood-sunshafts` |
| Cloud Garden | `cloud` | `env-cloud-sunrise`, `env-cloud-day`, `env-cloud-storm` |

## Where the pieces live

| File | Responsibility |
| --- | --- |
| `shared/theaterEnvironments.js` | The pure, deep-frozen manifest: identity, variants, semantic weather, visuals, feature flags, audio rows, validation. No Three.js/DOM/network. |
| `src/environments/index.js` | Registers every builder and re-exports the runtime factory. An unregistered id is a named error, never fallback scenery. |
| `src/environments/registry.js` | Builder registry (`registerEnvironmentBuilder` / `requireEnvironmentBuilder`). |
| `src/environments/runtime.js` | `createTheaterEnvironmentRuntime`: resolves the manifest row for the selected preset, owns the cached built world, swaps on change, exposes `state` and `update`. |
| `src/environments/<world>.js` | Per-world builder (six of them) + `lib/` (terrain, water, rocks, vegetation, particles, sky FX, kit). |
| `src/environments/quality.js` | Four explicit tier budgets (LOW/MEDIUM/HIGH/ULTRA): terrain/water grids, vegetation/rock/grass/particle scales, cloud layers, birds, shadows, shore detail, and `openWaterSegments` for the broad open sea. Device-derived default (ultra is opt-in). |
| `src/ui/worldSelector.js` | The **◈ World** dialog: renders the manifest, optimistically selects, reflects the room's accepted world. |
| `src/audio/environmentAudio.js` | One ambience/weather mixer; the active variant's `audio` row (rain/roof/wind/lowpass) drives the ambience bus over a 500 ms crossfade. |

## Selection: the room atmosphere is the channel

A world choice is a **room property**, not a private display setting. Each
variant maps to one atmosphere preset (`environmentVariantPresets()` feeds
`shared/atmospherePresets.js`), and the room-authoritative `atmosphere_state`
snapshot selects the world for every occupant.

Client flow (`src/main.js`):

1. **◈ World** opens `src/ui/worldSelector.js` (shown only in `theater`).
2. Choosing a variant calls `selectTheaterEnvironment(presetId)`:
   - applies the preset locally at once (`atmosphereController.setLocalPreset`
     + `theaterEnvironments.sync`) so an offline session previews worlds and a
     round trip never flashes the previous one;
   - sends `atmosphere_set { preset }` (optimistic; dropped while offline).
3. `syncTheaterEnvironment()` runs in the existing frame loop: it resolves the
   effective preset (local override until the server answers, then server
   truth), swaps the cached environment geometry only when the world changed,
   refreshes the open dialog, and animates the active environment's water,
   particles and vegetation. Hidden/cached worlds never simulate.
4. When the accepted `atmosphere_state` arrives, another occupant's change
   (or your own) wins over the stale local pick.

Server flow (Phoenix):

1. The projection (`server_elixir/priv/place_definitions.json`) carries the
   theater's `atmosphere.presets` allow-list — the 18 environment preset ids.
   `scripts/export-place-definitions.mjs` validates every id against the
   committed preset registry; `node scripts/export-place-definitions.mjs
   --check` catches drift.
2. `GameChannel` routes `atmosphere_set` (Router row: Phoenix-only, never a
   Node relay type), rate-limits it (2 per 5 s per guest), requires live
   membership, and calls `Atmosphere.set_for/2`.
3. `Atmosphere.set_preset/4` validates the id against the room's allow-list
   and the committed preset table, then performs a full replacement: `mode`
   follows the new preset, `revision` bumps, the event window is rebuilt for
   the new weather policy, `started_at` resets; the room seed and held epoch
   are unchanged. Errors: `:preset_not_allowed`, `:unsupported_preset`,
   `:unavailable`.
4. `RoomServer` persists the new state and broadcasts one `atmosphere_state`
   snapshot to every member (the same owner-call + broadcast path as the
   100 ms tick / join snapshot). There is no host: any live member may choose.

Stable client-visible errors: `atmosphere_set_invalid` (bad payload),
`atmosphere_set_rejected` with `reason`, `room_unavailable` (not a live
member), `rate_limited`.

## Authoring a new world or variant

1. Add the row to `shared/theaterEnvironments.js` (`variant({ preset, label,
   intensity, wind, rain, cloud, wetness, events, visuals, features, audio })`).
   Presets are kebab-case and unique; the `env-<world>-<variant>` convention is
   used but not enforced.
2. Register a builder in `src/environments/index.js` (new worlds only) and
   implement `build<World>({ kit, row, variantId, tier, quality })`.
3. Implement `setVariant(next)` so switches update visuals/features without a
   rebuild, and return `{ update, setVariant, dispose, environment, counts }`.
   Register material families / zones / emitter anchors through the runtime so
   the shared atmosphere controller can rebind wet surfaces.
4. Validate: `node --test tests/world-selector.test.js tests/environment-audio.test.js`
   and `node scripts/export-place-definitions.mjs --check`.
5. Visual iteration: the Dream Loop session in `.dream-loop/` captures the
   world at a locked 1920×1072 view-0 pose
   (`tools/dream-loop/capture.mjs`, `--eval "window.__afterlight.tp(0,0);
   window.__afterlight.setEnvironment('<preset>')"`). See "Dream Loop" below.

## Rendering contracts worth preserving

- **One Theater.** Never move, rebuild, hide or re-parent the theater world.
  The environment is a separate group; travel/runtime ownership stays as it is.
- **Static batching.** Animated objects (water, particles, wind vegetation)
  must stay out of the static instanced batch; see `AGENTS.md` §7.
- **Water shader options** (`src/environments/lib/water.js`) are opt-in with
  backward-compatible defaults: `fresnelPower`, `waveFreq`, `waveAngle`,
  `normalFreq`, `ripple`, `whitecap`, `hazeStart/End/Mix`, `bandFadeStart/End`,
  `horizonStart/End/Glow`, `horizonDir` + the far-water sun (`setHorizon`).
  Coastal uses these for its sunset sea; other worlds keep their original look
  because every default preserves pre-campaign behavior.
- **Quality ceilings.** Builders read `budgetForEnvironmentTier(tier)`; do not
  exceed the tier's counts with `Math.max` overrides. The open sea has its own
  `openWaterSegments` budget.

## Ambience

Each variant authors `audio: { rain, roof, wind, lowpassHz, ambience }`.
`updateEnvironmentAudio()` in `src/main.js` hands the active variant's row to
`environmentAudio.setZone()`, which crossfades gains and the weather lowpass
over 500 ms without restarting retained loops; weather intensity still comes
from the shared atmosphere sample. The `ambience` field is a reserved timbre
label — the four mix values are what currently drive the sound. Other places
keep their authored zone profiles / exposure fallback.

## Dream Loop (visual iteration)

The coastal reference world was iterated against a generated target with the
dream-loop workflow (`.dream-loop/`, `tools/dream-loop/capture.mjs`): capture
the live build at a fixed viewport and camera pose, compare to
`.dream-loop/target.png`, critique, fix. Iterations live in
`.dream-loop/iterations/NNN/` with `screenshot.png`, `metrics.json` and
`verdict.json`; never delete history.

Practical notes from that run:

- Capture with `--width 1920 --height 1072 --camera 0` and the same
  `tp(0,0)` / `setEnvironment(...)` eval so geometry is comparable.
- The fixed isometric camera hides the true sky behind the sea plane on the
  west side; coastal therefore paints the sunset horizon, sun disc/ring and a
  glitter column into the far water (`setHorizon`). Judge the result, and keep
  the painted sun pinned to the showcase composition (it is world-space, not
  camera-space).
- The best-scored state so far is iteration 011 (6.0/10); the AI-edited target
  repaints the theater's footprint (opening ocean where the venue stands), so
  the remaining gap is largely compositional and cannot be closed without
  moving The Orpheum — which the campaign forbids.

## Verification

```sh
npm test                                   # JS: manifest, selector, audio, projection, districts
node --test tests/world-selector.test.js tests/environment-audio.test.js
node scripts/export-place-definitions.mjs --check
cd server_elixir && mix test test/afterlight/world/atmosphere_test.exs
npm run build
```

Browser smoke check: `?room=theater&debug=1` → **◈ World** → switch worlds and
variants; `window.__afterlight.environment()` reports
`{ environmentId, variantId, presetId, tier, failed }` and the console stays
clean. `window.__afterlight.setEnvironment('<preset>')` switches directly.

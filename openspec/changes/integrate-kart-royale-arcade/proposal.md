> **PARTIAL SUPERSESSION NOTICE.** This change repurposes the `orpheum-sporefall`
> cabinet on the Orpheum arcade row. The unarchived change
> `add-place-activities-program` (capability `orpheum-arcade`) states the Theater
> presents "three original games" including Sporefall; after this change the row
> presents Pong, Rain Runner, Signal Lost, **Kart Royale** and Summit Run.
> Sporefall's activity code, manifest definition and tests remain in the
> repository (dormant, no Theater placement). Because `orpheum-arcade` exists
> only as an unarchived change delta, it cannot receive a `MODIFIED` requirement
> here (same constraint `fix-pool-cue-sensitivity` hit against `social-billiards`);
> the supersession is recorded here and reconciled in `design.md` §Reconciliation.

## Why

The repository now contains **Kart Royale** (`games/kart-royale`) — a complete,
high-quality Three.js kart racer (~65k lines of TypeScript: procedural world,
8-kart AI field, drift/mini-turbo physics, items, post-processing, quality tiers,
extensive tooling) — while Afterlight's Orpheum already has a generalized arcade
cabinet system and a canonical activity infrastructure (registry, participation,
view lease) proven by Summit Run. Integrating the two turns the Theater's arcade
row into a genuine portal to a substantially richer game, reusing both systems
instead of maintaining a standalone app nobody visits.

## What Changes

- **Repurpose one existing Theater cabinet**: `orpheum-sporefall` (the fourth
  upright, east wall at `z = -1.8`, adjacent to the Summit Run bay) becomes the
  **Kart Royale cabinet** — new `kart` skin motif, marquee `KART ROYALE`,
  tagline `DRIFT • BOOST • WIN`, distinct LED, animated attract mode on the
  existing 13:9 cabinet screen. Cabinet count stays five; no Theater layout
  change is required.
- **New activity type `kart-royale`** in `ACTIVITY_TYPES`
  (`shared/placeDefinitions.js`) with a full activity definition at Sporefall's
  former transform/anchor geometry; server projection regenerated.
  Sporefall stays in the manifest file as a dormant definition (not in
  `ORPHEUM_ACTIVITIES`); its code is not deleted.
- **Host Kart Royale through the canonical activity stack**, following the
  Summit Run precedent: a tiny statically-imported bystander module
  (`src/activities/kart-royale.js`) owning the cabinet and attract canvas, and a
  lazily dynamic-imported controller (`src/activities/kart-royale/controller.js`)
  that participates, acquires the **activity view lease**, and drives the game.
- **A host adapter inside `games/kart-royale`** (`src/host/`): the game's
  bootstrap is refactored so the runtime can run **host-controlled** — external
  `WebGLRenderer`, host-driven `update(dt)`/`present()`/`resize()`, injectable
  input handlers, external `AudioContext`, explicit HUD host element, injected
  quality params, reachable `dispose()` — while `src/main.ts` remains a thin
  standalone shell over the same runtime (standalone `npm run dev` keeps working).
- **View lease extension**: an optional `present` hook so a leased activity can
  render through its own `postprocessing`-package composer on the host renderer
  (Summit Run's `renderPass.scene` swap cannot carry Kart Royale's N8AO/DoF/
  motion-blur/grade chain), plus a generalized renderer-state snapshot/restore.
- **Admission-only Phoenix session clause** for `kart-royale`
  (`server_elixir` SessionServer): seats/queues/anchors/reaps the player but
  runs no authoritative race simulation — v1 races are the existing local
  player-vs-AI experience, with social presence anchored at the cabinet.
- **Dependency reconciliation**: root `three` bumped to `^0.185.1` (Kart
  Royale's version); `postprocessing`, `n8ao`, `simplex-noise` added to the root
  package so the single root build resolves one shared Three instance; a
  version-sync test pins root ↔ `games/kart-royale` dependency agreement.
- **Verification**: bystander economy tests, lifecycle/leak tests (N-cycle
  enter/exit), a chromedriver browser gate modeled on
  `scripts/snowboard-gate-browser.mjs`, adapted memory-soak budgets, preserved
  standalone Kart Royale harnesses, and full regression of existing activities.

## Capabilities

### New Capabilities

- `kart-royale-arcade`: the repurposed physical cabinet — identity, discovery,
  prompt, lazy entry, attract/occupied display, social presence and bystander
  behavior, and non-interference with the other Orpheum activities.
- `kart-royale-runtime`: the hosted game lifecycle — render/view/input/HUD/audio
  ownership, deterministic exit and restart, reentry hygiene, failure and
  cancellation behavior, and preservation of Kart Royale's racing quality.
- `kart-royale-verification`: the automated and browser gates that prove the
  above (lifecycle leak audits, browser entry/race/exit flows, standalone
  harness preservation, regression and performance budgets).

### Modified Capabilities

None. `orpheum-arcade` and the activity capabilities exist only as unarchived
change deltas (`add-place-activities-program`, `add-multiplayer-snowboard-arcade`),
so requirement-level modification is not available to this change; see the
supersession notice above and `design.md` §Reconciliation.

## Impact

- **Manifest/server**: `shared/placeDefinitions.js` (`ACTIVITY_TYPES`,
  `KART_ROYALE_ACTIVITY_DEFINITION`, `ORPHEUM_ACTIVITIES`),
  `node scripts/export-place-definitions.mjs` → `server_elixir/priv/place_definitions.json`,
  `server_elixir/lib/afterlight/activities/session_server.ex` (admission-only
  clause for `"kart-royale"`).
- **Client**: `src/activities/kart-royale.js`, `src/activities/kart-royale/controller.js`
  (new), `src/main.js` (static import; lease `present` + renderer-state snapshot),
  `src/activities/viewLease.js` (optional `present` payload field),
  `src/arcade/artwork.js` (`kart` motif), `src/ui/activityDiscovery.js` (label),
  `src/style.css` (racing body-class presentation).
- **Game (single source, stays in place)**: `games/kart-royale/src/main.ts`
  refactor into `src/host/runtime.ts` + host adapter; `RenderPipeline`
  external-renderer mode; `Input` detachable handlers; `Audio`/`Synth` external
  context; `HUD` explicit host; `Settings` injected params; hosted gating of
  globals/Recorder/console wrap.
- **Build/deps**: root `package.json` (`three@^0.185.1`, `postprocessing`,
  `n8ao`, `simplex-noise`), root `vite.config.js` (`build.target: 'es2022'`).
  No iframe, no second canvas/renderer, no second RAF, no workspace; the
  existing >500 kB chunk warning will grow — it is not silenced.
- **Docs**: `README.md`, `docs/arcade.md`, `AGENTS.md` repository-map row.

### Non-goals

- No networked/authoritative multiplayer Kart Royale (local player vs the
  existing AI field; the session machinery keeps the door open for a later
  change).
- No second renderer, canvas, RAF loop, activity registry, input framework,
  camera framework, social-room concept, or event bus.
- No rewrite of kart physics, AI, items, course, or post-processing.
- No deletion of Sporefall (or any other activity) code.
- No durable Kart Royale ranking/backend; no spectating of live race telemetry.
- No WebGL context-loss recovery for the host world (pre-existing gap, recorded).

## Why

Afterlight's six authored environments currently belong to The Orpheum's room atmosphere; local startup randomization is superseded by room state, and hosted games retain unrelated presentation. Promote those environments into a persistent personal World so compatible places and activities feel connected without duplicating functional scenes or dividing multiplayer rooms.

## What Changes

- Introduce one application-owned World selection, a pure declarative catalog, validated View capabilities, and deterministic presentation resolution. Preserve `coastal`, `rainforest`, `alpine`, `desert`, `redwood`, `cloud` and all 18 existing variants.
- **BREAKING UX:** the existing World picker changes the visitor's browser-local preference, rather than asking everyone in the room to adopt an atmosphere preset. Room snapshots no longer overwrite personal World selection. Existing room-atmosphere messages remain compatible and continue to supply authoritative activity conditions.
- Assign a missing preference randomly once, persist it using the existing environment-preference storage, and preserve it through travel, activity entry, reconnect and reload. Treat deep links as session previews until explicitly selected.
- Compose global atmosphere, reusable asset kits and optional View interpretation adapters around immutable gameplay geometry. The Orpheum retains its six full environments; its arcade and table games share that surrounding presentation. Other places inherit bounded ambience; Kart Royale, Summit Run and Downhill receive explicit safe presentation hooks.
- Extend current generation fences, resource ownership and frame-budgeted preparation with optional cosmetic loading, deterministic fallbacks, bounded retention and diagnostics. Gameplay entry never awaits an optional scenery bundle.
- Add authoring guidance, multiplayer invariance tests, visual acceptance and performance gates before enabling the migration by default.

## Capabilities

### New Capabilities

- `global-world-preferences`: Canonical World identity, initial assignment, browser persistence/migration, deep links and personal selection UX.
- `world-view-inheritance`: World definitions, View policies, interpretation resolution, functional/cosmetic boundaries and concrete place/activity integrations.
- `world-resource-lifecycle`: Resource reuse, asynchronous ownership, progressive loading, runtime replacement, budgets and debugging.

### Modified Capabilities

- `room-atmosphere`: Separate authoritative semantic conditions from personal visual World identity without changing room topology or protocol ordering.
- `atmosphere-rendering`: Compose World presentation through the existing render ownership with capability limits and gameplay visibility guarantees.
- `environment-audio`: Follow the active World/View through the existing mixer without duplicate ambience or shared media mutations.

## Impact

Primary seams: `shared/theaterEnvironments.js`, proposed `shared/worldDefinitions.js`, `src/environments/`, proposed `src/worlds/`, `src/main.js`, `src/places/registry.js`, `src/activities/{registry,runtime,viewLease,resourceCache,graphicsJobs}.js`, and `src/ui/worldSelector.js`. Hosted adapters extend Kart's `games/kart-royale/src/host/` and presentation systems, Summit's `src/activities/snowboard/scene.js`, and Downhill's `games/downhill-mayhem/src/{host,game}/`.

The supported Phoenix gateway and Node sidecar remain intact. No account column, new socket, World presence field, matchmaking partition, rules/course change, renderer replacement or new runtime dependency is required. Existing atmosphere fixtures remain authoritative; compatibility is tested against `server_elixir/lib/afterlight/world/atmosphere.ex` and activity environment projection. Protected data snapshots are untouched.

The design records inspected architecture, all current places/activity types, migration of each environment, phased delivery and acceptance gates. Rich custom scenery for every World/View pair, a World editor, new games, account-wide preference synchronization and shared-room World UX are future work.

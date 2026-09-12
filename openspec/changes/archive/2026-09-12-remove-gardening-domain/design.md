# remove-gardening-domain — Design

## Context

See `proposal.md` for motivation. The retirement spans the client, the shared JS contract, the Node sidecar, the Phoenix/Elixir application, Postgres, the specs, docs and operational scripts. Key current facts that shape the design:

- The Market Court is a bespoke room (`src/world/marketWorld.js`, `ROOMS.MARKET`) whose only content is the economy: trade board, seed vendor, contracts board, the Great Mill, a machine bench and the gate to the personal garden. Every legacy district's south gate targets `market`, and `market` is both the client's starting `currentRoomId` and the server's HELLO default room.
- The public legacy district **The Glass Garden** (`garden`) sits between `canal` and `station` in the frozen west/east loop. Its manifest seed is `index * 37`; removing an array entry naively would shift every later seed.
- Personal gardens are `garden:<owner>` rooms with their own world, protocol types and client mirror; they share the bare `garden` shorthand with the public district in `getBoundsForRoom`.
- The produce-based nickname banks live in `shared/identity.js` and are mirrored in Elixir `Afterlight.Accounts.ReducerSupport` (parity-tested).
- `data/game-state.json`, `data/iptv.json` and `data/epg.json` are protected originals with recorded SHA-256 hashes (`npm run p11:snapshot-hashes`); Node's `storage.save()` is already disabled in the supported stack.
- Activities write no economy state (verified in `server_elixir/lib/afterlight/activities/**`), so removing the economy does not break activity rewards.

## Goals / Non-Goals

- Goal: no gardening/cultivation/economy behavior, data model, wire type, HUD surface or "Gardener" identity remains in the running game.
- Goal: navigation, default-room semantics, remaining districts, activities, theater/catalog/chat and player identity keep working unchanged.
- Goal: the retirement is reversible until the Postgres drop and never rewrites the protected snapshots.
- Non-goal: replacing the economy with anything (no coins, XP, levels, trading or crafting substitute).
- Non-goal: redesigning the Market Court, removing the nature-themed restoration districts (`understory`, `mangrove`, `delta`, `trestle`, `frost-spire`, and the rest), or removing the courtyard/canal/signal restoration landmarks.
- Non-goal: touching the realtime binary plane, theater, IPTV, torrents, chat or conferencing.

## Decisions

### Keep the Market Court as a stripped room; keep the gate topology

The user chose the lowest-risk option: the `market` room stays the default-room fallback and every district's south gate keeps targeting it. `src/world/marketWorld.js` loses the three stalls, the mill/machine bench and the `garden_gate` item; the paving, walls, puddles, crates and the western `district_gate` to `canal` remain. Arrival copy becomes neutral. Alternative considered: deleting the room and rehoming the hub to The Rain Court — rejected because it rewrites the frozen topology and default-room contract for no product gain.

### Preserve seeds explicitly instead of by array index

`defineLegacyPlace` currently sets `seed: index * 37`. Replace the derived value with an explicit frozen seed table that records the historical values (garden keeps its retired value; no remaining district changes). `PLACE_VIEW_FIXTURE` keeps its explicit fixture seed. Gate destinations are declared per district rather than recomputed from array order; removing `garden` makes `canal.east = station` and `station.west = canal`, and nothing else moves. Tests that pinned the old loop are updated with intent, not weakened.

### Identify the avatar and naming systems without gardener language

- `shared/identity.js`: keep the deterministic seed math, replace `ADJECTIVES` (drop Mossy/Fern/Bramble/Thistle/Dewy/Hedge/Orchard/Verdant) and the entire `PRODUCE_NOUNS` bank with industrial/afterlight adjectives and machine/urban nouns (e.g. Copper, Rust, Amber, Slate, Iron, Cinder + Lantern, Kestrel, Compass, Signal, Beacon, Relay, Foundry, Quarry). No planting or produce terms.
- Mirror the banks exactly in Elixir `Accounts.ReducerSupport` and regenerate the identity parity fixtures; parity tests must stay green.
- `createGardenerAvatar` becomes `createPlayerAvatar`; the defensive nickname fallback becomes `'Visitor'`; the watering-can prop and `setWateringCan` disappear with the tool system; the rig, palette and emote animations are untouched.
- IRC bridge username default becomes `visitor` and the server welcome text no longer addresses gardeners. Tests asserting `!gardener@afterlight` are updated.

### Migrate storage keys additively, never delete the old value

New keys `afterlight-guest-id` and `afterlight-nickname`; the client prefers them, falls back to reading `afterlight-gardener-guest-id`/`afterlight-gardener-nickname`, and writes the new keys on first load. Existing values are copied, and the legacy keys are left in place so a code rollback keeps identity continuity. New installs never create gardener-named keys.

### Retire wire types by removal, with graceful tolerance

Remove the constants from `shared/protocol.js`, the Node dispatch branches, the Elixir router/`EconomyGroup.Gateway`, `Payloads` builders, and client dispatch. Node and Elixir answer retired client commands with the existing bounded error frame and keep the session; the client's message dispatch already ignores unrecognized types, and the room-epoch list drops `garden_state`. Keep `ROOMS.MARKET` and the retained message catalog unchanged. Alternative considered: a compatibility shim that answers retired commands with a generated `ACTION_RESULT` — rejected as dead surface that the specs explicitly retire.

### Remove the Elixir domains, keep weather alive by relocation

Delete `Afterlight.Gardens*`, `Afterlight.Economy*`, `Afterlight.EconomyGroup*`, `Afterlight.Restoration*`, `Afterlight.Import.EconomyGroup`, the economy sections of `Export.GameState`, their Ash domains in `config/config.exs`, the `EconomyGroup.Supervisor` child in `application.ex`, the `AFTERLIGHT_ECONOMY_OWNER` routing branch, and the economy mix tasks. `Afterlight.World.Weather` is the one survivor of the supervisor: move it under `World.Supervisor` so `Gateway.Welcome` keeps its existing weather field and the `weather_update` relay keeps its consumer. The protocol catalog and ownership docs are updated to say weather is presentation-only.

### Data disposition

- Protected snapshots are never opened for write. `npm run p11:snapshot-hashes` is part of the verification gate.
- Before the drop migration, export the economy domains to a dated archive outside the protected files (operator path; default `.retired/economy-<UTC>.json`, gitignored), then run a new Ecto migration that drops the economy-group tables and the player economy columns. Migration history is never edited (old migrations stay; the new one reverses by restore from the archive).
- Node `storage.js` stops defaulting/normalizing gardens, orders, trades, multipliers, nodes, machines and economy player fields; existing JSON contents are ignored, not rewritten. The `AFTERLIGHT_NODE_DURABLE_READ_ONLY` flag stays as-is (it still protects the frozen file).

### Remove the contextual HUD policy rather than feed it empty data

With no tools, inventory or economy, `placeHudPolicy.js`, the `data-hud-legacy` markers, the `afterlight-legacy-ui-v1` preference, the settings toggle and the mill panel have no remaining content to demote. Replace `src/ui/marketModal.js` with a nickname-only profile UI; remove the tool belt, stat pills, satchel/market buttons, `I`/`M` shortcuts and the `1–6` tool bindings. Keep `T` (Places), `E` (interact), `C` (views), `V` (emotes), Space/Shift movement and chat. `legacy-social-transition` (in flight) is superseded by this removal and is not to be extended.

### Supersession handling

`add-ash-gardens-economy-restoration` (P6) is cancelled: its import/export/conservation work is deleted with the domain. `deemphasize-legacy-farming`'s presentation policy is superseded by full removal. Neither change's files are edited by this change; the proposal and this design record the supersession so the archive workflow can close them after this change lands.

## Risks / Trade-offs

- [Mixed-version session: an old client sends a retired command] → servers already answer unknown/durable commands with a bounded `error` frame; tests cover both directions of tolerance.
- [Removing the garden entry shifts scenery or gates] → explicit seeds and explicit exits; tests assert each remaining district's seed and gate destinations.
- [Parity drift between JS and Elixir nickname banks] → banks change in one task, parity fixtures regenerate, `mix test` and `npm test` both gate it.
- [Dropping Postgres data is irreversible] → dated export outside protected snapshots before the migration; original JSON snapshots untouched; rollback path documented.
- [Presence tests used `garden:<id>` as a convenient second room] → they switch to an existing public room (e.g. `foundry` or `theater`) without changing presence semantics.
- [Legacy weather loses its gardener rationale] → weather is presentation-only and still relayed; the HUD weather indicator, fog density and weather audio keep working.
- [Documentation claims of retained legacy gardening rot quickly] → README/AGENTS/docs updated in the same change; a repo-wide grep for gardener/garden/produce terms is a completion task.

## Migration Plan

1. Add the new identity banks and storage-key migration; scrub gardener copy; keep behavior otherwise identical.
2. Remove client domain surfaces (worlds, UI, protocol senders, HUD) behind the existing build; run `npm test`/`npm run build`.
3. Remove Node modules, dispatch and storage handling; update scripts and tests.
4. Remove Elixir domains, relocate Weather, update welcome/payloads/channel/router/config; run `mix test`.
5. Export economy data to the dated archive, add and run the drop migration.
6. Update README/AGENTS/docs; run the full verification (below); grep the repo for leftover gardening terms.

Rollback: revert the code before step 5. After step 5, restore dropped tables/columns from the dated archive and redeploy the previous revision; protected snapshots never needed restoration.

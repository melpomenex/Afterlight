# Proposal: add-creative-avatar-system

## Why

Afterlight's population is visually monotone today: every visitor renders as the same
procedural maintenance-robot silhouette (`src/render/avatars.js:58`), differentiated only
by a six-entry palette hash of their player id (`shared/identity.js:55`). In a multiplayer
social world whose product identity is "shared places worth repairing", the people are the
content — and right now twenty visitors in the Orpheum look like one person wearing six
coats. A catalog of distinctive, Blender-authored characters (CRT Head, Neon Jellyfish,
Moon Head, …), randomly but server-authoritatively assigned, makes crowds readable,
memorable and fun without building a character creator. Doing this well once also gives
the project its first reusable character-asset pipeline (Blender source → GLB export →
registry → runtime), which every future avatar, skin or variant will ride.

## What Changes

- Adds `shared/avatarDefinitions.js`: a pure, deep-frozen manifest of authored avatars
  (id, name, asset path, rig kind, scale, nameplate height, tint materials, effect flags,
  rarity/weight, tags) plus validation — the single editable source, mirroring
  `shared/placeDefinitions.js`.
- Adds server-authoritative avatar assignment: on HELLO the owning stack (Node sidecar or
  Phoenix, whichever the routing flip selects) assigns one catalog avatar per player,
  weighted-random, persisted on the player record (Node `data/game-state.json` players map;
  Postgres `players` via Ash) — sticky across sessions, like the nickname.
- Threads the assignment additively through existing identity/presence wire shapes:
  `welcome.player.avatar`, `presence_join.player.avatar`, and the join roster's
  `players[].avatar`. Movement flushes and the binary realtime path are untouched (an
  avatar is session-stable identity, not pose).
- Adds the client avatar runtime (`src/avatars/`): load-once/clone-per-player GLB template
  cache (following the arcade cabinet pattern), a presenter that maps authored avatars onto
  the game's existing animation contract (`userData.legs/arms/rig` — walk, sit, hop, emotes
  keep working unchanged), deterministic per-player accent tinting, and cheap cosmetic
  "personality flourishes" (CRT static, jellyfish pulse, cassette reels, …).
- Keeps a zero-regression fallback: unknown/missing avatar id, or a failed asset load,
  renders today's procedural avatar; old clients and old servers interoperate both ways.
- Builds the initial 24-avatar set in Blender via Blender MCP, one at a time, exported to
  `public/avatars/<id>/<id>.glb` with committed `.blend` sources, an export/verification
  script, and `docs/avatars.md` as the authoring guide.
- Shows the assigned avatar's name in the Visitor Pass profile panel.

No breaking wire or save changes; all additions are additive fields and new files.

## Capabilities

### New Capabilities
- `avatar-system`: the authored-avatar catalog and pipeline — avatar definitions manifest
  and validation, server-authoritative weighted assignment and persistence, avatar
  replication through welcome/presence join shapes, client GLB loading/caching/cloning,
  the shared rig and animation contract for authored avatars, accent tint variants,
  cosmetic personality effects, fallback behavior, and the Blender→GLB asset pipeline with
  its budgets and naming contracts.

### Modified Capabilities
- `player-identity`: the "Avatar Differentiation and Remote Movement Interpolation"
  requirement changes — players are rendered as their server-assigned catalog avatar when
  one is assigned and loadable, with the procedural maintenance-robot silhouette retained
  as the fallback (unknown id, failed load, legacy server), and all clients in a room
  agreeing on the same avatar for a given player id. Guest tokens, nicknames and
  interpolation semantics are unchanged.

## Impact

- **Client**: new `src/avatars/` (loader, presenter, effects), `shared/avatarDefinitions.js`;
  `src/render/avatars.js` gains an authored-avatar construction path beside the procedural
  one; `src/main.js` local-player avatar becomes assignment-driven (hot-swap on
  `welcome`/`set_nickname` reply, preserving position/seat/camera state);
  `RemotePlayersManager` consumes `avatar` fields; `src/ui/profileModal.js` shows the
  avatar name; `src/realtime/wire.js` entity path is explicitly unchanged (proxy capsules
  stay, documented limitation).
- **Node sidecar** (`server/index.js` HELLO handling, `server/world.js` join/roster
  shapes, `server/storage.js` player record): assign once, validate against the shared
  manifest, persist, replicate.
- **Phoenix** (`Afterlight.Gateway.Welcome`, `Accounts.Player` + migration +
  `Normalize.to_legacy_player`, `Afterlight.Web.GameChannel` assign threading,
  `Afterlight.World` join attrs → `RoomServer` members → `Frames` roster/join entries):
  same assignment and replication with parity pinned in tests.
- **Shared/projection**: `scripts/export-avatar-definitions.mjs` writes the committed
  `server_elixir/priv/avatar_definitions.json` (id/weight/validation table) following the
  place-definitions projection pattern; `--check` catches drift.
- **Assets/docs**: `public/avatars/<id>/<id>.glb`, `public/avatars/<id>/preview.png`,
  committed Blender sources, `docs/avatars.md`; README gains a player-facing note.
- **Tests**: manifest validation, assignment weighting/normalization, presenter rig
  mapping and fallback, presence-shape additions (Node), Elixir frames/accounts tests,
  parity fixture for the catalog projection.
- **Performance**: per-avatar budgets (≤ 8k tris, ≤ 4 materials, ≤ 2×1k textures, GLB
  ≤ 1.5 MB target) keep a full room of authored avatars comparable to today's scenes;
  assets load on demand per distinct avatar id present in a room.

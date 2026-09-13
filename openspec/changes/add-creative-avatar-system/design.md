# Design: add-creative-avatar-system

## Context

Afterlight renders every visitor through one procedural builder today. The relevant
current-state facts (verified in this repo):

- **Avatar construction** — `src/render/avatars.js:58` `createPlayerAvatar(playerId, nickname)`
  builds a box-composite maintenance robot (~1.9 units tall), palette-chosen by hashing the
  player id (`shared/identity.js:55` `generatePlayerPalette`, 6 fixed palettes). The same
  builder serves the local player (`src/main.js:494`) and every remote player
  (`RemotePlayersManager.setPlayer`, `src/render/avatars.js:216`). Kiln is a separate
  builder (`createKilnCompanion`) and is out of scope.
- **Animation contract** — everything is procedural and driven through `avatar.userData`:
  `legs` (two pivot groups at y≈0.5, rotation.x swing), `arms` (two pivots at y≈1.2),
  `rig` (whole-body group used by emote poses), `nameSprite`. Walk/sit/hop/emote code
  paths live in `src/main.js` (`move()` at :2118, `applySit`/`applyStand` at :1020,
  emote start/stop in `src/render/avatars.js:353-400`) and in
  `RemotePlayersManager.update()` (`src/render/avatars.js:264`). Any authored avatar must
  satisfy this contract or those systems break.
- **Identity & presence wire** — HELLO carries `{guestId, nickname}`
  (`src/net/client.js:194`); the owning server resolves/creates the player record and
  replies WELCOME with the player object. Presence shapes: `presence_join.player` and the
  join roster carry `{id, nickname, x, z, rotY, walking, sitting}`; movement flushes add
  `airborne` and drop `nickname` (`server/world.js:56-91`, Node baseline;
  `Afterlight.World.Frames` mirrors it field-for-field with parity pinned in
  `server_elixir/test/afterlight/world/frames_test.exs`). The negotiated binary realtime
  plane (`shared/realtime/nodeBinaryFlush.js`) carries movement only.
- **Two server stacks** — Phoenix gateway + Node sidecar (`npm run dev:stack`), with
  domain routing flips (`Afterlight.Gateway.Router`): hello/welcome is Phoenix-owned,
  world/presence is Phoenix-owned with a Node shadow. The nickname threads
  `GameChannel.finish_hello` → `Welcome.compose` → `socket.assigns.nickname` →
  `World.join(..., nickname, pose)` → `RoomServer` member → `Frames` roster entries. Node
  keeps the same shapes in `server/index.js` (HELLO at :676) and `server/world.js`. An
  identity-field addition must land in **both** stacks.
- **Player persistence** — Node: `server/storage.js` players map inside
  `data/game-state.json` (`{id, nickname, currentRoom, lastSeen}`). Phoenix: Postgres
  `players` table via Ash (`server_elixir/lib/afterlight/accounts/player.ex`; attributes
  id/nickname/current_room/last_seen/active/shadow/claimed_at) with
  `Normalize.to_legacy_player` producing the wire shape.
- **JS→Elixir manifest sharing** — established pattern:
  `shared/placeDefinitions.js` → `scripts/export-place-definitions.mjs` → committed
  `server_elixir/priv/place_definitions.json` (`--check` catches drift).
- **GLB loading precedent** — the arcade cabinet (`src/arcade/cabinet.js`): fetch once,
  `GLTFLoader.parse`, cache the template, clone per instance, resolve nodes **by name**
  (`ARC_Cabinet_ROOT`), primitive fallback with hot-swap. Assets live under `public/`
  (Vite static). No `.blend` sources are committed today; `docs/arcade.md` is the
  authoring-guide pattern.
- **Experimental entity backend** — behind `?rt_binary=1`/`?rt_entity=1`,
  `src/realtime/gpu/liveInstanced.js` replaces remote player meshes with instanced capsule
  proxies. Explicitly experimental; this change leaves it alone (documented limitation).

## Goals / Non-Goals

**Goals (design-level)**

- One avatar assignment per player, owned by the server, replicated on existing
  identity/presence shapes, additive and byte-compatible with old clients/servers.
- Authored avatars that drop into the *existing* animation/seating/emote/first-person
  systems with zero per-avatar gameplay code.
- A repeatable Blender→GLB pipeline (Blender MCP friendly, scriptable, verifiable) with
  committed sources, budgets, and a content-only path for avatar #25.
- The initial 24-avatar set produced in four waves with rig/material reuse.

**Non-Goals**

- No character creator, no user avatar selection or re-roll UI in v1 (assignment is
  server-side; a future `set_avatar` op can ride the same persisted field).
- No skeletal AnimationMixer retargeting, no per-avatar skeletal clip library in v1 — the
  shared hierarchical rig already covers every state the game animates today (see D3).
- No changes to Kiln, collision, the binary realtime plane, or the experimental entity
  backend.
- No persistence of tint variants, effects state, or any avatar data in the client save.
- No per-avatar scene lights for remote players (emissive-only flourishes).

## Decisions

### D1 — Avatar id is identity-grade state: assigned at hello, persisted, sticky

**Decision.** The owning hello stack assigns the avatar exactly once — weighted-random
over the manifest's assignable entries with server-side randomness — persists it on the
player record (Node players map / Postgres `players.avatar`, migration included), and
returns it in every subsequent WELCOME. Reconnection, reload and room travel never
re-roll; a stored id absent from the current manifest is healed by re-assignment.

**Why sticky-per-player instead of re-roll-per-session.** Afterlight identity is already
persistent (guest token → persisted nickname; `player-identity` spec). A returning visitor
keeping their Jellyfish is socially coherent — friends recognize each other — and it
makes the assignment testable and cheap (one RNG draw per player lifetime, not per
socket). Per-session re-rolls would also make QA and screenshots non-reproducible. The
cost — a player stuck with an avatar they dislike — is real but addressed by a future
opt-in re-roll, not by churn in v1.

**Wire placement (mirrors nickname exactly):** `welcome.player.avatar`,
`presence_join.player.avatar`, join-roster `players[].avatar`. Never on movement flushes
or the binary plane (avatar is session-stable; flush fields are pose). Old client + new
server: extra JSON field ignored. New client + old server: no field → fallback avatar →
today's behavior. Both stacks must emit it (routing flips make either authoritative).

**Alternatives considered.** Deterministic hash of guestId (rejected: client-forgeable
input influencing state, and no healing story); per-session re-roll (rejected above);
avatar chosen by client (rejected: not server-authoritative, breaks agreement).

### D2 — `shared/avatarDefinitions.js` manifest + Elixir projection

**Decision.** A pure, deep-frozen ES module in `shared/` — the pattern of
`shared/placeDefinitions.js` — holding all 24 entries plus validation. The server-side
subset (ids, weights, rarity) is exported by a new
`scripts/export-avatar-definitions.mjs` to committed
`server_elixir/priv/avatar_definitions.json` (same contract as place definitions,
`--check` in CI-adjacent tasks). Phoenix reads the projection; Node imports the module
directly.

**Schema (v1):**

```js
{
  id: 'crt-head',                 // stable, kebab-case, becomes persisted data
  name: 'CRT Head',               // player-facing (Visitor Pass)
  assetPath: 'avatars/crt-head/crt-head.glb', // under public/, no traversal
  rig: 'humanoid',                // 'humanoid' | 'humanoid-heavy' | 'floating' (v1 kinds)
  scale: 1.0,                     // applied at instantiation; authored at 1.8–1.95m
  nameplateY: 2.3,                // per-avatar (street lamp: ~2.9)
  tintMaterials: ['MAT_Accent'],  // named materials eligible for per-player tint
  effect: 'crt-static',           // optional flourish key, else null
  rarity: 'common',               // 'common' | 'uncommon' | 'rare'
  weight: 10,                     // positive int; relative pick probability
  tags: ['screen-face', 'streetwear'],
}
```

Validation mirrors the place manifest: unique ids, positive weights, known rig kinds,
asset path confined to `avatars/<id>/`, complete-or-rejected entries. Rarity exists in v1
as data (weights do the work: ~70/22/8 across the set); variant *lists* are deliberately
not in v1 — per-player tinting (D6) delivers visual variety without a variant catalog.

### D3 — Shared hierarchical rig, not skeletal retargeting

**Decision.** Every GLB ships a named node hierarchy — `AVA_<ID>_ROOT` →
`AL_Rig`(`AL_Root`) → `AL_Head`, `AL_Arm_L/R` (pivot at shoulder y≈1.2),
`AL_Leg_L/R` (pivot at hip y≈0.5) — the direct GLTF equivalent of the groups
`createPlayerAvatar` already exposes. `src/avatars/presenter.js` maps those nodes into
the same `userData.legs/arms/rig` shape, so walk swing, seated fold (−1.35 rad), hop
tuck, emote poses, nameplate and nickname updates all keep their current code paths for
authored avatars. Two additional rig kinds cover the outliers: `humanoid-heavy` (same
nodes, hip pivot tolerated at y≈0.4 for bulky builds like the diver/vending machine) and
`floating` (legs optional, replaced by a bobbing root + optional trailing nodes the
effect animates). A missing node degrades to a whole-body idle bob with one dev log.

**Why not a skinned armature + AnimationMixer clip library.** The game animates exactly
five states (walk/idle/sit/hop/emote poses) and drives them procedurally in shared code;
introducing mixers, crossfades and clip retargeting would rewrite `move()`, seating,
remote interpolation and the emote system for aesthetic gain the current art direction
doesn't need, and would make MCP-driven authoring (skinning weird shapes like a disco
ball) dramatically more failure-prone. The node contract keeps "shared animation rig" —
one rig, reused by all avatars — while staying inside the existing animation
architecture. A v2 can add optional named clips per avatar without touching this
contract (the presenter would prefer a clip when present); nothing here forecloses it.

**Contract heights are normative** (matching the procedural avatar): feet at y=0, leg
pivots y≈0.5, arm pivots y≈1.2, head pivot y≈1.45, total height 1.55–1.95 m in Blender
meters, model facing +Z in glTF space (Blender authoring: character faces −Y, glTF
export converts). Root exactly at ground center. `scale` in the manifest fixes residual
mismatches.

### D4 — Client runtime: `src/avatars/` (loader, presenter, effects)

- **`src/avatars/loader.js`** — cabinet-pattern template cache: `getTemplate(id)` fetches
  `public/avatars/<id>/<id>.glb` once (single in-flight promise per id), parses with
  `GLTFLoader`, validates contract nodes (named lookup, never traversal order), caches;
  `instantiate(id)` returns a cloned hierarchy with cloned materials for tinting (clone
  materials only for entries in `tintMaterials`, plus any `FX_*` materials, so untouched
  materials stay shared for batching friendliness). One retry on fetch failure, then a
  named `unavailable` result → fallback. Load is lazy: triggered only when a player with
  that avatar id is actually observed (roster, join, or own WELCOME).
- **`src/avatars/presenter.js`** — pure-factory + thin DOM/three glue:
  `createAvatarFor(playerId, nickname, avatarId)` returns a `THREE.Group`
  indistinguishable in interface from today's (same `userData` contract, nameplate at
  `nameplateY`, shadows on), internally either the procedural builder or an instantiated
  GLB. Also `applyAvatar(avatarGroup, avatarId)` for the local player's hot-swap:
  preserve `position/rotation`, seat state, camera mode, and re-bind the nameplate —
  called from the WELCOME handler before the first frame renders, and again on the
  `set_nickname` WELCOME if the id changed (it shouldn't; defensive).
- **`src/avatars/effects.js`** — registry of flourishes keyed by `effect`:
  `crt-static` (scrolling opacity/emissive on `FX_Screen`), `glow-pulse` (emissive
  intensity sine), `spin` (constant rotation of `FX_Spin_L/R` nodes — cassette reels,
  eyeball iris), `flicker` (randomized emissive spikes — cloud lightning, neon), `float`
  (root bob + trailing-node sway). Signature `update(avatar, time, dt)` called from the
  existing frame loops (local player in `main.js`, remotes in `RemotePlayersManager`),
  touching only declared materials/nodes. No lights, no geometry allocation per frame.
- **Integration points** — `createPlayerAvatar` grows an `(options)` path or, cleaner, a
  dispatcher in `presenter.js` that both `main.js:494` and `RemotePlayersManager.setPlayer`
  call instead; `RemotePlayersManager` stores `avatarId` per entry and re-instantiates on
  change (it won't change mid-session; defensive). The rt entity path
  (`src/realtime/wire.js`) keeps its capsule proxies untouched.

### D5 — Server assignment in both stacks

- **Node** — `server/avatars.js`: `ensureAvatar(player)` — validate stored id against the
  manifest, else weighted pick (`crypto.randomInt` over cumulative weights), persist via
  `storage.savePlayer`. Called in the HELLO handler (`server/index.js:676`) next to
  `resolveDuplicateNickname`; `player.avatar` then rides the existing WELCOME player
  object. `server/world.js` adds `avatar: session.player.avatar` to the
  `presence_join.player` and join-roster entries only.
- **Phoenix** — Postgres migration adds `avatar` (nullable string) to `players`; Ash
  attribute + upsert fields; `Welcome.compose`/`ensure_player` performs the same
  ensure-or-assign against `priv/avatar_definitions.json` (weights live there; RNG is
  `:rand`, outcomes need not match Node — parity is on the assignable set/validation, not
  RNG results); `Normalize.to_legacy_player` passes `avatar` through;
  `GameChannel.finish_hello` assigns `:avatar` from the welcome player and threads it
  into `World.join/6→7`; `RoomServer` members carry `avatar`; `Frames.roster_entry` adds
  `:avatar` (join shapes only — `flush_entry` deliberately unchanged). Update the pinned
  `frames_test.exs` literals and add an accounts/assignment test.
- **Parity fixture** — extend `tests/fixtures/parity/` with the avatar catalog projection
  (id/weight table) consumed by both a Node test and, via the committed JSON, the Elixir
  test — the place-definitions precedent.

### D6 — Deterministic per-player accent tint

`generatePlayerPalette` precedent, generalized: a pure `accentColorFor(playerId)` (same
hash family, curated accent palette fitting the world — ambers, teals, oxide reds) tints
only the avatar's declared `tintMaterials` at instantiation. Same input → same color on
every client; nothing on the wire; the procedural fallback keeps its existing full-palette
look.

### D7 — Performance budgets and rendering rules

Budgets per avatar (v1, enforced by `scripts/verify-avatar-assets.mjs` at pipeline time —
see D8): **≤ 8k triangles** (the procedural avatar is ~35 boxes; 8k is lavish for this
art direction while keeping 20 visible avatars ≈ a district's instanced masonry), **≤ 4
materials**, **≤ 2 textures at 1024²**, **GLB ≤ 1.5 MB target / 3 MB hard cap**.
Practically: flat-shaded MeshStandard materials with vertex/base colors and no textures
for most avatars; emissive `FX_*` materials where declared. Shared materials stay shared
across clones (D4); only tint/FX materials clone per player. Shadow casting on, receive
off (matches current avatars). No LODs in v1 — budgets make LOD0 sufficient at social
scales; a room's distinct avatar assets load on demand and cache for the session
(disposal policy: cached worlds precedent — keep templates for the session, they're
small). These numbers are deliberately tighter than generic 15–30k advice because this is
a stylized isometric scene with bloom/shadow composers and potentially dozens of visible
players, not a third-person hero character.

### D8 — Asset pipeline: folders, names, verification, Blender MCP workflow

```
shared/avatarDefinitions.js                  # manifest (single editable source)
assets-blender/avatars/
  _shared/AL_SharedRig.blend                 # the rig reference + material palette
  crt-head/crt-head.blend                    # one source per avatar (committed)
public/avatars/<id>/<id>.glb                 # exported runtime asset
public/avatars/<id>/preview.png              # 512×512 viewport render (thumbnail)
scripts/export-avatar-definitions.mjs        # → server_elixir/priv/avatar_definitions.json (--check)
scripts/verify-avatar-assets.mjs             # parse each GLB: node contract, budget, orientation, origin
docs/avatars.md                              # authoring guide (the docs/arcade.md pattern)
```

Naming contract (cabinet precedent, resolved by name): root `AVA_<ID>_ROOT`, rig nodes
`AL_Rig/AL_Root/AL_Head/AL_Arm_L/AL_Arm_R/AL_Leg_L/AL_Leg_R`, effect nodes/materials
`FX_*`, tintable materials listed in the manifest. Export: glTF 2.0 GLB, +Y up, +Z
forward, meters, apply-modifiers, no cameras/lights, custom properties off, names
preserved. `.blend` sources are committed (unlike the historical cabinet file) because
the MCP workflow regenerates/iterates from source and GLBs are build outputs; sizes stay
small at these poly counts.

**Blender MCP workflow per avatar** (one at a time, sequentially):
1. concept interpretation against this design's per-avatar notes (production plan below);
2. build in a fresh scene from the shared rig template (scripted: primitives +
   modifiers — mirrors how the game's own scenery is authored, and keeps everything
   editable/verifiable);
3. parent mesh groups to the contract nodes; set materials (`MAT_Body`, `MAT_Accent`,
   `FX_*`);
4. origin/ground/scale/orientation pass (script-verified);
5. viewport preview render → `preview.png`;
6. export GLB into `public/avatars/<id>/`;
7. run `scripts/verify-avatar-assets.mjs <id>` — contract failures are named errors, fix
   before proceeding;
8. registry entry + projection regen + in-game verification (two clients agree, walk/sit/
   emote/hop checks);
9. summarize (files, rig reuse, effects, issues) before the next avatar.

### D9 — Avatar production plan (24 avatars)

Rig kinds: **H** = `humanoid`, **HH** = `humanoid-heavy`, **F** = `floating`. Difficulty
is MCP authoring + effects risk, not concept quality.

**Wave 1 — easy (pipeline shakedown; all H, no FX beyond glow/spin basics)**

| Avatar | Concept | Rig | Effects/materials | Reuse | Diff | Risks |
| --- | --- | --- | --- | --- | --- | --- |
| Moon Head | Tattered-coat wanderer, plaster moon head with painted craters | H | none | coat/body base for Moonhead-style bodies → Skeleton/Alien Tourist | easy | crater readability at 0.5 m head scale |
| Traffic Cone Guy | Orange cone head+wrist bands on road-crew overalls | H | none | overalls body → Gnome/Knight bases | easy | cone tip vs nameplate overlap (nameplateY 2.45) |
| Skeleton Tourist | Bone-white skeleton, Hawaiian shirt, camera, sunhat | H | none | tourist accessory set → Alien Tourist | easy | thin limbs readability; keep chunky |
| Alien Tourist | Classic grey alien, bucket hat, lei, fanny pack | H | none | reuses tourist set + Moon Head body | easy | green skin vs palette clash — mute it |
| Disco Ball Head | Mirrored faceted head, velvet suit | H | `glow-pulse` on mirror sheen (emissive tint) | suit body → Cassette Punk | easy | mirror look via metalness+flat facets, no env-map dependency |
| Low-Poly Knight | Chunky toy knight, blunt sword, bucket helm | H | none | armor body → Vending/Kaiju chunky builds | easy | sword silhouette vs collision readability (cosmetic only) |

**Wave 2 — medium (shared rig + first real FX)**

| Avatar | Concept | Rig | Effects/materials | Reuse | Diff | Risks |
| --- | --- | --- | --- | --- | --- | --- |
| CRT Head | Beige box-TV head, animated static face, tracksuit | H | `crt-static` (FX_Screen emissive scroll) | Old Computer shares the screen-face module | med | static must read at distance without bloom blowout |
| Cassette Punk | Walkman-era punk, cassette head w/ spinning reels, denim+pins | H | `spin` (FX_Spin_L/R reels) | CRT body language | med | reel node naming discipline |
| Walking Mushroom | Portly fungus person, glowing gills, mossy cloak | H | `glow-pulse` (gills) | Gnome body chunk | med | cap silhouette vs nameplate |
| Garden Gnome | Classic gnome, oversized, tiny wheelbarrow? no — keep pure gnome | H | none | Mushroom body | easy-med | hat cone vs Traffic Cone rig reuse |
| Old Computer | Beige tower monitor-head terminal person, cardigan | H | `crt-static` variant (green phosphor) | CRT Head mesh family | med | same risk as CRT |
| Eyeball Creature | Giant eyeball body w/ stubby limbs, iris tracks idle | H | `spin` slow (FX_Iris) | none | med | iris axis orientation under leg swing |

**Wave 3 — harder builds (HH bulk, translucent/doll materials)**

| Avatar | Concept | Rig | Effects/materials | Reuse | Diff | Risks |
| --- | --- | --- | --- | --- | --- | --- |
| Deep-Sea Diver | Brass helmet, chest plate, air hoses | HH | `glow-pulse` (porthole) | Knight armor chunking | med-hard | bulk vs hip pivot (HH contract y≈0.4) |
| Porcelain Doll | Glazed ceramic body, gold repair seams (kintsugi) | H | none | doll dress → Mushroom silhouette family | med-hard | glazed look = clearcoat feel without transmission cost; cracks as texture (single 1k) |
| Cloud Person | Humanoid under a storm-cloud head, drizzle | H | `flicker` (inner lightning) | none | hard | lightning must be subtle; avoid seizure-risk strobing (bounded amplitude) |
| Tiny Kaiju | Chibi monster w/ dorsal plates | H | none | Knight chunk + Kaiju plates | med | tail needs to not read as a 5th leg |
| Sentient Street Lamp | Victorian lamppost body, glowing head | HH | `glow-pulse` (lamp head) — emissive only, no light | street lamp silhouette unique | med-hard | total height ~2.6 m, nameplateY 2.9; walk cadence for a post |
| Vending Machine | Vending-machine torso, stubby limbs, glowing front panel | HH | `glow-pulse` (front panel) | Old Computer paneling | med-hard | front-heavy silhouette readability while walking |

**Wave 4 — specialized (F rig, transparency, compositing)**

| Avatar | Concept | Rig | Effects/materials | Reuse | Diff | Risks |
| --- | --- | --- | --- | --- | --- | --- |
| Neon Jellyfish | Floating luminous dome, trailing tentacle forms | F | `glow-pulse` + `float` (tentacle sway) | F-rig debut | hard | translucency budget — fake it with emissive gradients, not transmission |
| Living Arcade Cabinet | Upright cabinet with animated marquee/screen | HH | `crt-static` (screen) | cabinet visual language from `src/arcade` | hard | must not be confused w/ real cabinets (smaller, has legs) |
| Astronaut Fishbowl | Orange suit, glass bowl w/ a tiny fish | H | `float` (fish orbit FX_Fish) | Diver helmet glass trick | med-hard | fish orbit inside bowl without clipping |
| Origami Person | Folded-paper faceted figure | H | none | flat-shading showcase | med | faceting must survive export normals |
| Black Hole | Dark figure, accretion-disk head ring | F | `flicker` + slow `spin` (disk) | none | hard | read as a head, not a hat; keep face-adjacent glow |
| Rubber Duck Mech | Duck-head mech, pistons, tugboat paint | HH | none | Kaiju chunk + Vending paneling | hard | comedic tone balance — keep proportions sincere |

**Build order rationale.** Wave 1 proves the pipeline with zero FX and maximum body
reuse; each wave introduces exactly one new technical dimension (FX nodes → HH bulk →
F rig/transparency). This matches the requested sequence with two swaps for reuse:
Old Computer moves before Eyeball (shares CRT's screen module), and nothing else moves.
The F rig lands last so the presenter's humanoid paths are battle-tested before the
floating variant needs them.

### D10 — Milestones

- **M1 — Architecture & registry.** Manifest + validation + tests; export script +
  committed projection; folders/docs skeleton. No runtime change.
- **M2 — Assignment & replication.** Node + Phoenix assignment, persistence, wire
  fields, parity fixtures; client consumes `avatar` and renders the procedural fallback
  for every id (agreement testable with two clients and zero assets).
- **M3 — Rig & import pipeline.** Blender shared rig template, loader/presenter/effects,
  verify script, hot-swap; **first 4 avatars** (Moon Head, Traffic Cone, Skeleton
  Tourist, Alien Tourist) authored, integrated, verified in-game.
- **M4 — Waves 1–2 complete** (Disco Ball, Knight; then CRT, Cassette, Mushroom, Gnome,
  Old Computer, Eyeball) with FX modules proven.
- **M5 — Waves 3–4 complete** (all 24 in the manifest, assignable, verified).
- **M6 — Polish & QA.** Profile panel name, README, docs/avatars.md final pass, perf
  pass with a crowded room, full test/build/browser verification, projection `--check`.

### D11 — Testing strategy

Node tests (`tests/avatar-definitions.test.js`, `tests/avatar-assignment.test.js`,
`tests/avatar-presenter.test.js`): manifest validation (dupes/weights/paths/rigs),
weighted pick distribution bounds and healing, presenter pure parts (rig node mapping
from a synthetic scene graph, fallback resolution, accent determinism). The GLB parse
path and three.js rendering are browser-verified (Blender MCP per-avatar step 8), since
Node tests can't render; `scripts/verify-avatar-assets.mjs` covers GLB contracts
headlessly (parse via the same three GLTFLoader in a Node-context import — cabinet tests
already exercise pure parts only, and the verifier is allowed to depend on three's
loader). Elixir: assignment/healing test, frames literal updates, projection ingestion
test. Existing presence tests updated for the additive field only where literals pin
shapes.

## Risks / Trade-offs

- [24 authored assets is the schedule risk] → waves with a shippable state after each;
  the system is complete at M3 (any subset of avatars is a working population).
- [MCP modeling quality varies per avatar] → preview renders + in-game screenshots are
  gates per avatar; the verify script fails fast on contract violations; house style is
  "stylized chunky low-poly", which MCP scripting produces reliably.
- [Procedural-animation contract too rigid for exotic avatars] → three rig kinds cover
  the set; graceful degradation (idle bob) is specified; nothing breaks gameplay.
- [Wire drift between Node and Phoenix] → parity fixtures + pinned frame tests, exactly
  like `nickname`; assignment outcomes may differ per stack by design (RNG), validation
  may not.
- [Repo growth from committed .blend + GLB] → budgets cap GLBs (~1.5 MB × 24 ≈ 36 MB
  worst case, typically far less flat-shaded); .blend sources are small at these poly
  counts; previews are 512² PNGs.
- [Crowded-room perf] → per-avatar budgets, material sharing across clones, emissive-only
  effects, on-demand loading; M6 includes an explicit crowded-room pass.
- [Players dislike their random avatar] → accepted v1 trade-off (D1); future opt-in
  re-roll rides the same persisted field, no schema change.

## Migration Plan

Deploy is additive: old clients ignore the new field; new clients fall back on old
servers; the Postgres migration is one nullable column; the Node players map grows a
field. Rollback = revert; persisted `avatar` values are simply unused by the old code.
No save-format change on the client (avatar comes from the server each session).

## Open Questions

Deferrable, none blocking implementation:

1. **Avatar display surface** — Visitor Pass line only (planned) vs also an arrival
   toast ("CopperLantern42 arrived as Disco Ball Head")? Default: profile line only.
2. **Rarity cosmetics** — whether `rare` avatars get any extra flourish beyond weights
   (e.g. particle shimmer) or stay purely probabilistic in v1. Default: weights only.
3. **Preview gallery** — whether the Places/profile UI ever shows the catalog; v1 ships
   `preview.png` files for docs/README use only.
4. **Future re-roll UX** — profile button, daily re-roll, or none. Schema supports all;
   decision can wait.
5. **Entity-backend path** — capsule proxies remain behind `?rt_binary=1` flags;
   upgrading them to authored avatars is a separate change if that path ever stabilizes.

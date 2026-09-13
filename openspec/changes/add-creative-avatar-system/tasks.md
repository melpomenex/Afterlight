# Tasks: add-creative-avatar-system

Tasks follow the milestone order in design D10. Blender MCP avatar tasks are strictly
sequential (one avatar finished cleanly before the next, per-avatar verification inside
the task).

## 1. M1 — Manifest, validation, projection (architecture)

- [x] 1.1 Create `shared/avatarDefinitions.js`: deep-frozen 24-entry manifest (schema per
      design D2, rig kinds `humanoid|humanoid-heavy|floating`) + `validateAvatarDefinitions()`
      (unique ids, positive weights, known rig kinds, asset path confined to
      `avatars/<id>/`, complete-or-rejected) + lookup/normalization helpers
      (`getAvatarDefinition`, `normalizeAvatarId`); verify
      `tests/avatar-definitions.test.js` passes covering valid catalog, each rejection
      case, and append-only lookup stability
- [x] 1.2 Create `scripts/export-avatar-definitions.mjs` writing the committed
      `server_elixir/priv/avatar_definitions.json` (id/name/rig/weight/rarity subset)
      with `--check` drift mode, mirroring `scripts/export-place-definitions.mjs`; verify
      plain run writes, `--check` passes clean, and a tampered file fails `--check`
- [x] 1.3 Create the asset/doc skeleton: `assets-blender/avatars/_shared/` and
      per-avatar directories, `public/avatars/` tree, `docs/avatars.md` stub with the
      naming/orientation/budget contracts from design D3/D7/D8; verify paths exist and
      the doc renders coherent markdown

## 2. M2 — Server assignment + replication (both stacks)

- [x] 2.1 Create `server/avatars.js` (Node): `ensureAvatar(player)` validate-or-assign
      with `crypto`-seeded weighted pick from the shared manifest, persisted via
      `storage.savePlayer`; wire into the HELLO handler beside nickname resolution; verify
      `tests/avatar-assignment.test.js` covers first-assign distribution bounds,
      stickiness, healing of retired ids, and client-supplied avatar being ignored
- [x] 2.2 Add `avatar` to Node presence join/roster shapes (`server/world.js`
      `presence_join.player` and join-roster entries only, never flush); verify updated
      Node presence tests and a manual two-client dev:stack check agree on the field
- [x] 2.3 Phoenix: Postgres migration adding nullable `players.avatar`, Ash attribute +
      upsert fields, ingestion of `priv/avatar_definitions.json`, assignment/healing in
      `Gateway.Welcome.ensure_player`; verify `mix test` covers assign/stick/heal and
      `Normalize.to_legacy_player` passes `avatar` through
- [x] 2.4 Phoenix presence: thread `:avatar` through `GameChannel.finish_hello` assigns →
      `World.join/7` → `RoomServer` member → `Frames.roster_entry` (join shapes only);
      update pinned `frames_test.exs` literals; verify Elixir world tests pass and
      parity fixture for the catalog projection (`tests/fixtures/parity/`) is consumed by
      both a Node test and the Elixir ingestion test
- [x] 2.5 Client consumes assignment with fallback only: read `avatar` from
      `welcome.player`, presence join and roster; render the procedural avatar
      regardless (authored rendering lands in M3); verify `npm test`, `npm run build`,
      and a two-browser dev:stack smoke where both clients log the same assignment

## 3. M3 — Rig, loader/presenter/effects, import pipeline, first avatars

- [x] 3.1 Build `assets-blender/avatars/_shared/AL_SharedRig.blend` via Blender MCP:
      contract node hierarchy (`AL_Rig/AL_Root/AL_Head/AL_Arm_L/AL_Arm_R/AL_Leg_L/AL_Leg_R`
      at design D3 heights), starter materials (`MAT_Body`, `MAT_Accent`), and a
      mannequin test mesh; export `public/avatars/_test/mannequin.glb` and verify the
      node names, orientation (+Z forward), ground origin and meter scale survive export
- [x] 3.2 Create `src/avatars/loader.js`: per-id template cache (single in-flight fetch,
      one retry, named `unavailable` result), contract validation by node name,
      `instantiate(id)` clone with material cloning only for tint/FX materials; verify
      `tests/avatar-presenter.test.js` covers cache dedupe, missing-node degradation
      flags, and fallback resolution against a synthetic scene graph
- [x] 3.3 Create `src/avatars/presenter.js` + `src/avatars/effects.js`:
      `createAvatarFor(playerId, nickname, avatarId)` returning a group with the exact
      `userData.legs/arms/rig/nameSprite` contract (GLTF nodes mapped; procedural
      fallback path preserved), `applyAvatar()` hot-swap preserving position/seat/camera,
      deterministic `accentColorFor(playerId)` tint on declared materials, and the effect
      registry (`crt-static`, `glow-pulse`, `spin`, `flicker`, `float`); verify presenter
      tests pass and effects mutate only declared materials/nodes
- [x] 3.4 Integrate: `main.js` local avatar creation and `RemotePlayersManager.setPlayer`
      route through the presenter; frame loops call effect updates; `set_nickname`
      WELCOME keeps avatar stable; verify `npm test`, `npm run build`, and browser smoke:
      local player renders the mannequin GLB (temporary self-assign), remote fallback
      intact, walk/sit/hop/emote/first-person all behave
- [x] 3.5 Create `scripts/verify-avatar-assets.mjs`: parse each registered GLB, enforce
      naming contract, ≤8k tris, ≤4 materials, ≤2×1024² textures, ≤3 MB, ground origin,
      +Z forward; named per-id failures; verify it passes the mannequin and fails a
      deliberately broken fixture
- [x] 3.6 Avatar — **Moon Head** via Blender MCP (concept → model → rig → materials →
      preview render → GLB export → verify script → registry entry + projection regen);
      verify in-game with two clients: same avatar both sides, walk/sit/emote/hop,
      reload keeps assignment
- [x] 3.7 Avatar — **Traffic Cone Guy** (same pipeline and verification gates as 3.6)
- [x] 3.8 Avatar — **Skeleton Tourist** (same pipeline and verification gates)
- [x] 3.9 Avatar — **Alien Tourist** (same pipeline and verification gates; confirm
      tourist accessory reuse from 3.8)

## 4. M4 — Waves 1–2 completion

- [x] 4.1 Avatar — **Disco Ball Head** (first `glow-pulse` effect in production; verify
      pulse is emissive-only and bloom stays controlled in-game)
- [x] 4.2 Avatar — **Low-Poly Knight** (verify chunky armor body becomes a reuse base)
- [x] 4.3 Avatar — **CRT Head** (first `crt-static` screen face; verify screen reads at
      distance without bloom blowout, per design risk note)
- [x] 4.4 Avatar — **Cassette Punk** (first `spin` effect on reels; verify reel nodes
      named per contract)
- [x] 4.5 Avatar — **Walking Mushroom** (`glow-pulse` gills; verify cap vs nameplate)
- [x] 4.6 Avatar — **Garden Gnome** (verify cone/hat rig reuse from 3.7)
- [x] 4.7 Avatar — **Old Computer** (reuses CRT screen module; phosphor variant)
- [x] 4.8 Avatar — **Eyeball Creature** (slow `spin` iris; verify iris orientation under
      leg swing)
- [x] 4.9 Wave gate: `npm test`, `npm run build`, verify script green for all 12,
      crowded-room browser pass (8+ distinct avatars via multiple clients), projection
      `--check` clean

## 5. M5 — Waves 3–4 completion

- [x] 5.1 Avatar — **Deep-Sea Diver** (first `humanoid-heavy` rig in production; verify
      hip pivot contract at y≈0.4)
- [x] 5.2 Avatar — **Porcelain Doll** (glazed + crack texture within texture budget;
      verify single ≤1024² texture only)
- [x] 5.3 Avatar — **Cloud Person** (`flicker` lightning; verify bounded amplitude — no
      strobing)
- [x] 5.4 Avatar — **Tiny Kaiju** (verify tail readability vs legs)
- [x] 5.5 Avatar — **Sentient Street Lamp** (verify 2.6 m silhouette, nameplateY 2.9,
      emissive-only lamp head)
- [x] 5.6 Avatar — **Vending Machine** (verify front-heavy silhouette reads while
      walking)
- [x] 5.7 Avatar — **Neon Jellyfish** (first `floating` rig in production; verify
      `float` bob + tentacle sway and legless sit/hop behavior)
- [x] 5.8 Avatar — **Living Arcade Cabinet** (verify distinctness from real cabinets)
- [x] 5.9 Avatar — **Astronaut Fishbowl** (verify fish orbit stays inside bowl)
- [x] 5.10 Avatar — **Origami Person** (verify faceted normals survive export)
- [x] 5.11 Avatar — **Black Hole** (verify disk `spin`/`flicker` reads as a head)
- [x] 5.12 Avatar — **Rubber Duck Mech** (verify comedic proportions stay readable)
- [x] 5.13 Wave gate: full 24-avatar verify-script run, `npm test`, `npm run build`,
      projection `--check`, multi-client browser pass across rig kinds

## 6. M6 — Polish, docs, QA

- [x] 6.1 Visitor Pass profile line shows the assigned avatar name (from
      `welcome.player.avatar` → manifest name); verify in browser incl. fallback
      (no avatar → line hidden or "Visitor")
- [x] 6.2 Finalize `docs/avatars.md` (Blender MCP authoring workflow, contracts,
      budgets, export settings, per-avatar special hooks) and README player-facing note
      (avatars, assignment, no user choice in v1); verify docs match the shipped
      pipeline by walking a doc-driven dry-run of adding a fictional avatar
- [x] 6.3 Performance pass: crowded-room frame check with authored avatars (draw calls,
      material clones, texture memory via renderer info); confirm budgets hold and no
      per-frame allocations in effects; record numbers in the change notes
- [x] 6.4 Full verification sweep per AGENTS §10: `npm test`, `npm run build`,
      dev:stack two-browser gameplay smoke (join/leave/travel/reload avatar agreement,
      fallback on blocked asset path, emotes/sitting/jumping/camera), Elixir `mix test`,
      projection `--check`; report honestly what was and was not verified

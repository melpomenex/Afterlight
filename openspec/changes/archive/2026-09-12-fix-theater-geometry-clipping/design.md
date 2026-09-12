## Context

See `proposal.md` — Why. Constraints that shape the approach:

- The first-person camera renders with `near = 0.1` and is a fixed offset of a collision-constrained position: it can never enter geometry only if every solid form is in the world's 2D obstacle list. `block(x, z, w, d)` stores half-extents plus 0.38 actor clearance, so a blocked visual face always stays 0.38 ahead of the eye — comfortably outside the near plane.
- The walking eye bob (`player.position.y = sin(t*13) * 0.025`, eye 1.55) moves the standing eye between 1.525 and 1.575, which is what makes fixtures whose bottom edge sits at ~1.575 flicker as the player passes.
- Collision is flat rectangle-based; there is no height-aware collision, and this change does not add any.
- `buildTheaterScenery` (`src/world/theaterWorld.js`) authors the theater geometry and pushes obstacles through the world factory's `block()`; the generic legacy gate slabs (west/east/south) are built in `main.js` when `def.shell !== 'none'` and have no collision.
- Existing gates: `tests/orpheum-arcade.test.js` (5 cabinets, 48 seats, sightlines, anchors, routes), `tests/districts.test.js` (theater reachability, stand-up spots, batching), plus p3/p4/air-hockey/foosball placement tests. These must keep passing without weakened assertions.

## Goals / Non-Goals

**Goals:**

- The first-person camera (standing or seated) can never be inside theater scenery; the observed gold-trim flicker and near-plane slicing stop.
- No visibly interpenetrating theater prop remains, and no orphaned fixture from a relocated activity remains.
- Every adjustment is auditable and regression-tested: solid coverage, pad layout, gate/booth separation, and preserved navigation.

**Non-Goals:**

- No renderer, near-plane, or eye-bob changes; no height-aware collision; no camera inset decoupled from the avatar.
- No collision or gate-visual changes for other legacy districts (their walk-through slabs stay as they are).
- No manifest exit, gate topology, seed, spawn, save-schema, networking, or media changes; activity anchors stay as declared.
- No seated seat-back clipping fix (the chair is an intentional volume the player occupies).
- No art-direction restyle beyond the minimal proscenium/booth/trim offsets the fix requires.

## Decisions

### D1. Make scenery solid rather than change the camera

Keep `fpCamera.near = 0.1` and the eye bob; add collision for every solid form that reaches the eye band inside the walkable area.

- *Why*: the camera contract only holds when collision covers the visuals; `block()`'s 0.38 clearance already exceeds the near plane with margin.
- *Alternatives rejected*: lowering the near plane does not fix a camera that is fully inside an object and costs depth precision; clamping the camera away from walls decouples view from avatar, masking only some cases; per-object "fade when close" is a rendering workaround for a collision hole.

### D2. Block the architectural shell line, fixtures per-volume

Add obstacles for the theater's shell and fixtures:

- North wall line: `block(0, -9.55, 23.4, .3)` — covers the baseboards, niched paintings, sconces, frieze, and cornice trim that all sit on the wall plane and previously sat inside the walkable band.
- South return wall: `block(0, 10.15, 23.4, .3)` — covers the poster cases and casing.
- West gallery wall: `block(-11.5, -1.4, .3, 15.6)` — covers the pilasters (east face -11.28), wainscot, sconces, and gilded mouldings in one pass.
- East side (no continuous wall): per-fixture blocks for the three sconce assemblies, the marquee board/brass frame, and the four gilded exit pilaster casings (`x ≈ 11.08`, `z = ±2.6`) plus the exit header.
- Proscenium: one block per side covering the reveal bar, pier, and drapery band (see D4), plus the existing stage block.
- Gate arches/portals: block the slab volumes for the theater's three exits (see D6).

Low props — floor runners and rugs, the low stage-lip steps, aisle studs — stay non-blocking. Rationale: the 0.38 clearance added by `block()` is the actor radius, so coverage is exact and the established contract is not double-expanded.

### D3. Floor pads become a declarative, testable table

Extract the floor carpet/runners/rugs into an exported pure table (e.g. `THEATER_FLOOR_PADS`: `{ id, kind: 'carpet' | 'runner' | 'rug', x, z, w, d }`) and render pads from it (carpet keeps its textured material; runners/rugs keep the dark laminate at the existing heights). Brass borders are drawn from the owning runner rect.

- *Why*: the orphaned darts oche is an accent runner overlapping the Summit Run accent runner; a table lets a test assert accent-vs-accent non-overlap and permanently prevents that bug class without parsing batched geometry.
- The stale oche has no entry: the darts activity moved to the west wall and its own renderer draws its oche.
- Base carpet may still sit under runners and rugs (intentional layering); tests allow base-vs-accent overlap and forbid accent-vs-accent overlap.

### D4. Pull the proscenium side assembly north and slim the pier

The Pong cabinet's first standing anchor `(9.3, -7.35)` sits inside the current pier (`x 7.75..9.35`, `z -8.8..-7.1`), and the drapery reaches `z -7.6`. Move the proscenium side assembly (reveal bar, pier, side drape, drape folds) north so no solid face crosses `z = -7.8` in the side bays, and give it collision ending at `z ≈ -7.47`:

- Pier: depth 1.2 at `z = -8.45` (`z -9.05..-7.85`).
- Side drape cylinder: `z = -8.9` (reach `-8.0`); folds follow at `z ≈ -8.45`.
- Reveal bar: same northward shift so its south face is at `z ≤ -7.8`.
- Collision per side: `block(±8.55, -8.45, 3.3, 1.2)` covers `x ≈ 6.52..10.58`, `z -9.43..-7.47`.

Result: the anchor keeps ≥0.45 from the pier face and ≥0.65 from the drape, is outside every inflated obstacle, and the standing spot is reachable from the south aisle.

- *Alternatives rejected*: moving the manifest anchors ripples into server proximity checks and the other machines' queues; adding raw obstacles with less than 0.38 clearance breaks the block contract the tests share.

### D5. Separate the projection booth from the market gate visual

Keep the frozen gate at `(0, 8.8)`; move the booth body, shelf/lens, beam origin, and its obstacle south and slimmer so no booth geometry crosses the arch's south face (`z = 9.1`):

- Booth body: `z = 9.85`, depth 1.0 (visual `z 9.35..10.35`), `block(0, 9.85, 2.3, 1.0)`.
- Lens and beam origin follow to `z ≈ 9.22`; beam target and the screen are unchanged.
- The landmark signal at `(0, 7.6)` and the gate interaction approach stay clear; the booth's rear embed in the south wall is unchanged in kind.

- *Alternative rejected*: authoring/demoting the generic south arch (touches every legacy place's visuals for a theater-only defect).

### D6. One source of truth for legacy gate visual volumes

Extract the generic gate arch/portal box parameters into a pure helper in `src/places/worldFactory.js` (derived from `def.exits`), use it in `main.js` to build the meshes (identical output for all legacy districts), and use the same volumes in the theater builder to add its gate collision.

- *Why*: the collision must not drift from the rendered slab; a shared pure helper is testable and makes the theater the only place that opts into blocking them.
- Other legacy districts keep their current walk-through slabs; that is explicitly out of scope.

### D7. Offset wall trim off its wall plane

Move the four west-gallery gilded panel mouldings out of the wall volume so their visible face is proud of the wood panel face (east face at `x ≈ -11.41` instead of the current exact-coplanar `-11.47`). The new west wall collision keeps the camera far from them; the offset removes the z-fight for every camera mode.

Audit for the same defect elsewhere (any gold trim whose visible face exactly coincides with its wall face) and fix by the same small proud offset.

### D8. Verification strategy

- New `tests/theater-scenery.test.js`:
  1. Floor-pad table: no accent runner overlaps another accent runner; no pad occupies the retired oche footprint; base carpet may underlay accents.
  2. Solid coverage: a declared `THEATER_SOLID_VOLUMES` list (the volumes the builder blocks) is represented in `world.obstacles` with matching centers and half-extents (within epsilon), proving each tall form is solid.
  3. Clearance math: every solid volume's obstacle half-extent is at least the visual half-extent plus 0.38 (the actor/near-plane margin contract).
  4. Booth/gate separation: the booth visual rect and the south gate visual rect do not intersect; the Pong slot-0 anchor is outside every proscenium obstacle.
  5. Reachability: production `isWalkable` flood-fill from the theater spawn reaches all 48 seats, activities, both district gates, and the landmark approach; every seat's stand-up spot is free.
- Extend `tests/orpheum-arcade.test.js` expectations so anchors/dismounts/routes are checked against the new obstacles (no assertion is weakened; the sightline test is unchanged).
- `tests/districts.test.js` theater cases must keep passing unchanged.
- Browser/manual pass (AGENTS.md §10): first-person walk along the east promenade and west gallery, into the proscenium, both wall lines, and every gate; confirm no near-plane slicing and no flicker; inspect the south lobby and Summit Run bay; capture before/after screenshots when browser tooling is available.

## Risks / Trade-offs

- [West wall collision narrows the west promenade by ~0.5 m] → the promenade stays ≈2.4 m wide (> the 1.2 m route contract); the flood-fill and route tests enforce it.
- [Proscenium/booth offsets change the composition] → offsets are small and northward/backward; existing sightline tests plus the manual visual pass cover readability.
- [Pad-table refactor changes floor rendering] → pads keep their current materials/heights; the build must still batch and the visual pass checks the carpet/runner look.
- [More obstacles could trap Kiln's direct follow] → routes stay broad and the smoke walk exercises follow.
- [Other legacy districts still allow walking through gate slabs] → documented non-goal; this change is theater-scoped.
- [A shared gate-visual helper could change existing district visuals] → the helper returns the exact current positions/scales for the frozen exits; tests and a visual check compare.

## Migration Plan

No data or API migration; no save-schema impact. Rollback is reverting the change. The scenery rebuild is deterministic from explicit seeds and constants, so no persistent state is touched.

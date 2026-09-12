## Why

Two families of geometry defects are visible in The Orpheum: gilded wall decoration flickers — "clips in and out" — while walking, and scenery pieces visibly run through each other.

The first-person camera renders with `near = 0.1` and is only kept out of scenery by collision, but most of the theater's tall decor has no collision: proscenium piers and velvet drapery, the gilded exit pilasters, the east-wall sconce assemblies and marquee board, the gate arch/portal slabs, and the theater's own wall lines all extend inside the walkable band unblocked, so the camera enters them and the near plane slices them away. The standing avatar also bobs to eye height ~1.575, which crosses the bottom edge of the east sconce frames (bottom ~1.575) and makes exactly those gold pieces pop in and out while walking. The west gallery's gilded panel mouldings are also modeled exactly coplanar with the wood panel face, so they z-fight from any camera position.

Props intersect as well: the lobby darts oche runner was left behind when the darts activity moved to the west wall, and now cuts across the Summit Run bay runner and its brass border; the projection booth is built through the south market gate's arch and glowing portal; and the Pong cabinet's first standing anchor sits inside the proscenium pier.

## What Changes

- **Solid theater scenery**: give the auditorium's solid forms real collision so neither the actor nor the first-person camera can occupy them — the north/south/west wall lines, the proscenium piers and drapery, the gilded exit pilasters, east-wall sconce/marquee fixtures, and the gate arch/portal volumes. Low decorative litter (floor runners, stage steps, low props) stays non-blocking.
- **Prop intersection fixes**: remove the stale lobby darts oche (the west-wall darts activity draws its own), separate the projection booth from the south gate visual, and shift/slim the proscenium so the Pong standing anchor clears solid geometry.
- **Stable wall trim**: offset the west gallery's gilded panel mouldings proud of the wall plane so no two visible surfaces are coplanar and the trim stops flickering.
- **Declarative floor pads + regressions**: extract the theater's floor pads into a small pure table (base carpet vs accent runner) so tests can prove no accent runner overlaps another, and assert every tall fixture inside the walkable band is collision-covered; keep the existing reachability, stand-up, anchor, sightline, and ≥1.2 m route guarantees intact.
- No interaction, save-data, network, HUD, or screen/media behavior changes.

## Capabilities

### New Capabilities
- `theater-scenery-presentation`: the Orpheum's physical scenery — solid collision coverage for walkable-band forms, non-interpenetrating prop layout, and stable (non-coplanar) wall trim under camera motion.

### Modified Capabilities
<!-- None: camera-views' existing first-person requirements stay true; this change makes them hold in the theater rather than altering the spec. -->

## Impact

- `src/world/theaterWorld.js`: wall/proscenium/drape/east-fixture/gate collision, stale oche removal, proscenium reshape, booth reposition, trim offsets, floor-pad table and solid helper.
- `src/places/worldFactory.js`, `src/main.js`: extract the legacy gate-arch visual extents into one shared pure helper so the theater's gate collision cannot drift from the rendered slabs; no visual or behavior change for other districts.
- Tests: `tests/orpheum-arcade.test.js`, `tests/districts.test.js`, new `tests/theater-scenery.test.js`; existing assertions are extended, never weakened.
- No save schema, manifest seed/reorder, gate topology, multiplayer, or media changes.

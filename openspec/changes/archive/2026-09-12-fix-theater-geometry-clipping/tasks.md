## 1. Baseline and shared gate volumes

- [x] 1.1 Run the existing suite (`npm test`) and record the theater-related tests (`orpheum-arcade`, `districts`, `p3-gate`, `p4-gate`, `air-hockey-view`, `foosball-view`) as a green baseline before any edit
- [x] 1.2 Add a pure gate-visual volume helper to `src/places/worldFactory.js` (arch/portal box parameters per declared exit, derived from `def.exits`) and assert in a test that west/east/market returns the exact historical positions and scales
- [x] 1.3 Switch `main.js` `getOrCreateDistrictWorld` to build the legacy gate slabs from that helper with no output change; verify all place tests still pass and the courtyard/canal/theater gate slabs render unchanged in the manual pass

## 2. Floor pads table and orphaned prop removal

- [x] 2.1 Extract the theater's carpets/runners/rugs into an exported `THEATER_FLOOR_PADS` table and render pads from it (same materials/heights); verify the theater builds and `tests/districts.test.js` still passes
- [x] 2.2 Delete the orphaned lobby darts oche (runner plus brass strips) from `src/world/theaterWorld.js`; verify no pad occupies its footprint and the Summit Run bay runner and border are intact via the new pad test

## 3. Solid theater scenery

- [x] 3.1 Declare the theater's solid volumes (`THEATER_SOLID_VOLUMES`) and block the north wall line, south return wall, and west gallery wall; verify each obstacle exists with at least the visual half-extent plus 0.38 clearance
- [x] 3.2 Block the east-side fixtures — the three sconce assemblies, the marquee board/frame, and the gilded exit pilasters/header; verify the east promenade stays ≥1.2 m wide and every Summit Run/Downhill anchor and dismount stays collision-free
- [x] 3.3 Pull the proscenium reveal, pier, and drapery north (no solid face past `z = -7.8` in the side bays) and block the side band; verify the Pong slot-0 anchor is outside every obstacle, ≥0.38 from the pier/drape visuals, and reachable from the south aisle
- [x] 3.4 Block the theater's three gate arch/portal volumes using the shared helper; verify each gate still has an approachable spot within interaction range and within 1.8 units of the flood-fill route

## 4. Remaining prop intersections and trim

- [x] 4.1 Move the projection booth body, shelf/lens, beam origin, and obstacle south/slimmer so no booth geometry crosses the south arch's south face (`z = 9.1`); verify the booth rect and gate visual rects do not intersect, and the market gate and projector landmark approaches stay reachable
- [x] 4.2 Offset the west gallery gilded panel mouldings proud of the wall face and audit for any other exactly coplanar wall trim, fixing by the same small offset; verify numerically that no trim face coincides with its wall face

## 5. Regression tests

- [x] 5.1 Create `tests/theater-scenery.test.js` covering pad non-overlap, solid-volume obstacle coverage and clearance math, booth/gate separation, Pong anchor freedom, and production `isWalkable` reachability of all seats/activities/gates/landmark plus free stand-up spots; verify `node --test tests/theater-scenery.test.js` passes
- [x] 5.2 Extend `tests/orpheum-arcade.test.js` so anchor/dismount/route assertions run against the new obstacles without weakening any existing check; verify the file passes
- [x] 5.3 Run the full `npm test` and `npm run build`; resolve real failures and confirm no new build errors beyond the known chunk-size warning

## 6. Visual verification and docs

- [x] 6.1 Browser pass in first person: walk the east promenade, west gallery, proscenium corner, both wall lines, and every gate; confirm no near-plane slicing and no flickering gold trim; capture before/after screenshots
- [x] 6.2 Isometric pass: inspect the south lobby (booth/gate), proscenium, Summit Run bay, and floor pads for floating, embedded, or missing props; confirm the composition still reads
- [x] 6.3 Traversal regression: travel to the theater, sit and stand, travel away and back, and reload; confirm objective/completion visuals, seats, gates, and the screen overlay still behave
- [x] 6.4 Update the theater builder's header comment and the place-authoring collision guidance (`docs/places.md`) to state the solid-scenery/solid-volume convention; verify the docs match the implemented tables

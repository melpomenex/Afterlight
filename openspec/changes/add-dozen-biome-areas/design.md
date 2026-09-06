## Context

Afterlight's world rendering relies on procedural Three.js geometry, instanced static box batching, and simple axis-aligned 2D collision rectangles (`block(x, z, w, d)`) on a flat `y=0` plane. The game currently supports four base areas (`court`, `canal`, `garden`, `station`) in `src/districts.js` alongside the expanded multiplayer Market Court and Cultivation Garden rooms.

To fulfill the user request of adding a dozen more explorable levels representing diverse biomes while honoring the guidelines in `AGENTS.md`, we must design an architecture that scales cleanly to 16+ districts without code duplication, memory degradation, or navigation deadlocks.

See `proposal.md` for motivation and high-level feature scope.

## Goals / Non-Goals

**Goals:**
- Implement 12 distinct atmospheric biome districts (`aqueduct`, `caldera`, `understory`, `saltworks`, `rooftops`, `mangrove`, `trestle`, `foundry`, `frost-spire`, `delta`, `archives`, `kiln-terrace`), each with custom procedural architecture, lighting, animated environmental props, field notes, and interactive landmark restoration.
- Refactor district scene generation in `src/districts.js` from chained `if/else` checks into a modular builder dispatch table (`DISTRICT_BUILDERS`), throwing explicitly for unrecognized district IDs.
- Ensure all landmark objectives, notes, and east/west gates have verified collision-free paths with at least 1.5 units clearance.
- Batch repetitive static geometry into `THREE.InstancedMesh` per world while isolating dynamic and emissive animated elements.
- Expand `tests/districts.test.js` to systematically flood-fill test reachability, actor spawn clearances, and batching across all 16 districts.
- Update UI travel dialogs and minimap SVG vector schematics to accommodate the expanded roster of districts responsively.

**Non-Goals:**
- No 3D physics engines (e.g. Cannon/Ammo) or navmesh elevation systems; movement remains flat rectangular collision at `y=0`.
- No external GLTF/OBJ 3D asset downloads; all assets remain strictly procedural Three.js geometry in keeping with the art style.
- No modifications to the multiplayer market economy or crop farming systems; the biomes focus on exploration, atmosphere, and restoration.

## Decisions

### Decision 1: Builder Dispatch Table (`DISTRICT_BUILDERS`)
- **Choice**: Replace the `if (def.id === 'canal') ... else if (def.id === 'garden') ... else` pattern with a dictionary map:
  ```js
  const DISTRICT_BUILDERS = {
    canal: buildCanalWorld,
    garden: buildGardenWorld,
    station: buildStationWorld,
    aqueduct: buildAqueductWorld,
    caldera: buildCalderaWorld,
    understory: buildUnderstoryWorld,
    saltworks: buildSaltworksWorld,
    rooftops: buildRooftopsWorld,
    mangrove: buildMangroveWorld,
    trestle: buildTrestleWorld,
    foundry: buildFoundryWorld,
    'frost-spire': buildFrostSpireWorld,
    delta: buildDeltaWorld,
    archives: buildArchivesWorld,
    'kiln-terrace': buildKilnTerraceWorld,
  };
  ```
- **Rationale**: Prevents accidental fallback to the station builder when new IDs are added. Ensures modularity, clean maintenance, and explicit error throwing if an unknown district ID is passed.
- **Alternatives considered**: Continuing the `if/else if` chain (error-prone and unreadable with 16 districts).

### Decision 2: Thematic Biome Architecture & Prop Families
Each biome will feature a curated palette of colors, materials, and 2-3 characteristic prop families:
1. `aqueduct`: Wet limestone channels (`#46585c`), copper pipe conduits, arched stone aqueduct pillars, dripping sluice grates.
2. `caldera`: Dark basalt rock (`#1f2425`), copper thermal vents, glowing sulfur fissures (`#ffcc44`), rising steam plumes.
3. `understory`: Rich damp soil (`#2c241e`), giant shelf fungus ledges (`#885544`), glowing mycelial nodes (`#77eebb`).
4. `saltworks`: Brilliant white salt flats (`#eef2f3`), cedar drying trellises (`#9a7d5a`), brine concentration pans, wind pumps.
5. `rooftops`: Weathered zinc roofing (`#5e6c70`), copper lightning rods, timber plank catwalks (`#846d53`), spinning anemometers.
6. `mangrove`: Submerged mossy masonry (`#32463e`), stilted timber boardwalks (`#6e5b47`), interlocking root arches.
7. `trestle`: Heavy rusted iron railway girders (`#6e3b2e`), weathered oak rail ties (`#443831`), suspended crane counterweights.
8. `foundry`: Dark cast iron foundry floors (`#26262b`), red iron ore heaps (`#7c3b2f`), cooled slag troughs, glowing smelting hearth (`#ff6622`).
9. `frost-spire`: Glacial blue granite (`#5c6e7a`), cracked translucent frosted glass panels (`#b8d8e8`), alpine pine bushes.
10. `delta`: Soft river silt bars (`#635a4a`), timber pile moorings, marsh cattail clusters (`#4f5c3b`), stranded skiff hull.
11. `archives`: Towering stone bookshelves (`#38393b`), leather-and-paper catalog crates (`#785f47`), brass reading lamps (`#e0b85a`).
12. `kiln-terrace`: Warm terracotta brick tiles (`#aa5939`), circular adobe firing kilns (`#bd744f`), bronze water basins (`#c29452`).

### Decision 3: Collision Layouts and Breadth First Search Reachability
- **Choice**: Design every district layout with guaranteed corridor widths of $\ge 1.5$ units between rectangular obstacles.
- **Rationale**: The actor collision clearance model expands obstacle half-extents by `+0.38`. Tight single-unit chokepoints can inadvertently block passage or pin the companion robot.
- **Verification**: `tests/districts.test.js` runs a grid-based BFS flood-fill from each district's spawn point to ensure the player can reach:
  - West exit gate (`x = -10.7, z = 0`)
  - East exit gate (`x = 10.7, z = 0`)
  - Field note stand
  - Interactive landmark

### Decision 4: Instanced Static Batching with Preserved Dynamic Elements
- **Choice**: The shared `buildDistrict` wrapper collects all static opaque box meshes and batches them into a single `THREE.InstancedMesh`. Animated elements, emissive restoration indicators, transparent glass/water, and point lights are retained as individual scene nodes under the district `group`.
- **Rationale**: Keeps total draw calls per district under 25, preserving 60 FPS even on low-end hardware.

### Decision 5: Responsive District Selection Dialog
- **Choice**: Update the CSS and DOM structure for the district modal (`#district-dialog` or similar) to use CSS grid (`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`) with a scrollable container (`max-height: 70vh; overflow-y: auto;`).
- **Rationale**: Accommodating 16 districts in a fixed-height modal would overflow and cut off options on mobile viewports or smaller preview windows.

## Risks / Trade-offs

- **[Risk] Memory pressure from caching 16 district scenes** → **Mitigation**: Geometry is shared (`THREE.BoxGeometry(1, 1, 1)` and shared standard materials per color via `materialCache`). Worlds are lazy-built on initial entry, so unvisited biomes consume no scene memory.
- **[Risk] Path obstruction due to complex props** → **Mitigation**: Every biome adheres to an open central corridor layout. Automated reachability tests validate that the flood-fill path reaches within $1.8$ units of all targets.
- **[Risk] Broken camera visibility from tall props** → **Mitigation**: Props in the foreground ($z > 6$) are kept low ($\le 0.8$ height) so they never occlude the player or landmark in the isometric orthographic projection.
- **[Risk] Save file corruption on legacy saves** → **Mitigation**: `readExploration()` filters IDs against the full valid district list and provides automatic default arrays for missing keys.

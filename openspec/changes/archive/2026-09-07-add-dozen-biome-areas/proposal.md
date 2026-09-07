## Why

Afterlight's evocative, rain-soaked isometric world is built around atmospheric exploration, quiet companionship, and visible acts of environmental restoration. Currently, player exploration is confined to a handful of introductory areas (the Rain Court, Sluiceworks, Glass Garden, and Last Platform / Market & Cultivation). Players need a vast, interconnected frontier of diverse industrial and natural biomes to explore, discover forgotten lore, and restore life and function across the sleeping city. Adding twelve distinct biomes dramatically expands the scope of exploration while staying faithful to Afterlight's distinctive procedural Three.js aesthetic and humane tone.

## What Changes

- **Twelve New Biome Districts**: Introduce 12 fully realized atmospheric biome districts spanning subterranean, industrial, overgrown, high-altitude, and waterborne environments:
  1. `aqueduct`: The Sunken Aqueduct (subterranean cisterns, dripping stone sluices, echoing puddles)
  2. `caldera`: The Boiler Caldera (geothermal vents, basalt fissures, glowing sulfur deposits, steam flues)
  3. `understory`: The Spore Understory (bioluminescent fungal forest, damp loam, giant shelf mushrooms)
  4. `saltworks`: The Bleached Saltworks (brine evaporation pans, drying trellises, crystalline salt flats, wind pumps)
  5. `rooftops`: The High Awnings (windward scaffolding, suspension catwalks, billowing canvas, copper roof ribs)
  6. `mangrove`: The Brackish Basin (flooded brick foundations, timber boardwalks, twisted mangrove stilt roots)
  7. `trestle`: The Overgrown Trestle (ancient iron railway viaduct tangled in canopy roots, hanging work cranes)
  8. `foundry`: The Rustfall Foundry (red ore dust, cooled slag channels, towering blast furnaces, iron slag heaps)
  9. `frost-spire`: The Glacial Glasshouse (shattered high-altitude conservatory, frost crystals, hardy alpine shrubs)
  10. `delta`: The Reclaimed Marshes (cattail reeds, silt sandbars, half-submerged flatboats, timber tide weirs)
  11. `archives`: The Paper Catacombs (towering water-damaged stone bookcases, brass card catalogs, amber study lamps)
  12. `kiln-terrace`: The Solar Kiln (baked terracotta tiles, parabolic reflectors, warm adobe kilns, courtyards)
- **Procedural 3D Environment Builders**: Implement modular, distinct procedural builders for each biome featuring custom geometry, instanced static batches, unique prop families, and dedicated obstacle collision layouts complying with navigation rules.
- **Atmospheric Visuals & Dynamic Elements**: Unique fog colors, directional sunlight tints, and dynamic animated details for each biome (e.g. drifting spores, pulsing vents, spinning anemometers, rising steam, glowing slag, ripple reflections).
- **Landmark Restoration & Field Notes**: Each biome features an accessible field note carrying quiet, evocative lore and a landmark restoration objective that triggers visible physical changes upon completion.
- **Exploration Persistence & Travel UI**: Seamless integration into the save system (`afterlight-save`), district fast-travel modal with a responsive scrollable grid, and custom SVG minimap schematics for all 12 biomes.

## Capabilities

### New Capabilities
- `biome-districts`: Central registry, metadata, spawn points, and audiovisual palettes for 12 distinct biome districts.
- `biome-environment-generation`: Procedural 3D geometry builders, collision boundary layouts, instanced mesh batching, and animated props for all 12 biomes.
- `biome-exploration-mechanics`: Landmark restoration interactions, field note inspection, exploration save persistence, SVG minimap route diagrams, and responsive district selection dialogs.

### Modified Capabilities
<!-- No existing capabilities existed under openspec/specs/. -->

## Impact

- **Client Code**: Extends `src/districts.js` with 12 new district definitions, procedural builders, and dynamic animation hooks. Updates `src/world/bounds.js` to register bounding boxes for all 12 rooms. Updates `src/main.js` and `index.html` / `src/style.css` for district navigation, minimap diagrams, and responsive dialog layout.
- **Multiplayer & Networking**: Compatible with room-based travel in `shared/protocol.js` and server room routing.
- **Performance**: High frame rate maintained through static box batching (`THREE.InstancedMesh`), material caching, and local light budgeting (maximum 2-3 point lights per world).
- **Backward Compatibility**: Fully preserves existing save files (`readExploration`); missing or new district keys migrate cleanly without resetting player progress.
- **Tests**: Automated unit tests in `tests/districts.test.js` expanded to verify navigable approach paths, spawn point safety, static batching, and objective reachability across all 12 new biomes.

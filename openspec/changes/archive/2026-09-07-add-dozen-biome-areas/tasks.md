## 1. Registry & Data Schema

- [x] 1.1 Add 12 biome district definitions to `src/districts.js` with narrative metadata, coordinates, spawn points, and atmospheric palettes
- [x] 1.2 Update `readExploration` in `src/districts.js` to normalize and preserve the 12 new district IDs
- [x] 1.3 Register world bounds configurations for all 12 biome districts in `src/world/bounds.js`

## 2. Builder Architecture & Dispatch Map

- [x] 2.1 Refactor district builder in `src/districts.js` to use a `DISTRICT_BUILDERS` dispatch table throwing for unknown IDs
- [x] 2.2 Implement common modular helper utilities for prop generation, water surfaces, foliage, and animated meshes

## 3. Subterranean & Industrial Biome Builders

- [x] 3.1 Implement procedural geometry, collision layout, and animated sluice flow for `aqueduct` (The Sunken Aqueduct)
- [x] 3.2 Implement procedural geometry, collision layout, and glowing steam vents for `caldera` (The Boiler Caldera)
- [x] 3.3 Implement procedural geometry, collision layout, and glowing smelting hearth for `foundry` (The Rustfall Foundry)

## 4. Vegetative & Organic Biome Builders

- [x] 4.1 Implement procedural geometry, collision layout, and pulsing spore clusters for `understory` (The Spore Understory)
- [x] 4.2 Implement procedural geometry, collision layout, and stilt root boardwalks for `mangrove` (The Brackish Basin)
- [x] 4.3 Implement procedural geometry, collision layout, and railway viaducts for `trestle` (The Overgrown Trestle)
- [x] 4.4 Implement procedural geometry, collision layout, and marsh weirs/reeds for `delta` (The Reclaimed Marshes)

## 5. Mineral, Alpine & High-Altitude Biome Builders

- [x] 5.1 Implement procedural geometry, collision layout, and brine pans for `saltworks` (The Bleached Saltworks)
- [x] 5.2 Implement procedural geometry, collision layout, and rotating anemometers for `rooftops` (The High Awnings)
- [x] 5.3 Implement procedural geometry, collision layout, and frosted glass dome for `frost-spire` (The Glacial Glasshouse)

## 6. Cultural & Archival Biome Builders

- [x] 6.1 Implement procedural geometry, collision layout, and library shelving for `archives` (The Paper Catacombs)
- [x] 6.2 Implement procedural geometry, collision layout, and solar reflector ovens for `kiln-terrace` (The Solar Kiln)

## 7. UI, Minimap & Navigation Integration

- [x] 7.1 Author 12 custom SVG minimap path schematics in `src/main.js` and update local map renderer
- [x] 7.2 Update district travel dialog in `index.html` and `src/style.css` to render a responsive, scrollable grid with visited/restoration badges
- [x] 7.3 Connect travel transitions and gate endpoints across all 16 districts

## 8. Automated Verification & Testing

- [x] 8.1 Expand `tests/districts.test.js` to execute flood-fill reachability tests across all 16 districts
- [x] 8.2 Verify static mesh batching and memory integrity for all 16 districts in `tests/districts.test.js`
- [x] 8.3 Run automated test suite (`npm test`) and production build check (`npm run build`)

# Afterlight — Multiplayer Market Garden

A persistent, atmospheric multiplayer market-gardening game built with Three.js, Node.js WebSockets, and procedural environments. All scenery, crops, and gardener avatars are generated in code; no external 3D models or textures are required.

Preserves Afterlight's signature rain-soaked aesthetic: high isometric camera, layered wet paving, brick masonry, copper pipes, warm amber lanterns, drifting mist, restrained bloom, and translucent dark HUD overlays.

---

## Getting Started

### 1. Install Dependencies

```sh
npm install
```

### 2. Start the Multiplayer Server & Client

In terminal 1 (start the server on port 3001):
```sh
npm run server
```

In terminal 2 (start the Vite dev server on port 5173):
```sh
npm run dev
```

Open **http://localhost:5173** in one or more browser windows. When multiple players connect, they see each other walking around in the shared Market Court with overhead nickname tags, custom procedural gardener avatars, and synchronized movement.

### 3. Production Build & Tests

- `npm test`: Runs the automated test suite (crop growth, quality grades, NPC pricing, double-auction order book, persistence, and multi-client presence).
- `npm run build`: Bundles the client for production into `dist/`.
- `npm run preview`: Serves the production build.

---

## Core Gameplay Loop

**Prepare → Plant → Tend → Harvest → Pack → Sell / Trade → Reinvest → Expand**

1. **Your Market Garden**:
   - Travel through the eastern gate of the Market Court (or click **Travel**) to enter your personal, server-persisted garden plot.
   - Select your **Hoe** (<kbd>2</kbd>) to till empty beds into prepared soil.
   - Select **Seeds** (<kbd>3</kbd>) to plant (press <kbd>3</kbd> repeatedly to cycle through Radish, Lettuce, Carrot, Kale, Basil, Tomato, Dew Strawberry).
   - Select the **Watering Can** (<kbd>4</kbd>) and water beds (<kbd>E</kbd>) to keep soil moist. Soil darkens visibly when wet.
   - Watch crops visibly advance through **5 distinct 3D growth stages**: Seed → Sprout → Juvenile → Mature → Harvestable.
   - Select **Harvest** (<kbd>5</kbd>) to harvest mature crops into your satchel, receiving quality-graded produce (**C, B, A, A+**) and gardening XP. Repeat-harvest crops (Tomatoes, Strawberries) continue bearing after picking.

2. **The Market Court & Economy**:
   - Return to the shared Market Court where other gardeners gather.
   - **Market Exchange Board** (<kbd>M</kbd> or interact at central chalkboard):
     - **NPC Liquidity**: Instant spot sell of graded produce at dynamic bid prices.
     - **Dynamic Pricing**: Market prices move based on recent supply and demand with bounds (0.4x to 2.5x base) and mean reversion.
     - **Player Order Book**: Post limit BUY or SELL orders with price/time priority and atomic matching at maker prices (with a 2% town fee).
   - **Town Seed Merchant**: Buy seed packets with your earnings.
   - **Restaurant & Café Noticeboard**: Deliver high-grade produce to fulfill town contracts for bonus coins, reputation, and XP.

---

## Controls

| Key / Action | Function |
| --- | --- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / Arrows | Move gardener relative to camera |
| Click / Tap ground | Walk to location |
| <kbd>Shift</kbd> | Run |
| <kbd>1</kbd> | Hands / Inspect tool |
| <kbd>2</kbd> | Hoe (Till soil) |
| <kbd>3</kbd> | Seeds (Cycle active seed) |
| <kbd>4</kbd> | Watering Can (Equip can & water beds) |
| <kbd>5</kbd> | Harvest Shears |
| <kbd>E</kbd> | Contextual interact with nearest bed, stall, or gate |
| <kbd>I</kbd> | Open Satchel / Inventory |
| <kbd>M</kbd> | Open Market Exchange Board |
| <kbd>T</kbd> / **Travel** | Open District Navigator (16 biomes & areas) |
| <kbd>V</kbd> | Wave emote to other gardeners |
| <kbd>C</kbd> | Cycle 3 camera angles |
| Mouse Wheel | Zoom in / out |
| <kbd>Escape</kbd> | Journal & Settings |

---

## Exploration Biomes & Restoration

Beyond the Market Court and Cultivation Garden, Afterlight features **16 distinct explorable atmospheric districts** representing diverse industrial, subterranean, aquatic, and alpine biomes. Players explore accompanied by **Kiln**, the cream-colored maintenance robot companion.

Each biome features:
- **Procedural 3D Architecture**: Unique materials, masonry, props, and ambient color palettes batched with `THREE.InstancedMesh`.
- **Atmospheric Visuals**: Custom fog, sunlight colors, and active animations (steam flues, flowing sluice gates, pulsing mycelium, spinning anemometers, glowing hearths, and swaying cattails).
- **Field Notes**: Poetic lore plaques and journals offering quiet environmental storytelling.
- **Landmark Restoration**: Interactive landmarks that awaken sectors permanently, updating persistent save data (`afterlight-save`) and lighting indicators.
- **Minimap Schematics**: Custom vector floor plan radar schematics on the local HUD.

### The 16 Districts & Biomes:
1. **The Rain Court** (`court`): Wet stone and warm windows where the journey began.
2. **The Sluiceworks** (`canal`): Aqueduct channels crossed by an arched bridge.
3. **The Glass Garden** (`garden`): Overgrown conservatory terraces with a seed nursery.
4. **The Last Platform** (`station`): Abandoned tram station with an operable signal beacon.
5. **The Sunken Aqueduct** (`aqueduct`): Subterranean cisterns and dripping limestone conduits.
6. **The Boiler Caldera** (`caldera`): Basalt fissures, sulfur crusts, and geothermal steam flues.
7. **The Spore Understory** (`understory`): Luminous mycelial forest with giant glowing shelf fungi.
8. **The Bleached Saltworks** (`saltworks`): Crystalline brine evaporation terraces and wind pumps.
9. **The High Awnings** (`rooftops`): Windward scaffolding, zinc gables, and spinning anemometers.
10. **The Brackish Basin** (`mangrove`): Flooded masonry, stilt boardwalks, and tidal weirs.
11. **The Overgrown Trestle** (`trestle`): Ancient iron railway viaduct gripped by canopy roots.
12. **The Rustfall Foundry** (`foundry`): Red iron dust, blast furnaces, and crucible hearths.
13. **The Glacial Glasshouse** (`frost-spire`): Shattered alpine conservatory with solar collectors.
14. **The Reclaimed Marshes** (`delta`): Silt sandbars, cattails, and tidal channel beacons.
15. **The Paper Catacombs** (`archives`): Sunken stone library holding centuries of preserved records.
16. **The Solar Kiln** (`kiln-terrace`): Terracotta tile courtyards and parabolic sun concentrators.

Travel between districts seamlessly via physical east/west gateway conduits or by opening the **District Navigator** (<kbd>T</kbd> or **Travel** button in the footer).

---

## Architecture & Server Authority

- **Server-Authoritative**: The Node.js server maintains authoritative state for coin balances, inventory quantities, crop maturation, moisture decay, order books, and contract fulfillment.
- **Client Interpolation**: Remote gardeners transmit movement at ~10 Hz and interpolate smoothly without jitter.
- **Durable Persistence**: Server state is saved atomically to `data/game-state.json` and survives restarts.
- **Guest Identity**: Players receive an automatic persistent guest UUID and atmospheric nickname (e.g. `MossyRadish42`, `AmberCarrot24`), which can be customized at any time.

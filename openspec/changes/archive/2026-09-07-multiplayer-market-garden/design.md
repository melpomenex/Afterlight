## Context

The current repository is a single-player Three.js isometric prototype (`src/main.js`, `src/districts.js`) focused on recovering power cells and repairing an abandoned courtyard. It uses procedural geometry, instanced meshes, a custom orthographic camera, and local storage.

To fulfill the product vision (see `proposal.md` and capability specs), we must evolve the codebase into an interactive multiplayer market-gardening simulation while strictly maintaining the aesthetic DNA (wet stone, desaturated tones, warm amber lanterns, rain mist, restrained bloom, and compact translucent HUD panels).

## Goals / Non-Goals

**Goals:**
- Modularize `src/main.js` into clean client systems: rendering/camera, networking, garden interactions, economy UI, and world definitions.
- Implement a Node.js WebSocket server (`server/`) with room-based presence (`market`, `garden:<playerId>`, `glasshouse:<playerId>`), state validation, and atomic JSON persistence.
- Define a unified shared module (`shared/`) for crop configs, economy mechanics, and network protocol packets.
- Implement a 5-stage crop growth lifecycle (seed, sprout, juvenile, mature, harvestable) with moisture decay and deterministic quality grading (C, B, A, A+).
- Deliver a 3-layer economy: NPC reference liquidity, bounded supply/demand price movement, and an atomic order-matching engine with a 2% fee.
- Support persistent guest tokens, atmospheric procedural nicknames, overhead player name tags, and smooth remote player movement interpolation at 10–12 Hz.
- Keep the development server and tests easy to run with standard `npm run dev` and `npm test`.

**Non-Goals:**
- Real-money transactions, Web3/crypto/NFTs.
- Password/email user auth or oauth providers (guest tokens satisfy the requirement).
- External 3D asset pipelines (.gltf/.obj loaders) — all avatars, props, and plants remain procedurally constructed Three.js geometry.
- Complex physics/ragdoll or massive multi-shard MMO servers.

## Decisions

### 1. Client Architecture & Modularization
- *Decision*: Split `src/main.js` into focused modules:
  - `shared/crops.js`: Crop definitions, durations, yields, water demands, base prices.
  - `shared/protocol.js`: Packet types, serialization, payload schemas.
  - `shared/economy.js`: Price adjustment formulas, fee constants, quality multipliers.
  - `server/index.js`, `server/storage.js`, `server/gardens.js`, `server/economy.js`, `server/world.js`: Authoritative server runtime.
  - `src/net/client.js`: WebSocket lifecycle, exponential reconnect backoff, message dispatch.
  - `src/render/avatars.js`: Procedural gardener avatar builder and remote interpolation manager.
  - `src/render/plants.js`: Procedural multi-stage crop visual builder.
  - `src/world/bounds.js`: World bounds configurations per room (governing bounds, camera clamp, minimap scale, raycast hit clamp).
  - `src/world/market.js` & `src/world/garden.js`: Scenery and interactables for Market Court and personal gardens.
  - `src/ui/marketModal.js`, `src/ui/hud.js`: DOM/CSS translucent panels for trading, tools, and inventory.
- *Alternative Considered*: Keeping all code in `main.js` or migrating to React. Rejected because `main.js` was becoming an unmaintainable monolith, while migrating to React violates user rules against unsolicited framework migrations.

### 2. Networking and State Authority
- *Decision*: Client-predicted local movement with server-validated positions. The server is strictly authoritative over coins, inventory counts, planting actions, crop maturation, trade execution, and contract fulfillment.
- *Rate & Interpolation*: Client sends position updates at ~10 Hz when moving. Server broadcasts delta updates to other clients in the same room. Clients interpolate remote positions using linear interpolation (`lerp`) and slerp for rotation with a small buffer (~100ms) to ensure butter-smooth rendering.
- *Alternative Considered*: Full lockstep or peer-to-peer WebRTC. Rejected due to complexity, NAT traversal issues, and vulnerability to cheating.

### 3. Garden Grid & Multi-Stage Growth Geometry
- *Decision*: Personal gardens contain 12 distinct garden beds (expandable). Each bed has an explicit state machine: `empty` → `prepared` → `planted` → `harvestable`. Each crop has 5 visible stages rendered with procedural Three.js primitives (stems, leaves, fruit spheres, vegetable tops), using shared materials and dynamic scene management.
- *Moisture Decay*: Moisture decays linearly; when moisture drops to 0, growth slows down and health decays, penalizing the final harvest quality. Watering restores moisture to 100% and darkens soil.

### 4. Three-Layer Economy Math
- *Layer A (NPC Liquidity)*: Guaranteed instant sell bid = `basePrice * marketMultiplier * qualityMultiplier * 0.85`; Instant seed buy = `seedBasePrice * marketMultiplier`.
- *Layer B (Dynamic Pricing)*:
  `price = basePrice * clamp(1.0 + (recentDemand - recentSupply) / capacity, 0.4, 2.5)`
  Every market tick (~30s), price drifts back toward basePrice by 5% (mean-reversion).
- *Layer C (Order Book)*: Standard double auction order book per crop. Bids sorted descending by price then ascending by timestamp; Asks sorted ascending by price then ascending by timestamp. Matches execute at the existing maker's price. A 2% trading fee is deducted from the seller's proceeds.

### 5. Durable Server Persistence
- *Decision*: A clean `server/storage.js` abstraction saving to `data/world-state.json` via atomic write (write to temp file then rename). Contains player records, garden state, inventory, order book, and economy history.

## Risks / Trade-offs

- *[Risk]* Port contention between Vite dev server and WebSocket server.
  → *Mitigation*: The Node server can run an HTTP/WebSocket server on port 3001, and Vite can proxy `/ws` and `/api` to port 3001, or client connects directly to `ws://${location.hostname}:3001`.
- *[Risk]* Procedural plant geometry creation hurting frame rate.
  → *Mitigation*: Reuse shared Box, Cylinder, and Sphere geometries with cached materials; beds only update meshes when growth stages change.
- *[Risk]* Race conditions in order matching or concurrent harvest requests.
  → *Mitigation*: Node.js single-threaded event loop processes packet handlers sequentially; operations validate preconditions and execute mutations synchronously within the handler.

## Migration Plan

- Maintain backward compatibility for existing browser `afterlight-save` entries without overwriting them.
- New game uses guest token stored in `afterlight-gardener-token`.
- Existing tests in `tests/districts.test.js` continue passing alongside new suites for economy, garden cultivation, identity, and multiplayer networking.

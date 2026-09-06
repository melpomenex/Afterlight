## 1. Architecture & Shared Foundations

- [x] 1.1 Install `ws` dependency and update `package.json` scripts for concurrent dev/server running
- [x] 1.2 Create `shared/crops.js` with definitions for 7 crops (radish, lettuce, carrot, kale, basil, tomato, strawberry)
- [x] 1.3 Create `shared/protocol.js` with WebSocket packet definitions and `shared/economy.js` with pricing formulas
- [x] 1.4 Create `src/world/bounds.js` defining world boundary configurations for market and gardens

## 2. Crop Growth & Cultivation Engine

- [x] 2.1 Implement procedural 5-stage crop geometry builder in `src/render/plants.js`
- [x] 2.2 Implement garden bed data model, till, plant, water, harvest, and deterministic quality calculation
- [x] 2.3 Write automated unit tests for planting, growth calculation, moisture decay, and quality grading

## 3. Multiplayer Server & Player Identity

- [x] 3.1 Implement guest UUID handling, atmospheric procedural nickname generator, and sanitization
- [x] 3.2 Implement Node.js WebSocket server in `server/index.js` and room presence manager in `server/world.js`
- [x] 3.3 Implement client network module in `src/net/client.js` with auto-reconnect and exponential backoff
- [x] 3.4 Implement procedural gardener avatar rendering and remote player movement interpolation in `src/render/avatars.js`
- [x] 3.5 Write automated tests for nickname sanitization, duplicates, and multi-client presence/movement

## 4. Server-Authoritative Garden & Persistence

- [x] 4.1 Implement `server/gardens.js` managing server-authoritative bed states, timers, and moisture decay
- [x] 4.2 Implement atomic JSON store in `server/storage.js` persisting players, gardens, and inventories
- [x] 4.3 Connect client garden actions (till, plant, water, harvest) to server packets with state sync on reload
- [x] 4.4 Write automated tests for server garden mutations and persistence survival across restarts

## 5. Market Economy & NPC Liquidity

- [x] 5.1 Implement NPC reference pricing and instant sell/buy liquidity in `server/economy.js`
- [x] 5.2 Implement bounded dynamic supply and demand price adjustments with mean-reversion
- [x] 5.3 Implement trade execution and inventory/wallet atomic balance updates
- [x] 5.4 Write automated tests for NPC sell/buy, price bounds, and supply/demand drift

## 6. Player Order Book & Double Auction Matching

- [x] 6.1 Implement limit order book (BUY / SELL) with price/time priority in `server/orderbook.js`
- [x] 6.2 Implement asset reservation (inventory for sell, coins for buy) and order cancellation
- [x] 6.3 Implement atomic trade execution, fee deduction (2%), and market broadcasts
- [x] 6.4 Write automated unit tests for partial fills, full fills, order cancellation, and asset reservation

## 7. Contracts, Progression & Upgrades

- [x] 7.1 Implement rotating NPC contracts (cafes/kitchens) with minimum quality requirements and rewards
- [x] 7.2 Implement player progression (XP, reputation, levels, garden expansion / bed unlocks)
- [x] 7.3 Connect contract acceptance and completion flows through network packets and server validation
- [x] 7.4 Write automated tests for contract generation, quality verification, and reward fulfillment

## 8. Visual Environment, HUD & Verification

- [x] 8.1 Build the shared Market Court environment reusing Rain Court architectural DNA with market stalls, crates, and boards
- [x] 8.2 Build the Player's Market Garden environment with tool shed, compost, water trough, and expansion space
- [x] 8.3 Build translucent HUD panels: tool belt (1-5), seed selector, inventory view, market order modal, and weather display
- [x] 8.4 Add visual gardening feedback (water splash particles, darkened soil, harvest pop, emote wave)
- [x] 8.5 Update `README.md` with instructions for running client and multiplayer server
- [x] 8.6 Run full automated test suite, verify production build (`npm run build`), and verify in browser

## 1. Shared definitions and protocol

- [x] 1.1 Add materials catalog to `shared/` (copper, timber, glass: ids, display names) and flour to the goods/pricing tables with a base price above wheat
- [x] 1.2 Define node placement data (id, district, position, material, respawnMs) for Foundry copper, Trestle timber, Glasshouse glass — positions verified inside walkable bounds with clear standing spots
- [x] 1.3 Add protocol message types: node harvest request/result, machine contribute/status update; extend inventory payloads with an additive `materials` field

## 2. Server: materials inventory and nodes

- [x] 2.1 Add `player.materials` (defaulted on read) and persist through `server/storage.js`
- [x] 2.2 Implement node state (`depletedAt`) with server-validated harvest, depletion, timed respawn, and restart-safe persistence
- [x] 2.3 Broadcast node state changes to the district room; include node states when a player enters a district

## 3. Server: machine shop and milling

- [x] 3.1 Create the machines module: mill state (`broken`/`restored`, contributed totals, material requirement), persisted via `server/storage.js`
- [x] 3.2 Validate and apply material contributions atomically against remaining need and inventory; broadcast `MACHINE_UPDATE` to the court room
- [x] 3.3 Implement milling: restored mill converts wheat → flour per validated interaction; reject broken mill or missing wheat
- [x] 3.4 Gate flour contract generation on mill-restored state; add flour NPC spot pricing through the existing dynamic multiplier; include machine status in court-entry payloads for late joiners

## 4. Server: sprinkler tool

- [x] 4.1 Add garden sprinklers (craft from copper + glass, placed on a bed tile, capped count, persisted)
- [x] 4.2 Apply sprinkler moisture coverage inside the server garden tick so covered beds retain moisture while others dry normally

## 5. Client: world rendering

- [x] 5.1 Render material nodes per district in the dynamic subgroup (excluded from static batching) with available/depleted visuals and subtle idle animation registered in the world's `update()`
- [x] 5.2 Build the Great Mill in the Market Court as a landmark-class prop with broken/restored visual states and a clear approach; inspect isometric occlusion with a real screenshot
  - Note: mill built and anchor standing spots verified programmatically against real obstacles; the isometric occlusion SCREENSHOT inspection remains for the main agent.
- [x] 5.3 Wire interaction dispatch for harvest, contribute, and mill interactions with contextual prompts and range checks matching existing contracts

## 6. Client: HUD and UI

- [x] 6.1 Show materials in the satchel UI mirroring server inventory
- [x] 6.2 Show mill restoration progress in the court (persistent objective/panel element, not toast-only) and celebrate restoration for everyone present
- [x] 6.3 Add sprinkler to garden tool/placement flow with coverage preview

## 7. Tests and docs

- [x] 7.1 Server tests: node harvest/respawn/restart persistence, contribution validation (unneeded materials, over-contribution clamp), milling rejects, flour contracts gated on machine state, sprinkler tick coverage
- [x] 7.2 Verify storage read path tolerates pre-existing state files without the new fields (migration-by-default)
- [x] 7.3 Update README: gathering, the machine shop, flour contracts, sprinkler controls
- [x] 7.4 Full gameplay smoke check: gather in three districts → contribute → restore mill → mill flour → fulfill flour contract → craft/place sprinkler; second client observes node depletion and restoration; `npm test` and `npm run build` pass
  - Verified by main agent in-browser (two clients + a third live player): real copper harvests with server grants and cross-client depletion visibility; contributed all materials → mill RESTORED (persisted across server restarts); milled wheat→flour via dialog bulk and direct E; sold 3 flour on the market (coins 60→96, dynamic price moved); sprinkler kit crafted (materials consumed, button disabled). Flour-contract fulfillment and sprinkler bed placement verified via server tests + code inspection (browser pane froze rAF, blocking further live input); no restored-mill/sprinkler screenshot taken. Also added during verification: server-side district guard rejecting node harvests from the wrong room (nodes.js `nodeDistrict` + handler check + regression test).

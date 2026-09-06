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

Open **http://localhost:5173** in one or more browser windows. You wake up inside **The Orpheum**, the city's cinema, in cinema view: the shared screen on stage with the town chat docked beside it. Press <kbd>Esc</kbd> (or a movement key) to step into the aisles, then walk out of the gates to explore — the Market Court, your garden, and 17 districts are all out there. When multiple players connect, they see each other with overhead nickname tags, custom procedural gardener avatars, and synchronized movement. (`?room=market`, `?room=garden`, or any district id in the URL overrides the spawn point.)

### 3. Production Build & Tests

- `npm test`: Runs the automated test suite (crop growth, quality grades, NPC pricing, double-auction order book, persistence, multi-client presence, gather nodes, machine restoration, milling, flour contracts, sprinkler simulation, and the embedded IRC relay/bridge over real sockets).
- `npm run build`: Bundles the client for production into `dist/`.
- `npm run preview`: Serves the production build.

---

## Core Gameplay Loop

**Prepare → Plant → Tend → Harvest → Gather → Craft → Pack → Sell / Trade → Reinvest → Expand**

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

3. **Gathering in the Outer Districts**:
   - Material caches grow in three of the explorable biomes: **Copper Scrap** in the Rustfall Foundry, **Trestle Timber** at the Overgrown Trestle, and **Glass Shards** in the Glacial Glasshouse.
   - Walk up to a glowing cache and press <kbd>E</kbd> to gather one unit into your server-side satchel. The cache is visibly stripped bare for everyone in the district and regrows after a few real minutes — even across server restarts.

4. **The Great Mill & Machine Shop** (Market Court, southeast corner):
   - The court's communal machine starts **broken**. Any gardener can contribute copper, timber, and glass at the mill or its workbench (<kbd>E</kbd>); restoration progress is shown on a HUD panel for everyone present.
   - Once the community delivers all materials, the mill is **restored permanently** (server-persisted) — its sails turn, and a celebration greets the whole court.
   - A restored mill grinds **wheat into flour** (<kbd>E</kbd> at the mill, or use the workbench dialog): one grain for one bag, deducted and credited server-side.
   - **Flour** trades like produce: instant-sell it on the Market Exchange Board (it keeps no quality grade), and watch the Restaurant Noticeboard — **flour contracts** only rotate in while the mill is restored.
   - **Sprinkler kits** are crafted at the workbench from copper and glass. Select the Sprinkler tool (<kbd>6</kbd>), stand at a bed to preview its coverage (the bed plus its orthogonal neighbors glow), and press <kbd>E</kbd> to place. Placed sprinklers water their beds automatically in the server simulation, so covered soil stays moist while you are away (up to 3 per garden).

---

## Controls

| Key / Action | Function |
| --- | --- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / Arrows | Move gardener relative to camera (in first person: relative to your view) |
| Click / Tap ground | Walk to location |
| Drag on the world | Turn your view (first person only) |
| <kbd>Shift</kbd> | Run |
| <kbd>Space</kbd> | Jump — hold it to bunny hop: chained hops keep your momentum and build speed (up to ~1.5× run) as long as the chain lasts. Obstacles still block mid-air. |
| <kbd>1</kbd> | Hands / Inspect tool |
| <kbd>2</kbd> | Hoe (Till soil) |
| <kbd>3</kbd> | Seeds (Cycle active seed) |
| <kbd>4</kbd> | Watering Can (Equip can & water beds) |
| <kbd>5</kbd> | Harvest Shears |
| <kbd>6</kbd> | Sprinkler Kit (Place on a bed to auto-water it + neighbors) |
| <kbd>E</kbd> | Contextual interact with nearest bed, stall, gather node, the Great Mill, gate, or theater seat |
| <kbd>I</kbd> | Open Satchel / Inventory |
| <kbd>M</kbd> | Open Market Exchange Board |
| <kbd>T</kbd> / **Travel** | Open District Navigator (17 biomes & areas) |
| <kbd>V</kbd> | Wave emote to other gardeners |
| <kbd>G</kbd> | In The Orpheum: open the projection booth (screen controls, IPTV lists, channel guide) |
| <kbd>Enter</kbd> / <kbd>/</kbd> | Open town chat (type & <kbd>Enter</kbd> to send, <kbd>Esc</kbd> to return to the game) |
| <kbd>C</kbd> | Cycle camera views: three isometric angles, then first person |
| Mouse Wheel | Zoom in / out (isometric views only) |
| <kbd>Escape</kbd> | Journal & Settings (in cinema view: return to the game first) |

**First person.** The fourth camera view puts you at street level. Your own avatar steps out of sight (Kiln and everyone else stay put), WASD moves relative to where you look, and dragging on the world turns your view — a plain click still walks, and a drag never does. Sit in a theater seat in first person to watch the shared screen from your own chair; your view choice is local and resets to the default angle on reload.

**Sound.** The **♫ Sound** footer toggle starts the ambience and effects (everything is synthesized in the browser — no audio downloads). Footsteps follow your walking and running cadence; their volume lives in **Settings** (<kbd>Esc</kbd> → Footsteps) and is remembered per browser.

**Bunny hopping.** Landing while <kbd>Space</kbd> is still held relaunches you instantly, preserving the speed you carried into the air and adding a little more each clean hop, up to a cap. Break the chain — release Space, stop moving, sit, travel, or pause — and you're back to normal walk/run speed. Kiln keeps pattering along on the ground and catches up when you stop.

### Town Chat & IRC

The Market Court shares a live **town channel** (`#afterlight`) panel in the lower-right HUD:

- Press <kbd>Enter</kbd> (or <kbd>/</kbd>) to speak; press <kbd>Esc</kbd> to hand the keyboard back to the gardener. Typing never moves your robot.
- `/msg <name> <text>` whispers directly to another player or an IRC user/bot by nickname; `/me <action>` sends an action line; `/help` lists commands.
- When the panel is collapsed, a small unread counter shows what you missed; recent history is delivered on connect.
- The panel scales with your display on wide screens, and can be resized: drag the corner grip on its top-left edge, focus the grip and use the arrow keys, or double-click it to reset. Your size is remembered.
- **Self-hosted IRC**: the game server embeds a real IRC server on port **6667** (configurable). Connect from any IRC client (IRSSI, WeeChat, HexChat, mIRC, …) or bot:

```sh
irssi -c localhost -p 6667 -n KilnBot
# then: /join #afterlight
```

  - Online players hold their nicknames on the relay, so bots cannot impersonate them; if a player's name collides with an IRC client's, the player gets a derived handle like `Kiln_` (announced in their chat panel).
  - Players see IRC users join/part as system lines, and CTCP actions (`/me`) arrive as styled action lines.
  - Optional environment variables: `IRC_PORT` (default `6667`; `0` = ephemeral), `IRC_DISABLED=1` (in-game chat only, no IRC door), `IRC_OPER_NAME` / `IRC_OPER_PASS` (IRC operator login), `IRC_TOPIC`.
  - Deployment note: hosted builds often only expose HTTPS/WebSocket. For external bots to reach the relay, forward or tunnel the IRC port yourself (e.g. via SSH or your tunnel of choice); in-game chat needs no external access.

---

## Exploration Biomes & Restoration

Beyond the Market Court and Cultivation Garden, Afterlight features **16 distinct explorable atmospheric districts** representing diverse industrial, subterranean, aquatic, and alpine biomes. Players explore accompanied by **Kiln**, the cream-colored maintenance robot companion.

Each biome features:
- **Procedural 3D Architecture**: Unique materials, masonry, props, and ambient color palettes batched with `THREE.InstancedMesh`.
- **Atmospheric Visuals**: Custom fog, sunlight colors, and active animations (steam flues, flowing sluice gates, pulsing mycelium, spinning anemometers, glowing hearths, and swaying cattails).
- **Field Notes**: Poetic lore plaques and journals offering quiet environmental storytelling.
- **Landmark Restoration**: Interactive landmarks that awaken sectors permanently, updating persistent save data (`afterlight-save`) and lighting indicators.
- **Minimap Schematics**: Custom vector floor plan radar schematics on the local HUD.
- **Material Caches** (in the Foundry, Trestle, and Glasshouse): server-owned gather nodes that deplete on harvest and regrow on a timer, feeding the Market Court's machine shop.

### The 17 Districts & Biomes:
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
17. **The Orpheum** (`theater`): A velvet-seated cinema where the city watches together — see below.

Travel between districts seamlessly via physical east/west gateway conduits or by opening the **District Navigator** (<kbd>T</kbd> or **Travel** button in the footer).

---

## The Orpheum — Watch Together

At the far east end of the line sits **The Orpheum** (`theater`), a grand old cinema where everyone in the room watches one shared screen — and where every player wakes up. What plays there plays for **everyone at once**: one player queues a film or flips an IPTV channel and the whole auditorium sees it.

The auditorium has rounded burgundy seats with padded headrests, armrests and cup holders, carpeted aisles, acoustic wall panels and speakers. At the back, a walnut concession counter holds a glass popcorn warmer and soda fountain. These furnishings are scenery; seat and projector controls work as before.

### Watching

- **Cinema view is the default here.** Spawning in (or walking into) The Orpheum starts the big-screen presentation: stage + docked chat, HUD aside. <kbd>Esc</kbd>, any movement key, a walk-click, or the watch bar's **⤺** action steps you back into the aisles without losing your spot — walk out the gates to play, come back and the picture is waiting.
- **Take a seat** — press <kbd>E</kbd> at any chair to settle in; the watch bar becomes **⤺ Stand up**. Standing up is one action, always reachable.
- **Run the projector** — press <kbd>G</kbd>, use the **▣ Booth** button, or interact with the screen to open the projection booth: queue, transport controls, IPTV, and volume. Works from the aisles and from your cinema seat. Anyone in the auditorium may run it; there is no host.
- **Restore the projector** (landmark) to light the marquee and aisle lamps for good. It's a flourish — the screen plays with or without it.

### What the screen plays

- **YouTube** videos (watch links, `youtu.be`, Shorts), **Vimeo** videos
- **Direct video files** (`.mp4`, `.webm`, …) and **HLS streams** (`.m3u8`)
- **Torrent magnets** (`magnet:?xt=urn:btih:…`) — see below
- **IPTV**: add M3U/M3U8 playlists by pasting text, uploading a file, or fetching a URL — they land in the theater's **shared library**, so everyone in the room can browse them (see below). Browse channels in the **guide** — pick a **country** from the dropdown first, then narrow by that country's **categories** — and flip with **◂ / ▸**.

### The shared channel library & program guide

Playlists and the program guide are **uploads that persist on the game server** — nothing ships with the game, and the library starts empty until someone adds a list.

- **One player adds a playlist; the whole room gets it.** Anything added in the booth is parsed on the server and appears in everyone's guide — no import of your own needed to browse, tune, or flip. Server-side fetching also means playlist URLs work even when the host sends no CORS headers.
- **The guide can show "now / next".** Upload an XMLTV program guide (`.epg` / `.xml`, plain or `.gz`) in the booth and channels matched by `tvg-id` (or name) show the current and next programme in your local time, kept current while the guide is open. Uploading a new guide replaces the old one and never interrupts the screen.
- **Personal lists stay personal.** Lists saved in your browser remain a private fallback; select one and press **Add to theater** to share it with the room.
- **Communal shelves.** Anyone in the auditorium may remove a shared list; removing one never interrupts what's playing. The library and guide survive server restarts (`data/iptv.json`, `data/epg.json`; delete those files to reset). Generous size caps apply (24 lists, 20,000 channels each, 64 MB guides).
- Try it with a big real-world playlist and guide — e.g. the files in `~/Code/iptv/out/` (`master.m3u8` ≈ 12k channels, `guide.epg.gz` ≈ 56k programmes).

### Torrent night (magnet links)

Paste a magnet link in the booth and the projector resolves it for you: the game server reaches the swarm, lists the torrent's video files, and **you pick which one plays** — only then does it start (or queue) for the whole room. Torrents often carry several films or episodes, so nothing goes on the screen until a file is chosen; closing the picker leaves the bill untouched.

- While the swarm is reached you'll see live progress ("Reaching the swarm…", percent, peers) instead of a bare spinner; seeking works even in partially downloaded files, because the server streams your chosen file with byte-range support.
- Files browsers usually can't decode (MKV, AVI) are listed with a *may not play* note; MP4/WebM and friends are offered first. There's no transcoding.
- Torrent items on the bill survive reloads and server restarts — downloaded data is cached under `data/torrents/` (size-capped at ~4 GB, least-recently-used eviction; both tunable with `TORRENT_CACHE_DIR` and `TORRENT_CACHE_MAX_BYTES`), and the whole folder is safe to delete.
- **You are responsible for what you stream.** Magnets play through the server operator's connection, so only point the projector at content you have the right to watch and share.

Queue behavior: items added while something plays line up in the queue and auto-advance when a film ends (dead links are skipped with a notice). The now-playing state and queue live on the server — they survive reloads and restarts, and latecomers join mid-picture at the right moment. Playback is drift-corrected to a shared clock, so pausing or seeking moves everyone together.

### Good to know

- Only `http(s)` links and magnet links can be pinned to the screen; YouTube/Vimeo play through their official embeds, magnets resolve through the server's torrent engine (above), and everything else plays as a plain video stream.
- Playlist imports by URL are fetched by the game server, so CORS-hostile playlist hosts work; if the server itself can't reach a URL, paste the text or upload the file instead.
- Streams their hosts remove or region-block will show a notice and skip ahead. Live channels can't be rewound.
- Whether other players can *hear* a video depends on each browser's autoplay rules; a "Tap to start" badge appears if the browser needs a click first. Volume is local.

---

## Architecture & Server Authority

- **Server-Authoritative**: The Node.js server maintains authoritative state for coin balances, inventory quantities, gathered materials, gather-node depletion and respawn, the Great Mill's restoration state, sprinkler fixtures, crop maturation, moisture decay, order books, and contract fulfillment. The client only renders server state; items are never granted client-side.
- **Client Interpolation**: Remote gardeners transmit movement at ~10 Hz and interpolate smoothly without jitter.
- **Durable Persistence**: Server state is saved atomically to `data/game-state.json` and survives restarts.
- **Guest Identity**: Players receive an automatic persistent guest UUID and atmospheric nickname (e.g. `MossyRadish42`, `AmberCarrot24`), which can be customized at any time.

# Source-of-truth ownership matrix (migration contract)

Status: active migration contract, 2026-09-06. Derived from full audits of `server/`, `shared/`, `src/net/client.js`, `data/`, and `tests/`. This file is the single coordination point for the Node → Elixir/Phoenix/Ash migration: **during migration there must never be uncertainty about who is the authoritative writer for a domain.**

Rules (non-negotiable):

- One writer per durable domain. Node and Elixir never simultaneously write the same durable domain.
- Cutover per domain: freeze writes → snapshot source (with hash) → import idempotently → validate → flip routing → enable new writer → keep source read-only.
- No dual writes. No "temporary" dual-write period.
- Movement/presence stays transient (process state + PubSub), never PostgreSQL rows per packet.
- Routing between legacy Node and Phoenix owners is decided by protocol/domain routing at the gateway, not by client choice.

## 1. Ownership matrix

| # | Subsystem | Current owner (Node) | Current persistence | Target owner (Elixir) | Target persistence | Cutover phase | Frontend owner | Transport | Durable command path | Rollback strategy |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Accounts / guest identity | `server/index.js` hello handler; guestId is client-generated and trusted | `game-state.json` `players` | `Afterlight.Accounts` (Ash) | `players`, `guest_sessions` tables | P4 (signed socket identity + gateway transport delivered by add-phoenix-gateway-transport; durable players P4) | `src/net/client.js` storage keys | Channels `connect` + hello-equivalent | Signed guest token → `create_guest_session` / `allocate_nickname` receipts | Pre-cutover: legacy JSON still authoritative. Post: forward-fix; reverse export tooling required before disabling Node writes |
| 2 | Nicknames | `shared/identity.js` sanitize/dedup in `server/index.js` | `players[].nickname` | `Afterlight.Accounts` | `players.nickname` (+ uniqueness attempt log) | P4 | `src/net/client.js`, `src/render/avatars.js` (palette) | Channels | Ash action `set_nickname` | Same as #1 |
| 3 | World movement | `server/world.js` (session pose, 10 Hz dirty-room flush) | none (ephemeral) | `Afterlight.World` room owner processes | none (transient) | **P3 delivered** (`add-world-room-runtime`: validated + clamped poses, newest-per-actor coalescing, 10 Hz full-roster flush, bounded outbound) | `src/main.js` + `src/render/avatars.js` | single `game:v1` channel topic, coalesced full-roster snapshots | none (not durable) | n/a — transport-only; reconnect = fresh snapshot |
| 4 | Room membership | `server/world.js` rooms Map | none (ephemeral) | `Afterlight.World` (Registry + DynamicSupervisor + per-room `RoomServer` roster map; Phoenix Presence deliberately not adopted — if adopted later, coarse membership only, never 10 Hz positions) | none (roster is process memory) | **P3 delivered** (`add-world-room-runtime`: join/leave/duplicate/supersession semantics, conn-ref-keyed membership, empty-room grace stop) | client joinRoom/desiredRoom replay | single `game:v1` channel topic (rooms multiplexed; no per-room subscription to close) | n/a | n/a |
| 5 | Garden (beds, growth, sprinklers) | `server/gardens.js` + `shared/gardenModel.js` | `game-state.json` `gardens` | `Afterlight.Gardens` (Ash) | `gardens`, `beds`, `sprinklers` tables | P6 (with #6/#7 as one group) | `src/world/gardenWorld.js`, `src/main.js` | Channels + command envelope | `water_bed`, `plant`, `harvest`, `place_sprinkler` — bed+inventory atomic | Freeze + JSON import; Node read-only after flip |
| 6 | Wallet / inventory balances | ad-hoc in `server/index.js` handlers + `server/economy.js` | `game-state.json` `players[]` | `Afterlight.Economy` (Ash + bounded raw Ecto) | `wallets`, `inventory_balances` (integer, nonnegative constraints) | P6 | `src/ui/marketModal.js`, HUD | Channels + command envelope | Explicit Ash actions; market fill is one DB transaction | Same as #5 |
| 7 | NPC market (prices, buy/sell, multipliers) | `server/economy.js` | `game-state.json` `marketMultipliers` | `Afterlight.Economy` | `wallets`/`inventory_balances` + `market_multipliers` | P6 | `src/ui/marketModal.js` | Channels | `npc_buy`, `npc_sell` | Same as #5 |
| 8 | Order book / trades / fees | `server/orderbook.js` | `game-state.json` `orders`, `trades` | `Afterlight.Economy` | `orders`, `trades`, `ledger_entries`, reservations | P6 | `src/ui/marketModal.js` | Channels + envelope (client orderId becomes request_id) | `place_order`, `cancel_order`, matching fill = single SQL transaction, deterministic lock order | Same as #5 |
| 9 | Contracts | `server/economy.js` (board is memory-only) | none (regenerated at boot) | `Afterlight.Economy` | `contracts` table (persisted from P6 on) | P6 | `src/main.js` contract views | Channels broadcast | `complete_contract` | Not previously durable; new durability is additive |
| 10 | Restoration: gather nodes | `server/nodes.js` | `game-state.json` `nodes` (depletion timestamps) | `Afterlight.Restoration` (Ash) | `gather_nodes` | P6 | `src/main.js`, district worlds | Channels | `gather` | Same as #5 |
| 11 | Restoration: shared machines (mill) | `server/machines.js` | `game-state.json` `machines` | `Afterlight.Restoration` | `machines`, `machine_contributions` | P6 | `src/main.js`, mill panel | Channels | `contribute_to_machine`, `mill`, `craft` | Same as #5 |
| 12 | Theater bill/timeline | `server/theater.js` + `shared/theaterModel.js` reducer | `game-state.json` `theater` | `Afterlight.Theater` (Ash) | `theater_rooms`, `theater_items` (+ revision) | P5 | `src/ui/theaterScreen.js` (DOM, homography, engines) | Channels `theater:<instance>` topic | reducer actions with revision + atomic timeline commit | Freeze + import `{now, queue}`; Node read-only after flip |
| 13 | YouTube playlist import | `server/youtubePlaylist.js` (fetch + extract) | none | `Afterlight.Theater` + Oban job (fetch), Ash `import` records | import metadata tables | P5 | booth dialogs in `theaterScreen.js` | Channels resolve/reply | `preview_playlist_import` / `confirm_playlist_import` | Same as #12 |
| 14 | IPTV library | `server/iptv.js` | `data/iptv.json` (3.6 MB, own file) | `Afterlight.Catalog` (Ash) | `playlist_lists`, `playlist_channels` | P5 | booth dialogs | HTTP uploads + `iptv_state` broadcasts | HTTP POST endpoints stay; storage moves to PG | Import with hashes; originals read-only |
| 15 | EPG | `server/iptv.js` + `shared/xmltv.js` | `data/epg.json` (9.2 MB, own file) | `Afterlight.Catalog` | `epg_programmes`, guide channels | P5 | guide dialog | HTTP upload + `epg_schedule` lookups | Same as #14 | Same as #14 |
| 16 | Chat (game channels, DMs, history ring) | `server/chat.js` (rollback via `CHAT_RELAY_DISABLED`) | none (in-memory 100-msg ring) | `Afterlight.Social` (dev: `AFTERLIGHT_CHAT_OWNER=phoenix`) | optional `chat_messages` (history persistence is additive; default stays ephemeral) | `add-social-chat-relay` — **flipped in dev**; config rollback to Node | `src/ui/chatPanel.js` | Channels / `chat:*` topics | none required (relay) | Ephemeral history; flip back to Node loses in-flight ring |
| 17 | IRC bridge + IRC server | `server/irc.js` + bridge in `chat.js` | none | Node sidecar behind authenticated adapter (retained) | none | P7 (stays Node through P11 at least) | same chat panel | adapter events with message IDs | none | Sidecar crash degrades to game-only chat (current behavior) |
| 18 | Torrent engine | `server/torrents.js` (webtorrent) + `shared/torrentModel.js` pure rules | `data/torrents/library.json` + cache dir | Node sidecar (retained); Phoenix issues scoped playback grants; bill rows land in `Afterlight.Theater` | sidecar files + `theater_items` picks | P7 (sidecar retained); bill rows P5 | `theaterScreen.js` picker + `<video>` streaming | HTTP Range stream + WS status | `torrent_resolve` proxied with auth; grants short-lived | Sidecar failure degrades; bill survives in PG |
| 19 | Conferencing signaling | does not exist yet | none | `Afterlight.Conferencing` (Channels) | `calls`, `call_memberships`, media grants (short-lived) | P8 (spike) | new UI, opt-in | `call:<id>` topic | `authorize_join`, `issue_media_grant` | Independent feature; failure must not affect game |
| 20 | Conferencing media | does not exist yet | none | Media worker behind SFU adapter (Membrane/ExWebRTC experiment) | none (packets) | P8 | browser WebRTC | SRTP/ICE, never Channels/Ash | grants only | Adapter isolates SFU choice |
| 21 | Recordings | does not exist yet | none | Membrane pipelines + object storage (only with explicit consent) | object storage + authorization metadata | P8 (later) | n/a | signed downloads | n/a | Deletable; never gates gameplay |
| 22 | Weather | `server/index.js` interval | none | `Afterlight.World` room runtime | none (deterministic rotation) | P6 (with gardens/economy; relayed from Node until that flip — P3 keeps Node as the sole weather writer, relayed unsuppressed through the gateway) | HUD | broadcast | n/a | n/a |

## 2. Migration phase map

| Phase | OpenSpec change | Content | Gate to exit |
|---|---|---|---|
| P0 | `add-parity-fixture-baseline` | Protocol inventory (see `protocol-catalog.md`), fixture export, parity runner, baseline measurements | Fixtures reproducible; runner runs green against JS-exported vectors |
| P1 | `add-elixir-phoenix-foundation` | Mix app, supervision tree, Repo, config, CI-able compile/tests; owns nothing | App compiles; existing Node game untouched and green |
| P2 | `add-phoenix-gateway-transport` | Phoenix Endpoint, UserSocket, signed guest credentials, Channels adapter behind NetworkClient, legacy routing proxy | Two browsers join via Phoenix transport; desiredRoom/reconnect preserved; unmigrated domains proxied to Node over private authenticated boundary |
| P3 | `add-world-room-runtime` | Room owner processes, Registry, DynamicSupervisor, movement validation/coalescing, presence (chat relay and weather stay with Node) | Two clients see equivalent state; reconnect resnapshots; no mailbox growth |
| P4 | `add-ash-accounts-domain` | Durable `guest_sessions` (token binding/revocation/expiry), receipt/outbox infrastructure; `players` as read-only shadow import (player data authority stays with P6); guestId migration claim window | Identity derived server-side; duplicate commands idempotent; legacy players imported as migration source with hashes |
| P5 | `add-ash-theater-catalog-domains` | Theater rooms/items + revision, catalog lists/channels/EPG, playlist import jobs | Theater parity fixtures green; imports validate; Node theater/catalog writes disabled |
| P6 | `add-ash-gardens-economy-restoration` | One transactional authority group: gardens, wallets, inventory, market, orders, contracts, nodes, machines (+ players activation and weather authority from this flip) | Conservation properties hold under concurrency; retry cannot duplicate rewards; harvest/fill atomic |
| P7 | `add-node-specialty-adapters` + `add-social-chat-relay` | Torrent + IRC sidecars behind authenticated grants; message IDs; bounded failure; chat relay moves to `Afterlight.Social` | Game survives sidecar crash; no unauthenticated torrent/IRC exposure; chat survives IRC loss |
| P8 | `add-conferencing-media-spike` | Signaling, grants, SFU adapter, bounded Membrane/ExWebRTC experiment, go/no-go gate | Gate decision documented with measurements; game unaffected either way |
| P9 | `add-distributed-room-ownership` | Room leases, epochs, fencing, drain | Partitioned owner stops durable mutations; successor epochs enforced |
| P10 | `add-observability-security-loadtesting` | Metrics, log correlation, load/soak/failure suites | 1k-session profile measured; p99 tick < 50 ms target evaluated honestly |
| P11 | `remove-node-server-authority` | Retire Node game server for migrated domains; keep sidecars; compatibility layer removal checklist | No Node writer remains for any migrated domain; parity + regression suites green |

## 3. Test matrix (layers)

| Layer | What | Where |
|---|---|---|
| Existing JS tests | Never deleted; must stay green throughout | `tests/*.test.js` (`npm test`) |
| Parity fixtures | Same input → JS and Elixir → same semantic output | `tests/fixtures/parity/*.json` + `scripts/export-parity-fixtures.mjs` + Elixir `Afterlight.Parity` runner |
| Elixir unit | Ash actions, policies, domain functions | Elixir app `test/` |
| DB integration | Real PostgreSQL constraints, transactions | Elixir `test/` (sql sandbox) |
| Concurrency | Market fills, reservation races, lease acquisition | Elixir async tests + property tests (StreamData) |
| Browser integration | Two clients, real controls | manual + scripted via browser tooling |
| Load/soak/failure | Protocol-aware clients, reconnect storms, DB outage | P10 change |

## 4. Non-negotiable invariants

- Coins/quantities are integers end-to-end; nonnegative DB constraints; explicit reservation columns.
- A market fill commits buyer/seller balances, reservations, inventory, remainders, fee, trade, ledger, receipt in ONE transaction with deterministic lock order.
- Durable commands carry `{protocol_version, request_id, expected_revision, payload}`; receipts keyed by (actor, request_id) with payload hash; different payload under same id is rejected.
- Publishing after commit uses an outbox; delivery is at-least-once; consumers dedupe by event id/revision.
- Actor identity always derives from the server-verified session; client-supplied ids are never authorization.
- The Three.js client owns canvas, rAF, input, camera, prediction, theater DOM, minimap, homography. Phoenix/LiveView never owns those subtrees (`phx-update="ignore"` island if LiveView shells are introduced).

## 5. P11 authority retirement status (2026-09-07)

Audit artifact: `openspec/changes/remove-node-server-authority/evidence/authority-audit.md`.

| Rows | Node write path | Gateway routing | Notes |
|---|---|---|---|
| 3–4 World | Retired on dev flip | `:phoenix` in `dev.exs` | Node shadow not used for movement/emote |
| 16 Chat | Retired on dev flip | `:phoenix` chat_send | Node chat frames suppressed |
| 1–2, 5–15, 22 | **Still active** via transitional sidecar relay | explicit `:node` in `Router.@node_relay_types` | Until P5/P6 Phoenix handlers land |
| 17–18 Sidecars | **Retained** | HTTP proxy + adapters | `server/torrents.js`, `server/irc.js` untouched |
| 19–21 | n/a (Elixir-native) | n/a | No Node path ever existed |

Router default for unknown game types: `:unrouted` (loud `error {message: unrouted}`) — no silent Node fallback.

Snapshot hashes (read-only forensic): `openspec/changes/remove-node-server-authority/evidence/snapshot-hashes.md`.

**Data policy:** `data/game-state.json`, `data/iptv.json`, and `data/epg.json` are never deleted; only regenerable caches (`data/torrents/` cache dir) may be cleared. Sidecar-owned files are written only by their sidecar.


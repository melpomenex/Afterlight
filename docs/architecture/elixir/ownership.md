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
| 5–11 | Garden / economy / restoration (garden beds, crops, wallets, inventory, NPC market, order book, contracts, gather nodes, machines) | **Retired** by `remove-gardening-domain` (was `server/gardens.js`, `server/economy.js`, `server/orderbook.js`, `server/nodes.js`, `server/machines.js`) | Removed from the wire and the schema; legacy values remain untouched inside the protected snapshots | — (domains and tables deleted) | — (tables dropped after a dated `.retired/economy-*.json` export) | **Retired** — P6 `add-ash-gardens-economy-restoration` cancelled/superseded | — | — | — (retired commands answer a bounded error) | Restore from the dated archive + the previous revision |
| 12 | Theater bill/timeline | **`Afterlight.Theater`** when `theater_queue`/`theater_control`/`theater_channel`/`theater_playlist_resolve` → `:phoenix` (dev flip: `config/dev.exs` or env); Node `server/theater.js` read-only after cutover | **`theater_rooms` + `theater_items`** (PG; monotonic `revision`, per-item `generation`) | `Afterlight.Theater` (Ash) | same | **P5 — handlers live; flip via gateway routing** | `src/ui/theaterScreen.js` (DOM, homography, engines) | Channels `theater:<instance>` topic | reducer actions with revision + atomic timeline commit + P4 receipts | Freeze + import `{now, queue}`; Node read-only after flip |
| 13 | YouTube playlist import | **`Afterlight.Theater`** Oban fetch worker + `PlaylistPreview` staging (same flip as #12) | none (preview rows ephemeral; confirming `addMany` durable in #12) | `Afterlight.Theater` + Oban job (fetch), Ash `import` records | import metadata tables | **P5** (with #12) | booth dialogs in `theaterScreen.js` | Channels resolve/reply | `theater_playlist_resolve` → preview → `theater_import_result` | Same as #12 |
| 14 | IPTV library | **`Afterlight.Catalog`** when `iptv_list_get` → `:phoenix`; Phoenix `TheaterPlaylistController` serves `POST /api/theater/playlists` (Node `server/iptv.js` read-only after cutover) | **`playlist_lists` + `playlist_channels`** (PG); `data/iptv.json` forensic read-only | `Afterlight.Catalog` (Ash) | same | **P5 — handlers live; flip via gateway routing** | booth dialogs | HTTP uploads + `iptv_state` broadcasts | HTTP POST endpoints (Phoenix-hosted at flip) | Import with hashes; originals read-only |
| 15 | EPG | **`Afterlight.Catalog`** when `iptv_list_get` → `:phoenix`; Phoenix `TheaterEpgController` serves `POST /api/theater/epg` | **`epg_guides` + `epg_channels` + `epg_programmes`** (PG); `data/epg.json` forensic read-only | `Afterlight.Catalog` | same | **P5** (with #14) | guide dialog | HTTP upload + `epg_schedule` lookups | Same as #14 | Same as #14 |
| 16 | Chat (game channels, DMs, history ring) | `server/chat.js` (rollback via `CHAT_RELAY_DISABLED`) | none (in-memory 100-msg ring) | `Afterlight.Social` (dev: `AFTERLIGHT_CHAT_OWNER=phoenix`) | optional `chat_messages` (history persistence is additive; default stays ephemeral) | `add-social-chat-relay` — **flipped in dev**; config rollback to Node | `src/ui/chatPanel.js` | Channels / `chat:*` topics | none required (relay) | Ephemeral history; flip back to Node loses in-flight ring |
| 17 | IRC bridge + IRC server | Node sidecar (`server/irc.js`) behind **`Afterlight.Specialty.IrcBridge`** authenticated adapter (`x-afterlight-boundary`); Phoenix chat relay owns game frames (P7) | none | Node sidecar behind authenticated adapter (retained) | none | **P7 — authenticated adapters live** | same chat panel | adapter events with message IDs + origin-scoped echo suppression | none | Sidecar crash degrades to game-only chat; bridge reconnects without duplicate relay |
| 18 | Torrent engine | Node sidecar (`server/torrents.js`) behind **`Afterlight.Specialty`** resolve proxy + grant validation; torrent **bill rows** (picks) durable in **`theater_items`** (P5); cache/library files stay sidecar-owned | `data/torrents/library.json` + cache dir (sidecar); **`theater_items` torrent pick fields** (PG) | Node sidecar (retained); Phoenix issues scoped playback grants (`torrent_grant` targeted events wired in `GameChannel`, verified by `game_channel_torrent_grant_test.exs`; earlier P7 "live" claims were uncalled until `fix-torrent-playback-grant-regression`) | sidecar files + `theater_items` picks | **P7 — grants + resolve proxy live; sidecar retained** | `theaterScreen.js` picker + `<video>` streaming | HTTP Range stream **requires `grant` query param** (P7) + WS `torrent_state` pass-through | `torrent_resolve` → `:specialty` (circuit breaker, cooldown, in-flight caps) | Sidecar failure → `engine_unavailable`; bill + exempt set survive in PG and re-sync on reconnect |
| 19 | Conferencing signaling | does not exist yet | none | `Afterlight.Conferencing` (Channels) | `calls`, `call_memberships`, media grants (short-lived) | P8 (spike) | new UI, opt-in | `call:<id>` topic | `authorize_join`, `issue_media_grant` | Independent feature; failure must not affect game |
| 20 | Conferencing media | does not exist yet | none | Media worker behind SFU adapter (Membrane/ExWebRTC experiment) | none (packets) | P8 | browser WebRTC | SRTP/ICE, never Channels/Ash | grants only | Adapter isolates SFU choice |
| 22 | Weather | `server/index.js` interval | none | `Afterlight.World.Weather` (welcome value; presentation-only) | none (deterministic rotation) | **Retired consumer**: the garden tick is gone; Node remains the rotation writer, relayed unsuppressed through the gateway (P3 posture); P6 weather-authority transfer cancelled | HUD / place atmosphere | broadcast (`weather_update`) | n/a | n/a |
| 23 | Place atmosphere | none (new system) | none (transient) | `Afterlight.World.Atmosphere` (held in `RoomServer`) | none (process memory, transient) | `add-atmosphere-weather-system` | `src/atmosphere/` (controller, events, sky, surfaces) | Channels (`game:v1` `atmosphere_state` / `atmosphere_get`) | transient | n/a — reconnect = fresh snapshot |

## 2. Migration phase map

| Phase | OpenSpec change | Content | Gate to exit |
|---|---|---|---|
| P0 | `add-parity-fixture-baseline` | Protocol inventory (see `protocol-catalog.md`), fixture export, parity runner, baseline measurements | Fixtures reproducible; runner runs green against JS-exported vectors |
| P1 | `add-elixir-phoenix-foundation` | Mix app, supervision tree, Repo, config, CI-able compile/tests; owns nothing | App compiles; existing Node game untouched and green |
| P2 | `add-phoenix-gateway-transport` | Phoenix Endpoint, UserSocket, signed guest credentials, Channels adapter behind NetworkClient, legacy routing proxy | Two browsers join via Phoenix transport; desiredRoom/reconnect preserved; unmigrated domains proxied to Node over private authenticated boundary |
| P3 | `add-world-room-runtime` | Room owner processes, Registry, DynamicSupervisor, movement validation/coalescing, presence (chat relay and weather stay with Node) | Two clients see equivalent state; reconnect resnapshots; no mailbox growth |
| P4 | `add-ash-accounts-domain` | Durable `guest_sessions` (token binding/revocation/expiry), receipt/outbox infrastructure; `players` as read-only shadow import (player data authority stays with P6); guestId migration claim window | Identity derived server-side; duplicate commands idempotent; legacy players imported as migration source with hashes |
| P5 | `add-ash-theater-catalog-domains` | Theater rooms/items + revision, catalog lists/channels/EPG, playlist import jobs | Theater parity fixtures green; imports validate; Node theater/catalog writes disabled |
| P6 | `add-ash-gardens-economy-restoration` | **Cancelled/superseded** by `remove-gardening-domain`: the garden/economy/restoration domain was removed in full instead of migrated | No conservation proof required; the dated `.retired/economy-*.json` export is the only restore source |
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
| 1–2 Accounts | Node relay retained for `hello`/`set_nickname` until flipped | `:node` in `Router.@node_relay_types` | Identity/profile shape is retained; economy fields are gone |
| 5–11 Garden/economy/restoration | **Retired** (`remove-gardening-domain`) | gone from `@node_relay_types`; retired types answer a bounded error | Tables/columns dropped after a dated `.retired/economy-*.json` export |
| 22 Weather | **Retained** as presentation-only | relayed unsuppressed | Node rotation; `world.Weather` keeps the welcome value |
| 12–15 Theater/catalog | **Flippable in dev** — handlers live in Phoenix | `:phoenix` on `theater_queue` / `theater_control` / `theater_channel` / `theater_playlist_resolve` / `iptv_list_get` / `iptv_list_remove` / `epg_lookup` (see `add-ash-theater-catalog-domains/evidence/dev-flip.md`) | Node `server/theater.js` / `server/iptv.js` writes disabled at cutover |
| 17–18 Sidecars | **Retained** with authenticated adapters | `torrent_resolve` → `:specialty`; stream grants required | `server/torrents.js`, `server/irc.js` — sidecar processes; Phoenix proxies resolve/status |
| 19–21 | n/a (Elixir-native) | n/a | No Node path ever existed |

Router default for unknown game types: `:unrouted` (loud `error {message: unrouted}`) — no silent Node fallback.

Snapshot hashes (read-only forensic): `openspec/changes/remove-node-server-authority/evidence/snapshot-hashes.md`.

**Data policy:** `data/game-state.json`, `data/iptv.json`, and `data/epg.json` are never deleted; only regenerable caches (`data/torrents/` cache dir) may be cleared. Sidecar-owned files are written only by their sidecar.

## 6. Theater streaming verification posture (2026-09-07, fix-theater-streaming-after-elixir-cutover)

A browser-level regression after the cutover showed that WS-green server checks do not prove streaming: the dominant failure was transport — a gateway booted without `check_origin` (or before `926a802`) rejects the dev client's WebSocket upgrade with 403, and every theater source kind silently dies behind an endless "reconnecting" loop while all server-side probes still pass.

Standing contracts and tooling from that change:

- **Origin contract.** The endpoint's origin list resolves only through `AfterlightWeb.OriginConfig` (`PHX_CHECK_ORIGIN=false` disables; a CSV overrides; defaults include the Vite dev origins + `*.vercel.app`). Unit-tested; never inline the case statement back into `runtime.exs`. Phoenix logs rejected origins with the offending value.
- **Boot-time tripwire.** `scripts/dev-elixir-stack.sh` performs a real browser-origin WS handshake (token + `Origin` → must answer 101) after the listeners come up and aborts the stack otherwise.
- **Acceptance gate.** Streaming claims require `node scripts/theater-streaming-smoke.mjs` (WS-level, self-cleaning probe items) PLUS the manual browser pass `scripts/theater-streaming-pass.md` (engines, iframes, HLS, granted streams are browser-only facts). Verified 2026-09-07 in a real browser: YouTube iframe, direct `.mp4`, HLS `.m3u8` all play on the in-world screen; invalid URLs are refused readably; a dead `.mp4` fails visibly and advances; a magnet resolve times out with a readable error in swarm-blocked environments.
- **Relay key.** `Theater.OutboxRelay` publishes through the room key derived from `TorrentRules.theater_wire_id()` — one shared definition, pinned by test. Publishing emits `[:afterlight, :theater, :broadcast]` telemetry (room, revision); a room-absent no-op logs at debug.
- **Proxy streams.** Torrent Range streams get a patient per-read idle timeout (`AFTERLIGHT_PROXY_TORRENT_TIMEOUT_MS`, default 300 s) via `AfterlightWeb.HTTPProxy.receive_timeout_ms/2`; other proxied paths keep 60 s. Range/206 semantics pass through the proxy untouched (unit-tested).
- **Stale live items.** A join snapshot whose live item is past its duration heals by one `ended` report; duplicates/races collapse via the item `generation` guard (channel-level tests pin this). Stale fixture items from cutover testing drained this way on 2026-09-07.


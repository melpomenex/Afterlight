# Afterlight protocol & persistence catalog (Node baseline, 2026-09-06)

Complete inventory of the current Node backend (`server/index.js` + managers) as captured by the migration audit. This is the compatibility target: the Phoenix gateway must reproduce these semantics behind the existing `NetworkClient` interface unless a change explicitly modifies them. Wire format today: flat JSON text frames `{type, ...fields}` (`shared/protocol.js:152-162`); malformed JSON parses to `null` and is dropped.

Related: `ownership.md` (who owns what), `parity-notes.md` (porting hazards).

## 1. Message catalog (exact type strings)

### Client → Server

| type | payload | domain | validation | mutates |
|---|---|---|---|---|
| `hello` | `{guestId?, nickname?}` | accounts | guestId adopted verbatim if present else `guest_<rand>`; nickname sanitized + deduped (`resolveDuplicateNickname`) | creates/loads player, registers session, bridges chat; replies `welcome` |
| `set_nickname` | `{nickname}` | accounts | `sanitizeNickname` (3–20 chars) | player nickname; targeted `welcome` re-sent |
| `join_room` | `{roomId}` | world | falls back `'market'`; any string accepted (rooms are open) | membership; joiner gets room snapshot; room gets `presence_join` (joiner excluded) |
| `movement` | `{x, z, rotY, walking, sitting, airborne}` | world | finite x/z/rotY only; **no bounds/velocity check**; flags `!!`; requires `session.currentRoom` | session pose; room marked dirty for 10 Hz flush |
| `garden_action` | `{actionId, action: till\|plant\|water\|harvest\|place_sprinkler, bedIndex, seedCropId}` | gardens | must own current garden room; seed/sprinkler inventory checked | bed state + inventory + xp; `garden_state` room broadcast, `inventory_state`, `action_result` |
| `market_buy` | `{cropId, quantity}` | economy | unknown crop/qty<=0/coins<cost rejected (`error: insufficient_coins`) | coins, seeds, multiplier +0.2/qty; `market_update` broadcast ALL, `inventory_state` |
| `market_sell` | `{cropId, quality, quantity}` | economy | produce held; goods forced quality B | produce→coins, xp, multiplier −0.5/qty |
| `order_place` | `{orderId, side, cropId, price, quantity, quality}` | economy | client-supplied `orderId` trusted; price/qty positivity; escrow checked | escrow, book, trades (fee `max(1, round(value*0.02))`); `market_update` |
| `order_cancel` | `{orderId}` | economy | must own order in book | escrow refund; `market_update` |
| `contract_complete` | `{contractId}` | economy | contract exists; produce covers qty at min quality | produce deducted, coins/rep/xp; `contract_update`, `inventory_state` |
| `node_harvest` | `{actionId, nodeId}` | restoration | node's district must equal current room; not depleted | materials +1; `node_state` room broadcast, `action_result` |
| `machine_contribute` | `{actionId, material, quantity}` | restoration | mill broken; material needed; applied=min(requested, held, remaining) | materials→mill; on completion `machine_update` + contract reroll |
| `machine_mill` | `{actionId, quantity?}` | restoration | mill restored; consumes wheat C→B→A→A+ | wheat→flour_B 1:1; `inventory_state` |
| `machine_craft` | `{actionId, fixture:'sprinkler'}` | restoration | cost copper 2 + glass 2 | materials→`inventory.sprinklers` |
| `emote` | `{emote}` | world | in 6-id allow-list; 500 ms cooldown | relay only; `emote_broadcast` room broadcast |
| `chat_send` | `{text}` | social | ≤600 raw/400 sanitized; `/me`, `/msg` parsed server-side | chat ring buffer; `chat_message` broadcast ALL or `chat_dm` targeted |
| `theater_queue` | `{op: add\|addMany\|remove\|playNow\|skip\|clear, ...}` | theater | room = theater; `shared/theaterModel.js` reducer rules | theater `{now, queue}`; persisted; `theater_state` room broadcast |
| `theater_control` | `{op: pause\|resume\|seek\|ended\|failed, itemId?, positionSec?}` | theater | seek clamps ≥0, HLS refused; ended/failed guarded by `itemId === now.id` | timeline state; auto-advance on ended/failed |
| `theater_channel` | `{url, title, + torrent pick fields}` | theater | URL classifies; torrent needs valid pick | replaces `now` |
| `theater_playlist_resolve` | `{requestId, listId}` | theater | room theater; 1 in flight; 10 s cooldown; not a mix id | none durable; targeted `theater_playlist_resolved` |
| `torrent_resolve` | `{requestId, magnet}` | theater | room theater; 1 in flight; `parseMagnet` valid | engine state; targeted `torrent_files` |
| `iptv_list_get` | `{listId}` | catalog | room theater | targeted `iptv_list` |
| `iptv_list_remove` | `{listId}` | catalog | room theater; **no ownership check** | iptv.json; `iptv_state` broadcast |
| `epg_lookup` | `{keys: []}` | catalog | ≤300 keys | targeted `epg_schedule` |
| `ping` | `{t}` | meta | none | targeted `pong {t}` |

### Server → Client

| type | payload | scope |
|---|---|---|
| `welcome` | `{player, weather, prices, contracts, orderBook, theater:{now,queue}, iptv}` | targeted, on hello + set_nickname. **No `serverNow` field today.** |
| `presence_join` | `{player:{id, nickname, x, z, rotY, walking, sitting}}` | room broadcast, joiner excluded |
| `presence_leave` | `{playerId}` | room broadcast |
| `presence_update` | `{players:[{id, x, z, rotY, walking, sitting, airborne}]}` | roster on join (targeted) + 10 Hz dirty-room flush (room broadcast) |
| `garden_state` | `{roomId, beds, fixtures?}` | targeted on hello/join; room broadcast after actions |
| `inventory_state` | `{player}` (full player) | targeted |
| `market_update` | `{prices, orderBook}` | broadcast ALL |
| `contract_update` | `{contracts}` | broadcast ALL |
| `node_state` | `{roomId, nodes}` | targeted on join; room broadcast on harvest/respawn |
| `machine_update` | `{machines}` | targeted on market join; market-room broadcast |
| `theater_state` | `{theater:{now,queue}, serverNow}` | room broadcast on every change; targeted on theater join |
| `theater_playlist_resolved` | `{requestId, title, videos}` | targeted to requester |
| `theater_import_result` | `{queued, skipped, didNotFit}` | targeted to importer |
| `iptv_state` | `{iptv:{lists, epg}}` (metadata only) | theater room + targeted |
| `iptv_list` | `{listId, channels}` | targeted |
| `epg_schedule` | `{entries:[{key, now, next}]}` | targeted |
| `torrent_files` | `{requestId, infohash, name, files}` | targeted |
| `torrent_state` | `{items:[{infohash, progress, peers, downloaded, ready}]}` | theater room, ~2 s while relevant |
| `weather_update` | `{weather}` | broadcast ALL (3-min rotation clear→drizzle→rain) |
| `action_result` | `{actionId?, success, title?, message}` | targeted |
| `trade_filled` | `{trade:{quantity, cropId, price}}` | targeted to filler |
| `emote_broadcast` | `{playerId, nickname, emote}` | room broadcast |
| `chat_history` | `{channel, messages}` (last 50) | targeted after hello |
| `chat_message` | `{channel, from, fromKind, text, ts, action?}` | broadcast ALL (sender echoed exactly once) |
| `chat_dm` | `{from, fromKind, to, text, ts, action?, echo?}` | targeted both parties |
| `chat_presence` | `{channel, event, who, fromKind, ts}` | broadcast ALL |
| `chat_error` | `{message}` | targeted |
| `error` | `{message}` (stable reason strings: `insufficient_coins`, `insufficient_produce`, `queue_full`, `item_mismatch`, …) | targeted; **only theaterScreen.js consumes bare `error` today** |
| `pong` | `{t}` | targeted |

Dead protocol constants (do not "fix" silently): `full_state` never sent; `torrent_files`/`torrent_state` misfiled under client→server in `MSG_TYPES`.

## 2. Rooms & transport semantics

- Room ids: `'market'`, `'theater'`, `` `garden:<playerId>` ``, district rooms `'foundry'`, `'trestle'`, `'frost-spire'`.
- Connection order is load-bearing: `hello` → targeted `welcome` → targeted `garden_state` → `chat_history`; then client `join_room` → roster `presence_update` → room snapshots (`theater_state`+`iptv_state` / `node_state`+`machine_update`).
- `desiredRoom` replay: client re-sends `join_room` on every reconnect (before that, boot order sends join after connect is initiated — see `src/net/client.js:88-93, 283-288`).
- Movement: client self-throttles 80 ms; server flushes dirty rooms every 100 ms with FULL roster snapshots; no delta encoding; no slow-client handling (no `bufferedAmount` checks).
- Duplicate guestId: second connection **overwrites** the session map entry; old socket stays open; first close evicts the surviving session (known quirk — the Phoenix gateway must NOT create a second logical session on transport reconnect). **Fixed in P3** (`add-world-room-runtime` D8): at the gateway the newest transport wins and the older one is closed with the terminal `superseded` error reason (the client facade stops retrying on it); in the world runtime, membership is per-connection (`conn_ref`), a superseding join replaces the roster entry in place, and a stale connection's late leave cannot evict the survivor — the ghost quirk is structurally impossible on the Phoenix path.
- Server ticks: 100 ms movement flush; 1 Hz garden/nodes/torrent-tick; 3-min weather; 5-min contracts; ~2 s torrent_state; IRC ping 30 s.

### Gateway disposition (P2 — add-phoenix-gateway-transport)

Server-side, config-owned (`Gateway.Router`); clients cannot choose the implementation. In P2 every game domain is `node`; `ping` and token/connect handling terminate at the gateway.

| Message / event | P2 disposition |
|---|---|
| socket connect, token verify, connect rate limit, channel join authorization | gateway |
| `ping` → `pong` `{t}` echo | gateway (transport liveness; Node echo semantics preserved) |
| `hello`, `set_nickname` (+ `welcome`) | relayed (accounts durability is Node's until P4) |
| `join_room`, `presence_*`, room join snapshots (`theater_state`, `iptv_state`, `node_state`, `machine_update`, `garden_state`) | relayed (P3 runtime owns rooms later) |
| `movement`, `emote` / `emote_broadcast` | relayed |
| `chat_send`, `chat_message`, `chat_dm`, `chat_history`, `chat_presence`, `chat_error` | **terminated by `Afterlight.Social`** when `AFTERLIGHT_CHAT_OWNER=phoenix` (dev default in `config/dev.exs`); Node shadow frames suppressed; IRC sidecar via authenticated adapter (P7) |
| all durable-domain messages (gardens, economy, restoration, theater, catalog, torrents) | relayed |

Relay mechanics: one upstream Node WebSocket per gateway session ("shadow" connection), flat⇄flat frames in order — Node semantics including snapshot ordering and `error` reason strings are preserved byte-for-byte. Reconnect stickiness: newest connection wins; the old upstream is closed and processed BEFORE the new `hello` is forwarded, so Node never holds two sessions for one guestId (the duplicate-guestId ghost cannot arise from transport reconnects).

Slow receivers (P2 posture — REPLACED in P3): the proxy phase retained Node's behavior — full-roster 10 Hz snapshots with no per-client buffer accounting, so unbounded queueing under a stalled consumer was a known property of that phase. P3 (`add-world-room-runtime`, design D3) replaces it on the flipped path: per-transport outbound is bounded by `config :afterlight, :world, outbound_queue_max` (default 256, the ceiling informed by the P2 queue-depth telemetry). When a member's channel mailbox exceeds the bound the runtime treats it as a stalled consumer — that transport is closed with the retryable `error {message: "room_stalled"}` and the member is removed (other members keep streaming); the client resnapshots via its `desiredRoom` replay. Room processes avoid selective receive and movement coalesces newest-pose-per-actor between the 100 ms flush ticks, so no unbounded frame queueing exists on the flipped path.

### World disposition (P3 — add-world-room-runtime)

When the world routing rows (`join_room`, `movement`, `emote`) are `:phoenix`, `Afterlight.World` room processes own presence — the single writer — and the gateway applies the following per-routing-position rules (suppression and the flip are keyed on the same `join_room` row, so a rollback flip-flop can never leave one enabled without the other):

| Message / event | P3 disposition |
|---|---|
| `join_room` | World join first (roster `presence_update` to joiner, `presence_join` to room minus joiner, duplicate join a presence no-op), then FORWARDED to the Node shadow session for `currentRoom` context (`garden_action` ownership, `node_harvest` district match, theater/catalog room checks) |
| Node join snapshots (`garden_state`, `theater_state`, `iptv_state`, `node_state`, `machine_update`) | relayed to the joiner after the World roster send — the documented `join_room` → roster → snapshots ordering is preserved (design D6) |
| `presence_join` / `presence_leave` / `presence_update` (Node-emitted) | suppressed at the gateway while world = phoenix — World is the single presence writer |
| `movement` | world-owned (validated + clamped, newest-pose-per-actor coalesced 10 Hz full-roster flush); NOT relayed to Node (Node would double-broadcast the room's frames) |
| `emote` / `emote_broadcast` | world-owned (6-id allow-list, 500 ms per-transport-session cooldown); NOT relayed to Node |
| `weather_update` / `welcome.weather` | Node-owned and relayed unsuppressed throughout P3 — Node owns weather until the P6 group flip (design D7); a P3 rollback has nothing weather-related to toggle |
| `set_nickname` (+ Node's re-sent `welcome`) | relayed; the welcome's sanitized nickname is propagated to the room runtime so rosters and `emote_broadcast` read live |
| durable domains while the transport has no live World membership (crash or flip window) | refused with the retryable `error {message: "room_unavailable"}` — Node's shadow `currentRoom` may not authorize a player no room owns; the `desiredRoom` replay restores membership |
| stalled consumer at the outbound bound | transport closed with retryable `error {message: "room_stalled"}`; the client resnapshots via desiredRoom replay |
| superseded transport (duplicate connect) | terminal `error {message: "superseded"}`; the client facade stops retrying |

Rollback: the flip is a pure config edit — the three world rows (`join_room`, `movement`, `emote`) of `config :afterlight, :gateway, routing` set to `:phoenix` or back to `:node`; rollback is the same edit in reverse. It is a pure transport change: no durable state moves in either direction and suppression toggles off with the same rows (weather never stopped flowing from Node). Flip choreography is normative in BOTH directions (`node→phoenix` and `phoenix→node`): the flip force-closes the transports whose live membership the outgoing owner holds — the canonical procedure is a gateway restart, which force-closes all transports — so every client's `desiredRoom` replay re-derives membership from the incoming owner before any `movement` is accepted; `movement` from an identity with no live roster entry is refused (the pose write is dropped, not ghosted) and is not client-visible beyond the reconnect the flip itself causes. The transient-pose reset on flip is the same reset as a Node restart today — stated honestly, not hidden.

### World runtime telemetry (P3 — add-world-room-runtime, design D10)

Named at the emit sites in `World.RoomServer`; dashboards and alert thresholds remain deferred to P10 (`add-observability-security-loadtesting`). Every event carries room/player identifiers and counts — never tokens or credentials.

| Event | Measurements | Metadata |
|---|---|---|
| `[:afterlight, :room, :join]` | `roster_size` | `room` (wire id), `player` — emitted only for a new roster member (duplicate joins and supersessions are presence no-ops by design, D8) |
| `[:afterlight, :room, :leave]` | — | `room`, `player`, `reason` (`:travel`, `:disconnect`, `:stalled`) |
| `[:afterlight, :room, :tick]` | `duration_ms`, `roster_size` | `room` — dirty flushes only |
| `[:afterlight, :movement, :coalesced]` | `received`, `flushed` | `room` — same tick, received-vs-flushed pose counts |
| `[:afterlight, :room, :stopped]` | `lifetime_ms` | `room` — empty-room grace stop |

## 3. Persistence map (current)

| State | File | Writer | Notes |
|---|---|---|---|
| Whole game state | `data/game-state.json` (17.5 KB) | `Storage` — synchronous whole-file rewrite on nearly every mutation | `{version, players(26), gardens, orders, trades(≤100), marketMultipliers, nodes, machines, theater}` |
| IPTV library | `data/iptv.json` (3.6 MB) | `IptvManager`, atomic, rollback on failure | 2 lists, 16k channels total |
| EPG | `data/epg.json` (9.2 MB) | `IptvManager`, atomic, rollback | 12k channels, 1.3k with programmes |
| Torrent library | `data/torrents/library.json` | `TorrentManager` | infohash→magnet; cache dir disposable |
| Chat history / IRC state / sessions / contract board / weather | memory only | — | lost on restart (current behavior) |

## 4. Identity & security baseline (to be replaced in P2/P4)

- Identity = client-generated `guestId` (`guest_<9 base36>_<base36 ts>`, localStorage `afterlight-gardener-guest-id`), trusted verbatim. No signature, no session token.
- All HTTP endpoints unauthenticated; CORS echoes any Origin on `/api/theater/*`.
- HTTP surface: `GET /api/health`; `POST /api/theater/playlists` (text or `{url}` server-fetch, 8 MiB caps, 15 s timeout); `POST /api/theater/epg` (64 MiB, gzip detected); `GET/HEAD /api/theater/torrent/:infohash/:fileIndex` (Range 206, video extensions only).
- Known caps: theater queue 50, URL 2048, title 120; IPTV 24 lists/20k channels/list; EPG 50k channels/250k programmes/300-key lookups; chat 600/400 chars; emote 500 ms; playlist resolve 10 s cooldown; torrent picker 60 files; trades kept 100.

### Signed guest credentials (P2 transitional semantics)

`POST /api/auth/guest` (gateway) issues a short-lived `Phoenix.Token` (~12 h) over `{guest_id, nickname_hint, issued_at}`; the socket connect REQUIRES a valid token, and the verified `guest_id` claim binds the connection. Precisely: in P2 the token authenticates the SOCKET HANDSHAKE — possession of a valid token gates the connect; it does not yet make a guestId unforgeable as a player identity (guestId remains client-chosen and the token is issued over it; player-identity trust lands in P4/P6). guestId continues to identify: hello still carries it, Node still keys sessions and answers `welcome` by it, self-echo filtering and `garden:<guestId>` room ids keep working. A hello whose guestId differs from the token claim is refused (defensive; current clients always match).

## 5. Client contract (NetworkClient) — what the adapter must preserve

- Constructor shape `new NetworkClient(wsUrl)`; handlers `on(type, fn)` — **multiple handlers per type, registration order**; `onConnect`/`onDisconnect`; `send(type, payload)` silently drops when closed; movement self-throttle 80 ms.
- All helpers (`sendTheaterQueue`, `sendGardenAction` → generates `actionId`, `sendOrderPlace` → generates `orderId`, etc.) and HTTP side channel (`apiBase`, `postToTheater`, uploads, torrent Range streaming origin).
- Envelope: Phoenix adapter unwraps `{topic, event, payload}` → re-emits flat `{type: event, ...payload}`.
- Self-filtering uses `net.guestId` string equality; garden room id = `garden:<guestId>` — identity continuity is required or self-ghosts appear.
- Local-only state (never server-owned): camera mode/yaw/pitch/zoom, jump physics, held keys, exploration save (`afterlight-save`), audio settings, theater volume/serverDelta, chat panel size, personal IPTV lists.

P3 verification re-runs this contract's regression list unchanged on the flipped world path (self-echo filtering via guestId continuity, duplicate-handler ordering, airborne flag edge, `error` consumers, duplicate `join_room` no-op) — evidence lives with `add-world-room-runtime`.

## 6. Declared tightenings

Server-side-only behavior tightenings declared by migration changes, per the `migration-governance` "Declared tightenings" requirement. Each is recorded here with its client-impact analysis; undeclared behavior changes are treated as parity failures.

| Phase | Tightening | Declared by | Client impact |
|---|---|---|---|
| P3 | Movement bounds clamp: stored and broadcast poses are clamped into the walkable bounds `-11.3 < x < 11.3`, `-9.5 < z < 10.3` (out-of-bounds input clamped, not rejected) | `add-world-room-runtime` D4 (deliberate tightening #1) | None for spec-compliant clients — the client already enforces the same bounds (`src/world/bounds.js`); only modified/buggy clients can no longer stand outside the map. |
| P2/P3 | Duplicate-connect newest-wins supersession: when a second transport arrives for an identity, the older transport is closed with a documented supersession close reason; no ghost members | `add-phoenix-gateway-transport` D6 / `add-world-room-runtime` D8 (deliberate tightening #2) | None for spec-compliant clients — reconnect/refresh receives a clean close plus a fresh snapshot instead of Node's silent ghost-eviction quirk; a stale duplicate tab observes a clean close rather than becoming a zombie. Client-impact analysis (P3, spec-required): the losing transport receives the terminal `error {message: "superseded"}` and its facade stops retrying. (a) *Two live tabs sharing a guestId* — each supersession closes only the older tab, once; the losing tab stops reconnecting (`src/net/client.js` treats that reason as stop-retrying; a reload starts a fresh race), so the incident can NOT loop into leave/join churn. Traffic per incident: exactly one close for the loser and, for other room members, at most one leave/join pair — one `presence_leave` in the loser's room only when the winner joined a different room, and nothing at all when the roster entry is superseded in place (same room: the player never leaves the roster). (b) *Adversarial holder of a broadcast guestId* — the same terminal treatment applies to whichever transport loses: the victim stops retrying instead of fighting the attacker back, and when the legitimate client returns, the attacker's transport is superseded just as cleanly, so mutual eviction loops cannot self-sustain. Per-incident traffic is the same at-most-one leave/join pair as (a); the attacker gains nothing beyond displacing one connection. (c) *Rollback* — flipping the world rows back to `:node` force-closes the transports whose live membership the outgoing owner holds (flip choreography is normative in BOTH directions); `movement` from a not-yet-rejoined identity is refused rather than ghosted and is not client-visible beyond the reconnect the flip itself causes; transient poses reset — players reappear at spawn/last-Node-known poses, the same reset as a Node restart today, stated honestly. |
| P3 | Bounded outbound replaces the unbounded Node posture on the Phoenix path: a consumer whose channel mailbox exceeds the configured ceiling is disconnected with retryable `error {message: "room_stalled"}` and resnapshots via desiredRoom replay | `add-world-room-runtime` D3d | None for spec-compliant clients — a healthy consumer never reaches the bound (256 default). A stalled consumer now observes a clean retryable close instead of unbounded latency growth. |
| P3 | Server-owned arrival time for movement: arrival time is stamped server-side on receipt and used for tick bookkeeping and telemetry — it is not added to the wire | `add-world-room-runtime` D4 | None — no wire format change; the flat `movement` payload and the 80 ms client throttle are unchanged. |

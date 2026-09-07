# P11 authority audit checklist

Recorded: 2026-09-07. Gate: `remove-node-server-authority` task 1.1.

Legend: **Locate** = Node write path in code | **Disable** = not routable as authority | **Verify** = test/probe/deletion proof

## Migrated rows (1–16, 22) — Node game authority must be retired

| # | Subsystem | Locate (Node) | Disable status | Verify evidence | Notes |
|---|---|---|---|---|---|
| 1 | Accounts / guest identity | `server/index.js` hello | **Partial** — hello still relayed; token auth at gateway | `Afterlight.Accounts.GatewayTest`, `game_channel_test.exs` identity_mismatch | P4 session in PG; welcome still Node-built |
| 2 | Nicknames | `server/index.js` set_nickname | **Partial** — relayed to Node | `gateway_test.exs` disposition :node | Ash `set_nickname` exists; wire not flipped |
| 3 | World movement | `server/world.js` | **Flipped dev** — `:phoenix` rows | `verify-world-runtime.mjs`, `game_channel_world_test.exs` | Node shadow not relayed for movement when flipped |
| 4 | Room membership | `server/world.js` rooms | **Flipped dev** — World owns roster | same as #3 | join_room still forwarded to Node for currentRoom context |
| 5 | Garden | `server/gardens.js` | **Open** — relayed `:node` | `Router.disposition("garden_action") == :node` | P6 Ash domain not wired in GameChannel |
| 6 | Wallet / inventory | `server/economy.js`, handlers | **Open** | Node `storage.save()` on economy ops | P6 not flipped |
| 7 | NPC market | `server/economy.js` | **Open** | same | P6 not flipped |
| 8 | Order book | `server/orderbook.js` | **Open** | same | P6 not flipped |
| 9 | Contracts | `server/economy.js` | **Open** | same | P6 not flipped |
| 10 | Gather nodes | `server/nodes.js` | **Open** | same | P6 not flipped |
| 11 | Shared machines | `server/machines.js` | **Open** | same | P6 not flipped |
| 12 | Theater bill | `server/theater.js` | **Open** | same | P5 reducer port exists; wire not flipped |
| 13 | Playlist import | `server/youtubePlaylist.js` | **Open** | same | P5 not flipped |
| 14 | IPTV library | `server/iptv.js` → `iptv.json` | **Open** | `server/iptv.js` writes `data/iptv.json` | P5 not flipped; snapshot frozen (see hashes) |
| 15 | EPG | `server/iptv.js` → `epg.json` | **Open** | same | P5 not flipped |
| 16 | Chat relay | `server/chat.js` | **Flipped dev** — `:phoenix` chat_send | `verify-social-chat.mjs`, `social/relay_test.exs` | Node chat frames suppressed when flipped |
| 22 | Weather | `server/index.js` interval | **Open** — Node broadcasts | relay unsuppressed in GameChannel | P6 group flip pending |

## Retained sidecars (17–18) — must stay intact

| # | Subsystem | Adapter boundary | Verify evidence | Notes |
|---|---|---|---|---|
| 17 | IRC bridge + server | `Afterlight.Social.Bridge` → Node IRC | `social/bridge_test.exs` | `server/irc.js` untouched; sidecar HTTP/IRC port |
| 18 | Torrent engine | Phoenix grant + HTTP proxy → Node | `tests/torrents.test.js`, `HTTPProxy` tests | `server/torrents.js` untouched; Range stream via `/api/theater/torrent/*` |

## Elixir-native rows (19–21) — no Node write path ever

| # | Subsystem | Verify |
|---|---|---|
| 19 | Conferencing signaling | `Afterlight.Conferencing` — no Node module |
| 20 | Conferencing media | adapter spike only |
| 21 | Recordings | not implemented |

## Runtime probes (task 1.2)

| Probe | Result |
|---|---|
| Movement with `AFTERLIGHT_WORLD_OWNER=phoenix` does not hit Node upstream | PASS — `game_channel_world_test.exs` asserts no shadow presence leak |
| Chat with `AFTERLIGHT_CHAT_OWNER=phoenix` does not relay chat_send to Node | PASS — `verify-social-chat.mjs` |
| Unknown game message type no longer silent Node fallback | PASS — `Router.disposition/1` defaults to `:unrouted`; GameChannel pushes `error {message: unrouted}` |
| Explicit `:node` relay types still reach FakeCore/Node in tests | PASS — `router_test.exs` transitional table |
| Node still writes `game-state.json` when relay active | **Expected until P6** — grep `storage.save()` in server/ |

## Findings fixed in this change (task 1.3)

1. **Silent Node fallback removed** — unknown/unlisted game types now `:unrouted` with loud gateway error (router + GameChannel).
2. **Transitional relay explicit** — only listed types retain `:node` disposition; documented in `Gateway.Router`.
3. **Legacy dual-run env vars** — startup deprecation warnings (`Afterlight.Gateway.LegacyConfig`).

## Blocked on P9 / remaining migration

- Full Node proxy deletion (task 2.3): blocked while hello, economy, theater, catalog rows still `:node` relay.
- Node `storage.save()` retirement: blocked on P6 economy-group cutover.
- Multi-node lease fencing: P9 `add-distributed-room-ownership` may still be in progress; P11 proceeds on P10 single-node deferral evidence per proposal.

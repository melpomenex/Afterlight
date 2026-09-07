# P2 verification evidence (`add-phoenix-gateway-transport`)

Date: 2026-09-07. Branch: `cursor/p2-phoenix-verify-025d`. Honest: **scripted Phoenix clients**, not two human browsers.

Environment: Linux cloud agent; Node 22; Elixir 1.18.4 / OTP 27.3 (`elixir-lang.org/install.sh`); PostgreSQL 16 on `:5432` (`DATABASE_URL=ecto://afterlight:afterlight@127.0.0.1:5432/afterlight_*`). No GUI browser.

## 6.3 Two-browser Phoenix transport — **blocked / unchecked**

No two-browser session was run (no browser tooling in this agent).

Automated stand-in **passed**: `node scripts/verify-gateway-transport.mjs` (exit 0, 14 `ok` lines, ~3 s after servers up).

```
ok  proxied /api/health (gateway → boundary → Node)
ok  two sessions: hello → welcome with guestId continuity
ok  ping → pong at gateway; duplicate onMessage wrappers run in order
ok  join market; duplicate join_room is a presence no-op
ok  airborne true relays; omitted/false flag reads grounded for the peer
ok  self-echo filtering identity: guestId on welcome matches presence self row
ok  chat both directions through the relay
ok  emote_broadcast relayed to the other session (remote rendering input)
ok  theater join snapshots + shared theater_state after theater_channel
ok  bare error {message} delivered flat (theaterScreen consumer shape)
ok  garden:<guestId> join returns garden_state
ok  market_buy applied through the proxy
ok  reconnect: fresh welcome, exactly one self in roster (newest-wins)
ok  rollback rehearsal: secret-less client → Node :ws still gets welcome
P2 SCRIPT PASS: Phoenix two-client relay + §5 checks + Node rollback path.
```

Still **not** verified: Three.js remote emote poses, cinema/homography overlay, two windows of equivalent pixels, click-to-walk, Kiln.

## 6.4 Protocol-catalog §5 on the Phoenix path — **verified (scripted)**

Same script, both sessions on `ws://127.0.0.1:4101/ws` with signed tokens.

| §5 item | Result |
|---|---|
| Self-echo / guestId continuity | welcome.player.id === hello guestId; A receives own row on 10 Hz flush (client would skip via `p.id !== net.guestId`) |
| Duplicate-handler order | stacked `channel.onMessage` wrappers on gateway `pong` fired first then second |
| Airborne flag | peer saw `airborne: true` then grounded when the field was omitted (`!!` coerce) |
| Bare `error` | `{type:'error', message:'insufficient_coins'}` — same shape `theaterScreen.applyServerErrorMessage` reads |
| Duplicate `join_room` | second market join did not emit another `presence_join` for A |

Facade unit coverage remains in `tests/transport-adapter.test.js` (Node default transport). One of those tests failed in this environment: `facade: movement throttle caps at ~80ms spacing` (`0 !== 1`) because `lastMovementSend` starts at `0` and `performance.now() < 80` drops the first packet. Not fixed here (no NodeProxy/client rewrite).

## 6.5 Load note — **partial / unchecked**

**Unbounded send retained:** recorded in `docs/architecture/elixir/protocol-catalog.md` §2. Node `ws.send` has no `bufferedAmount` checks. `NodeProxy` uses `:queue` with no cap while connecting (`flush_queue/1`). Bounding remains P3.

**Telemetry counter:** **not present.** `rg` over `server_elixir/lib` finds only `[:vm, :total_run_queue_lengths]`. No `[:afterlight, :gateway, :queue_depth]`. NodeProxy was not edited.

**Measurement taken:** `mix test test/afterlight/gateway/node_proxy_test.exs` — 9 tests, 0 failures, including “outbound frames queue while the upstream is connecting, flush in order” (2 frames accepted with zero upstream sends, then flushed seq 1 then 2). That is connecting-queue growth, not a TCP stalled-consumer soak. No live `bufferedAmount` / mailbox-depth time series.

## 6.6 Full-suite gate — **unchecked**

| Command | Result |
|---|---|
| `mix test` (exclude `:integration`) | **green**: 83 tests, 0 failures, 1 excluded (2026-09-07) |
| `npm test` full | **not green here**: after `npm install`, `tests/torrents.test.js` hung (webtorrent); killed after 10+ min. Without phoenix installed, 244 tests / 7 fail (`phoenix` missing + `engine_unavailable`). |
| `node --test` excluding `torrents.test.js` | 229 tests, **1 fail** (movement throttle, above) |
| Two-browser P2 exit | **not recorded** |

## 7.2 Rollback — **verified (docs + scripted rehearsal)**

Docs:

- `README.md` — Rolling back to the Node socket (P2)
- `server_elixir/README.md` — P2 rollback (transport only)
- `docs/architecture/elixir/README.md` — P2 transport rollback

Rehearsal: script opens a **secret-less** WebSocket to throwaway Node `:3901` after Phoenix checks and asserts `hello` → `welcome` for `guest_p2_rollback`. That is the P2 direct-client path. Vite `VITE_TRANSPORT=node` UI reboot was not run.

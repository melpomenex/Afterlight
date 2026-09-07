# P2 verification evidence (`add-phoenix-gateway-transport`)

Recorded by the remaining-verification pass (tasks 6.3–7.2). Honest: scripted clients, not two human browsers.

Environment (this run): Linux cloud agent, Node from `nvm`, Elixir 1.18.4 / OTP 27.3 via `elixir-lang.org/install.sh`, PostgreSQL 16 on `:5432` (`DATABASE_URL=ecto://afterlight:afterlight@127.0.0.1:5432/afterlight_*`). Repo HEAD at commit time is listed in the git log of this change branch.

## 6.3 Two-browser Phoenix transport

**Not a two-browser run.** No GUI browsers in this environment.

Automated stand-in: `node scripts/verify-gateway-transport.mjs` — two Phoenix Channels sessions through a real gateway (`mix phx.server`) and throwaway Node server.

| Item | Automated? | Result |
|---|---|---|
| Join | yes (two guests) | pending this file's run log |
| Travel between rooms | yes (market / theater / garden) | pending |
| Emotes with remote rendering | wire `emote_broadcast` to the other session; **no Three.js pose** | pending |
| Chat both directions | yes | pending |
| Theater playback state | `theater_state` after `theater_channel`; **no DOM overlay / cinema CSS** | pending |
| Garden join | `garden:<guestId>` → `garden_state` | pending |
| Market actions | `market_buy` + `inventory_state` | pending |
| Forced reconnect, desiredRoom, welcome, roster, no ghost | yes (scripted disconnect + re-hello) | pending |
| Human two-browser visual equivalence | **blocked** | unchecked in tasks.md |

## 6.4 Protocol-catalog §5 on the Phoenix path

Covered in the same script plus existing `tests/transport-adapter.test.js` (facade, Node default).

| §5 item | How | Result |
|---|---|---|
| Self-echo via guestId continuity | welcome.player.id === hello guestId; self row in presence_update | pending |
| Duplicate-handler ordering | stacked `channel.onMessage` wrappers on pong | pending |
| Airborne flag edge | peer sees `airborne: true` then grounded when flag omitted | pending |
| `error` consumers | flat `{type:'error', message:'insufficient_coins'}` (theaterScreen reads `msg.message`) | pending |
| Duplicate `join_room` no-op | second join does not emit another `presence_join` | pending |

## 6.5 Load note

**Unbounded send retained (P2):** documented in `docs/architecture/elixir/protocol-catalog.md` §2. Node `ws.send` has no `bufferedAmount` checks (`server/world.js`, `server/index.js`). `Afterlight.Gateway.NodeProxy` queues with `:queue` while connecting and never bounds it (design D7).

**Telemetry counter:** grep of `server_elixir/lib` found **no** `[:afterlight, :gateway, …]` / `queue_depth` execute. `AfterlightWeb.Telemetry` still only VM + Phoenix endpoint summaries. Task 6.5 is **not** fully met; NodeProxy was not edited (no P2 functional bug).

**Measurement:** `mix test` `NodeProxyTest` “outbound frames queue while the upstream is connecting, flush in order” — 2 frames accepted with zero upstream sends, then flushed in seq order after `announce`. That is connecting-queue growth, not a TCP stalled-consumer soak. A live stalled-socket byte-queue measurement was **not** taken.

## 6.6 Full-suite gate

| Command | Result |
|---|---|
| `npm test` | pending |
| `mix test` (exclude integration) | pending |
| Two-browser gate | **not recorded as pass** (scripted substitute only) |

## 7.2 Rollback

Documented in:

- repository `README.md` → Optional Phoenix gateway transport → Rolling back to the Node socket
- `server_elixir/README.md` → P2 rollback
- `docs/architecture/elixir/README.md` → P2 transport rollback

Rehearsal: end of `scripts/verify-gateway-transport.mjs` opens a **secret-less** WebSocket to Node and asserts `hello` → `welcome`. That is the P2 rollback path (direct clients remain accepted).

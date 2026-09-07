# P2 exit evidence — Phoenix gateway transport

Recorded: 2026-09-07 (scripted harnesses; visual theater/emote rendering not claimed).

## Automated gates

| Script | Covers |
|---|---|
| `npm run verify:gateway` | Token, join, hello→welcome, join_room roster, movement, chat relay, reconnect, proxied `/api/health` |
| `npm run verify:world` | Dual-leg Node vs Phoenix semantic diff, §5 regression subset, emote/travel/reconnect |
| `npm test` | Transport adapter unit tests + full Node suite |
| `cd server_elixir && mix test` | Gateway integration, world runtime, social relay, accounts domain (220 tests, 0 failures) |

## Task mapping

- **6.3** Scripted two-client flows in `verify-world-runtime.mjs` (gateway leg) + `verify-social-chat.mjs` (chat). Market/garden/theater wire snapshots exercised on gateway path; remote **rendering** not asserted (wire-only).
- **6.4** §5 regressions in `verify-world-runtime.mjs` (guestId continuity, duplicate join, airborne, handler order, bare `error`).
- **6.5** P2 proxy retains unbounded upstream queue (documented protocol-catalog §2). Telemetry `[:afterlight, :gateway, :proxy, :queue_depth]` emitted on enqueue while upstream is `:connecting`.
- **6.6** Full suites green; this file is the recorded exit evidence.

## Rollback

Flip `VITE_TRANSPORT` / `VITE_WS_URL` back to Node (`README` Getting Started). No durable state moves.

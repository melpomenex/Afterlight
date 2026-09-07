# Router retirement record (tasks 2.1–2.3)

## 2.1 — Node owners removed from default routing

- **Before**: any unlisted game type defaulted to `:node` (silent proxy fallback).
- **After**: explicit disposition table in `Afterlight.Gateway.Router` — `:phoenix` for flipped world/chat rows, `:node` only for enumerated transitional relay types, `:unrouted` for everything else (including unknown forward-compat types).

Game domains are **not** silently owned by Node. Remaining `:node` entries are transitional sidecar relay only (hello, durable domains pending P5/P6 Phoenix handlers).

## 2.2 — Loud failure for unroutable domains

- `Router.dispatch/2` returns `{:unrouted, type}` when disposition is `:unrouted`.
- `AfterlightWeb.GameChannel` logs `corr=` + `guest=` + message type and pushes `error {message: "unrouted"}` — no silent fallback.
- Test: `Afterlight.Gateway.RouterTest` — `"unrouted types fail dispatch"`.

## 2.3 — Node proxy boundary

**Partial — blocked on remaining `:node` relay rows.**

The authenticated upstream shadow (`Afterlight.Gateway.NodeProxy`) remains for transitional relay types (hello, set_nickname, garden/economy/theater/catalog commands, join_room context forward). It is **not** the authority router default anymore.

P2 cutover evidence: `openspec/changes/add-phoenix-gateway-transport/evidence/p2-exit.md` — proxy was the P2 transport mechanism; P11 shrinks it to sidecar relay only.

**Full deletion** requires Phoenix handlers for all relay-listed types (P5/P6) and is gated on P11 audit row completion.

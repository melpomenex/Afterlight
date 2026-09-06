# Design: Phoenix Gateway Transport (P2)

## Context

The Node server (`server/index.js`) is the composition root: one HTTP server on `:3001` upgraded for WebSockets at `/ws`, flat JSON text frames `{type, ...fields}` (`shared/protocol.js`), and identity equal to a client-generated `guestId` trusted verbatim (protocol-catalog §4). The client's `NetworkClient` (`src/net/client.js`) owns reconnect, `desiredRoom` replay, handler dispatch (multiple handlers per type, registration order), silent-drop sends, an 80 ms movement self-throttle, and an HTTP side channel whose `apiBase` is derived from the WS URL host (uploads + torrent Range streaming). `tests/presence-race.test.js` constructs `new NetworkClient(wsUrl)` against a real server — the constructor shape and Node behavior are pinned by tests.

The umbrella (`port-backend-to-elixir`) fixed the governance: one writer per durable domain, authority routed at the gateway, client behavior preserved behind a transport adapter. `add-elixir-phoenix-foundation` (P1) provides the Mix app and Endpoint but owns nothing. This change (P2) must put the existing client's traffic through Phoenix **without moving any authority**: theater/catalog (P5), gardens/economy/restoration (P6), accounts durability (P4), chat relay and the world runtime (P3) all remain Node's. The two-browser equivalence test is the phase gate.

Facts that shape the design:

- Connection order is load-bearing (protocol-catalog §2): `hello` → targeted `welcome` → `garden_state` → `chat_history`; then `join_room` → roster `presence_update` → room snapshots. The client re-sends `join_room` on every reconnect; `welcome` after every reconnect is required (net indicator + chat enable depend on it).
- Self-echo filtering uses `net.guestId` string equality, and garden room ids are `garden:<guestId>` — identity continuity is required or self-ghosts appear (protocol-catalog §5).
- Duplicate guestId today: second connection overwrites Node's session map entry, the old socket stays open, and the first close evicts the *surviving* session (known ghost quirk, protocol-catalog §2). A naive proxy would inherit this on every transport reconnect.
- `welcome` carries `{player, weather, prices, contracts, orderBook, theater, iptv}` — nearly all of it is Node-owned until P4–P6, so `hello` must be answered by Node in P2.
- No slow-client handling exists (no `bufferedAmount` checks); movement flush is 10 Hz full-roster snapshots.
- The P1 foundation pins Phoenix 1.8-class deps (reference: serviceradar pins phoenix 1.8.11); `Phoenix.Token` is in-core.

## Goals / Non-Goals

**Goals**

- The existing client connects through Phoenix with **zero behavioral change**: envelope unwrap, handler ordering, silent-drop sends, throttle, reconnect + `desiredRoom` replay, snapshot ordering, `welcome`-after-reconnect.
- Signed guest credentials replace *trust* in guestIds while guestIds remain the stable player key during migration (claim window is P4).
- A server-side domain router (config-owned table) decides who answers each message; clients cannot choose.
- A private authenticated boundary to Node for every unmigrated domain, WebSocket and HTTP alike.
- Trivial rollback: an env/config switch back to the Node socket; no durable state moved.

**Non-Goals**

- No world runtime in P2: no room processes, no movement validation beyond what Node does today, no presence ownership — movement/presence are relayed from Node (P3 = `add-world-room-runtime`).
- No durable accounts: no `players`/`guest_sessions` tables, no nickname reallocation, no claim window (P4).
- No chat relay in Phoenix: chat (`chat_send`/`chat_message`/`chat_dm`/`chat_history`/`chat_presence`/`chat_error`) stays proxied to Node, preserving the IRC bridge behavior exactly (ownership matrix #16/#17).
- No changes to the wire message catalog, room-id strings, caps, or tick semantics.
- No LiveView, no new client features, no HTTP auth on `/api/theater/*` beyond pass-through (their hardening is P10).
- No performance claims: capacity numbers remain targets until P10 measures them.

## Decisions

### D1 — Phoenix on its own dev port; `VITE_WS_URL` + explicit transport switch; HTTP side channel reverse-proxied at the gateway
*Decision:* The Phoenix Endpoint serves the socket at path `/ws` (`socket "/ws", AfterlightWeb.UserSocket, websocket: true`) so URL *shape* is identical to today. In dev, Phoenix binds `:4000` and Node keeps `:3001`; a deployment selects the gateway with the existing build-time `VITE_WS_URL` (e.g. `ws://localhost:4000/ws`) plus a new explicit `VITE_TRANSPORT=phoenix|node` (default `node`). The gateway reverse-proxies `/api/theater/*` and `/api/health` to Node, so `NetworkClient.apiBase` (WS-URL-host derivation) and every upload/Range-streaming flow keep working against the same origin logic with no client edits.
*Alternative Considered:* (a) Path-sharing one port via a front proxy (nginx/Cowboy routing `/ws` to two apps) — rejected: an extra moving part in dev and a second failure mode before anything is gained. (b) Making `apiBase` independently configurable — rejected as a client API change; the reverse proxy achieves same-origin logic with zero client diff and keeps torrent Range streaming on the URL the `<video>` element already uses.

### D2 — `NetworkClient` stays the public facade with a pluggable transport; `src/net/phoenixClient.js` is the Channels adapter
*Decision:* `src/net/client.js` keeps its exact public surface (`new NetworkClient(wsUrl)`, `on`, `onConnect`, `onDisconnect`, `send`, all helpers, `apiBase`) and its current WebSocket implementation as the default transport. A transport is a small interface (`connect`/`close`/`send`, incoming flat frames, open/close callbacks); `VITE_TRANSPORT=phoenix` selects `src/net/phoenixClient.js`, which acquires a guest token via `POST /api/auth/guest`, then connects Phoenix Channels and unwraps `{topic, event, payload}` → flat `{type: event, ...payload}`. All facade semantics — multiple handlers per type in registration order, silent-drop sends when closed, 80 ms movement throttle, hello-then-`desiredRoom` replay on every (re)connect — live in the facade, so they hold for both transports and `tests/presence-race.test.js` survives unchanged against the Node default.
*Alternative Considered:* Replacing `client.js` with a Channels-native client — rejected: every call site and test would churn, and the facade semantics (handler ordering, throttle, replay) would have to be re-proven. The adapter keeps the compatibility contract in one place.
*Topic layout:* the adapter uses a single channel topic per connection (`game:v1`); room-scoped and targeted events both arrive on it after unwrap. This keeps the adapter dumb; per-room PubSub topics (`room:<district>:<instance>`, `player:<id>`) are introduced server-side in P3 per `runtime.md`.

### D3 — Signed guest credentials now, durable accounts later; guestId stays the stable player key
*Decision:* `POST /api/auth/guest` (gateway-owned) verifies nothing but rate limits, then issues a short-lived `Phoenix.Token` (~12 h TTL, secret from app config) over claims `{guest_id, nickname_hint, issued_at}` and records a transient session entry (ETS — no database; durable `guest_sessions` is P4). The socket connect requires a valid, unexpired token; the token's verified `guest_id` claim — not any client field — becomes the connection's identity claim for the life of the connection. Transitional semantics, precisely: `hello` still carries `{guestId, nickname}` and Node still creates/loads the player and answers `welcome` (Node owns nicknames until P4); the gateway forwards hello only after binding the connection to the token's verified identity claim, and rejects a hello whose `guestId` differs from the token claim (defensive; current clients always match). GuestId therefore continues to *identify* (self-echo filtering, `garden:<guestId>` room ids, Node session keying all keep working), but possession of a bare guestId no longer *authorizes* a connection — the signed token does. Scope note (review): the P2 token authenticates the SOCKET HANDSHAKE — possession of a valid token gates the connect; it does not yet make a guestId unforgeable as a player identity (player-identity trust lands in P4/P6, when tokens bind to durable session/player rows). The P4 claim window converts guestIds into durable accounts.
*Alternative Considered:* (a) AshAuthentication immediately — rejected: drags P4's data model into P2 and forces the durable cutover before the transport exists. (b) Accepting guestId-only connections through Phoenix for one more phase — rejected: it would rehearse the security posture twice and the ownership matrix schedules "signed identity lands P2".

### D4 — Disposition: gateway terminates transport + identity + meta; everything else is relayed 1:1 to Node in P2
*Decision:* The P2 disposition table (recorded in protocol-catalog §2 notes and enforced by the `Gateway.Router`):

| Message / event | P2 disposition |
|---|---|
| socket connect, token verify, connect rate limit, channel join authorization | **terminated at gateway** |
| `ping` → `pong` | **terminated at gateway** (transport liveness; Node's `{t}` echo semantics preserved) |
| `hello`, `set_nickname` (incl. `welcome` reply) | relayed to Node (accounts durability is Node's until P4) |
| `join_room`, `presence_join`, `presence_leave`, `presence_update`, room join snapshots (`theater_state`, `iptv_state`, `node_state`, `machine_update`, `garden_state`) | relayed to Node (room membership and snapshots are the P3 runtime's job) |
| `movement`, `emote`/`emote_broadcast` | relayed to Node (movement semantics unchanged; remote avatars keep working) |
| chat (`chat_send`, `chat_message`, `chat_dm`, `chat_history`, `chat_presence`, `chat_error`) | relayed to Node (IRC bridge stays intact; Social context is later) |
| all durable-domain messages (gardens, economy, restoration, theater, catalog, torrents) | relayed to Node |

The relay is 1:1: each gateway session holds exactly one upstream Node WebSocket (the "shadow" connection), frames forwarded flat⇄flat in order, so Node semantics — including snapshot ordering and the exact `error` reason strings — are bit-preserved. `Gateway.Router` still exists in P2 (with every game domain = `node`) so P3+ flips entries rather than introducing routing mid-flight.
*Alternative Considered:* Terminating `hello` at the gateway and synthesizing `welcome` from Node pieces — rejected: `welcome` aggregates five Node-owned domains and `resolveDuplicateNickname`; synthesizing it would fork identity logic a phase early and risk parity bugs in the single most order-sensitive message.

### D5 — Private authenticated boundary: one shared secret, shadow connections over loopback, invalid-secret rejection only
*Decision:* Gateway→Node traffic carries a shared secret header (`x-afterlight-boundary`, value from deployment config) over a loopback/private-network URL. Node's upgrade/HTTP handler gains a minimal additive check: a request presenting an invalid secret is rejected; a request presenting *no* secret is still accepted during P2, so direct-to-Node clients (the rollback path) keep working until later phases tighten this. The gateway closes the upstream when the client disconnects, and logs carry correlation ids — never secrets or tokens.
*Alternative Considered:* (a) A multiplexing binary boundary protocol (one upstream connection carrying N client sessions) — rejected: requires a new framed protocol on the Node side, more code before the first gate, and 1:1 shadowing keeps Node behavior byte-identical. (b) mTLS between gateway and Node — deferred to the P10 security pass; a shared secret on a private network is the honest minimum for P2 and is documented as such.

### D6 — Reconnect stickiness: newest connection wins, stale upstream closed *first*
*Decision:* The gateway keeps one live transport per verified identity. When a second transport arrives (refresh, network flap), the gateway closes the *old* upstream to Node and waits for its close to be processed before forwarding the new session's `hello`. Node therefore sees a clean `removeClient` → `addClient` sequence and never holds two sessions for one guestId — the ghost-eviction quirk (old socket lingers; first close evicts the survivor) cannot trigger from transport reconnects. A second *browser* with the same guestId gets the same deterministic outcome: newest wins, older transport closed with a socket close reason (fully player-visible semantics deliberately finalized in P3).
*Alternative Considered:* Idempotent hello with session tokens across gateway restarts — deferred: it requires session state independent of the transport, which is exactly the P3/P4 session-registry work; P2's rule already guarantees "no second logical world session on transport reconnect", the phase requirement.

### D7 — Slow receivers: document the retained posture in P2; full outbound bounding arrives with the P3 room runtime
*Decision:* During the proxy phase, slow-receiver behavior is explicitly **Node's current behavior retained**: full-roster 10 Hz snapshots with no per-client buffer accounting. The gateway (a) sets Cowboy/Phoenix transport timeouts so a dead socket is reaped, (b) adds a telemetry counter for outbound queue depth per transport so the posture is *measured* rather than assumed, and (c) documents in the protocol catalog that unbounded queueing under a stalled consumer is a known property of the proxy phase, fixed by the P3 runtime's bounded buffers + disconnect/resnapshot rule.
*Alternative Considered:* Bounding buffers at the gateway in P2 — rejected: dropping or disconnecting inside a transparent proxy would make P2 *less* faithful to Node than doing nothing, and the P3 runtime is where the coalescing knowledge to bound correctly lives.

## Risks / Trade-offs

- *[Envelope mismatch silently breaks handler dispatch]* → the adapter's unwrap is unit-tested against every message type in protocol-catalog §1; the scripted two-browser run asserts `welcome` → `garden_state` → `chat_history` → join-snapshot ordering on the Phoenix path.
- *[Identity discontinuity ghosts the self avatar]* → guestId continuity is a hard requirement: token claims carry the localStorage guestId, hello forwarding preserves it verbatim, and the regression list includes self-echo filtering and `garden:<guestId>` join.
- *[Proxy adds latency to movement]* → 1:1 flat frame relay over loopback adds one hop; the two-browser equivalence gate and a movement round-trip measurement task make the cost visible rather than assumed.
- *[Two servers to run in dev]* → documented port layout; the default transport remains `node` so the game stays playable with Node alone (rollback = stop opting in).
- *[Token leakage]* → tokens ride the connect params only, are never logged (verified by a test that greps captured logs), are short-lived, and are re-issued silently on reconnect expiry.
- *[Boundary secret checked too strictly breaks rollback]* → invalid-secret rejection only; secret-less direct connections keep working in P2 by design.
- *[Split-brain confusion about who owns what]* → the disposition table is config-owned, server-side, and mirrored into `docs/architecture/elixir/protocol-catalog.md`; no client choice exists.

## Migration Plan

1. Land gateway + adapter behind defaults (`VITE_TRANSPORT=node`): zero player-visible change; all existing tests green.
2. Dev opt-in: `VITE_WS_URL=ws://localhost:4000/ws` + `VITE_TRANSPORT=phoenix`; run the scripted two-browser join/travel/reconnect suite and the protocol-catalog §5 regression list; run the slow-receiver measurement and record it in the change evidence.
3. Deploy opt-in per environment; Node remains the sole writer of every durable domain throughout.
4. Rollback at any point: flip the deployment back to the Node socket (env/config only). No durable state moved in P2, so rollback is pure transport — in-flight transient state (positions, chat history) resets exactly as it would on any Node restart today.

Phase gate (exit P2): two browsers join via the Phoenix transport, `desiredRoom`/reconnect preserved, unmigrated domains proxied over the authenticated boundary, signed identity enforced.

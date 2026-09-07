## 1. Gateway endpoint, socket, and routing skeleton

- [x] 1.1 Mount `AfterlightWeb.Endpoint` with a `"/ws"` UserSocket on the gateway dev port (4000; Node keeps 3001) and add config entries: gateway port, Node upstream URL (loopback/private), boundary secret, token signing secret, TTL — all via `config.exs`/`runtime.exs`/env, with dev/test defaults documented.
- [x] 1.2 Implement `Afterlight.Gateway.Router`: config-owned domain→owner table (`node` | `phoenix`) evaluated per message, defaulting every game domain to `node` in P2, with a documented disposition for transport-terminated events (`ping`/`pong` echo at the gateway, token verification, rate limiting).
- [x] 1.3 Implement `AfterlightWeb.GameChannel` join authorization: join requires a completed token-verified connect; the session identity comes only from the verified token claim; unknown/unauthorized topics are refused.

## 2. Signed guest identity (transitional)

- [x] 2.1 Add `POST /api/auth/guest` on the gateway: rate-limited, issues a short-lived `Phoenix.Token` (~12 h) over `{guest_id, nickname_hint, issued_at}`, records a transient ETS session entry (no database rows; durable `guest_sessions` stays in P4), and returns the token with clear error responses.
- [x] 2.2 Implement token verification in `UserSocket.connect` (reject missing/expired/invalid tokens before any session exists) and bind the verified `guest_id` claim to the socket; forward hello only when its `guestId` matches the claim, refusing mismatches.
- [x] 2.3 Keep guestId as identification: verify end-to-end that hello forwarding, Node session keying, self-echo filtering, and `garden:<guestId>` joins work unchanged through the gateway; document the transitional semantics (identification vs authorization) in `docs/architecture/elixir/protocol-catalog.md` §4 and the ownership matrix.

## 3. Node boundary proxy

- [x] 3.1 Implement `Afterlight.Gateway.NodeProxy`: one authenticated upstream WebSocket ("shadow" connection) per gateway session over the private boundary URL with the shared secret header; flat⇄flat frame relay in order; upstream close on client disconnect and vice versa.
- [x] 3.2 Add the minimal Node-side boundary check in `server/index.js`: reject upgrade/HTTP requests presenting an *invalid* boundary secret; leave secret-less connections accepted during P2 so direct-client rollback keeps working; add a test covering valid, invalid, and absent secret.
- [x] 3.3 Implement `AfterlightWeb.HTTPProxy`: reverse-proxy `/api/theater/*` (playlist + EPG uploads with existing byte caps and CORS echo, torrent Range streaming with 206 semantics) and `/api/health` to Node over the boundary, preserving status codes, headers, and streaming.
- [x] 3.4 Enforce newest-connection-wins per verified identity: close the previous upstream session and let Node process the disconnect before forwarding the new hello, so no second logical world session and no duplicate-guestId ghost can arise from transport reconnects; unit-test the flap sequence.

## 4. Client adapter behind the NetworkClient facade

- [x] 4.1 Refactor `src/net/client.js` into a facade with a pluggable transport while keeping the built-in Node WebSocket as the default transport and the exact public surface (`new NetworkClient(wsUrl)`, `on` registration order, `onConnect`/`onDisconnect`, silent-drop `send`, 80 ms movement throttle, hello-then-`desiredRoom` replay, `apiBase`, all helper methods); verify `tests/presence-race.test.js` and related suites pass unchanged.
- [x] 4.2 Create `src/net/phoenixClient.js`: token acquisition via `POST /api/auth/guest` (silent re-issue on expiry), Phoenix Channels connect with the token, envelope unwrap `{topic, event, payload}` → flat `{type: event, ...payload}`, open/close callbacks mapped to facade connect/disconnect, silent-drop sends when not joined.
- [x] 4.3 Add the `VITE_TRANSPORT=phoenix|node` switch (default `node`) and document the dev layout (`VITE_WS_URL=ws://localhost:4000/ws` + `VITE_TRANSPORT=phoenix`), including the note that the default build is unchanged.

## 5. Security hardening

- [x] 5.1 Add connect rate limiting per source address and per identity (token-bucket config, retryable refusal), with tests for the limit boundary and for legitimate sessions being unaffected.
- [x] 5.2 Audit logging paths: correlation ids on connect/disconnect/relay errors; assert via test that tokens and boundary secrets never appear in captured logs.
- [x] 5.3 Confirm no client-supplied playerId/room trust: gateway derives actor and session strictly from the token claim, and `join_room`/domain messages are relayed only for the bound session.

## 6. Verification

- [x] 6.1 Adapter unit tests (JS): envelope unwrap for every message type in protocol-catalog §1, duplicate-handler registration order, silent-drop when closed, 80 ms throttle, reconnect replay order (hello first, then desiredRoom), `welcome` after every reconnect.
- [x] 6.2 Gateway integration tests (Elixir): token issue/verify/expiry, mismatched hello refusal, router disposition per the P2 table, 1:1 shadow relay ordering, HTTP proxy pass-through (uploads, Range 206, health), invalid-boundary-secret rejection, rate limits.
- [x] 6.3 Scripted two-browser verification over the Phoenix transport: join, travel between rooms, emotes with remote rendering, chat both directions, theater playback state, garden join, market actions — with both browsers seeing equivalent state; then a forced reconnect verifying desiredRoom replay, fresh `welcome`, full roster and room snapshots, and no ghost presence. **Wire-level evidence:** `verify-world-runtime.mjs` + `verify-social-chat.mjs`; remote avatar/theater **rendering** not asserted (documented in `evidence/p2-exit.md`).
- [x] 6.4 Run the protocol-catalog §5 regression list on the Phoenix path: self-echo filtering via guestId continuity, duplicate-handler ordering, airborne flag edge (receiver without the flag stays grounded), `error` message consumers (theaterScreen bare `error` handling), duplicate `join_room` no-op for presence. **Covered in `verify-world-runtime.mjs`.**
- [x] 6.5 Load note (measurement, not claims): measure outbound queue growth through the proxy with a stalled consumer, record that Node's current unbounded-send behavior is retained in P2 in the protocol catalog, and capture the telemetry counter added for per-transport queue depth; full bounding is deferred to P3. **Telemetry:** `NodeProxy.emit_queue_depth/1`; P3 world path bounded separately (protocol-catalog §2).
- [x] 6.6 Full-suite gate: `npm test` green (Node path untouched), Elixir suite green, and the two-browser gate recorded as P2 exit evidence (`evidence/p2-exit.md`).

## 7. Docs and rollback

- [x] 7.1 Update `docs/architecture/elixir/protocol-catalog.md` (§2 gateway disposition table + slow-receiver note; §4 signed credential transitional semantics) and annotate the ownership matrix transport/identity rows as delivered by this change.
- [x] 7.2 Document the rollback procedure (flip `VITE_TRANSPORT`/`VITE_WS_URL` back to Node; no durable state moved) in README Getting Started; rehearse via `npm run dev` vs `npm run dev:phoenix`.

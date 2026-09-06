# Design — Node specialty adapters (torrent + IRC)

## Context

Ownership rows 17–18 (`docs/architecture/elixir/ownership.md`) keep two Node subsystems through P11 at least: the IRC bridge + embedded IRC server (`server/irc.js`, bridge in `server/chat.js`) and the torrent engine (`server/torrents.js` webtorrent + `shared/torrentModel.js` pure rules, `data/torrents/library.json` + disposable cache dir). `docs/architecture/elixir/media.md` §Specialty services fixes the posture: Phoenix issues scoped playback grants and bounded resolve jobs; the sidecar validates them; no unauthenticated generic torrent endpoint; the IRC bridge stays behind an authenticated event adapter with message IDs; game chat survives its failure.

Today's facts that shape this change (protocol-catalog §4): all HTTP endpoints are unauthenticated; `/api/theater/torrent/:infohash/:fileIndex` serves Range/206 to video extensions only and CORS echoes any Origin; `torrent_resolve` `{requestId, magnet}` is guarded in-process (theater room, 1 in-flight per player, `parseMagnet` validity); replies are targeted `torrent_files` and room-scoped `torrent_state` every ~2 s while relevant; picker cap 60 files; trades of state with P5 — the theater bill (`theater_rooms`/`theater_items` + revision) is now an Ash/PostgreSQL domain, so the sidecar's "keep the current bill's torrents cached" policy has a server-side source of truth for the first time. Game chat is a Node relay until `add-social-chat-relay` moves it to `Afterlight.Social` (this change lands alongside that one in the P7 window): P7 adds the authenticated IRC adapter boundary — message IDs plus loop prevention — over which Phoenix `Social` and the Node IRC sidecar exchange events, so game chat survives sidecar outage by contract rather than by accident.

The single torrent worker constraint from `media.md` also applies: one sidecar means disk affinity is trivial; hash-based routing across multiple workers is deferred until shared serving is designed.

## Goals / Non-Goals

**Goals**

- Every player→sidecar path crosses an authenticated, bounded Phoenix adapter; the sidecar independently verifies authorization.
- Playback grants are short-lived, capability-scoped (infohash + fileIndex + participant + expiry), and stateless to validate.
- Today's per-player resolve bounds (1 in-flight, cooldown, magnet validity) and reply shapes are preserved exactly; global job concurrency is capped.
- The bill in PostgreSQL protects torrents from the sidecar's cache reap; sidecar-local library ownership is unchanged.
- IRC relay gains message IDs + echo suppression so loops are impossible by construction; game chat survives bridge loss by contract, with tests.
- Honest rollback: grants-off reverts to unauthenticated endpoints on loopback dev ONLY; production requires grants on.

**Non-Goals**

- No WebTorrent rewrite in Elixir; no replacement of the embedded IRC server; no IRC feature changes whatsoever.
- No proxying of video bytes through Phoenix/BEAM — the browser keeps consuming HTTP video directly from the sidecar's file engine.
- No multiple torrent workers / hash-based routing until shared serving is designed.
- No chat persistence, moderation, or IRC feature work (additive history remains a separate `Afterlight.Social` concern).
- No change to theater bill ownership or `theater_items` semantics (P5 territory).

## Decisions

### D1 — Adapters wrap the sidecars; the sidecars stay Node and self-contained
*Decision:* Phoenix mediates all three surfaces (stream, resolve, IRC events) but the torrent engine and IRC server keep their process model, files, and behavior. The sidecar gains only validation middleware and one exemption endpoint; it never reads PostgreSQL, never trusts client requests directly, and keeps `data/torrents/library.json` + cache dir exactly as today.
*Alternative Considered:* porting webtorrent to Elixir (or shelling into a torrent CLI). Rejected: no mature Elixir WebTorrent peer exists, the engine is explicitly retained per ownership row 18, and a rewrite would put P7 on the critical path of the whole migration for zero player value.

### D2 — Capability-scoped HMAC playback grants
*Decision:* When the active theater item is a torrent pick, the Phoenix theater session mints a token: base64url payload `{v, infohash, fileIndex, participant (player id), exp}` + HMAC-SHA256 signature using a shared secret provisioned privately to Phoenix and the sidecar. The client appends it as a `grant` query parameter to the stream URL it already derives from `apiBase`. The sidecar verifies statelessly — signature, expiry, participant non-empty, and that the URL's infohash/fileIndex match the token — and rejects otherwise (403). TTL is short (minutes) and Phoenix re-mints while the item stays active for that participant, so a normal viewing session never sees expiry. Tokens are never logged (see D6).
*Alternative Considered:* (a) proxy bytes through Phoenix and use plain session auth — rejected: doubles egress through the BEAM and couples media liveness to Phoenix restarts, against `media.md`; (b) mTLS between browser and sidecar — rejected: authenticates no specific capability and is operationally absurd for browsers; (c) sidecar queries a session store — rejected: couples the sidecar to Phoenix's session/DB internals; stateless verification keeps the failure domains separate.

### D3 — Resolve proxy preserves today's bounds and adds a global cap
*Decision:* `torrent_resolve` keeps its wire shape. Phoenix enforces the ported rules — theater-room membership, 1 in-flight resolve per player, ~10 s cooldown, `parseMagnet` validity (parity-fixture-backed per governance D5) — then forwards accepted jobs to the sidecar over the authenticated private boundary with its own timeout and a global in-flight cap. Overflow is rejected to the requester with the existing cooldown error semantics rather than queued unboundedly. `torrent_files` stays targeted to the requester; `torrent_state` passes through to the theater room ~2 s while relevant.
*Alternative Considered:* letting the sidecar accept client requests directly with a token like the stream path. Rejected: resolve is a mutation of engine state (spawned swarm work), so it must be bounded server-side per player; the per-player rules live naturally in Phoenix next to the room membership they depend on.

### D4 — Bill-driven reap exemption: Phoenix pushes the infohash set
*Decision:* `Afterlight.Specialty.BillSync` pushes the set of infohashes referenced by `theater_items` (P5 PostgreSQL bill) to the sidecar on bill change and on sidecar reconnect. The sidecar's existing cache-reap policy treats that set as exempt-from-reap; the magnet library and library persistence in `data/torrents/library.json` remain sidecar-owned and untouched. The push is idempotent and advisory — a stale or missing exempt list can only cause a re-download, never a corruption — but with P5 in place the normal state is exact.
*Alternative Considered:* sidecar reads `theater_items` from PostgreSQL directly. Rejected for the same coupling reason as D2(c); also the exemption is a policy input, not a second writer of the bill. Sidecar crash pose is unchanged from today: bill survives in PG, playback degrades, library file persists on disk.

### D5 — IRC stays the embedded Node server; Phoenix chat exchanges events over an authenticated adapter
*Decision:* `server/irc.js` and its bridge keep running as the IRC endpoint. Phoenix chat (`Afterlight.Social`, moved by `add-social-chat-relay`) and the bridge exchange a narrow event set (game→IRC send, IRC→game receive, presence up/down) over an authenticated local adapter. Every relayed message carries a unique message ID plus an origin-scoped echo suppression key (`{origin: game|irc, id}`); a message re-entering its origin with a seen key is dropped, so game→IRC→game or IRC→game→IRC reflection cannot double-deliver. If the bridge or sidecar is down, Phoenix degrades to game-only relay — exactly today's behavior — and marks IRC presence down instead of erroring the chat path.
*Alternative Considered:* implementing a minimal Elixir IRC client against the existing server. Rejected: non-goal ("no IRC feature changes"), and it converts a retained sidecar into a new protocol implementation to maintain. The message-ID contract is what makes the retained bridge safe rather than accidental.

### D6 — Failure isolation, bounds, and log hygiene
*Decision:* Phoenix's sidecar clients use short timeouts and a circuit breaker: sidecar down ⇒ resolve attempts fail fast with a readable message, stream requests fail with 503 from the sidecar itself, and neither retries unboundedly. Resolve jobs are bounded three ways (per-player in-flight + cooldown + global cap). Logs follow the runtime rule "correlate without logging tokens or private messages": grant tokens, magnets, and IRC/private chat content are never logged at info level; debug-level redaction applies everywhere. Supervision restarts the sidecar processes; recovery requires no manual state repair (library file + exempt-list re-push).
*Alternative Considered:* treating sidecar health as a game-health dependency (restarts propagate, alerts page). Rejected: the whole point of P7 is that a sidecar crash is a documented UX degradation (playback stops, IRC goes quiet), not an incident for rooms, economy, or game chat.

## Risks / Trade-offs

- *[Grant tokens travel in URLs]* → short TTL, capability-scoped (useless for any other infohash/file), HTTPS in deployed setups, and a hard rule that access logs at info level redact the `grant` parameter; the token grants read of one video file to one participant, so leakage blast radius is one file until expiry.
- *[HMAC secret compromise invalidates the boundary]* → secret provisioned via private config/env, never in repo or client payloads; rotation supported with a dual-accept window (old+new verify during rollover).
- *[Two auth postures during rollout]* → the grants-off rollback path reverts to unauthenticated endpoints on loopback dev ONLY; production config refuses to disable grants. This asymmetry is documented rather than hidden — the pre-P7 state is not a supported production posture.
- *[Sidecar replay of `torrent_state` grows with viewers]* → unchanged from today (~2 s cadence while relevant); pass-through adds no fanout in Phoenix beyond the existing theater topic.
- *[Adapter adds latency to resolve]* → one local authenticated HTTP hop with a bounded timeout; the 10 s cooldown dominates any realistic adapter overhead.
- *[Exempt-list races (bill changes mid-reap)]* → push is idempotent and refreshed on reconnect; worst case is re-download of a still-billed torrent, never loss of bill state (PG owns the bill).

## Migration Plan

1. Land sidecar-side validation behind a config flag with grants optional (loopback dev), Phoenix minting always on. 2. Flip the endpoint to require grants in production config; keep the unauthenticated path reachable only when `loopback_dev` is explicitly set — the rollback story, stated honestly. 3. Add the exempt-list push and the resolve proxy with preserved bounds; run theater parity + new adapter tests. 4. Add the IRC adapter with message IDs/echo suppression and the bridge-down degradation tests; soak with a real two-browser session (torrent playback + IRC visible + game chat). Rollback at any step: grants off on loopback dev, or revert the gateway routes to direct proxy — sidecar files and PG bill are untouched by this change, so rollback never touches durable state.

# Add Node Specialty Adapters (Torrent + IRC Sidecars)

## Why

Phase P7 of the migration (`docs/architecture/elixir/ownership.md` rows 17–18). The torrent engine and IRC are the two subsystems the umbrella change explicitly keeps in Node: there is no mature Elixir WebTorrent equivalent, and rewriting the IRC server would be feature churn with no migration payoff. But keeping Node specialty code must not mean keeping today's exposure: the torrent stream endpoint (`GET/HEAD /api/theater/torrent/:infohash/:fileIndex`) is completely unauthenticated with CORS echoing any Origin, `torrent_resolve` is guarded only by in-process room-membership checks inside the Node server, and the IRC bridge has no authenticated boundary or relay-loop protection.

After P5, Phoenix owns the theater bill (`theater_rooms`/`theater_items`) in PostgreSQL, so Phoenix is now positioned between players and the sidecars. **Current** state: Node embeds webtorrent (`server/torrents.js` + `shared/torrentModel.js` rules) and the IRC server + chat bridge (`server/irc.js`, bridge in `server/chat.js`); browsers stream torrent video over unauthenticated HTTP Range requests; the game chat relay is still Node's until `add-social-chat-relay` moves it to `Afterlight.Social` (this change lands alongside that one in the P7 window). **Desired** state: the same Node sidecars remain, but every path into them from a player crosses an authenticated, bounded adapter owned by Phoenix — short-lived scoped playback grants on the stream endpoint, a proxied `torrent_resolve` with today's per-player bounds, and an authenticated IRC event adapter with message IDs and echo suppression — so a sidecar crash degrades UX in a documented way and never takes down rooms, economy, or game chat.

## What Changes

- **Scoped playback grants**: Phoenix issues a short-lived, capability-scoped HMAC token binding `infohash + fileIndex + participant + expiry`; the sidecar independently validates it on `GET/HEAD /api/theater/torrent/:infohash/:fileIndex`, replacing today's unauthenticated endpoint. Range/206 semantics, video-extension filtering, and the browser's direct HTTP video consumption are unchanged.
- **Bounded resolve proxy**: `torrent_resolve` keeps its wire shape and its per-player rules (theater-room membership, 1 in-flight per player, `parseMagnet` validity, ~10 s cooldown) enforced by Phoenix, which forwards accepted jobs to the sidecar over an authenticated private call with a global concurrency cap; `torrent_files` replies stay targeted to the requester and `torrent_state` (~2 s while relevant) passes through.
- **Magnet library stays sidecar-owned**: the sidecar keeps `data/torrents/library.json` and its cache dir and its restart-library behavior. Since P5, bill rows live in PostgreSQL; Phoenix pushes the bill's infohash list to the sidecar as the exempt-from-reap set, so reaping can never evict a bill-referenced torrent while the bill survives in PG even through sidecar restarts.
- **Authenticated IRC adapter**: the embedded Node IRC server + bridge stay; Phoenix chat (`Afterlight.Social`, moved by `add-social-chat-relay` in the same P7 window) exchanges events with it over an authenticated local adapter. Every relayed message carries a message ID and echo suppression keys so IRC↔game relay cannot loop. **Game chat MUST survive IRC bridge outage** — degradation to game-only relay (today's behavior) becomes an enforced contract, not an accident.
- **Failure isolation and bounds**: sidecar crashes produce documented UX degradation only (torrent playback/status stop; IRC presence marks the bridge down); rooms, economy, theater bill, and game chat are unaffected. Resolve jobs are bounded (per-player in-flight + cooldown + global cap); no unauthenticated generic torrent service exists at any point; grant tokens and magnets are never logged at info level.

Exit gate (P7): killing either sidecar mid-session leaves game chat, rooms, and economy fully functional; expired, foreign-participant, wrong-file, and tampered grants are rejected by the sidecar; a relayed IRC message replay cannot double-deliver.

Depends on: `add-ash-theater-catalog-domains` (P5 — bill rows in `theater_items` are the reap-exemption source and the authorization context playback grants scope to; without the PG bill there is nothing server-side to bind a grant to). The IRC adapter requirements additionally depend on `add-social-chat-relay` (07a) landing in the same P7 window — the adapter is defined over `Afterlight.Social`; if 07a slips, the IRC adapter lands with it. Phase P7, between `add-ash-gardens-economy-restoration` (P6) and `add-conferencing-media-spike` (P8).

## Capabilities

### New Capabilities

- `specialty-adapters`: the authenticated, bounded boundary between Phoenix and the retained Node sidecars — playback grant issuance and validation, the proxied and bounded torrent resolve flow, sidecar-owned magnet library with bill-driven reap exemption, the IRC event adapter with message IDs and loop prevention, and the failure-isolation guarantees (game chat survives sidecar loss; no unauthenticated torrent surface).

### Modified Capabilities

- (none — no capability has been archived yet. Player-facing torrent behavior — picker, Range streaming, ~2 s status — and chat/DM behavior are unchanged; the pre-migration torrent/IRC behavior is documented in `docs/architecture/elixir/protocol-catalog.md` and ownership rows 17–18, not in an archived spec.)

## Impact

- **New files (Elixir)**: `server_elixir/lib/afterlight/specialty/` — grant signer (`Afterlight.Specialty.Grants`), sidecar HTTP client with timeouts/circuit breaker (`Afterlight.Specialty.TorrentSidecar`, `Afterlight.Specialty.IrcBridge`), exempt-list pusher (`Afterlight.Specialty.BillSync`); tests under `server_elixir/test/afterlight/specialty/`.
- **Modified (Elixir)**: gateway router — route `torrent_resolve` through the proxied adapter instead of proxying raw to Node; theater channel on session — mint playback grants when the active item is a torrent pick; HTTP route for `/api/theater/torrent/:infohash/:fileIndex` re-pointed at the sidecar with grant requirement.
- **Modified (Node sidecars)**: `server/torrents.js` — grant validation middleware (stateless HMAC verify: expiry, participant, infohash, fileIndex), exempt-from-reap infohash list endpoint, resolve endpoint now accepts only authenticated adapter calls; `server/irc.js` + the bridge in `server/chat.js` — adapter authentication, message IDs on relayed events, echo suppression keys.
- **Client**: minimal — `src/net/client.js` appends the grant query parameter to the torrent stream URL it already builds from `apiBase`; handlers for `torrent_files`/`torrent_state` and chat types unchanged.
- **Data model**: none (no new tables — bill exemption reads the existing P5 `theater_items`; `data/torrents/library.json` remains sidecar-owned).
- **Protocol changes**: stream URLs gain a `grant` query parameter; grants travel as a targeted gateway message on the existing game channel — one additive targeted `torrent_grant` event carrying `{infohash, fileIndex, grant, expiresAtMs}` (a NEW message type, additive only). Otherwise no changes to existing message shapes: `torrent_resolve`/`torrent_files`/`torrent_state` and all chat message shapes are unchanged.
- **Security**: removes the last unauthenticated HTTP surface (`/api/theater/torrent/*` with any-Origin CORS); sidecar secrets provisioned via private config, never in client payloads or logs.
- **Tests**: new grant-validation suite (expired/foreign/wrong-file/tampered rejected), sidecar-kill integration tests (game chat continues, theater degrades gracefully), IRC loop-prevention replay test; existing `npm test` suite stays green.
- **Docs**: `docs/architecture/elixir/ownership.md` rows 17–18 gain P7 status notes; `protocol-catalog.md` HTTP surface section annotated with the grant requirement; `media.md` §Specialty services linked as the design source.

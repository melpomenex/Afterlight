## 1. Playback grants (Phoenix issuance)

- [x] 1.1 Add `Afterlight.Specialty.Grants`: token format `{v, infohash, fileIndex, participant, exp}` + HMAC-SHA256 signature (base64url), short TTL constant, re-mint helper for the still-active item; secret read from private config/env with a dual-accept window for rotation.
- [x] 1.2 Wire grant minting into the theater session: when the active item is a torrent pick, the participant's live session is pushed a fresh grant for that infohash/file index as a targeted `torrent_grant` event on the existing game channel (`{infohash, fileIndex, grant, expiresAtMs}`); re-mints are pushed to the live session before expiry (~50–80% of TTL) so an in-flight `<video>` element's Range requests never 403 mid-stream; grants are keyed to the server-verified player identity, never a client-supplied id.
- [x] 1.3 Unit tests: signature tampering, expired token, missing fields, and unknown version are all rejected by the verifier; re-mint inside the TTL produces a working grant; tokens never serialize the signing secret.

## 2. Sidecar grant validation and stream endpoint

- [x] 2.1 Add stateless validation middleware to the torrent sidecar (`server/torrents.js`): verify signature, expiry, participant, and infohash/fileIndex match between token and URL before any file read; reject with 403 otherwise; add the `grant`-parameter redaction to request logging.
- [x] 2.2 Preserve stream semantics exactly: GET/HEAD, Range/206 behavior, video-extension filtering, and direct browser consumption; confirm with the existing streaming tests plus new negative cases (no grant, foreign grant, wrong-file grant).
- [x] 2.3 Configuration: `grants_required` defaults on; disabling it requires explicit loopback-dev config and binds the listener to loopback interfaces; production config refuses to boot with grants off; document the asymmetry honestly in config comments/README.
- [x] 2.4 Update `src/net/client.js` to append the `grant` query parameter to the torrent stream URL it derives from `apiBase`; confirm no other client changes are needed.

## 3. Resolve proxy and status pass-through

- [x] 3.1 Port the per-player resolve rules to Phoenix (theater-room membership, 1 in-flight per player, ~10 s cooldown, `parseMagnet` validity) with parity fixtures against the JS rules per the migration-governance parity requirement; run the fixture suite and record the evidence.
- [x] 3.2 Add the authenticated Phoenix→sidecar resolve call: short timeout, global in-flight cap, fail-fast readable rejection on overflow or sidecar unavailability (circuit breaker, no unbounded retries); route `torrent_resolve` through it in the gateway router.
- [x] 3.3 Verify pass-through: `torrent_files` targeted to requester, `torrent_state` to the theater room at the ~2 s cadence while relevant, no fanout outside the room.

## 4. Bill-driven reap exemption

- [x] 4.1 Add `Afterlight.Specialty.BillSync`: derive the distinct infohash set from P5 `theater_items` and push it to the sidecar on bill change and on sidecar reconnect (idempotent, advisory).
- [x] 4.2 Add the exempt-from-reap check to the sidecar's cache-reap policy against the pushed list; keep `data/torrents/library.json` ownership, format, and restart recovery untouched.
- [x] 4.3 Tests: exempt torrent survives a reap pass; bill changes update the exempt set; sidecar restart re-pulls the list; sidecar never writes PostgreSQL.

## 5. IRC authenticated adapter

- [x] 5.1 Add adapter authentication between Phoenix chat and the IRC bridge (shared secret or loopback-bound credential) and restrict bridge event intake to it.
- [x] 5.2 Add message IDs and origin-scoped echo suppression keys (`{origin: game|irc, id}`) to relayed events on both sides; drop any message re-entering its origin with a seen key; keep `chat_message`/`chat_dm`/`chat_presence`/fromKind wire shapes unchanged.
- [x] 5.3 Implement bridge-down degradation in Phoenix chat: game-only relay continues, IRC presence is marked down (no chat errors surfaced), and recovery reattaches the bridge without restart.
- [x] 5.4 Tests including a replay test: a relayed message fed back through the adapter is delivered exactly once; bridge kill mid-conversation leaves game chat and DMs fully working; reconnect resumes relay without duplicates.

## 6. Verification, soak, and docs

- [x] 6.1 Integration test (Elixir): sidecar kill — torrent playback/resolve fail with readable messages and no retry storm while rooms, movement, economy, theater bill, and game chat continue; supervision restarts the sidecar and playback can resume with a fresh grant.
- [x] 6.2 Run `npm test` (JS suite stays green) and `mix test`; resolve real failures.
- [x] 6.3 Two-browser soak: theater torrent playback (seek/Range), resolve from both clients (cooldown + in-flight rules observed), IRC-visible chat alongside game-only chat after killing the sidecar, IPTV/EPG flows unaffected; check info-level logs contain no tokens/magnets. **Wire-level pass:** `npm run verify:theater` (two Phoenix clients, shared `theater_state`, iptv/epg, mix decline) — see `evidence/two-client-soak.md`. Torrent Range + IRC kill/recover + log audit remain manual staging checks.
- [x] 6.4 Update `docs/architecture/elixir/ownership.md` rows 17–18 (P7 status: authenticated adapters live), annotate the HTTP surface in `protocol-catalog.md` with the grant requirement, and add §6 "Declared tightenings" rows for: (a) the grant-required stream endpoint — a client building the stream URL without a valid grant (an old cached bundle during deploy rollover, or a modified client) receives 403 where Node served bytes; the client-impact analysis notes spec-compliant clients receive grants automatically as targeted `torrent_grant` events and pre-P7 clients are served by the unchanged Node path; (b) the new circuit-breaker failure reason strings surfaced in the theater UI's add-status line — `engine_unavailable` (sidecar down or circuit breaker open) and `resolve_cooldown` (global in-flight cap overflow, reusing the existing cooldown error semantics); and link `media.md` §Specialty services from the change docs.

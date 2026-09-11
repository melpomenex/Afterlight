## Why

Torrent (magnet) playback in The Orpheum is dead on the supported Phoenix stack. A user pastes a valid `magnet:?xt=urn:btih:…`, the resolve succeeds, the file picker opens, a video file is chosen, and the theater then sits on a loading state forever — even for healthy torrents with many seeds. The symptom looks like a WebTorrent/swarm problem, but the swarm is fine: the browser's HTTP stream request is rejected with `403` before any bytes are requested from peers.

Verified root cause (current code, not change checkboxes):

1. **The grant lifecycle module is never called.** `Afterlight.Specialty.TheaterSession` (`server_elixir/lib/afterlight/specialty/theater_session.ex`) defines the intended contract — `sync_grant/2`, `renew_grant/2`, `remember_theater/2` — and says so in its moduledoc ("Targeted `torrent_grant` pushes for theater occupants (P7 task 1.2)"). A repository-wide search (`git log --all -S "sync_grant"`, `git log --all -S "TheaterSession"`) finds only the commit that added the module (`fc9efeb`, 2026-09-07). **No production code path ever calls any of these functions, on any branch.** The only other references are its own body and the `Grants` crypto unit tests.
2. **Every `theater_state` delivery path skips grant minting.**
   - Join snapshot: `GameChannel.maybe_push_theater_join_snapshots/2` (`game_channel.ex:743`) pushes `theater_state` directly.
   - Acting player's committed action: `GameChannel.handle_theater/3` (`game_channel.ex:793`) pushes `TheaterGateway.handle/3` replies (`theater_state`) directly.
   - Other occupants: `Theater.OutboxRelay.broadcast_theater_state/2` (`outbox_relay.ex:72`) fans one shared `theater_state` frame to the room; `GameChannel` (`game_channel.ex:211`) pushes it to each member. None of these participants gets a grant.
   - Renewal: `TheaterSession` schedules `{:torrent_grant_renew, key}` to its own channel process, but `GameChannel` has no clause for that message; it falls into the catch-all `handle_info(_msg, socket)` at `game_channel.ex:353` and is silently discarded.
3. **Node fails closed, as designed.** `server/index.js:357-372` requires a valid HMAC `grant` query parameter (`grantsRequired` defaults on; production refuses to boot with grants off). The deployed stack (`deploy/docker-compose.yml`, `AFTERLIGHT_THEATER_OWNER: phoenix`) never disables it. With no grant minted, `GET /api/theater/torrent/:infohash/:fileIndex` returns `403`.
4. **The client makes its first request before any grant exists.** `TheaterScreenUI.loadCurrent()` immediately creates the `<video>` and sets `video.src = this.torrentStreamUrl(item)` (`theaterScreen.js:1123`), which reads the (empty) grant map. `applyTorrentGrant()` (`theaterScreen.js:2320`) can only refresh a source after a grant arrives — it is not a gate, and it never checks expiry. The first request is therefore unsigned and receives the 403.
5. **The 403 can advance the room's bill.** A torrent `<video>` error is classified source-fatal (`theaterPlaybackState.js:87-89`), so `reportEngineFailure({videoError: true})` calls `failItem()` and sends a room-wide `failed` report. A missing grant can skip the item for everyone, not merely stall one client.

The checkbox record is wrong and must be called out rather than trusted: `openspec/changes/add-node-specialty-adapters/tasks.md` task 1.2 ("Wire grant minting into the theater session") is marked `[x]`, and the archived `2026-09-08-fix-theater-streaming-after-elixir-cutover` task 3.3 ("grant mint/renewal in `Afterlight.Specialty`") is marked `[x]`; neither change ever added a call site. The torrent-streaming spec already requires grants on every stream request (`openspec/specs/torrent-streaming/spec.md`, "Range-capable streaming endpoint"), so this is a **regression fix restoring compliance**, not a new feature.

Two secondary defects found while verifying, both confirmed against installed dependencies:

- **WebTorrent file selection is not what the code claims.** `server/torrents.js:290` calls `client.add(magnetUri, { path })`. With the installed `webtorrent@3.0.21`, the `deselect` option is required for the documented behavior (`lib/torrent.js:615-626`): without it, WebTorrent selects the entire torrent once metadata is ready and keeps selecting new pieces. The comment at `server/torrents.js:200-202` ("added with all files deselected") is false in production, so multi-file torrents download their whole archive alongside the picked file. Metadata resolution still works either way.
- **Torrent MKV/AVI picks bypass the new media-prep pipeline.** `.mkv`/`.avi` are offered by the torrent picker but flagged not browser-playable (`shared/torrentModel.js:47-53`), and `initialPrepareFields`/`resolvedPlayback` only prepare `kind: "file"` items (`shared/mediaModel.js:176-216`). A picked `.mkv` torrent therefore remains browser-unplayable after the grant fix. This is a distinct architectural gap (torrent bytes are server-cached, not a remote URL the ffmpeg pipeline can probe) and is explicitly deferred to a separate OpenSpec.

## What Changes

- **Wire the grant lifecycle into every production theater delivery path** in `GameChannel`: one chokepoint that, for any outbound `theater_state` whose live item is a torrent, (a) remembers the snapshot, (b) mints/refreshes the participant's own grant, (c) pushes the targeted `torrent_grant` **before** the `theater_state` frame. Applies to the join snapshot, the acting player's action replies, the room/outbox broadcast, and the legacy relayed path.
- **Handle renewal and teardown**: add the missing `{:torrent_grant_renew, key}` `handle_info` clause; cancel/clear the grant lifecycle when the participant travels out of the theater; stale timer messages for a replaced item/file are discarded (already the module's intent; now actually reachable).
- **Make grant expiry/renewal testable**: TTL configurable via application env (default unchanged at 300 s) so tests can prove renewal before expiry without waiting minutes.
- **Prevent the first-request race on the client**: a torrent item does not load until a matching, unexpired grant is stored; the first stream URL used by the client always contains a grant. `applyTorrentGrant` resumes a waiting player; stored grants are room-scoped; grants clear on leaving the theater.
- **Fix WebTorrent selection**: add `deselect: true` to `client.add(...)` and pin the behavior with tests; unrelated files stay deselected while streaming still selects/prioritizes the picked file and ranged pieces.
- **Add bounded diagnostics**: grant mint/renew/clear telemetry and stream-request outcome categories (`grant_missing`, `grant_expired`, `grant_invalid`, `stream_403`, `metadata_timeout`, `swarm_no_peers`, `stream_stalled`, `browser_decode_error`) with no magnets, tokens, or secrets in logs; client debug ring records grant-wait/received events.
- **Add the missing integration regression coverage**: Elixir channel-level tests (grant before state, late join, two occupants, item/file change, non-torrent silence, renewal, teardown, fail-closed), JS client tests for the grant store/gate/URL, and a real-browser acceptance gate with a deterministic local seeder.

**Security posture is preserved, not weakened**: `TORRENT_GRANTS_REQUIRED` stays on in production, no unauthenticated fallback is added, the signing secret never reaches the client, grants are never broadcast to a room, participant identity remains the server-verified `guest_id`, tokens are never logged in full, and the existing dual-secret rotation window is untouched.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `torrent-streaming`: Strengthen "Range-capable streaming endpoint" so grant issuance is a wired production lifecycle (not a dormant module); add the participant-scoped grant lifecycle (per-occupant targeted delivery before state, renewal, cancellation, client first-request gate, fail-closed); add selective torrent download (deselect-by-default); add bounded torrent playback diagnostics with reason categories.

## Impact

- **Phoenix**: `server_elixir/lib/afterlight_web/game_channel.ex` (theater_state chokepoint, renewal clause, travel clear), `server_elixir/lib/afterlight/specialty/theater_session.ex` (room-tagged push, snapshot remembering, explicit clear, configurable TTL), `server_elixir/lib/afterlight/specialty/grants.ex` (configurable TTL only — format, signing, rotation unchanged). No schema change, no migration, no ownership flip.
- **Node sidecar**: `server/torrents.js` (`deselect: true`; diagnostics), `server/index.js` (bounded stream-request diagnostics; 403/404/416/503/504 reason categories). Enforcement logic and config are unchanged.
- **Client**: `src/net/client.js` (grant store with expiry, `hasUsableTorrentGrant`, clear-on-leave), `src/net/roomEpoch.js` (`torrent_grant` room-scoped), `src/ui/theaterScreen.js` (grant gate in `applyState`, resume in `applyTorrentGrant`, diagnostics), `shared/protocol.js` comment only.
- **Shared**: no behavioral change to `shared/torrentGrant.js` (Node verification stays as-is), `shared/torrentModel.js` docs only if selection wording changes.
- **Tests/scripts**: new `server_elixir/test/afterlight_web/game_channel_torrent_grant_test.exs` and specialty unit tests; new/extended JS tests for the client grant store and stream URL; new browser gate (deterministic seeded torrent) extending the `scripts/theater-playback-gate-browser.mjs` pattern; `scripts/theater-streaming-smoke.mjs` updated to assert a grant frame before `theater_state` when the bill carries a torrent.
- **Docs**: `docs/architecture/elixir/protocol-catalog.md` / `media.md` / `ownership.md` correction: P7 grants are now actually wired; record that the earlier "live" claims were not code-verified.
- **Non-goals (explicit)**: torrent MKV/AVI preparation/transcoding (separate OpenSpec); WebTorrent engine replacement; moving torrent bytes through Phoenix; the deprecated legacy Node-only transport (`npm run dev` + `npm run server`) beyond not breaking it; gardens/economy migration P6.

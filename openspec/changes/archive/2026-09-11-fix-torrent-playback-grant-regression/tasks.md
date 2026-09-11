## 1. Verify and restore grant lifecycle integration

- [x] 1.1 Add a failing integration test first: `server_elixir/test/afterlight_web/game_channel_torrent_grant_test.exs` (pattern: `game_channel_theater_test.exs` — `GatewayTest.ConfigLock.with_lock(:routing, @theater_routing, …)`, `Afterlight.Theater.Supervisor`, deterministic bill) that joins the theater with a live torrent item and asserts a `torrent_grant` push arrives **before** `theater_state`. Put a torrent on the bill with `Theater.apply_action("theater", %{"op" => "add", "url" => magnet, "fileIndex" => 0, "filePath" => "movie.mp4", "fileBytes" => 12345})` and set `Application.put_env(:afterlight, :torrent_grant_secret, …)` in setup. Run `mix test test/afterlight_web/game_channel_torrent_grant_test.exs` and record the failure as the regression proof.
- [x] 1.2 In `GameChannel`, add one private helper (e.g. `push_theater_state/3`) that: calls `TheaterSession.remember_theater(socket, fields)`, calls `TheaterSession.sync_grant(socket, fields)`, then pushes `theater_state` with the additive `roomId` tag. Route **all** theater-state emitters through it:
  - `maybe_push_theater_join_snapshots/2` (`game_channel.ex:743`)
  - `handle_theater/3` reply reduction (`game_channel.ex:793-812`), routing only the `"theater_state"` reply through the helper and pushing other replies as today
  - `handle_info({:world_frame, room_id, frame}, socket)` when `frame["type"] == "theater_state"` (`game_channel.ex:211-216`), leaving `rt_binary`/presence frames on the existing path
  - `handle_info({:world_frame, frame}, socket)` (2-tuple legacy) and `handle_info({:relay, "theater_state", fields}, socket)` (relay path, `game_channel.ex:246-290`)
- [x] 1.3 Make `TheaterSession` own the ordering and room tag: keep `sync_grant/2` minting via `Phoenix.Channel.push/3`, and include `"roomId" => socket.assigns.world_room.wire_id` in the `torrent_grant` payload. Verify `active_torrent/1` keeps accepting the snapshot shape (`now["kind"] == "torrent"`, `infohash`, `fileIndex`).
- [x] 1.4 Add `handle_info({:torrent_grant_renew, key}, socket)` in `GameChannel` **before** the catch-all at `game_channel.ex:353`, delegating to `TheaterSession.renew_grant(socket, key)` and returning `{:noreply, socket}`. Confirm the timer message is delivered to the channel process (it is scheduled with `Process.send_after(self(), …)` from `sync_grant/2`).
- [x] 1.5 Add `TheaterSession.clear/1` (cancel timer, clear `:torrent_grant_ctx`) and call it from `GameChannel.handle_world("join_room", …)` when the previous room was `TorrentRules.theater_wire_id()` and the destination differs. Confirm `terminate/2` needs no change (timers die with the process).
- [x] 1.6 Re-run task 1.1's test until green; keep it as the permanent ordering regression test.

## 2. Wire theater join snapshots (late join)

- [x] 2.1 Extend `game_channel_torrent_grant_test.exs`: participant A puts a torrent live, participant B joins afterward; assert B receives exactly one valid `torrent_grant` for the same infohash/file index, delivered before B's join `theater_state`, and that `Grants.verify/4` (or a decode assertion on the claims) matches B's `guest_id`.
- [x] 2.2 Assert the torrent grant is **not** minted for non-torrent sources: repeat the join test with a YouTube URL, an `.mp4` file URL, an `.m3u8` HLS URL, and an item with a pending prepare status; assert no `torrent_grant` frame within the test window.
- [x] 2.3 Assert the join `theater_state` payload contains no `grant`/`expiresAtMs` fields (shared state stays token-free).

## 3. Wire theater mutation/reply path (acting player)

- [x] 3.1 Channel test: a participant inside the theater sends `theater_channel` with a torrent pick (`url` + `fileIndex`/`filePath`/`fileBytes`); assert the committed reply sequence is `torrent_grant` → `theater_state`, and the grant verifies for `{infohash, fileIndex, participant=guest_id}`.
- [x] 3.2 Channel test: same for `theater_queue` `add` with a torrent pick, and for a `theater_control` op that changes the live item.
- [x] 3.3 Assert a participant **outside** the theater cannot trigger minting: `wrong_room` rejection is returned by `TheaterGateway.handle/3` and no `torrent_grant` is pushed.

## 4. Wire room/outbox broadcast participant grants (other occupants)

- [x] 4.1 Channel test with two participants both inside the theater: one participant adds a torrent; assert each channel independently receives its **own** valid `torrent_grant` (different `participant` claims) before its `theater_state` update, and neither mailbox contains the other's token. Use `assert_push` on both test sockets in order and decode claims with `Grants.verify/4`.
- [x] 4.2 Assert the outbox/broadcast `theater_state` frame itself never contains grant fields (pin in `game_channel_torrent_grant_test.exs` or `afterlight/theater/outbox_relay_test.exs`).
- [x] 4.3 Add a regression note/test that the participant targeting comes from `socket.assigns.guest_id` (server-verified identity) and cannot be influenced by frame contents: push a forged `"participant"` field in the bill/state path and assert the minted claims still use `guest_id`.

## 5. Wire grant renewal lifecycle

- [x] 5.1 Make the TTL testable: in `server_elixir/lib/afterlight/specialty/grants.ex`, read the TTL from `Application.get_env(:afterlight, :torrent_grant_ttl_secs, 300)` in `grant_ttl_secs/0` and use it in `should_re_mint?/2`. Keep the default and re-mint ratio unchanged, and keep the token/claim format untouched.
- [x] 5.2 Channel test (short TTL, e.g. `torrent_grant_ttl_secs: 1`): after the first `torrent_grant`, wait past the re-mint delay (≈650 ms) and assert a second `torrent_grant` with a later `expiresAtMs` for the same infohash/file arrives; assert the first token still verifies during the overlap.
- [x] 5.3 Channel test: replace the live torrent with a non-torrent item (or a different torrent/file) before the renewal fires; assert no grant for the old key is pushed and `:torrent_grant_ctx` is cancelled. Cover the same guard at the unit level by calling `TheaterSession.renew_grant/2` with a socket whose `:theater_snapshot` no longer matches the timer key and asserting no push.
- [x] 5.4 Unit test `TheaterSession.clear/1`: after `sync_grant/2`, `clear/1` cancels the timer and nils the ctx; a later `renew_grant/2` pushes nothing.
- [x] 5.5 Channel test: after leaving the theater (`join_room` to another room), a simulated `{:torrent_grant_renew, key}` message to the channel produces no `torrent_grant` push.

## 6. Prevent first-request race in client

- [x] 6.1 `src/net/client.js`: add `hasUsableTorrentGrant(item, { nowMs, skewMs } = {})` (match lowercased `infohash` + numeric `fileIndex`, require `expiresAtMs - skewMs > nowMs`; default skew ≥ 10 s), add `clearTorrentGrants()`, and keep `torrentStreamUrl(item)` appending the stored grant. Export/keep these testable without browser globals.
- [x] 6.2 Channel-side travel isolation: in `src/net/roomEpoch.js` add `'torrent_grant'` to `ROOM_SCOPED_TYPES` so a grant tagged with a stale `roomId` is rejected on travel.
- [x] 6.3 `src/ui/theaterScreen.js` `applyState`: for `now.kind === 'torrent'`, require `this.net.hasUsableTorrentGrant(now)` before `loadCurrent()`. When false: teardown any engine, set `awaitingTorrentGrant = { infohash, fileIndex }`, keep/enter the loading overlay with a bounded "waiting for authorization" caption, and return without creating media.
- [x] 6.4 `src/ui/theaterScreen.js` `applyTorrentGrant`: on a matching item, clear `awaitingTorrentGrant` and call `loadCurrent()`; otherwise refresh an existing `<video>.src` only when the new URL differs (existing behavior). Never append a grant for a different infohash/file.
- [x] 6.5 `src/ui/theaterScreen.js` `setRoomActive(false)`: clear `awaitingTorrentGrant`, reset the loaded key, and call `this.net?.clearTorrentGrants?.()`.
- [x] 6.6 JS tests (`tests/torrent-grant-client.test.js`, `NetworkClient` with the stubbed-globals pattern from `tests/transport-adapter.test.js`): grant store/expiry matching; `torrentStreamUrl` includes the grant exactly when usable; `clearTorrentGrants` empties the map; a `torrent_grant` frame for a stale room is ignored by the `roomEpoch` filter.
- [x] 6.7 JS UI tests (headless `TheaterScreenUI` pattern from `tests/theater-report-isolation.test.js`): with a stub net reporting no usable grant, `applyState({ now: torrentItem, queue: [] })` sets `awaitingTorrentGrant` and starts no engine; a matching `TORRENT_GRANT` handler clears the wait and triggers the load path; an unrelated grant does not. Assert the first constructed URL (spy `torrentStreamUrl`/`video.src` setter in a DOM-stubbed variant) contains `grant=` — this is the first-request regression test.

## 7. Torrent stream diagnostics

- [x] 7.1 `server/index.js` `handleTorrentStream/5`: log one bounded warn line per refusal with the `verifyTorrentGrant` reason mapped to categories (`grant_missing` when absent, else `grant_expired`/`grant_invalid`), plus infohash prefix and the `redactGrantQuery(req.url)` path. Replace the `DEBUG_TORRENT_GRANT`-only gating for refusals; keep success/open/first-byte logs behind debug (or `DEBUG_TORRENT_STREAM=1`).
- [x] 7.2 `server/torrents.js` `streamFile/3`: return/tag terminal failure categories for 404 (unknown infohash/index/non-video), 416, 503, 504 (`metadata_timeout`), and emit one bounded debug/info event when a stream opens and when the first data chunk is written (`stream_opened`, `first_bytes`); never log the magnet or grant.
- [x] 7.3 `server_elixir/lib/afterlight/specialty/theater_session.ex`: emit `:telemetry.execute([:afterlight, :torrent, :grant], …)` on mint/renew/clear/skip with `infohash` prefix (first 8 chars), `fileIndex`, and `expiresAtMs`; no token, no full magnet. Add a Logger.debug reason when minting fails.
- [x] 7.4 Client: record `torrent-grant-wait`, `torrent-grant-received`, `torrent-source-set`, and `video-error` (with `MediaError.code`, `networkState`, `readyState`) in the existing `?debug=1` ring in `theaterScreen.js`.
- [x] 7.5 Extend `server_elixir/test/afterlight_web/log_audit_test.exs` (or add a focused test) asserting captured logs never contain a minted token, the signing secret, or a full magnet across a mint → renew → clear cycle.
- [x] 7.6 Node tests (`tests/torrents.test.js`): assert a missing grant logs the `grant_missing` category and that a captured log line does not contain the token value; assert expired/wrong-file produce distinct categories.

## 8. WebTorrent deselection / prioritization (confirmed fix)

- [x] 8.1 `server/torrents.js:290`: change `client.add(magnetUri, { path: … })` to `client.add(magnetUri, { path: …, deselect: true })`; update the `resolve/1` doc comment to match the real v3 behavior.
- [x] 8.2 `tests/torrents.test.js`: extend `stubClientFactory` to record `add` options and assert `deselect === true` on resolve; keep the existing assertions that metadata resolves and the picker is built.
- [x] 8.3 Keep/pin the streaming selection contract: `streamFile` calls `file.select()` and ranged streams still produce 206 with correct `Content-Range` while unrelated files stay deselected (existing test `TorrentManager.streamFile serves real ranged bytes and refuses junk` plus a new assertion that only the requested file is selected).
- [x] 8.4 Verify against a real multi-file torrent in the browser acceptance run (task 10) that only the picked file's bytes grow the cache directory.

## 9. Automated regression suite

- [x] 9.1 Elixir: `game_channel_torrent_grant_test.exs` covers tasks 1–5 (ordering, late join, two occupants, per-participant tokens, non-torrent silence, item/file replacement, renewal with short TTL, stale renewal, leave/clear, fail-closed sibling test where `Grants.verify` rejects expired/wrong/malformed).
- [x] 9.2 Specialty unit tests: add `server_elixir/test/afterlight/specialty/theater_session_test.exs` for `sync_grant/2` mint/skip/replace, `renew_grant/2` match/guard, and `clear/1`, constructing `%Phoenix.Socket{}` with `transport_pid: self()`, `serializer: Phoenix.ChannelTest.NoopSerializer`, `joined?: true`, and asserts on the received message.
- [x] 9.3 Keep `Grants` crypto tests green (`grants_test.exs`) and add the configurable-TTL case.
- [x] 9.4 JS: `tests/torrent-grant-client.test.js` and the `theaterScreen` first-request tests from 6.6/6.7; assert `tests/torrents.test.js` HTTP endpoint coverage still proves missing/wrong grants stay 403 and valid grants still yield 206 (`Range` + `Content-Range`, `Accept-Ranges`).
- [x] 9.5 Extend `scripts/theater-streaming-smoke.mjs`: when a probe torrent item is placed on the bill (using a pick payload; no real swarm needed for the frame assertion), assert the client receives `torrent_grant` before the corresponding `theater_state` and that the payload contains no `grant` field. Do not regress the existing 15 checks.
- [x] 9.6 Run `npm test` (repo root) and `mix test` in `server_elixir`; resolve real failures without weakening assertions.

## 10. Two-browser real torrent acceptance test

- [x] 10.1 Add `scripts/torrent-playback-gate-browser.mjs` following `scripts/theater-playback-gate-browser.mjs` (chromedriver, two isolated sessions, evidence JSON+MD under this change's `evidence/`). Seed deterministically: start `bittorrent-tracker` on a loopback port, `create-torrent` a small committed `.mp4` fixture, seed it with `webtorrent`, and hand the browser a magnet carrying `tr=http://127.0.0.1:<port>/announce` so the sidecar and seeder find each other locally without public trackers. Add `bittorrent-tracker`/`create-torrent` as explicit devDependencies if the transitive install is not stable.
- [x] 10.2 Browser A: paste the magnet, wait for `torrent_files`/picker, pick the video, press play; assert the screen reaches visible playback and that A's first torrent request carried a `grant` (observed via the debug ring / network log), not a 403-then-retry.
- [x] 10.3 Playback controls: pause, resume, forward seek into an undownloaded region, backward seek; assert `206` with `Content-Range` and continued playback for each.
- [x] 10.4 Browser B joins mid-stream; assert B reaches playback with its own grant, A keeps playing, and neither client's stored grant is the other's.
- [x] 10.5 Lifecycle: run with a shortened TTL (test-only server config) to observe renewal before expiry; B leaves and re-enters; change the live item to a second torrent (or a different file index) and assert the old lifecycle stops and the new grant is delivered.
- [x] 10.6 Record the result honestly in `evidence/`: separate automated-test evidence from browser evidence, include the local-stack command/setup, and state any check that could not be performed.

## 11. Documentation / architecture updates

- [x] 11.1 Correct `docs/architecture/elixir/protocol-catalog.md` (§P7 grant row + HTTP surface) and `docs/architecture/elixir/ownership.md` row 18 to state that grant minting is now wired through `GameChannel` (reference the new tests), and note that earlier "live" claims were not code-verified.
- [x] 11.2 Update `docs/architecture/elixir/media.md` §Specialty services with the grant ordering invariant (targeted grant strictly before `theater_state`; no token in shared state) and the diagnostics categories.
- [x] 11.3 Add a short follow-up note (in this change's `design.md` or a new `openspec/changes/` stub) that torrent `.mkv`/`.avi` preparation remains unimplemented and is deliberately out of scope, so the picker's `playable: false` marking stays honest.
- [x] 11.4 Update `README.md` only if player-facing behavior/copy changed (expected: none or the bounded "authorizing" loading caption).
- [x] 11.5 Run `openspec validate --change fix-torrent-playback-grant-regression --strict` and fix any structural issues.

## 12. Final verification

- [x] 12.1 Confirm the regression sequence manually on the dev stack (`npm run dev:stack`): paste a healthy magnet, pick a file, see playback begin, verify Node receives a granted request (first request authorized), pause/resume/seek.
- [x] 12.2 Confirm the negative matrix still fails closed: unsigned, expired, wrong-infohash, wrong-file, and malformed grants return 403/error without disturbing the bill.
- [x] 12.3 Confirm non-torrent sources (YouTube, Vimeo, direct `.mp4`, prepared MKV file URL, HLS, IPTV) still play and mint no torrent grants.
- [x] 12.4 Confirm `TORRENT_GRANTS_REQUIRED` remains on by default, production still refuses grants-off boot, and no secret/token/magnet appears in captured info-level logs.
- [x] 12.5 Re-run `npm test`, `npm run build`, and `mix test`; report what was verified and any remaining unverified limitation (e.g. a real public-swarm run).

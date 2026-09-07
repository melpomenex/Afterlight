## 1. Parity fixtures and pure ports

- [x] 1.1 Verify `tests/fixtures/parity/` covers the full `applyTheaterAction` op matrix (add/addMany/remove/playNow/skip/clear/pause/resume/seek/ended/failed/channel × valid/hostile inputs, all nine error reasons, addMany report `queued/skipped/didNotFit`, multi-step scripts), the `classifySource` URL table (~40 cases incl. hostile), `normalizeTheaterState` (absent/null/malformed shapes), `sanitizeTorrentPick` boundaries, and `newItemId` with pinned clock/seed; extend the exporter, not the fixtures by hand.
- [x] 1.2 Verify catalog fixtures cover `parseM3U`/`parseExtInf` (incl. `tvgId`), `iptvModel` limits and error strings, `serializeM3U` round-trip, `parseXmltv` (tz offsets, rollover, caps, first-wins index), `matchEpgChannels`, and `nowNext` binary-search boundaries; extend the exporter as needed.
- [x] 1.3 Port `Afterlight.Theater.Reducer` (pure, injected RNG/clock) and the WHATWG-faithful URL classifier (hand-rolled scanner per `parity-notes.md` §1.6), plus the catalog parsers/normalizers; wire into the `Afterlight.Parity` runner and get every fixture green (this gates the cutover).

## 2. Theater domain: resources and migration

- [x] 2.1 Create the `Afterlight.Theater` domain and `TheaterRoom` resource: `room_key` text PK, `revision` bigint default 1 (monotonic), `epoch` integer default 1 (P9 placeholder, documented), `now_item_id` nullable, `updated_at` epoch-ms integer.
- [x] 2.2 Create `TheaterItem` resource per design D1: `id` text PK (`itm_<base36>_<rand>` mint format), `slot` CHECK in ('now','queue'), `order_index`, `kind`, `url` (≤2048), `video_id`, `title` (≤120), `position_sec` double precision, `playing`, `updated_at` bigint, `by`/`queued_by` varchar(40), `generation` integer default 1, torrent pick fields (`infohash`, `file_index`, `file_path`, `file_bytes` double precision).
- [x] 2.3 Write the theater migration: tables, CHECK constraints, `theater_items_room_slot_idx (room_key, slot, order_index)`, FK from items to rooms.

## 3. Theater actions and atomic commits

- [x] 3.1 Implement the command path: `SELECT ... FOR UPDATE` on the room row → load items → pure reducer → write item diffs (update now row, insert/delete/reindex queue rows, increment generation on promotion) → `revision + 1` → outbox row → commit; broadcast `theater_state {theater:{now,queue}, serverNow}` from the committed result via the outbox relay.
- [x] 3.2 Map the twelve ops 1:1 onto domain actions returning the stable reason strings byte-identically; attach P4 command receipts (`request_id`, `payload_hash`) to durable theater commands with exact-retry replay and different-payload rejection.
- [x] 3.3 Guard `ended`/`failed` by item id AND persisted generation with SERVER-SIDE INFERENCE (the client sends no generation): track the last delivered `(revision, generation)` per session, stamp reports with the generation that session last saw, and reject stale reports (older than the item's current generation, incl. re-promoted-same-id) with `item_mismatch` before any state change.
- [x] 3.4 Preserve the interactive resolve contract (room theater, one in flight, 10 s cooldown, `RD*`/`UL*` declined) at the gateway, and deliver `theater_playlist_resolved` targeted to the requester.

## 4. Catalog domain: resources and migration

- [x] 4.1 Create the `Afterlight.Catalog` domain and resources per design D4: `PlaylistList` (id text PK, name ≤80, added_by, added_at, channel_count), `PlaylistChannel` (list FK cascade, position, url, name ≤200, group ≤120, logo, tvg_id, `UNIQUE (list_id, position)`), `EpgGuide` (single `'active'` row, name ≤120, updated_at), `EpgChannel` (PK `(guide_id, xmltv_id)`, names jsonb, icon).
- [x] 4.2 Create `EpgProgramme` (identity PK, guide_id, channel_key, `start_ms`/`stop_ms` bigint, title, sub_title, description) with the covering index `(guide_id, channel_key, start_ms, stop_ms)`; implement now/next as indexed range queries preserving binary-search semantics and first-wins import dedup.
- [x] 4.3 Write the catalog migration with constraints and indexes; verify the `iptv_state` metadata snapshot builder produces the exact Node field set and stays KB-scale against a 16k-channel import.

## 5. Catalog endpoints and SSRF

- [x] 5.1 Implement Phoenix controllers for `POST /api/theater/playlists` (text `?name=` and JSON `{name,url}` variants) and `POST /api/theater/epg` (raw bytes): Content-Length + streamed-count caps (8 MiB text / 64 MiB EPG), gzip `1f 8b` magic with hard output cap, CORS preflight + Origin echo + `Vary: Origin` on `/api/theater/*` only, identical JSON success/error shapes and error strings (`persist_failed` reserved for persist failure).
- [x] 5.2 Implement the SSRF-hardened URL fetch: http(s)-only, redirect cap 3 with per-hop re-validation, private/loopback/link-local/multicast/reserved address blocking at connect time, connection pinned to the validated DNS answer, 15 s total timeout, streamed size cap; add hostile-URL test fixtures.
- [x] 5.3 Route `iptv_list_get`/`iptv_list_remove`/`epg_lookup` to `Afterlight.Catalog` in the gateway router with byte-identical `iptv_list` and `epg_schedule` payloads (incl. >300-key rejection); removal deletes rows transactionally, broadcasts `iptv_state`, and never touches theater playback.

## 6. Playlist import worker

- [x] 6.1 Add Oban and implement the fetch worker: unique job per room (1 in flight), 15 s total timeout, streamed 3 MiB cap, `collectVideos` DFS order parity, `RESOLVE_MAX` 100, mix-id decline preserved at resolve time, stable failure reasons (`playlist_unreadable`, `playlist_not_public`, `is_mix`); document the plain-Oban-over-AshOban decision in the design record.
- [x] 6.2 Stage resolved previews (request_id, title, videos) and compute the confirming `addMany` result `{queued, skipped, didNotFit}` through the reducer so `theater_import_result` is exact, including partial fits against the 50-item queue cap.

## 7. Import/export tooling and docs

- [x] 7.1 Implement `mix afterlight.import_theater_catalog` per design D6: per-file snapshot+hash into `system_imports`, `normalizeTheaterState`-equivalent repair, upsert idempotency, chunked bulk EPG insert with first-wins dedup, count validation (theater idle tolerance; 2 lists/16k channels; 12k EPG channels/1.3k with programmes) exiting non-zero on mismatch, partial-file tolerance per domain.
- [x] 7.2 Implement `mix afterlight.export_theater` and `mix afterlight.export_catalog` (reverse export under write freeze) and document both in the cutover runbook BEFORE the flip.
- [ ] 7.3 Update `docs/architecture/elixir/ownership.md` rows #12–#15 (cut over in P5; #18 torrent bill-rows note) and the `protocol-catalog.md` §3 persistence map and §4 HTTP surface (uploads now Phoenix-hosted), and add §6 "Declared tightenings" rows for: the generation guard on ended/failed reports (rejected `item_mismatch` where Node auto-advances a re-promoted same-id item — same client inputs, different message sequence), the SSRF fetch refusals (private-address block, redirect cap — Node performed these fetches), and the `expected_revision: absent (gateway-validated)` interim envelope semantics from the P4 infrastructure.

## 8. Tests

- [ ] 8.1 DB integration: two concurrent ops serialize under the room row lock with strictly increasing revision; stale `ended` (id + generation) rejected; queue/channel/EPG caps enforced at the DB boundary; `persist_failed` path leaves state unchanged.
- [ ] 8.2 Import tests: idempotent second run (no writes, identical counts, same hashes), count-mismatch abort, `normalizeTheaterState` repair fixtures, idle-theater no-op, partial-file tolerance per domain.
- [ ] 8.3 Upload endpoint integration: caps trip mid-stream with identical errors; gzip bomb defused with active guide intact; CORS preflight/echo parity; SSRF fixtures (private address, redirect-to-private, DNS re-resolution race) fail closed.
- [ ] 8.4 Worker tests: 15 s timeout, 3 MiB cap, RESOLVE_MAX truncation, mix decline, unique-job-per-room, exact `theater_import_result` for a full fit, an over-cap fit, and a skipped-entries mix.
- [ ] 8.5 Restart recovery: playing item + queue rebuilt from PostgreSQL with correct shared clock semantics; revision continues; a stale report after restart is still rejected; EPG lookup p95 for a 300-key batch measured and recorded against the single-digit-ms target.

## 9. Cutover and verification

- [ ] 9.1 Rehearse the ceremony on a staging copy: freeze Node theater/catalog writes → snapshot+hash the three files → import → validate counts → flip router (`theater_*`, `iptv_*`, `epg_*`, uploads) → disable `server/theater.js`/`server/iptv.js` writes and remove `server/storage.js` theater handling → originals read-only; record hashes and measurements.
- [ ] 9.2 Verify gates: theater + iptv + xmltv parity suites green in CI; `npm test` green; two-browser theater session (queue, playNow, pause/seek, ended auto-advance, playlist resolve+import, guide now/next) behaves identically with `src/ui/theaterScreen.js` untouched.
- [ ] 9.3 Flip in the dev environment: run a real upload and an EPG upload through the Phoenix endpoints, restart the app and confirm timeline/catalog/guide recovery from PostgreSQL, confirm `game-state.json` no longer carries a theater section and the read-only snapshots match the import hashes.

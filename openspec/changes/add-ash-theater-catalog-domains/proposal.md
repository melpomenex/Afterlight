# Add Ash Theater & Catalog Domains (Phase P5)

## Why

The theater bill/timeline and the shared IPTV/EPG catalog are the largest shared state in Afterlight, and they persist through the weakest writers in the codebase: the theater `{now, queue}` rides `game-state.json`'s whole-file synchronous rewrite, while `iptv.json` (3.6 MB, 2 lists, 16k channels) and `epg.json` (9.2 MB, 12k channels, 1.3k with programmes) are rewritten wholesale on every upload. There is no transactional ordering between "bill changed" and "room told", no protection against a stale playback report advancing a newer item across a restart, and no indexed path to EPG now/next lookups. P4 moved accounts and landed the command-receipt/outbox infrastructure; P5 applies that machinery to theater and catalog so the bill survives failures atomically and the guide scales on indexed PostgreSQL rows — while the torrent engine stays a Node sidecar (P7) and the Three.js theater screen changes not at all.

## What Changes

- New Ash domain `Afterlight.Theater`: `TheaterRoom` (room key, monotonic revision, epoch placeholder for P9) and `TheaterItem` (item id string format preserved `itm_<base36>_<rand>`, kind classification parity, url, title, position_sec, playing, updated_at, by, queued_by, generation, torrent pick fields with sanitation parity).
- Queue operations map 1:1 onto `shared/theaterModel.js applyTheaterAction` (add/addMany/remove/playNow/skip/clear/pause/resume/seek/ended/failed/channel) with stable, byte-identical error reason strings (`queue_full`, `item_not_found`, `item_mismatch`, `use_import`, `no_file_chosen`, `invalid_url`, `seek_unsupported`, `invalid_position`, `invalid_action`); theater parity fixtures gate the cutover.
- Atomic timeline commits: room row lock (`SELECT FOR UPDATE`) + revision bump + item writes in one transaction; `ended`/`failed` reports guarded by item id AND generation so a stale report cannot advance a newer item.
- Playlist import preserved as preview/confirm: `theater_playlist_resolve` stays interactive (1 in flight, 10 s cooldown, mix ids RD/UL declined); the server-side fetch moves to a bounded Oban job (15 s timeout, 3 MiB cap, `RESOLVE_MAX` 100); `theater_import_result {queued, skipped, didNotFit}` exact. AshOban evaluated — plain Oban chosen (documented in design).
- New Ash domain `Afterlight.Catalog`: `PlaylistList`/`PlaylistChannel` stored as full rows in PostgreSQL with metadata-only snapshots on the wire and channel pages pulled via `iptv_list_get`, exactly as today; `EpgChannel`/`EpgProgramme` as rows with an indexed time path that preserves the binary-search now/next semantics and the 300-key lookup cap.
- Import limits stay EXACT: 24 lists, 8 MiB playlist text, 20k channels/list, 64 MiB EPG file, 50k EPG channels, 250k programmes; error strings identical (`not_a_playlist`, `text_too_large`, `too_many_lists`, `no_channels`, `too_many_channels`, `list_not_found`, `persist_failed`).
- HTTP upload endpoints (`POST /api/theater/playlists`, `POST /api/theater/epg`) move to the Phoenix endpoint with the SAME caps, CORS preflight + Origin echo behavior, and gzip magic detection with bounded decompression; URL fetches gain explicit SSRF defenses (http(s) only, redirect cap, private-address block, DNS re-resolution check, decompression cap).
- Migration tooling: idempotent `mix afterlight.import_theater_catalog` for the theater section of `game-state.json` (with `normalizeTheaterState`-equivalent repair), `iptv.json`, and `epg.json` — snapshot+hash each file first, validate counts (2 lists / 16k channels; 12k EPG channels / 1.3k with programmes), originals become read-only.
- Protocol stays byte-compatible: `theater_state {theater:{now,queue}, serverNow}`, `iptv_state` metadata snapshots, `iptv_list`, `epg_schedule`, `theater_playlist_resolved`, `theater_import_result`; the gateway router flips theater and catalog traffic to Phoenix and the Node `theater.js`/`iptv.js` write paths are disabled. `src/ui/theaterScreen.js` is UNCHANGED. At the same flip, the `theater` and `iptv` slices of the join-time `welcome` payload become Ash-composed (or are dropped from welcome with clients receiving the state on theater join) — a Node-built welcome carries the frozen pre-cutover `theater:{now,queue}`, the client applies it on connect (`src/main.js` `if (msg.theater) theaterUI.applyState(...)`), and serving stale state from a read-only source would be a split-brain window.
- Rollback posture: reverse-export tasks (theater state and catalog → JSON) documented under a write freeze BEFORE the flip; after PostgreSQL becomes authoritative, forward-fix is preferred.

Depends on: `add-ash-accounts-domain` (P4 supplies server-derived actor identity, the command receipt/outbox infrastructure this change's durable commands ride, and the gateway composition pattern; torrent sidecar grants remain P7).

## Capabilities

### New Capabilities

- `theater-domain`: the server-authoritative theater bill and timeline as durable Ash state — reducer-exact queue operations with stable error reasons, atomic revision-bumped timeline commits, generation-guarded ended/failed reports, the shared playback clock, bounded playlist import with exact result reports, and restart recovery from PostgreSQL.
- `catalog-domain`: the shared IPTV library and EPG as durable Ash state — full catalog rows with metadata-only wire snapshots, lazy channel pages, indexed EPG now/next with capped lookups, exact import limits and error strings, re-hosted HTTP upload endpoints with identical caps/CORS/gzip behavior, SSRF-hardened URL fetches, and snapshot-hashed idempotent import.

### Modified Capabilities

None. The pending `video-screen`/`shared-viewing`/`shared-iptv-library`/`program-guide` behavior contracts are unchanged in outcome; this change moves their authority and persistence, not their player-facing behavior. Governance requirements are satisfied, not altered.

## Impact

- **Elixir (new)**: `server_elixir/lib/afterlight/theater/` (domain, resources, reducer port, locks), `lib/afterlight/catalog/` (domain, resources, xmltv/m3u port reusing the P0 fixture-verified parsers), Oban worker for playlist fetches, `priv/repo/migrations/*_theater_catalog.exs`, `lib/mix/tasks/afterlight.import_theater_catalog.ex`, `lib/mix/tasks/afterlight.export_theater.ex`, `lib/mix/tasks/afterlight.export_catalog.ex`, Phoenix controllers for `/api/theater/playlists` and `/api/theater/epg`, gateway handlers for `theater_*`/`iptv_*`/`epg_*` messages.
- **Node (modified)**: `server/theater.js` and `server/iptv.js` write paths disabled (read-only legacy kept until P11 cleanup); `server/index.js` theater/catalog WS routing and `/api/theater/*` HTTP handlers removed from the authority path; `server/storage.js` drops the `theater` section (the importer tolerates section absence).
- **Client**: none. `src/ui/theaterScreen.js` is UNCHANGED — payloads are byte-compatible and the router flip is invisible; `src/net/client.js` upload helpers keep working against the Phoenix-hosted endpoints.
- **Shared**: nothing changes; `shared/theaterModel.js`, `shared/iptvModel.js`, `shared/xmltv.js`, `shared/torrentModel.js` are frozen as the parity reference.
- **Persistence**: `data/game-state.json` (theater section), `data/iptv.json`, and `data/epg.json` are frozen read-only at their cutover snapshots (hashes recorded); PostgreSQL becomes durable truth for theater rooms/items and catalog/EPG rows. Torrent sidecar files stay Node-owned (P7).
- **Tests**: existing JS tests stay green; parity suites for the theater reducer + URL classification + iptv model + xmltv become cutover gates; new Elixir DB integration tests (revision atomicity, stale ended rejection, cap enforcement), import idempotency, upload-endpoint cap integration, and restart-recovery tests.
- **Docs**: `docs/architecture/elixir/ownership.md` rows #12–#15 marked cut over (with #18 noted as sidecar-retained); `protocol-catalog.md` §3 persistence map updated.

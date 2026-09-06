# catalog-domain

## Purpose

The shared IPTV library and EPG guide as durable PostgreSQL state owned by `Afterlight.Catalog`: full catalog rows indexed for EPG now/next lookups, metadata-only wire snapshots exactly as today, lazy channel pages, upload endpoints re-hosted on Phoenix with identical caps/CORS/gzip behavior, SSRF-hardened server-side URL fetches, and snapshot-hashed idempotent import of `iptv.json`/`epg.json`. Player-facing behavior — guide browsing, filtering, tuning, now/next display, upload flows — is unchanged; this capability moves authority from Node (`server/iptv.js` + JSON files) to Ash in Phase P5.

## ADDED Requirements

### Requirement: Durable catalog rows with metadata-only snapshots

The catalog SHALL persist as rows — `playlist_lists`, `playlist_channels` (positioned, with url/name/group/logo/tvg-id), `epg_guides` (single active guide), `epg_channels` (names, icon), `epg_programmes` (start/stop in epoch ms, title, sub-title, description) — and the `iptv_state` payload SHALL remain a metadata-only snapshot (`{lists:[{id,name,channelCount}], epg:{name,channelCount,programmes}|null}`) whose size is independent of catalog contents. Full channel arrays SHALL NOT be broadcast in snapshots.

#### Scenario: Sixteen thousand channels stay off the wire

- **WHEN** the imported catalog (2 lists, ~16k channels) is snapshotted to a client joining the theater
- **THEN** the `iptv_state` payload carries list metadata and the guide summary only, at KB scale, and channel data is fetched separately on demand

#### Scenario: Catalog survives a restart

- **WHEN** the application restarts after list and guide uploads
- **THEN** the catalog and active guide are rebuilt from PostgreSQL with identical metadata and lookups, with no re-upload

### Requirement: Channel pages on demand

`iptv_list_get {listId}` SHALL return `iptv_list {listId, channels}` assembled from `playlist_channels` in stored position order with the same per-channel fields (`url`, `name`, `group`, `logo`, `tvgId`) as the Node implementation; `iptv_list_remove {listId}` SHALL delete the list's rows transactionally, broadcast a fresh `iptv_state`, and never touch theater playback; a missing list SHALL be rejected with `list_not_found`.

#### Scenario: Paged channel fetch is identical

- **WHEN** a client requests the channels of an imported 16k-channel list
- **THEN** the `iptv_list` payload is field-identical (order, names, groups, logos, tvg ids) to the pre-cutover payload for the same data

### Requirement: EPG now/next with capped lookups

`epg_lookup {keys}` SHALL accept at most 300 keys and SHALL return `epg_schedule {entries:[{key, now, next}]}` computed from `epg_programmes` via the indexed time path (current programme containing the query time, next by start time), preserving the JS binary-search semantics including channels with no schedule data (absent entries) and the first-wins import rule for duplicate programme times. The 9.2 MB guide MUST NOT be loaded into memory per lookup.

#### Scenario: Now and next match the reference

- **WHEN** a 300-key lookup runs against the imported guide at a pinned time
- **THEN** every entry's now/next titles and time windows match the JS implementation's output for the same data

#### Scenario: Over-cap lookup is rejected

- **WHEN** a client sends more than 300 keys
- **THEN** the request is rejected with the same bounded-error behavior as today and the guide state is unchanged

### Requirement: Exact import limits and error strings

Catalog and EPG imports SHALL enforce the existing caps exactly — 24 lists, 8 MiB playlist text, 20k channels per list, 64 MiB EPG file bytes, 50k EPG channels, 250k programmes — and SHALL return the stable error strings byte-identically: `not_a_playlist`, `text_too_large`, `too_many_lists`, `no_channels`, `too_many_channels`, `list_not_found`, `persist_failed` (reserved for persist-step failure). Parsed-entry skips (tolerant M3U/XMLTV parsing) SHALL be counted and applied exactly as the JS parsers do.

#### Scenario: Each limit trips its own error

- **WHEN** uploads are driven against each cap boundary (25th list, >8 MiB text, 20,001-channel list, >64 MiB guide, 50,001-channel guide, 250,001-programme guide, zero-channel playlist, non-M3U text, unknown list removal)
- **THEN** each is rejected with exactly the corresponding error string and the existing catalog/guide state is unchanged

### Requirement: Upload endpoints re-hosted with identical behavior

`POST /api/theater/playlists` (UTF-8 text with `?name=`, or JSON `{name,url}`) and `POST /api/theater/epg` (raw bytes) SHALL be served by the Phoenix endpoint with caps enforced from Content-Length AND streamed count, gzip detected by the `1f 8b` magic and inflated under a hard output cap (decompression bombs rejected cleanly with state unchanged), CORS preflight and any-Origin echo with `Vary: Origin` on `/api/theater/*` only, and the same JSON success/error shapes. The Node HTTP handlers SHALL be removed from the authority path at the flip.

#### Scenario: Oversized upload behaves identically

- **WHEN** a playlist text larger than 8 MiB and an EPG file larger than 64 MiB are posted
- **THEN** both are rejected mid-stream with the same error strings and status behavior as the Node endpoints, leaving library and guide untouched

#### Scenario: Gzip bomb is defused

- **WHEN** a small gzipped EPG expands beyond the 64 MiB output cap
- **THEN** the upload is rejected with a readable error, no partial guide is stored, and the previously active guide remains active

### Requirement: SSRF defenses on server-side URL fetch

The server-side playlist URL fetch SHALL restrict schemes to http/https, cap redirects at 3 with every hop re-validated, block resolved private/loopback/link-local/multicast/reserved addresses at connect time, pin the connection to the validated DNS answer (closing the re-resolution race), and enforce the total 15 s timeout and streamed size cap. Happy-path behavior and error shapes SHALL be unchanged from the Node baseline.

#### Scenario: Private address is refused

- **WHEN** an import URL resolves to a loopback or RFC1918 address (directly or via a redirect hop)
- **THEN** the fetch is refused before any body is read and the failure is reported with the stable unreadable-playlist error

#### Scenario: DNS re-resolution race is closed

- **WHEN** a hostile host returns a public address for validation and a private address on re-resolution
- **THEN** the connection is attempted only to the validated address and the fetch fails closed on mismatch

### Requirement: Snapshot-hashed idempotent import

`mix afterlight.import_theater_catalog` SHALL snapshot-copy and SHA-256-hash each source file (`game-state.json` theater section, `iptv.json`, `epg.json`) BEFORE reading, record the hashes so a second run against the same snapshots is a no-op, repair the theater section through the `normalizeTheaterState`-equivalent port before insert, bulk-import channels and programmes with the first-wins rule, and validate counts against the snapshots (lists and total channels; EPG channels and programme-bearing channels), exiting non-zero on any mismatch. A partial file (missing catalog or EPG section) SHALL be reported as "nothing to import" for that domain and not block the others.

#### Scenario: Second import is a no-op

- **WHEN** the same three snapshots are imported twice
- **THEN** the second run writes nothing, reports identical counts, and records the same hashes

#### Scenario: Count validation blocks the flip

- **WHEN** the imported channel count differs from the `iptv.json` snapshot count, or EPG programme-bearing channels differ from the snapshot
- **THEN** the task exits non-zero with a domain-level report and the catalog cutover is blocked

#### Scenario: Idle theater imports cleanly

- **WHEN** the snapshot's theater section is `{now: null, queue: []}` or absent
- **THEN** the import records the snapshot hash and persists an idle room without error

### Requirement: Rollback honesty for the catalog

Before the routing flip the change SHALL provide and document `mix afterlight.export_catalog`, writing the catalog and guide back to legacy-shaped `iptv.json` and `epg.json` under an explicit write freeze. After PostgreSQL becomes authoritative, reverting to the JSON writers SHALL NOT be considered a valid rollback; forward-fix is preferred.

#### Scenario: Reverse export under freeze

- **WHEN** operators rehearse catalog rollback before the flip
- **THEN** the exported `iptv.json` and `epg.json` load in the documented legacy path with identical list/channel and guide/programme counts

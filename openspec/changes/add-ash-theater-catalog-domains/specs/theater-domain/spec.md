# theater-domain

## Purpose

The server-authoritative theater bill and timeline as durable PostgreSQL state owned by `Afterlight.Theater`: every queue operation is reducer-exact against the JS reference, every accepted mutation commits atomically with a monotonic revision, playback reports cannot advance a newer item, playlist imports stay bounded and report-exact, and the screen recovers its timeline from the database across restarts. Player-facing behavior and payloads are unchanged; this capability moves authority from Node (`server/theater.js` + `game-state.json`) to Ash in Phase P5. The torrent engine remains a Node sidecar — only bill rows and pick fields belong here.

## ADDED Requirements

### Requirement: One authoritative bill per room with monotonic revision

Each theater room SHALL have a single authoritative timeline (`now` item plus ordered queue) persisted in `theater_rooms`/`theater_items`, with a monotonically increasing `revision` bumped by every accepted mutation and an `epoch` placeholder column reserved for future lease-based ownership. Room state SHALL NOT depend on any Node process memory after cutover.

#### Scenario: Restart rebuilds the timeline

- **WHEN** the Elixir application restarts while an item is playing and items are queued
- **THEN** the room's timeline is rebuilt from PostgreSQL with the same now item, shared playback position semantics, queue order, attributions, and the revision continues from its persisted value

#### Scenario: Revision never moves backward

- **WHEN** two accepted mutations are applied in any order
- **THEN** each committed revision is strictly greater than the previous one and snapshots carry the revision they describe

### Requirement: Reducer-exact operations with stable error reasons

Queue operations SHALL map 1:1 onto `shared/theaterModel.js applyTheaterAction` (add, addMany, remove, playNow, skip, clear, pause, resume, seek, ended, failed, channel) through a pure Elixir reducer, and SHALL return the stable reason strings byte-identically (`queue_full`, `item_not_found`, `item_mismatch`, `use_import`, `no_file_chosen`, `invalid_url`, `seek_unsupported`, `invalid_position`, `invalid_action`). The full fixture matrix (ops × hostile inputs, URL classification table, `normalizeTheaterState` repair, absent/null shapes) SHALL pass before authority flips.

#### Scenario: Fixtures gate the cutover

- **WHEN** the theater parity suite runs against the exported fixtures with pinned clock and injected RNG
- **THEN** every operation's output state and error reason match the JS reference, and a red suite blocks the routing flip

#### Scenario: Queue cap enforced identically

- **WHEN** an add arrives while the queue already holds 50 items
- **THEN** it is rejected with `queue_full`, the state is unchanged, and an `addMany` that would overflow stops at the cap with `didNotFit` reported exactly as the JS reducer does

### Requirement: Atomic timeline commit

Every accepted theater mutation SHALL take the room row lock (`SELECT ... FOR UPDATE`), apply the reducer, write the affected item rows, bump the room revision, and insert the outbox event in ONE transaction; the `theater_state` broadcast SHALL be driven by the committed result, never sent before commit.

#### Scenario: Racing operations serialize

- **WHEN** two players simultaneously playNow different queued items
- **THEN** one wins with the item playing and the other observes the post-first-mutation state (item moved to now, queue reordered) — never a torn merge of both

### Requirement: Stale playback reports cannot advance a newer item

The client sends no generation, so the server infers it: the theater room SHALL track the last delivered `(revision, generation)` per session, and a client `ended`/`failed` report SHALL be stamped server-side with the generation that session last saw. A report SHALL be accepted only when the reported item id equals the current `now` item AND its inferred generation is not older than the current item's `generation` (persisted per item, incremented on each promotion to `now`); stale reports — an inferred generation older than the item's current generation — SHALL be rejected with `item_mismatch`, leaving the timeline unchanged. No client change is required or permitted.

#### Scenario: Late failed report is rejected

- **WHEN** a session that last saw item A as `now` sends a `failed` report after A already ended and item B was promoted
- **THEN** the report is stamped with the generation that session last saw, found older than B's current generation, and rejected with `item_mismatch` while B keeps playing

#### Scenario: Re-promoted same id stale report is rejected

- **WHEN** item A plays as generation 1, item B is promoted, and A is later re-promoted as generation 2 — and a session that last saw A at generation 1 then sends `ended` for A
- **THEN** the report's inferred generation (1) is older than A's current generation (2), and the report is rejected with `item_mismatch` while A keeps playing

#### Scenario: Guard survives a restart

- **WHEN** the same stale report arrives after an application restart
- **THEN** the generation persisted in PostgreSQL still identifies it as stale and it is rejected identically

### Requirement: Item identity and classification parity

Server-minted item ids SHALL preserve the `itm_<base36 nowMs>_<rand>` format, and source classification SHALL match `classifySource` exactly (kinds youtube/vimeo/file/hls/torrent, youtube-playlist links rejected with `use_import`, URL cap 2048, title cleanText cap 120 UTF-16 units with kind default titles). Torrent items SHALL carry `infohash`, `file_index`, `file_path`, `file_bytes` only after `sanitizeTorrentPick` and the video-file check (`no_file_chosen` otherwise), with imported ids and pick values preserved verbatim.

#### Scenario: Hostile URLs classify identically

- **WHEN** the classification fixture table (including hostile and boundary URLs) runs through the Elixir classifier
- **THEN** every kind, normalized URL, and video id matches the JS reference byte-for-byte

### Requirement: Shared playback clock and seek rules

The persisted timeline SHALL keep `position_sec` (the position valid at `updated_at`, epoch ms) and `playing`; the effective position SHALL be derived exactly as the JS shared clock (`position_sec + elapsed/1000` while playing, frozen while paused). Seek SHALL clamp to ≥ 0, refuse HLS with `seek_unsupported`, and reject non-finite positions with `invalid_position`.

#### Scenario: Late joiner settles near the shared position

- **WHEN** a player joins the theater room mid-playback
- **THEN** their targeted `theater_state {theater:{now,queue}, serverNow}` lets the unchanged client settle on the same item near the shared position without restarting it

### Requirement: Bounded playlist import with preview/confirm and exact result report

Playlist resolution SHALL preserve the interactive contract (one request in flight per room, 10 s cooldown, YouTube mix ids `RD*`/`UL*` declined) and the server-side fetch SHALL run in a bounded Oban job: 15 s total timeout, 3 MiB streamed cap, extraction order and `RESOLVE_MAX` 100 parity, stable failure reasons. Resolution delivers `theater_playlist_resolved {requestId, title, videos}`; the confirming `addMany` SHALL return `theater_import_result {queued, skipped, didNotFit}` computed by the reducer exactly.

#### Scenario: Mix id declined without a fetch

- **WHEN** a player resolves a list id beginning with `RD` or `UL`
- **THEN** no fetch occurs and the requester receives the same stable failure the Node implementation returned

#### Scenario: Oversized resolve stops at the cap

- **WHEN** a playlist page yields more than 100 extractable videos
- **THEN** exactly 100 are offered in document order and the subsequent import reports `queued`/`skipped`/`didNotFit` consistent with the 50-item queue cap

### Requirement: Wire compatibility for theater messages

`theater_state` (`{theater:{now,queue}, serverNow}`), `theater_playlist_resolved`, and `theater_import_result` SHALL be field-identical to the Node implementation (key order-insensitive JSON), and the gateway SHALL route `theater_queue`/`theater_control`/`theater_channel`/`theater_playlist_resolve` to the Elixir domain at the flip. The client `src/ui/theaterScreen.js` SHALL require no changes.

#### Scenario: Client cannot distinguish the new authority

- **WHEN** a recorded pre-flip session and a post-flip session are compared for identical player inputs
- **THEN** the message sequences carry the same types, field sets, and error reasons, and the unchanged theater screen renders both identically

### Requirement: Rollback honesty for the theater

Before the routing flip the change SHALL provide and document `mix afterlight.export_theater`, writing each room's `{now, queue}` back to the legacy `game-state.json` theater shape under an explicit write freeze. After PostgreSQL becomes authoritative, reverting to the JSON writer SHALL NOT be considered a valid rollback; forward-fix is preferred.

#### Scenario: Reverse export under freeze

- **WHEN** operators rehearse theater rollback before the flip
- **THEN** the export produces a `theater` section accepted by the documented legacy loader and equal to the persisted timeline (idle theater exports `{now: null, queue: []}`)

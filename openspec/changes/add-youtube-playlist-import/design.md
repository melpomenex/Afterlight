## Context

The Orpheum's shared screen is server-owned: every rule lives in the pure reducer `shared/theaterModel.js`, the server applies actions and broadcasts full snapshots, and clients render. Two flows already establish the patterns this change reuses:

- **Torrent magnets** (`beginTorrentResolve` in `src/ui/theaterScreen.js`, `TORRENT_RESOLVE`/`TORRENT_FILES` in `shared/protocol.js`, `server/index.js`): paste → server resolves privately → requester picks from a dialog → pick reaches the shared bill as a normal op. Room-guarded, one resolve in flight per player.
- **IPTV URL fetch** (`fetchPlaylistText` in `server/index.js`): server-side http(s)-only fetch with timeout and streaming size cap, because browsers cannot cross-origin fetch media hosts.

Today `classifySource()` returns `null` for a YouTube URL with no video id, so a playlist link dies as "invalid_url" at the booth. The queue is capped at `THEATER_LIMITS.QUEUE_MAX` (50) and persists as `{now, queue}` in `data/game-state.json`.

See proposal.md for motivation and specs/ for the behavior contract.

## Goals / Non-Goals

**Goals**

- Paste a playlist link → recognized immediately → resolved server-side → preview → one confirm → videos on the shared reel.
- No API key, no new npm dependency, no save-schema change.
- All shared-state rules stay in the pure reducer; the resolver is the only new server machinery.

**Non-Goals**

- Importing playlists other than YouTube's (no Vimeo playlists, no Spotify).
- Watch-later/liked-lists (`WL`/`LL`) and other private lists — they require auth; declined with a clear message.
- Background/continuous sync of a playlist (import is a snapshot of "now").
- Thumbnail artwork in the preview (text-only preview is fine; thumbnails would be a follow-up).

## Decisions

### D1: Resolution = server-side page fetch + `ytInitialData` extraction (no API key)

The server fetches `https://www.youtube.com/playlist?list=<id>&hl=en` (http(s) enforced by construction, since the id is extracted from an already-classified URL) and extracts the embedded `ytInitialData` JSON, walking the playlist renderer for `{videoId, title}` pairs in order.

- Alternatives: **YouTube Data API v3** rejected — needs an operator-supplied key, breaking out-of-the-box UX. **Innertube `youtubei/v1/browse` POST** kept as a fallback — more structured than HTML scraping but an undocumented endpoint; if HTML extraction starts failing wholesale, this is the pre-planned pivot. **Client-side IFrame-API enumeration** rejected — CORS-free but requires loading a hidden player, is slow, and complicates the no-host model.
- EU consent walls: send `Cookie: CONSENT=YES+; SOCS=CAI` and `hl=en`; on a consent-page response (no `ytInitialData`), fail with the standard "could not read that playlist" message rather than a hang.
- Resolved count is capped at `THEATER_LIMITS.RESOLVE_MAX = 100` (> `QUEUE_MAX`, so the queue cap — not the resolver — is the binding limit). Pagination beyond the first page is intentionally not chased.

### D2: Resolver is a server-only module with a pure, tested extraction core

New `server/youtubePlaylist.js`: `resolvePlaylist(listId)` (fetch + timeout + size cap, mirroring `fetchPlaylistText`'s shape) around an exported pure `extractPlaylistVideos(html)` returning `{title, videos: [{videoId, title}]}` or a reason. The extraction core is unit-tested against small **synthetic** fixture HTML documents that mimic `ytInitialData`'s shape — no real YouTube pages in the repo.

### D3: Transport mirrors the torrent resolve: WS request/reply, room-guarded

New `MSG_TYPES.THEATER_PLAYLIST_RESOLVE` (`theater_playlist_resolve`, `{requestId, listId}`) and `THEATER_PLAYLIST_RESOLVED` (`theater_playlist_resolved`, `{requestId, title, videos}` / `{requestId, reason}`). Server guards: sender must be in `ROOMS.THEATER`, one resolve in flight per player (reuse the `torrentResolves`-style set), a per-player cooldown (≈10 s) plus the fetch timeout. The client keeps a pending record like `torrentPending` (requestId match, timeout, dropped when leaving the theater).

- Alternative considered: an HTTP endpoint like the IPTV fetch. Rejected — the confirm step is a WS op anyway, and WS keeps room membership enforcement and the client's pending-request plumbing identical to the torrent flow.

### D4: Classification gains a `youtubePlaylist` kind; playback ops refuse it

`classifySource()` extracts `list=` on YouTube hosts and returns:
- `{kind: 'youtubePlaylist', listId}` for standalone playlist URLs;
- `{kind: 'youtube', videoId, listId}` for mixed links (the video stays directly playable; `listId` is extra context);
- unchanged results otherwise. Mix/radio ids (`RD…`) classify as playlists but `resolvePlaylist` declines them with `is_mix` so the UI can still offer the plain video.

The reducer's `add`/`channel` ops reject `kind: 'youtubePlaylist'` with a new reason (`use_import` — "playlists are imported, not queued directly"), so a stale or hand-crafted client can never put a non-playable playlist entry on the bill. `normalizeTheaterState` drops such entries defensively if one ever appears in persisted state. `buildEmbedUrl` stays null for the kind; `KIND_LABELS` gains a label.

### D5: Batch enqueue = new pure `addMany` op with an honest report

`applyTheaterAction` gains `op: 'addMany'` (`{items: [{url, title?}]}`, capped at `RESOLVE_MAX` entries). Semantics per item, in order: re-classify the URL (server never trusts client-provided kinds), skip unclassifiable entries (counted as `skipped`), apply the same rules as `add` — first item starts the screen when idle, the rest fill the queue until `QUEUE_MAX`, the rest are counted as `didNotFit`. The op returns a `report: {queued, skipped, didNotFit}` alongside `{state, error}`; it errors only when *nothing* could be applied (`queue_full` if the reel is full, `invalid_action` for a malformed batch). `TheaterManager.applyAction` passes the report through; the server sends the actor a directed `THEATER_IMPORT_RESULT` message with the counts, then broadcasts the usual single `THEATER_STATE` snapshot to the room.

- Alternative: N separate `add` ops from the client. Rejected — 50 broadcasts, 50 disk writes, visible intermediate states for other viewers, and no atomic capacity math.

### D6: Client UX — recognition, choice, preview, confirm

In `src/ui/theaterScreen.js`:

- `onAddClicked` classifies first: `youtubePlaylist` (or a mixed link) routes into the playlist flow; everything else unchanged. An `input` listener on the URL field shows live recognition ("YouTube playlist detected — Enter to import") via the existing status line.
- Mixed link → small choice dialog: **"Import the playlist"** / **"Add just this video"** (the second honors whichever add button was used: queue or play-now). Asking every time was an explicit product decision.
- Resolution runs with torrent-style pending state and status text ("Reading the playlist…"); failure lands in the same status line with the specific reason.
- Resolved playlist opens a preview dialog: playlist title, video count, the first five titles, and one confirm button ("Add N videos") — disabled with a queue-full note when nothing fits. Confirm sends one `addMany`; the directed result message renders the honest summary ("Queued 30. 50 didn't fit — the reel is full."). Cancel/close sends nothing.

### D7: Limits and error taxonomy (all in `THEATER_LIMITS` / `theaterErrorText`)

New limits: `RESOLVE_MAX = 100`, resolve fetch reuses the IPTV timeout/size constants' spirit (15 s, ~2 MB response cap — the page is big; cap tightens later if needed). New error reasons: `is_mix` ("radio mixes never end — add the video instead"), `playlist_not_public`, `playlist_unreadable` (fetch/parse failure), `use_import`, `resolve_in_flight` (reuse wording style). All rendered through the existing `theaterErrorText`.

## Risks / Trade-offs

- [YouTube markup drift breaks extraction] → extraction is one pure function with fixture tests; the `is_mix`/`playlist_unreadable` messages say what to do; D1 names the innertube fallback as the pivot. Import is a convenience flow — failure never blocks existing paths.
- [EU consent redirect yields an empty result] → consent cookies + `hl=en` request vars; unreadable pages fail fast with a clear message, not a hang.
- [Server IP rate-limited or blocked by YouTube] → per-player cooldown, one resolve in flight per player, no retries in the loop; the error text invites trying again later.
- [Scraped titles are untrusted strings] → titles pass the reducer's existing `cleanText` (length-capped, whitespace-collapsed) exactly like every other queued title; URLs are re-classified server-side, so only `watch?v=<id>` forms can land.
- [Big playlists flood the room's chat/queue UI] → bounded by `QUEUE_MAX`; truncation is reported, never silent.
- [Torrent-style pending state complexity] → reuse the proven `torrentPending` lifecycle (requestId, timeout, theater-room guard) rather than inventing a new one.

## Migration Plan

Purely additive: new message types, a new reducer op, a new kind, one new server module. Old clients ignore unknown message types; old servers just decline playlist links as they do today. Persisted state needs no migration (playlist entries can never persist — D4). Rollback = revert; no data to unwind.

## Open Questions

None blocking. Thumbnail previews and Vimeo playlist support are deliberate follow-ups.

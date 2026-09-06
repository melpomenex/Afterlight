## 1. Shared model: classification and limits

- [x] 1.1 In `shared/theaterModel.js`, extend `classifySource()` for YouTube hosts: extract the `list=` parameter; return `{kind: 'youtubePlaylist', listId}` for standalone playlist URLs (including `music.youtube.com`), and add `listId` to the result for mixed links (`watch?v=…&list=…`). Existing video/youtu.be/shorts behavior unchanged.
- [x] 1.2 Add `THEATER_LIMITS.RESOLVE_MAX = 100`; add a `youtubePlaylist` label to `KIND_LABELS`; extend `theaterErrorText()` with `is_mix`, `playlist_not_public`, `playlist_unreadable`, `use_import`, `resolve_in_flight` reasons in the established tone.
- [x] 1.3 Guard the playback ops: `add` and `channel` reject `kind: 'youtubePlaylist'` with `use_import`; `normalizeTheaterState()` drops any such entry from persisted/received state; `buildEmbedUrl()` stays null for the kind.

## 2. Shared model: atomic batch enqueue

- [x] 2.1 Implement `op: 'addMany'` in `applyTheaterAction()`: validate `{items: [{url, title?}]}` (array, length ≤ `RESOLVE_MAX`), re-classify each URL server-side, skip unclassifiable entries, apply `add` semantics in order (first item starts an idle screen, rest fill the queue to `QUEUE_MAX`), count `report: {queued, skipped, didNotFit}`; error `queue_full` only when nothing fits and the reel is full, `invalid_action` for malformed batches; never mutate input state.
- [x] 2.2 Extend `server/theater.js` `applyAction()` to pass the reducer's `addMany` report through as `{success, report}`.
- [x] 2.3 Add node tests to `tests/theater.test.js` (or a new `tests/youtubePlaylist.test.js`): classification of standalone/mixed/mix/music-host playlist links; `addMany` filling remaining capacity in playlist order; `skipped` for invalid entries; `didNotFit` truncation; full-reel rejection with unchanged state; `use_import` rejection for direct playlist adds; normalization drops playlist entries; error texts exist for all new reasons.

## 3. Server: resolver and wiring

- [x] 3.1 Create `server/youtubePlaylist.js` with pure `extractPlaylistVideos(html)` → `{title, videos: [{videoId, title}]}` (ordered, deduped, capped at `RESOLVE_MAX`) or `{reason}`, plus bounded `resolvePlaylist(listId)`: http(s) fetch of `https://www.youtube.com/playlist?list=<id>&hl=en` with consent cookies, 15 s timeout, ~2 MB streaming size cap (mirror `fetchPlaylistText`'s shape); decline `RD…` ids with `is_mix`; map fetch/parse failures to `playlist_unreadable`, 403/404 to `playlist_not_public`.
- [x] 3.2 Add `MSG_TYPES.THEATER_PLAYLIST_RESOLVE` / `THEATER_PLAYLIST_RESOLVED` and `THEATER_IMPORT_RESULT` to `shared/protocol.js` with doc comments matching neighbors.
- [x] 3.3 Wire the resolve in `server/index.js`: room-guarded (`ROOMS.THEATER`), one in-flight resolve per player (torrent-resolve-style set) plus a per-player cooldown (~10 s), reply to sender with `{requestId, title, videos}` or a readable error; on a successful `addMany` action, send the actor a directed `THEATER_IMPORT_RESULT {queued, skipped, didNotFit}` before the room-wide `THEATER_STATE` broadcast.

## 4. Client: recognition, choice, preview, confirm

- [x] 4.1 In `src/ui/theaterScreen.js`, route in `onAddClicked()`: `youtubePlaylist` kinds and mixed links enter the playlist flow (honoring the queue-vs-play-now button); add an `input` listener on the URL field for live recognition text ("YouTube playlist detected…") via the existing status line; non-playlist behavior unchanged.
- [x] 4.2 Add the mixed-link choice dialog (game-modal style, Escape-safe like `theater-dialog`): "Import the playlist" / "Add just this video" (the latter proceeds with the original add/play-now action); dismissing changes nothing.
- [x] 4.3 Add playlist resolve pending state mirroring `torrentPending` (requestId match, timeout slightly longer than the server's, cleared on leaving the theater), status text while resolving, and apply only matching `THEATER_PLAYLIST_RESOLVED` replies.
- [x] 4.4 Add the preview dialog: playlist title, video count, first five titles, confirm button "Add N videos" (disabled with a queue-full note when the remaining capacity is 0, computed from the current snapshot), cancel/close sends nothing; confirm sends one `THEATER_QUEUE` `{op: 'addMany', items}`.
- [x] 4.5 Handle `THEATER_IMPORT_RESULT`: honest summary in the add-status line ("Queued 30. 50 didn't fit — the reel is full."), and route new resolve/import error messages through `theaterErrorText` display.
- [x] 4.6 Extend the booth's Add-by-URL label/placeholder copy to mention playlist import (e.g. "… · YOUTUBE PLAYLIST"), keeping the existing micro-label style.

## 5. Verification and docs

- [x] 5.1 Run `npm test` and resolve failures; run `npm run build` and resolve actual errors.
- [x] 5.2 Verify in the browser against the running dev server: paste a real public playlist link → recognition text → preview with correct count/title → confirm → videos appear on the shared reel with titles for all room members; mixed link shows the choice and both branches work; cancel leaves the queue untouched; an over-cap playlist truncates with an honest summary; a mix link (`list=RD…`) is declined while its video can still be queued; gibberish/channel links still produce the old unsupported-link error.
- [x] 5.3 Confirm no regressions: single video URLs (YouTube/Vimeo/.mp4/.m3u8), torrent resolve flow, IPTV import/guide, theater persistence across reload (imported queue items survive restart as ordinary entries), and movement/controls in the theater.
- [x] 5.4 Update `README.md` player-facing theater section (playlist import paste flow), and AGENTS.md theater bullets if the mechanism summary warrants it.

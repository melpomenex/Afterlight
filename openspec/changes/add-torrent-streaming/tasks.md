## 1. Dependency and shared model

- [x] 1.1 Add `webtorrent` to `package.json` dependencies (`npm install webtorrent`) and confirm the server still boots with it imported lazily
- [x] 1.2 Create `shared/torrentModel.js`: `TORRENT_LIMITS` (resolve timeout 45 s, picker file cap, cache defaults), `parseMagnet()`/validation (v1 `btih` hex 40 / base32 32, `URL_MAX` respected), `VIDEO_FILE_EXTENSIONS` + `isVideoFile()`, `orderFilesForPicker()` (playable first, size descending, capped), `normalizeTorrentStatus()`, `torrentErrorText()`
- [x] 1.3 Extend `shared/theaterModel.js`: `classifySource()` magnet branch returning `{ kind: 'torrent', url, infohash }`; torrent file fields (`fileIndex`, `filePath`, `fileBytes`) carried through `makeItem`/`startNow`/`playNow` re-queue with structural validation; `KIND_LABELS.torrent`; `normalizeTheaterState()` accepts/drops torrent items per the shared rules
- [x] 1.4 Document the new message types in `shared/protocol.js`: `TORRENT_RESOLVE` (C→S), `TORRENT_FILES` (S→C), `TORRENT_STATE` (S→C), and the additive torrent fields on queue payloads

## 2. Server: torrent engine

- [ ] 2.1 Create `server/torrents.js` `TorrentManager`: lazy `webtorrent` import with boot-guard degradation ("torrent engine unavailable" errors, server keeps running), `resolve(magnet)` returning name + ordered file list with timeout, per-file read streams by `(infohash, fileIndex)`, video-extension/index allow-list
- [ ] 2.2 Cache lifecycle in `TorrentManager`: `data/torrents/<infohash>/` (env `TORRENT_CACHE_DIR`), idle reap (~10 min, on the existing 1 Hz tick), LRU disk cap (default 4 GB, env `TORRENT_CACHE_MAX_BYTES`) that never evicts the playing item, startup sweep of malformed/orphaned directories
- [ ] 2.3 Add `GET /api/theater/torrent/:infohash/:fileIndex` to `server/index.js`: lazy ensure, Range parsing → 206 with `Content-Range`/`Accept-Ranges`, extension Content-Type, clean 404s for non-video/unknown indexes, same CORS posture as the other `/api/theater/*` routes
- [ ] 2.4 Wire WS handlers in `server/index.js`: room-gated `torrent_resolve` (in-flight map keyed by `requestId`, one resolve per connection) replying `torrent_files` to the requester only; torrent field validation on `theater_queue`/`theater_channel` payloads; ~2 s `torrent_state` broadcast to the theater room while a torrent item is live or a resolve is in flight

## 3. Client: picker, engine, status

- [x] 3.1 Add a game-server HTTP origin helper to `src/net/client.js` mirroring `getDefaultUrl()`'s port logic (5173/4173 → 3001, otherwise same origin) and expose it to the theater UI
- [x] 3.2 Extend the booth add flow in `src/ui/theaterScreen.js`: magnets pass `classifySource` locally, send `torrent_resolve`, show a resolving state with timeout/cancel; on `torrent_files` open a file picker dialog (name, size, playable-first order, "may not play" marking) whose confirm sends the existing queue/play-now ops with torrent fields and whose cancel changes nothing
- [x] 3.3 Play torrent items through the existing file engine: build the stream URL from origin + infohash + `fileIndex`, keep the no-`crossOrigin` posture, treat `kind: 'torrent'` as seekable, and show `torrent_state` progress (connecting/downloading %, peers) in the loading overlay and booth now-playing panel with silent fallback when absent

## 4. Tests

- [x] 4.1 New `tests/torrents.test.js`: magnet parse/validation (valid hex/base32, rejects missing infohash, wrong scheme, oversize), `orderFilesForPicker` ordering/cap, `normalizeTheaterState` torrent acceptance/dropping, reducer add/playNow with torrent fields, Range streaming against a fixture file served by the endpoint, cache eviction/reap rules with a fake clock
- [x] 4.2 Extend `tests/theater.test.js` for the magnet classification branch and torrent item normalization; confirm existing tests still pass (`npm test`)

## 5. Docs and verification

- [ ] 5.1 Update README: pasting a magnet, the resolve→pick flow, what the room sees, cache location/limits, content-responsibility note, and the env overrides (`TORRENT_CACHE_DIR`, `TORRENT_CACHE_MAX_BYTES`)
- [ ] 5.2 Update AGENTS.md theater section: torrent engine architecture (manager, canonical magnet state, stream endpoint, status broadcast)
- [ ] 5.3 Run `npm test` and `npm run build`; resolve any failures
- [ ] 5.4 Verify in the running app with a well-seeded Creative Commons torrent (e.g. the Sintel fixture): paste → resolve → pick → room playback, seek/pause/skip while partially downloaded, cancel-picker leaves the bill untouched, invalid magnet and non-theater resolve are rejected with readable errors
- [ ] 5.5 Verify persistence: server restart mid-bill restores the torrent item and re-serves from cache; cache directory deletion degrades to re-download without errors; IPTV/YouTube/file/HLS paths and the rest of the theater still work

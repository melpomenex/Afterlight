## Context

The Orpheum's screen is a server-owned, room-shared system: a pure reducer (`shared/theaterModel.js`) validates every queue/control op, the server persists `{now, queue}` and broadcasts snapshots, and clients derive position from the shared clock. `classifySource()` accepts only `http(s)` URLs, so magnets are rejected today. Two precedents shape this design: the IPTV change moved fetching server-side ("the server does the fetching, not one player's browser", `server/iptv.js` + `shared/iptvModel.js` + `/api/theater/*` HTTP routes), and the theater already has a thin-manager pattern (`server/theater.js`) with pure rules living in `shared/`.

A browser cannot fetch a magnet at all: WebTorrent-in-the-browser reaches only WebRTC peers, which almost no public swarm speaks, and per-client downloads would desynchronize the room. So the torrent client must live on the game server.

## Goals / Non-Goals

**Goals:**
- Paste a magnet in the booth → resolve server-side → pick a file → the room watches it on the existing shared clock with unchanged play/pause/seek/skip/queue semantics.
- Keep every rule that tests can pin (magnet validation, file selection, limits, status shape) in a pure shared module.
- Bounded, disposable disk use; bill and playback survive restarts.

**Non-Goals:**
- No transcoding (an MKV/AVI-only torrent is pickable but flagged unlikely to play in a browser; no server-side re-encode).
- No `.torrent` file/URL upload (magnets only), no BitTorrent v2 (`btmh`) magnets in this pass.
- No per-player independent playback, no client-side seeding, no subtitle track extraction.
- No changes to the shared-clock math, cinema view, or seating.

## Decisions

### 1. Torrent client: `webtorrent` npm package on the server
Pure JS, maintained, exposes per-file streams (which we serve ourselves). Alternatives rejected: browser WebTorrent (swarm-invisible, breaks room sync); `torrent-stream` (unmaintained); shelling out to aria2/peerflix (external process to deploy and supervise). The manager wraps it so the rest of the code never touches the library.

The server imports `webtorrent` lazily and tolerates failure: if the module cannot load at boot (e.g. a broken install), the torrent WS routes answer with a clear "the projector's torrent engine is unavailable" error and the rest of the server runs untouched — mirroring how the IRC listener already degrades when its port is busy.

### 2. Canonical state: the magnet itself, not a server-local URL
A torrent bill item is `{ kind: 'torrent', url: <magnet>, infohash, fileIndex, filePath, fileBytes, title }`. Clients never see a `localhost` URL in shared state; the browser builds the stream URL locally from the item (infohash + fileIndex) plus the game-server HTTP origin. Rationale: the bill stays meaningful after restarts and the item self-describes for re-resolution. Alternative (server rewrites the item to a local `file` URL at play time) was rejected: it orphans items on restart and hides what is playing.

`classifySource()` gains a magnet branch: `magnet:` scheme, `xt=urn:btih:` with 40-char hex or 32-char base32 → `{ kind: 'torrent', url, infohash }`. Everything else about a magnet (trackers, display name) is opaque to the shared model. `normalizeTheaterState()` keeps torrent items by validating infohash shape and non-negative integer file fields, and drops them otherwise — old saves normalize cleanly, and an old server simply drops new-format torrent items through its existing unknown-classification path (forward/backward compatible both ways).

### 3. Pure rules in `shared/torrentModel.js`
Mirroring `iptvModel.js`: `parseMagnet()`/validation, `VIDEO_FILE_EXTENSIONS` + `isVideoFile()`, `orderFilesForPicker()` (playable-extension files first, size descending, capped list length), `normalizeTorrentStatus()`, `TORRENT_LIMITS` (resolve timeout, file-list cap, cache defaults), and `torrentErrorText()`. The theater reducer only learns: torrent items may carry the three file fields additively. Everything decision-like stays testable without a swarm.

### 4. Flow over the existing WS + reducer, two new messages
- `torrent_resolve` (C→S, theater-room-gated): `{ requestId, magnet }`. The server adds the torrent to its client (deselecting all files), waits for metadata up to the timeout, and answers only the requester with `torrent_files` (S→C): `{ requestId, name, infohash, files: [{ index, path, bytes, playable }] }`.
- The pick reuses the existing ops: Queue → `theater_queue {op:'add', url: magnet, fileIndex…}`, Play-now → `theater_channel`-style immediate start; both carry the torrent fields, which the reducer validates structurally (infohash shape, integer index). No new queue ops, so `playNow`/`skip`/`remove`/`ended` are untouched. Cancel/timeout touch no shared state.

An in-flight map keyed by `requestId` per connection keeps one resolve at a time and pairs replies correctly.

### 5. Serving: `GET /api/theater/torrent/:infohash/:fileIndex` with Range support
Path segments only — no filesystem paths in URLs. The handler lazily `client.add`s the magnet if the infohash isn't hot, resolves the file by index from that torrent's own file list (404 otherwise, video extensions only), parses `Range: bytes=…`, and answers 206 with `Content-Range`/`Accept-Ranges`, streaming via the webtorrent file stream API. Content-Type by extension. Same open CORS posture as the existing `/api/theater/*` routes (dev client on :5173 plays from :3001). The client derives the game-server HTTP origin with a helper in `src/net/client.js` mirroring `getDefaultUrl()`'s port logic (5173/4173 → 3001, otherwise same origin).

The client engine reuses `startFileEngine()` for `kind: 'torrent'` with the constructed stream URL and the existing no-`crossOrigin` posture — no new engine, YouTube/Vimeo/HLS paths untouched.

### 6. Status: periodic `torrent_state` broadcast, additive and ignorable
While a torrent item is live (or a resolve is in flight), the server broadcasts `torrent_state` to the theater room on a ~2 s cadence: `{ items: [{ infohash, progress, peers, downloaded, ready }] }`. The client folds it into the loading overlay's text and the booth's now-playing panel, and silently ignores stale/missing status (old-server compatibility). The cadence rides the existing 1 Hz server tick with a frame counter — no new timer loop.

### 7. Cache and lifecycle in `server/torrents.js`
Downloads go to `data/torrents/<infohash>/` (override with `TORRENT_CACHE_DIR`). Policy, all constants in `TORRENT_LIMITS`:
- **Idle reap**: torrents not referenced by the live bill (now or queue) are destroyed after ~10 min unused; a sweep runs on the existing 1 Hz tick.
- **Disk cap**: default 4 GB, env-tunable (`TORRENT_CACHE_MAX_BYTES`). When exceeded, evict least-recently-*served* inactive infohash directories (never the playing item's).
- **Startup sweep**: remove cache directories whose infohash is malformed or that were orphaned by a crash.
- Restart resilience falls out: the persisted bill holds the magnet, so any client touching the stream endpoint (or a re-resolve) re-adds the torrent, and webtorrent reuses the on-disk data.

### 8. Room gating and input safety
`torrent_resolve` gets the exact room guard the other theater messages have. Magnets arrive only via WS, are length-capped (`URL_MAX` already 2048), and are validated by the shared parser; trackers inside a magnet are inherent BitTorrent outbound traffic, and nothing from the magnet is ever echoed into a URL we serve. Served indexes must exist in that infohash's metadata and be video files.

## Risks / Trade-offs

- [npm install of `webtorrent` needs network authorization in this environment] → Precedent exists (earlier sessions); if unavailable at install time the task blocks explicitly rather than shipping half-wired. If the module fails at *runtime*, the boot guard degrades the feature with readable errors.
- [Swarm latency is unpredictable; some magnets never resolve] → 45 s timeout, retryable error, shared-state untouched until a pick; status UI keeps the wait legible.
- [Browser codec gaps (MKV/AVI are common in torrents but widely unplayable in `<video>`)] → The picker sorts likely-playable files first and marks others "may not play"; anything that does fail runs the existing failed→advance path.
- [Disk fill from large torrents] → Cap + LRU eviction + idle reap + startup sweep; the whole cache directory is disposable.
- [Operators may not want their server's IP in public swarms] → README note that the operator's connection carries what players paste; torrent engine can be disabled by env without affecting the rest of the theater.
- [Extra server bandwidth/CPU while seeding] → Idle reap stops seeding once the room moves on; upload can be capped via webtorrent's options if it proves measurable.

## Migration Plan

Additive-only. New module + manager + routes + message types; `classifySource` gains a branch; item fields are additive and normalize defensively. No save migration: `game-state.json`'s theater section flows through the existing normalizer, and a pre-change server drops post-change torrent items harmlessly (and vice versa). Rollback = revert; leftover `data/torrents/` is inert and deletable.

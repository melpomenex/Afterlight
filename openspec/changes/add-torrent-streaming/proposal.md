# Add Torrent Streaming (Magnet Links in The Orpheum)

## Why

The Orpheum's shared screen plays YouTube, Vimeo, direct video files, and HLS — but a large share of freely distributable video (Linux release media, public-domain and Creative Commons films, community mirrors) circulates as BitTorrent magnets, and pasting one today is rejected outright. A browser also cannot fetch a magnet on its own (it cannot reach ordinary swarms), so the fix must follow the theater's established pattern: the server does the fetching, the room shares one playback.

## What Changes

- **Paste a magnet link in the projector booth**: `magnet:?xt=urn:btih:…` is now an accepted source. The game server resolves the torrent's metadata (DHT + trackers via a `webtorrent` client) and returns its file list to the paster; nothing reaches the shared bill yet.
- **Pick-a-file gate**: the paster chooses which video file plays from a picker dialog (torrents often carry several episodes, samples, or extras). Only the pick enqueues/starts a `torrent` item on the shared screen; everyone watches the same file on the existing shared clock (play/pause/seek/skip unchanged).
- **Server-side streaming endpoint**: the chosen file is served by the game server at `GET /api/theater/torrent/<infohash>/<fileIndex>` with HTTP Range support, so the room-wide seek/pause math and the existing `<video>` engine work unchanged.
- **Swarm status while loading**: while a torrent item is live, the server periodically broadcasts connect/download progress (peers, percent); the overlay shows it in place of the generic loading state.
- **Restart-safe bill**: torrent items persist as canonical magnet + chosen file, so the bill survives server restarts; downloaded data is cached under `data/torrents/` (content-addressed by infohash) and re-served without re-downloading.
- **Bounded cache**: a size-capped (env-tunable, default ~4 GB), least-recently-used eviction policy keeps disk use finite; torrents no longer referenced by the bill are reaped after an idle TTL. The cache is disposable.
- **Same theater rules as every other source**: magnets are only accepted from players inside The Orpheum, anyone in the room may control playback, and only video files inside a torrent are streamable. The README gains a short note that the operator's connection carries whatever magnets players paste.

Depends on: `add-theater-district` and `add-shared-iptv-epg` (pending — builds on their `video-screen` engines, `TheaterManager` snapshot flow, and the `/api/theater/*` HTTP + thin-manager patterns; no requirement in those specs changes except as noted under Capabilities).

## Capabilities

### New Capabilities
- `torrent-streaming`: The server-side torrent engine as player-facing behavior — magnet resolution with metadata timeout, the file list offered to the paster, the Range-capable stream endpoint, swarm status reporting, and the disk cache's bounding/eviction/reap rules.

### Modified Capabilities
- `video-screen`: The shared screen accepts magnet links as a fourth source kind. Requirements added: the resolve-then-pick flow that gates a torrent before it reaches the shared bill, magnet-aware classification/normalization, and the loading state showing swarm progress. (Delta uses ADDED requirements; the capability's base spec is still pending in `add-theater-district`.)

## Impact

- **Shared**: `shared/protocol.js` — new `MSG_TYPES` (`TORRENT_RESOLVE` C→S, `TORRENT_FILES` S→C, `TORRENT_STATE` S→C) documented alongside the theater payloads. `shared/theaterModel.js` — `classifySource()` accepts magnet URIs (v1 `btih` hex/base32) returning `{ kind: 'torrent', infohash }`; torrent items carry additive file fields through `makeItem`/`startNow`/`normalizeTheaterState`; `KIND_LABELS` + error text. New `shared/torrentModel.js` — pure magnet validation, video-file detection/ordering for the picker, status normalization, error text (mirrors `iptvModel.js`).
- **Server**: new `server/torrents.js` `TorrentManager` wrapping `webtorrent` (lazy add, metadata wait with timeout, per-file streams, idle reap, LRU disk cap); new `GET /api/theater/torrent/:infohash/:fileIndex` endpoint on the existing HTTP server with Range parsing and the same CORS posture as the other `/api/theater/*` routes; room-gated WS handlers and the periodic `TORRENT_STATE` broadcast in `server/index.js`.
- **Client**: `src/ui/theaterScreen.js` — magnet acceptance in the add flow, resolve→picker dialog, torrent-aware loading/status line, stream URL construction; `src/net/client.js` — a derived game-server HTTP origin helper (mirrors the WS URL logic); `src/main.js` only where handlers register.
- **Dependencies**: one new npm dependency, `webtorrent` (server-side; no native build toolchain required — uTP is optional). Installing it needs the environment's authorized npm network access, as with earlier sessions.
- **Persistence**: new `data/torrents/` cache directory (disposable, safe to delete whole); `game-state.json` shape is unchanged — torrent bill items ride the existing theater section through the existing normalize path.
- **Tests**: new `tests/torrents.test.js` (magnet validation, file selection/ordering, item normalization, Range streaming against a fixture, eviction/reap rules) and `tests/theater.test.js` extensions for magnet classification and reducer fields.
- **Docs**: README (how to paste a magnet, the file picker, cache/limits, content responsibility note) and AGENTS.md's theater section (torrent engine architecture).

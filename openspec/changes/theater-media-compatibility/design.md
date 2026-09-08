# Design — Theater Media Compatibility

## Context

Theater playback is server-owned: `shared/theaterModel.js` classifies URLs, the reducer mutates `{now, queue}`, and Phoenix (when flipped) persists rows and broadcasts `theater_state`. Today `classifySource()` accepts only a narrow set of extensions (`mp4`, `webm`, …) and assigns them directly to `<video src>`. Torrent streaming already centralizes byte serving on the server with Range support; IPTV catalog fetch uses `Afterlight.Catalog.UrlFetch` for SSRF-hardened HTTP. No transcoding exists anywhere in the runtime.

## Goals / Non-Goals

**Goals:**
- Paste a remote MKV (and similar) → room sees one prepared HLS stream; play/pause/seek/join-in-progress behave like direct media.
- Cheapest valid transform: direct play before remux before partial transcode before full transcode.
- Progressive playback: expose the manifest once initial segments exist.
- One preparation per cache key; stale job completions cannot overwrite a newer bill item.
- SSRF-safe outbound fetch with redirect re-validation.

**Non-Goals:**
- Client-side ffmpeg.wasm transcoding.
- Subtitle extraction as a blocker (embedded subs must not fail the pipeline; WebVTT extraction is best-effort later).
- Replacing torrent or IPTV flows.
- Unrestricted anonymous HTTP proxy for arbitrary browsing.

## Decisions

### 1. Pure rules in `shared/mediaModel.js`
Probe planning, cache-key material, prepare-status constants, and error text live in a pure shared module (mirrors `torrentModel.js` / `iptvModel.js`). Elixir ports the same rules in `Afterlight.TheaterMedia.Compatibility` with parity fixtures.

### 2. Bill item fields (additive)
Items gain optional `sourceUrl`, `playbackUrl`, `prepareStatus`, `prepareId`, `prepareError`. `url` remains the user-facing source; clients play `playbackUrl` when `prepareStatus === 'ready'`. Postgres migration adds nullable columns; Node `game-state.json` carries the same keys through normalization.

### 3. Phoenix-owned preparation + HTTP
`Afterlight.TheaterMedia.Supervisor` hosts a `Coordinator` GenServer (concurrency cap, dedup by cache key) and `Task`-supervised ffmpeg workers. `ffprobe` runs with bounded analyze size; ffmpeg invoked via argv lists (no shell interpolation). Output lands in `data/theater-media/<prepareId>/` with atomic writes.

HLS profile: fragmented MP4 segments, 4 s target duration, `independent_segments` for seek. Manifest + segments served at `/api/theater/media/:prepareId/...` from a Phoenix plug (like playlists/epg), not proxied to Node.

### 4. Hook after theater commit
When `Theater.Gateway` applies `add` / `channel` / `playNow` and the resulting item has `prepareStatus: 'pending'`, it calls `Coordinator.ensure/3`. Completion patches the row via `TheaterMedia.Commit` (Ash system actor), bumps revision, and relies on the existing outbox relay — no client polling required (optional `theater_media_status` push for faster UI).

### 5. Classification expansion
`classifySource` accepts `.mkv`, `.avi`, and common video extensions; marks `needsPrepare: true` for non-browser-native containers. Extension hints classification; **ffprobe** decides the plan. Extensionless URLs may be accepted when Content-Type or probe identifies video.

### 6. Security
Reuse `UrlFetch` private-address blocking and redirect cap for probe input URLs. ffmpeg reads the validated URL directly with `-user_agent` and timeouts; no credential logging. Concurrent prepares capped (default 2); per-job wall-clock timeout; cache max bytes with LRU eviction.

### 7. Frontend playback abstraction
`TheaterScreenUI` resolves `playbackUrl` + engine kind (`direct` | `hls`) from bill fields. Preparation states map to overlay captions; HLS uses existing `attachHls` only when needed. Seeking on prepared HLS is allowed (reducer `seek_unsupported` guard removed for prepared HLS items).

### 8. ffmpeg availability
Boot-time capability check logs a warning; `needsPrepare` items fail with `engine_unavailable` when ffmpeg/ffprobe missing. Direct-play MP4/WebM unaffected.

## Risks / Trade-offs

- [CPU/disk abuse] → concurrency cap, cache cap, TTL, per-job timeout.
- [Remote hosts block server IP] → clear `unreachable` errors; no open proxy.
- [Long transcodes] → progressive HLS + preparation caption; user can skip/clear.
- [Elixir/JS parity drift] → shared fixtures + parity tests.

## Migration

Additive columns and JSON fields only. Old clients ignore new keys; normalization drops unknown prepare states safely.

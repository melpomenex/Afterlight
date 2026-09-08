# Theater Media Compatibility (MKV and Remote URLs)

## Why

The Orpheum accepts direct video URLs, but browsers cannot reliably play Matroska (`.mkv`) and many other containers through HTML5 `<video>`, even when the underlying codecs are decodable. Pasting `https://example.com/movie.mkv` is either rejected at classification time or handed to `<video src>` and fails silently. Shared watch-together playback needs a server-side compatibility pipeline that probes remote media once, prepares a browser-playable stream for the whole room, and preserves the existing shared timeline.

## What Changes

- **Accept more remote video URLs**: `.mkv`, `.avi`, and extensionless URLs that probe as video are accepted into the theater bill; the server decides direct-play vs prepare.
- **Server media pipeline (Phoenix)**: SSRF-hardened URL fetch, bounded `ffprobe` probing, compatibility planning (direct → remux → partial transcode → full transcode), progressive **HLS (fMP4)** output via supervised `ffmpeg`, disk cache with LRU/TTL, and job de-duplication so one preparation serves every occupant.
- **Canonical playback URL on the bill**: prepared items carry `sourceUrl`, `playbackUrl`, `prepareStatus`, and the effective `kind` (`file` or `hls`) so all clients render the same stream and the shared clock stays authoritative.
- **Theater UI**: loading captions (`Inspecting media…`, `Preparing video…`), automatic transition to playback when segments exist, HLS via native Safari or lazy `hls.js`, and distinct error copy for unreachable, blocked, and conversion failures.
- **HTTP serving**: `GET /api/theater/media/:prepareId/index.m3u8` and segment files from Phoenix (not proxied to Node).
- **Runtime dependency**: `ffmpeg` + `ffprobe` in deployment images; graceful degradation when unavailable (direct-play still works).
- **Tests**: pure model tests (JS + Elixir parity), SSRF/redirect tests, compatibility planning, cache dedup, race guards, and theater sync regressions.

## Capabilities

### New Capabilities
- `theater-media-compatibility`: Server-side media probe, compatibility planning, HLS preparation, cache, SSRF protections, and theater bill integration for non-browser-native remote video.

### Modified Capabilities
- `video-screen`: Direct file acceptance expands to containers requiring server preparation; loading states cover preparation; prepared items play through a resolved `playbackUrl` while `sourceUrl` remains the logical identity.

## Impact

- **Shared**: new `shared/mediaModel.js`; `shared/theaterModel.js` classification, item shape, normalization; `shared/protocol.js` optional `theater_media_status` push.
- **Phoenix**: `lib/afterlight/theater_media/*` supervisor tree, migration for prepare columns on `theater_items`, `TheaterCatalog` plug extension for media HTTP, gateway hook after theater commits, structured logs.
- **Client**: `src/ui/theaterScreen.js` resolved-source playback; `src/net/client.js` api base for media URLs.
- **Deploy**: `ffmpeg` in `deploy/Dockerfile.phoenix` (and dev docs); configurable concurrency/timeouts/cache caps.
- **Tests**: `tests/media-model.test.js`, `tests/theater.test.js` extensions, `server_elixir/test/afterlight/theater_media/*`.

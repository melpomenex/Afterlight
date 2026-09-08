# theater-media-compatibility Specification

## Purpose

Server-side media compatibility for The Orpheum: probe remote video, prepare browser-playable streams once per room, and serve them without breaking shared playback.

## ADDED Requirements

### Requirement: Remote container acceptance
The system SHALL accept http(s) direct video URLs whose path ends in `.mkv` or `.avi`, and SHALL NOT assign them directly to `<video src>` without server preparation. Classification MAY use extension hints; playback decisions SHALL use probe results when preparation runs.

#### Scenario: MKV URL accepted into the bill
- **WHEN** a player in The Orpheum submits `https://cdn.example/film.mkv`
- **THEN** the URL is accepted, the bill item records `prepareStatus: pending`, and no client attempts raw MKV playback

#### Scenario: MP4 remains direct
- **WHEN** a player submits a reachable `.mp4` URL that probes as browser-compatible
- **THEN** the item plays directly without server transformation

### Requirement: SSRF-safe probing
Outbound media fetch and probe SHALL allow only `http` and `https`, SHALL block private/link-local/metadata addresses (including after redirects), and SHALL cap redirects, timeouts, and probe bytes.

#### Scenario: Redirect to localhost blocked
- **WHEN** a public URL redirects to `http://127.0.0.1/video.mkv`
- **THEN** preparation fails with a user-safe error and the bill item moves to `prepareStatus: failed`

### Requirement: Compatibility planning order
The server SHALL choose the cheapest valid strategy in order: direct play, remux (stream copy to browser container), audio-only transcode, full transcode. Remux SHALL be preferred over re-encoding when codecs are browser-compatible.

#### Scenario: H.264+AAC MKV remuxes
- **WHEN** probe reports MKV with H.264 video and AAC audio
- **THEN** the plan selects remux (no video re-encode) and output is HLS fMP4

### Requirement: Progressive HLS output
Prepared media SHALL be exposed as HLS with fragmented MP4 segments so playback can begin before the entire file is processed, and seeking SHALL work across the prepared timeline.

#### Scenario: Playback starts while segments generate
- **WHEN** preparation is in progress and the first playlist segment exists
- **THEN** clients transition from `Preparing video…` to playback automatically

### Requirement: Shared canonical playback URL
All occupants SHALL receive the same `playbackUrl` on the theater bill once preparation is `ready`. Preparation SHALL run once per cache key; concurrent requests SHALL share the same job.

#### Scenario: Second viewer uses cache
- **WHEN** the same MKV URL is queued again after a successful prepare
- **THEN** no second ffmpeg job starts and the cached manifest is reused

### Requirement: Stale job guard
A preparation job SHALL NOT update the bill if the target item id was replaced, removed, or superseded while the job ran.

#### Scenario: Rapid media replacement
- **WHEN** item A starts preparing and item B replaces A before A completes
- **THEN** A's completion does not alter B's bill entry

### Requirement: Preparation UI states
The screen overlay SHALL distinguish inspecting, preparing, ready, and failed states with readable copy. Raw ffmpeg output SHALL NOT be shown to players.

#### Scenario: Failed conversion
- **WHEN** preparation fails after probe
- **THEN** viewers see a specific failure message and the item follows existing `failed` → advance behavior when appropriate

### Requirement: Resource limits
The server SHALL enforce configurable limits on concurrent preparations, probe timeout, job timeout, and cache size, and SHALL terminate orphan ffmpeg processes when jobs are cancelled.

#### Scenario: Concurrency cap
- **WHEN** more preparations are requested than the concurrency limit
- **THEN** additional jobs queue rather than spawning unbounded ffmpeg processes

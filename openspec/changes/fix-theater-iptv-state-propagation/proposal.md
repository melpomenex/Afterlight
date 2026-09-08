## Why

IPTV channel tuning in The Orpheum fails on the Phoenix stack: the guide and shared library load, channel logos render, but clicking a channel never starts HLS playback — DevTools shows no `.m3u8` request. Tracing proves two Elixir-migration regressions on the path from `theater_channel` to `hls.loadSource()`:

1. **`theater_channel` is rejected before commit.** `Afterlight.Theater.Gateway.dispatch_action/5` only accepts ops in `@queue_ops` / `@control_ops`; the IPTV flip maps to `op: "channel"`, which is absent from both lists, so every tune returns `invalid_action` with no bill change and no `theater_state`.
2. **Committed `theater_state` can be dropped client-side.** `shouldApplyRoomFrame()` treats a missing `epoch` as `0`. After a `presence_update` raises the room epoch, relay/join `theater_state` frames (which carry no `epoch`) compare `0 < newest` and are discarded before `TheaterScreenUI.applyState()` runs.

The async-only outbox relay (no synchronous reply, up to ~1 s delay) and silent `mark_published` when the room process is absent are secondary delivery weaknesses that this change also hardens.

## What Changes

- Accept `op: "channel"` on the Phoenix theater gateway and commit HLS IPTV flips like the Node path.
- Return committed authoritative `theater_state` to the initiating client on every successful theater mutation (not only `theater_import_result` on `addMany`).
- Flush the theater outbox synchronously after commit so other occupants receive the same state promptly.
- Fix outbox relay semantics: defer `mark_published` when no room process exists (retry on next tick); distinguish delivered vs absent-room in telemetry.
- Fix client epoch filtering: frames without an `epoch` field skip epoch comparison (room tag still applies).
- Add regression tests (Elixir domain/channel, JS client HLS path, WS smoke `theater_channel`) and a browser validation checklist extension.
- Record evidence under this change.

## Capabilities

### New Capabilities

- `theater-state-delivery`: Authoritative theater bill state SHALL reach the initiating client promptly after a successful mutation, and other theater occupants SHALL receive the same committed state; join snapshots remain the reconnect contract.

### Modified Capabilities

- `video-screen`: Add IPTV/HLS acceptance scenarios for `theater_channel` tuning, second-client sync, reconnect snapshot, and duplicate-delivery idempotency.

## Impact

- `server_elixir/lib/afterlight/theater/gateway.ex`, `outbox_relay.ex`
- `src/net/roomEpoch.js`
- Tests: `server_elixir/test/afterlight/theater/gateway_test.exs`, `server_elixir/test/afterlight_web/game_channel_iptv_test.exs`, `tests/theater-hls-state.test.js`, `tests/net/room-epoch.test.js`, `scripts/theater-streaming-smoke.mjs`
- No client optimistic playback; server-authoritative model preserved.

## Non-Goals

- IPTV catalog boot/migration (`fix-iptv-playback-elixir` covers dev migrate + catalog import).
- HLS provider CORS, codec, or segment failures after `loadSource()` begins.
- Bill rule or queue-cap changes.

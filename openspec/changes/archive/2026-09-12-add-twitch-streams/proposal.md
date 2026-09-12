## Why

The Orpheum can pin YouTube, Vimeo, direct files, HLS, and torrents, but pasting a Twitch link — where a large share of live communal viewing happens — is rejected as unsupported. Twitch's official embeds make live channels, VODs, and clips shareable, so the projector should accept them without inventing a second playback stack.

## What Changes

- Twitch share links are accepted in the booth: `twitch.tv/<channel>` (also `www`/`m`), `twitch.tv/videos/<id>`, `clips.twitch.tv/<slug>`, and `twitch.tv/<channel>/clip/<slug>`. Other Twitch pages (directory, settings, `player.twitch.tv` embed URLs) stay rejected with a readable message.
- **Live channels play as live**: loaded through Twitch's official interactive player, attached at the live edge (no shared-position seek; `seek_unsupported`), joiners attach within a few seconds, a stream that ends advances the bill, and a channel that goes offline keeps its place with the player's offline state visible — never a false room-wide failure.
- **VODs play on the shared clock**: seekable, join at the room's position, `ended` advances the bill, drift corrected like other seekable kinds.
- **Clips play as short inserts** through Twitch's non-interactive clip embed. That player exposes no programmatic control, so room pause/seek do not apply to clips; a bounded guard (Twitch's 60-second clip maximum plus margin) advances the bill so a clip can never wedge the screen, and the booth labels the limitation.
- Embeds use only Twitch's official players with a `parent` value derived from the serving hostname, so `localhost` dev, the Vercel frontend, and the Tailscale host all work. No arbitrary page is ever embedded.
- Both reducers — the JS model and the authoritative Elixir port — recognize Twitch links and carry a Twitch type/id through items, normalization, and persistence; the shared seek policy and default titles stay in parity.
- Blocked unmuted autoplay shows the existing start-gesture affordance; an embed whose API never becomes ready retries once, then stays a local problem instead of a room-wide failure report.
- README and the theater architecture notes gain the new source and its live/clip caveats.

## Capabilities

### New Capabilities

- `twitch-streaming`: Recognition of Twitch channel/VOD/clip links and extraction of their identifiers, official-embed playback with a host-derived `parent`, the live/VOD/clip shared-clock semantics (including the non-interactive clip limitation and its advance guard), and honest handling of blocked autoplay, offline channels, and embed-ready failures.

### Modified Capabilities

- `video-screen`: "Every supported source kind plays from a connected client" — Twitch channel, VOD, and clip links join the supported source kinds that must play end to end, with live and clip transport caveats governed by the `twitch-streaming` capability.

## Impact

- `shared/theaterModel.js` — Twitch host/path classification (reserved-path rejection, channel/VOD/clip extraction), Twitch item fields (`twitchType`/`twitchId`) through `makeItem`/`startNow`/`normalizeTheaterState`, default titles and error text, `KIND_LABELS`, and a shared seekability rule for live items (current ad-hoc `kind === 'hls'` checks).
- `server_elixir/lib/afterlight/theater/reducer.ex` (and `errors.ex`) — the 1:1 mirror of classification, item fields, seek policy, and titles; parity cases added in `scripts/parity/theater.mjs` and the committed `tests/fixtures/parity/theater-model.json` regenerated with `scripts/export-parity-fixtures.mjs`.
- `src/ui/theaterScreen.js` — a Twitch engine (lazy load of `player.twitch.tv/js/embed/v1.js`, interactive `Twitch.Player` for channels/VODs, non-interactive `clips.twitch.tv/embed` iframe for clips), booth recognition/help copy, overlay/gesture plumbing; `src/ui/theaterPlaybackState.js` gets the Twitch state mapping and failure-taxonomy branch.
- Tests — `tests/theater.test.js` (classification, item normalization, seek policy), `tests/theater-playback-state.test.js` (Twitch supervision/failure taxonomy, clip guard), `tests/theater-ui.test.js` as needed, plus parity tests.
- README (accepted links, live/clip behavior) and `AGENTS.md`'s theater section.
- No new npm dependencies, no server fetch/resolve step, no save-schema or persistence-shape change: Twitch items are ordinary bill entries already covered by normalization.

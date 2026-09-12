## 1. Shared model (JS) and parity fixture

- [x] 1.1 Add Twitch classification to `classifySource` in `shared/theaterModel.js`: `twitch.tv`/`www`/`m` channel and `/videos/<id>` paths, `clips.twitch.tv/<slug>` and `/<channel>/clip/<slug>` clips, reserved-path rejection, returning `{ kind: 'twitch', url, twitchType, twitchId }`; verify with new cases in `tests/theater.test.js` covering each accepted form, non-content Twitch pages (`/directory`, `player.twitch.tv`, settings), and unrelated URLs.
- [x] 1.2 Carry `twitchType`/`twitchId` through `makeItem`, `startNow`, the `playNow` requeue copy, and `normalizeTheaterState`; add `KIND_LABELS.twitch`, `defaultTitle('twitch')`, and the updated unsupported-link text; verify a classify → item → normalize round-trip test keeps the Twitch type/id and survives malformed fields.
- [x] 1.3 Add a shared `isSeekSupported(item)` helper (false for live HLS without `playbackUrl`, Twitch channels, and Twitch clips) and use it in the reducer's `seek` op; verify reducer tests return `seek_unsupported` for a Twitch channel and clip while a Twitch VOD seek succeeds.
- [x] 1.4 Add a `buildTwitchEmbedUrl(type, id, parent)` helper that builds the channel, VOD (`v`-prefixed), and clip iframe URLs; verify tests pin exact URL shapes and hostname-only parent values.

## 2. Elixir reducer parity

- [x] 2.1 Mirror Twitch classification, item fields, seek policy, default title, and error text in `server_elixir/lib/afterlight/theater/reducer.ex` and `errors.ex`; verify via `mix test` in `server_elixir` for the theater reducer/domain suites.
- [x] 2.2 Add Twitch parity cases to `scripts/parity/theater.mjs`, regenerate `tests/fixtures/parity/theater-model.json` with `node scripts/export-parity-fixtures.mjs`, and confirm `tests/parity-fixtures.test.js` passes with a fixture diff limited to the new Twitch cases.
- [x] 2.3 Run the Elixir parity suite (`mix test test/afterlight/parity_test.exs`) and confirm every Twitch case reproduces the JS results, including `seek_unsupported` and normalization fields.

## 3. Client playback supervision

- [x] 3.1 Add the Twitch branch to `isSourceFatalFailure` in `src/ui/theaterPlaybackState.js` (all current evidence local, never a room-wide failure) and a Twitch engine-state mapping contract; verify with new unit cases in `tests/theater-playback-state.test.js`.
- [x] 3.2 Add the pure clip-guard decision (advance when a Twitch clip's shared elapsed time reaches `TWITCH_CLIP_GUARD_SEC`, default 75 s; false for non-clips and once already reported); verify unit tests for before/at the guard, non-clip kinds, and idempotence against the existing once-per-item reporting guard.
- [x] 3.3 Extend `resolvedPlayback`/engine-selection tests so a `kind: 'twitch'` item routes to the Twitch engine and never to the direct-video path; verify in `tests/theater-ui.test.js` (or the closest existing engine-selection suite).

## 4. Client engine and booth

- [x] 4.1 Implement `startTwitchEngine(item, token)` in `src/ui/theaterScreen.js`: lazy-load `https://player.twitch.tv/js/embed/v1.js`, build the interactive `Twitch.Player` for channels/VODs (host-derived `parent`, autoplay, muted per effective volume, VOD seek to shared position, `getTime`/`getState`/`play`/`pause`/`setVolume`), wire `READY`/`PLAYING`/`PLAY`/`PAUSE`/`ENDED`/`OFFLINE`/`ONLINE`/`PLAYBACK_BLOCKED`, fall back to the non-interactive iframe when the SDK fails, and use the clip embed for clips; verify with focused DOM-level tests where the existing suite fakes SDKs plus the browser task 4.3.
- [x] 4.2 Add the READY-timeout retry (rebuild once via `shouldRetryPlayerReady`, then `localPlaybackProblem`), live `OFFLINE` handling (stay on the bill, show offline), and gesture recovery for `PLAYBACK_BLOCKED`; verify by driving the engine fake through each branch in unit tests.
- [x] 4.3 Present Twitch-specific booth behavior: clip items marked not-synchronized with skip prominent and no pause/seek enforcement, live channels' transport limited to play/pause/skip, and a link hint naming Twitch; verify with the existing booth UI tests and a DOM assertion pass.
- [x] 4.4 Browser-verify in the running app: paste a live channel, a VOD, and a clip; confirm each plays on the in-world screen and in cinema view, a second tab sees the same live item and VOD position, seeking a live channel is refused, a VOD seek/advance works for the room, a clip advances at the guard (and earlier on skip), blocked autoplay shows the start affordance, and no room-wide failure is reported for an offline channel.

## 5. Docs, build, and end-to-end verification

- [x] 5.1 Update `README.md` (accepted Twitch link forms and the live/VOD/clip caveats, including clips not being synchronized) and the theater section of `AGENTS.md`; verify the copy matches the shipped behavior.
- [x] 5.2 Run `npm test` and `npm run build`; resolve any Twitch-related failures and confirm the known chunk-size warning is the only build warning.
- [x] 5.3 Run the end-to-end theater smoke per `AGENTS.md` §10: queue each Twitch type, travel away and return, reload and confirm the bill and queue persist correctly (including a live channel and a clip), and confirm YouTube/Vimeo/file/HLS/magnet playback is unregressed.

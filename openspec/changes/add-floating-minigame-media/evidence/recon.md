# Floating media — baseline recon (task 1.1)

Date: 2026-09-12. Worktree at `40e7c2c` + dirty Twitch/media work.

## Uncommitted work that must be preserved

`git status` before implementation:

- Modified: `openspec/specs/video-screen/spec.md`, `scripts/parity/theater.mjs`,
  `server_elixir/lib/afterlight/theater/{errors,reducer}.ex`, `shared/theaterModel.js`,
  `src/ui/theaterPlaybackState.js`, `src/ui/theaterScreen.js`, parity fixtures,
  `tests/{media-model,theater-playback-state,theater}.test.js`.
- Untracked: `openspec/specs/twitch-streaming/`,
  `openspec/changes/archive/2026-09-12-add-twitch-streams/`,
  `tests/theater-twitch.test.js`.

This is the completed-but-uncommitted Twitch streaming change. Floating media
must build on it, never revert it.

## Provider support matrix (current tree)

| Provider | Adapter | Automatic audio control | Classification |
| --- | --- | --- | --- |
| Direct file / HLS / granted torrent | shared `<video>` engine | `setVolume`, `muted` | controlled |
| YouTube | IFrame API (`applyVolume` = `setVolume` + `mute`/`unMute`) | yes after `onReady` | controlled |
| Vimeo | player SDK | yes after ready | controlled |
| Twitch channel / VOD | interactive Player SDK (`applyVolume`) | yes after `READY` | controlled |
| Twitch clip / SDK-fallback iframe | non-interactive embed | no — `degraded: true`, `setVolume` no-op | degraded (documented native-control exception) |

`startTwitchIframeEngine` sets `engine.degraded = true; engine.ready = true` and
has no volume API. `startFileEngine` writes `video.muted = effectiveVolume() <= 0`.

## Integration references verified to resolve

- `TheaterScreenUI` (`src/ui/theaterScreen.js:464`) constructed once in
  `src/main.js:338`; never rebuilt. Owns `engine`, `loadedItemId`,
  `loadedPlayKey`, `loadToken`, `state`, `updateScreenQuad`, `setWatchMode`,
  `setMasterSound`, `setMixGain`, `setSeated`, `setRoomActive`.
- `createTheaterAdapter({ ui })` (`src/places/theaterAdapter.js:34`) drives
  `setRoomActive`/`setWatchMode`; room deactivation intentionally tears the
  engine down (authorization boundary — floating must end with it).
- `updateScreenQuad(quad | null, worldAspect)` called every frame from
  `src/main.js:2064`/`2066`; also owns the `tickDriftCheck` supervision tick.
- `createActivityRuntime` (`src/activities/runtime.js:20`) with the
  `beginParticipationFor(item)` hook (`:319`); interaction route calls it from
  `src/main.js:1306`.
- `createParticipationController` (`src/activities/participation.js:149`) state
  machine + `onStateChange` callback (currently unused by `main.js`).
- `registerActivityModule`/`getActivityModule` (`src/activities/registry.js`).
- Kart (`src/activities/kart-royale.js:443`), Summit (`snowboard.js:394`) and
  Downhill (`downhill-mayhem.js:540`) expose `beginParticipation`; controllers
  have attempt/token cancellation fences (`kart-royale/controller.js`,
  `snowboard/controller.js`, `downhill/controller.js`).
- `src/activities/inputSeam.js` exports `resolveEscapeAction`, `isTypingTarget`,
  `createActivityInputManager`; no media-UI guard exists yet.
- Frame loop: `src/main.js:1784` `frame(now)` is the single rAF; it calls
  `updateScreenQuad` and `activityRuntime.update`.

## Signature changes in the pending Twitch diff (additive, none breaking)

- `shared/theaterModel.js`: `+ isSeekSupported(item)`, `+ buildTwitchEmbedUrl(...)`;
  classifiers now return `kind: 'twitch'` with `twitchType`/`twitchId`.
- `src/ui/theaterPlaybackState.js`: `+ TWITCH_CLIP_GUARD_SEC`, `+ twitchEngineState`,
  `+ shouldAdvanceTwitchClip`; `isSourceFatalFailure` returns false for Twitch.
- `src/ui/theaterScreen.js`: additive `tickClipGuard`, `startTwitchIframeEngine`,
  `twitchOffline`, `twitchRetryItemId`; `applyEffectiveVolume` and
  `effectiveVolume` semantics unchanged.
- Implication for floating: activity mute must enter `effectiveVolume()` so
  every existing re-application path (provider ready, mix duck, master toggle)
  inherits it without changing engine ownership.

## Browser-gate environment facts

- `chromedriver` is `/usr/bin/chromedriver` (not the snap path the older gates
  hard-code as `/snap/bin/chromium.chromedriver`); the new gate resolves it from
  `GATE_CHROMEDRIVER` → snap → PATH. Chromium is `/usr/bin/chromium`.
- Committed deterministic media fixture exists: `tests/fixtures/torrent-gate/clip_a.webm`
  and `clip_b.webm` (tiny, ~30 KB). `ffmpeg`/`ffprobe` are installed, so the new
  gate can generate an MP4/HLS fixture at runtime when a `.mp4`/`.m3u8` is needed.
- No dev servers were running at recon time.

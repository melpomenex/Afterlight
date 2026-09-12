# Verification summary — add-floating-minigame-media (tasks 6.1–6.6)

Environment: local `npm run dev:stack` (Node sidecar :3001, Phoenix :4000, Vite
:5173), headless Chromium 152 via chromedriver, Linux. Deterministic fixture:
ffmpeg-generated `testsrc2` MP4 (320×180, 120 s, AAC) served from a local HTTP
server by `scripts/floating-media-gate-browser.mjs`; the bill is driven through
the real gateway with a room probe.

## Browser gate phases (run separately; each exits 0)

| Phase | Checks | Result | Covers |
| --- | --- | --- | --- |
| `baseline` | 24/24 | pass | engine/node/contentWindow identity, same-item snapshot, cinema toggle, null-quad floating, hidden drift tick, no theater actions, stable-node across enter/hide/expand/exit |
| `ui` | 27/27 | pass | chrome labels/pressed states/tab order/announcements, real drag + pointercancel cleanup, keyboard nudge, reservation steering, native-dialog stacking, empty bill, Space-on-control unmute, no walk on media click, Back to game focus |
| `lock` | 7/7 | pass | explicit-gesture acquire, lock retained across automatic presentation changes, unlock gesture does not exit the game, no automatic reacquire, explicit reacquire |
| `flow` | 15/15 | pass | Pool entry with media → muted floating → timeline continues → explicit unmute → exit restores primary/audio → second cycle re-mutes and restores → zero engine start/teardown → cold-loading Kart floats then Esc cancels cleanly (AC1–AC7, AC11–AC13) |
| `perf` | 7/7 | pass | matched 5 s frame runs primary vs floating: median +0.0 %, p95 +0.6 %; 20 enter/exit cycles: 1 media node, 2 chrome roots (chrome + restore chip), no engine events, DOM nodes 459 → 459, heap decreased (AC18) |
| `sources` | 8/8 | pass | source replacement follows in one pipeline for both occupants, hidden PiP retains state and plays across a change, local ops emit no theater frames and leave the second client untouched (AC14, AC15, AC17) |
| `rollback` | 5/5 | pass | `?floating-media=off` disables acquisition; the game still plays; primary mode and the same engine/audio are retained (6.6) |

Node suite: `npm test` → 1498 passing, 0 failing. Build: `npm run build`
succeeds (the pre-existing >500 kB chunk warning only; the wasm step required
`rustup target add wasm32-unknown-unknown`, installed locally).

## Not executed in this environment (honest gaps)

- **Granted-torrent floating playback**: the floating layer treats a torrent
  exactly like any other direct `<video>` engine and the torrent grant/report
  tests pass, but the real seeded-torrent + floating combination was not run
  here. The committed `scripts/torrent-playback-gate-browser.mjs` covers the
  underlying torrent session separately.
- **Twitch offline / live channel during a game (AC3/AC4 exception path)**:
  requires the live Twitch player and network; `tests/theater-twitch.test.js`
  covers the offline/clip/degraded branches and `tests/theater-media-audio.test.js`
  covers the native-control exception, but a real Twitch floating session was
  not executed.
- **Autoplay-blocked recovery inside a floating surface**: the gesture badge is
  unit-tested and present in the DOM during the gate (checked in `ui`), but the
  gate runs with `--autoplay-policy=no-user-gesture-required`, so the blocked
  path was not reproduced in-browser.
- **Task 6.3 manual matrix** (touch rotation, virtual keyboard, controller
  gamepad neutralization with a real pad, headed visual screenshots for Pool's
  900-z HUD, Kart pause/results, Summit/Downhill menus, native provider
  fullscreen): only the desktop headless subsets were exercised. Controller
  gamepad neutralization is implemented (`mediaUiHasFocus()` gates the Pool /
  air-hockey / foosball polling) and unit-tested at the helper level, not with
  physical hardware.
- **Real-provider embeds (YouTube/Vimeo/Twitch) inside the floating player**:
  controlled-adapter volume/ack paths are covered by fake-adapter tests; no
  external embed was floated in this environment.

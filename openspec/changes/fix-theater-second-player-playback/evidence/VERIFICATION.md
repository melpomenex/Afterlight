# Verification — fix-theater-second-player-playback

## What was implemented

- **Supervision** (`src/ui/theaterPlaybackState.js`, wired in `src/ui/theaterScreen.js`):
  one pure state machine decides seek/play/pause/needs-gesture from the bill's
  `playing`, a normalized engine state, the shared target, and progress
  bookkeeping; the ~2 s drift tick feeds it. A player that never started
  (unstarted/cued) and a player that started then stopped (paused without
  progress) both surface the **▶ Tap to start** control after the stall window;
  gesture recovery seeks to the corrected shared position and plays.
- **Failure isolation** (`isSourceFatalFailure`): only source-level evidence
  (`<video>`/HLS fatal errors, YouTube 100/101/150, Vimeo
  NotFound/Privacy/Password) reports the item `failed`. Autoplay blocks,
  ambiguous player errors, and a missing player API are local: no report, the
  shared bill stays authoritative.
- **Booth rejections** (server + client): theater action errors are tagged with
  additive `op` and `requestId`; the booth status line surfaces tagged errors
  even when no resolve is pending, and a new action clears a stale error.
- **Diagnostics**: a bounded client ring behind `?debug=1`
  (`window.__afterlight.theaterPlayback()`), plus one gateway log line per
  refused action (corr/op/receipt/reason, no payloads or tokens).

## Verification performed

| Check | Command / run | Result |
| --- | --- | --- |
| JS suite | `npm test` | 1292/1292 pass |
| Production build | `npm run build` | pass (known chunk-size warning only) |
| Elixir gateway tests | `mix test test/afterlight/theater/gateway_test.exs` | 4/4 pass (tagged rejections asserted) |
| Two-client gate, local (fixed) | `node scripts/theater-playback-gate-browser.mjs` | A and B both reach playing; no reports |
| Two-client gate, local headed strict + sound | `xvfb-run … GATE_AUTOPLAY_STRICT=1 GATE_SOUND=on` | A and B both reach playing |
| Booth rejection on dev stack | `booth-error-check` browser run | `is-error` status shows the readable reason |
| `?debug=1` gating | `debug-accessor-check` browser run | no accessor without the flag; ring empty, then `engine-start` + `sync` |
| Streaming smoke | `node scripts/theater-streaming-smoke.mjs` | 15/15 (fixed a pre-existing assertion bug that never passed) |
| Cutover soak | `npm run verify:theater` | PASS |

Evidence files: `evidence/` (`SUMMARY.md`, gate JSON/MD captures from
`scripts/theater-playback-gate-browser.mjs`).

## Honest limitations

- The production "briefly plays then stops" stall (unmuted autoplay blocked by
  a real browser) was **not reproduced in automation**: with sound off media is
  muted and autoplay succeeds, and in the headed runs turning sound on required
  a real gesture that also satisfies autoplay. The supervision and isolation
  fixes are unit-verified, but the exact production trigger still needs the
  two-real-client pass.
- The **deployed stack still runs the pre-fix build**: no deployment was
  performed in this change. The deployed half of task 6.2 and the manual
  production pass (6.3) therefore remain open, and no production-fixed claim is
  made.

## 1. Reproduce and capture the deployed failure

- [x] 1.1 Add a two-client browser gate script (chromedriver pattern from `scripts/*-gate-browser.mjs`) that opens two isolated sessions against a configurable origin, has one client start a YouTube item through the booth, and records per-second theater state, console diagnostics, received `theater_state` item ids, and any report frames
- [x] 1.2 Run the gate against the deployed URL with autoplay policy enforced where possible (headed under Xvfb with `--autoplay-policy=document-user-activation-required`, sound on) and save the captured evidence under the change directory
- [x] 1.3 Record honestly whether the failure reproduced: which client stalled, its engine state sequence, whether any `failed`/`ended` report was sent, and whether the bill advanced; if automation cannot trigger the block, capture the same fields from two real production browsers and note the limitation

## 2. Playback supervision state machine

- [x] 2.1 Add a pure `src/ui/theaterPlaybackState.js` exporting `nextPlaybackAction(input)` returning `none | seek | play | pause | needs-gesture`, with a minimum stall window and progress-based healthy detection
- [x] 2.2 Normalize engine state in `src/ui/theaterScreen.js`: direct/HLS `<video>` (paused/readyState/currentTime), YouTube player state (unstarted/cued/buffering/playing/paused/ended), Vimeo events — and feed the machine from the ~2 s drift tick with `wantPlaying`, position, target, and last-progress time
- [x] 2.3 Apply the returned action: seek/play/pause as before; on `needs-gesture` show the start badge and stop issuing gesture-less `play()` calls; the badge handler seeks to the corrected shared position, plays, and clears the state once progress is observed
- [x] 2.4 Clear supervision timers and badge state on engine teardown, item change, room exit, and travel so no stale affordance survives
- [x] 2.5 Add `tests/theater-playback-state.test.js` covering healthy playback, never-started (cued/unstarted), starts-then-stops, stalled buffer with progress, ended, and error inputs; run with `npm test`

## 3. Failure isolation (source-fatal vs client-local)

- [x] 3.1 Add an explicit source-fatal predicate per engine (direct/HLS fatal error events; YouTube error codes 100/101/150; Vimeo SDK error) and route `failItem()`/`sendItemReport('failed')` through it
- [x] 3.2 Ensure blocked autoplay, unstarted/paused stalls, buffering, and ambiguous player errors never send `ended`/`failed`; the client keeps showing the shared item with a local readable state
- [x] 3.3 Keep the server's item-id + generation guard unchanged and add tests pinning both directions: a client-local block produces no report and no bill advance; a genuine source failure still advances exactly once
- [x] 3.4 Add a brief comment documenting the failure taxonomy at the predicate

## 4. Booth rejection surfacing

- [x] 4.1 Server: include additive `op` and `requestId` (the already-minted receipt id) on theater action error replies in `server_elixir/lib/afterlight/theater/gateway.ex`, leaving untagged errors unchanged
- [x] 4.2 Client: surface tagged theater errors in the booth status line even when no playlist/torrent resolve is pending, keep ignoring untagged errors, and clear the status on a successful action
- [x] 4.3 Add an Elixir test for the tagged rejection shape and a JS test for tagged-vs-untagged client handling
- [x] 4.4 Verify against the dev stack that a rejected add/play-now shows the readable reason in the booth

## 5. Diagnostics

- [x] 5.1 Add a bounded client playback-event ring (item id, engine kind/state, action, report, timestamp) exposed read-only only when `?debug=1` is present
- [x] 5.2 Log theater action rejections on the gateway with correlation id, op, receipt id, and reason — never tokens or secrets
- [x] 5.3 Confirm no always-on logging or persistence was introduced and the debug accessor is absent without `?debug=1`

## 6. Verification

- [x] 6.1 Run `npm test` and `npm run build`; resolve relevant failures
- [ ] 6.2 Run the two-client browser gate against the local dev stack and against the deployed URL: B starts, A follows; a blocked A shows the start control and recovers on tap; the shared bill is unchanged by A's block
  - Local (fixed build) passes: A and B both reach playing with no reports (`evidence/2026-09-10T15-17-32-000Z-local-fixed.json`). The deployed half requires a deploy of this change; the deployed URL currently runs the pre-fix build (baseline captures in `evidence/`).
- [ ] 6.3 Manual production pass with two real clients: one starts YouTube, the other (sound on) follows; both queue and play-now paths work; recover from the start affordance when the browser blocks; record the result
  - Cannot be performed without deploying; explicitly not claimed. See `evidence/VERIFICATION.md` limitations.
- [x] 6.4 Re-run existing theater coverage for regressions (`tests/theater-*.test.js`, `scripts/theater-streaming-smoke.mjs`, `npm run verify:theater`)
  - Streaming smoke 15/15 (also fixed its pre-existing `waitFor` assertion that could never pass); `verify:theater` PASS; all theater JS tests pass.
- [x] 6.5 Update `README.md` if player-facing controls or copy changed, and record evidence paths plus an honest verification statement under the change

## 7. Production YouTube handshake failure (from apply evidence)

- [x] 7.1 Add a bounded YouTube player-readiness rebuild (one per item, `YT_READY_TIMEOUT_MS`) and a pure `shouldRetryPlayerReady` bound; a second failure stays local with no room-wide report
- [x] 7.2 Unit-test the retry bound in `tests/theater-playback-state.test.js`
- [ ] 7.3 Re-run the two-client gate locally and the full suite to confirm no regression

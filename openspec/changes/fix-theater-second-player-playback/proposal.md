## Why

On the deployed stack, shared screen playback fails once more than one person is involved: a player who is not the one who first started an item pastes a link in the projection booth and presses play (or queues it), and the video briefly plays, then stops and never plays again — reported for YouTube and for other source kinds, and reported as broken "for anyone" once it happens. The same flow works on the local dev stack, so the failure is environment-dependent (real HTTPS origin, deployed gateway/funnel, real browsers) and cannot be dismissed as a missing capability.

The 2026-09-08 IPTV delivery change (`fix-theater-iptv-state-propagation`) fixed the commit/broadcast path for `theater_channel`; a fresh two-client WebSocket probe against both the local stack and the deployed gateway confirms the shared bill itself now commits and broadcasts correctly from a second occupant (same item id to both clients). What remains unverified and unfixed is the **client playback and failure-reporting path**: a client whose browser refuses or stalls autoplay (production origins enforce autoplay policy; localhost testing does not) has only a partial detection/recovery affordance for YouTube, and any client's engine error currently reports a room-wide `failed` that advances the bill for everyone — which matches "briefly plays then stops and never plays".

Because the failure has not been reliably reproduced in automated probing, this change starts with a captured production reproduction and instrumentation, fixes the mechanism(s) it proves, and locks the behavior with tests. It does not guess-fix and declare victory.

## What Changes

- Reproduce the deployed failure with two real browser clients against the production URL, capturing `theater_state` frames, engine state transitions, console diagnostics, report timings, and gateway logs as change evidence.
- Make playback supervision start the item independently of who queued it: detect every "the bill says playing but this client is not playing" state — unstarted, cued, paused-after-brief-play, stalled buffering — show a working one-tap start affordance, and stop issuing gesture-less `play()` calls that cannot succeed.
- Make client-local playback blocks (autoplay policy, embed refusal, transient engine hiccup) local: they MUST NOT report `failed`/`ended` and MUST NOT advance or stop the room's item. Only a genuine source failure ends the shared item, and the failure is named and attributed.
- Surface theater op rejections to the acting player in the booth instead of dropping the server's `error` frame when no playlist/torrent resolve is pending; correlate the rejection with the action that caused it (additive wire fields).
- Add bounded production diagnostics behind the existing `?debug=1` seam and gateway logging so the next occurrence reports item id, revision, engine state, and report events instead of "nothing happened".
- Add a two-client verification gate that exercises a real origin with autoplay policy enforced, plus unit tests for the engine-supervision state machine and failure isolation.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `video-screen`: Playback must start (or offer a working one-tap start) for every occupant in the room, not only the client that queued the item; a client-local playback block must not advance or stop the shared bill; booth actions that the server rejects must surface a readable error instead of failing silently.

## Impact

- Client: `src/ui/theaterScreen.js` (engine supervision, gesture recovery, failure reporting, booth error surfacing, diagnostics).
- Possibly shared: `shared/mediaModel.js` only if a helper is needed to distinguish blocked/stalled from failed; no reducer or bill-rule changes.
- Server: additive action correlation on theater error replies and logging (`server_elixir/lib/afterlight/theater/gateway.ex`, `server_elixir/lib/afterlight_web/game_channel.ex`); no schema change, no data migration, no ownership flips.
- Tests: `tests/theater-ui.test.js` (or a new focused test file) for the supervision state machine and report isolation; Elixir tests for the correlated error reply; a browser gate script for the two-client production/deployed-origin pass.
- Docs: `README.md` if player-facing behavior (tap-to-start, error messages) changes; evidence recorded under this change.
- Non-goals: YouTube/Vimeo provider policy, codec support, the IPTV catalog boot/import path (`fix-iptv-playback-elixir`), and the unfinished gardens/economy migration (P6).

## Context

See `proposal.md` — Why. Current state that shapes the approach:

- `src/ui/theaterScreen.js` owns one playback engine at a time. `applyState()` loads an engine when the live item's play key changes and otherwise calls `enforceSync()` (every ~2 s), which calls `engine.play()` whenever the bill says playing.
- YouTube blocked-autoplay handling is a one-shot watchdog inside `onReady`: after 3 s it checks states `UNSTARTED (-1)` / `CUED (5)` and shows the "Tap to start" badge. A player that starts and then is paused/stalled by policy (state 2/3) is never detected; `controls: 0` hides YouTube's own play button, and `enforceSync()`'s gesture-less `play()` calls cannot unblock it.
- Failure reporting is room-wide: `failItem()` (YouTube `onError`, HLS fatal, `<video>` error) tears down the engine and sends `failed`; the reducer advances the shared bill when the item id matches. The session generation guard (`server_elixir/lib/afterlight/theater.ex` `guard_generation`) only rejects reports from sessions that were already stamped, so a fresh second occupant's first report is accepted.
- Server rejections of booth actions are dropped by the client unless a playlist or torrent resolve is pending (`applyServerErrorMessage`); theater action errors are untagged (`{"message": ...}`), so they cannot be attributed even if surfaced.
- Planning probes (two-client WebSocket, local and deployed) showed the shared bill itself commits and broadcasts correctly from a second occupant for `theater_channel`, `theater_queue` add, `playNow`, `pause`, and `resume` — same item id to both clients. A deployed-origin browser reached `ts-state-playing` for a YouTube item pushed by another client with the default sound-off state. Strict-autoplay attempts in headless could not actually enable sound (audio context), so the production trigger still needs a real-browser capture.

Constraints: YouTube's IFrame API behavior is opaque and cross-origin; localhost does not reliably exercise production autoplay policy; the change must not add silent fallbacks, must not claim a reproduction it did not achieve, and must stay wire-compatible (additive fields only, old clients/servers keep working).

## Goals / Non-Goals

**Goals:**

- Any occupant can start an item, and every client in the room either plays it or has a working one-tap start.
- A client-local playback block can never advance, skip, or stop the shared item.
- Booth rejections are visible and attributable to the action that caused them.
- The production failure is captured with two real browser clients and recorded as change evidence before the fix is declared complete.

**Non-Goals:**

- No bill-rule changes (queue caps, classification, timers), no new source kinds, no provider/CDN changes.
- No change to the shared-timeline model or to client independence (no server-side "one player" or proxy).
- No change to IPTV catalog boot/import (`fix-iptv-playback-elixir`) or the P6 economy work.
- No attempt to make YouTube embed behavior deterministic; the design assumes it can be blocked and must be recoverable.

## Decisions

**D1 — Reproduce with real browsers first; the spec requirements stand regardless.** Add a two-client browser gate (extending the `scripts/*-gate-browser.mjs` chromedriver pattern) that runs against the deployed URL or a policy-enforced origin (`--autoplay-policy=document-user-activation-required`, headed under Xvfb where available). Capture `theater_state` frames, engine transitions, booth status, console diagnostics, and gateway logs. The fixes are required by the specs even if the primary production trigger is browser autoplay policy rather than a server bug, so implementation is not gated on reproducing a specific mechanism — but "it works now" claims are gated on the captured before/after evidence.

**D2 — One supervision state machine instead of per-engine watchdogs.** Add a small pure module (for example `src/ui/theaterPlaybackState.js`) fed on the drift tick with `{ wantPlaying, engineKind, engineState, positionSec, targetSec, lastProgressAt }` and returning one of `none | seek | play | pause | needs-gesture`. Engine adapters expose a normalized state: YouTube player state mapped to `playing/unstarted/buffering/paused/ended/error`, `<video>` from `paused/readyState/currentTime`, Vimeo from its events. `needs-gesture` shows the badge and suppresses gesture-less `play()` calls; the gesture handler seeks to the corrected shared position and plays, then clears the state on observed progress. Why: the reported failure includes "starts then stops", which per-engine `unstarted`-only checks miss; a pure function is testable in Node without DOM.

**D3 — Separate source-fatal failures from client-local blocks.** `failed` is reported only when the client has source-level evidence: `<video>`/HLS fatal error events, or YouTube error codes that mean the source is unplayable (100 removed/private; 101/150 embedding disallowed). Blocked autoplay, unstarted/paused stalls, buffering, and ambiguous player errors produce the local `needs-gesture`/readable-error state and never a report. Alternative considered: require agreement between two clients before advancing; rejected as added latency and coordination for genuinely broken sources when a predicate is sufficient.

**D4 — The room's bill stays authoritative while a client is blocked.** A blocked client keeps showing the live item with its start affordance; it never pauses, skips, or clears the shared state on its own. Join and stale-item behavior is unchanged.

**D5 — Tag theater rejections for attribution (additive wire fields).** Theater action error frames gain `"op"` and `"requestId"` (the gateway already mints a receipt id; include it). The client surfaces tagged errors in the booth status line regardless of pending resolves and keeps ignoring untagged `error` frames. No reducer or schema change; old clients ignore the new keys.

**D6 — Bounded, opt-in diagnostics.** Behind the existing `?debug=1` seam, keep a small ring of playback events (item id, engine kind/state, action taken, report sent, timestamps) exposed through a read-only accessor; log theater action rejections on the gateway with correlation id, op, and receipt id (never tokens). No persistence, no new always-on logging.

**D7 — Verification.** Unit tests for the state machine and report isolation with a fake engine; Elixir test for the tagged rejection; a two-client browser gate that asserts B's start plays on A, an autoplay-blocked A shows the start control and recovers on tap with no bill advance; plus the existing `npm test`, `npm run build`, and a deployed smoke.

**D8 — Bounded YouTube handshake rebuild (apply evidence, 2026-09-10).** The reporter captured the production console error: `Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://www.youtube.com') does not match the recipient window's origin ('https://game-beige-pi.vercel.app')`. The widget API posts to the player iframe before its cross-origin navigation commits (the initial `about:blank` window carries the app origin); when that race or a blocked embed kills the API handshake, `onReady` can never arrive, so the supervision loop sees a player that cannot be recovered by a gesture. Decision: start a readiness timer when the player is constructed (`YT_READY_TIMEOUT_MS = 9000`); if `onReady` has not fired, rebuild the player exactly ONCE per item (fragmenting the race), and on a second failure show the local problem without any room-wide report. The origin parameter itself is already correct — the widget API overwrites `playerVars.origin` with `location.protocol + '//' + location.host` whenever `location.host` is set (verified in `www-widgetapi.js`), so no client-side origin override is added.

## Risks / Trade-offs

- [YouTube API behavior varies by region, version, and browser] → the fix relies on observable states plus a local recovery affordance, not on forcing playback; tests use an injectable fake player and the gate asserts states, not pixels.
- [Headless automation may not enforce autoplay policy, so the block cannot be reproduced in CI] → use headed sessions under Xvfb with the policy flag; if still not enforceable, record the limitation honestly and verify with two real production clients before claiming the fix.
- [The start badge appearing while buffering would be noisy] → require a minimum stall window and no progress before showing it; hide it as soon as playback progresses.
- [Loosening failure reports could mask genuinely broken sources] → the source-fatal predicate is explicit and unit-tested in both directions (block → local only; broken source → advances once).
- [Additive error fields could be misread by older clients] → additive keys only; untagged errors retain today's behavior.

## Migration Plan

No schema or data migration. The server change is additive and safe to deploy alone; the client change carries the fix. Deploy gateway first, then the frontend. Rollback is a code revert — the theater bill lives in the existing tables and is untouched by this change. Diagnostics stay opt-in.

## Open Questions

- Which browser, sound state, and participant count the reporter used in production. The production capture (task 1) records this; it does not change the approach or the specs, which now require the behavior for every occupant regardless of trigger.

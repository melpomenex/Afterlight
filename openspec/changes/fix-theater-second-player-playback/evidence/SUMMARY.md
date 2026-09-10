# Reproduction evidence — fix-theater-second-player-playback

Captured during planning/apply with `scripts/theater-playback-gate-browser.mjs`
(two isolated browser sessions; B starts a YouTube item through the booth,
A observes; an independent gateway probe records the authoritative bill).

## Runs

| Evidence | Setup | Transport | B (actor) | A (observer) | Badge | Reports |
| --- | --- | --- | --- | --- | --- | --- |
| `2026-09-10T14-56-21-618Z-local-baseline.json` | local dev stack, headless, sound off | open | playing (2 s) | playing (2 s) | none | none |
| `2026-09-10T14-59-09-699Z-deployed-strict.json` | deployed Vercel + VM, headless, strict autoplay, sound requested | **neither opened** (`Failed to fetch` reconnect loop) | idle | idle | none | none |
| `2026-09-10T15-02-43-580Z-deployed-strict-2.json` | deployed, headless, strict autoplay | open | playing (3 s) | playing (3 s) | none | none |
| `2026-09-10T15-05-43-281Z-deployed-headed-sound.json` | deployed, headed under Xvfb, strict autoplay, sound **on** | **neither opened** | idle | idle | none | none |

## What this proves

- The shared bill path is healthy: with transports open, B's booth action
  commits and both clients reach `ts-state-playing` on the same item, both
  locally and on the deployed stack.
- The `Failed to fetch` transport failures are a capture-environment problem
  (two concurrent browser sessions through the Tailscale funnel from one
  source host). A single gate-launched session reaches the deployed gateway
  reliably (auth 200, `netState().open === true`), and 35 sequential auth
  requests from the shell all returned 200, so this is not the reported bug.
- Headless/browser automation could not reproduce the report's blocked-
  playback stall: with sound off (the game default) media is muted and
  autoplay succeeds; in the headed run sound could be turned on but the
  transport failure prevented the action from reaching the server.
- No `ended`/`failed` frame was observed in any capture, and no bill advance
  was triggered by a client-local state.

## Honest limitation

The exact production trigger (which browser, sound state, and interaction
sequence produced "briefly plays then stops") is **not reproduced in
automation**. The client-side gaps remain real and are verified by unit tests
and by the two-client browser gate once the fix lands (task 6.2); the manual
two-real-client production pass (task 6.3) is still required before claiming
the production issue fixed.

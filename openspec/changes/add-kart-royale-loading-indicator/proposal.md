## Why

Entering Kart Royale takes 30–45 seconds on a cold start (controller import, game-module import, host boot with the environment bake, selection readiness), and during that entire window the player sees an unchanged Theater with only one transient toast ("Loading the race… Press Esc to cancel."). The toast disappears within seconds, so a player who just pressed E has no way to tell that anything is happening — the natural conclusion is that the game is broken or will never load.

## What Changes

- Add a persistent, cancellable loading indicator for Kart Royale entry that is shown from the E press until the race view is presented (or the attempt terminates), replacing the single transient toast as the only feedback.
- The indicator presents honest phase feedback mapped to the existing boot choreography (loading game modules → preparing the race host → warming up graphics → preparing the grid) plus elapsed time and a persistent "press Esc to cancel" hint — never a fabricated percentage.
- The cabinet's own screen joins in: while its player is booting, the cabinet composite paints a LOADING state instead of the attract mode, so the indicator is readable both on-screen and in-world.
- The indicator clears on every terminal path (view presented, Esc cancel, walk-away/travel, seat loss, load failure, context loss, dispose) and is skipped or dismissed without flashing when a retained host makes re-entry fast.
- Boot failure paths additionally restore an understandable state: the loading indicator is replaced by the existing failure toast, not left hanging.

## Capabilities

### New Capabilities

- `kart-royale-entry`: The observable entry experience for the Kart Royale cabinet — what a player sees from pressing E until the race view takes over, including loading feedback, phase honesty, cancellation, and failure behavior.

### Modified Capabilities

<!-- None. No existing spec covers activity entry feedback; the kart-royale activity has no capability spec today. -->

## Impact

- `src/activities/kart-royale.js` — bystander/instance module: new loading state surface (HUD element + cabinet screen paint state) driven by `beginParticipation`/`cancelActivation`/`notifyPresentationTerminal`.
- `src/activities/kart-royale/controller.js` — expose boot-phase progress (module import / host construct / boot / spawn-valid, reusing the `kartPerf.js` span boundaries as an event source, not the opt-in perf records) so the indicator can reflect real phases.
- `src/activities/kartRoyalePreparation.js` / `kartRoyalePrepareScheduler.js` — retained-host fast path must suppress or immediately dismiss the indicator (no flash).
- `src/style.css` (or a scoped activity stylesheet) — the indicator's visual language: translucent dark panel, Space Mono micro-labels, amber accent, consistent with existing HUD panels and the `#loading`/downhill-HUD precedents.
- No wire-protocol, server, or save-schema changes. No changes to standalone Kart Royale (`games/kart-royale` standalone keeps its own screens).

## Context

Kart Royale entry is intentionally slow-path-safe: the controller module and the game host module are lazily imported only on E, then `host.boot()` performs the expensive systems + prewarm work (including the PMREM environment bake), then `prepareSelectionReadiness()` poses the grid, and only then does the view lease take over the shared renderer (`src/activities/kart-royale/controller.js`, `createAndBootHost()`). Cold-boot choreography keeps the Theater presentable throughout via frame-bound graphics transactions.

The observable consequence (see proposal): for 30–45 s the player sees an unchanged world. The only feedback is one transient toast. Escape already cancels during boot: `Escape` → `participation.leave()` → the controller's `update()` sees participation idle while a boot is pending → `exit('cancel')` → `notifyPresentationTerminal('cancelled')`. Every terminal path (cancel, load-failed, failed, disposed, seat loss) already funnels through `notifyPresentationTerminal` on the instance. What does not exist today is any notification that the boot *succeeded* and the view is live.

Useful existing structure:
- `kartPerf.js` spans are already emitted at exactly the boot-phase boundaries we want to surface (`host-import`, `construct`, `boot`, `spawn-valid`), but the perf system is opt-in (`?debug`) — phase reporting for the indicator must not depend on it.
- The instance module (`src/activities/kart-royale.js`) already owns a hidden background HUD root (`ensureBackgroundHudRoot`) and the cabinet composite canvas with `paintAttract`/`paintOccupied` states.
- Downhill Mayhem's HUD drives presentation with a phase class (`dm-phase-loading`) — the CSS-state pattern precedent.
- App-level `#loading` overlay and the translucent HUD panel language (dark teal, Space Mono micro-labels, amber accent).

## Goals / Non-Goals

**Goals:**
- Persistent, honest loading feedback for the whole entry window, readable in the world (HUD card) and at the machine (cabinet screen).
- Phase feedback driven by real boot transitions; elapsed time; persistent cancel hint.
- Correct teardown on every terminal path, including paths added later (single choke point).
- No flash on retained-host fast re-entry.

**Non-Goals:**
- No change to admission/boot semantics (walk-away during boot, queueing, seat policy, view-lease order).
- No real byte-level progress or download instrumentation; no ETA prediction.
- No changes to standalone Kart Royale's own menus/loading screens.
- No wire protocol or server changes.

## Decisions

### D1 — In-world HUD card + cabinet screen state, not a full-screen loading cover
The boot architecture deliberately keeps the Theater alive and interactive (movement keys are not captured until boot completes; Esc cancels). An opaque full-screen `#loading`-style cover would fight that: it hides the world the architecture works to keep presentable, turns a cancellable wait into an apparent freeze, and would need its own input handling. Instead: a small translucent HUD card (existing panel language, `pointer-events: none`, purely informative — cancel stays on the keyboard Esc path the card advertises) plus a booting paint on the cabinet screen. Alternative considered and rejected: full-screen cover with a cancel button (heavier DOM, new focus/keyboard handling, hides the world for 45 s).

### D2 — The indicator lives in the instance module; the controller reports phases
`kart-royale.js` (the bystander/instance module) owns the indicator DOM and the cabinet paint state because it already owns both surfaces and outlives controller re-creations and activation epochs. The controller (`controller.js`) gets one new injected callback, `notifyPresentationLive()` (called where `presentationReady` becomes true on both retained and cold paths), and one injected `onBootPhase(phase)` hook called at the existing `perfSpan` sites (`host-import`, `construct`, `boot`, `spawn-valid`). Phase reporting is a direct call, independent of the opt-in perf system. Before the controller exists (the `controller-import` window), the instance already knows the phase — it started the load itself.

### D3 — Phases are a small ordered enum, mapped to the real choreography
`modules` (controller import + host import) → `host` (construct) → `graphics` (boot/PMREM — the long phase) → `grid` (prepareSelectionReadiness). The card shows the phase list with completed/current marks, elapsed seconds, and "ESC TO CANCEL". No percentage: there is no honest progress measure inside `host.boot()`, and a fake bar is worse than none (spec requirement). An animated indeterminate element conveys liveness. Elapsed time plus phase labels carry the "this will take a while, and it is working" message. A future ETA from readiness-metric history (`prepLeadSeconds`) is explicitly out of scope.

### D4 — Single choke point for teardown, plus a short show-delay for flash suppression
The indicator is shown from `beginParticipation()` and cleared in exactly two places: `notifyPresentationTerminal(reason)` (every existing terminal path already flows through it — cancel, load-failed, failed, disposed) and the new `notifyPresentationLive()` (success). Nothing else clears it, so future exit reasons cannot strand it. Flash suppression: the surfaces switch only after a short pending delay (~500 ms). A retained-host re-entry that presents almost instantly never shows the card and never repainted the cabinet; a slow boot shows everything. The delay timer is also cleared by both choke points.

### D5 — Cabinet booting paint takes precedence over occupied during pending activation
When the local player presses E they are admitted immediately, so activity occupancy flips the display to `paintOccupied` ("RACING") while the game is still booting — misleading. During a pending local activation (before live/terminal), a booting paint (attract scenery + LOADING + spinner) wins over both attract and occupied; afterwards the existing precedence returns. The cabinet repaint loop already repaints time-animated states while visible, so the booting state rides the same path (it must be added to the repaint condition alongside idle).

### D6 — Pure state helper, scoped styles
Decision logic (phase ordering, delay gating, elapsed formatting, precedence) goes in a small pure module (`kartRoyaleLoadingState.js`) under `src/activities/`, unit-tested in Node like the other kart helpers; `kart-royale.js` applies it to DOM/canvas. Styles use the existing scoped-class convention (`kr-` prefix) in `src/style.css`, following the downhill HUD pattern of a state class (`kr-loading-visible`) rather than imperative style writes. Copy is player-facing ("Warming up the graphics…", not "PMREM bake").

## Risks / Trade-offs

- [Indicator hides a real failure window] If boot stalls silently, phases never advance. → Elapsed time and the indeterminate animation keep the card alive; failure paths already toast and now also clear the card.
- [Double feedback (toast + card)] Redundant at t=0. → The card becomes the durable surface; the boot toast is shortened or dropped so the card is the single message (kept: failure toasts).
- [Escape hint vs. settings] Esc during boot cancels via participation leave; the same key opens settings when idle. The card is visible only while a boot is pending, so the hint is accurate in every state where it shows.
- [Notification drift if a future exit path skips `notifyPresentationTerminal`] → D4 keeps exactly two clear points; the controller's `exit()` already funnels all reasons through the terminal notification, and tests assert card-clearing per reason.
- [Cabinet repaint cost during boot] The booting paint is the same ~20-shape canvas work as attract mode, already throttled by visibility.

## Migration Plan

Presentation-only, additive, client-only. No persistence, protocol, or server involvement; deploy is an ordinary frontend build. Rollback is reverting the change; no feature flag is warranted for an additive HUD surface (contrast with floating-media, which restructured ownership of shared surfaces).

## Open Questions

None.

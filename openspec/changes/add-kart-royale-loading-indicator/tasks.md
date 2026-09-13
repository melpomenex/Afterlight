## 1. Pure loading-state helper

- [x] 1.1 Create `src/activities/kartRoyaleLoadingState.js`: ordered phase enum (`modules`, `host`, `graphics`, `grid`) with forward-only progression, player-facing phase labels, delay-gating decision (show only after ~500 ms pending), elapsed-time formatting, and surface precedence (booting over attract/occupied while activation pending). Pure, dependency-free, mirroring the other `kart*` helper modules. Verify: `npm test` with a new `tests/kart-royale-loading-state.test.js` covering phase order enforcement, delay gating, formatting, and precedence.

## 2. Instance module wiring (surface owner)

- [ ] 2.1 In `src/activities/kart-royale.js`, add the loading card DOM (created lazily like `ensureBackgroundHudRoot`, `pointer-events: none`, state class toggled per `kartRoyaleLoadingState`), shown from `beginParticipation()` and cleared only in `notifyPresentationTerminal` and a new presentation-live path; clear the delay timer in the same two places. Verify: Node test asserting card lifecycle transitions for reasons `cancelled`, `load-failed`, `failed`, `disposed`, and presentation-live (extend the existing kart cabinet tests).
- [ ] 2.2 Report the pre-controller phase (`modules`) from `loadController()` into the loading state, and advance phases from the controller via the new callbacks; keep phase reporting independent of the `?debug` perf system. Verify: unit test feeding simulated phase callbacks asserts forward-only label progression.
- [ ] 2.3 Add the booting paint (`paintBooting`, attract scenery + LOADING + animated element) and include it in the repaint condition alongside idle; booting wins over attract/occupied while a local activation is pending past the delay. Verify: paint-state test (booting during pending activation; attract/occupied resume after terminal/live) plus `npm test` for the existing bystander-economy audit still passing.

## 3. Controller phase + live notifications

- [ ] 3.1 In `src/activities/kart-royale/controller.js`, accept and call the new injected `onBootPhase(phase)` at the existing `perfSpan` sites (`host-import`, `construct`, `boot`, `spawn-valid`) and `notifyPresentationLive()` where `presentationReady` becomes true on both retained and cold paths. Verify: Node test with a stubbed host asserting both callbacks fire at the right transitions and that stale/cancelled attempts do not fire them.

## 4. Presentation and copy

- [ ] 4.1 Add `kr-` prefixed styles in `src/style.css`: translucent dark-teal card, Space Mono micro-labels, amber accent, indeterminate animation, bottom-center placement respecting the 901–1100 px / 900 px / 560 px breakpoints (no overlap with footer/interaction surfaces, visible focus-free since it is non-interactive). Player-facing copy only ("Warming up the graphics…", "ESC TO CANCEL"), no percentage anywhere. Verify: `npm run build` succeeds; DOM copy check in the browser gate.
- [ ] 4.2 Reconcile the boot toast with the card so there is one durable message (shorten or drop the "Loading the race…" toast; keep failure toasts unchanged). Verify: code inspection + browser check that exactly one persistent loading surface is visible during boot.

## 5. Verification

- [ ] 5.1 Full gate: `npm test`, `npm run build`, then in the running dev stack verify in-browser: cold E press shows the card and booting cabinet screen with advancing phases and elapsed time; Esc cancels and clears everything back to attract; retained fast re-entry shows no flash; simulated load failure clears the card and shows the failure toast. Check desktop, ~1000 px, and narrow viewports for overlap.

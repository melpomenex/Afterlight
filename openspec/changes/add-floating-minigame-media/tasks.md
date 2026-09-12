## 1. Baseline and policy contracts

- [x] 1.1 Recheck the current theater/Twitch and pending arcade diffs against design Context; record supported controlled/degraded providers and preserve unrelated work. Verify every existing integration reference still resolves and document any changed signatures before coding.
- [x] 1.2 Add deterministic media/session fixtures and baseline identity instrumentation to the theater browser harness (new `scripts/floating-media-gate-browser.mjs`, following existing Kart gate conventions). Verify a same-item snapshot and cinema toggle retain engine/node identity and the fixture timeline advances.
- [x] 1.3 Implement pure presentation/audio policy in new `src/ui/mediaPresentationState.js` (D3–D4), including per-field explicit edits, master gate, zero volume, duplicate entry and game replacement. Verify table-driven Node tests cover entry/exit restoration, source changes and empty media.

## 2. Persistent presentation and audio adapters

- [x] 2.1 After 1.3, adapt `src/ui/theaterScreen.js` presentation selection and `syncOverlay`/`updateScreenQuad`; retain stable media ancestry and the existing drift tick. Verify primary/cinema, null-quad floating, hidden synchronization and room teardown in theater UI/place-adapter tests.
- [x] 2.2 After 2.1, integrate temporary mute with `effectiveVolume` and each controlled provider ready/volume path; expose capability and acknowledged/error status without changing engine ownership. Verify fake-adapter tests cover pending commands, stale ready callbacks, explicit unmute and master/volume gates.
- [x] 2.3 Implement the documented native-control exception for clips/degraded embeds and preserve existing autoplay/retry/offline behavior. Verify no false mute indicator, no presentation-driven iframe reload and no shared failure/skip sent; record this as an AC3/AC4/AC12 exception, not a passing universal-mute result.
- [x] 2.4 After 2.1–2.3, add real-browser stable-node/source checks for enter/exit/hide/expand. Verify engine/video/frame/contentWindow identity, no DOM reinsertion and zero additional engine-start/teardown/manifest requests on presentation-only transitions.

## 3. Generic activity lifecycle

- [x] 3.1 Implement generation/attempt-fenced presentation leases in new `src/activities/mediaPresentation.js` and default client module policy in `src/activities/registry.js`. Verify duplicate begin/end, stale completion, opt-out and replacement tests without renderer/network dependencies.
- [x] 3.2 After 3.1, integrate the runtime entry route in `src/activities/runtime.js` and joining/state callbacks in `participation.js`; route `src/main.js` interactions through it. Verify immediate entry, rejection, queue/watch, promotion, ejection and deactivation release correctly using activity runtime/participation tests.
- [x] 3.3 After 3.2, bridge lazy loading/cancel/failure in `src/activities/kart-royale.js` and its controller; acquire before imports and keep through admission/lease/menu/results. Verify cancel-before-ready, failed boot, repeated entry and retained-resource prefetch do not leak or acquire spurious presentation tokens.
- [x] 3.4 Apply the same terminal notifications to `src/activities/snowboard.js`, `snowboard/controller.js`, `downhill-mayhem.js` and `downhill/controller.js`. Verify stale generations, lobby/results and loading cancellation with existing snowboard/downhill tests plus new lease assertions.
- [x] 3.5 Verify Pool, air hockey, foosball, Pong and Rain Runner inherit shared behavior without implementing a player in game modules. Add module registration/runtime coverage for a future dummy cabinet, and verify view-lease release alone does not end valid game presentation.

## 4. Floating controls and layout

- [x] 4.1 After 2.1 and 3.2, create `src/ui/floatingMedia.js` chrome once around the existing surface, with accessible speaker, hide/restore and enlarge/reduce controls. Verify browser DOM tests for labels, state announcements, tab order, empty bill and existing error/gesture affordances.
- [x] 4.2 Implement `src/ui/floatingMediaLayout.js` dimensions, safe viewport bounds, session position, corner scoring and bounded reservations. Verify pure tests for 1440/1280/930/560/390 widths, virtual keyboard bounds, provider minimums and all-corners-blocked fallback.
- [x] 4.3 After 4.2, bind pointer-capture dragging, touch cancellation, keyboard handle movement/reset and resize/visualViewport updates. Verify real-pointer and keyboard tests cannot lose the player offscreen or leave a captured pointer after cancellation.
- [x] 4.4 Add reservation callbacks for host chat/actions and Pool, Kart, Summit and Downhill critical HUD/touch regions. Verify bottom-right defaults only when safe, manual placement survives ordinary updates, and narrow layouts keep essential controls accessible.
- [x] 4.5 Normalize affected stacking variables in `src/style.css` and hosted menu roots/styles; keep nonblocking game loading under media and menus above it. Verify screenshots and interactive menu tests for Pool's high-z HUD, Kart pause/results, Summit, Downhill and native dialogs.

## 5. Input and fullscreen

- [x] 5.1 Add shared media event/focus guards and integrate `src/main.js`, `src/activities/inputSeam.js` and Pool/air-hockey/foosball controller capture/gamepad paths. Verify F charge cancellation, Space activation, pointer drag, held-key release, gamepad neutralization and return-to-game focus with real events.
- [x] 5.2 After 5.1, apply guards to Kart/Summit/Downhill host input forwarding before capture handlers consume events. Verify Tab/Enter/Space reach media controls without racing actions and chat/menu/game controls still work outside media UI.
- [x] 5.3 Add the focused app fullscreen helper (proposed `src/ui/appFullscreen.js`) and Settings action in `index.html`/`src/main.js`, targeting `document.documentElement`. Verify success, denial, resize and exit retain the same media node; label provider-native fullscreen as outside combined gameplay support.
- [x] 5.4 Implement the future pointer-lock integration contract without adding mouse-look to shipped games. Verify a browser harness retains lock on automatic presentation changes, unlocks by normal gesture without exiting game, and reacquires only on explicit canvas action.

## 6. Integration and release verification

- [x] 6.1 Run the complete browser flow: playing source → Pool/Kart entry → muted floating → currentTime continues → explicit unmute → game exit → restored primary/audio. Verify deterministic MP4/HLS and controlled-provider fixtures, cold loading, errors/cancel and no duplicate session (AC1–AC7, AC11–AC13).
- [ ] 6.2 Execute source end/replacement, hidden/reconnect, autoplay, granted torrent, offline Twitch and two-client isolation scenarios. Verify shared behavior remains unchanged and all local operations emit no theater actions (AC14, AC15, AC17); report degraded audio exceptions separately.
- [ ] 6.3 Execute design D7's manual matrix across Pool, Kart, classic cabinet, Summit/Downhill, desktop/narrow/touch, fullscreen, controller and pointer-lock harness. Verify input, viewport and layers with saved screenshots/results (AC8–AC10, AC16).
- [x] 6.4 Run the matched frame-time benchmark and 20-cycle listener/node lifetime checks from D7. Verify <=5% median and <=10% p95 regression, one decoder/session and no extra renderer/RAF (AC18), recording device/stream/settings and raw measurements.
- [x] 6.5 Run `npm test` and `npm run build` after focused checks, investigate regressions without changing unrelated work, and record exact outcomes. Update `README.md` and relevant architecture/arcade docs for controls, audio semantics and provider/fullscreen limitations; verify docs match tested behavior.
- [x] 6.6 Enable default behavior only after browser/performance gates pass and the documented provider exception is accepted for rollout. Verify developer-toggle rollback restores primary layout/audio without engine recreation and no data/protocol migration is required.

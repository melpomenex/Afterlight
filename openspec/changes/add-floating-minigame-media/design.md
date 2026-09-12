## Context

See `proposal.md` for motivation. Investigation is against the current working tree on 2026-09-12, including uncommitted Twitch/media work. The supplied screenshot is a Pool composition reference: chat and table controls already occupy the bottom-right corner. It is not evidence of media behavior at runtime.

### Verified architecture and integration map

| Question / area | Current implementation and implication |
| --- | --- |
| Canonical content and timeline | `shared/theaterModel.js` plus `server_elixir/lib/afterlight/theater/reducer.ex` own shared bill rules. `TheaterScreenUI.applyState` in `src/ui/theaterScreen.js` holds the client snapshot, `serverDelta`, item/play key and once-per-item reporting. PiP does not own any of these. |
| Local playback owner | `new TheaterScreenUI(net)` is created once in `src/main.js`. It owns `engine`, `loadedItemId`, `loadedPlayKey`, `loadToken`, synchronization and provider retries. `src/places/theaterAdapter.js` retains the singleton while toggling room activity. |
| Source/surface | `buildOverlay` appends `#theater-screen` and its `.ts-media` host directly to `document.body`. Direct files, HLS and granted torrent URLs use one video (`startFileEngine` / `attachHls`); YouTube, Vimeo and Twitch use provider frames and adapters. Prepared MKV/AVI uses the resolved HLS/file path. `loadCurrent` and `teardownEngine` are the source lifecycle boundary. |
| Theater presentation | `updateScreenQuad` fits the surface to a world quad with CSS homography; `setWatchMode` already changes to cinema CSS without creating a new player. `syncOverlay` currently requires an active room and a quad or cinema mode. |
| Synchronization | `updateScreenQuad` also calls `tickDriftCheck`; the leased frame path calls it with null. This still runs supervision despite hiding the screen. Preserve that tick independently of floating visibility; comments suggesting an independent theater interval must not be mistaken for an actual timer. |
| Audio | `volume` is local slider preference, `mixGain` is atmosphere/voice gain, `masterSound` defaults false. `effectiveVolume` multiplies these; controlled adapters also set actual mute state. `applyEffectiveVolume` returns false for degraded engines. No separate durable media-muted preference exists yet. |
| Pool / table games | `src/activities/pool.js`, `pool/controller.js`, `pool/camera.js` use participation and the camera seam; Pool has capture listeners, F charging, pointer capture and gamepad polling. Air hockey and foosball likewise have their own controllers. None needs the full scene lease to participate. |
| Classic arcade | `src/activities/pong.js` and `rainRunner.js` use common participation and activity input. Their cabinet CanvasTexture represents game graphics, not theater video. Cabinet art/building (`src/arcade/cabinet.js`) is not a launch or media ownership boundary. |
| Hosted games | `src/activities/kart-royale.js`, `snowboard.js` (Summit Run), and `downhill-mayhem.js` lazy-load controllers using `beginParticipation`. Kart and Downhill have pending activation/epoch and cancellation machinery. Controllers borrow the existing renderer/view through `src/activities/viewLease.js`; Kart presents through its hosted composer. `games/kart-royale/src/core/Input.ts` is routed by the host controller. |
| Shared lifecycle | `src/activities/runtime.js` initializes registered modules and calls `beginParticipationFor` before ordinary participation. Its fire-and-forget promise currently does not expose a complete entry lifecycle. `participation.js` owns joining/participating/watching/queued/idle with `onStateChange`; the runtime accepts `onParticipationStateChange`. Admission, loading and renderer ownership are separate. |
| Exit/travel | Participation handles cancellation, departure, errors, snapshot ejection and deactivation. Runtime deactivation disposes instances; view lease revoke/release restores rendering. `theaterAdapter.deactivate` calls `setRoomActive(false)`, intentionally destroys playback and clears room-bound torrent grants. Same-room game exit must not call that path. |
| Renderer / frameworks | `src/main.js` uses Three.js WebGLRenderer and one RAF. WebGPU work is in the realtime subsystem; theater playback has no VideoTexture. No React, Redux, Zustand or component context is present in `package.json` or this path. No React mount strategy or renderer migration is needed. |
| Layers / input | `src/style.css`: theater and hosted roots around z-index 40, Summit HUD 60, Pool HUD 900, overlays around 1000, loading 9999. Native modal dialogs use the top layer. Kart capture handlers currently forward/consume events broadly; descendant stopPropagation alone is insufficient. |
| Fullscreen / pointer lock | Searches of `src`, hosted Kart/Downhill sources and `index.html` found provider iframe fullscreen permissions but no app `requestFullscreen` or `requestPointerLock` implementation. Current game “fullscreen” is viewport-filling CSS. First-person view uses pointer drag, not pointer lock. |
| Tests / responsive | `tests/theater-ui.test.js` tests headless math, not browser media. Playback-state, HLS, Twitch, grant, report-isolation and place-adapter tests cover related contracts. Activity/runtime, Pool, Kart and snowboard tests plus browser gate scripts exist. CSS has 1100/900/560 breakpoints; Kart has touch input; general mobile game controls are not uniformly complete. |

Related planning contracts live under `openspec/changes/add-place-activities-program/`, `integrate-kart-royale-arcade/`, `add-multiplayer-snowboard-arcade/` and `integrate-multiplayer-downhill-mayhem-arcade/`. Their incomplete tasks are not proof of completed browser verification. Do not edit those changes to implement this one.

## Goals / Non-Goals

**Goals:** Treat PiP as a local presentation of one room-authorized session; make reusable activity integration cover loading and cancellation; preserve source identity, timeline, muted entry and game input; define explicit provider compatibility.

**Non-Goals:** Cross-room theater subscriptions, new media protocols, native browser PiP, new games, media routing through Web Audio/captureStream, backend changes, new renderer/RAF, or a rewrite of the large theater class. Leaving the theater remains a legitimate source teardown. Voice/video-call MediaStreams belong to a separate feature and are not floating-stream inputs here.

## Decisions

### D1. Retain playback ownership and stable DOM ancestry

Keep `TheaterScreenUI` as the persistent playback owner. Add focused modules (proposed paths):

- `src/ui/mediaPresentationState.js`: pure local presentation/audio transition reducer.
- `src/ui/floatingMediaLayout.js`: pure dimensions, corner candidate and clamp logic.
- `src/ui/floatingMedia.js`: DOM chrome, positioning and input bindings around the existing overlay; never accepts a URL or creates video/iframe/HLS objects.
- `src/activities/mediaPresentation.js`: generation-fenced local activity presentation lease, composed by the activity runtime.

The existing `#theater-screen`, `.ts-media` and all provider descendants remain connected to the same parents for their lifetime. Create chrome once in the overlay, outside the media rectangle; hide it in primary mode. CSS selects world/cinema/floating/hidden/enlarged geometry. No `appendChild` reparenting, cloning, innerHTML replacement of media, portal remount or source assignment occurs on a presentation change. Ordinary iframe moves can reset browsing state; avoiding moves entirely also avoids requiring newer state-preserving DOM APIs. See [Chrome's DOM move explanation](https://developer.chrome.com/blog/movebefore-api).

A video could retain its play state when moved, but that does not solve mixed iframe providers; one fixed surface is the smaller, uniform design. There is no VideoTexture to update or freeze, no duplicate video decode, and no React lifecycle to manage.

```text
Authoritative theater snapshot / granted source
                     |
          TheaterScreenUI singleton
          engine + clock + error/reporting
                     |
          ONE persistent .ts-media node
                     |
    presentation selector: world | cinema | floating | hidden
                     ^
       local activity presentation lease
       loading -> joining -> participating
```

Modify `updateScreenQuad` to record world geometry but skip homography/sizing writes outside primary-world mode. Null quads during races must not hide floating mode. Continue `tickDriftCheck` once through the existing frame path in every presentation, including hidden. Change `syncOverlay` to use room activity, current item and presentation mode; float current paused/loading/error items too, but never float the theater's empty idle card. One shared queue advance can replace the engine normally; presentation changes cannot.

### D2. Separate activity presentation lifetime from render lifetime

Use a client-only module presentation policy in `src/activities/registry.js`: default floating media enabled for play participation; a module can opt out, and expose bounded HUD reservations. This needs no shared manifest/wire fields. All registered playable activities inherit it, including future cabinets. Non-play watching/queued roles do not auto-float; promotion into play starts a fresh entry. Room media availability still gates visibility.

Introduce a single runtime entry route used by `main.js` instead of splitting `beginParticipationFor` and generic `participation.interact`. It acquires a provisional local token BEFORE invoking lazy code or sending a direct join. The participation controller's joining callback also acquires/adopts a token for non-interaction admission paths. The callback must run before sending join, eliminating a synchronous-result ordering hole. Repeated notifications for one attempt reuse its token and must not remute after the user unmutes.

Illustrative contracts (new APIs, JavaScript with JSDoc; not existing exports):

```ts
type EntryToken = { activityId: string; generation: number; attempt: number };
type ActivityMediaPolicy = {
  floatingMedia?: boolean; // default true for play
  reservedRects?: () => Array<{ x: number; y: number; width: number; height: number }>;
};
interface ActivityPresentation {
  begin(activity, generation): EntryToken;
  phase(token, phase: 'loading' | 'joining' | 'participating'): void;
  end(token, reason): void; // only matching token; idempotent
  replace(token, nextActivity, generation): EntryToken;
}
interface FloatingPresentation {
  setActivity(tokenOrNull): void;
  setHidden(hidden: boolean): void;
  setExpanded(expanded: boolean): void;
  setMuted(muted: boolean): Promise<{ applied: boolean; reason?: string }>;
}
```

Tokens are local, not server lease IDs. Promise fulfillment means loading completed, not that participation ended. Token release happens on cancel, explicit leave, failed admission, queued/watch result, terminal error, ejection, controller activation failure, runtime deactivate/dispose and room generation change. Each lazy adapter must expose a terminal cancellation/failure notification to the runtime; checking a pending getter on a later frame is insufficient for immediate cancellation. Retained Kart resources and idle background prefetch never acquire a token. A stale promise cannot release or resurrect a newer token.

Same-room direct replacement keeps the media surface and baseline audio preference, resets hidden/expanded state and mutes for the new game. Normal leave then later enter is also safe: it only changes presentation/audio, never source. Release a render lease alone does not end PiP while still in a game's results/lobby; use actual participation/activation termination.

### D3. Audio is a temporary local policy, not a shared pause

Add local `userMuted` (initial false) beside existing `volume`; retain `masterSound` and `mixGain`. Snapshot baseline `{userMuted, volume}` at the first entry of a contiguous activity span, with per-field user-edit revisions. Force `activityMuted=true` before any game load/admission side effects. Effective output is zero when masterSound is off, userMuted is true, or activityMuted is true; otherwise it is volume × current mixGain.

An explicit floating Unmute sets activityMuted=false and records userMuted=false; Mute records userMuted=true. Booth slider edits are explicit persistent volume edits. On final exit remove activity override, restore only baseline fields without an intervening explicit edit, and retain explicitly edited values. Master switch and dynamic mixGain are never snapshotted/restored. Thus automatic silence is temporary; an explicit PiP mute remains muted after exit; explicit unmute overrides a previously muted media preference. Each new game forces silence again regardless of the last explicit choice.

With master Sound off, the control reads “Turn on sound and unmute stream”; that one explicit action calls the existing application Sound handler and then unmutes the stream, honestly enabling other app audio as its label implies. With volume zero, unmute restores a remembered nonzero media volume (fallback 1) and records the explicit volume edit. Never silently bypass the master gate. Voice ducking still applies and is labeled if it prevents audibility. Await adapter acknowledgement; blocked audio retains a truthful state and the existing gesture recovery action.

Provider mute must apply before ready/play callbacks and reapply to every source replacement. Async YouTube/Vimeo/Twitch commands require token/engine identity guards so late acknowledgements cannot label a newer source audible. A newly loaded source inherits the current activity audio choice; entering a NEW game resets it. No mute/hide/drag operation sends a theater transport message.

### D4. Minimal state machine and restoration

| Input | Presentation / effect |
| --- | --- |
| No activity token | PRIMARY (world or cinema selected by existing place UI) |
| Token + current item | FLOATING, entry-muted; loading/error/paused are content substates |
| Token + no current item | WAITING, no empty frame or restore chip; keep token for later media |
| Hide / restore | HIDDEN / FLOATING; same engine and audio choice; chip exists only with current media |
| Enlarge / reduce | Expanded / compact floating bounds; preserve game and mute state |
| Last item ends | Remove floating frame and chip when authoritative bill becomes empty; continue if next item arrives |
| Game exits/cancels/fails | PRIMARY; drop override and token, reclaim primary sizing and fresh quad |
| Room deactivates | Existing authorized source teardown; clear activity presentation and grants normally |

Enlarge is explicitly “Enlarge stream”, not “Return to theater”: it does not leave the match, seek, pause the shared stream, or activate cinema/seating. Reduce returns to prior compact position. Exiting gameplay restores the current valid primary layout (normally aisle/world after a cabinet dismount); never resurrect a stale chair or force cinema over the restored game HUD. An offscreen world screen remains legitimately offscreen after exit.

Hiding uses a connected non-interactive, non-focusable hidden presentation, without pause/destroy/src changes. Validate provider behavior rather than promise browsers cannot throttle invisible content. On local provider reconnect/retry, retain token, hidden/expanded/position state and audio policy. Existing source failure classification and once-per-item advance remain unchanged. Twitch offline is not stream-ended evidence.

### D5. Layout, exclusion zones and visual hierarchy

Use Afterlight's translucent teal, cream and restrained gold chrome. Compact controls sit outside the video: labeled speaker, Enlarge/Reduce, Hide, plus a draggable title handle. Never cover provider playback UI with a transparent interception layer.

For ordinary sources target about 22vw, clamped to a 280–400 CSS-pixel desktop width and available viewport width minus safe margins; maintain content aspect with letterboxing (16:9 fallback). On narrow windows use available width with 12px plus safe-area margins; keep controls at least 44px touch targets, wrap chrome rather than crop it. Enlarged mode uses at most 80% available width/height. Keyboard-opened visual viewport, orientation and resize reclamp bounds via `visualViewport`/resize notifications. Use no fixed player size as a universal requirement.

Default candidate order: bottom-right, bottom-left, top-right, top-left. Evaluate a bounded list (at most eight) of host chat/control and active-game reservation rectangles on entry, resize or explicit HUD layout notifications, not every animation frame. Choose the first non-overlapping candidate, else least-overlap; preserve a manually dragged position unless resize or newly critical controls require reclamping. If all corners cover essential controls, reduce to the smallest usable size, then temporarily show the restore chip with a readable “Make room for stream” action; expanding is an explicit choice. Session memory is in JS, normalized to available bounds; no durable storage or snapping on every drag. Provide “Reset position” through the handle's small menu and arrow-key handle movement.

Pool reservations include action controls, power/spin, and host chat (the screenshot demonstrates the collision). Kart/Downhill/Summit register current HUD/touch-control bounds; classic cabinet defaults rely on host reservations. Do not add game-specific positioning algorithms.

Twitch requires its actual displayed video window to meet provider minimum dimensions (currently 400×300); use letterboxing, not scaling a hidden large logical iframe below those dimensions. If the visible viewport cannot fit it, show the restore chip and explain that a wider window is required, retaining the session. This is an explicit responsive limitation. Provider requirements: [Twitch video and clips](https://dev.twitch.tv/docs/embed/video-and-clips/) and [embedding requirements](https://dev.twitch.tv/docs/embed/).

Normalize only affected layers into shared CSS variables: gameplay and HUD < floating media < game menus/interaction overlays < application blocking loading and native dialogs. Raise game menu layers, not their whole HUD roots: a menu trapped in the z-index-40 hosted root cannot outstack a body-level PiP even if its child has a large index. Expose menu-open state or separate menu stacking as needed; ordinary game loading must remain below PiP, unlike initial application-blocking loading. Native dialogs remain above all. Test Pool's 900 and existing 1000 overlays explicitly.

### D6. Input and fullscreen ownership

Add a shared `isMediaUiEvent(event)` check using composedPath, plus `mediaUiHasFocus` / drag-active state. Apply checks BEFORE game actions in `main.js`, `src/activities/inputSeam.js`, Pool/air-hockey/foosball capture handlers and Kart/Summit/Downhill routed input. Audit both keydown and keyup: neutralize already-held actions on focus/drag start so suppressed releases cannot leave steering, charging or firing stuck. This is targeted input ownership, not global suppression or a second game-input framework.

Only the floating rectangle/chip receives pointer events; any surrounding layer is pointer-events:none. Drag uses pointer capture on its HANDLE, touch-action:none there only, and clamps pointercancel/lostcapture. Media pointer events do not aim/shoot/walk. Keyboard activation retains visible focus in chrome; pointer clicks return focus to the canvas without stealing focus during keyboard traversal. Tab/Shift-Tab, Enter/Space and arrow positioning work without game actions. Escape while focusing chrome collapses enlarged mode or returns focus to game; outside chrome, preserve existing menu/activity Escape precedence. No global Escape-to-hide behavior. Provider iframe focus uses an explicit “Back to game” sibling control; cross-origin key events cannot be assumed observable.

Gamepad polling must submit neutral gameplay input while media controls own focus; no new controller navigation system is required, but standard keyboard/touch equivalents are. Online simulation continues, just as chat focus already neutralizes input.

No active shipped pointer-lock path was found. The generic future hook must preserve existing lock on automatic entry/resize/hide, never request or release lock automatically. Locked users use the browser unlock gesture, then interact with chrome; canvas click explicitly reacquires if the game supports it. Browser-consumed Escape must not also leave the activity on the same gesture; test with a synthetic pointer-lock activity harness. Do not claim a current game already uses this hook.

Keep all UI under the existing document root. Add a focused application fullscreen helper targeting `document.documentElement`, reachable from Settings, so the canvas, body-owned media and dialogs share fullscreen ancestry without reparenting. Supported modes are CSS viewport fill, browser-window fullscreen, and this app-root request. Never request fullscreen on just canvas or a provider frame for game presentation. Native provider fullscreen can exclude app UI and is outside the supported combined-game mode; while floating, suppress provider fullscreen affordances where the official API permits, and label the app-root action clearly. A denied/unsupported request leaves the layout working in-window and reports it locally. [Fullscreen API behavior](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide).

### D7. Verification and performance contract

Reuse Node's test runner with headless state tests; DOM component tests need a browser fixture (there is no React test stack). Add a browser gate modeled on `scripts/kart-royale-gate-browser.mjs` with deterministic local MP4/HLS fixtures and controlled provider adapter stubs. Real-provider manual tests supplement, rather than substitute for, deterministic engine-identity assertions.

Record engine object, video/iframe node, iframe contentWindow, loadToken and loadedPlayKey before/after enter, hide, drag, expand and exit. Assert unchanged identities, zero extra engine-start/teardown events, zero presentation-triggered manifest/document requests and no presentation-triggered seek/play/pause. Ongoing HLS segments are expected, not “duplicate connections.” Verify advancing currentTime for a playing fixture; preserve paused state too. Record a source change as a legitimate single replacement. Add mutation observation to catch removal/reinsertion that an element-count test would miss.

Run unit cases for every state/audio row, user edits, muted master/zero volume, duplicate callbacks, queue promotion, failed lazy imports, cancellation, stale promises, disconnect/ejection, viewport clamping, reservations and source disappearance. Extend current theater sync/grant/report tests; verify hidden and null-quad drift checks still execute. Browser controls tests must use capture listeners and real focus order, not just invoke callbacks.

Performance gate: three matched 60-second runs per representative Pool/Kart/Summit session, same renderer settings, viewport, stream and device, after warmup. Compare floating vs the SAME stream already decoding in primary presentation. Require median frame-time regression <=5% and p95 <=10% across runs, zero additional renderer/RAF/media pipelines, and bounded retained listeners/nodes after 20 enter/exit cycles. Investigate noisy or failed results rather than waive by changing thresholds. Hiding can reduce compositing but cannot promise reduced decoding; user requested continued playback.

Manual matrix (capture artifacts and actual outcomes):

| Dimension | Required cases |
| --- | --- |
| Games | Pool (F hold/release and drag), Kart (cold load/cancel, menu/results), Pong or Rain Runner, Summit Run, Downhill, air hockey/foosball smoke |
| Sources | MP4, native HLS/hls.js, granted torrent, YouTube, Vimeo, Twitch channel/VOD; unsupported/degraded modes explicitly tested |
| Audio | Previously audible, previously media-muted, master off, volume zero, explicit mute/unmute, mix duck, blocked autoplay |
| Layout | Desktop 1440×900, laptop 1280×720, 930px overlap breakpoint, 560px, 390px portrait, touch rotation, open keyboard, all corners reserved |
| Lifecycle | Loading, failed import, cancel, normal exit, game replacement, queue promotion, source replacement/end/disconnect, repeated snapshots |
| Input/display | Keyboard focus, pointer capture/cancel, controller held on focus, synthetic pointer lock, app-root fullscreen, browser fullscreen, modal above PiP |
| Visibility | Hide/restore while audible and muted, enlarge/reduce, source changes while hidden, resize while hidden, no active item |
| Multiplayer | Two clients: local UI operations emit no media actions or volume/position state; ordinary shared end/source changes still propagate |

## Risks / Trade-offs

- [Large, actively edited theater class] → keep engine ownership intact, extract only pure policy/layout, and review current worktree diffs before implementation. Do not revert Twitch/grant/preparation work.
- [Iframe audio control is not universally available] → see compatibility decision below; do not reload an embed just to mute it or claim successful mute on a degraded engine.
- [Provider minimum size / hidden playback / autoplay] → truthful compatibility UI and real-browser checks; do not forge provider state or assume native controls obey local mute policy.
- [Input capture order and HUD stacking] → audit existing listeners and stacking contexts; component-only tests cannot establish gameplay safety.
- [Long synchronous game initialization] → activate floating state before load and yield a browser paint before expensive initialization; preserve existing incremental preparation. No promise that CSS alone removes main-thread stalls.
- [Room travel loses media authorization] → end floating mode with the existing theater lifecycle; cross-room persistent playback would need a separate subscription/security proposal.

## Migration Plan

1. Freeze behavior with source-identity and audio-policy fixtures; recheck current uncommitted theater work.
2. Introduce pure local policy and stable-surface presentation in isolation; primary/cinema regressions must pass before integration.
3. Add the runtime presentation lease and bridge immediate and lazy entry/cancel paths, then opt existing modules into default behavior.
4. Add controls, responsive placement/reservations and input focus guards; verify Pool and Kart before broad rollout.
5. Complete fullscreen/pointer-lock contracts and browser/source/performance matrix; update README and architecture notes.
6. Enable behind a local developer opt-in during verification; ship default-on only after compatibility decisions and release gates pass. Rollback disables floating acquisition and restores primary CSS/audio on the same engine, without altering bill, grants or snapshots. No data migration.

## Provider compatibility decision

Proposed default, pending review of the audio exception: preserve gameplay and session continuity for uncontrollable sources. For a degraded Vimeo/Twitch fallback or Twitch clip, show the SAME frame with native audio controls available and a persistent “Use player audio controls — automatic mute unavailable” notice. The Afterlight speaker action is replaced with that explanation, never a false “Muted” icon. Do not reload, attempt cross-origin DOM access, stop the stream, gate unrelated gameplay, or change the shared bill. Even an iframe originally loaded muted is not reliable proof of current mute after native control use. This is a documented exception to AC3/AC4/AC12 for those adapters, not full compliance. If the product requires universal automatic mute, this proposal must be revised before enabling those providers; a plain clip iframe cannot supply that guarantee under the no-reload constraint.

Controlled file/HLS/torrent, ready YouTube/Vimeo and Twitch channel/VOD adapters are the required full-compliance set. While an SDK is loading, queue the mute policy before its first ready/play; if control subsequently degrades, transition to the honest exception notice. Source changes into an uncontrolled provider retain the floating session and display the notice. No new server feature is required. Tests must report controlled and exception outcomes separately.


## Acceptance traceability

| Requested criterion | Specification requirement / validation |
| --- | --- |
| AC1 automatic | Automatic shared activity presentation; task 6.1 |
| AC2 no empty player | Automatic shared activity presentation; tasks 1.3, 4.1 |
| AC3 muted entry | Entry mute and explicit local audio restoration; tasks 2.2, 6.1; uncontrolled-provider exception is explicitly not full compliance |
| AC4 easy unmute | Entry mute and explicit local audio restoration; tasks 2.2, 4.1; native controls exception for uncontrolled providers |
| AC5 continuity | Presentation preserves one playback session; tasks 2.4, 6.1 |
| AC6 no duplicate | Presentation preserves one playback session; tasks 2.4, 6.4 |
| AC7 shared framework | Automatic shared activity presentation; tasks 3.1–3.5 |
| AC8 gameplay input | Input and accessibility isolation; tasks 5.1, 5.2, 5.4 |
| AC9 drag | Dragging and responsive bounds; task 4.3 |
| AC10 responsive | Dragging and responsive bounds; tasks 4.2–4.5, with explicit provider-minimum fallback |
| AC11 exit | Exit and failure cleanup are generation safe; tasks 3.2–3.4, 6.1 |
| AC12 audio restoration | Entry mute and explicit local audio restoration; task 1.3; uncontrolled native audio cannot be restored exactly |
| AC13 loading | Automatic shared activity presentation; tasks 3.3, 3.4, 6.1 |
| AC14 end | Source evolution and recovery remain shared; task 6.2 |
| AC15 hide | Hide and enlarge are presentation controls; tasks 4.1, 6.2 |
| AC16 fullscreen | Fullscreen and layering preserve access; tasks 5.3, 6.3 |
| AC17 isolation | Locality and bounded overhead; task 6.2 |
| AC18 performance | Locality and bounded overhead; task 6.4 |

Proposal verification: existing code paths and entry points were inspected; OpenSpec strict validation passed. No application implementation, runtime test, browser gameplay test or performance claim is made by this planning change. The task list defines the checks the implementation must execute.

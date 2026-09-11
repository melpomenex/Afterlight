## Context

First-person look lives in two places: the pure rules in `src/cameraControl.js` (`classifyDrag`, `clampPitch`, covered by `tests/camera.test.js`) and the pointer gesture in `src/main.js` (~line 2009). Today a press that travels past `DRAG_THRESHOLD_PX` becomes a look-drag in first person; a press released below the threshold plants a walk target in `endPress`. The same clamped yaw/pitch update (`fpYaw -= dx * LOOK_SENS_YAW; fpPitch = clampPitch(fpPitch - dy * LOOK_SENS_PITCH)`) is inlined in the press-drag branch.

Preferences follow an established pattern: a namespaced localStorage key (`afterlight-*-v1`), tolerant read, and session-only fallback when storage fails. `src/ui/placeHudPolicy.js` (`LEGACY_UI_PREF_KEY`) is the pure, storage-injected, tested exemplar; `afterlight-footsteps` and `afterlight-atmosphere-v1` are simpler inline variants in `main.js`. The settings dialog (`#settings-dialog` in `index.html`) wires controls through `$('id').onchange/oninput` in `main.js`.

See proposal.md for motivation and specs/camera-views/spec.md for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Mouse movement over the canvas turns the first-person view with no button held (default on), sharing one clamped look-update rule with the drag path.
- A Settings checkbox switches back to press-and-drag look; the preference persists and applies immediately.
- Zero regression to click-to-walk, tap-to-walk, seated look, travel, dialogs, emote wheel, or the theater overlay.

**Non-Goals:**

- Pointer lock / pointer capture of any kind (cursor stays visible).
- Mouse look or orbiting for the three isometric views.
- Look-sensitivity slider, invert-Y option, or per-place look overrides.
- Any change to touch input semantics (touch keeps press-drag look in both modes).

## Decisions

**D1 — Hover-follow deltas, no pointer lock.** Look applies on `pointermove` over `renderer.domElement` with `pointerType === 'mouse'`, using per-event deltas (`movementX/movementY`, falling back to manual last-position deltas). Alternatives: pointer lock (rejected — hides the cursor, breaks click-to-walk semantics while locked, adds lock/unlock UX the user did not ask for) and "camera pans toward cursor position" (rejected — not what "move with the mouse" means; changes view framing continuously).

**D2 — One shared look update.** Extract the clamped look update into a pure `applyLookDelta(yaw, pitch, dx, dy)` in `src/cameraControl.js`; both the hover path and the drag path call it. Keeps sensitivity/direction/clamps in one tested place (`tests/camera.test.js`) so the two paths cannot drift. Alternative: leave the inline arithmetic in `main.js` and only gate it (rejected — duplicated camera math across two new call sites).

**D3 — Gate the hover path, keep the press pipeline intact.** The hover look applies only when: camera mode is first person, `!paused`, the emote wheel is closed, and `pointerType === 'mouse'`. Because the listener is on the canvas itself, HUD DOM elements above it naturally intercept their own pointer events — no extra hit-testing. The press pipeline keeps `classifyDrag` exactly as today so a press that moved still never plants a walk target on release; when mouse look is on, the press-drag look branch is redundant (movement while held is already hover-look) and simply doesn't double-apply. When mouse look is off, behavior is byte-for-byte today's gesture. Touch (`pointerType === 'touch'`) never takes the hover path, satisfying the touch scenario in both modes.

**D4 — Preference as a tiny pure module, `afterlight-mouse-look-v1`.** New `src/ui/mouseLookPreference.js` modeled on `placeHudPolicy.js`: injected storage, tolerant read (missing/corrupt → enabled), try/catch write that degrades to session-only. Settings wiring: checkbox `#mouse-look` in `#settings-dialog`, initialized from the preference, `onchange` writes it and flips the in-memory flag immediately (no dialog-close requirement). Alternative: inline localStorage in `main.js` like footsteps (rejected — the legacy-HUD precedent established the pure+tested pattern for behavior-switching preferences, and the spec's persistence scenarios deserve direct test coverage).

**D5 — Camera mode/yaw/pitch stay session-local.** The preference changes input behavior only; camera mode, yaw, and pitch remain never-saved, never-synced presentation state per the runtime architecture rules. No multiplayer message, save-shape, or server change.

## Risks / Trade-offs

- [View turns while the mouse travels toward a click-to-walk target] → Inherent to hover-follow (user-selected mechanism); cursor stays visible so the coupling is predictable; the click raycasts at release against the current view, so the walk target is always where the player clicked.
- [Large `movementX` spike on pointer re-entry in some browsers] → Clamp per-event delta magnitude before applying; trivial and silent.
- [Mouse look fighting seated/theater UI] → Seated look is the same yaw/pitch state; cinema view and dialogs already pause or overlay the canvas, and the existing gates (`paused`, emote wheel) apply to the hover path too.
- [Stale muscle memory after toggling] → The toggle applies instantly and the README/settings copy states the active mode; no state is lost by flipping it.

## Migration Plan

Additive client change: new preference key, new Settings control, restructured pointermove handler. No data migration; unknown/missing preference defaults to enabled, which is the new default behavior. Rollback is a plain revert; the leftover localStorage key is inert.

## Open Questions

None. Mechanism (hover-follow) and scope (first person only) were confirmed with the user.

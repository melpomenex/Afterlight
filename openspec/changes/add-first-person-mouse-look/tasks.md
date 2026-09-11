## 1. Pure rules and preference module

- [x] 1.1 Add pure `applyLookDelta(yaw, pitch, dx, dy)` to `src/cameraControl.js` (shared sensitivity constants, `clampPitch` applied, per-event delta magnitude clamp for pointer re-entry spikes); extend `tests/camera.test.js` with clamping, direction, and shared-rule cases
- [x] 1.2 Create `src/ui/mouseLookPreference.js` on the `placeHudPolicy.js` pattern: key `afterlight-mouse-look-v1`, injected storage, tolerant read defaulting to enabled, try/catch write with session-only fallback; cover read defaults, round-trip, and storage-failure fallback in a new `tests/mouse-look-preference.test.js`

## 2. Input wiring in main.js

- [x] 2.1 Restructure the canvas `pointermove` handler: keep the press pipeline and `classifyDrag` walk-suppression exactly as today; add a hover-look path gated on first-person mode, `pointerType === 'mouse'`, `!paused`, and closed emote wheel, calling `applyLookDelta`; when mouse look is on, do not double-apply the press-drag look branch; when off, behavior is unchanged
- [x] 2.2 Route both the drag look branch and the hover path through `applyLookDelta` so sensitivity/direction/clamps live in one place

## 3. Settings UI and persistence

- [x] 3.1 Add the "Mouse look" checkbox (`#mouse-look`, default checked) to `#settings-dialog` in `index.html` with label styling consistent with the existing controls; wire `onchange` in `main.js` to flip the in-memory flag immediately and persist via the preference module; initialize from the preference at startup

## 4. Docs and verification

- [x] 4.1 Update README controls copy: first person look follows the mouse by default; hold-drag fallback and the Settings toggle described
- [x] 4.2 Run `npm test` and `npm run build`; resolve real failures
- [x] 4.3 Verify in the browser on the running dev stack: default mouse look in first person (view follows mouse, pitch clamps), click-to-walk still plants targets and dragged presses still never walk, Settings toggle flips look input immediately both ways, preference survives reload, seated look works in both modes, isometric views unchanged, no console errors
  - Note: the agent's in-app browser could not run the game (WebGL world never finished initializing; capture hangs), so gameplay verification was done by the user in their own browser, who confirmed the feature works. `npm test` (1340/1340) and `npm run build` passed in the agent environment.
- [x] 4.4 Confirm touch path reasoning (drag look regardless of toggle) by code inspection since browser tooling cannot emulate touch drag; state this limitation in the handoff
  - Inspection: touch `pointermove` carries `pointerType === 'touch'`, so it never enters the hover-look branch (mouse-only); the drag-look branch condition `!(mouseLookEnabled && isMouse)` keeps press-drag look active for touch whether the setting is on or off, with the dragged-press-never-walks rule unchanged.

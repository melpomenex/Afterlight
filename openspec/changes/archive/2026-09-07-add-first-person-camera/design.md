# Design: First-Person Camera View

## Context

`src/main.js` owns a single `THREE.OrthographicCamera` (line ~34) consumed in five places:

1. `RenderPass(scene, camera)` in the bloom composer (~line 39)
2. Click-to-walk: `ray.setFromCamera(..., camera)` on the canvas `pointerdown` (~line 926)
3. `resize()`, which sets the ortho frustum from `zoom` (~lines 969–980)
4. Frame-loop follow: `offsets[cameraMode]` + `lookAt(look)` (~lines 1112–1116)
5. Theater screen overlay: projects `screenQuad` corners with `camera` into a CSS `matrix3d` (~lines 1122–1131)

`cameraMode` (0–2) cycles via `$('camera').onclick` (`% 3`) and `KeyC`; movement rotates input by `[π/4, 0, -π/4][cameraMode]` around Y (~line 1016); the avatar faces travel direction (`atan2(dx, dz)`). Pointer input is a single `pointerdown` handler on `renderer.domElement` that plants a walk target immediately — there is no `pointermove`/`pointerup` handling, so drag-look needs a new gesture classifier. Sitting (`seated`, `standUp()`, `seated.rotY`) and cinema view (`theaterUI.isWatching()`) already intercept `pointerdown` and movement keys. There is no pointer-lock anywhere and we are not adding one (user decision: drag to look).

## Goals / Non-Goals

**Goals:**
- Fourth view in the existing cycle with zero regression to the three isometric modes.
- One active-camera seam so composer, raycast, resize, follow, and theater projection all agree.
- Drag-to-look that provably never breaks click-to-walk (threshold classifier, tested pure).
- Testable camera math extracted out of `main.js`, following the `shared/theaterModel.js` precedent.

**Non-Goals:**
- No pointer lock, no free-look mouselook mode, no head bob beyond what exists.
- No protocol/presence change (camera is local), no save-schema change (camera choice is session-only).
- No elevation/height rework: picking and movement stay on the y=0 plane (see AGENTS.md §6); the camera merely *views* from eye height.
- No touch joystick; touch gets the same tap-walk / drag-look split as mouse.

## Decisions

### D1. Two camera objects behind one `activeCamera` reference
Keep the existing ortho camera for modes 0–2; add one `THREE.PerspectiveCamera` (fov ≈ 58, near 0.1, far 150 — matches existing far plane and fog range) used only in mode 3. A module-level `let activeCamera` is assigned on every mode change and frame; the five consumers switch from `camera` to `activeCamera` (RenderPass exposes a settable `.camera`; the rest are direct references).

*Rationale:* swapping projection types on one camera object (`OrthographicCamera`/`PerspectiveCamera` are distinct classes) means reallocating and re-tuning frustum state on every toggle; two instances with a reference swap is simpler and keeps `zoom` state intact for the iso modes. *Alternative considered:* making the single camera always-perspective and simulating ortho — rejected: large far/near and frustum tricks distort the established isometric framing.

### D2. First-person follow in the frame loop, not a second render path
Mode 3 keeps the same `frame()` structure: instead of `offsets[cameraMode]`, set `activeCamera.position` to the eye point — `player.position + (0, EYE, 0)` where `EYE ≈ 1.55` (fits the avatar's proportions; seated uses the seat position + a lower seated eye height ≈ 1.05) — and orientation from `fpYaw`/`fpPitch` via `activeCamera.rotation.set(fpPitch, fpYaw, 0, 'YXZ')`. `look` lerp is untouched for modes 0–2. Initial `fpYaw` on entering first person follows the avatar's current facing (`player.rotation.y`) so the view doesn't snap arbitrarily.

*Rationale:* reusing the loop honors the "no second RAF loop" rule and keeps theater projection ordering (camera updated → project → overlay) automatically correct.

### D3. Gesture classifier: `pointerdown` defers, `pointerup` decides
Replace the immediate walk-target plant with: `pointerdown` records origin (with `setPointerCapture`); `pointermove` beyond `DRAG_THRESHOLD ≈ 6 px` (scaled by pixel ratio is unnecessary; CSS px suffice) marks the gesture a *drag* and, only in mode 3, feeds `fpYaw -= dx * LOOK_SENS` / `fpPitch` clamped to `[-0.9, +0.7]` rad (~-52°/+40°); `pointerup` plants the walk target **only if the gesture never became a drag** (and the existing seated/cinema-view early-outs move to `pointerup` so a drag doesn't stand the player up or exit cinema view unintentionally — a plain tap still does both, preserving today's behavior).

*Rationale:* the current handler mutates game state on `pointerdown`; moving that mutation to `pointerup` (for non-drags) is the minimal change that makes "a drag never walks" structurally true rather than a special case. *Alternative considered:* drag-look on right-button only — rejected: right-click is not part of the game's input vocabulary and touch has no reliable equivalent.

### D4. Movement basis as a pure function
Extract `moveBasis(cameraMode, fpYaw)` (plus `nextCameraMode`, `clampPitch`, `classifyDrag`) into `src/cameraControl.js`. Mode 3 computes the forward/right vectors from `fpYaw` (matching the avatar convention `atan2(dx, dz)`, so W walks the way the camera faces and the remote-visible avatar still turns correctly via the existing `move()`). Modes 0–2 keep the existing `applyAxisAngle` table, relocated into the helper unchanged.

*Rationale:* the mode-index/yaw math is exactly the kind of thing `tests/districts.test.js`-style node tests can cover; `main.js` keeps only wiring.

### D5. Avatar visibility and seat integration
Mode 3 sets `player.visible = false` (whole avatar; its shadow disappears — accepted, restores on exit). Entering first person while seated is allowed: eye position derives from the seated snap position and `seated.rotY` initializes `fpYaw`; `standUp()` paths are untouched and simply leave mode 3 active in the standing pose. Kiln and remote players are never hidden.

*Rationale:* `player.visible` is a single flag all pose code already respects; per-part hiding would fight the sit/stand pose logic for no visual gain (the camera is inside the head either way).

### D6. Wheel is a no-op in first person
The wheel handler updates the ortho `zoom` and calls `resize()`; in mode 3 it does nothing (no FOV zoom — one less state axis to test, and the spec requires no wheel behavior). `resize()` updates ortho bounds for modes 0–2 and perspective aspect for mode 3.

### D7. Theater overlay and cinema view
`updateScreenQuad` projection switches to `activeCamera` — a perspective projection of a planar quad is still exactly a `matrix3d` homography, so `theaterScreen.js` needs no math change, only the guarantee that the write happens after the camera update (already true). Cinema view is a DOM reflow; it composes with first person without interaction. Escape priority stays: cinema-view exit → settings (existing handler unchanged).

### D8. Session-only, local-only
`cameraMode`/`fpYaw`/`fpPitch` live in module state: not saved, not synced. Reload starts in the default isometric view (same as today). This keeps the save schema and protocol frozen.

## Risks / Trade-offs

- [Drag-look regressions breaking click-to-walk] → the classifier is a tested pure function; the walk plant moves to `pointerup` for *all* modes with a threshold of 0 for modes 0–2 so their behavior is byte-identical in outcome.
- [Hidden avatar removes the player's shadow in FP] → accepted (standard FPS trade-off); Kiln + everyone else keep full contact shadows.
- [Perspective near-plane clipping into walls/props when backing against geometry] → near = 0.1 and collision keeps the eye ~0.4 inside the walkable hull; camera never collides because it is a fixed offset of a collision-constrained position.
- [Performing lookups (E) at things slightly off-center] → interaction search stays the existing 2-unit radius around the player, unaffected by view direction; no crosshair is added in this scope.
- [Cycling from the Camera button while a dialog is open] → mode change is harmless when paused (frame loop already skips world updates; the render still reflects the new mode on resume). No special handling needed.

## Migration Plan

Additive client change behind existing controls; no data, protocol, or server migration. Rollback = revert the commit. Sequence: pure helper module + tests → active-camera seam (all five consumers) → FP follow/visibility → gesture classifier → seat/wheel/resize polish → docs + browser verification.

## Open Questions

None. (Eye height, fov, thresholds, and pitch limits are tunable constants recorded here; they do not change the spec.)

# Tasks: First-Person Camera View

## 1. Pure camera helpers + tests

- [x] 1.1 Create `src/cameraControl.js` with pure helpers: `nextCameraMode(mode)` (4-view wrap), `moveBasis(cameraMode, fpYaw)` (iso angle table unchanged for 0–2; yaw-based forward/right for 3), `clampPitch(p)`, `classifyDrag(startX, startY, x, y, isDragging)` returning drag state beyond a 6 px threshold
- [x] 1.2 Create `tests/camera.test.js` covering: cycle wrap 0→1→2→3→0; mode 0–2 basis equals the existing `[π/4, 0, -π/4]` rotation table; mode 3 forward matches `atan2` heading convention; pitch clamps at limits; sub-threshold press classifies as click, beyond-threshold as drag
- [x] 1.3 Run `npm test` and confirm the new suite passes alongside existing suites

## 2. Active-camera seam

- [x] 2.1 Add `THREE.PerspectiveCamera` (fov ≈ 58, near 0.1, far 150) and an `activeCamera` reference in `src/main.js`; assign per mode
- [x] 2.2 Point all five consumers at `activeCamera`: RenderPass `.camera`, click raycast `setFromCamera`, `resize()` (ortho bounds for 0–2, aspect for 3), frame-loop follow, theater `screenQuad` projection
- [x] 2.3 Make the wheel handler a no-op for mode 3 (ortho zoom untouched); verify isometric zoom still works in modes 0–2
- [x] 2.4 Verify no regression: game renders and click-to-walk works in all three isometric views after the seam refactor (before any FP behavior exists)

## 3. First-person behavior

- [x] 3.1 Extend the camera cycle: `$('camera').onclick` and `KeyC` use `nextCameraMode`; on entering mode 3 initialize `fpYaw` from `player.rotation.y` and `fpPitch` to 0
- [x] 3.2 Frame-loop FP follow: eye position `player.position + (0, EYE, 0)` (EYE ≈ 1.55), `rotation.set(fpPitch, fpYaw, 0, 'YXZ')`; iso modes keep the existing `offsets`/`look` lerp path
- [x] 3.3 Hide `player` in mode 3, restore on any other mode (including after sit/stand transitions and travel)
- [x] 3.4 Wire mode-3 movement through `moveBasis(3, fpYaw)` so WASD/arrows are view-relative; confirm Shift-run, collision, bounds, and click-to-walk targets unchanged
- [x] 3.5 Seated FP: when `seated` in mode 3, place the eye at the seat position with a lowered eye height (≈ 1.05) and initialize `fpYaw` from `seated.rotY`; verify `standUp()` returns to standing FP

## 4. Drag-to-look input

- [x] 4.1 Restructure canvas pointer handling: `pointerdown` records origin (+ `setPointerCapture`), `pointermove` classifies drag and (mode 3 only) applies `fpYaw`/`clampPitch`, `pointerup` plants the walk target only for non-drag gestures
- [x] 4.2 Move the seated/cinema-view `pointerdown` early-outs (stand up / leave watch mode) to the non-drag `pointerup` path so drags never stand the player up or exit cinema view, while plain taps keep today's behavior in every mode
- [x] 4.3 Verify touch: tap walks and drag turns in first person; tap-to-walk still works in isometric views

## 5. Docs

- [x] 5.1 README: controls section — four camera views, drag-to-look vs. click-to-walk, seated first person; note wheel zoom applies to the isometric views
- [x] 5.2 AGENTS.md: active-camera integration points (composer/raycast/resize/follow/theater projection), gesture-classifier contract, `src/cameraControl.js` in the repository map

## 6. Verification

- [x] 6.1 `npm test` and `npm run build` pass; resolve real errors only
- [x] 6.2 Browser check (dev server): cycle all four views via C and the button; FP shows ground-level world, no own avatar, Kiln follows; walk/strafe relative to view; drag turns view without planting a target; click still walks
- [x] 6.3 Theater check: sit in FP → seated eye facing screen, drag-look works in chair, screen overlay stays anchored while media plays; stand up and Escape ordering unchanged
- [x] 6.4 Systems check: travel while in FP lands at the new entrance in FP with working interactions/HUD; dialogs, chat input (Enter/`/`), settings pause, and isometric views all unaffected; second client in room sees no state change
- [x] 6.5 Reload: game starts in the default isometric view, no console errors attributable to the change

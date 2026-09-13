## 1. Pointer Lock & Cursor State Management

- [x] 1.1 Update `setCameraMode` in `src/main.js` to set canvas `cursor = 'none'` and request pointer lock when entering `FP_MODE`, and restore default cursor and exit pointer lock when leaving `FP_MODE`, verifying with camera mode toggles.
- [x] 1.2 Add click-to-relock on canvas `pointerdown` in `src/main.js` when in `FP_MODE` and not currently locked, verifying canvas clicks re-engage pointer lock.
- [x] 1.3 Ensure UI dialogs (Settings, Places selector, Chat) and Escape release pointer lock to restore normal cursor interaction while menus are open, verifying cursor is visible when menus are active.

## 2. Relative Motion & First-Person Look Input

- [x] 2.1 Update pointer move event handling in `src/main.js` to consume `movementX` and `movementY` for first-person look rotation, eliminating boundary stops and cursor off-screen issues, verifying continuous rotation without cursor escaping.
- [x] 2.2 Verify click-to-walk and touch controls in first person continue to function properly without unwanted walk target placement during mouse-look.

## 3. Testing & Verification

- [x] 3.1 Add unit tests in `tests/camera.test.js` to verify relative motion handling and delta clamping.
- [x] 3.2 Run `npm test` and `npm run build` to verify all automated tests pass and production build succeeds without regressions.

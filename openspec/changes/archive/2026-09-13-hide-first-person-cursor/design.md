## Context

First-person view currently tracks mouse coordinates using raw viewport positions (`clientX`, `clientY`) and displays a `'grab'` cursor. When moving the mouse to rotate the camera, the cursor reaches the window boundary or leaves the canvas, resetting tracking and halting rotation.

The codebase already contains a well-tested `createPointerLockBridge` module in `src/ui/pointerLockBridge.js` and an instantiated `pointerLock` bridge in `src/main.js`. It includes support for `requestFromGesture()`, `exit()`, `isLocked()`, and consuming the browser's Escape unlock event via `consumeUnlockEscape()`.

## Goals / Non-Goals

**Goals:**
- Automatically request pointer lock when entering first person via user gesture (C key or Camera button).
- Hide the cursor when in first person (`cursor: none` on the canvas plus browser pointer-lock cursor suppression).
- Use relative movement deltas (`movementX`, `movementY`) for camera look calculations, eliminating screen-edge stops.
- Release pointer lock when leaving first person, pressing Escape, or opening dialogs (Settings, Places, Chat).
- Re-acquire pointer lock when clicking the canvas while in first person.
- Retain touch drag-to-look without requesting pointer lock.

**Non-Goals:**
- Changing isometric view cursor or click-to-walk behavior.
- Adding a mandatory screen crosshair UI.
- Modifying multiplayer network messages or server state.

## Decisions

### 1. Integrate with existing `pointerLock` bridge
- **Choice**: Use the existing `createPointerLockBridge` instance in `src/main.js`.
- **Rationale**: The bridge already manages lock state, listener cleanup, error catching, and the `consumeUnlockEscape()` contract needed to prevent Escape key conflicts.
- **Alternatives considered**: Directly invoking `document.body.requestPointerLock()`. Rejected because it would bypass existing escape consumption and state synchronization.

### 2. Camera cycle and canvas click as lock triggers
- **Choice**: Request pointer lock on entering first-person view from a user gesture (keyboard `C` or Camera button click), and on canvas `pointerdown` when in first-person mode if currently unlocked.
- **Rationale**: Browsers enforce that `requestPointerLock()` must originate from a user gesture. Key presses and button clicks satisfy this requirement. Clicking the canvas after unlocking (e.g. after Escape) provides an intuitive re-lock mechanism.
- **Alternatives considered**: Constantly polling for lock. Rejected because browser security policies require user gesture triggers.

### 3. Pointer move delta source (`movementX` / `movementY` with fallback)
- **Choice**: When processing mouse movement in first person, read `e.movementX` and `e.movementY` when available/locked, falling back to `clientX - hoverLast.x` if unlocked or unsupported.
- **Rationale**: When pointer lock is active, `clientX` and `clientY` are static, making `movementX`/`movementY` the authoritative source for relative displacement.
- **Alternatives considered**: Relying only on `clientX` delta. Fails completely during pointer lock because `clientX` does not change.

### 4. Cursor style handling
- **Choice**: Set `renderer.domElement.style.cursor = cameraMode === FP_MODE ? 'none' : ''`.
- **Rationale**: While the browser automatically hides the OS cursor when pointer lock is active, setting CSS `cursor: none` ensures the cursor is hidden immediately even during the brief window before lock resolves, or if lock is pending a canvas click. When returning to isometric modes, clearing the style restores standard cursor behavior.
- **Alternatives considered**: Keeping `cursor: grab`. Rejected because the cursor remains visibly distracting before or between locks and directly contradicts user requirements.

### 5. Dialog and Escape interactions
- **Choice**: Exiting first-person mode, pressing Escape, or opening overlay dialogs (Settings, Places, Chat) releases pointer lock via `pointerLock.exit()`.
- **Rationale**: The user must be able to interact with UI buttons and inputs freely with a visible cursor when dialogs are opened.

## Risks / Trade-offs

- **[Risk]**: Browser blocks pointer lock on keydown in certain environments or if user denied permission.
  - **Mitigation**: `pointerLockBridge` safely catches errors without throwing. `pointerdown` on canvas provides a secondary gesture trigger. If pointer lock fails, fallback mouse tracking continues to function.
- **[Risk]**: Click-to-walk in first person while pointer locked could use locked coordinates.
  - **Mitigation**: When pointer locked, raycasting for click-to-walk can target center-screen `(0, 0)` forward direction or the locked position cleanly, ensuring tap-to-walk still functions without glitching.

## Migration Plan

No data migration, network changes, or storage schema changes required. Rollback is a simple git revert.

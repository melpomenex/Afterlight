## Why

In first-person view, mouse-look camera movement currently leaves the system cursor visible and unlocked. As the player moves the mouse to look around, the cursor travels across the viewport, frequently hitting the screen edges or leaving the canvas entirely, which halts view rotation and breaks immersion. Hiding the cursor and locking the pointer to the game canvas allows continuous, uninterrupted camera rotation without the cursor moving off-screen.

## What Changes

- **Pointer lock in first person**: When entering first-person mode (via the Camera toggle button, C key, or by clicking the canvas while in first person), the game requests pointer lock on the world canvas.
- **Hidden cursor**: While in first-person view, the cursor is hidden (both natively via pointer lock and styled with `cursor: none` on the canvas).
- **Continuous relative look input**: First-person camera look uses relative pointer movements (`movementX`, `movementY`) from pointer events, allowing continuous 360-degree rotation without encountering viewport or canvas boundaries.
- **Graceful pointer release**: Leaving first-person view (cycling back to isometric camera modes), pressing Escape, or opening dialogs (Settings, Places selector, Chat) releases pointer lock and restores the visible cursor immediately.
- **Click to re-lock**: If pointer lock is released while the camera remains in first person (such as after pressing Escape or closing a dialog), clicking on the canvas re-requests pointer lock.
- **Touch and fallback compatibility**: Touch devices continue to use touch-drag looking without pointer lock, and environments that reject pointer lock gracefully fall back to existing mouse tracking without crashing.

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `camera-views`: Updates first-person look and presentation requirements so that first-person view engages pointer lock on the canvas, hides the mouse cursor, uses continuous relative mouse movement for look rotation, and releases lock upon leaving first person or opening UI dialogs.

## Impact

- `src/main.js`: Connect first-person camera transitions and canvas interactions to pointer lock acquisition/release, hide canvas cursor in first person, and adapt pointer move handling to utilize pointer-locked relative motion (`movementX`/`movementY`).
- `src/ui/pointerLockBridge.js`: Ensure pointer lock bridge supports first-person camera lock lifecycle and state queries.
- `src/cameraControl.js`: Update or verify delta look calculations with relative movement inputs.
- `tests/camera.test.js`: Test look delta and first-person camera input rules with pointer movement values.
- `README.md`: Document first-person pointer-lock behavior and Escape-to-unlock convention.

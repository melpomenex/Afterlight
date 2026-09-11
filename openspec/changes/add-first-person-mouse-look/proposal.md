## Why

Looking around in first person currently requires holding the left mouse button and dragging, which fights the instinct to just move the mouse. First-person look should follow mouse movement by default — no button held — while keeping the existing hold-drag behavior available behind a Settings toggle for players who prefer it.

## What Changes

- First-person look input gains a **mouse-look mode, on by default**: moving the mouse over the game view turns the view (yaw and pitch with the existing sensitivity and pitch clamps) without any button held. No pointer lock is used — the cursor stays visible and no browser capture is requested.
- A **Settings toggle** ("Mouse look" checkbox in the settings dialog, default checked) switches first-person look back to today's press-and-drag gesture when unchecked. The preference persists in localStorage (session-only when storage fails), following the existing preferences pattern.
- **Click-to-walk is unchanged in both modes**: a press released below the drag threshold still plants a walk target; with mouse look on, mouse movement alone is look and never plants a target; a held-button drag continues to never plant one.
- **Seated first person** follows the same rule: mouse look works from a chair when enabled, drag-to-look remains when disabled.
- **Touch keeps drag-to-look in both modes** — hover does not exist on touch, so the toggle only governs mouse movement.
- Mouse look applies only to first person (mode 3). The three isometric views keep fixed angles and are untouched.
- Look input stays suppressed during pause, dialogs, chat typing, and the emote wheel, exactly as the gesture system is today.

## Capabilities

### New Capabilities

- *(none)*

### Modified Capabilities

- `camera-views`: The "Drag to look, click to walk" requirement changes — first-person look input becomes hover-follow mouse look by default (mouse movement turns the view with no button held), with the hold-drag gesture retained as a Settings-controlled fallback; the click-to-walk split, pitch clamps, and touch behavior are preserved.

## Impact

- `src/cameraControl.js` — pure look-input rules (mouse-look gating/classification alongside `classifyDrag`); covered by `tests/camera.test.js`.
- `src/main.js` — pointer handlers on `renderer.domElement` (mousemove look path beside the existing press gesture), settings-dialog wiring, preference persistence.
- `index.html` / `src/style.css` — the new Settings control, matching the existing label/checkbox styling.
- `README.md` — first-person controls copy.
- No server, multiplayer-message, or save-shape changes; the only persisted state is a new localStorage preference key.

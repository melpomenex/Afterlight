# Add First-Person Camera View

## Why

Afterlight is only ever seen from above: the three camera views are fixed isometric angles, so the city's street-level detail — masonry at eye height, signage, window light, the theater screen from the front row — is never experienced the way its inhabitants would see it. A first-person view as a fourth camera view lets players walk the city at ground level with the same controls, and pairs naturally with the theater's sit-and-watch loop.

## What Changes

- The **C key / Camera button** cycles four views: the three existing isometric modes, then **first person** (wrapping back). One control, no new input mode.
- **First-person presentation**: a perspective camera at the player's eye height. The player's own avatar is hidden while in first person; Kiln, remote players, lighting, fog, bloom, and the world itself are unchanged. The three isometric views behave exactly as today.
- **Drag to look**: pressing and dragging on the world turns the view (yaw with a clamped pitch); a plain click below the drag threshold still plants a walk target exactly as today, and a drag never plants one. Works for mouse and touch (tap = walk, drag = look).
- **View-relative movement**: in first person, WASD/arrows move relative to the view heading (W = forward along where you look); in the isometric views movement stays camera-angle-relative as now. Click-to-walk, Shift-run, E interaction, and collision are unchanged.
- **Seated first person**: sitting in a theater seat while in first person places the camera at seated eye height facing the chair's direction, so a player can watch the shared screen from their own chair; standing (E/movement/Escape flow) returns to normal first person.
- **Rendering integration**: the renderer, bloom composer, click-to-walk raycast, and the theater screen overlay projection all use whichever camera is active, so the homography-anchored screen stays correct in first person. Camera choice is local to each client — no protocol or server change.
- Documentation updates (README controls, AGENTS.md architecture note) and tests for the extracted camera math.

User-confirmed decision: **drag to look** (no pointer lock — chat, dialogs, HUD, and cinema view keep working untouched).
Recorded assumption: first person joins the existing C cycle as the fourth view.

## Capabilities

### New Capabilities
- `camera-views`: The camera system as player-facing behavior — the four-view cycle, first-person presentation and movement, drag-to-look input, seated first person, and how the view interacts with travel, dialogs, and the theater screen.

### Modified Capabilities
- (none — no capability has been archived yet; isometric view behavior is unchanged and first-person behavior is specified under `camera-views`)

## Impact

- **Client**: `src/main.js` — camera cycle (`% 3` → `% 4`), an active-camera abstraction (orthographic for the three isometric modes, perspective for first person) used by the RenderPass, resize, click-to-walk raycast, and theater overlay projection; first-person follow logic in the frame loop (eye height, yaw/pitch state); pointer handling gains drag-look vs. click-walk disambiguation on `renderer.domElement`; player avatar visibility in first person; seated eye placement. New small pure module (e.g. `src/cameraControl.js`) for mode cycling, movement basis, pitch clamp, and drag-threshold classification so it is testable without a renderer.
- **No server/shared changes**: the camera is a local presentation concern; `shared/` and `server/` are untouched.
- **UI**: `index.html`/`src/style.css` only if the camera button's accessible name or a subtle cursor affordance needs updating; no new panels.
- **Tests**: new `tests/camera.test.js` for the pure camera helpers (cycle wrap, view-relative movement basis, pitch clamps, drag/click classification); existing suites unchanged.
- **Docs**: README (four views, drag-to-look, seated first person), AGENTS.md (active-camera integration points and the drag-vs-click input contract).

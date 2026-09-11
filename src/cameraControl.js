// Pure camera-mode math: view cycling, movement basis, pitch clamping, and
// pointer drag classification. Deliberately free of renderer dependencies so
// node tests can exercise the rules directly (tests/camera.test.js).

export const ISO_MODES = 3; // Fixed isometric views (modes 0-2)
export const FP_MODE = 3; // First person, appended to the cycle
export const CAMERA_MODES = 4;
export const DRAG_THRESHOLD_PX = 6; // Pointer travel that turns a press into a look-drag
export const LOOK_SENS_YAW = 0.005; // rad per px of look movement (drag or hover)
export const LOOK_SENS_PITCH = 0.004; // rad per px
export const MAX_LOOK_STEP_PX = 250; // Per-event delta clamp: absorbs pointer re-entry spikes
export const PITCH_MIN = -0.9; // rad (~-52°): furthest look-down
export const PITCH_MAX = 0.7; // rad (~+40°): furthest look-up

// Rotation applied to WASD input per isometric mode (existing behavior).
const ISO_ANGLES = [Math.PI / 4, 0, -Math.PI / 4];

export function nextCameraMode(mode) {
  return (mode + 1) % CAMERA_MODES;
}

export function clampPitch(pitch) {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));
}

// Maps raw WASD input (moveX/moveZ) to a world-space direction for the
// current view. Modes 0-2 rotate the input around Y exactly like the original
// applyAxisAngle table; first person uses the view yaw so W walks toward
// where the camera looks and A/D strafe. The result is intentionally not
// normalized — diagonal input stays longer until move() normalizes it,
// matching the original code path.
export function moveBasis(cameraMode, fpYaw, moveX, moveZ) {
  if (cameraMode === FP_MODE) {
    const sin = Math.sin(fpYaw);
    const cos = Math.cos(fpYaw);
    // Camera forward is -Z rotated by yaw; right is forward turned -90°.
    const fwdX = -sin, fwdZ = -cos;
    const rightX = cos, rightZ = -sin;
    // Input W is moveZ = -1, so forward walking scales the forward vector by -moveZ.
    return {
      x: rightX * moveX + fwdX * -moveZ,
      z: rightZ * moveX + fwdZ * -moveZ,
    };
  }
  const angle = ISO_ANGLES[cameraMode] ?? 0;
  return {
    x: moveX * Math.cos(angle) + moveZ * Math.sin(angle),
    z: -moveX * Math.sin(angle) + moveZ * Math.cos(angle),
  };
}

// A press becomes a look-drag once the pointer travels beyond the threshold;
// once dragging it stays dragging until release, so jitter at the boundary
// cannot flicker a drag back into a click.
export function classifyDrag(startX, startY, x, y, alreadyDragging) {
  return alreadyDragging || Math.hypot(x - startX, y - startY) > DRAG_THRESHOLD_PX;
}

// The single look-update rule shared by the drag and hover paths: mouse-right
// looks right (yaw decreases), mouse-up looks up (non-inverted), pitch stays
// clamped. Per-event deltas are clamped so a pointer re-entry spike cannot
// whip the view.
export function applyLookDelta(yaw, pitch, dx, dy) {
  const stepX = Math.max(-MAX_LOOK_STEP_PX, Math.min(MAX_LOOK_STEP_PX, dx));
  const stepY = Math.max(-MAX_LOOK_STEP_PX, Math.min(MAX_LOOK_STEP_PX, dy));
  return {
    yaw: yaw - stepX * LOOK_SENS_YAW,
    pitch: clampPitch(pitch - stepY * LOOK_SENS_PITCH),
  };
}

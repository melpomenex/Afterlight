/**
 * Camera ownership seam for activities.
 *
 * Implements the camera ownership and restoration requirements in:
 *   - openspec/changes/add-place-activities-program/specs/place-activities/spec.md
 *   - openspec/changes/add-place-activities-program/design.md (D2)
 *
 * Guarantees:
 *   - While in an activity with an activity camera: ordinary four-view cycling yields.
 *   - On exit (leave, travel, error, disconnect): previous world camera mode is restored,
 *     recomputing position cleanly without replaying stale transforms.
 *   - Supports all four world views (modes 0, 1, 2, and FP_MODE 3).
 *   - Passes through activeCamera reference to all downstream consumers.
 */

import { FP_MODE, nextCameraMode } from '../cameraControl.js';

export function createCameraSeam({
  initialMode = 0,
  onModeChanged = null,
} = {}) {
  let worldMode = initialMode;
  let savedWorldMode = initialMode;
  let activityCamera = null;
  let isActivityCameraActive = false;

  return {
    get worldMode() { return worldMode; },
    get savedWorldMode() { return savedWorldMode; },
    get activityCamera() { return activityCamera; },
    get isActivityCameraActive() { return isActivityCameraActive; },

    /**
     * Cycle camera mode (e.g. from KeyC or on-screen button).
     * If an activity camera is active, cycling yields to it.
     */
    cycleWorldMode() {
      if (isActivityCameraActive) {
        return worldMode; // yields to activity camera
      }
      worldMode = nextCameraMode(worldMode);
      onModeChanged?.(worldMode);
      return worldMode;
    },

    /**
     * Explicitly set the world camera mode.
     */
    setWorldMode(mode) {
      worldMode = mode;
      if (!isActivityCameraActive) {
        savedWorldMode = mode;
      }
      onModeChanged?.(worldMode);
      return worldMode;
    },

    /**
     * Acquire camera ownership for an activity.
     * Saves the current world mode and sets the temporary activity camera.
     */
    acquireActivityCamera(camera = null) {
      savedWorldMode = worldMode;
      activityCamera = camera;
      isActivityCameraActive = true;
      return {
        savedWorldMode,
        activityCamera,
      };
    },

    /**
     * Release activity camera ownership and restore the previous world view mode.
     */
    releaseActivityCamera() {
      if (!isActivityCameraActive && !activityCamera) {
        return { restoredMode: worldMode };
      }
      const restored = savedWorldMode;
      activityCamera = null;
      isActivityCameraActive = false;
      worldMode = restored;
      onModeChanged?.(worldMode);
      return { restoredMode: restored };
    },

    /**
     * Resolve the active camera from world cameras and activity camera.
     * @param {{ isoCamera: object, fpCamera: object }} worldCameras
     */
    resolveActiveCamera({ isoCamera, fpCamera }) {
      if (isActivityCameraActive && activityCamera) {
        return activityCamera;
      }
      if (worldMode === FP_MODE) {
        return fpCamera;
      }
      return isoCamera;
    },
  };
}

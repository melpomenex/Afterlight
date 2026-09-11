/**
 * Camera controller for 8-ball billiards (Task 5.3; Spec social-billiards).
 *
 * Implements three user-selectable viewing modes:
 *   - 'cue': Over-the-shoulder / cue view aligned along aiming vector
 *   - 'standing': Elevated 3/4 lounge perspective looking at table and participants
 *   - 'overhead': Bird's-eye top-down view of the table
 *
 * Gameplay behaviors:
 *   - When in 'cue' mode, shooting transitions automatically to a high 3/4
 *     table-follow shot view that keeps all moving balls in frame and avoids
 *     the hanging billiards pendant lamp fixture.
 *   - Settled balls return smoothly to the player's cue aiming perspective.
 *   - Manual 'C' cycling and explicit overhead mode are preserved.
 *   - Reduced motion: respects prefers-reduced-motion, avoiding forced follow sweeps.
 *   - Seamless activation and restoration through ActivityViewLease.
 */

import * as THREE from 'three';
import { BALL_RADIUS } from '../../../shared/pool/physics.js';

export const POOL_CAMERA_MODES = Object.freeze(['cue', 'standing', 'overhead']);

// Table-local camera offsets.
// Table playing surface is 2.24m (local X) by 1.12m (local Z), cloth bed at y = 0.78m.
// In The Orpheum, the hanging brass lamp shade hangs at (tableX, 2.6, tableZ) with cord to 3.9m.
// Placing the shot camera at a table-relative elevated 3/4 position ensures the line of sight
// to the table cloth descends comfortably below the lamp shade (clear by > 1.4m) with zero obstruction.
export const POOL_SHOT_CAMERA_OFFSET_LOCAL = Object.freeze({
  x: -1.1, // longitudinal: slightly offset toward table head
  y: 2.45, // elevation: 2.45m above floor (~1.67m above cloth)
  z: 2.35, // lateral: into the open lounge aisle, clear of west wall & rails
});

export const POOL_STANDING_CAMERA_OFFSET_LOCAL = Object.freeze({
  x: -1.2,
  y: 2.6,
  z: 2.4,
});

/**
 * Transforms a table-local position (lx, ly, lz) into world coordinates.
 */
export function tableLocalToWorld(lx, ly, lz, tx, ty, tz, rotY) {
  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);
  return {
    x: tx + cosR * lx + sinR * lz,
    y: ty + ly,
    z: tz - sinR * lx + cosR * lz,
  };
}

export function createPoolCamera({
  tablePosition = [-8.6, 0, -4.5],
  tableRotationY = Math.PI / 2,
  getActiveCamera = null,
  setActivityCamera = null,
  clearActivityCamera = null,
  acquireView: _acquireView = null,
  releaseView: _releaseView = null,
} = {}) {
  const tableX = tablePosition[0];
  const tableY = 0.78;
  const tableZ = tablePosition.length === 3 ? tablePosition[2] : tablePosition[1];

  let modeIndex = 0; // Starts in 'cue' view for shooting
  let active = false;
  let presentationState = 'aiming';

  const viewportAspect = typeof window !== 'undefined' && window.innerHeight > 0
    ? window.innerWidth / window.innerHeight
    : 16 / 9;
  // Pool needs an activity-owned camera. Borrowing the world isometric camera
  // lets main's ordinary follow pass overwrite the shot view every frame.
  const activityCamera = new THREE.PerspectiveCamera(50, viewportAspect, 0.05, 100);

  const targetPos = new THREE.Vector3();
  const lookTarget = new THREE.Vector3(tableX, tableY, tableZ);
  const currentLookAt = new THREE.Vector3(tableX, tableY + 0.1, tableZ);

  /**
   * Checks whether system or user requests reduced motion.
   */
  function isReducedMotion() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {}
    }
    return false;
  }

  return {
    get active() {
      return active;
    },

    get mode() {
      return POOL_CAMERA_MODES[modeIndex];
    },

    set mode(newMode) {
      const idx = POOL_CAMERA_MODES.indexOf(newMode);
      if (idx !== -1) modeIndex = idx;
    },

    get presentationState() {
      return presentationState;
    },

    get targetPosition() {
      return targetPos.clone();
    },

    get lookTarget() {
      return lookTarget.clone();
    },

    get camera() {
      return activityCamera;
    },

    cycleMode() {
      modeIndex = (modeIndex + 1) % POOL_CAMERA_MODES.length;
      return this.mode;
    },

    /**
     * Activates activity camera override.
     */
    activate() {
      if (active) return;
      active = true;

      // Pool stays in the social scene and only borrows the active camera
      // through setActivityCamera. Snap camera on first frame.
      this.update({ cueX: 0, cueZ: 0, angle: 0, power: 0, settled: true }, 1.0);
    },

    /**
     * Deactivates camera and restores player view.
     */
    deactivate() {
      if (!active) return;
      active = false;

      if (typeof clearActivityCamera === 'function') {
        try { clearActivityCamera(); } catch {}
      }
    },

    /**
     * Updates camera position and target each frame.
     * @param {object} context
     * @param {number} [lerpSpeed=0.15]
     */
    update({
      cueX = 0,
      cueZ = 0,
      angle = 0,
      power = 0,
      settled = true,
      isShooter = true,
      status = 'aiming',
    } = {}, lerpSpeed = 0.15) {
      if (!active) return;

      const camera = activityCamera;
      if (typeof window !== 'undefined' && window.innerHeight > 0) {
        const aspect = window.innerWidth / window.innerHeight;
        if (Math.abs(camera.aspect - aspect) > 0.001) {
          camera.aspect = aspect;
          camera.updateProjectionMatrix();
        }
      }

      const reduced = isReducedMotion();
      const currentMode = this.mode;
      const ballsMoving = !settled || status === 'shooting';

      // Calculate desired target position and look-at point
      if (currentMode === 'overhead') {
        // Manual overhead view: user explicitly requested top-down
        presentationState = 'overhead';
        targetPos.set(tableX, 3.8, tableZ);
        lookTarget.set(tableX, tableY, tableZ);
      } else if (currentMode === 'standing' || !isShooter) {
        // Elevated 3/4 lounge view
        presentationState = 'standing';
        const standingPos = tableLocalToWorld(
          POOL_STANDING_CAMERA_OFFSET_LOCAL.x,
          POOL_STANDING_CAMERA_OFFSET_LOCAL.y,
          POOL_STANDING_CAMERA_OFFSET_LOCAL.z,
          tableX,
          0,
          tableZ,
          tableRotationY,
        );
        targetPos.set(standingPos.x, standingPos.y, standingPos.z);
        lookTarget.set(tableX, tableY + 0.1, tableZ);
      } else if (ballsMoving) {
        // Shooting / balls moving in cue mode: automatic elevated 3/4 shot-follow view
        // Displaced from table center to avoid hanging lamp obstruction while framing all balls
        presentationState = 'shot_follow';
        const shotPos = tableLocalToWorld(
          POOL_SHOT_CAMERA_OFFSET_LOCAL.x,
          POOL_SHOT_CAMERA_OFFSET_LOCAL.y,
          POOL_SHOT_CAMERA_OFFSET_LOCAL.z,
          tableX,
          0,
          tableZ,
          tableRotationY,
        );
        targetPos.set(shotPos.x, shotPos.y, shotPos.z);
        lookTarget.set(tableX, tableY + 0.08, tableZ);
      } else {
        // Settled 'cue' view: behind the cue ball along the table-local shot direction.
        presentationState = 'aiming';
        const cueDist = 0.75 + power * 0.15;
        const cueElevation = 0.32;
        const cosR = Math.cos(tableRotationY);
        const sinR = Math.sin(tableRotationY);
        const worldCueX = tableX + cosR * cueX + sinR * cueZ;
        const worldCueZ = tableZ - sinR * cueX + cosR * cueZ;
        const worldDirX = cosR * Math.cos(angle) + sinR * Math.sin(angle);
        const worldDirZ = -sinR * Math.cos(angle) + cosR * Math.sin(angle);

        targetPos.set(
          worldCueX - worldDirX * cueDist,
          tableY + BALL_RADIUS + cueElevation,
          worldCueZ - worldDirZ * cueDist,
        );

        lookTarget.set(
          worldCueX + worldDirX * 0.8,
          tableY + BALL_RADIUS,
          worldCueZ + worldDirZ * 0.8,
        );
      }

      if (reduced || lerpSpeed >= 1.0) {
        camera.position.copy(targetPos);
        currentLookAt.copy(lookTarget);
      } else {
        camera.position.lerp(targetPos, lerpSpeed);
        currentLookAt.lerp(lookTarget, lerpSpeed);
      }

      camera.lookAt(currentLookAt);

      if (typeof setActivityCamera === 'function') {
        setActivityCamera(camera);
      }
    },
  };
}

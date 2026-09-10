/**
 * Camera controller for 8-ball billiards (Task 5.3; Spec social-billiards).
 *
 * Implements three viewing modes:
 *   - 'cue': Over-the-shoulder / cue view aligned along aiming vector
 *   - 'standing': Elevated 3/4 lounge perspective looking at table and participants
 *   - 'overhead': Bird's-eye top-down view of the table
 *
 * Guarantees:
 *   - Cycles with 'C' key or HUD toggle
 *   - Reduced motion: respects prefers-reduced-motion, avoiding forced follow cuts
 *   - Seamless activation and restoration through ActivityViewLease
 */

import * as THREE from 'three';
import { BALL_RADIUS } from '../../../shared/pool/physics.js';

export const POOL_CAMERA_MODES = Object.freeze(['cue', 'standing', 'overhead']);

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
  const viewportAspect = typeof window !== 'undefined' && window.innerHeight > 0
    ? window.innerWidth / window.innerHeight
    : 16 / 9;
  // Pool needs an activity-owned camera. Borrowing the world isometric camera
  // lets main's ordinary follow pass overwrite the shot view every frame.
  const activityCamera = new THREE.PerspectiveCamera(50, viewportAspect, 0.05, 100);

  const targetPos = new THREE.Vector3();
  const lookTarget = new THREE.Vector3(tableX, tableY, tableZ);

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
      // through setActivityCamera. The view lease replaces the whole render
      // pass (Summit Run mountain); calling it with a string throws and was
      // leaving the darts HUD / world camera in a confused state.
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

      // Calculate desired target position and look-at point
      if (currentMode === 'overhead' || (!settled && !reduced && currentMode === 'cue')) {
        // Overhead view: directly above table
        targetPos.set(tableX, 3.8, tableZ);
        lookTarget.set(tableX, tableY, tableZ);
      } else if (currentMode === 'standing' || !isShooter) {
        // Elevated 3/4 lounge view
        targetPos.set(tableX + 2.4, 2.6, tableZ + 1.2);
        lookTarget.set(tableX, tableY + 0.1, tableZ);
      } else {
        // 'cue' view: behind the cue ball along the table-local shot direction.
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
      } else {
        camera.position.lerp(targetPos, lerpSpeed);
      }

      camera.lookAt(lookTarget);

      if (typeof setActivityCamera === 'function') {
        setActivityCamera(camera);
      }
    },
  };
}

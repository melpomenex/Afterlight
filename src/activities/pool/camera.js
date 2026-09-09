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
  getActiveCamera = null,
  setActivityCamera = null,
  clearActivityCamera = null,
  acquireView = null,
  releaseView = null,
} = {}) {
  const tableX = tablePosition[0];
  const tableY = 0.78;
  const tableZ = tablePosition.length === 3 ? tablePosition[2] : tablePosition[1];

  let modeIndex = 0; // Starts in 'cue' view for shooting
  let viewLease = null;
  let active = false;

  // Camera targets
  const currentPos = new THREE.Vector3();
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

      if (typeof acquireView === 'function') {
        viewLease = acquireView('pool', { priority: 2 });
      }

      // Initial position
      this.update({ cueX: 0, cueZ: 0, angle: 0, power: 0, settled: true }, 1.0);
    },

    /**
     * Deactivates camera and restores player view.
     */
    deactivate() {
      if (!active) return;
      active = false;

      if (viewLease) {
        try { viewLease.release(); } catch {}
        viewLease = null;
      } else if (typeof releaseView === 'function') {
        try { releaseView('pool'); } catch {}
      } else if (typeof clearActivityCamera === 'function') {
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

      const camera = getActiveCamera?.();
      if (!camera) return;

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
        // 'cue' view: behind cue stick pointing towards cue ball
        // Table is rotated Math.PI/2 in world, so cue coords are rotated
        const worldAngle = angle + Math.PI / 2;
        const cueDist = 0.75 + power * 0.15;
        const cueElevation = 0.32;

        const worldCueX = tableX - cueZ;
        const worldCueZ = tableZ + cueX;

        targetPos.set(
          worldCueX - Math.sin(worldAngle) * cueDist,
          tableY + BALL_RADIUS + cueElevation,
          worldCueZ - Math.cos(worldAngle) * cueDist,
        );

        lookTarget.set(
          worldCueX + Math.sin(worldAngle) * 0.8,
          tableY + BALL_RADIUS,
          worldCueZ + Math.cos(worldAngle) * 0.8,
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

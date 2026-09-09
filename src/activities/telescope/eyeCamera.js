/**
 * Eye-through-scope camera for the Desert Camp telescope.
 *
 * Focused players and spectators borrow the activity camera via the existing
 * camera seam / view lease, then restore the world view on release.
 */

import * as THREE from 'three';

export function createTelescopeEyeCamera({
  eyepiece = [-6.5, 1.15, -5.5],
  setActivityCamera = null,
  clearActivityCamera = null,
  acquireView = null,
  releaseView = null,
  generation = 0,
  owner = 'telescope',
} = {}) {
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.08, 400);
  camera.name = 'telescope-eye';
  camera.position.set(eyepiece[0], eyepiece[1], eyepiece[2]);

  let held = false;
  let viewLease = null;
  const lookDir = new THREE.Vector3();

  function look(yaw = 0, pitch = 0.35) {
    lookDir.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    );
    camera.position.set(eyepiece[0], eyepiece[1], eyepiece[2]);
    camera.lookAt(
      eyepiece[0] + lookDir.x,
      eyepiece[1] + lookDir.y,
      eyepiece[2] + lookDir.z,
    );
  }

  look(0, 0.35);

  return {
    camera,

    acquire() {
      if (held) return true;
      if (typeof acquireView === 'function') {
        const result = acquireView({
          owner,
          generation,
          scene: null,
          camera,
          onRelease: () => {
            held = false;
            viewLease = null;
          },
        });
        if (result?.ok) {
          viewLease = result.lease;
          held = true;
        }
      }
      if (typeof setActivityCamera === 'function') {
        setActivityCamera(camera);
        held = true;
      }
      return held;
    },

    release() {
      if (!held) return;
      held = false;
      if (viewLease && typeof viewLease.release === 'function') {
        try { viewLease.release(); } catch {}
        viewLease = null;
      } else if (typeof releaseView === 'function') {
        try { releaseView(owner); } catch {}
      }
      if (typeof clearActivityCamera === 'function') {
        try { clearActivityCamera(); } catch {}
      }
    },

    updateLook(yaw, pitch) {
      look(yaw, pitch);
    },

    dispose() {
      this.release();
    },
  };
}

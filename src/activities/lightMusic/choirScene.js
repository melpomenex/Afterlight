/**
 * Spore Understory Mycelial Choir pads (Task 9.5).
 */

import * as THREE from 'three';
import { LIGHT_MUSIC_PADS } from '../../../shared/lightMusicModel.js';

export function createLightMusicScene({
  position = [0, 0, 2],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'light-music-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const geos = [];
  const mats = [];
  const regGeo = (g) => { geos.push(g); return g; };
  const regMat = (m) => { mats.push(m); return m; };

  const ring = new THREE.Mesh(
    regGeo(new THREE.CylinderGeometry(1.15, 1.2, 0.08, 16)),
    regMat(new THREE.MeshStandardMaterial({ color: '#2d271e', roughness: 0.85 }))
  );
  ring.position.y = 0.04;
  group.add(ring);

  const coreMat = regMat(new THREE.MeshStandardMaterial({
    color: '#85f5bc', emissive: '#3a8f68', emissiveIntensity: 0.5,
  }));
  const core = new THREE.Mesh(regGeo(new THREE.SphereGeometry(0.18, 12, 10)), coreMat);
  core.position.y = 0.42;
  group.add(core);

  const pads = [];
  LIGHT_MUSIC_PADS.forEach((pad, i) => {
    const ang = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const mat = regMat(new THREE.MeshStandardMaterial({
      color: pad.color, emissive: pad.color, emissiveIntensity: 0.25,
    }));
    const mesh = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.28, 0.32, 0.1, 12)), mat);
    mesh.position.set(Math.cos(ang) * 0.72, 0.12, Math.sin(ang) * 0.72);
    mesh.userData.pad = pad.id;
    group.add(mesh);
    pads.push({ mesh, mat, base: 0.25 });
  });

  let flashPad = null;
  let flashUntil = 0;

  return {
    group,
    pads,
    flash(pad) {
      flashPad = pad;
      flashUntil = (typeof performance !== 'undefined' ? performance.now() : 0) + 220;
    },
    updateVisuals(simState, time) {
      const done = simState?.completed || simState?.status === 'complete';
      coreMat.emissiveIntensity = done ? 1.8 + Math.sin(time * 3) * 0.4 : 0.5;
      const progress = simState?.progress || 0;
      pads.forEach((p, i) => {
        let glow = p.base + (done ? 0.8 : progress / 16);
        if (flashPad === i && (typeof performance === 'undefined' || performance.now() < flashUntil)) {
          glow = 1.6;
        }
        p.mat.emissiveIntensity = glow;
      });
    },
    dispose() {
      group.parent?.remove(group);
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

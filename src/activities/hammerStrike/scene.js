/**
 * Foundry anvil + swinging hammer for Hammer Strike (Task 9.1).
 *
 * The district already places a static anvil pad. This scene adds the
 * animated arm, timing bead, and strike flash so participants and
 * spectators share the same semantic beat.
 */

import * as THREE from 'three';

export function createHammerStrikeScene({
  position = [-5.5, 0, 2.5],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'hammer-strike-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const geos = [];
  const mats = [];
  const regGeo = (g) => { geos.push(g); return g; };
  const regMat = (m) => { mats.push(m); return m; };

  const standGeo = regGeo(new THREE.BoxGeometry(0.55, 0.7, 0.4));
  const standMat = regMat(new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.7, metalness: 0.55 }));
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.set(0, 0.55, 0);
  group.add(stand);

  const faceGeo = regGeo(new THREE.BoxGeometry(0.85, 0.16, 0.5));
  const faceMat = regMat(new THREE.MeshStandardMaterial({ color: '#4a4a52', roughness: 0.45, metalness: 0.7 }));
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 0.96, 0);
  group.add(face);

  const hornGeo = regGeo(new THREE.BoxGeometry(0.28, 0.1, 0.16));
  const horn = new THREE.Mesh(hornGeo, faceMat);
  horn.position.set(0.48, 0.96, 0);
  group.add(horn);

  const pivot = new THREE.Group();
  pivot.position.set(-0.15, 1.35, 0);
  group.add(pivot);

  const handleGeo = regGeo(new THREE.BoxGeometry(0.07, 0.85, 0.07));
  const handleMat = regMat(new THREE.MeshStandardMaterial({ color: '#5c4030', roughness: 0.8 }));
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(0, -0.35, 0);
  pivot.add(handle);

  const headGeo = regGeo(new THREE.BoxGeometry(0.22, 0.16, 0.14));
  const headMat = regMat(new THREE.MeshStandardMaterial({ color: '#6d7380', roughness: 0.35, metalness: 0.8 }));
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, -0.78, 0);
  pivot.add(head);

  const beadGeo = regGeo(new THREE.SphereGeometry(0.05, 10, 8));
  const beadMat = regMat(new THREE.MeshStandardMaterial({
    color: '#e8c76a',
    emissive: '#c9a227',
    emissiveIntensity: 0.8,
  }));
  const bead = new THREE.Mesh(beadGeo, beadMat);
  bead.position.set(0, 1.55, 0.28);
  group.add(bead);

  const flashMat = regMat(new THREE.MeshStandardMaterial({
    color: '#ffd27a',
    emissive: '#ffb24d',
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0,
  }));
  const flash = new THREE.Mesh(regGeo(new THREE.SphereGeometry(0.12, 10, 8)), flashMat);
  flash.position.set(0, 1.08, 0);
  group.add(flash);

  let flashUntil = 0;
  let lastStrikeIndex = 0;

  return {
    group,

    updateVisuals(simState, time) {
      const phase = Number(simState?.phase) || 0;
      // 0 = raised, 0.5 = impact, 1 = raised the other way
      const swing = Math.sin((phase - 0.5) * Math.PI);
      pivot.rotation.z = swing * 0.85;

      bead.position.x = (phase - 0.5) * 0.9;
      const window = Number(simState?.windowPhase) || 0.08;
      const onTarget = Math.abs(phase - 0.5) <= window;
      beadMat.emissiveIntensity = onTarget ? 2.2 : 0.55;
      beadMat.color.set(onTarget ? '#fff4c2' : '#e8c76a');

      const strike = simState?.lastStrike;
      if (strike && strike.index !== lastStrikeIndex) {
        lastStrikeIndex = strike.index;
        flashUntil = time + 0.18;
      }
      const flashing = time < flashUntil;
      flashMat.opacity = flashing ? 0.7 : 0;
      flashMat.emissiveIntensity = flashing ? 2.4 : 0;
    },

    dispose() {
      group.removeFromParent();
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

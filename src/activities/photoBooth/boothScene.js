/**
 * Orpheum photo booth curtain shell (Task 9.8). Low enough for cinema sightlines.
 */

import * as THREE from 'three';

export function createPhotoBoothScene({
  position = [2.4, 0, 8.2],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'photo-booth-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const geos = [];
  const mats = [];
  const regGeo = (g) => { geos.push(g); return g; };
  const regMat = (m) => { mats.push(m); return m; };

  const floor = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(1.6, 0.04, 1.2)),
    regMat(new THREE.MeshStandardMaterial({ color: '#3a271d', roughness: 0.8 }))
  );
  floor.position.y = 0.02;
  group.add(floor);

  const back = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(1.5, 1.5, 0.08)),
    regMat(new THREE.MeshStandardMaterial({ color: '#4a1b22', roughness: 0.7 }))
  );
  back.position.set(0, 0.85, -0.5);
  group.add(back);

  const left = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(0.08, 1.5, 1.0)),
    regMat(new THREE.MeshStandardMaterial({ color: '#5a2029', roughness: 0.7 }))
  );
  left.position.set(-0.78, 0.85, 0);
  group.add(left);

  const right = left.clone();
  right.position.x = 0.78;
  group.add(right);

  const lampMat = regMat(new THREE.MeshStandardMaterial({
    color: '#ffd9a0', emissive: '#ffcc89', emissiveIntensity: 0.8,
  }));
  const lamp = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.9, 0.08, 0.2)), lampMat);
  lamp.position.set(0, 1.55, -0.1);
  group.add(lamp);

  return {
    group,
    updateVisuals(simState, time) {
      const live = simState?.status === 'countdown' || simState?.status === 'posing';
      lampMat.emissiveIntensity = live ? 1.6 + Math.sin(time * 8) * 0.3 : 0.8;
    },
    dispose() {
      group.parent?.remove(group);
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

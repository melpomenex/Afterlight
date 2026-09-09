/**
 * Orpheum lobby dartboard (Task 9.6). Board faces west toward the oche.
 */

import * as THREE from 'three';
import { DARTS_SECTORS } from '../../../shared/dartsModel.js';

export function createDartsScene({
  position = [-10.4, 0, -1.5],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'darts-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const geos = [];
  const mats = [];
  const regGeo = (g) => { geos.push(g); return g; };
  const regMat = (m) => { mats.push(m); return m; };

  const oche = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(0.08, 0.02, 1.1)),
    regMat(new THREE.MeshStandardMaterial({ color: '#c6b47a', metalness: 0.6, roughness: 0.35 }))
  );
  oche.position.set(-0.9, 0.02, 0);
  group.add(oche);

  const stand = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(0.12, 1.5, 0.5)),
    regMat(new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.7 }))
  );
  stand.position.set(0.85, 0.85, 0);
  group.add(stand);

  const boardGroup = new THREE.Group();
  boardGroup.position.set(0.78, 1.45, 0);
  boardGroup.rotation.y = -Math.PI / 2;
  group.add(boardGroup);

  const colors = ['#1a1f18', '#7a2028'];
  DARTS_SECTORS.forEach((_, i) => {
    const shape = new THREE.Shape();
    const a0 = (i / 20) * Math.PI * 2 - Math.PI / 20;
    const a1 = a0 + Math.PI / 10;
    shape.moveTo(0, 0);
    shape.absarc(0, 0, 0.28, a0, a1, false);
    shape.lineTo(0, 0);
    const mesh = new THREE.Mesh(
      regGeo(new THREE.ShapeGeometry(shape)),
      regMat(new THREE.MeshStandardMaterial({ color: colors[i % 2], roughness: 0.55 }))
    );
    mesh.rotation.x = -Math.PI / 2;
    boardGroup.add(mesh);
  });

  const bull = new THREE.Mesh(
    regGeo(new THREE.CircleGeometry(0.025, 16)),
    regMat(new THREE.MeshStandardMaterial({ color: '#c9a227', emissive: '#8a6a10', emissiveIntensity: 0.4 }))
  );
  bull.rotation.x = -Math.PI / 2;
  bull.position.y = 0.01;
  boardGroup.add(bull);

  const dartMesh = new THREE.Mesh(
    regGeo(new THREE.ConeGeometry(0.02, 0.12, 8)),
    regMat(new THREE.MeshStandardMaterial({ color: '#d8d1b5', metalness: 0.5 }))
  );
  dartMesh.visible = false;
  dartMesh.rotation.z = Math.PI / 2;
  group.add(dartMesh);

  return {
    group,
    showThrow(hit) {
      if (!hit || hit.ring === 'miss') {
        dartMesh.visible = false;
        return;
      }
      dartMesh.visible = true;
      dartMesh.position.set(0.7, 1.45 + (hit.v || 0) * 0.28, (hit.u || 0) * 0.28);
    },
    updateVisuals() {},
    dispose() {
      group.parent?.remove(group);
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

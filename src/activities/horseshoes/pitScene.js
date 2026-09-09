/**
 * Desert Camp horseshoes pit: sand beds, physical stakes, landed shoes.
 */

import * as THREE from 'three';

import { HORSESHOES_STAKES } from '../../../shared/horseshoesModel.js';

const SHOE_COLORS = ['#c47a3a', '#d8c4a0'];

export function createHorseshoePitScene({
  position = [8, 0, 5.5],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'horseshoes-pit';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const ownedGeometries = [];
  const ownedMaterials = [];
  const regGeo = (g) => { ownedGeometries.push(g); return g; };
  const regMat = (m) => { ownedMaterials.push(m); return m; };

  const pitGeo = regGeo(new THREE.BoxGeometry(1.4, 0.04, 1.4));
  const pitMat = regMat(new THREE.MeshStandardMaterial({
    color: '#8d6a45',
    roughness: 0.95,
    metalness: 0.05,
  }));

  const stakeGeo = regGeo(new THREE.CylinderGeometry(0.03, 0.035, 0.64, 8));
  const stakeMat = regMat(new THREE.MeshStandardMaterial({
    color: '#6d5a3a',
    roughness: 0.45,
    metalness: 0.55,
  }));
  const capGeo = regGeo(new THREE.CylinderGeometry(0.045, 0.03, 0.05, 8));
  const capMat = regMat(new THREE.MeshStandardMaterial({
    color: '#c4a574',
    roughness: 0.35,
    metalness: 0.65,
  }));

  const stakeMeshes = [];
  for (const slot of [0, 1]) {
    const world = HORSESHOES_STAKES[slot];
    const localX = world[0] - position[0];
    const localZ = world[2] - position[2];

    const pit = new THREE.Mesh(pitGeo, pitMat);
    pit.position.set(localX, 0.02, localZ);
    group.add(pit);

    const stake = new THREE.Mesh(stakeGeo, stakeMat);
    stake.position.set(localX, 0.34, localZ);
    group.add(stake);

    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(localX, 0.68, localZ);
    group.add(cap);
    stakeMeshes.push(stake);
  }

  const shoeGeo = regGeo(new THREE.TorusGeometry(0.11, 0.035, 8, 14, Math.PI * 1.45));
  const shoeMats = SHOE_COLORS.map((color) =>
    regMat(new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25 }))
  );

  const shoeActors = [0, 1].flatMap((slot) =>
    [0, 1].map((index) => {
      const mesh = new THREE.Mesh(shoeGeo, shoeMats[slot]);
      mesh.name = `shoe-${slot}-${index}`;
      mesh.visible = false;
      mesh.rotation.x = -Math.PI / 2;
      group.add(mesh);
      return { slot, index, mesh };
    })
  );

  return {
    group,
    stakeMeshes,

    updateVisuals(simState) {
      for (const actor of shoeActors) {
        const player = simState?.players?.[actor.slot] ?? simState?.players?.[String(actor.slot)];
        const shoe = player?.shoes?.[actor.index] || (player?.lastThrow && actor.index === 0 ? player.lastThrow : null);
        if (!shoe?.landing) {
          actor.mesh.visible = false;
          continue;
        }
        actor.mesh.visible = true;
        actor.mesh.position.set(
          shoe.landing[0] - position[0],
          0.04,
          (shoe.landing[2] ?? shoe.landing[1]) - position[2],
        );
        actor.mesh.material.emissive = new THREE.Color(shoe.ringer ? '#ffb24d' : '#000000');
        actor.mesh.material.emissiveIntensity = shoe.ringer ? 0.35 : 0;
      }

      for (const stake of stakeMeshes) {
        const pulse = simState?.status === 'complete' ? 1.08 : 1;
        stake.scale.set(1, pulse, 1);
      }
    },

    dispose() {
      group.removeFromParent();
      for (const geo of ownedGeometries) geo.dispose();
      for (const mat of ownedMaterials) mat.dispose();
    },
  };
}

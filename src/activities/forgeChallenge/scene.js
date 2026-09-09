/**
 * Foundry hearth + cooling metal bar for Forge Profile (Task 9.2).
 *
 * Spectators and the smith see the same 16-bin profile and heat. Color
 * reads white-hot to dull iron from the authoritative heat array.
 */

import * as THREE from 'three';
import { FORGE_BINS } from '../../../shared/forgeChallengeModel.js';

function heatColor(heat, height) {
  const h = Math.max(0, Math.min(1, heat || 0));
  const cool = new THREE.Color('#4a3a36');
  const warm = new THREE.Color('#ff8033');
  const hot = new THREE.Color('#fff2c4');
  const c = cool.clone().lerp(warm, Math.min(1, h * 1.6)).lerp(hot, Math.max(0, h - 0.45) * 1.8);
  if (height < 0.25) c.lerp(new THREE.Color('#2a2a30'), 0.25);
  return c;
}

export function createForgeChallengeScene({
  position = [5.5, 0, 2.5],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'forge-challenge-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const geos = [];
  const mats = [];
  const regGeo = (g) => { geos.push(g); return g; };
  const regMat = (m) => { mats.push(m); return m; };

  const hearthGeo = regGeo(new THREE.BoxGeometry(1.15, 0.32, 0.7));
  const hearthMat = regMat(new THREE.MeshStandardMaterial({ color: '#3c2b28', roughness: 0.85 }));
  const hearth = new THREE.Mesh(hearthGeo, hearthMat);
  hearth.position.set(0, 0.36, 0);
  group.add(hearth);

  const coalMat = regMat(new THREE.MeshStandardMaterial({
    color: '#ff6622',
    emissive: '#ff6622',
    emissiveIntensity: 1.1,
  }));
  const coals = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.85, 0.06, 0.36)), coalMat);
  coals.position.set(0, 0.54, 0);
  group.add(coals);

  const stockGroup = new THREE.Group();
  stockGroup.position.set(0, 0.64, 0);
  group.add(stockGroup);

  const ghostGroup = new THREE.Group();
  ghostGroup.position.set(0, 0.64, 0.22);
  group.add(ghostGroup);

  const binWidth = 0.9 / FORGE_BINS;
  const segments = [];
  const ghosts = [];

  for (let i = 0; i < FORGE_BINS; i++) {
    const geo = regGeo(new THREE.BoxGeometry(binWidth * 0.92, 1, 0.16));
    const mat = regMat(new THREE.MeshStandardMaterial({
      color: '#ff8033',
      emissive: '#ff6622',
      emissiveIntensity: 0.8,
      roughness: 0.35,
      metalness: 0.45,
    }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = -0.45 + (i + 0.5) * binWidth;
    stockGroup.add(mesh);
    segments.push({ mesh, mat });

    const gMat = regMat(new THREE.MeshStandardMaterial({
      color: '#c9b889',
      transparent: true,
      opacity: 0.28,
      roughness: 0.6,
    }));
    const ghost = new THREE.Mesh(geo, gMat);
    ghost.position.x = mesh.position.x;
    ghostGroup.add(ghost);
    ghosts.push(ghost);
  }

  const malletPivot = new THREE.Group();
  malletPivot.position.set(0, 1.15, -0.05);
  group.add(malletPivot);

  const mallet = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(0.08, 0.55, 0.08)),
    regMat(new THREE.MeshStandardMaterial({ color: '#5c4030', roughness: 0.8 }))
  );
  mallet.position.y = -0.2;
  malletPivot.add(mallet);

  let lastStrikeIndex = 0;
  let smashUntil = 0;

  return {
    group,

    updateVisuals(simState, time) {
      const profile = simState?.profile || [];
      const target = simState?.target || [];
      const heat = simState?.heat || [];

      for (let i = 0; i < FORGE_BINS; i++) {
        const height = Math.max(0.06, (Number(profile[i]) || 1) * 0.42);
        const { mesh, mat } = segments[i];
        mesh.scale.y = height;
        mesh.position.y = height / 2;
        const color = heatColor(heat[i], profile[i]);
        mat.color.copy(color);
        mat.emissive.copy(color);
        mat.emissiveIntensity = 0.35 + (Number(heat[i]) || 0) * 1.8;

        const ghostH = Math.max(0.06, (Number(target[i]) || 0.4) * 0.42);
        ghosts[i].scale.y = ghostH;
        ghosts[i].position.y = ghostH / 2;
      }

      const strike = simState?.lastStrike;
      if (strike && strike.index !== lastStrikeIndex) {
        lastStrikeIndex = strike.index;
        smashUntil = time + 0.16;
        const pos = Number(strike.position) || 0.5;
        malletPivot.position.x = (pos - 0.5) * 0.9;
      }
      malletPivot.rotation.z = time < smashUntil ? 0.55 : -0.15;
      coalMat.emissiveIntensity = 0.8 + Math.sin(time * 6) * 0.25;
    },

    dispose() {
      group.removeFromParent();
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

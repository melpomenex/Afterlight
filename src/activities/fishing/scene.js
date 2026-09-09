/**
 * Shoreline fishing props, lines, and bobbers for Basin / Marshes.
 */

import * as THREE from 'three';
import { ANGLER_COLORS, FISHING_WATER_Y } from '../../../shared/fishingModel.js';

export function createFishingScene({
  position = [6, 0, 3],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'fishing-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const ownedGeometries = [];
  const ownedMaterials = [];
  const regGeo = (g) => { ownedGeometries.push(g); return g; };
  const regMat = (m) => { ownedMaterials.push(m); return m; };

  const dock = new THREE.Group();
  dock.name = 'fishing-dock';

  const plankGeo = regGeo(new THREE.BoxGeometry(1.8, 0.08, 1.1));
  const plankMat = regMat(new THREE.MeshStandardMaterial({ color: '#6a5340', roughness: 0.85 }));
  const plank = new THREE.Mesh(plankGeo, plankMat);
  plank.position.set(0, 0.28, 0.15);
  dock.add(plank);

  const pileGeo = regGeo(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 6));
  const pileMat = regMat(new THREE.MeshStandardMaterial({ color: '#3d3226', roughness: 0.8 }));
  for (const [x, z] of [[-0.75, -0.25], [0.75, -0.25], [-0.75, 0.5], [0.75, 0.5]]) {
    const pile = new THREE.Mesh(pileGeo, pileMat);
    pile.position.set(x, 0.14, z);
    dock.add(pile);
  }

  const bucketGeo = regGeo(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 8));
  const bucketMat = regMat(new THREE.MeshStandardMaterial({ color: '#7a5a3a', metalness: 0.35, roughness: 0.5 }));
  const bucket = new THREE.Mesh(bucketGeo, bucketMat);
  bucket.position.set(0.55, 0.4, 0.35);
  dock.add(bucket);

  group.add(dock);

  const actors = new THREE.Group();
  actors.name = 'fishing-actors';

  const lineGeo = [];
  const lines = {};
  const bobbers = {};
  const rods = {};

  const rodGeo = regGeo(new THREE.CylinderGeometry(0.015, 0.01, 1.15, 6));
  const tipGeo = regGeo(new THREE.SphereGeometry(0.025, 8, 8));
  const bobberGeo = regGeo(new THREE.SphereGeometry(0.055, 10, 10));

  for (let slot = 0; slot < 4; slot++) {
    const color = ANGLER_COLORS[slot];
    const rodMat = regMat(new THREE.MeshStandardMaterial({ color: '#2d373e', roughness: 0.45, metalness: 0.4 }));
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.rotation.x = -0.7;
    rod.position.set((slot % 2 === 0 ? -0.45 : 0.45), 0.85, slot < 2 ? 0.05 : 0.25);
    actors.add(rod);
    rods[slot] = rod;

    const tipMat = regMat(new THREE.MeshBasicMaterial({ color }));
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(0, 0.58, 0);
    rod.add(tip);

    const positions = new Float32Array(6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    regGeo(geo);
    lineGeo.push(geo);
    const lineMat = regMat(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    const line = new THREE.Line(geo, lineMat);
    line.visible = false;
    line.frustumCulled = false;
    actors.add(line);
    lines[slot] = line;

    const bobberMat = regMat(new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: color, emissiveIntensity: 0.15 }));
    const bobber = new THREE.Mesh(bobberGeo, bobberMat);
    bobber.visible = false;
    actors.add(bobber);
    bobbers[slot] = bobber;
  }

  group.add(actors);

  function writeLine(slot, from, to) {
    const line = lines[slot];
    if (!line || !from || !to) return;
    const attr = line.geometry.getAttribute('position');
    attr.setXYZ(0, from[0], from[1], from[2]);
    attr.setXYZ(1, to[0], to[1], to[2]);
    attr.needsUpdate = true;
    line.visible = true;
  }

  function updateVisuals(simState, time = 0) {
    const anglers = simState?.anglers || {};
    for (let slot = 0; slot < 4; slot++) {
      const angler = anglers[slot] || anglers[String(slot)];
      const line = lines[slot];
      const bobber = bobbers[slot];
      if (!angler || angler.phase === 'idle' || !angler.bobber) {
        if (line) line.visible = false;
        if (bobber) bobber.visible = false;
        continue;
      }
      const tip = angler.rodTip || angler.origin;
      writeLine(slot, tip, angler.bobber);
      bobber.visible = true;
      const dunk = angler.phase === 'bite' ? -0.06 : Math.sin(time * 2.4 + slot) * 0.015;
      bobber.position.set(angler.bobber[0], (angler.bobber[1] ?? FISHING_WATER_Y) + dunk, angler.bobber[2]);
    }
  }

  function dispose() {
    for (const g of ownedGeometries) g.dispose();
    for (const m of ownedMaterials) m.dispose();
    if (group.parent) group.parent.remove(group);
  }

  return {
    group,
    updateVisuals,
    dispose,
    getBobber: (slot) => bobbers[slot],
    getLine: (slot) => lines[slot],
  };
}

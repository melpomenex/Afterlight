/**
 * Skipping-stone shoreline props and shared throw playback.
 */

import * as THREE from 'three';
import { SKIPPER_COLORS, SKIP_WATER_Y } from '../../../shared/skippingStonesModel.js';

export function createSkippingScene({
  position = [-5.5, 0, 4],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'skipping-stones-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const ownedGeometries = [];
  const ownedMaterials = [];
  const regGeo = (g) => { ownedGeometries.push(g); return g; };
  const regMat = (m) => { ownedMaterials.push(m); return m; };

  const cairn = new THREE.Group();
  const rockGeo = regGeo(new THREE.SphereGeometry(0.12, 7, 6));
  const rockMat = regMat(new THREE.MeshStandardMaterial({ color: '#6d6a63', roughness: 0.92 }));
  for (const [x, y, z, s] of [[-0.15, 0.18, 0.2, 1], [0.1, 0.16, 0.28, 0.8], [0, 0.28, 0.18, 0.7], [0.22, 0.14, 0.08, 0.9]]) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, y, z);
    rock.scale.set(s, s * 0.55, s);
    cairn.add(rock);
  }
  group.add(cairn);

  const stones = {};
  const stoneGeo = regGeo(new THREE.SphereGeometry(0.07, 8, 6));
  for (let slot = 0; slot < 4; slot++) {
    const mat = regMat(new THREE.MeshStandardMaterial({
      color: SKIPPER_COLORS[slot],
      roughness: 0.55,
      metalness: 0.15,
    }));
    const mesh = new THREE.Mesh(stoneGeo, mat);
    mesh.scale.set(1.15, 0.45, 1);
    mesh.visible = false;
    group.add(mesh);
    stones[slot] = mesh;
  }

  const ripples = [];
  const rippleGeo = regGeo(new THREE.RingGeometry(0.08, 0.16, 16));
  const activeFlights = {};

  function addRipple(pos, color) {
    const mat = regMat(new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }));
    const mesh = new THREE.Mesh(rippleGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos[0], SKIP_WATER_Y + 0.01, pos[2]);
    group.add(mesh);
    ripples.push({ mesh, born: performance.now() });
  }

  function playThrow(slot, throwData) {
    if (!throwData?.trajectory?.length) return;
    activeFlights[slot] = {
      trajectory: throwData.trajectory,
      skipPositions: throwData.skipPositions || [],
      startTime: performance.now(),
      durationMs: throwData.flightTimeMs || 2000,
      skipsShown: 0,
      color: SKIPPER_COLORS[slot] || '#ffffff',
    };
    if (stones[slot]) stones[slot].visible = true;
  }

  function clearSlot(slot) {
    delete activeFlights[slot];
    if (stones[slot]) stones[slot].visible = false;
  }

  function updateVisuals(simState, time = 0) {
    const now = performance.now();
    const throwers = simState?.throwers || {};

    for (let slot = 0; slot < 4; slot++) {
      const thrower = throwers[slot] || throwers[String(slot)];
      const flight = thrower?.currentThrow;
      const sig = flight
        ? `${flight.flightTimeMs}:${flight.distance}:${flight.skips}:${flight.landingPos}`
        : null;
      if (flight && activeFlights[slot]?.sig !== sig) {
        playThrow(slot, flight);
        if (activeFlights[slot]) activeFlights[slot].sig = sig;
      }
      if (!flight) clearSlot(slot);

      const active = activeFlights[slot];
      const mesh = stones[slot];
      if (!active || !mesh) continue;

      const progress = Math.min(1, (now - active.startTime) / active.durationMs);
      const traj = active.trajectory;
      const idx = Math.min(traj.length - 1, Math.floor(progress * (traj.length - 1)));
      const pt = traj[idx];
      if (pt) {
        mesh.visible = true;
        mesh.position.set(pt.x, Math.max(SKIP_WATER_Y + 0.02, pt.y), pt.z);
        mesh.rotation.x += 0.2;
      }
      while (active.skipsShown < (flight?.skipPositions?.length || 0)) {
        const pos = flight.skipPositions[active.skipsShown];
        if (pos) addRipple(pos, active.color);
        active.skipsShown += 1;
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const age = now - ripples[i].born;
      ripples[i].mesh.scale.setScalar(1 + age / 400);
      ripples[i].mesh.material.opacity = Math.max(0, 0.55 - age / 1400);
      if (age > 1600) {
        group.remove(ripples[i].mesh);
        ripples.splice(i, 1);
      }
    }
    void time;
  }

  function dispose() {
    for (const r of ripples) {
      if (r.mesh.parent) r.mesh.parent.remove(r.mesh);
    }
    ripples.length = 0;
    for (const g of ownedGeometries) g.dispose();
    for (const m of ownedMaterials) m.dispose();
    if (group.parent) group.parent.remove(group);
  }

  return {
    group,
    playThrow,
    clearSlot,
    updateVisuals,
    dispose,
    getStone: (slot) => stones[slot],
  };
}

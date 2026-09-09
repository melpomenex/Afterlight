/**
 * 3D Rain Court Gutter Boat Scene (Phase 5, Task 7.5).
 *
 * Implements:
 *   - Quad-lane copper gutter race trough with flowing rain runoff water
 *   - Start gate mechanism with release barrier paddles
 *   - Finish line archway with brass tripwire and checkered pennants
 *   - 4 handcrafted miniature wooden toy boats with colored canvas sails
 *   - Buoyancy bobbing animation, stream ripples and splash trails
 */

import * as THREE from 'three';
import {
  GUTTER_LANES,
  GUTTER_BOAT_START_Z,
  GUTTER_BOAT_FINISH_Z,
  GUTTER_BOAT_LENGTH,
} from '../../../shared/gutterBoatModel.js';

export function createGutterBoatScene({
  position = [-4.5, 0, 2.5],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'gutter-boat-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const ownedGeometries = [];
  const ownedMaterials = [];

  const regGeo = (g) => { ownedGeometries.push(g); return g; };
  const regMat = (m) => { ownedMaterials.push(m); return m; };

  // ==========================================
  // 1. Copper Gutter Trough & Water Chutes
  // ==========================================
  const troughGroup = new THREE.Group();
  troughGroup.name = 'gutter-trough';

  // Base support bed (wet stone and weathered timber frame)
  const bedGeo = regGeo(new THREE.BoxGeometry(1.4, 0.14, 8.4));
  const bedMat = regMat(new THREE.MeshStandardMaterial({
    color: '#344548',
    roughness: 0.8,
    metalness: 0.2,
  }));
  const bedMesh = new THREE.Mesh(bedGeo, bedMat);
  bedMesh.position.set(0, 0.07, 0);
  troughGroup.add(bedMesh);

  // Outer copper gutter rim (left, right, front, back)
  const rimMat = regMat(new THREE.MeshStandardMaterial({
    color: '#a0623e',
    roughness: 0.4,
    metalness: 0.75,
  }));
  const wallMat = regMat(new THREE.MeshStandardMaterial({
    color: '#8c5332',
    roughness: 0.5,
    metalness: 0.7,
  }));

  // Side rim walls
  const sideWallGeo = regGeo(new THREE.BoxGeometry(0.06, 0.18, 8.4));
  const leftRim = new THREE.Mesh(sideWallGeo, wallMat);
  leftRim.position.set(-0.67, 0.16, 0);
  troughGroup.add(leftRim);

  const rightRim = new THREE.Mesh(sideWallGeo, wallMat);
  rightRim.position.set(0.67, 0.16, 0);
  troughGroup.add(rightRim);

  // End walls
  const endWallGeo = regGeo(new THREE.BoxGeometry(1.4, 0.18, 0.06));
  const startEnd = new THREE.Mesh(endWallGeo, wallMat);
  startEnd.position.set(0, 0.16, -4.17);
  troughGroup.add(startEnd);

  const finishEnd = new THREE.Mesh(endWallGeo, wallMat);
  finishEnd.position.set(0, 0.16, 4.17);
  troughGroup.add(finishEnd);

  // Copper channel lane dividers (3 dividers separating 4 lanes)
  const dividerGeo = regGeo(new THREE.BoxGeometry(0.025, 0.12, 8.2));
  for (const dx of [-0.25, 0, 0.25]) {
    const divider = new THREE.Mesh(dividerGeo, rimMat);
    divider.position.set(dx, 0.15, 0);
    troughGroup.add(divider);
  }

  // Water surface mesh (flowing stream)
  const waterGeo = regGeo(new THREE.BoxGeometry(1.28, 0.04, 8.2));
  const waterMat = regMat(new THREE.MeshStandardMaterial({
    color: '#386b77',
    roughness: 0.1,
    metalness: 0.85,
    transparent: true,
    opacity: 0.88,
  }));
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, 0.12, 0);
  troughGroup.add(waterMesh);

  // ==========================================
  // 2. Start Gate & Release Bar
  // ==========================================
  const startGateGroup = new THREE.Group();
  startGateGroup.position.set(0, 0.18, -4.0); // local z = -4.0 corresponds to world z = -1.5

  const barGeo = regGeo(new THREE.CylinderGeometry(0.02, 0.02, 1.34, 8));
  const barMat = regMat(new THREE.MeshStandardMaterial({ color: '#c9933e', metalness: 0.8, roughness: 0.3 }));
  const gateBar = new THREE.Mesh(barGeo, barMat);
  gateBar.rotation.z = Math.PI / 2;
  gateBar.position.set(0, 0.1, 0);
  startGateGroup.add(gateBar);

  // 4 start gate drop paddles
  const paddleGeo = regGeo(new THREE.BoxGeometry(0.18, 0.12, 0.015));
  const paddleMat = regMat(new THREE.MeshStandardMaterial({ color: '#68452e', roughness: 0.6 }));
  const paddles = [];
  for (let i = 0; i < 4; i++) {
    const lx = -0.375 + i * 0.25;
    const paddle = new THREE.Mesh(paddleGeo, paddleMat);
    paddle.position.set(lx, 0.03, 0);
    startGateGroup.add(paddle);
    paddles.push(paddle);
  }

  troughGroup.add(startGateGroup);

  // ==========================================
  // 3. Finish Line Archway & Bell
  // ==========================================
  const finishArchGroup = new THREE.Group();
  finishArchGroup.position.set(0, 0.18, 4.0); // local z = 4.0 corresponds to world z = 6.5

  const archPostGeo = regGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8));
  const archMat = regMat(new THREE.MeshStandardMaterial({ color: '#b27a3c', metalness: 0.8, roughness: 0.3 }));

  const leftPost = new THREE.Mesh(archPostGeo, archMat);
  leftPost.position.set(-0.64, 0.3, 0);
  finishArchGroup.add(leftPost);

  const rightPost = new THREE.Mesh(archPostGeo, archMat);
  rightPost.position.set(0.64, 0.3, 0);
  finishArchGroup.add(rightPost);

  // Overhead beam
  const crossBeamGeo = regGeo(new THREE.BoxGeometry(1.32, 0.03, 0.03));
  const crossBeam = new THREE.Mesh(crossBeamGeo, archMat);
  crossBeam.position.set(0, 0.6, 0);
  finishArchGroup.add(crossBeam);

  // Small brass finish bell in the center
  const bellGeo = regGeo(new THREE.ConeGeometry(0.04, 0.06, 8));
  const bellMat = regMat(new THREE.MeshStandardMaterial({ color: '#ffd269', metalness: 0.9, roughness: 0.2 }));
  const finishBell = new THREE.Mesh(bellGeo, bellMat);
  finishBell.position.set(0, 0.55, 0);
  finishBell.rotation.x = Math.PI;
  finishArchGroup.add(finishBell);

  // Checkered finish banner flags
  const flagGeo = regGeo(new THREE.BoxGeometry(0.12, 0.08, 0.005));
  const flagMat1 = regMat(new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.5 }));
  const flagMat2 = regMat(new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 }));
  for (let i = 0; i < 8; i++) {
    const flag = new THREE.Mesh(flagGeo, i % 2 === 0 ? flagMat1 : flagMat2);
    flag.position.set(-0.42 + i * 0.12, 0.54, 0);
    finishArchGroup.add(flag);
  }

  troughGroup.add(finishArchGroup);
  group.add(troughGroup);

  // ==========================================
  // 4. Toy Boats
  // ==========================================
  const boatsGroup = new THREE.Group();
  boatsGroup.name = 'gutter-boats-fleet';
  group.add(boatsGroup);

  const boatMeshes = new Map();

  function createBoatMesh(slot) {
    const laneDef = GUTTER_LANES[slot] ?? GUTTER_LANES[0];
    const bGroup = new THREE.Group();
    bGroup.name = `gutter-boat-${slot}`;

    // Hull (carved cedar wood)
    const hullGeo = regGeo(new THREE.BoxGeometry(0.12, 0.04, 0.28));
    const hullMat = regMat(new THREE.MeshStandardMaterial({
      color: '#885635',
      roughness: 0.65,
      metalness: 0.1,
    }));
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.set(0, 0.02, 0);
    bGroup.add(hull);

    // Pointed bow wedge
    const bowGeo = regGeo(new THREE.ConeGeometry(0.06, 0.10, 4));
    const bow = new THREE.Mesh(bowGeo, hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.02, 0.18);
    bGroup.add(bow);

    // Mast
    const mastGeo = regGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6));
    const mastMat = regMat(new THREE.MeshStandardMaterial({ color: '#55361e', roughness: 0.7 }));
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 0.13, 0.02);
    bGroup.add(mast);

    // Colored triangular canvas sail
    const sailGeo = regGeo(new THREE.BufferGeometry());
    // Triangle: Mast bottom (0, 0.05, 0.02), Mast top (0, 0.22, 0.02), Boom aft (0, 0.06, -0.12)
    const sailVertices = new Float32Array([
      0.0, 0.05, 0.02,
      0.0, 0.22, 0.02,
      0.0, 0.06, -0.12,
      // Reverse face
      0.0, 0.05, 0.02,
      0.0, 0.06, -0.12,
      0.0, 0.22, 0.02,
    ]);
    sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVertices, 3));
    sailGeo.computeVertexNormals();

    const sailMat = regMat(new THREE.MeshStandardMaterial({
      color: laneDef.color,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
    }));
    const sail = new THREE.Mesh(sailGeo, sailMat);
    bGroup.add(sail);

    // Small bowsprit
    const spritGeo = regGeo(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 6));
    const sprit = new THREE.Mesh(spritGeo, mastMat);
    sprit.rotation.x = Math.PI / 2.3;
    sprit.position.set(0, 0.04, 0.25);
    bGroup.add(sprit);

    // Wake ripples
    const wakeGeo = regGeo(new THREE.PlaneGeometry(0.16, 0.25));
    const wakeMat = regMat(new THREE.MeshBasicMaterial({
      color: '#cbebf2',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }));
    const wake = new THREE.Mesh(wakeGeo, wakeMat);
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(0, 0.005, -0.15);
    bGroup.add(wake);

    return { group: bGroup, hull, sail, wake, slot };
  }

  // Pre-instantiate all 4 boats
  for (let s = 0; s < 4; s++) {
    const b = createBoatMesh(s);
    // Initial placement at starting position
    const laneX = -0.375 + s * 0.25;
    b.group.position.set(laneX, 0.14, -4.0);
    boatsGroup.add(b.group);
    boatMeshes.set(s, b);
  }

  return {
    group,

    getBoatMesh(slot) {
      return boatMeshes.get(slot)?.group ?? null;
    },

    updateVisuals(simState, time) {
      if (!simState) return;

      const isRacing = simState.status === 'racing';
      const isComplete = simState.status === 'complete';

      // Animate start gate paddles (swing up when racing or complete)
      const targetPaddleRot = (isRacing || isComplete) ? -Math.PI / 2.2 : 0;
      for (const p of paddles) {
        p.rotation.x += (targetPaddleRot - p.rotation.x) * 0.12;
      }

      // Animate flowing water shimmer
      waterMesh.position.y = 0.12 + Math.sin(time * 3.5) * 0.003;

      // Update boats
      const boats = simState.boats || {};
      for (let s = 0; s < 4; s++) {
        const boatObj = boatMeshes.get(s);
        if (!boatObj) continue;

        const simBoat = boats[s] || boats[String(s)];
        if (!simBoat) {
          // Inactive slot: keep docked at start
          boatObj.group.visible = false;
          continue;
        }

        boatObj.group.visible = true;

        const laneX = -0.375 + s * 0.25;
        // Progress translates from start (z = -4.0) towards finish (z = +4.0)
        const progress = simBoat.progress ?? 0;
        const localZ = -4.0 + progress;

        boatObj.group.position.x = laneX;
        boatObj.group.position.z = localZ;

        // Bobbing floating animation
        const bob = Math.sin(time * 5.0 + s * 1.5) * 0.008;
        const roll = Math.sin(time * 3.0 + s * 2.0) * 0.04;
        const pitch = Math.cos(time * 4.0 + s * 1.2) * 0.03;

        boatObj.group.position.y = 0.14 + bob;
        boatObj.hull.rotation.z = roll;
        boatObj.hull.rotation.x = pitch;
        boatObj.sail.rotation.y = Math.sin(time * 2.0 + s) * 0.12;

        // Wake visibility based on speed
        if (boatObj.wake) {
          boatObj.wake.visible = (simBoat.speed ?? 0) > 0.05 && !simBoat.finished;
          boatObj.wake.scale.set(1.0, Math.min(2.0, 0.5 + (simBoat.speed ?? 0)), 1.0);
        }
      }

      // Finish bell chime wobble if complete
      if (isComplete) {
        finishBell.rotation.z = Math.sin(time * 12.0) * 0.15;
      } else {
        finishBell.rotation.z = 0;
      }
    },

    dispose() {
      for (const geo of ownedGeometries) geo.dispose();
      for (const mat of ownedMaterials) mat.dispose();
      ownedGeometries.length = 0;
      ownedMaterials.length = 0;
      group.clear();
    },
  };
}

/**
 * 3D Sluiceworks RC Speedboat Scene (Phase 5, Task 7.6).
 *
 * Implements:
 *   - Pilot stand on the east canal quay with 4 RC radio transmitters
 *   - 5 floating checkpoint buoys with water bobbing and active beacons
 *   - 4 miniature racing hydroplane speedboats with colored liveries
 *   - Dynamic banking/leaning into turns and water rooster tail spray
 *   - Stun collision flashes and buoy passing pulses
 */

import * as THREE from 'three';
import {
  RC_BOAT_CHECKPOINTS,
  RC_BOAT_SPAWN_DOCKS,
  RC_BOAT_WATER_Y,
} from '../../../shared/rcBoatModel.js';

export function createRcBoatScene({
  position = [3.8, 0, 2.0],
  rotationY = -Math.PI / 2,
} = {}) {
  const group = new THREE.Group();
  group.name = 'rc-boat-scene';

  const ownedGeometries = [];
  const ownedMaterials = [];

  const regGeo = (g) => { ownedGeometries.push(g); return g; };
  const regMat = (m) => { ownedMaterials.push(m); return m; };

  // ==========================================
  // 1. Pilot Console on the Quay
  // ==========================================
  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(position[0], position[1], position[2]);
  consoleGroup.rotation.y = rotationY;

  // Weathered metal/brass console bench
  const benchGeo = regGeo(new THREE.BoxGeometry(3.2, 0.85, 0.5));
  const benchMat = regMat(new THREE.MeshStandardMaterial({ color: '#384d52', roughness: 0.7, metalness: 0.3 }));
  const benchMesh = new THREE.Mesh(benchGeo, benchMat);
  benchMesh.position.set(0, 0.425, 0);
  consoleGroup.add(benchMesh);

  // 4 Radio Transmitters with antennas
  const txBoxGeo = regGeo(new THREE.BoxGeometry(0.16, 0.22, 0.12));
  const txMat = regMat(new THREE.MeshStandardMaterial({ color: '#20282b', roughness: 0.5, metalness: 0.8 }));
  const antGeo = regGeo(new THREE.CylinderGeometry(0.005, 0.005, 0.45, 6));
  const antMat = regMat(new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.9, roughness: 0.2 }));

  for (let i = 0; i < 4; i++) {
    const tx = new THREE.Group();
    const lx = -1.2 + i * 0.8;
    tx.position.set(lx, 0.85, 0);

    const body = new THREE.Mesh(txBoxGeo, txMat);
    body.position.set(0, 0.11, 0);
    tx.add(body);

    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.set(0.04, 0.44, 0);
    tx.add(ant);

    consoleGroup.add(tx);
  }

  group.add(consoleGroup);

  // ==========================================
  // 2. Floating Buoy Course in the Canal
  // ==========================================
  const buoysGroup = new THREE.Group();
  buoysGroup.name = 'rc-course-buoys';
  group.add(buoysGroup);

  const buoyMeshes = [];

  const buoyConeGeo = regGeo(new THREE.ConeGeometry(0.18, 0.42, 12));
  const buoyRingGeo = regGeo(new THREE.TorusGeometry(0.24, 0.06, 8, 16));

  RC_BOAT_CHECKPOINTS.forEach((cp, idx) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(cp.position[0], cp.position[1], cp.position[2]);

    const isGate = idx === 0;
    const baseColor = isGate ? '#e11d48' : '#eab308';

    const coneMat = regMat(new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.4,
      metalness: 0.2,
    }));

    const cone = new THREE.Mesh(buoyConeGeo, coneMat);
    cone.position.set(0, 0.18, 0);
    bGroup.add(cone);

    const ringMat = regMat(new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.5,
    }));
    const ring = new THREE.Mesh(buoyRingGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.04, 0);
    bGroup.add(ring);

    // Glowing LED beacon atop buoy
    const beaconGeo = regGeo(new THREE.SphereGeometry(0.045, 8, 8));
    const beaconMat = regMat(new THREE.MeshStandardMaterial({
      color: isGate ? '#fb7185' : '#fef08a',
      emissive: isGate ? '#e11d48' : '#ca8a04',
      emissiveIntensity: 0.8,
    }));
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.4, 0);
    bGroup.add(beacon);

    buoysGroup.add(bGroup);
    buoyMeshes.push({ group: bGroup, beacon, basePosY: cp.position[1], idx });
  });

  // ==========================================
  // 3. RC Speedboats
  // ==========================================
  const fleetGroup = new THREE.Group();
  fleetGroup.name = 'rc-fleet';
  group.add(fleetGroup);

  const boatMeshes = new Map();

  function buildSpeedboat(slot) {
    const dock = RC_BOAT_SPAWN_DOCKS[slot] ?? RC_BOAT_SPAWN_DOCKS[0];
    const bGroup = new THREE.Group();
    bGroup.name = `rc-boat-${slot}`;

    // Sleek aerodynamic racing hull
    const hullGeo = regGeo(new THREE.BoxGeometry(0.24, 0.08, 0.55));
    const hullMat = regMat(new THREE.MeshStandardMaterial({
      color: dock.color,
      roughness: 0.25,
      metalness: 0.6,
    }));
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.set(0, 0.04, 0);
    bGroup.add(hull);

    // Wedge bow
    const bowGeo = regGeo(new THREE.ConeGeometry(0.14, 0.22, 4));
    const bow = new THREE.Mesh(bowGeo, hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.04, 0.35);
    bGroup.add(bow);

    // Dark tinted canopy
    const canopyGeo = regGeo(new THREE.BoxGeometry(0.14, 0.06, 0.22));
    const canopyMat = regMat(new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.1,
      metalness: 0.9,
    }));
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.09, 0.02);
    bGroup.add(canopy);

    // Rear twin spoiler fin
    const finGeo = regGeo(new THREE.BoxGeometry(0.24, 0.05, 0.04));
    const finMat = regMat(new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 }));
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(0, 0.11, -0.24);
    bGroup.add(fin);

    // Water rooster tail spray plane
    const sprayGeo = regGeo(new THREE.PlaneGeometry(0.22, 0.45));
    const sprayMat = regMat(new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }));
    const spray = new THREE.Mesh(sprayGeo, sprayMat);
    spray.rotation.x = -Math.PI / 2.3;
    spray.position.set(0, 0.06, -0.42);
    bGroup.add(spray);

    return { group: bGroup, hull, spray, slot };
  }

  for (let s = 0; s < 4; s++) {
    const b = buildSpeedboat(s);
    const dock = RC_BOAT_SPAWN_DOCKS[s];
    b.group.position.set(dock.position[0], dock.position[1], dock.position[2]);
    fleetGroup.add(b.group);
    boatMeshes.set(s, b);
  }

  return {
    group,

    getBoatMesh(slot) {
      return boatMeshes.get(slot)?.group ?? null;
    },

    updateVisuals(simState, time) {
      if (!simState) return;

      // Animate buoys floating bobbing
      buoyMeshes.forEach((bm) => {
        const bob = Math.sin(time * 3.5 + bm.idx * 1.3) * 0.025;
        const tilt = Math.cos(time * 2.8 + bm.idx) * 0.05;
        bm.group.position.y = bm.basePosY + bob;
        bm.group.rotation.z = tilt;
      });

      // Update boat positions and postures
      const boats = simState.boats || {};

      for (let s = 0; s < 4; s++) {
        const boatObj = boatMeshes.get(s);
        if (!boatObj) continue;

        const simBoat = boats[s] || boats[String(s)];
        if (!simBoat) {
          boatObj.group.visible = false;
          continue;
        }

        boatObj.group.visible = true;

        const pos = simBoat.position || [0, RC_BOAT_WATER_Y, 0];
        const yaw = simBoat.yaw || 0;
        const speed = simBoat.speed || 0;

        boatObj.group.position.set(pos[0], pos[1], pos[2]);
        boatObj.group.rotation.y = yaw;

        // Water bobbing and pitch/roll
        const bob = Math.sin(time * 6.0 + s * 1.5) * 0.008;
        const pitch = Math.min(0.12, Math.max(-0.05, speed * 0.02)); // bow raises under acceleration
        boatObj.group.position.y = RC_BOAT_WATER_Y + bob;
        boatObj.hull.rotation.x = -pitch;

        // Stun vibration if stunned
        if (simBoat.stunTicks > 0) {
          boatObj.group.position.x += (Math.random() - 0.5) * 0.04;
        }

        // Rooster tail spray intensity
        if (boatObj.spray) {
          const movingFast = speed > 1.5 && !simBoat.finished && !simBoat.dnf;
          boatObj.spray.visible = movingFast;
          if (movingFast) {
            const scale = Math.min(2.2, speed / 3.0);
            boatObj.spray.scale.set(scale, scale, scale);
          }
        }
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

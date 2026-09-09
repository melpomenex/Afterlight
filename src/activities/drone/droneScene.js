/**
 * 3D Drone Scene: drone models, checkpoint gates, and launch station (Task 7.3).
 *
 * Implements:
 * - 4 distinct quadcopter drone models with rotating propeller discs and LED lights
 * - 6 illuminated aerial checkpoint rings in High Awnings airspace
 * - Launch rack with 4 pilot terminals and landing pads
 * - Visual interpolation and gate highlight states
 */

import * as THREE from 'three';
import { DRONE_CHECKPOINTS, DRONE_SPAWN_PADS } from '../../../shared/droneModel.js';

const PILOT_COLORS = ['#e8563f', '#38bdf8', '#7da05a', '#edb66c'];

export function createDroneScene({ position = [-3.0, 0, 3.5], rotationY = 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'drone-racing-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const ownedGeometries = [];
  const ownedMaterials = [];

  const regGeo = (g) => { ownedGeometries.push(g); return g; };
  const regMat = (m) => { ownedMaterials.push(m); return m; };

  // ==========================================
  // 1. Launch Rack & Pilot Console
  // ==========================================
  const rackGroup = new THREE.Group();
  rackGroup.name = 'drone-launch-rack';

  // Base platform
  const baseGeo = regGeo(new THREE.BoxGeometry(3.6, 0.2, 1.6));
  const baseMat = regMat(new THREE.MeshStandardMaterial({ color: '#2a353d', roughness: 0.7, metalness: 0.5 }));
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.set(0, 0.1, 0);
  rackGroup.add(baseMesh);

  // 4 Landing pads
  const padGeo = regGeo(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16));
  const consoleGeo = regGeo(new THREE.BoxGeometry(0.3, 0.8, 0.2));
  const consoleMat = regMat(new THREE.MeshStandardMaterial({ color: '#1a2228', roughness: 0.5, metalness: 0.8 }));

  for (let i = 0; i < 4; i++) {
    const padX = -1.2 + i * 0.8;
    const padMat = regMat(new THREE.MeshStandardMaterial({
      color: PILOT_COLORS[i],
      roughness: 0.4,
      metalness: 0.6,
      emissive: PILOT_COLORS[i],
      emissiveIntensity: 0.2,
    }));
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(padX, 0.22, -0.3);
    rackGroup.add(padMesh);

    // Pilot standing terminal
    const termMesh = new THREE.Mesh(consoleGeo, consoleMat);
    termMesh.position.set(padX, 0.6, 0.45);
    rackGroup.add(termMesh);

    // Terminal screen
    const screenGeo = regGeo(new THREE.PlaneGeometry(0.24, 0.16));
    const screenMat = regMat(new THREE.MeshBasicMaterial({ color: PILOT_COLORS[i] }));
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(padX, 0.85, 0.56);
    screenMesh.rotation.x = -Math.PI / 6;
    rackGroup.add(screenMesh);
  }

  group.add(rackGroup);

  // ==========================================
  // 2. Aerial Checkpoint Rings
  // ==========================================
  // Checkpoint coordinates are absolute world coords, so checkpoint group
  // is placed at world origin or offset relative to activity position.
  const checkpointsGroup = new THREE.Group();
  checkpointsGroup.name = 'drone-checkpoint-gates';
  checkpointsGroup.position.set(-position[0], -position[1], -position[2]);

  const gateRingGeo = regGeo(new THREE.TorusGeometry(1.8, 0.08, 12, 32));
  const gatePillarGeo = regGeo(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8));
  const gatePillarMat = regMat(new THREE.MeshStandardMaterial({ color: '#4a555c', metalness: 0.8, roughness: 0.3 }));

  const checkpointMeshes = [];

  for (const cp of DRONE_CHECKPOINTS) {
    const cpGroup = new THREE.Group();
    cpGroup.position.set(cp.position[0], cp.position[1], cp.position[2]);

    const ringMat = regMat(new THREE.MeshStandardMaterial({
      color: cp.index === 0 ? '#ffb24d' : '#38bdf8',
      emissive: cp.index === 0 ? '#ffb24d' : '#38bdf8',
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.7,
    }));

    const ringMesh = new THREE.Mesh(gateRingGeo, ringMat);
    cpGroup.add(ringMesh);

    // Support tether
    const pillarMesh = new THREE.Mesh(gatePillarGeo, gatePillarMat);
    pillarMesh.position.set(0, -1.9, 0);
    cpGroup.add(pillarMesh);

    checkpointsGroup.add(cpGroup);
    checkpointMeshes.push({ group: cpGroup, ringMesh, material: ringMat, index: cp.index });
  }

  group.add(checkpointsGroup);

  // ==========================================
  // 3. Drone 3D Models (Slots 0..3)
  // ==========================================
  const dronesGroup = new THREE.Group();
  dronesGroup.name = 'drones-actors';
  dronesGroup.position.set(-position[0], -position[1], -position[2]);

  const droneMeshes = {};
  const bodyGeo = regGeo(new THREE.BoxGeometry(0.35, 0.1, 0.35));
  const armGeo = regGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8));
  const rotorGeo = regGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.015, 12));
  const armMat = regMat(new THREE.MeshStandardMaterial({ color: '#1f262b', metalness: 0.9, roughness: 0.2 }));
  const rotorMat = regMat(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45 }));

  for (let i = 0; i < 4; i++) {
    const dGroup = new THREE.Group();
    dGroup.name = `drone-pilot-${i}`;

    const bodyMat = regMat(new THREE.MeshStandardMaterial({
      color: PILOT_COLORS[i],
      metalness: 0.7,
      roughness: 0.3,
      emissive: PILOT_COLORS[i],
      emissiveIntensity: 0.25,
    }));
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    dGroup.add(bodyMesh);

    // Diagonal arms
    const arm1 = new THREE.Mesh(armGeo, armMat);
    arm1.rotation.z = Math.PI / 2;
    arm1.rotation.y = Math.PI / 4;
    dGroup.add(arm1);

    const arm2 = new THREE.Mesh(armGeo, armMat);
    arm2.rotation.z = Math.PI / 2;
    arm2.rotation.y = -Math.PI / 4;
    dGroup.add(arm2);

    // 4 Rotors
    const rotors = [];
    const rotorOffsets = [
      [0.2, 0.06, 0.2],
      [-0.2, 0.06, 0.2],
      [0.2, 0.06, -0.2],
      [-0.2, 0.06, -0.2],
    ];

    for (const [rx, ry, rz] of rotorOffsets) {
      const rMesh = new THREE.Mesh(rotorGeo, rotorMat);
      rMesh.position.set(rx, ry, rz);
      dGroup.add(rMesh);
      rotors.push(rMesh);
    }

    // Front LED light
    const ledGeo = regGeo(new THREE.SphereGeometry(0.04, 8, 8));
    const ledMat = regMat(new THREE.MeshBasicMaterial({ color: '#00ffcc' }));
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0, 0.02, -0.2);
    dGroup.add(ledMesh);

    // Initial spawn placement
    const pad = DRONE_SPAWN_PADS[i];
    dGroup.position.set(pad.position[0], pad.position[1], pad.position[2]);

    dronesGroup.add(dGroup);
    droneMeshes[i] = { group: dGroup, rotors, bodyMesh };
  }

  group.add(dronesGroup);

  // ==========================================
  // 4. Visual Update & Animation
  // ==========================================
  function updateVisuals(simState, time = 0) {
    if (!simState || !simState.drones) return;

    // Update active drone positions & rotor spin
    for (let slot = 0; slot < 4; slot++) {
      const droneData = simState.drones[slot] ?? simState.drones[String(slot)];
      const droneMesh = droneMeshes[slot];
      if (!droneMesh) continue;

      if (!droneData || droneData.dnf) {
        // Inactive or DNF: hide or perch
        if (droneData?.dnf) {
          droneMesh.group.visible = true;
          droneMesh.group.position.set(DRONE_SPAWN_PADS[slot].position[0], 0.3, DRONE_SPAWN_PADS[slot].position[2]);
          droneMesh.group.rotation.set(0, 0, 0);
        } else {
          droneMesh.group.visible = false;
        }
        continue;
      }

      droneMesh.group.visible = true;

      // Smooth position interpolation
      const targetPos = droneData.position;
      droneMesh.group.position.set(targetPos[0], targetPos[1], targetPos[2]);

      // Rotation [pitch, yaw, roll]
      if (droneData.rotation) {
        droneMesh.group.rotation.set(
          droneData.rotation[0],
          droneData.rotation[1],
          droneData.rotation[2]
        );
      }

      // Rotor blades spin
      const spinSpeed = droneData.finished ? 2.0 : 25.0;
      for (const r of droneMesh.rotors) {
        r.rotation.y += spinSpeed * 0.016;
      }
    }

    // Highlight checkpoints:
    // Determine the next checkpoint for the leader
    const activeDrones = Object.values(simState.drones).filter(d => !d.finished && !d.dnf);
    const targetIdx = activeDrones.length > 0 ? activeDrones[0].nextCheckpoint : 0;

    for (const cp of checkpointMeshes) {
      if (cp.index === targetIdx) {
        // Next checkpoint: pulsating cyan glow
        const pulse = 0.8 + Math.sin(time * 6) * 0.4;
        cp.material.emissive.set(cp.index === 0 ? '#ffb24d' : '#00ffcc');
        cp.material.emissiveIntensity = pulse;
        cp.group.scale.setScalar(1.05);
      } else {
        cp.material.emissive.set(cp.index === 0 ? '#ffb24d' : '#38bdf8');
        cp.material.emissiveIntensity = 0.4;
        cp.group.scale.setScalar(1.0);
      }
    }
  }

  function dispose() {
    for (const g of ownedGeometries) g.dispose();
    for (const m of ownedMaterials) m.dispose();
    ownedGeometries.length = 0;
    ownedMaterials.length = 0;
    if (group.parent) {
      group.parent.remove(group);
    }
  }

  return {
    group,
    updateVisuals,
    dispose,
    getDroneMesh: (slot) => droneMeshes[slot],
  };
}

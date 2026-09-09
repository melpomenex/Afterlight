/**
 * 3D Paper Airplane Scene (Phase 5, Task 7.4).
 *
 * Implements:
 *   - Overlook launch desk with folding station, paper sheets, and distance ruler
 *   - Folded origami paper airplane models (creased delta wings, pilot color trims)
 *   - Smooth trajectory playback and banking animation over the skyline
 *   - Chalk landing marks and distance distance beacons
 */

import * as THREE from 'three';

const PILOT_COLORS = ['#38bdf8', '#ffb24d'];

export function createPaperAirplaneScene({
  position = [7.5, 0, -7.5],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'paper-airplane-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const ownedGeometries = [];
  const ownedMaterials = [];

  const regGeo = (g) => { ownedGeometries.push(g); return g; };
  const regMat = (m) => { ownedMaterials.push(m); return m; };

  // ==========================================
  // 1. Launch Table & Folding Station
  // ==========================================
  const tableGroup = new THREE.Group();
  tableGroup.name = 'launch-table';

  // Wooden table top
  const topGeo = regGeo(new THREE.BoxGeometry(1.6, 0.08, 0.9));
  const topMat = regMat(new THREE.MeshStandardMaterial({
    color: '#7a5a3a',
    roughness: 0.6,
    metalness: 0.2,
  }));
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.set(0, 0.9, 0);
  tableGroup.add(topMesh);

  // Table legs
  const legGeo = regGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8));
  const legMat = regMat(new THREE.MeshStandardMaterial({ color: '#2d373e', roughness: 0.7, metalness: 0.8 }));
  for (const [lx, lz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) {
    const legMesh = new THREE.Mesh(legGeo, legMat);
    legMesh.position.set(lx, 0.45, lz);
    tableGroup.add(legMesh);
  }

  // Paper sheets on the desk
  const sheetGeo = regGeo(new THREE.BoxGeometry(0.3, 0.015, 0.22));
  const sheetMat = regMat(new THREE.MeshStandardMaterial({ color: '#f0ece1', roughness: 0.9 }));
  const sheetMesh = new THREE.Mesh(sheetGeo, sheetMat);
  sheetMesh.position.set(-0.4, 0.95, 0);
  tableGroup.add(sheetMesh);

  // Brass ruler along the north edge
  const rulerGeo = regGeo(new THREE.BoxGeometry(1.2, 0.01, 0.04));
  const rulerMat = regMat(new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.8, roughness: 0.3 }));
  const rulerMesh = new THREE.Mesh(rulerGeo, rulerMat);
  rulerMesh.position.set(0, 0.945, -0.38);
  tableGroup.add(rulerMesh);

  group.add(tableGroup);

  // ==========================================
  // 2. Paper Airplane Glider Mesh
  // ==========================================
  // Relative to world origin, so placed in absolute airspace
  const planesGroup = new THREE.Group();
  planesGroup.name = 'airplanes-actors';
  planesGroup.position.set(-position[0], -position[1], -position[2]);

  function buildAirplaneMesh(colorHex) {
    const pGroup = new THREE.Group();

    // Origami delta wing geometry using indexed buffer geometry
    const wingGeo = new THREE.BufferGeometry();
    // Vertices: Nose (0), Left Wingtip (1), Keel Bottom (2), Right Wingtip (3), Keel Tail (4)
    const vertices = new Float32Array([
      0.0, 0.02, -0.35,  // 0: Nose
      -0.28, 0.05, 0.15, // 1: Left wingtip
      0.0, -0.06, 0.12,  // 2: Keel bottom
      0.28, 0.05, 0.15,  // 3: Right wingtip
      0.0, 0.04, 0.16,   // 4: Central keel tail
    ]);

    // Faces: [0, 1, 4] Left wing top, [0, 4, 3] Right wing top,
    //        [0, 2, 1] Left fold,     [0, 3, 2] Right fold
    const indices = [
      0, 1, 4,
      0, 4, 3,
      0, 2, 1,
      0, 3, 2,
    ];

    wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    wingGeo.setIndex(indices);
    wingGeo.computeVertexNormals();
    regGeo(wingGeo);

    const wingMat = regMat(new THREE.MeshStandardMaterial({
      color: '#f8f5ee',
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    }));

    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    pGroup.add(wingMesh);

    // Colored pilot stripe on spine
    const spineGeo = regGeo(new THREE.BoxGeometry(0.02, 0.015, 0.45));
    const spineMat = regMat(new THREE.MeshBasicMaterial({ color: colorHex }));
    const spineMesh = new THREE.Mesh(spineGeo, spineMat);
    spineMesh.position.set(0, 0.03, -0.08);
    pGroup.add(spineMesh);

    return pGroup;
  }

  const planeMeshes = {
    0: buildAirplaneMesh(PILOT_COLORS[0]),
    1: buildAirplaneMesh(PILOT_COLORS[1]),
  };

  for (let i = 0; i < 2; i++) {
    planeMeshes[i].visible = false;
    planesGroup.add(planeMeshes[i]);
  }

  group.add(planesGroup);

  // ==========================================
  // 3. Landing Markers (Chalk circles & Beacons)
  // ==========================================
  const markersGroup = new THREE.Group();
  markersGroup.name = 'airplane-landing-markers';
  markersGroup.position.set(-position[0], -position[1], -position[2]);

  const markerGeo = regGeo(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 16));
  const markerMeshes = [];

  function addLandingMarker(pos, colorHex, distanceMeters) {
    const mat = regMat(new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.8,
    }));
    const mesh = new THREE.Mesh(markerGeo, mat);
    mesh.position.set(pos[0], 0.05, pos[2]);

    // Small vertical beacon pole
    const poleGeo = regGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6));
    const poleMat = regMat(new THREE.MeshBasicMaterial({ color: colorHex }));
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.set(0, 0.4, 0);
    mesh.add(poleMesh);

    markersGroup.add(mesh);
    markerMeshes.push(mesh);
    void distanceMeters;
  }

  group.add(markersGroup);

  // ==========================================
  // 4. Trajectory Playback & Update
  // ==========================================
  const activeFlights = {}; // slot -> { trajectory, startTime, durationMs, landingPos, color }

  function playTrajectory(slot, flightData) {
    if (!flightData || !flightData.trajectory || flightData.trajectory.length === 0) return;
    activeFlights[slot] = {
      trajectory: flightData.trajectory,
      startTime: performance.now(),
      durationMs: flightData.flightTimeMs || 3000,
      landingPos: flightData.landingPos,
      distance: flightData.distance,
      color: PILOT_COLORS[slot] || '#ffffff',
    };
    if (planeMeshes[slot]) planeMeshes[slot].visible = true;
  }

  function updateVisuals(simState, time = 0) {
    const now = performance.now();

    for (let slot = 0; slot < 2; slot++) {
      const flight = activeFlights[slot];
      const mesh = planeMeshes[slot];
      if (!mesh) continue;

      if (!flight) {
        // Show perched at launch table if in aiming state
        const originX = 7.0 + slot * 0.8;
        mesh.visible = simState?.status === 'aiming';
        mesh.position.set(originX, 1.05, -7.5);
        mesh.rotation.set(0, 0, 0);
        continue;
      }

      const elapsedMs = now - flight.startTime;
      const progress = Math.min(1.0, elapsedMs / flight.durationMs);

      const traj = flight.trajectory;
      const targetIndex = Math.min(
        traj.length - 1,
        Math.floor(progress * (traj.length - 1))
      );
      const pt = traj[targetIndex];

      if (pt) {
        mesh.position.set(pt.x, Math.max(0.05, pt.y), pt.z);

        // Attitude calculation from velocities
        const vx = pt.vx || 0;
        const vy = pt.vy || 0;
        const vz = pt.vz || -1;
        const hSpeed = Math.hypot(vx, vz);

        const pitch = Math.atan2(vy, Math.max(0.1, hSpeed));
        const yaw = Math.atan2(vx, -vz);
        // Bank into turns
        const roll = -Math.max(-0.6, Math.min(0.6, vx * 0.1));

        mesh.rotation.set(pitch, yaw, roll);
      }

      if (progress >= 1.0) {
        // Landed!
        addLandingMarker(flight.landingPos, flight.color, flight.distance);
        delete activeFlights[slot];
      }
    }
    void time;
  }

  function clearMarkers() {
    for (const m of markerMeshes) {
      if (m.parent) m.parent.remove(m);
    }
    markerMeshes.length = 0;
  }

  function dispose() {
    clearMarkers();
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
    playTrajectory,
    updateVisuals,
    clearMarkers,
    dispose,
    getPlaneMesh: (slot) => planeMeshes[slot],
  };
}

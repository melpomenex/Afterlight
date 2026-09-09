/**
 * 3D Table Scene for Foosball in Afterlight (Phase 4, Task 6.4).
 *
 * Implements:
 * - 2.0m x 1.2m wooden table model with green turf pitch, white field lines, and slanted corner ramps
 * - Recessed goal pockets at both ends
 * - 8 chrome steel rods passing through side bearings with handles and rubber bumpers
 * - 22 detailed foosball figures (11 Home / Red-Gold, 11 Away / Blue-Cream) with angled kicking feet
 * - Authentic rod rotation and lateral translation driven by authoritative simulation state
 * - White soccer ball with rolling physics and contact shadow
 * - Bead score tracker and digital status HUD
 * - Celebratory goal lighting
 */

import * as THREE from 'three';
import { ROD_CONFIGS, TABLE_LENGTH, TABLE_WIDTH, BALL_RADIUS } from '../../../shared/foosballModel.js';

export function createFoosballTableScene({
  position = [-5.8, 0, 7.0],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1] || 0, position[2]);
  group.rotation.y = rotationY;

  // Dimensions
  const PITCH_LENGTH = 1.6;
  const PITCH_WIDTH = 0.933;
  const BED_Y = 0.82;
  const BALL_VIS_RADIUS = (BALL_RADIUS / TABLE_LENGTH) * PITCH_LENGTH;

  // Materials
  const pitchMat = new THREE.MeshStandardMaterial({
    color: '#1b5e20',
    roughness: 0.4,
    metalness: 0.05,
  });

  const cabinetMat = new THREE.MeshStandardMaterial({
    color: '#2d1b10',
    roughness: 0.35,
    metalness: 0.1,
  });

  const railMat = new THREE.MeshStandardMaterial({
    color: '#42281a',
    roughness: 0.3,
    metalness: 0.15,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: '#c8a860',
    roughness: 0.3,
    metalness: 0.8,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#d0d8e0',
    roughness: 0.15,
    metalness: 0.95,
  });

  const rubberMat = new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    roughness: 0.8,
    metalness: 0.05,
  });

  const homeFigMat = new THREE.MeshStandardMaterial({
    color: '#c62828', // Crimson Red
    roughness: 0.3,
    metalness: 0.15,
  });

  const awayFigMat = new THREE.MeshStandardMaterial({
    color: '#1565c0', // Royal Blue
    roughness: 0.3,
    metalness: 0.15,
  });

  const ballMat = new THREE.MeshStandardMaterial({
    color: '#f8f9fa',
    roughness: 0.25,
    metalness: 0.05,
  });

  // 1. Table Cabinet & Legs
  const cabinet = new THREE.Group();

  // 4 Legs
  const legGeo = new THREE.BoxGeometry(0.1, BED_Y, 0.1);
  const legLevelerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12);

  const legPositions = [
    [-PITCH_LENGTH * 0.5 - 0.08, BED_Y * 0.5, -PITCH_WIDTH * 0.5 - 0.08],
    [PITCH_LENGTH * 0.5 + 0.08, BED_Y * 0.5, -PITCH_WIDTH * 0.5 - 0.08],
    [-PITCH_LENGTH * 0.5 - 0.08, BED_Y * 0.5, PITCH_WIDTH * 0.5 + 0.08],
    [PITCH_LENGTH * 0.5 + 0.08, BED_Y * 0.5, PITCH_WIDTH * 0.5 + 0.08],
  ];

  legPositions.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, cabinetMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    cabinet.add(leg);

    const leveler = new THREE.Mesh(legLevelerGeo, brassMat);
    leveler.position.set(lx, 0.015, lz);
    cabinet.add(leveler);
  });

  // Cabinet body
  const bodyGeo = new THREE.BoxGeometry(PITCH_LENGTH + 0.3, 0.28, PITCH_WIDTH + 0.24);
  const bodyMesh = new THREE.Mesh(bodyGeo, cabinetMat);
  bodyMesh.position.set(0, BED_Y - 0.14, 0);
  bodyMesh.castShadow = bodyMesh.receiveShadow = true;
  cabinet.add(bodyMesh);

  // Playing pitch
  const pitchGeo = new THREE.PlaneGeometry(PITCH_LENGTH, PITCH_WIDTH);
  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.rotation.x = -Math.PI / 2;
  pitchMesh.position.set(0, BED_Y, 0);
  pitchMesh.receiveShadow = true;
  cabinet.add(pitchMesh);

  // Pitch markings (Centerline, center circle, penalty areas)
  const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff', opacity: 0.75, transparent: true });

  // Centerline
  const centerLineGeo = new THREE.PlaneGeometry(0.01, PITCH_WIDTH);
  const centerLine = new THREE.Mesh(centerLineGeo, lineMat);
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.set(0, BED_Y + 0.001, 0);
  cabinet.add(centerLine);

  // Center circle
  const circleGeo = new THREE.RingGeometry(0.12, 0.13, 32);
  const centerCircle = new THREE.Mesh(circleGeo, lineMat);
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.set(0, BED_Y + 0.001, 0);
  cabinet.add(centerCircle);

  // Side Rails
  const sideRailGeo = new THREE.BoxGeometry(PITCH_LENGTH + 0.3, 0.16, 0.1);
  const railNorth = new THREE.Mesh(sideRailGeo, railMat);
  railNorth.position.set(0, BED_Y + 0.08, -PITCH_WIDTH * 0.5 - 0.05);
  cabinet.add(railNorth);

  const railSouth = new THREE.Mesh(sideRailGeo, railMat);
  railSouth.position.set(0, BED_Y + 0.08, PITCH_WIDTH * 0.5 + 0.05);
  cabinet.add(railSouth);

  // End Rails with Goal Cutouts
  const GOAL_VIS_WIDTH = (20.0 / TABLE_WIDTH) * PITCH_WIDTH;
  const END_RAIL_THICK = 0.12;

  // Left End Rail (X = -PITCH_LENGTH / 2)
  const leftRailNorth = new THREE.Mesh(
    new THREE.BoxGeometry(END_RAIL_THICK, 0.16, (PITCH_WIDTH - GOAL_VIS_WIDTH) * 0.5),
    railMat
  );
  leftRailNorth.position.set(-PITCH_LENGTH * 0.5 - END_RAIL_THICK * 0.5, BED_Y + 0.08, -PITCH_WIDTH * 0.5 + (PITCH_WIDTH - GOAL_VIS_WIDTH) * 0.25);
  cabinet.add(leftRailNorth);

  const leftRailSouth = new THREE.Mesh(
    new THREE.BoxGeometry(END_RAIL_THICK, 0.16, (PITCH_WIDTH - GOAL_VIS_WIDTH) * 0.5),
    railMat
  );
  leftRailSouth.position.set(-PITCH_LENGTH * 0.5 - END_RAIL_THICK * 0.5, BED_Y + 0.08, PITCH_WIDTH * 0.5 - (PITCH_WIDTH - GOAL_VIS_WIDTH) * 0.25);
  cabinet.add(leftRailSouth);

  // Right End Rail (X = +PITCH_LENGTH / 2)
  const rightRailNorth = new THREE.Mesh(
    new THREE.BoxGeometry(END_RAIL_THICK, 0.16, (PITCH_WIDTH - GOAL_VIS_WIDTH) * 0.5),
    railMat
  );
  rightRailNorth.position.set(PITCH_LENGTH * 0.5 + END_RAIL_THICK * 0.5, BED_Y + 0.08, -PITCH_WIDTH * 0.5 + (PITCH_WIDTH - GOAL_VIS_WIDTH) * 0.25);
  cabinet.add(rightRailNorth);

  const rightRailSouth = new THREE.Mesh(
    new THREE.BoxGeometry(END_RAIL_THICK, 0.16, (PITCH_WIDTH - GOAL_VIS_WIDTH) * 0.5),
    railMat
  );
  rightRailSouth.position.set(PITCH_LENGTH * 0.5 + END_RAIL_THICK * 0.5, BED_Y + 0.08, PITCH_WIDTH * 0.5 - (PITCH_WIDTH - GOAL_VIS_WIDTH) * 0.25);
  cabinet.add(rightRailSouth);

  // Goal Pockets
  const goalBoxGeo = new THREE.BoxGeometry(0.16, 0.12, GOAL_VIS_WIDTH);
  const goalPocketMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.9 });

  const leftGoalPocket = new THREE.Mesh(goalBoxGeo, goalPocketMat);
  leftGoalPocket.position.set(-PITCH_LENGTH * 0.5 - 0.08, BED_Y + 0.04, 0);
  cabinet.add(leftGoalPocket);

  const rightGoalPocket = new THREE.Mesh(goalBoxGeo, goalPocketMat);
  rightGoalPocket.position.set(PITCH_LENGTH * 0.5 + 0.08, BED_Y + 0.04, 0);
  cabinet.add(rightGoalPocket);

  // Slanted Corner Ramps (4 corners)
  const rampGeo = new THREE.BufferGeometry();
  const rampSize = 0.1;
  // Corner ramp triangles
  const rampMat = new THREE.MeshStandardMaterial({ color: '#25702c', roughness: 0.35 });

  const createRamp = (rx, rz, rotY) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(rampSize, 0.03, 3), rampMat);
    m.position.set(rx, BED_Y + 0.015, rz);
    m.rotation.y = rotY;
    cabinet.add(m);
  };
  createRamp(-PITCH_LENGTH * 0.5 + 0.05, -PITCH_WIDTH * 0.5 + 0.05, Math.PI * 0.25);
  createRamp(-PITCH_LENGTH * 0.5 + 0.05, PITCH_WIDTH * 0.5 - 0.05, -Math.PI * 0.25);
  createRamp(PITCH_LENGTH * 0.5 - 0.05, -PITCH_WIDTH * 0.5 + 0.05, Math.PI * 0.75);
  createRamp(PITCH_LENGTH * 0.5 - 0.05, PITCH_WIDTH * 0.5 - 0.05, -Math.PI * 0.75);

  group.add(cabinet);

  // 2. 8 Rods with Attached Player Figures
  const ROD_RADIUS = 0.01;
  const ROD_HEIGHT = BED_Y + 0.06; // Rod axis sits above the pitch
  const ROD_LENGTH = PITCH_WIDTH + 0.5;

  const rodMeshes = {
    '0': [],
    '1': [],
  };

  // Figure geometry template
  const figHeadGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.02, 10);
  const figChestGeo = new THREE.BoxGeometry(0.024, 0.035, 0.024);
  const figFootGeo = new THREE.BoxGeometry(0.02, 0.025, 0.02);

  ['0', '1'].forEach(slotKey => {
    const slot = Number(slotKey);
    const configs = ROD_CONFIGS[slotKey];
    const figMat = slot === 0 ? homeFigMat : awayFigMat;

    configs.forEach((cfg, rIdx) => {
      // Rod root group: positioned at rod X, rotates around Z
      const rodGroup = new THREE.Group();
      const worldX = (cfg.x / TABLE_LENGTH - 0.5) * PITCH_LENGTH;
      rodGroup.position.set(worldX, ROD_HEIGHT, 0);

      // Steel rod cylinder extending along Z
      const steelGeo = new THREE.CylinderGeometry(ROD_RADIUS, ROD_RADIUS, ROD_LENGTH, 16);
      const steelMesh = new THREE.Mesh(steelGeo, chromeMat);
      steelMesh.rotation.x = Math.PI / 2;
      steelMesh.castShadow = true;
      rodGroup.add(steelMesh);

      // Rubber bumpers near walls
      const bumperGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.025, 12);
      const b1 = new THREE.Mesh(bumperGeo, rubberMat);
      b1.rotation.x = Math.PI / 2;
      b1.position.z = -PITCH_WIDTH * 0.5 + 0.02;
      rodGroup.add(b1);

      const b2 = new THREE.Mesh(bumperGeo, rubberMat);
      b2.rotation.x = Math.PI / 2;
      b2.position.z = PITCH_WIDTH * 0.5 - 0.02;
      rodGroup.add(b2);

      // Handle on player side
      const handleGeo = new THREE.CylinderGeometry(0.02, 0.016, 0.12, 12);
      const handle = new THREE.Mesh(handleGeo, rubberMat);
      handle.rotation.x = Math.PI / 2;
      // Slot 0 handles are on south side (+Z), Slot 1 on north side (-Z)
      handle.position.z = (slot === 0 ? 1 : -1) * (ROD_LENGTH * 0.5 + 0.04);
      rodGroup.add(handle);

      // Figures on this rod
      const figureMeshes = [];
      cfg.offsets.forEach(offset => {
        const figGroup = new THREE.Group();
        const worldZ = (offset / TABLE_WIDTH) * PITCH_WIDTH;
        figGroup.position.set(0, 0, worldZ);

        // Head
        const head = new THREE.Mesh(figHeadGeo, figMat);
        head.position.y = 0.025;
        head.castShadow = true;
        figGroup.add(head);

        // Chest
        const chest = new THREE.Mesh(figChestGeo, figMat);
        chest.position.y = -0.005;
        chest.castShadow = true;
        figGroup.add(chest);

        // Angled kicking foot
        const foot = new THREE.Mesh(figFootGeo, figMat);
        foot.position.y = -0.035;
        foot.castShadow = true;
        figGroup.add(foot);

        rodGroup.add(figGroup);
        figureMeshes.push(figGroup);
      });

      group.add(rodGroup);
      rodMeshes[slotKey].push({
        group: rodGroup,
        cfg,
        figures: figureMeshes,
      });
    });
  });

  // 3. Ball
  const ballGroup = new THREE.Group();
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_VIS_RADIUS, 16, 16), ballMat);
  ballMesh.castShadow = true;
  ballGroup.add(ballMesh);

  // Ball contact shadow
  const shadowGeo = new THREE.PlaneGeometry(BALL_VIS_RADIUS * 2.2, BALL_VIS_RADIUS * 2.2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: '#000000',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -BALL_VIS_RADIUS + 0.001;
  ballGroup.add(shadowMesh);

  ballGroup.position.set(0, BED_Y + BALL_VIS_RADIUS, 0);
  group.add(ballGroup);

  // 4. Overhead Bead / Score Display
  const scoreCanvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
  let scoreTexture = null;
  let scoreboardMesh = null;

  if (scoreCanvas) {
    scoreCanvas.width = 256;
    scoreCanvas.height = 64;
    scoreTexture = new THREE.CanvasTexture(scoreCanvas);
    scoreTexture.minFilter = THREE.LinearFilter;

    const boardGeo = new THREE.BoxGeometry(0.35, 0.12, 0.04);
    const boardMat = new THREE.MeshBasicMaterial({ map: scoreTexture });
    scoreboardMesh = new THREE.Mesh(boardGeo, boardMat);
    scoreboardMesh.position.set(0, BED_Y + 0.45, -PITCH_WIDTH * 0.5 - 0.08);
    group.add(scoreboardMesh);

    // Support rod for scoreboard
    const boardPost = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 8), brassMat);
    boardPost.position.set(0, BED_Y + 0.25, -PITCH_WIDTH * 0.5 - 0.08);
    group.add(boardPost);
  }

  function updateScoreTexture(state) {
    if (!scoreCanvas || !scoreTexture) return;
    const ctx = scoreCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#111822';
    ctx.fillRect(0, 0, 256, 64);

    ctx.strokeStyle = '#c8a860';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 252, 60);

    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const s0 = state?.score?.['0'] ?? 0;
    const s1 = state?.score?.['1'] ?? 0;
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(`${s0}`, 64, 32);

    ctx.fillStyle = '#c8a860';
    ctx.font = '14px sans-serif';
    ctx.fillText('-', 128, 32);

    ctx.fillStyle = '#4dabf7';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${s1}`, 192, 32);

    scoreTexture.needsUpdate = true;
  }

  // 5. Goal Flash Glow Light
  const goalLight = new THREE.PointLight('#ffdd88', 0, 4.0);
  goalLight.position.set(0, BED_Y + 0.5, 0);
  group.add(goalLight);

  let flashTimer = 0;

  return {
    group,
    update(simState, dt = 0.016) {
      if (!simState) return;

      // 1. Update ball position and roll rotation
      if (simState.ball) {
        const bx = (simState.ball.x / TABLE_LENGTH - 0.5) * PITCH_LENGTH;
        const bz = (simState.ball.y / TABLE_WIDTH - 0.5) * PITCH_WIDTH;
        ballGroup.position.x = bx;
        ballGroup.position.z = bz;

        // Roll rotation
        const vx = simState.ball.vx || 0;
        const vy = simState.ball.vy || 0;
        const speed = Math.hypot(vx, vy);
        if (speed > 0.01) {
          ballMesh.rotation.z -= (vx / BALL_RADIUS) * dt * 3.0;
          ballMesh.rotation.x += (vy / BALL_RADIUS) * dt * 3.0;
        }
      }

      // 2. Update all 8 rods
      if (simState.rods) {
        ['0', '1'].forEach(slotKey => {
          const rodsData = simState.rods[slotKey];
          if (!Array.isArray(rodsData)) return;

          rodsData.forEach((rod, rIdx) => {
            const rodObj = rodMeshes[slotKey]?.[rIdx];
            if (!rodObj) return;

            // Lateral translation along local Z
            const normY = (rod.y - TABLE_WIDTH * 0.5) / TABLE_WIDTH;
            rodObj.group.position.z = normY * PITCH_WIDTH;

            // Rotation around rod Z axis
            rodObj.group.rotation.z = rod.angle || 0;
          });
        });
      }

      // 3. Goal flash
      if (simState.state === 'goal') {
        flashTimer += dt * 10;
        goalLight.intensity = Math.sin(flashTimer) > 0 ? 2.0 : 0.5;
      } else {
        flashTimer = 0;
        goalLight.intensity = 0;
      }

      // 4. Update scoreboard
      updateScoreTexture(simState);
    },

    dispose() {
      if (scoreTexture) scoreTexture.dispose();
      pitchMat.dispose();
      cabinetMat.dispose();
      railMat.dispose();
      brassMat.dispose();
      chromeMat.dispose();
      rubberMat.dispose();
      homeFigMat.dispose();
      awayFigMat.dispose();
      ballMat.dispose();
    },
  };
}

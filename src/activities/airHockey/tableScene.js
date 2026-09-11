/**
 * 3D Table Scene for Air Hockey in Afterlight (Phase 4, Task 6.2).
 *
 * Implements:
 * - 2.2m x 1.2m table model with glossy perforated laminate bed, red markings, and aluminum rails
 * - End rail goal mouths (30cm wide) with recessed goal pockets
 * - Suspended overhead bridge with dynamic digital LED scoreboard texture (score, series, status)
 * - 3D mallets (red for slot 0, blue for slot 1) with felt bases and ergonomic handles
 * - High-contrast fluorescent puck with contact shadow disk
 * - Celebratory goal flash lighting and animations
 */

import * as THREE from 'three';
import {
  AIR_HOCKEY_BED_FINISH,
  AIR_HOCKEY_SURFACE_PALETTE,
} from './surfacePalette.js';

export function createAirHockeyTableScene({
  position = [5.8, 0, 7.0],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1] || 0, position[2]);
  group.rotation.y = rotationY;

  // Materials
  const bedMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: AIR_HOCKEY_BED_FINISH.roughness,
    metalness: AIR_HOCKEY_BED_FINISH.metalness,
  });

  const railMat = new THREE.MeshStandardMaterial({
    color: '#8c9ba5',
    roughness: 0.25,
    metalness: 0.85,
  });

  const apronMat = new THREE.MeshStandardMaterial({
    color: '#1a222d',
    roughness: 0.6,
    metalness: 0.2,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: '#c8a860',
    roughness: 0.35,
    metalness: 0.8,
  });

  const redStrikerMat = new THREE.MeshStandardMaterial({
    color: '#d32f2f',
    roughness: 0.25,
    metalness: 0.15,
  });

  const blueStrikerMat = new THREE.MeshStandardMaterial({
    color: '#1976d2',
    roughness: 0.25,
    metalness: 0.15,
  });

  const gripMat = new THREE.MeshStandardMaterial({
    color: '#f5f5f5',
    roughness: 0.4,
    metalness: 0.1,
  });

  const puckMat = new THREE.MeshStandardMaterial({
    color: '#ccff00',
    emissive: '#445500',
    emissiveIntensity: 0.3,
    roughness: 0.2,
    metalness: 0.1,
  });

  const goalGlowMat = new THREE.MeshStandardMaterial({
    color: '#ffdd00',
    emissive: '#ffaa00',
    emissiveIntensity: 0.0,
    roughness: 0.3,
  });

  // 1. Table Apron & Cabinet (Outer body)
  // Bed is 2.0m x 1.0m at y = 0.80. Apron extends to 2.16m x 1.16m.
  const bedHeight = 0.80;
  const apronBox = new THREE.Mesh(
    new THREE.BoxGeometry(2.18, 0.22, 1.18),
    apronMat
  );
  apronBox.position.set(0, bedHeight - 0.11, 0);
  apronBox.castShadow = true;
  apronBox.receiveShadow = true;
  group.add(apronBox);

  // Brass trim band around apron
  const trimBox = new THREE.Mesh(
    new THREE.BoxGeometry(2.20, 0.03, 1.20),
    brassMat
  );
  trimBox.position.set(0, bedHeight - 0.04, 0);
  group.add(trimBox);

  // 2. Table Legs (4 pedestal posts with brass feet)
  const legPositions = [
    [-0.92, -0.46],
    [0.92, -0.46],
    [-0.92, 0.46],
    [0.92, 0.46],
  ];

  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, bedHeight - 0.22, 12),
      apronMat
    );
    leg.position.set(lx, (bedHeight - 0.22) / 2, lz);
    leg.castShadow = true;
    group.add(leg);

    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12),
      brassMat
    );
    foot.position.set(lx, 0.02, lz);
    group.add(foot);
  }

  // 3. Playing Bed Surface (2.0m x 1.0m)
  // Generate procedural canvas texture for court markings
  const bedTex = createBedTexture();
  bedMat.map = bedTex;
  bedMat.needsUpdate = true;

  const bedMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.0),
    bedMat
  );
  bedMesh.rotation.x = -Math.PI / 2;
  bedMesh.position.set(0, bedHeight + 0.001, 0);
  bedMesh.receiveShadow = true;
  group.add(bedMesh);

  // 4. Aluminum Rails
  // Top rail: along Z = -0.525, spanning X = -1.04 to +1.04
  const topRail = new THREE.Mesh(
    new THREE.BoxGeometry(2.08, 0.06, 0.05),
    railMat
  );
  topRail.position.set(0, bedHeight + 0.03, -0.525);
  topRail.castShadow = true;
  group.add(topRail);

  // Bottom rail: along Z = +0.525
  const bottomRail = new THREE.Mesh(
    new THREE.BoxGeometry(2.08, 0.06, 0.05),
    railMat
  );
  bottomRail.position.set(0, bedHeight + 0.03, 0.525);
  bottomRail.castShadow = true;
  group.add(bottomRail);

  // End rails (with 30cm goal mouth openings in the center, Z in [-0.15, +0.15])
  // Left End (Slot 0 goal at X = -1.0):
  // Top-left corner rail (Z = -0.325, length 0.35)
  const leftCornerTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.35),
    railMat
  );
  leftCornerTop.position.set(-1.025, bedHeight + 0.03, -0.325);
  group.add(leftCornerTop);

  // Bottom-left corner rail (Z = +0.325, length 0.35)
  const leftCornerBottom = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.35),
    railMat
  );
  leftCornerBottom.position.set(-1.025, bedHeight + 0.03, 0.325);
  group.add(leftCornerBottom);

  // Right End (Slot 1 goal at X = +1.0):
  // Top-right corner rail
  const rightCornerTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.35),
    railMat
  );
  rightCornerTop.position.set(1.025, bedHeight + 0.03, -0.325);
  group.add(rightCornerTop);

  // Bottom-right corner rail
  const rightCornerBottom = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.06, 0.35),
    railMat
  );
  rightCornerBottom.position.set(1.025, bedHeight + 0.03, 0.325);
  group.add(rightCornerBottom);

  // Goal Pockets (Recessed dark slots behind the goal mouths)
  const leftGoalPocket = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.04, 0.32),
    new THREE.MeshBasicMaterial({ color: '#090d12' })
  );
  leftGoalPocket.position.set(-1.07, bedHeight - 0.01, 0);
  group.add(leftGoalPocket);

  const rightGoalPocket = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.04, 0.32),
    new THREE.MeshBasicMaterial({ color: '#090d12' })
  );
  rightGoalPocket.position.set(1.07, bedHeight - 0.01, 0);
  group.add(rightGoalPocket);

  // Goal indicator glow strips
  const leftGoalGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, 0.30),
    goalGlowMat
  );
  leftGoalGlow.position.set(-1.015, bedHeight + 0.01, 0);
  group.add(leftGoalGlow);

  const rightGoalGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, 0.30),
    goalGlowMat
  );
  rightGoalGlow.position.set(1.015, bedHeight + 0.01, 0);
  group.add(rightGoalGlow);

  // 5. Overhead Bridge with Digital Scoreboard
  // Tubular arches rising from sides at x = 0
  const archRadius = 0.62;
  const archTube = 0.02;
  const arch1 = new THREE.Mesh(
    new THREE.CylinderGeometry(archTube, archTube, 0.85, 8),
    brassMat
  );
  arch1.position.set(0, bedHeight + 0.425, -0.52);
  group.add(arch1);

  const arch2 = new THREE.Mesh(
    new THREE.CylinderGeometry(archTube, archTube, 0.85, 8),
    brassMat
  );
  arch2.position.set(0, bedHeight + 0.425, 0.52);
  group.add(arch2);

  const topCrossBar = new THREE.Mesh(
    new THREE.CylinderGeometry(archTube, archTube, 1.06, 8),
    brassMat
  );
  topCrossBar.rotation.x = Math.PI / 2;
  topCrossBar.position.set(0, bedHeight + 0.85, 0);
  group.add(topCrossBar);

  // Scoreboard housing
  const boardHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.16, 0.48),
    apronMat
  );
  boardHousing.position.set(0, bedHeight + 0.72, 0);
  group.add(boardHousing);

  // Scoreboard digital display textures (front and back facing)
  const { texture: scoreTex, update: updateScoreTex } = createScoreboardTexture();

  const boardScreenMat = new THREE.MeshBasicMaterial({
    map: scoreTex,
  });

  const boardScreenFront = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.14),
    boardScreenMat
  );
  boardScreenFront.rotation.y = Math.PI / 2;
  boardScreenFront.position.set(-0.191, bedHeight + 0.72, 0);
  group.add(boardScreenFront);

  const boardScreenBack = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.14),
    boardScreenMat
  );
  boardScreenBack.rotation.y = -Math.PI / 2;
  boardScreenBack.position.set(0.191, bedHeight + 0.72, 0);
  group.add(boardScreenBack);

  // 6. Mallets (Strikers)
  // Radius in sim = 7.0 -> 0.07m
  function createMalletMesh(strikerMaterial) {
    const mGroup = new THREE.Group();

    // Bottom felt base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.016, 24),
      strikerMaterial
    );
    base.position.y = 0.008;
    base.castShadow = true;
    mGroup.add(base);

    // Tapered neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.065, 0.024, 20),
      strikerMaterial
    );
    neck.position.y = 0.028;
    mGroup.add(neck);

    // Grip handle dome
    const grip = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 16, 12),
      gripMat
    );
    grip.position.y = 0.046;
    grip.scale.set(1, 0.8, 1);
    mGroup.add(grip);

    return mGroup;
  }

  const mallet0 = createMalletMesh(redStrikerMat);
  mallet0.position.set(-0.7, bedHeight + 0.001, 0);
  group.add(mallet0);

  const mallet1 = createMalletMesh(blueStrikerMat);
  mallet1.position.set(0.7, bedHeight + 0.001, 0);
  group.add(mallet1);

  // 7. Puck
  // Radius in sim = 4.0 -> 0.04m
  const puckGroup = new THREE.Group();
  const puckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.014, 24),
    puckMat
  );
  puckMesh.position.y = 0.007;
  puckMesh.castShadow = true;
  puckGroup.add(puckMesh);

  // Soft contact shadow directly beneath puck
  let shadowTex = null;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(32, 32, 8, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
    shadowTex = new THREE.CanvasTexture(shadowCanvas);
  } else {
    shadowTex = new THREE.Texture();
  }

  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.09),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.001;
  puckGroup.add(shadowMesh);

  puckGroup.position.set(0, bedHeight, 0);
  group.add(puckGroup);

  // Goal flash animation tracking
  let goalFlashTime = 0;
  let goalFlashSlot = null;

  return {
    group,
    bedHeight,
    bedSurface: { mesh: bedMesh, material: bedMat },

    /**
     * Converts 2D simulation coordinates (X in [0, 200], Y in [0, 100])
     * to table-local 3D coordinates (X in [-1.0, 1.0], Z in [-0.5, 0.5]).
     */
    simToLocal(simX, simY) {
      return {
        x: (simX - 100.0) / 100.0,
        z: (simY - 50.0) / 100.0,
      };
    },

    /**
     * Converts table-local 3D coordinates to 2D simulation coordinates.
     */
    localToSim(lx, lz) {
      return {
        x: lx * 100.0 + 100.0,
        y: lz * 100.0 + 50.0,
      };
    },

    /**
     * Updates mallet positions from simulation state.
     */
    updateMallets(simState, lerp = 1.0) {
      if (!simState?.mallets) return;

      const m0 = simState.mallets['0'];
      if (m0) {
        const target0 = this.simToLocal(m0.x, m0.y);
        mallet0.position.x += (target0.x - mallet0.position.x) * lerp;
        mallet0.position.z += (target0.z - mallet0.position.z) * lerp;
      }

      const m1 = simState.mallets['1'];
      if (m1) {
        const target1 = this.simToLocal(m1.x, m1.y);
        mallet1.position.x += (target1.x - mallet1.position.x) * lerp;
        mallet1.position.z += (target1.z - mallet1.position.z) * lerp;
      }
    },

    /**
     * Updates puck position from simulation state.
     */
    updatePuck(simState, lerp = 1.0) {
      if (!simState?.puck) return;

      const p = simState.puck;
      const target = this.simToLocal(p.x, p.y);

      puckGroup.position.x += (target.x - puckGroup.position.x) * lerp;
      puckGroup.position.z += (target.z - puckGroup.position.z) * lerp;
    },

    /**
     * Updates digital scoreboard texture.
     */
    updateScoreboard(simState) {
      updateScoreTex(simState);
    },

    /**
     * Triggers a goal flash celebration.
     */
    flashGoal(scorerSlot) {
      goalFlashTime = 1.0;
      goalFlashSlot = scorerSlot;
    },

    /**
     * Animation step for lights and effects.
     */
    update(dt) {
      if (goalFlashTime > 0) {
        goalFlashTime = Math.max(0, goalFlashTime - dt * 2.0);
        const intensity = Math.sin(goalFlashTime * Math.PI) * 2.5;
        if (goalFlashSlot === 0) {
          rightGoalGlow.material.emissiveIntensity = intensity;
        } else {
          leftGoalGlow.material.emissiveIntensity = intensity;
        }
      } else {
        leftGoalGlow.material.emissiveIntensity = 0.0;
        rightGoalGlow.material.emissiveIntensity = 0.0;
      }
    },

    destroy() {
      if (group.parent) group.parent.remove(group);
      bedTex.dispose();
      scoreTex.dispose();
      shadowTex.dispose();
    },
  };
}

/**
 * Creates the court lines and markings canvas texture for the Air Hockey bed.
 */
function createBedTexture() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Background laminate
  ctx.fillStyle = AIR_HOCKEY_SURFACE_PALETTE.bed;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle perforated air holes grid
  ctx.fillStyle = AIR_HOCKEY_SURFACE_PALETTE.dots;
  for (let x = 16; x < 1024; x += 24) {
    for (let y = 16; y < 512; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Red court markings
  ctx.strokeStyle = AIR_HOCKEY_SURFACE_PALETTE.red;
  ctx.lineWidth = 6;

  // Center division line
  ctx.beginPath();
  ctx.moveTo(512, 0);
  ctx.lineTo(512, 512);
  ctx.stroke();

  // Center faceoff circle
  ctx.beginPath();
  ctx.arc(512, 256, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = AIR_HOCKEY_SURFACE_PALETTE.red;
  ctx.beginPath();
  ctx.arc(512, 256, 8, 0, Math.PI * 2);
  ctx.fill();

  // Goal creases (semi-circles at each end)
  // Left goal crease (X = 0)
  ctx.beginPath();
  ctx.arc(0, 256, 150, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Right goal crease (X = 1024)
  ctx.beginPath();
  ctx.arc(1024, 256, 150, Math.PI / 2, -Math.PI / 2);
  ctx.stroke();

  // Cyan defensive boundary lines
  ctx.strokeStyle = AIR_HOCKEY_SURFACE_PALETTE.cyan;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(768, 0);
  ctx.lineTo(768, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/**
 * Creates dynamic scoreboard LED display texture.
 */
function createScoreboardTexture() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return {
      texture: new THREE.Texture(),
      update: () => {},
    };
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');

  function render(simState = {}) {
    // Dark LED matrix background
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, 512, 200);

    // Subtle grid overlay
    ctx.fillStyle = '#111822';
    for (let y = 0; y < 200; y += 4) {
      ctx.fillRect(0, y, 512, 1);
    }

    const s0 = simState.score?.['0'] ?? 0;
    const s1 = simState.score?.['1'] ?? 0;
    const series0 = simState.seriesScore?.['0'] ?? 0;
    const series1 = simState.seriesScore?.['1'] ?? 0;
    const seriesLen = simState.seriesLength || 1;
    const gameState = simState.state || 'serving';

    // Player 0 (Red) Score
    ctx.fillStyle = '#ff3344';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(s0), 120, 100);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#ff8899';
    ctx.fillText(`P1 (${series0})`, 120, 155);

    // Divider
    ctx.fillStyle = '#3a4a5e';
    ctx.font = 'bold 48px monospace';
    ctx.fillText(':', 256, 95);

    // Player 1 (Blue) Score
    ctx.fillStyle = '#3399ff';
    ctx.font = 'bold 72px monospace';
    ctx.fillText(String(s1), 392, 100);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#88ccee';
    ctx.fillText(`P2 (${series1})`, 392, 155);

    // Header: Series format
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#f0c040';
    const seriesLabel = seriesLen === 1 ? 'SINGLE GAME' : `BEST OF ${seriesLen}`;
    ctx.fillText(seriesLabel, 256, 32);

    // Footer: Match status
    ctx.font = '14px monospace';
    if (gameState === 'goal') {
      ctx.fillStyle = '#ffea00';
      ctx.fillText('GOAL!', 256, 175);
    } else if (gameState === 'ended') {
      ctx.fillStyle = '#00e676';
      ctx.fillText('SERIES COMPLETE', 256, 175);
    } else if (gameState === 'game_break') {
      ctx.fillStyle = '#ff9100';
      ctx.fillText('GAME BREAK', 256, 175);
    } else {
      ctx.fillStyle = '#7a8c9e';
      ctx.fillText(`FIRST TO 7`, 256, 175);
    }
  }

  render();
  const texture = new THREE.CanvasTexture(canvas);

  return {
    texture,
    update: (simState) => {
      render(simState);
      texture.needsUpdate = true;
    },
  };
}

/**
 * Rain Court English draughts table (Task 8.3).
 *
 * A low wet-wood table at `court-checkers` [6.4, 0, 5.5] with a dark-square
 * board, cream/charcoal men, and a turn lamp. Pieces follow server state.
 */

import * as THREE from 'three';

const DARK_SQ = '#3a4038';
const LIGHT_SQ = '#c9c2a8';
const BLACK_MAN = '#2c241c';
const WHITE_MAN = '#d8c4a0';
const KING_RING = '#c8a860';

function squareToLocal(square, boardSize) {
  const file = 'abcdefgh'.indexOf(square[0]);
  const rank = Number(square[1]);
  const cell = boardSize / 8;
  const origin = -boardSize / 2 + cell / 2;
  return {
    x: origin + file * cell,
    z: origin + (8 - rank) * cell,
  };
}

export function createCheckersTableScene({
  position = [6.4, 0, 5.5],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'court-checkers-table';
  group.position.set(position[0], position[1] || 0, position[2]);
  group.rotation.y = rotationY;

  const geos = [];
  const mats = [];
  const regGeo = (g) => {
    geos.push(g);
    return g;
  };
  const regMat = (m) => {
    mats.push(m);
    return m;
  };

  const apronMat = regMat(new THREE.MeshStandardMaterial({
    color: '#4a3b2c',
    roughness: 0.72,
    metalness: 0.08,
  }));
  const topMat = regMat(new THREE.MeshStandardMaterial({
    color: '#5c4632',
    roughness: 0.55,
    metalness: 0.12,
  }));
  const brassMat = regMat(new THREE.MeshStandardMaterial({
    color: KING_RING,
    roughness: 0.35,
    metalness: 0.72,
  }));

  const apron = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.18, 0.08, 1.18)), apronMat);
  apron.position.set(0, 0.72, 0);
  group.add(apron);

  const top = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.02, 0.04, 1.02)), topMat);
  top.position.set(0, 0.78, 0);
  group.add(top);

  for (const [dx, dz] of [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]]) {
    const leg = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.08, 0.72, 0.08)), apronMat);
    leg.position.set(dx, 0.36, dz);
    group.add(leg);
  }

  const boardSize = 0.8;
  const cell = boardSize / 8;
  const cellGeo = regGeo(new THREE.BoxGeometry(cell * 0.98, 0.012, cell * 0.98));
  const darkMat = regMat(new THREE.MeshStandardMaterial({ color: DARK_SQ, roughness: 0.62 }));
  const lightMat = regMat(new THREE.MeshStandardMaterial({ color: LIGHT_SQ, roughness: 0.5 }));
  const pickables = [];
  const highlightMats = new Map();

  const boardRoot = new THREE.Group();
  boardRoot.position.set(0, 0.805, 0);
  group.add(boardRoot);

  for (let rank = 1; rank <= 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const sq = `${'abcdefgh'[file]}${rank}`;
      const dark = ((file + rank) & 1) === 1;
      const mesh = new THREE.Mesh(cellGeo, dark ? darkMat : lightMat);
      const local = squareToLocal(sq, boardSize);
      mesh.position.set(local.x, 0, local.z);
      mesh.userData.square = sq;
      mesh.userData.dark = dark;
      boardRoot.add(mesh);
      if (dark) pickables.push(mesh);
    }
  }

  const blackMat = regMat(new THREE.MeshStandardMaterial({ color: BLACK_MAN, roughness: 0.45, metalness: 0.15 }));
  const whiteMat = regMat(new THREE.MeshStandardMaterial({ color: WHITE_MAN, roughness: 0.4, metalness: 0.08 }));
  const kingMat = regMat(new THREE.MeshStandardMaterial({
    color: KING_RING,
    roughness: 0.3,
    metalness: 0.75,
    emissive: '#6a5018',
    emissiveIntensity: 0.15,
  }));
  const manGeo = regGeo(new THREE.CylinderGeometry(0.038, 0.04, 0.03, 16));
  const kingGeo = regGeo(new THREE.TorusGeometry(0.026, 0.006, 8, 16));

  const pool = { 0: [], 1: [] };
  for (const slot of [0, 1]) {
    for (let i = 0; i < 12; i += 1) {
      const man = new THREE.Mesh(manGeo, slot === 0 ? blackMat : whiteMat);
      const crown = new THREE.Mesh(kingGeo, kingMat);
      crown.rotation.x = Math.PI / 2;
      crown.position.y = 0.02;
      crown.visible = false;
      man.add(crown);
      man.visible = false;
      man.userData.crown = crown;
      boardRoot.add(man);
      pool[slot].push(man);
    }
  }

  const lamp = new THREE.Mesh(
    regGeo(new THREE.CylinderGeometry(0.03, 0.04, 0.08, 10)),
    regMat(new THREE.MeshStandardMaterial({
      color: '#e8c76a',
      emissive: '#c9a227',
      emissiveIntensity: 0.55,
    })),
  );
  lamp.position.set(0, 0.92, 0.58);
  group.add(lamp);

  const plaque = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.42, 0.03, 0.06)), brassMat);
  plaque.position.set(0, 0.74, 0.58);
  group.add(plaque);

  const selectedMat = regMat(new THREE.MeshStandardMaterial({
    color: '#e8c76a',
    emissive: '#c9a227',
    emissiveIntensity: 0.45,
    roughness: 0.4,
  }));
  const legalMat = regMat(new THREE.MeshStandardMaterial({
    color: '#7a9a6a',
    emissive: '#3d5a32',
    emissiveIntensity: 0.35,
    roughness: 0.5,
  }));
  const lastMat = regMat(new THREE.MeshStandardMaterial({
    color: '#8a6a3a',
    emissive: '#5a4018',
    emissiveIntensity: 0.2,
    roughness: 0.5,
  }));

  let highlights = { selected: null, legal: [], lastMove: null };

  function squareMesh(square) {
    return pickables.find((mesh) => mesh.userData.square === square) || null;
  }

  function resetHighlights() {
    for (const [mesh, mat] of highlightMats) {
      mesh.material = mat;
    }
    highlightMats.clear();
  }

  function tint(square, material) {
    const mesh = squareMesh(square);
    if (!mesh) return;
    if (!highlightMats.has(mesh)) highlightMats.set(mesh, mesh.material);
    mesh.material = material;
  }

  return {
    group,
    pickables,

    pickSquare(raycaster) {
      if (!raycaster) return null;
      const hits = raycaster.intersectObjects(pickables, false);
      return hits[0]?.object?.userData?.square || null;
    },

    setHighlights(next = {}) {
      highlights = {
        selected: next.selected || null,
        legal: Array.isArray(next.legal) ? next.legal : [],
        lastMove: next.lastMove || null,
      };
    },

    updateVisuals(simState, time = 0) {
      resetHighlights();
      for (const slot of [0, 1]) {
        for (const man of pool[slot]) {
          man.visible = false;
          man.userData.crown.visible = false;
        }
      }

      const board = simState?.board || {};
      const used = { 0: 0, 1: 0 };
      for (const [square, raw] of Object.entries(board)) {
        const slot = Number(raw?.slot);
        if (slot !== 0 && slot !== 1) continue;
        const man = pool[slot][used[slot]];
        if (!man) continue;
        used[slot] += 1;
        const local = squareToLocal(square, boardSize);
        man.position.set(local.x, 0.022, local.z);
        man.visible = true;
        man.userData.crown.visible = Boolean(raw.king);
      }

      const last = highlights.lastMove || simState?.lastMove;
      if (last?.from) tint(last.from, lastMat);
      if (last?.to) tint(last.to, lastMat);
      for (const sq of highlights.legal) tint(sq, legalMat);
      if (highlights.selected) tint(highlights.selected, selectedMat);

      const playing = simState?.status !== 'complete';
      const pulse = playing ? 0.45 + Math.sin((time || 0) * 3) * 0.2 : 0.12;
      lamp.material.emissiveIntensity = pulse;
      lamp.position.x = Number(simState?.turn) === 0 ? -0.42 : 0.42;
    },

    dispose() {
      if (group.parent && typeof group.parent.remove === 'function') {
        group.parent.remove(group);
      }
      for (const geo of geos) geo.dispose();
      for (const mat of mats) mat.dispose();
    },
  };
}

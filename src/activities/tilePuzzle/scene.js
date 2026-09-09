/**
 * Paper Catacombs shared manuscript-tile table (Task 8.4).
 *
 * A low stone reading table with a 4×4 recessed well. Numbered cream tiles
 * interpolate to their authoritative cells so every visitor sees the same
 * arrangement and solved glow.
 */

import * as THREE from 'three';
import {
  TILE_GRID,
  TILE_CELL_COUNT,
  EMPTY_TILE,
  TILE_SOLVED_BOARD,
  TILE_INITIAL_BOARD,
} from '../../../shared/tilePuzzleModel.js';

const TILE_PITCH = 0.22;
const TABLE_Y = 0.78;
const TILE_COLORS = [
  '#c4b49a',
  '#e4d4b4',
  '#d7c4a0',
  '#eadcc0',
  '#cbb892',
  '#e8d6ae',
  '#d2c09a',
  '#f0e2c4',
  '#c6b48e',
  '#decca8',
  '#e6d8b6',
  '#d8c6a2',
  '#f2e6cc',
  '#c9b796',
  '#e2d0aa',
];

function cellLocal(index) {
  const row = Math.floor(index / TILE_GRID);
  const col = index % TILE_GRID;
  const origin = -((TILE_GRID - 1) * TILE_PITCH) / 2;
  return {
    x: origin + col * TILE_PITCH,
    z: origin + row * TILE_PITCH,
  };
}

function makeGlyphTexture(n) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = TILE_COLORS[(n - 1) % TILE_COLORS.length];
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(70, 48, 28, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 58, 58);
  ctx.fillStyle = '#4a3420';
  ctx.font = 'bold 30px "DM Sans", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createTilePuzzleScene({
  position = [5.2, 0, 1.0],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'tile-puzzle-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const ownedGeometries = [];
  const ownedMaterials = [];
  const ownedTextures = [];
  const tileMeshes = new Map();
  const wellMeshes = [];

  const regGeo = (g) => { ownedGeometries.push(g); return g; };
  const regMat = (m) => { ownedMaterials.push(m); return m; };
  const regTex = (t) => { if (t) ownedTextures.push(t); return t; };

  const table = new THREE.Group();
  table.name = 'manuscript-table';

  const topGeo = regGeo(new THREE.BoxGeometry(1.28, 0.08, 1.28));
  const topMat = regMat(new THREE.MeshStandardMaterial({
    color: '#3a3330',
    roughness: 0.82,
    metalness: 0.12,
  }));
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, TABLE_Y, 0);
  table.add(top);

  const apronGeo = regGeo(new THREE.BoxGeometry(1.32, 0.06, 1.32));
  const copper = regMat(new THREE.MeshStandardMaterial({
    color: '#8a5a3a',
    roughness: 0.45,
    metalness: 0.7,
  }));
  const apron = new THREE.Mesh(apronGeo, copper);
  apron.position.set(0, TABLE_Y - 0.06, 0);
  table.add(apron);

  const legGeo = regGeo(new THREE.BoxGeometry(0.08, TABLE_Y - 0.02, 0.08));
  const legMat = regMat(new THREE.MeshStandardMaterial({ color: '#2a2624', roughness: 0.7, metalness: 0.2 }));
  for (const [lx, lz] of [[-0.54, -0.54], [0.54, -0.54], [-0.54, 0.54], [0.54, 0.54]]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, (TABLE_Y - 0.02) / 2, lz);
    table.add(leg);
  }

  const lampGeo = regGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 8));
  const lampMat = regMat(new THREE.MeshStandardMaterial({
    color: '#edb66c',
    emissive: '#edb66c',
    emissiveIntensity: 0.55,
    roughness: 0.4,
  }));
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.set(0.52, TABLE_Y + 0.14, -0.52);
  table.add(lamp);

  const wellGeo = regGeo(new THREE.BoxGeometry(TILE_PITCH * 0.92, 0.02, TILE_PITCH * 0.92));
  const wellMat = regMat(new THREE.MeshStandardMaterial({
    color: '#1c1816',
    roughness: 0.9,
    metalness: 0.05,
  }));
  for (let i = 0; i < TILE_CELL_COUNT; i += 1) {
    const well = new THREE.Mesh(wellGeo, wellMat);
    const loc = cellLocal(i);
    well.position.set(loc.x, TABLE_Y + 0.045, loc.z);
    table.add(well);
    wellMeshes.push(well);
  }

  const tileGeo = regGeo(new THREE.BoxGeometry(TILE_PITCH * 0.86, 0.04, TILE_PITCH * 0.86));
  for (let n = 1; n < TILE_CELL_COUNT; n += 1) {
    const tex = regTex(makeGlyphTexture(n));
    const mat = regMat(new THREE.MeshStandardMaterial({
      color: tex ? '#ffffff' : TILE_COLORS[(n - 1) % TILE_COLORS.length],
      map: tex,
      roughness: 0.72,
      metalness: 0.08,
      emissive: '#000000',
      emissiveIntensity: 0,
    }));
    const mesh = new THREE.Mesh(tileGeo, mat);
    mesh.userData.tileId = n;
    tileMeshes.set(n, mesh);
    table.add(mesh);
  }

  group.add(table);

  function placeTiles(board, instant) {
    const cells = Array.isArray(board) && board.length === TILE_CELL_COUNT
      ? board
      : TILE_INITIAL_BOARD;

    for (let i = 0; i < TILE_CELL_COUNT; i += 1) {
      const id = cells[i];
      if (id === EMPTY_TILE) continue;
      const mesh = tileMeshes.get(id);
      if (!mesh) continue;
      const loc = cellLocal(i);
      const targetY = TABLE_Y + 0.072;
      if (instant) {
        mesh.position.set(loc.x, targetY, loc.z);
      } else {
        mesh.position.x += (loc.x - mesh.position.x) * 0.22;
        mesh.position.z += (loc.z - mesh.position.z) * 0.22;
        mesh.position.y += (targetY - mesh.position.y) * 0.22;
      }
      const home = TILE_SOLVED_BOARD[i] === id;
      mesh.material.emissive.set(home ? '#edb66c' : '#000000');
      mesh.material.emissiveIntensity = home ? 0.22 : 0;
    }
  }

  placeTiles(TILE_INITIAL_BOARD, true);

  function updateVisuals(simState, time = 0) {
    placeTiles(simState?.board, false);
    if (simState?.solved) {
      const pulse = 0.35 + Math.sin(time * 4) * 0.2;
      lamp.material.emissiveIntensity = 0.7 + pulse;
      for (const mesh of tileMeshes.values()) {
        mesh.material.emissiveIntensity = pulse;
      }
    } else {
      lamp.material.emissiveIntensity = 0.55;
    }
  }

  function tileIdAt(index, board) {
    const cells = board || TILE_INITIAL_BOARD;
    return cells[index];
  }

  function dispose() {
    for (const g of ownedGeometries) g.dispose();
    for (const m of ownedMaterials) m.dispose();
    for (const t of ownedTextures) t.dispose();
    ownedGeometries.length = 0;
    ownedMaterials.length = 0;
    ownedTextures.length = 0;
    if (group.parent) group.parent.remove(group);
  }

  return {
    group,
    tileMeshes,
    updateVisuals,
    cellLocal,
    tileIdAt,
    dispose,
    pickables: [...tileMeshes.values()],
  };
}

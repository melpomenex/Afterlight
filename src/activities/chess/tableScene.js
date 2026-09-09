/**
 * Shared 3D chess table for Rain Court and Paper Catacombs.
 * Stone apron, checkered board, and stylized industrial pieces.
 * Spectators and players see the same authoritative board.
 */

import * as THREE from 'three';
import { algebraicToIndex, fileOf, rankOf } from '../../../shared/chessModel.js';

const SQUARE = 0.075;
const BOARD = SQUARE * 8;
const HALF = BOARD / 2;
const BED_Y = 0.72;

const LIGHT_SQ = '#c9b896';
const DARK_SQ = '#5c4a38';
const WHITE_PIECE = '#e8dcc4';
const BLACK_PIECE = '#2a3238';

function squareLocal(file, rank) {
  return {
    x: (file - 3.5) * SQUARE,
    z: (rank - 3.5) * SQUARE,
  };
}

function worldToSquare(localX, localZ) {
  const file = Math.round(localX / SQUARE + 3.5);
  const rank = Math.round(localZ / SQUARE + 3.5);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return { file, rank };
}

function makeMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extras.roughness ?? 0.45,
    metalness: extras.metalness ?? 0.12,
    emissive: extras.emissive || '#000000',
    emissiveIntensity: extras.emissiveIntensity ?? 0,
  });
}

function pieceHeight(type) {
  switch (type) {
    case 'p':
      return 0.032;
    case 'n':
      return 0.044;
    case 'b':
      return 0.05;
    case 'r':
      return 0.042;
    case 'q':
      return 0.058;
    case 'k':
      return 0.066;
    default:
      return 0.03;
  }
}

function buildPiece(type, color) {
  const group = new THREE.Group();
  const mat = makeMat(color === 'w' ? WHITE_PIECE : BLACK_PIECE, {
    roughness: color === 'w' ? 0.4 : 0.35,
    metalness: color === 'w' ? 0.08 : 0.35,
  });
  const h = pieceHeight(type);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.01, 10), mat);
  base.position.y = 0.005;
  base.castShadow = true;
  group.add(base);

  if (type === 'p') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, h, 10), mat);
    body.position.y = 0.01 + h / 2;
    body.castShadow = true;
    group.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), mat);
    cap.position.y = 0.012 + h;
    group.add(cap);
  } else if (type === 'r') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.028, h, 0.028), mat);
    body.position.y = 0.01 + h / 2;
    body.castShadow = true;
    group.add(body);
    for (const [dx, dz] of [[-0.01, -0.01], [0.01, -0.01], [-0.01, 0.01], [0.01, 0.01]]) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.008), mat);
      merlon.position.set(dx, 0.012 + h, dz);
      group.add(merlon);
    }
  } else if (type === 'n') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.02, h, 0.03), mat);
    body.position.set(0.002, 0.01 + h / 2, 0);
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.024), mat);
    head.position.set(0.006, 0.016 + h, 0.004);
    group.add(head);
  } else if (type === 'b') {
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.016, h, 10), mat);
    body.position.y = 0.01 + h / 2;
    body.castShadow = true;
    group.add(body);
    const mitre = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), mat);
    mitre.position.y = 0.014 + h;
    group.add(mitre);
  } else if (type === 'q') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, h, 10), mat);
    body.position.y = 0.01 + h / 2;
    body.castShadow = true;
    group.add(body);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), mat);
    crown.position.y = 0.014 + h;
    group.add(crown);
  } else {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.019, h, 10), mat);
    body.position.y = 0.01 + h / 2;
    body.castShadow = true;
    group.add(body);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.02, 0.006), mat);
    crossV.position.y = 0.022 + h;
    group.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, 0.006), mat);
    crossH.position.y = 0.026 + h;
    group.add(crossH);
  }

  group.userData.type = type;
  group.userData.color = color;
  return group;
}

export function createChessTableScene({
  position = [6.4, 0, 1.2],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1] || 0, position[2]);
  group.rotation.y = rotationY;

  const apronMat = makeMat('#5a5550', { roughness: 0.62, metalness: 0.08 });
  const woodMat = makeMat('#6b4e36', { roughness: 0.5, metalness: 0.05 });
  const brassMat = makeMat('#c8a860', { roughness: 0.35, metalness: 0.75 });
  const lampMat = makeMat('#d4b06a', { emissive: '#c4893a', emissiveIntensity: 0.35, roughness: 0.4 });

  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 0.92), apronMat);
  apron.position.y = BED_Y - 0.08;
  apron.castShadow = true;
  apron.receiveShadow = true;
  group.add(apron);

  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.03, 0.94), woodMat);
  rim.position.y = BED_Y + 0.01;
  group.add(rim);

  for (const [lx, lz] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, BED_Y - 0.16, 10), apronMat);
    leg.position.set(lx, (BED_Y - 0.16) / 2, lz);
    leg.castShadow = true;
    group.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), brassMat);
    foot.position.set(lx, 0.015, lz);
    group.add(foot);
  }

  const boardGroup = new THREE.Group();
  boardGroup.position.y = BED_Y + 0.018;
  group.add(boardGroup);

  const squareMeshes = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const light = (file + rank) % 2 === 1;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(SQUARE - 0.002, 0.008, SQUARE - 0.002),
        makeMat(light ? LIGHT_SQ : DARK_SQ, { roughness: 0.55 }),
      );
      const loc = squareLocal(file, rank);
      mesh.position.set(loc.x, 0, loc.z);
      mesh.receiveShadow = true;
      mesh.userData.file = file;
      mesh.userData.rank = rank;
      boardGroup.add(mesh);
      squareMeshes.push(mesh);
    }
  }

  const pickPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD, BOARD),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  pickPlane.rotation.x = -Math.PI / 2;
  pickPlane.position.y = BED_Y + 0.024;
  pickPlane.name = 'chess-pick-plane';
  group.add(pickPlane);

  const highlightMat = makeMat('#d4b06a', { emissive: '#c4893a', emissiveIntensity: 0.55, roughness: 0.3 });
  const targetMat = makeMat('#8fb8a8', { emissive: '#3d7a68', emissiveIntensity: 0.4, roughness: 0.35 });
  const lastMat = makeMat('#b8a06a', { emissive: '#8a7030', emissiveIntensity: 0.25, roughness: 0.4 });
  const cursorMat = makeMat('#e8dcc4', { emissive: '#e8dcc4', emissiveIntensity: 0.2, roughness: 0.3 });

  const selectedMark = new THREE.Mesh(new THREE.BoxGeometry(SQUARE * 0.96, 0.004, SQUARE * 0.96), highlightMat);
  selectedMark.visible = false;
  selectedMark.position.y = BED_Y + 0.024;
  group.add(selectedMark);

  const cursorMark = new THREE.Mesh(new THREE.RingGeometry(SQUARE * 0.28, SQUARE * 0.36, 16), cursorMat);
  cursorMark.rotation.x = -Math.PI / 2;
  cursorMark.visible = false;
  cursorMark.position.y = BED_Y + 0.026;
  group.add(cursorMark);

  const lastMarks = [0, 1].map(() => {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(SQUARE * 0.96, 0.003, SQUARE * 0.96), lastMat);
    mark.visible = false;
    mark.position.y = BED_Y + 0.023;
    group.add(mark);
    return mark;
  });

  const targetMarks = [];
  for (let i = 0; i < 32; i++) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), targetMat);
    disc.rotation.x = -Math.PI / 2;
    disc.visible = false;
    disc.position.y = BED_Y + 0.026;
    group.add(disc);
    targetMarks.push(disc);
  }

  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.08, 10), lampMat);
  lamp.position.set(0.4, BED_Y + 0.06, -0.4);
  group.add(lamp);

  for (const sz of [-0.85, 0.85]) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.42, 12), woodMat);
    stool.position.set(0, 0.21, sz);
    stool.castShadow = true;
    stool.receiveShadow = true;
    group.add(stool);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12), apronMat);
    seat.position.set(0, 0.43, sz);
    seat.castShadow = true;
    group.add(seat);
  }

  const piecesGroup = new THREE.Group();
  piecesGroup.position.y = BED_Y + 0.022;
  group.add(piecesGroup);

  const pieceMeshes = new Map();
  let lastBoard = '';

  function placeMark(mesh, file, rank, visible) {
    if (!visible || file == null) {
      mesh.visible = false;
      return;
    }
    const loc = squareLocal(file, rank);
    mesh.position.x = loc.x;
    mesh.position.z = loc.z;
    mesh.visible = true;
  }

  function syncPieces(board) {
    if (!board || board === lastBoard) return;
    lastBoard = board;
    while (piecesGroup.children.length) {
      const child = piecesGroup.children[0];
      piecesGroup.remove(child);
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }
    pieceMeshes.clear();
    for (let i = 0; i < 64; i++) {
      const p = board[i];
      if (!p || p === '.') continue;
      const color = p === p.toUpperCase() ? 'w' : 'b';
      const mesh = buildPiece(p.toLowerCase(), color);
      const loc = squareLocal(fileOf(i), rankOf(i));
      mesh.position.set(loc.x, 0, loc.z);
      piecesGroup.add(mesh);
      pieceMeshes.set(i, mesh);
    }
  }

  return {
    group,
    pickPlane,
    squareSize: SQUARE,
    boardY: BED_Y,

    worldToSquare,
    squareLocal,

    syncBoard(simState) {
      const board = simState?.board;
      if (typeof board === 'string') syncPieces(board);
    },

    setSelection({ selected = null, cursor = null, targets = [], lastMove = null } = {}) {
      if (selected) {
        const i = algebraicToIndex(selected);
        placeMark(selectedMark, fileOf(i), rankOf(i), i >= 0);
      } else {
        selectedMark.visible = false;
      }

      if (cursor) {
        const i = algebraicToIndex(cursor);
        placeMark(cursorMark, fileOf(i), rankOf(i), i >= 0);
      } else {
        cursorMark.visible = false;
      }

      targetMarks.forEach((mark, idx) => {
        const sq = targets[idx];
        if (!sq) {
          mark.visible = false;
          return;
        }
        const i = algebraicToIndex(sq);
        placeMark(mark, fileOf(i), rankOf(i), i >= 0);
      });

      if (lastMove?.from && lastMove?.to) {
        const a = algebraicToIndex(lastMove.from);
        const b = algebraicToIndex(lastMove.to);
        placeMark(lastMarks[0], fileOf(a), rankOf(a), a >= 0);
        placeMark(lastMarks[1], fileOf(b), rankOf(b), b >= 0);
      } else {
        lastMarks[0].visible = false;
        lastMarks[1].visible = false;
      }
    },

    pickSquare(localX, localZ) {
      return worldToSquare(localX, localZ);
    },

    updateVisuals(simState, selection = null) {
      this.syncBoard(simState);
      if (selection) this.setSelection(selection);
    },

    dispose() {
      group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) mat.dispose?.();
        }
      });
      if (group.parent) group.parent.remove(group);
    },
  };
}

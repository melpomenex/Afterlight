/**
 * Glacial Glasshouse curling rink: ice sheet, house rings, stones, low boards.
 * Attached via the activity scene (not district obstacles) so routes stay walkable
 * and the isometric camera still sees the player.
 */

import * as THREE from 'three';
import {
  SHEET_WIDTH,
  SHEET_LENGTH,
  HACK_Z,
  HOUSE_X,
  HOUSE_Z,
  HOUSE_RADIUS,
  RING_EIGHT,
  RING_FOUR,
  BUTTON_RADIUS,
  STONE_RADIUS,
} from '../../../shared/curlingModel.js';

const TEAM_COLORS = ['#d4a04a', '#8ec6d8'];

export function createCurlingRinkScene({
  position = [0, 0, 1.5],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'curling-rink-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const ownedGeometries = [];
  const ownedMaterials = [];
  const regGeo = (g) => { ownedGeometries.push(g); return g; };
  const regMat = (m) => { ownedMaterials.push(m); return m; };

  const iceGeo = regGeo(new THREE.BoxGeometry(SHEET_WIDTH, 0.06, SHEET_LENGTH));
  const iceMat = regMat(new THREE.MeshStandardMaterial({
    color: '#9ec4d4',
    roughness: 0.12,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
  }));
  const ice = new THREE.Mesh(iceGeo, iceMat);
  ice.position.set(0, 0.09, 0);
  group.add(ice);

  const houseGroup = new THREE.Group();
  houseGroup.name = 'curling-house';
  houseGroup.position.set(HOUSE_X, 0.13, HOUSE_Z);
  houseGroup.rotation.x = -Math.PI / 2;

  const rings = [
    [HOUSE_RADIUS, '#3d6d8c'],
    [RING_EIGHT, '#e8eef2'],
    [RING_FOUR, '#b45a4a'],
    [BUTTON_RADIUS, '#edf4f8'],
  ];
  for (const [r, color] of rings) {
    const ring = new THREE.Mesh(
      regGeo(new THREE.CircleGeometry(r, 32)),
      regMat(new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.15,
        transparent: true,
        opacity: 0.85,
      })),
    );
    houseGroup.add(ring);
  }
  group.add(houseGroup);

  const hogGeo = regGeo(new THREE.BoxGeometry(SHEET_WIDTH - 0.1, 0.01, 0.03));
  const hogMat = regMat(new THREE.MeshStandardMaterial({ color: '#c9b889', roughness: 0.5 }));
  const hog = new THREE.Mesh(hogGeo, hogMat);
  hog.position.set(0, 0.13, 0);
  group.add(hog);

  const boardGeo = regGeo(new THREE.BoxGeometry(0.08, 0.14, SHEET_LENGTH));
  const boardMat = regMat(new THREE.MeshStandardMaterial({ color: '#5a6b74', roughness: 0.7, metalness: 0.2 }));
  for (const x of [-SHEET_WIDTH / 2, SHEET_WIDTH / 2]) {
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(x, 0.14, 0);
    group.add(board);
  }

  const hackGeo = regGeo(new THREE.BoxGeometry(0.22, 0.08, 0.16));
  const hackMat = regMat(new THREE.MeshStandardMaterial({ color: '#3a3330', roughness: 0.8 }));
  for (const x of [-0.28, 0.28]) {
    const hack = new THREE.Mesh(hackGeo, hackMat);
    hack.position.set(x, 0.14, HACK_Z);
    group.add(hack);
  }

  const benchGeo = regGeo(new THREE.BoxGeometry(1.1, 0.28, 0.32));
  const benchMat = regMat(new THREE.MeshStandardMaterial({ color: '#6a5a48', roughness: 0.65 }));
  const leftBench = new THREE.Mesh(benchGeo, benchMat);
  leftBench.position.set(-2.55, 0.2, -3.15);
  group.add(leftBench);
  const rightBench = new THREE.Mesh(benchGeo, benchMat);
  rightBench.position.set(2.55, 0.2, -3.15);
  group.add(rightBench);

  const boardStandGeo = regGeo(new THREE.BoxGeometry(0.9, 0.55, 0.08));
  const boardStandMat = regMat(new THREE.MeshStandardMaterial({ color: '#1c262c', roughness: 0.4, metalness: 0.5 }));
  const scoreboard = new THREE.Mesh(boardStandGeo, boardStandMat);
  scoreboard.position.set(0, 0.55, HACK_Z - 0.55);
  group.add(scoreboard);

  const stoneGeo = regGeo(new THREE.CylinderGeometry(STONE_RADIUS, STONE_RADIUS * 1.05, 0.11, 16));
  const handleGeo = regGeo(new THREE.TorusGeometry(0.05, 0.012, 8, 12));
  const stones = [];
  for (let i = 0; i < 8; i += 1) {
    const team = i < 4 ? 0 : 1;
    const bodyMat = regMat(new THREE.MeshStandardMaterial({
      color: TEAM_COLORS[team],
      roughness: 0.35,
      metalness: 0.45,
    }));
    const stone = new THREE.Group();
    stone.visible = false;
    const body = new THREE.Mesh(stoneGeo, bodyMat);
    body.position.y = 0.17;
    stone.add(body);
    const handle = new THREE.Mesh(handleGeo, bodyMat);
    handle.position.y = 0.24;
    handle.rotation.x = Math.PI / 2;
    stone.add(handle);
    group.add(stone);
    stones.push(stone);
  }

  const broomSpark = new THREE.Mesh(
    regGeo(new THREE.SphereGeometry(0.08, 8, 8)),
    regMat(new THREE.MeshStandardMaterial({
      color: '#f4e4b2',
      emissive: '#f0d080',
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0,
    })),
  );
  broomSpark.position.y = 0.2;
  group.add(broomSpark);

  return {
    group,
    updateVisuals(simState, time = 0) {
      const list = simState?.stones || [];
      for (let i = 0; i < stones.length; i += 1) {
        const data = list[i];
        if (!data) {
          stones[i].visible = false;
          continue;
        }
        stones[i].visible = !data.out;
        stones[i].position.set(data.x || 0, 0, data.z || 0);
        stones[i].rotation.y = (data.omega || 0) * 0.4 + (time || 0) * (data.moving ? 2 : 0);
      }

      const live = list.find((s) => s.moving && !s.out);
      const sweeping = Object.values(simState?.sweepers || {}).some((v) => v);
      if (live && sweeping) {
        broomSpark.position.set(live.x, 0.2, live.z + 0.2);
        broomSpark.material.opacity = 0.45 + Math.sin(time * 18) * 0.2;
        broomSpark.material.emissiveIntensity = 0.8;
      } else {
        broomSpark.material.opacity = 0;
      }
    },
    dispose() {
      group.removeFromParent();
      for (const g of ownedGeometries) g.dispose();
      for (const m of ownedMaterials) m.dispose();
    },
  };
}

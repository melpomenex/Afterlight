import { isEmote, EMOTE_DURATION } from '../../shared/emotes.js';
import * as THREE from 'three';
import { generatePlayerPalette } from '../../shared/identity.js';
import { JUMP_TAKEOFF_SPEED, JUMP_GRAVITY } from '../jump.js';

// Remote hop presentation: a standardized parabola per airborne flag,
// matched to the local jump arc so every player hops the same height.
const HOP_DURATION = (2 * JUMP_TAKEOFF_SPEED) / JUMP_GRAVITY; // ≈ 0.5 s
const HOP_APEX = (JUMP_TAKEOFF_SPEED * JUMP_TAKEOFF_SPEED) / (2 * JUMP_GRAVITY);
// A stale airborne flag (dropped packets) settles instead of hovering.
const HOP_FLAG_TIMEOUT = 1.5;

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);

const matCache = new Map();
function getMat(color, roughness = 0.7, metalness = 0.15) {
  const key = `${color}_${roughness}_${metalness}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  }
  return matCache.get(key);
}

export function createNicknameSprite(nickname) {
  if (typeof document === 'undefined') {
    const sprite = new THREE.Sprite();
    sprite.position.set(0, 2.3, 0);
    return sprite;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Background rounded pill
  ctx.fillStyle = 'rgba(23, 33, 32, 0.85)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 48, 12);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#c6b47a';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Text
  ctx.fillStyle = '#e8d8b5';
  ctx.font = 'bold 24px "Space Mono", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nickname, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.2, 0.55, 1);
  sprite.position.set(0, 2.3, 0);
  return sprite;
}

export function createPlayerAvatar(playerId, nickname = 'Visitor', avatarId = null) {
  const group = new THREE.Group();
  const palette = generatePlayerPalette(playerId);

  const coatMat = getMat(palette.coat, 0.7, 0.1);
  const apronMat = getMat(palette.apron, 0.8, 0.05);
  const hatMat = getMat(palette.hat, 0.75, 0.1);
  const bootsMat = getMat(palette.boots, 0.65, 0.3);
  const leatherMat = getMat('#563a24', 0.6, 0.2);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#d8f8e3', emissive: '#acf7d5', emissiveIntensity: 2.2 });

  // 1. Torso & Coat
  const coat = new THREE.Mesh(boxGeo, coatMat);
  coat.position.set(0, 0.9, 0);
  coat.scale.set(0.64, 0.75, 0.48);
  coat.castShadow = true;
  group.add(coat);

  // 2. Apron (front)
  const apron = new THREE.Mesh(boxGeo, apronMat);
  apron.position.set(0, 0.86, 0.25);
  apron.scale.set(0.48, 0.68, 0.05);
  group.add(apron);

  // Apron straps
  for (const sx of [-0.16, 0.16]) {
    const strap = new THREE.Mesh(boxGeo, leatherMat);
    strap.position.set(sx, 1.15, 0.22);
    strap.scale.set(0.06, 0.25, 0.04);
    group.add(strap);
  }

  // 3. Satchel / pouch slung across side
  const satchel = new THREE.Mesh(boxGeo, leatherMat);
  satchel.position.set(0.34, 0.75, 0.08);
  satchel.scale.set(0.16, 0.28, 0.24);
  satchel.castShadow = true;
  group.add(satchel);

  // Satchel strap
  const strapAcross = new THREE.Mesh(boxGeo, leatherMat);
  strapAcross.position.set(0.08, 0.96, 0.15);
  strapAcross.rotation.z = -0.65;
  strapAcross.scale.set(0.68, 0.05, 0.04);
  group.add(strapAcross);

  // 4. Head (stylized robot head)
  const head = new THREE.Mesh(boxGeo, coatMat);
  head.position.set(0, 1.45, 0);
  head.scale.set(0.72, 0.46, 0.54);
  head.castShadow = true;
  group.add(head);

  // Face visor
  const visor = new THREE.Mesh(boxGeo, getMat('#1c2828', 0.5, 0.5));
  visor.position.set(0, 1.45, 0.28);
  visor.scale.set(0.58, 0.28, 0.05);
  group.add(visor);

  // Eyes
  for (const ex of [-0.17, 0.17]) {
    const eye = new THREE.Mesh(boxGeo, eyeMat);
    eye.position.set(ex, 1.46, 0.31);
    eye.scale.set(0.1, 0.08, 0.04);
    group.add(eye);
  }

  // 5. Wide-brim cap (brim + crown)
  const hatBrim = new THREE.Mesh(cylGeo, hatMat);
  hatBrim.position.set(0, 1.7, 0);
  hatBrim.scale.set(0.65, 0.06, 0.65);
  group.add(hatBrim);

  const hatCrown = new THREE.Mesh(boxGeo, hatMat);
  hatCrown.position.set(0, 1.84, 0);
  hatCrown.scale.set(0.5, 0.24, 0.44);
  group.add(hatCrown);

  // Hat band
  const hatBand = new THREE.Mesh(boxGeo, leatherMat);
  hatBand.position.set(0, 1.75, 0);
  hatBand.scale.set(0.52, 0.05, 0.46);
  group.add(hatBand);

  // 6. Arms & Hands
  const arms = [];
  for (const ax of [-0.38, 0.38]) {
    const arm = new THREE.Group();
    arm.position.set(ax, 1.2, 0);
    group.add(arm);
    arms.push(arm);
    const sleeve = new THREE.Mesh(boxGeo, coatMat);
    sleeve.position.set(0, -0.24, 0);
    sleeve.scale.set(0.14, 0.5, 0.2);
    arm.add(sleeve);

    const glove = new THREE.Mesh(boxGeo, leatherMat);
    glove.position.set(0, -0.54, 0);
    glove.scale.set(0.13, 0.16, 0.18);
    arm.add(glove);
  }

  // 7. Animated Legs & Boots
  const legs = [];
  for (const lx of [-0.18, 0.18]) {
    const leg = new THREE.Group();
    leg.position.set(lx, 0.5, 0);

    const trouser = new THREE.Mesh(boxGeo, coatMat);
    trouser.position.set(0, -0.14, 0);
    trouser.scale.set(0.18, 0.32, 0.2);
    leg.add(trouser);

    const boot = new THREE.Mesh(boxGeo, bootsMat);
    boot.position.set(0, -0.36, 0.06);
    boot.scale.set(0.2, 0.18, 0.34);
    boot.castShadow = true;
    leg.add(boot);

    group.add(leg);
    legs.push(leg);
  }

  // 8. Overhead Nickname Tag
  const nameSprite = createNicknameSprite(nickname);
  group.add(nameSprite);

  // Pose the visual rig without changing collision, facing, or the name tag.
  const rig = new THREE.Group();
  for (const child of [...group.children]) if (child !== nameSprite) rig.add(child);
  group.add(rig);

  group.userData = {
    playerId,
    nickname,
    avatarId: avatarId || null,
    legs,
    arms,
    rig,
    emote: null,
    nameSprite,
    updateNickname(newName) {
      group.remove(nameSprite);
      const newSprite = createNicknameSprite(newName);
      group.add(newSprite);
      group.userData.nameSprite = newSprite;
      group.userData.nickname = newName;
    },
    setAvatar(newAvatarId) {
      group.userData.avatarId = newAvatarId || null;
    },
  };

  return group;
}

export class RemotePlayersManager {
  constructor(scene, avatarFactory = null) {
    this.scene = scene;
    this.avatarFactory = avatarFactory;
    this.players = new Map(); // id -> { avatar, avatarId, targetX, targetZ, targetRotY, walking }
  }

  setPlayer(data) {
    if (!data || !data.id) return;
    let entry = this.players.get(data.id);
    if (!entry) {
      const avatar = this.avatarFactory
        ? this.avatarFactory(data.id, data.nickname || 'Visitor', data.avatar || null)
        : createPlayerAvatar(data.id, data.nickname || 'Visitor', data.avatar || null);
      avatar.position.set(data.x ?? 0, 0, data.z ?? 0);
      avatar.rotation.y = data.rotY ?? 0;
      this.scene.add(avatar);
      entry = {
        avatar,
        avatarId: data.avatar || null,
        targetX: data.x ?? 0,
        targetZ: data.z ?? 0,
        targetRotY: data.rotY ?? 0,
        walking: !!data.walking,
        sitting: !!data.sitting,
        airborne: !!data.airborne,
        hopT: 0,
      };
      this.players.set(data.id, entry);
    } else {
      if (data.avatar && data.avatar !== entry.avatarId) {
        entry.avatarId = data.avatar;
        entry.avatar.userData.setAvatar?.(data.avatar);
      }
      entry.targetX = data.x;
      entry.targetZ = data.z;
      entry.targetRotY = data.rotY;
      entry.walking = !!data.walking;
      entry.sitting = !!data.sitting;
      if (!!data.airborne && !entry.airborne) entry.hopT = 0; // rising edge: fresh hop
      entry.airborne = !!data.airborne;
      if (data.nickname && data.nickname !== entry.avatar.userData.nickname) {
        entry.avatar.userData.updateNickname(data.nickname);
      }
    }
  }

  removePlayer(playerId) {
    const entry = this.players.get(playerId);
    if (entry) {
      this.scene.remove(entry.avatar);
      this.players.delete(playerId);
    }
  }

  clear() {
    for (const entry of this.players.values()) {
      this.scene.remove(entry.avatar);
    }
    this.players.clear();
  }

  update(dt, time) {
    const lerpRate = Math.min(1.0, dt * 12);
    for (const entry of this.players.values()) {
      const { avatar, targetX, targetZ, targetRotY, walking, sitting, airborne } = entry;
      // Interpolate position
      avatar.position.x += (targetX - avatar.position.x) * lerpRate;
      avatar.position.z += (targetZ - avatar.position.z) * lerpRate;

      // Interpolate rotation
      let diff = targetRotY - avatar.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      avatar.rotation.y += diff * lerpRate;

      if (walking || airborne) stopEmote(avatar);
      if (airborne) entry.hopT = Math.min(entry.hopT + dt, HOP_FLAG_TIMEOUT);

      // Animate pose: seated players fold their legs and stay put; the
      // airborne flag loops a standardized hop until it clears (missing
      // flags simply never enter this branch, so old clients stay grounded).
      if (sitting) {
        avatar.position.y = 0;
        avatar.userData.legs.forEach(leg => {
          leg.rotation.x = -1.35;
        });
      } else if (airborne && entry.hopT < HOP_FLAG_TIMEOUT) {
        const u = (entry.hopT % HOP_DURATION) / HOP_DURATION;
        avatar.position.y = 4 * HOP_APEX * u * (1 - u);
        avatar.userData.legs.forEach(leg => {
          leg.rotation.x = -0.8;
        });
      } else if (walking) {
        avatar.position.y = Math.sin(time * 12) * 0.025;
        avatar.userData.legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(time * 12 + i * Math.PI) * 0.45;
        });
      } else {
        avatar.position.y = 0;
        avatar.userData.legs.forEach(leg => {
          leg.rotation.x *= 0.8;
        });
      }
      updateEmote(avatar, dt);
      avatar.userData.update?.(time, dt);
    }
  }
}

export function createKilnCompanion() {
  const g = new THREE.Group();
  const cream = getMat('#e6e0cc', 0.65, 0.2);
  const dark = getMat('#233c3e', 0.6, 0.3);
  const rust = getMat('#9c5838', 0.7, 0.2);
  const gold = getMat('#b78d50', 0.5, 0.4);
  const metal = getMat('#455759', 0.6, 0.3);
  const eye = new THREE.MeshStandardMaterial({ color: '#d8f8e3', emissive: '#acf7d5', emissiveIntensity: 2 });

  // Body
  const body = new THREE.Mesh(boxGeo, cream); body.position.set(0, 0.85, 0); body.scale.set(0.62, 0.7, 0.48); g.add(body);
  const facePlate = new THREE.Mesh(boxGeo, dark); facePlate.position.set(0, 0.92, 0.265); facePlate.scale.set(0.38, 0.35, 0.07); g.add(facePlate);
  for (let i = 0; i < 3; i++) {
    const grille = new THREE.Mesh(boxGeo, rust); grille.position.set(0, 0.8 + i * 0.095, 0.31); grille.scale.set(0.27, 0.035, 0.025); g.add(grille);
  }
  // Head
  const head = new THREE.Mesh(boxGeo, cream); head.position.set(0, 1.4, 0); head.scale.set(0.78, 0.46, 0.58); g.add(head);
  const visor = new THREE.Mesh(boxGeo, dark); visor.position.set(0, 1.4, 0.303); visor.scale.set(0.66, 0.3, 0.055); g.add(visor);
  for (const x of [-0.2, 0.2]) {
    const eyeMesh = new THREE.Mesh(boxGeo, eye); eyeMesh.position.set(x, 1.43, 0.34); eyeMesh.scale.set(0.12, 0.1, 0.045); g.add(eyeMesh);
  }
  const cap = new THREE.Mesh(boxGeo, metal); cap.position.set(0, 1.66, 0); cap.scale.set(0.87, 0.08, 0.65); g.add(cap);
  const antenna = new THREE.Mesh(cylGeo, rust); antenna.position.set(0.23, 1.85, 0); antenna.scale.set(0.025, 0.3, 0.025); g.add(antenna);
  const bulb = new THREE.Mesh(boxGeo, gold); bulb.position.set(0.23, 2.01, 0); bulb.scale.set(0.075, 0.075, 0.075); g.add(bulb);
  const pack = new THREE.Mesh(boxGeo, metal); pack.position.set(0, 0.93, -0.34); pack.scale.set(0.48, 0.53, 0.25); g.add(pack);

  // Legs
  const legs = [];
  for (const x of [-0.22, 0.22]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.52, 0);
    const upper = new THREE.Mesh(boxGeo, metal); upper.position.set(0, -0.15, 0); upper.scale.set(0.17, 0.33, 0.19); leg.add(upper);
    const boot = new THREE.Mesh(boxGeo, cream); boot.position.set(0, -0.34, 0.09); boot.scale.set(0.24, 0.16, 0.38); leg.add(boot);
    g.add(leg); legs.push(leg);
    const arm = new THREE.Mesh(boxGeo, cream); arm.position.set(x * 1.9, 0.86, 0); arm.scale.set(0.18, 0.53, 0.22); g.add(arm);
  }
  g.scale.setScalar(0.68);
  g.userData.legs = legs;
  g.castShadow = true;
  return g;
}


export function startEmote(avatar, id) {
  if (!avatar || !isEmote(id)) return;
  stopEmote(avatar);
  avatar.userData.emote = { id, elapsed: 0 };
}
export function stopEmote(avatar) {
  const data = avatar?.userData;
  if (!data?.rig) return;
  data.emote = null;
  data.rig.rotation.set(0, 0, 0);
  data.rig.position.set(0, 0, 0);
  data.arms.forEach(arm => arm.rotation.set(0, 0, 0));
}
export function updateEmote(avatar, dt) {
  const data = avatar.userData, state = data.emote;
  if (!state) return;
  state.elapsed += dt;
  const t = state.elapsed;
  if (t >= EMOTE_DURATION) { stopEmote(avatar); return; }
  const ease = Math.min(1, t / .25, (EMOTE_DURATION - t) / .4);
  const [left, right] = data.arms;
  data.rig.rotation.set(0, 0, 0);
  data.rig.position.set(0, 0, 0);
  left.rotation.set(0, 0, 0); right.rotation.set(0, 0, 0);
  switch (state.id) {
    case 'wave': right.rotation.z = (2.5 + Math.sin(t * 13) * .35) * ease; break;
    case 'dance':
      data.rig.rotation.z = Math.sin(t * 7) * .16 * ease;
      data.rig.rotation.y = Math.sin(t * 4) * .4 * ease;
      left.rotation.x = Math.sin(t * 7) * .9 * ease;
      right.rotation.x = -left.rotation.x;
      left.rotation.z = -.65 * ease; right.rotation.z = .65 * ease; break;
    case 'cheer':
      left.rotation.z = -2.6 * ease; right.rotation.z = 2.6 * ease;
      data.rig.position.y = Math.abs(Math.sin(t * 7)) * .12 * ease; break;
    case 'heart':
      left.rotation.x = right.rotation.x = -1.2 * ease;
      left.rotation.z = .65 * ease; right.rotation.z = -.65 * ease;
      data.rig.rotation.z = Math.sin(t * 3) * .1 * ease; break;
    case 'bow':
      data.rig.rotation.x = Math.sin(Math.min(1, t / EMOTE_DURATION) * Math.PI) * .55;
      right.rotation.x = -1 * ease; right.rotation.z = -.6 * ease; break;
    case 'shrug':
      left.rotation.z = -1.15 * ease; right.rotation.z = 1.15 * ease;
      left.rotation.x = right.rotation.x = -.5 * ease;
      data.rig.rotation.z = Math.sin(t * 3) * .13 * ease; break;
  }
}

/**
 * Avatar Presenter & Factory.
 *
 * Provides drop-in avatar creation and hot-swapping (design D4, D6):
 *   - createAvatarFor(playerId, nickname, avatarId): returns a THREE.Group
 *     satisfying the exact userData.{legs, arms, rig, nameSprite} animation contract.
 *   - applyAvatar(avatarGroup, avatarId): hot-swaps model in place while
 *     preserving world position, rotation, sitting posture, and nameplate.
 *   - accentColorFor(playerId): deterministic pure per-player accent tint.
 */

import * as THREE from 'three';
import { getAvatarDefinition, normalizeAvatarId } from '../../shared/avatarDefinitions.js';
import { avatarLoader, resolveAvatarDefinition } from './loader.js';
import { initializeAvatarEffects, updateAvatarEffect } from './effects.js';
import { createPlayerAvatar, createNicknameSprite } from '../render/avatars.js';

export const ACCENT_PALETTE = Object.freeze([
  '#d48c38', // warm amber
  '#2a9d8f', // deep teal
  '#bc4749', // oxide red
  '#e76f51', // terracotta
  '#457b9d', // slate cyan
  '#9d4edd', // quiet amethyst
  '#e9c46a', // ochre gold
  '#588157', // moss green
]);

/**
 * Deterministic accent color for a player id.
 * Pure hash over ACCENT_PALETTE.
 */
export function accentColorFor(id = '') {
  const str = String(id || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

/**
 * Apply accent tint to declared materials on an instantiated avatar.
 */
export function applyAccentTint(avatarScene, definition, playerId) {
  if (!definition?.tintMaterials?.length) return;
  const accentHex = accentColorFor(playerId);
  const tintSet = new Set(definition.tintMaterials);

  avatarScene.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (mat.name && tintSet.has(mat.name)) {
        if (mat.color) mat.color.set(accentHex);
      }
    }
  });
}

/**
 * Configure shadow casting / receiving across meshes in an avatar.
 */
export function configureAvatarShadows(avatarScene) {
  avatarScene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });
}

/**
 * Builds an authored avatar scene graph from an instantiated template.
 */
function setupAuthoredRig(group, instance, playerId, nickname, definition) {
  const scene = instance.scene;
  const scale = definition.scale || 1.0;
  scene.scale.set(scale, scale, scale);

  applyAccentTint(scene, definition, playerId);
  configureAvatarShadows(scene);

  const rigNode = instance.nodes.AL_Rig || scene;
  const legL = instance.nodes.AL_Leg_L || null;
  const legR = instance.nodes.AL_Leg_R || null;
  const armL = instance.nodes.AL_Arm_L || null;
  const armR = instance.nodes.AL_Arm_R || null;

  const legs = [legL, legR].filter(Boolean);
  const arms = [armL, armR].filter(Boolean);

  group.add(scene);

  group.userData.isAuthored = true;
  group.userData.definition = definition;
  group.userData.avatarId = definition.id;
  group.userData.legs = legs;
  group.userData.arms = arms;
  group.userData.rig = rigNode;
  group.userData.head = instance.nodes.AL_Head || null;
  group.userData.root = instance.nodes.AL_Root || null;
  group.userData.degraded = instance.degraded;
  group.userData.missingNodes = instance.missingNodes;

  initializeAvatarEffects(group, definition.effect);
}

/**
 * Hot-swaps the avatar visual mesh on an existing avatarGroup,
 * preserving position, rotation, sitting state, and nameplate.
 */
export function applyAvatar(avatarGroup, avatarId, loader = avatarLoader) {
  const definition = resolveAvatarDefinition(avatarId);
  if (!definition) return false;
  const normId = definition.id;

  if (!loader.isAvailable(normId)) {
    // Kick off background load if not already loading
    loader.loadTemplate(normId).then((record) => {
      if (record && !record.unavailable && avatarGroup.userData?.avatarId === normId) {
        applyAvatar(avatarGroup, normId, loader);
      }
    });
    return false;
  }

  const instance = loader.instantiate(normId);
  if (!instance) return false;

  const playerId = avatarGroup.userData.playerId;
  const nickname = avatarGroup.userData.nickname;
  const wasSitting = avatarGroup.userData.sitting || (avatarGroup.userData.legs?.[0]?.rotation.x < -1.0);

  // Remove existing visual meshes (everything except nameSprite)
  const nameSprite = avatarGroup.userData.nameSprite;
  for (const child of [...avatarGroup.children]) {
    if (child !== nameSprite) {
      avatarGroup.remove(child);
    }
  }

  // Set up new authored rig
  setupAuthoredRig(avatarGroup, instance, playerId, nickname, definition);

  // Update nameplate position
  const nameplateY = definition.nameplateY || 2.3;
  avatarGroup.userData.nameplateY = nameplateY;
  if (nameSprite) {
    nameSprite.position.y = nameplateY;
  }

  // Restore sitting posture if needed
  if (wasSitting) {
    avatarGroup.userData.legs.forEach((leg) => {
      leg.rotation.x = -1.35;
    });
  }

  return true;
}

/**
 * Creates an avatar group for a player.
 * Immediately uses authored GLB if available, otherwise procedural fallback
 * and upgrades when the authored GLB finishes loading.
 */
export function createAvatarFor(playerId, nickname = 'Visitor', avatarId = null, loader = avatarLoader) {
  const definition = resolveAvatarDefinition(avatarId);
  const normId = definition ? definition.id : null;

  // If authored template is already loaded and ready, build authored directly
  if (normId && definition && loader.isAvailable(normId)) {
    const instance = loader.instantiate(normId);
    if (instance) {
      const group = new THREE.Group();
      const nameplateY = definition.nameplateY || 2.3;
      const nameSprite = createNicknameSprite(nickname);
      nameSprite.position.y = nameplateY;
      group.add(nameSprite);

      group.userData = {
        playerId,
        nickname,
        avatarId: normId,
        nameplateY,
        nameSprite,
        emote: null,
        updateNickname(newName) {
          group.remove(group.userData.nameSprite);
          const newSprite = createNicknameSprite(newName);
          newSprite.position.y = group.userData.nameplateY;
          group.add(newSprite);
          group.userData.nameSprite = newSprite;
          group.userData.nickname = newName;
        },
        setAvatar(newId) {
          group.userData.avatarId = newId;
          applyAvatar(group, newId, loader);
        },
        update(time, dt) {
          updateAvatarEffect(group, time, dt);
        },
      };

      setupAuthoredRig(group, instance, playerId, nickname, definition);
      return group;
    }
  }

  // Fallback: procedural robot silhouette
  const group = createPlayerAvatar(playerId, nickname, normId);
  group.userData.isAuthored = false;
  group.userData.nameplateY = 2.3;
  group.userData.update = (time, dt) => {
    updateAvatarEffect(group, time, dt);
  };

  // Enhance setAvatar on procedural avatar
  const originalSetAvatar = group.userData.setAvatar;
  group.userData.setAvatar = (newId) => {
    originalSetAvatar?.(newId);
    if (newId) {
      applyAvatar(group, newId, loader);
    }
  };

  // If avatarId requested and not unavailable, start background load
  if (normId && definition && !loader.isUnavailable(normId)) {
    loader.loadTemplate(normId).then((record) => {
      if (record && !record.unavailable) {
        applyAvatar(group, normId, loader);
      }
    });
  }

  return group;
}

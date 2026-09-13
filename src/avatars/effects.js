/**
 * Avatar Visual Effects Registry.
 *
 * Implements subtle, declarative flourishes (design D4):
 *   - 'crt-static': subtle emissive scanline/noise modulation on FX_Screen
 *   - 'glow-pulse': gentle sine wave on emissive materials
 *   - 'spin': continuous rotation on FX_Spin, FX_Spin_L/R nodes (cassette reels, iris)
 *   - 'flicker': occasional soft emissive dip/spike (neon, lightning)
 *   - 'float': gentle hover bob on root + trailing sway
 *
 * Contract:
 *   - update(avatar, time, dt) is called each frame.
 *   - Zero allocations per frame (no new objects, no geometry creation).
 *   - Affects only declared materials or nodes starting with FX_.
 */

export const EFFECT_REGISTRY = {
  'crt-static': (avatar, time, _dt) => {
    const meshes = avatar.userData.fxMeshes;
    if (!meshes) return;
    for (const mesh of meshes) {
      if (mesh.material?.name?.startsWith('FX_Screen')) {
        const jitter = Math.sin(time * 30.0) * 0.15 + Math.sin(time * 67.0) * 0.05;
        const base = 0.85;
        mesh.material.emissiveIntensity = Math.max(0.4, base + jitter);
      }
    }
  },

  'glow-pulse': (avatar, time, _dt) => {
    const meshes = avatar.userData.fxMeshes;
    if (!meshes) return;
    const pulse = 0.75 + 0.45 * Math.sin(time * 3.2);
    for (const mesh of meshes) {
      if (mesh.material?.emissiveIntensity !== undefined) {
        mesh.material.emissiveIntensity = pulse;
      }
    }
  },

  'spin': (avatar, _time, dt) => {
    const spinNodes = avatar.userData.fxSpinNodes;
    if (!spinNodes) return;
    const speed = 4.0; // rad/s
    for (const node of spinNodes) {
      node.rotation.z += dt * speed;
    }
  },

  'flicker': (avatar, time, _dt) => {
    const meshes = avatar.userData.fxMeshes;
    if (!meshes) return;
    // Deterministic pseudo-random flicker from time
    const noise = Math.sin(time * 45.0) * Math.sin(time * 83.0);
    const drop = noise > 0.85 ? 0.3 : 1.0;
    const base = 0.8 + 0.2 * Math.sin(time * 2.0);
    for (const mesh of meshes) {
      if (mesh.material?.emissiveIntensity !== undefined) {
        mesh.material.emissiveIntensity = base * drop;
      }
    }
  },

  'float': (avatar, time, dt) => {
    // Gentle root bob for floating avatars
    const isFloatingRig = avatar.userData?.definition?.rig === 'floating';
    if (isFloatingRig) {
      const rig = avatar.userData.rig;
      if (rig) {
        const bob = Math.sin(time * 2.4) * 0.08;
        rig.position.y = bob;
      }
    }
    const trails = avatar.userData.fxTrailNodes;
    if (trails) {
      const sway = Math.sin(time * 2.0) * 0.12;
      for (const node of trails) {
        node.rotation.z = sway;
      }
    }
    const fishes = avatar.userData.fxFishNodes;
    if (fishes) {
      const speed = 1.8;
      const radius = 0.10;
      const angle = time * speed;
      for (const fish of fishes) {
        fish.position.x = Math.cos(angle) * radius;
        fish.position.y = Math.sin(angle) * radius;
        fish.rotation.z = angle + Math.PI / 2;
      }
    }
  },
};

/**
 * Cache FX nodes and materials once when an avatar model is loaded/attached,
 * so the per-frame effect loop performs zero scene traversal or allocations.
 */
export function initializeAvatarEffects(avatarGroup, effectName) {
  const isFloating = avatarGroup.userData?.definition?.rig === 'floating';
  if (!effectName && !isFloating) {
    avatarGroup.userData.fxEffect = null;
    avatarGroup.userData.fxMeshes = null;
    avatarGroup.userData.fxSpinNodes = null;
    avatarGroup.userData.fxTrailNodes = null;
    avatarGroup.userData.fxFishNodes = null;
    return;
  }

  const fxMeshes = [];
  const fxSpinNodes = [];
  const fxTrailNodes = [];
  const fxFishNodes = [];

  avatarGroup.traverse((child) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m.name && m.name.startsWith('FX_')) {
          fxMeshes.push(child);
          break;
        }
      }
    }
    if (child.name && (child.name.startsWith('FX_Spin') || child.name.startsWith('FX_Reel') || child.name.startsWith('FX_Iris'))) {
      fxSpinNodes.push(child);
    }
    if (child.name && (child.name.startsWith('FX_Trail') || child.name.startsWith('FX_Tentacle'))) {
      fxTrailNodes.push(child);
    }
    if (child.name && child.name.startsWith('FX_Fish')) {
      fxFishNodes.push(child);
    }
  });

  avatarGroup.userData.fxEffect = effectName;
  avatarGroup.userData.fxMeshes = fxMeshes;
  avatarGroup.userData.fxSpinNodes = fxSpinNodes;
  avatarGroup.userData.fxTrailNodes = fxTrailNodes;
  avatarGroup.userData.fxFishNodes = fxFishNodes.length ? fxFishNodes : null;
}

/**
 * Updates the active flourish effect on an avatar, if registered.
 */
export function updateAvatarEffect(avatarGroup, time, dt) {
  const isFloating = avatarGroup.userData?.definition?.rig === 'floating';
  if (isFloating) {
    EFFECT_REGISTRY['float'](avatarGroup, time, dt);
  }

  const effectName = avatarGroup.userData?.fxEffect;
  if (effectName === 'spin') {
    EFFECT_REGISTRY['spin'](avatarGroup, time, dt);
  } else {
    if (avatarGroup.userData?.fxSpinNodes?.length) {
      EFFECT_REGISTRY['spin'](avatarGroup, time, dt);
    }
    if (effectName && effectName !== 'float') {
      const handler = EFFECT_REGISTRY[effectName];
      if (handler) {
        handler(avatarGroup, time, dt);
      }
    }
  }
}

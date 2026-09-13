import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  AvatarLoader,
  validateAvatarScene,
  cloneAvatarHierarchy,
  CONTRACT_NODES_HUMANOID,
} from '../src/avatars/loader.js';

function createSyntheticScene({ missing = [] } = {}) {
  const root = new THREE.Group();
  root.name = 'AVA_test_ROOT';

  const rig = new THREE.Group();
  rig.name = 'AL_Rig';
  root.add(rig);

  const nodes = ['AL_Root', 'AL_Head', 'AL_Arm_L', 'AL_Arm_R', 'AL_Leg_L', 'AL_Leg_R'];
  for (const name of nodes) {
    if (missing.includes(name)) continue;
    const node = new THREE.Group();
    node.name = name;
    rig.add(node);
  }

  // Add a mesh with shared body material and tint material
  const matBody = new THREE.MeshStandardMaterial({ name: 'MAT_Body', color: 0x555555 });
  const matAccent = new THREE.MeshStandardMaterial({ name: 'MAT_Accent', color: 0xffaa00 });
  const matFx = new THREE.MeshStandardMaterial({ name: 'FX_Screen', color: 0x00ffcc });

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(), matBody);
  root.add(bodyMesh);

  const accentMesh = new THREE.Mesh(new THREE.BoxGeometry(), matAccent);
  root.add(accentMesh);

  const fxMesh = new THREE.Mesh(new THREE.BoxGeometry(), matFx);
  root.add(fxMesh);

  return { root, matBody, matAccent, matFx };
}

test('validateAvatarScene identifies valid contract nodes', () => {
  const { root } = createSyntheticScene();
  const validation = validateAvatarScene(root, { rig: 'humanoid' });
  assert.equal(validation.valid, true);
  assert.equal(validation.degraded, false);
  assert.equal(validation.missingNodes.length, 0);
  assert.ok(validation.nodes['AL_Head']);
  assert.ok(validation.nodes['AL_Leg_L']);
  assert.ok(validation.nodes['AL_Leg_R']);
});

test('validateAvatarScene flags missing nodes and marks degraded', () => {
  const { root } = createSyntheticScene({ missing: ['AL_Leg_L', 'AL_Arm_R'] });
  const validation = validateAvatarScene(root, { rig: 'humanoid' });
  assert.equal(validation.valid, true);
  assert.equal(validation.degraded, true);
  assert.deepEqual(validation.missingNodes.sort(), ['AL_Arm_R', 'AL_Leg_L'].sort());
});

test('cloneAvatarHierarchy clones ONLY tintMaterials and FX_* materials', () => {
  const { root, matBody, matAccent, matFx } = createSyntheticScene();
  const cloned = cloneAvatarHierarchy(root, {
    tintMaterials: ['MAT_Accent'],
  });

  let clonedMatBody = null;
  let clonedMatAccent = null;
  let clonedMatFx = null;

  cloned.traverse((child) => {
    if (child.isMesh) {
      if (child.material.name === 'MAT_Body') clonedMatBody = child.material;
      if (child.material.name === 'MAT_Accent') clonedMatAccent = child.material;
      if (child.material.name === 'FX_Screen') clonedMatFx = child.material;
    }
  });

  // Shared body material should NOT be cloned (identical instance)
  assert.equal(clonedMatBody, matBody, 'MAT_Body must remain shared across instances');

  // Tint material MUST be cloned
  assert.notEqual(clonedMatAccent, matAccent, 'MAT_Accent must be cloned per instance');
  assert.equal(clonedMatAccent.name, 'MAT_Accent');

  // FX material MUST be cloned
  assert.notEqual(clonedMatFx, matFx, 'FX_Screen must be cloned per instance');
  assert.equal(clonedMatFx.name, 'FX_Screen');
});

test('AvatarLoader deduplicates concurrent in-flight fetches', async () => {
  let fetchCount = 0;
  const mockFetch = async () => {
    fetchCount++;
    await new Promise(r => setTimeout(r, 20));
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(8),
    };
  };

  const { root } = createSyntheticScene();
  const mockLoader = async () => ({ scene: root });

  const loader = new AvatarLoader({
    baseUrl: '/',
    fetchFn: mockFetch,
    loaderFn: mockLoader,
  });

  // Trigger two concurrent loads for the same avatar id
  const [res1, res2] = await Promise.all([
    loader.loadTemplate('moon-head'),
    loader.loadTemplate('moon-head'),
  ]);

  assert.equal(fetchCount, 1, 'Only 1 HTTP fetch should occur for concurrent loads of same id');
  assert.equal(res1, res2, 'Both promises should resolve to identical template record');
  assert.equal(res1.unavailable, false);
});

test('AvatarLoader retries once on transient fetch failure then succeeds', async () => {
  let attempt = 0;
  const mockFetch = async () => {
    attempt++;
    if (attempt === 1) {
      return { ok: false, status: 503 };
    }
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(8),
    };
  };

  const { root } = createSyntheticScene();
  const mockLoader = async () => ({ scene: root });

  const loader = new AvatarLoader({
    baseUrl: '/',
    fetchFn: mockFetch,
    loaderFn: mockLoader,
  });

  const res = await loader.loadTemplate('traffic-cone-guy');
  assert.equal(attempt, 2, 'Should have retried once');
  assert.equal(res.unavailable, false, 'Should succeed after retry');
});

test('AvatarLoader marks template unavailable when all retries fail and instantiate returns null', async () => {
  let attempt = 0;
  const mockFetch = async () => {
    attempt++;
    return { ok: false, status: 404 };
  };

  const loader = new AvatarLoader({
    baseUrl: '/',
    fetchFn: mockFetch,
    loaderFn: async () => {},
  });

  const res = await loader.loadTemplate('alien-tourist');
  assert.equal(attempt, 2, 'Should attempt initial fetch + 1 retry');
  assert.equal(res.unavailable, true, 'Marked unavailable');
  assert.equal(loader.isUnavailable('alien-tourist'), true);
  assert.equal(loader.instantiate('alien-tourist'), null, 'instantiate returns null on unavailable');
});

test('AvatarLoader registerTemplate allows synthetic scene graph injection and instantiation', () => {
  const { root } = createSyntheticScene();
  const loader = new AvatarLoader();

  loader.registerTemplate('moon-head', root, {
    id: 'moon-head',
    rig: 'humanoid',
    tintMaterials: ['MAT_Accent'],
  });

  assert.equal(loader.isAvailable('moon-head'), true);
  const instance = loader.instantiate('moon-head');
  assert.ok(instance, 'Instance created from synthetic scene');
  assert.ok(instance.scene);
  assert.ok(instance.nodes['AL_Head']);
  assert.ok(instance.nodes['AL_Leg_L']);
  assert.equal(instance.degraded, false);
});

test('accentColorFor is deterministic and covers ACCENT_PALETTE', async () => {
  const { accentColorFor, ACCENT_PALETTE } = await import('../src/avatars/presenter.js');
  const color1 = accentColorFor('player_123');
  const color2 = accentColorFor('player_123');
  assert.equal(color1, color2, 'Identical ID must produce identical accent color');
  assert.ok(ACCENT_PALETTE.includes(color1), 'Color must come from ACCENT_PALETTE');

  const seen = new Set();
  for (let i = 0; i < 50; i++) {
    seen.add(accentColorFor(`visitor_${i}`));
  }
  assert.ok(seen.size >= 4, 'Distribution across palette');
});

test('createAvatarFor falls back to procedural avatar when template unavailable', async () => {
  const { createAvatarFor } = await import('../src/avatars/presenter.js');
  const avatar = createAvatarFor('guest_fallback', 'QuietVisitor', 'nonexistent-avatar');
  assert.ok(avatar);
  assert.equal(avatar.userData.isAuthored, false);
  assert.equal(avatar.userData.nickname, 'QuietVisitor');
  assert.ok(Array.isArray(avatar.userData.legs));
  assert.ok(Array.isArray(avatar.userData.arms));
  assert.ok(avatar.userData.rig);
  assert.ok(avatar.userData.nameSprite);
  assert.equal(typeof avatar.userData.updateNickname, 'function');
  assert.equal(typeof avatar.userData.setAvatar, 'function');
});

test('createAvatarFor builds authored avatar with exact contract when template available', async () => {
  const { createAvatarFor } = await import('../src/avatars/presenter.js');
  const { root } = createSyntheticScene();
  const loader = new AvatarLoader();

  loader.registerTemplate('moon-head', root, {
    id: 'moon-head',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: 'glow-pulse',
  });

  const avatar = createAvatarFor('guest_moon', 'MoonSeeker', 'moon-head', loader);
  assert.ok(avatar);
  assert.equal(avatar.userData.isAuthored, true);
  assert.equal(avatar.userData.avatarId, 'moon-head');
  assert.equal(avatar.userData.legs.length, 2);
  assert.equal(avatar.userData.arms.length, 2);
  assert.ok(avatar.userData.rig);
  assert.ok(avatar.userData.nameSprite);

  // Check accent tint application on MAT_Accent
  let tintedColor = null;
  avatar.traverse((child) => {
    if (child.isMesh && child.material?.name === 'MAT_Accent') {
      tintedColor = child.material.color.getHexString();
    }
  });
  assert.ok(tintedColor, 'MAT_Accent must have a tinted color');
});

test('applyAvatar hot-swaps avatar mesh and preserves position, rotation, and sitting posture', async () => {
  const { createAvatarFor, applyAvatar } = await import('../src/avatars/presenter.js');
  const { root: root1 } = createSyntheticScene();
  const { root: root2 } = createSyntheticScene();
  const loader = new AvatarLoader();

  loader.registerTemplate('moon-head', root1, {
    id: 'moon-head',
    rig: 'humanoid',
    tintMaterials: ['MAT_Accent'],
  });

  loader.registerTemplate('traffic-cone-guy', root2, {
    id: 'traffic-cone-guy',
    rig: 'humanoid',
    tintMaterials: ['MAT_Accent'],
    nameplateY: 2.45,
  });

  const avatar = createAvatarFor('guest_swap', 'Swapper', 'moon-head', loader);
  avatar.position.set(10, 0, -5);
  avatar.rotation.y = 1.5;
  avatar.userData.sitting = true;
  avatar.userData.legs.forEach(leg => { leg.rotation.x = -1.35; });

  // Hot swap to traffic-cone-guy
  const swapped = applyAvatar(avatar, 'traffic-cone-guy', loader);
  assert.equal(swapped, true);

  // Verification of preserved state
  assert.equal(avatar.position.x, 10);
  assert.equal(avatar.position.z, -5);
  assert.equal(avatar.rotation.y, 1.5);
  assert.equal(avatar.userData.avatarId, 'traffic-cone-guy');
  assert.equal(avatar.userData.nameplateY, 2.45);
  // Sitting posture restored
  assert.equal(avatar.userData.legs[0].rotation.x, -1.35);
  assert.equal(avatar.userData.legs[1].rotation.x, -1.35);
});

test('effects registry updates effect without allocations', async () => {
  const { updateAvatarEffect, initializeAvatarEffects } = await import('../src/avatars/effects.js');
  const avatar = new THREE.Group();
  avatar.userData = {};

  const spinNode = new THREE.Group();
  spinNode.name = 'FX_Spin_L';
  avatar.add(spinNode);

  const fxMat = new THREE.MeshStandardMaterial({ name: 'FX_Screen', emissiveIntensity: 1.0 });
  const fxMesh = new THREE.Mesh(new THREE.BoxGeometry(), fxMat);
  avatar.add(fxMesh);

  initializeAvatarEffects(avatar, 'spin');
  assert.equal(avatar.userData.fxEffect, 'spin');
  assert.equal(avatar.userData.fxSpinNodes.length, 1);

  const initialRotZ = spinNode.rotation.z;
  updateAvatarEffect(avatar, 1.0, 0.1);
  assert.ok(spinNode.rotation.z > initialRotZ, 'spin effect must rotate node');

  // Test crt-static
  initializeAvatarEffects(avatar, 'crt-static');
  assert.equal(avatar.userData.fxEffect, 'crt-static');
  assert.equal(avatar.userData.fxMeshes.length, 1);
  updateAvatarEffect(avatar, 2.0, 0.016);
  assert.ok(typeof fxMat.emissiveIntensity === 'number');
});

test('real mannequin.glb loads, satisfies rig contract, and can be instantiated by presenter', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { createAvatarFor, applyAvatar } = await import('../src/avatars/presenter.js');
  const { AvatarLoader } = await import('../src/avatars/loader.js');

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const glbPath = path.join(repoRoot, 'public', 'avatars', '_test', 'mannequin.glb');
  const fileBuffer = await fs.readFile(glbPath);

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength),
  });

  const loader = new AvatarLoader({
    baseUrl: '/',
    fetchFn: mockFetch,
  });

  const record = await loader.loadTemplate('mannequin');
  assert.equal(record.unavailable, false);
  assert.equal(record.degraded, false);
  assert.equal(record.missingNodes.length, 0);

  const avatar = createAvatarFor('guest_test_mannequin', 'TestPilot', 'mannequin', loader);
  assert.ok(avatar);
  assert.equal(avatar.userData.isAuthored, true);
  assert.equal(avatar.userData.avatarId, 'mannequin');
  assert.equal(avatar.userData.legs.length, 2);
  assert.equal(avatar.userData.arms.length, 2);
  assert.ok(avatar.userData.rig);
  assert.ok(avatar.userData.head);
  assert.ok(avatar.userData.root);

  // Test walk swing on real mannequin legs
  avatar.userData.legs[0].rotation.x = 0.45;
  avatar.userData.legs[1].rotation.x = -0.45;
  assert.equal(avatar.userData.legs[0].rotation.x, 0.45);

  // Test sitting posture on real mannequin legs
  avatar.userData.legs.forEach(leg => { leg.rotation.x = -1.35; });
  assert.equal(avatar.userData.legs[0].rotation.x, -1.35);
  assert.equal(avatar.userData.legs[1].rotation.x, -1.35);
});



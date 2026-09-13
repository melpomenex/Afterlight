import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AVATAR_DEFINITIONS,
  VALID_RIG_KINDS,
  VALID_RARITIES,
  VALID_EFFECTS,
  validateAvatarDefinition,
  validateAvatarDefinitions,
  getAvatarDefinition,
  normalizeAvatarId,
} from '../shared/avatarDefinitions.js';

test('valid avatar catalog conforms to specifications and is deep frozen', () => {
  assert.equal(Array.isArray(AVATAR_DEFINITIONS), true);
  assert.equal(AVATAR_DEFINITIONS.length, 24, '24 avatar definitions');
  assert.ok(Object.isFrozen(AVATAR_DEFINITIONS), 'manifest is frozen');

  // Verify all entries are frozen and valid
  const seenIds = new Set();
  for (const def of AVATAR_DEFINITIONS) {
    assert.ok(Object.isFrozen(def), `avatar ${def.id} is frozen`);
    assert.ok(Object.isFrozen(def.tintMaterials), `avatar ${def.id} tintMaterials is frozen`);
    assert.ok(Object.isFrozen(def.tags), `avatar ${def.id} tags is frozen`);

    assert.ok(!seenIds.has(def.id), `id ${def.id} is unique`);
    seenIds.add(def.id);

    assert.equal(validateAvatarDefinition(def), true);
    assert.equal(def.assetPath, `avatars/${def.id}/${def.id}.glb`);
    assert.ok(VALID_RIG_KINDS.includes(def.rig));
    assert.ok(VALID_RARITIES.includes(def.rarity));
    if (def.effect !== null) {
      assert.ok(VALID_EFFECTS.includes(def.effect));
    }
    assert.ok(Number.isInteger(def.weight) && def.weight > 0);
    assert.ok(def.scale > 0);
    assert.ok(def.nameplateY > 0);
  }

  assert.equal(validateAvatarDefinitions(AVATAR_DEFINITIONS), true);
});

test('validateAvatarDefinition rejects each malformed case with clear errors', () => {
  const base = {
    id: 'test-avatar',
    name: 'Test Avatar',
    assetPath: 'avatars/test-avatar/test-avatar.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'common',
    weight: 10,
    tags: ['test'],
  };

  assert.throws(() => validateAvatarDefinition(null), /must be an object/);
  assert.throws(() => validateAvatarDefinition('not an object'), /must be an object/);

  // Invalid id
  assert.throws(() => validateAvatarDefinition({ ...base, id: '' }), /Invalid avatar id/);
  assert.throws(() => validateAvatarDefinition({ ...base, id: 'Test_Avatar' }), /Invalid avatar id/);
  assert.throws(() => validateAvatarDefinition({ ...base, id: 'test/avatar' }), /Invalid avatar id/);

  // Invalid name
  assert.throws(() => validateAvatarDefinition({ ...base, name: '' }), /name must be a non-empty string/);
  assert.throws(() => validateAvatarDefinition({ ...base, name: 123 }), /name must be a non-empty string/);

  // Invalid assetPath (traversal or mismatch)
  assert.throws(
    () => validateAvatarDefinition({ ...base, assetPath: 'avatars/test-avatar/../other.glb' }),
    /assetPath/
  );
  assert.throws(
    () => validateAvatarDefinition({ ...base, assetPath: 'avatars/other/test-avatar.glb' }),
    /assetPath/
  );

  // Unknown rig kind
  assert.throws(() => validateAvatarDefinition({ ...base, rig: 'quadruped' }), /unknown rig kind/);

  // Invalid scale
  assert.throws(() => validateAvatarDefinition({ ...base, scale: 0 }), /scale must be a positive finite number/);
  assert.throws(() => validateAvatarDefinition({ ...base, scale: -1 }), /scale must be a positive finite number/);
  assert.throws(() => validateAvatarDefinition({ ...base, scale: NaN }), /scale must be a positive finite number/);

  // Invalid nameplateY
  assert.throws(() => validateAvatarDefinition({ ...base, nameplateY: 0 }), /nameplateY must be a positive finite number/);
  assert.throws(() => validateAvatarDefinition({ ...base, nameplateY: -2.3 }), /nameplateY must be a positive finite number/);

  // Invalid tintMaterials
  assert.throws(() => validateAvatarDefinition({ ...base, tintMaterials: 'MAT_Accent' }), /tintMaterials must be an array/);
  assert.throws(() => validateAvatarDefinition({ ...base, tintMaterials: [123] }), /tintMaterials must be an array/);

  // Unknown effect
  assert.throws(() => validateAvatarDefinition({ ...base, effect: 'fire-sparks' }), /unknown effect/);

  // Unknown rarity
  assert.throws(() => validateAvatarDefinition({ ...base, rarity: 'legendary' }), /unknown rarity/);

  // Invalid weight
  assert.throws(() => validateAvatarDefinition({ ...base, weight: 0 }), /weight must be a positive integer/);
  assert.throws(() => validateAvatarDefinition({ ...base, weight: -5 }), /weight must be a positive integer/);
  assert.throws(() => validateAvatarDefinition({ ...base, weight: 2.5 }), /weight must be a positive integer/);

  // Invalid tags
  assert.throws(() => validateAvatarDefinition({ ...base, tags: 'tag' }), /tags must be an array/);
  assert.throws(() => validateAvatarDefinition({ ...base, tags: [123] }), /tags must be an array/);
});

test('validateAvatarDefinitions rejects non-arrays and duplicate IDs', () => {
  assert.throws(() => validateAvatarDefinitions(null), /must be an array/);

  const def1 = {
    id: 'dupe-avatar',
    name: 'Dupe One',
    assetPath: 'avatars/dupe-avatar/dupe-avatar.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'common',
    weight: 10,
    tags: ['dupe'],
  };
  const def2 = { ...def1, name: 'Dupe Two' };

  assert.throws(() => validateAvatarDefinitions([def1, def2]), /Duplicate avatar id "dupe-avatar"/);
});

test('lookup and normalization helpers operate correctly and maintain append-only stability', () => {
  const moon = getAvatarDefinition('moon-head');
  assert.ok(moon);
  assert.equal(moon.name, 'Moon Head');
  assert.equal(moon.rig, 'humanoid');

  assert.equal(getAvatarDefinition('unknown-avatar'), null);
  assert.equal(getAvatarDefinition(null), null);
  assert.equal(getAvatarDefinition(undefined), null);

  assert.equal(normalizeAvatarId('moon-head'), 'moon-head');
  assert.equal(normalizeAvatarId('unknown-avatar'), null);
  assert.equal(normalizeAvatarId(null), null);

  // Append-only simulation: adding avatar 25 does not break existing lookups
  const appended = [
    ...AVATAR_DEFINITIONS,
    {
      id: 'avatar-25',
      name: 'Avatar Twenty Five',
      assetPath: 'avatars/avatar-25/avatar-25.glb',
      rig: 'humanoid',
      scale: 1.0,
      nameplateY: 2.3,
      tintMaterials: ['MAT_Accent'],
      effect: null,
      rarity: 'common',
      weight: 10,
      tags: ['appended'],
    },
  ];
  assert.equal(validateAvatarDefinitions(appended), true);
  for (const def of AVATAR_DEFINITIONS) {
    const found = appended.find((d) => d.id === def.id);
    assert.deepEqual(found, def);
  }
});

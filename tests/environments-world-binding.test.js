import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTheaterEnvironmentRuntime } from '../src/environments/index.js';
import { WORLD_IDS, getWorldDefinition } from '../shared/worldDefinitions.js';

test('theater environment runtime binds to selected World and supports all 18 variants without rebuilding theater core', () => {
  // Create mock theater world with functional core
  const theaterGroup = new THREE.Group();
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 9));
  theaterGroup.add(screenMesh);

  const initialObstacles = Object.freeze([
    { x: -10, z: -5, w: 2, d: 2 },
    { x: 5, z: 8, w: 4, d: 1 },
  ]);
  const initialItems = Object.freeze([
    { kind: 'seat', x: 0, z: 0 },
    { kind: 'cabinet', x: 2, z: 2 },
  ]);

  const mockWorld = {
    group: theaterGroup,
    obstacles: [...initialObstacles],
    items: [...initialItems],
    screenQuad: screenMesh,
    environment: {
      materialFamilies: ['family:theater-floor'],
      zones: ['zone:theater-interior'],
      emitterAnchors: ['anchor:screen'],
      sky: null,
    },
  };

  let currentSelection = { worldId: 'coastal', variantId: 'sunset' };

  const runtime = createTheaterEnvironmentRuntime({
    defaultTier: 'low',
    getWorldSelection: () => currentSelection,
  });

  const coreChildrenCount = theaterGroup.children.length;

  // Verify all 6 worlds and all 18 variants build and update correctly
  let totalVariantsTested = 0;

  for (const worldId of WORLD_IDS) {
    const worldDef = getWorldDefinition(worldId);
    assert.ok(worldDef);
    const variantKeys = Object.keys(worldDef.variants);
    assert.equal(variantKeys.length, 3, `world ${worldId} must have 3 variants`);

    for (let i = 0; i < variantKeys.length; i++) {
      const variantId = variantKeys[i];
      currentSelection = { worldId, variantId };

      const prevBuildCount = runtime.state.buildCount;
      const result = runtime.sync({ world: mockWorld, tier: 'low' });

      assert.ok(result.changed || result.status === 'same');
      assert.equal(runtime.state.worldId, worldId);
      assert.equal(runtime.state.variantId, variantId);

      // Functional theater core must NEVER be mutated
      assert.equal(mockWorld.obstacles.length, initialObstacles.length);
      assert.equal(mockWorld.items.length, initialItems.length);
      assert.equal(mockWorld.screenQuad, screenMesh);

      // Environment hooks must be installed
      assert.ok(mockWorld.environment.materialFamilies.length >= 1);
      assert.ok(mockWorld.environment.materialFamilies.includes('family:theater-floor'));

      // Cosmetic root group attached to theaterGroup
      const envGroups = theaterGroup.children.filter(c => c.name?.startsWith('theater-environment-'));
      assert.equal(envGroups.length, 1, 'Only one cosmetic environment root should be in theaterGroup');
      assert.equal(envGroups[0].name, `theater-environment-${worldId}`);

      if (i > 0) {
        // Switching to another variant of the same world should reuse geometry if builder supports setVariant
        // (or buildInto if builder does not support it).
        // Either way, it must succeed without error
        assert.equal(runtime.state.failed, null);
      }

      totalVariantsTested += 1;
    }
  }

  assert.equal(totalVariantsTested, 18, 'Must test all 18 authored variants');

  // Dispose restores base hooks and detaches cosmetic root
  runtime.dispose();
  assert.equal(mockWorld.environment.materialFamilies.length, 1);
  assert.equal(mockWorld.environment.materialFamilies[0], 'family:theater-floor');
  const remainingEnv = theaterGroup.children.filter(c => c.name?.startsWith('theater-environment-'));
  assert.equal(remainingEnv.length, 0);
  assert.equal(theaterGroup.children.length, coreChildrenCount);
});

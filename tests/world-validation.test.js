import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateWorldSystemDeclarations,
  diagnoseWorldResolution,
} from '../src/worlds/validation.js';
import { WORLD_DEFINITIONS } from '../shared/worldDefinitions.js';

test('validateWorldSystemDeclarations passes cleanly on current declarations', () => {
  const problems = validateWorldSystemDeclarations();
  assert.deepEqual(problems, []);
});

test('validateWorldSystemDeclarations catches invalid viewId namespace in interpretations', () => {
  const badCatalog = {
    ...WORLD_DEFINITIONS,
    coastal: {
      ...WORLD_DEFINITIONS.coastal,
      interpretations: {
        'invalid-view-id': { adapterKey: 'something' },
      },
    },
  };

  const problems = validateWorldSystemDeclarations(badCatalog);
  assert.ok(problems.some((p) => p.includes('not a valid namespaced viewId')));
});

test('validateWorldSystemDeclarations catches undeclared asset reference in interpretations', () => {
  const badCatalog = {
    ...WORLD_DEFINITIONS,
    coastal: {
      ...WORLD_DEFINITIONS.coastal,
      assetKit: ['kit:rock'],
      interpretations: {
        'place:theater': { adapterKey: 'theater:coastal', assetIds: ['kit:rock', 'kit:unregistered-tree'] },
      },
    },
  };

  const problems = validateWorldSystemDeclarations(badCatalog);
  assert.ok(problems.some((p) => p.includes('not declared in assetKit')));
});

test('diagnoseWorldResolution reports issues for invalid worldId but provides playable fallback', () => {
  const diag = diagnoseWorldResolution({
    worldId: 'space-station',
    variantId: 'orbit',
    viewId: 'place:theater',
  });

  assert.equal(diag.valid, false);
  assert.ok(diag.issues.length > 0);
  // Plan still falls back to a valid playable world (coastal)
  assert.equal(diag.plan.worldId, 'coastal');
  assert.ok(diag.plan.atmosphere);
});

test('diagnoseWorldResolution reports valid for shipping world and view', () => {
  const diag = diagnoseWorldResolution({
    worldId: 'coastal',
    variantId: 'sunset',
    viewId: 'place:theater',
  });

  assert.equal(diag.valid, true);
  assert.equal(diag.issues.length, 0);
  assert.equal(diag.plan.fallbackLevel, 'exact');
});

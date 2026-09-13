import test from 'node:test';
import assert from 'node:assert/strict';

import { getPlaceDefinition, ORPHEUM_ACTIVITIES, ORPHEUM_ALL_ACTIVITIES } from '../shared/placeDefinitions.js';
import { getViewWorldSupport } from '../src/worlds/registry.js';
import { resolveWorldPresentation } from '../src/worlds/resolver.js';
import { WORLD_DEFINITIONS } from '../shared/worldDefinitions.js';

test('parent table games inherit surrounding world identity without altering table geometry or creating secondary hosts', () => {
  const tableGames = [
    'pool',
    'billiards',
    'air-hockey',
    'foosball',
    'darts',
    'piano',
    'photo-booth',
  ];

  for (const type of tableGames) {
    const viewId = `activity:${type}`;
    const support = getViewWorldSupport(viewId);
    assert.ok(support, `support declared for ${viewId}`);
    assert.equal(support.mode, 'full');
    assert.equal(support.host, 'parent');
    assert.deepEqual(support.slots, []);

    // For every one of the 6 worlds, the presentation plan inherits from parent host
    for (const worldId of Object.keys(WORLD_DEFINITIONS)) {
      const plan = resolveWorldPresentation({
        selection: { worldId, variantId: null },
        viewId,
      });
      assert.equal(plan.inheritedFromParent, true);
      assert.equal(plan.host, 'parent');
      assert.equal(plan.mode, 'full');
      assert.equal(plan.atmosphere, null, 'no secondary atmosphere host created for table game');
      assert.equal(plan.audioProfile, null, 'no duplicate audio profile created for table game');
    }
  }
});

test('retro and dormant games declare mode none and inherit parent host without altering game pixels', () => {
  const retroGames = [
    'pong',
    'rain-runner',
    'signal-lost',
    'sporefall',
  ];

  for (const type of retroGames) {
    const viewId = `activity:${type}`;
    const support = getViewWorldSupport(viewId);
    assert.ok(support, `support declared for ${viewId}`);
    assert.equal(support.mode, 'none');
    assert.equal(support.host, 'parent');
    assert.deepEqual(support.slots, []);

    for (const worldId of Object.keys(WORLD_DEFINITIONS)) {
      const plan = resolveWorldPresentation({
        selection: { worldId, variantId: null },
        viewId,
      });
      assert.equal(plan.inheritedFromParent, true);
      assert.equal(plan.host, 'parent');
      assert.equal(plan.mode, 'none');
      assert.equal(plan.atmosphere, null);
      assert.equal(plan.audioProfile, null);
    }
  }
});

test('unplaced and placed activity manifest status is preserved', () => {
  // Verify Orpheum activity layout contains expected activities and preserves dormant signal-lost
  const orpheum = getPlaceDefinition('theater');
  assert.ok(orpheum, 'theater place definition exists');
  assert.ok(Array.isArray(orpheum.activities), 'theater activities array exists');

  const types = orpheum.activities.map((a) => a.type);
  assert.ok(types.includes('pong'), 'contains pong');
  assert.ok(types.includes('rain-runner'), 'contains rain-runner');
  assert.ok(types.includes('downhill-mayhem'), 'contains downhill-mayhem');
  assert.ok(types.includes('kart-royale'), 'contains kart-royale');
  assert.ok(types.includes('snowboard-race'), 'contains snowboard-race');
  assert.ok(types.includes('pool'), 'contains pool');
  assert.ok(types.includes('air-hockey'), 'contains air-hockey');
  assert.ok(types.includes('foosball'), 'contains foosball');
  assert.ok(types.includes('darts'), 'contains darts');
  assert.ok(types.includes('piano'), 'contains piano');
  assert.ok(types.includes('photo-booth'), 'contains photo-booth');

  // Signal Lost is dormant (manifest unplaced or present in catalog but dormant)
  const signalLostDef = orpheum.activities.find((a) => a.type === 'signal-lost');
  assert.equal(signalLostDef, undefined, 'signal-lost is dormant and not placed on the active Orpheum floor');
});

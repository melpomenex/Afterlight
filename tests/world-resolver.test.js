import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorldPresentation } from '../src/worlds/resolver.js';
import { WORLD_IDS, getWorldDefinition } from '../shared/worldDefinitions.js';
import { PLACE_DEFINITIONS, ACTIVITY_TYPES } from '../shared/placeDefinitions.js';

test('six-World x key-Views matrix resolves deterministically', () => {
  const sampleViews = [
    'place:theater',
    'place:court',
    'place:market',
    'activity:kart-royale',
    'activity:snowboard-race',
    'activity:downhill-mayhem',
    'activity:pool',
    'activity:pong',
  ];

  for (const worldId of WORLD_IDS) {
    const def = getWorldDefinition(worldId);
    for (const viewId of sampleViews) {
      const plan = resolveWorldPresentation({
        selection: { worldId, variantId: def.defaultVariant },
        viewId,
      });
      assert.equal(plan.worldId, worldId);
      assert.equal(plan.variantId, def.defaultVariant);
      assert.equal(plan.viewId, viewId);
      assert.ok(typeof plan.mode === 'string');
      assert.ok(typeof plan.host === 'string');
    }
  }
});

test('ambient view slot restriction is strictly enforced', () => {
  const plan = resolveWorldPresentation({
    selection: { worldId: 'desert', variantId: 'golden' },
    viewId: 'place:court',
  });

  assert.equal(plan.mode, 'ambient');
  assert.equal(plan.host, 'self');
  assert.deepEqual([...plan.slots], ['lighting', 'audio']);
  assert.ok(plan.atmosphere.lighting, 'lighting must be present');
  assert.equal(plan.atmosphere.sky, undefined, 'sky must not be present');
  assert.equal(plan.atmosphere.fog, undefined, 'fog must not be present');
  assert.equal(plan.atmosphere.particles, undefined, 'particles must not be present');
  assert.equal(plan.audioProfile, 'desert');
});

test('full theater view receives all supported slots and assets', () => {
  const plan = resolveWorldPresentation({
    selection: { worldId: 'coastal', variantId: 'sunset' },
    viewId: 'place:theater',
  });

  assert.equal(plan.mode, 'full');
  assert.equal(plan.host, 'self');
  assert.equal(plan.fallbackLevel, 'exact');
  assert.ok(plan.atmosphere.sky);
  assert.ok(plan.atmosphere.lighting);
  assert.ok(plan.atmosphere.fog);
  assert.ok(plan.atmosphere.particles);
  assert.equal(plan.audioProfile, 'coastal');
  assert.ok(plan.assetIds.length > 0);
});

test('invalid variant repairs to defaultVariant of selected world', () => {
  const plan = resolveWorldPresentation({
    selection: { worldId: 'alpine', variantId: 'nonexistent-variant' },
    viewId: 'place:theater',
  });

  assert.equal(plan.worldId, 'alpine');
  assert.equal(plan.variantId, 'aurora'); // defaultVariant
});

test('none mode (retro games) selects native presentation immediately', () => {
  const plan = resolveWorldPresentation({
    selection: { worldId: 'rainforest', variantId: 'mist' },
    viewId: 'activity:pong',
  });

  assert.equal(plan.mode, 'none');
  assert.equal(plan.fallbackLevel, 'native');
  assert.equal(plan.fallbackReason, 'mode_none');
  assert.equal(plan.atmosphere, null);
  assert.equal(plan.audioProfile, null);
  assert.equal(plan.inheritedFromParent, true);
});

test('parent host views inherit without duplicate environment', () => {
  const plan = resolveWorldPresentation({
    selection: { worldId: 'cloud', variantId: 'sunrise' },
    viewId: 'activity:pool',
  });

  assert.equal(plan.host, 'parent');
  assert.equal(plan.inheritedFromParent, true);
  assert.equal(plan.atmosphere, null);
  assert.equal(plan.audioProfile, null);
});

test('comfort settings suppress particles when disabled', () => {
  const plan = resolveWorldPresentation({
    selection: { worldId: 'redwood', variantId: 'firefly' },
    viewId: 'place:theater',
    comfort: { particles: false },
  });

  assert.equal(plan.atmosphere.particles, null);
});

test('adapter unavailability retains current presentation or falls back to native', () => {
  const available = new Set(['place:court']); // place:theater not available!
  const current = { worldId: 'alpine', variantId: 'aurora', viewId: 'place:theater' };

  const retainedPlan = resolveWorldPresentation({
    selection: { worldId: 'coastal', variantId: 'sunset' },
    viewId: 'place:theater',
    availableAdapters: available,
    currentPresentation: current,
  });
  assert.equal(retainedPlan.fallbackLevel, 'retained');

  const nativePlan = resolveWorldPresentation({
    selection: { worldId: 'coastal', variantId: 'sunset' },
    viewId: 'place:theater',
    availableAdapters: available,
    currentPresentation: null,
  });
  assert.equal(nativePlan.fallbackLevel, 'native');
  assert.equal(nativePlan.fallbackReason, 'adapter_unavailable');
});
